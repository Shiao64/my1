// Platform stage 2 (spec v0.6 「一人多场」, migration 0028): one person, roles in several events, one link, one password.
// An email TP already has, given at an appointment, makes the new role that person's. Each request acts in the role of
// the event it names; a phone naming none, in the current event. 「重设」 and phones are the person's; deleting the role
// that holds the sign-in moves it to their next one (搬家). Before the migration everything is as it was.
// Run: node social-worker/test/reg-person.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-person';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'inmail.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

const MIGS = ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql', '0025_no_site_manager.sql', '0026_reg_mailto.sql', '0027_reg_event.sql'];
function database(withPerson) {
  const db = new DatabaseSync(':memory:');
  for (const f of [...MIGS, ...(withPerson ? ['0028_reg_person.sql'] : [])]) db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
  return db;
}
function D1(db) {
  return {
    async batch(list) { db.exec('BEGIN'); try { const out = list.map(x => x.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } },
    prepare(sql) { const st = db.prepare(sql); let args = []; return {
      bind(...a) { args = a; return this; },
      async first(col) { const r = st.get(...args); return r ? (col ? r[col] ?? null : r) : null; },
      async all() { return { results: st.all(...args) }; },
      run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
    }; } };
}
const db = database(true);
const ADMIN = 'a'.repeat(32);
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests',
  REG_CODES: JSON.stringify({ Alpha618: 'Chris Han' }) };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 700) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(parse(s)); else if (!/^reg_event:/.test(s)) orig(...a); };
function parse(s) {
  const m = /^\[mail:log\] from=(.*?) to=(\S+)( cc=\S+)?( reply-to=\S+)? subject=([^\n]*?)( \{[^\n]*\})?\n([\s\S]*)$/.exec(s);
  return m ? { from: m[1], to: m[2], subject: m[5], body: m[7] } : { raw: s, subject: '', body: '' };
}
const take = () => mails.splice(0, mails.length);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
async function call(method, p, body, auth, e = env) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), e, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const adm = (p, body, tok, e) => call('POST', '/admin/reg' + p, body, tok, e);
const list = (ev, tok = ADMIN) => call('GET', '/admin/reg?event=' + ev, null, tok);
const keyOf = link => (/#([0-9a-f]{48})$/.exec(link || '') || [])[1];
const PIN = '730195';
const signIn = async (link, temp, own, event) => call('POST', '/reg/login', { key: keyOf(link), pin: temp, new_pin: own, event });
const now = new Date().toISOString();

// more events besides 北京 (6/18–6/22 2027): 跨年 later, one already over; for the same-time rule: 上海 overlapping 北京,
// 天津 starting the day after 北京 ends, and one whose days are not set
const putEvent = (id, cfg, slug) => db.prepare('INSERT INTO reg_event(id,slug,config,created_at,updated_at) VALUES(?,?,?,?,?)').run(id, slug, JSON.stringify(cfg), now, now);
const small = { items: { N1: { key: 'eve', price: 300, cap: null } }, pkgs: { all: { price: 300, covers: ['N1'] } } };
putEvent('ye2027', { ...small, prefix: 'YE27', name: { zh: '跨年 2027', en: 'New Year 2027' }, deskEnds: '2027-12-31T22:00:00.000Z', starts: '2027-12-31', ends: '2028-01-01' }, 'yearend-2027');
putEvent('past2026', { ...small, prefix: 'PA26', name: { zh: '去年', en: 'Last year' }, deskEnds: '2026-01-02T00:00:00.000Z', starts: '2025-12-31', ends: '2026-01-01' }, 'past-2026');
putEvent('sh2027', { ...small, prefix: 'SH27', name: { zh: '上海 2027', en: 'Shanghai 2027' }, starts: '2027-06-22', ends: '2027-06-24' }, 'shanghai-2027');
putEvent('tj2027', { ...small, prefix: 'TJ27', name: { zh: '天津 2027', en: 'Tianjin 2027' }, starts: '2027-06-23' }, 'tianjin-2027');
putEvent('nd2027', { ...small, prefix: 'ND27', name: { zh: '没日期', en: 'No dates' } }, 'no-dates-2027');

// --- 刘峥: 总管 of 北京, appointed with an email: a new person, as before
let d = await adm('/admins', { event: 'bstw2027', name: '刘峥', role: 'chief', email: 'Liu@Example.com' }, ADMIN);
check('new person: link and temporary password, as before', d.ok && keyOf(d.link) && /^\d{6}$/.test(d.pin) && !d.same_person, d);
const liuBj = d;
check('the email is kept, in small letters', db.prepare('SELECT email,person_id FROM reg_admin WHERE id=?').get(liuBj.id).email === 'liu@example.com');
d = await signIn(liuBj.link, liuBj.pin, PIN);
const liu = d.token;
check('signs in: 总管 of 北京, one role, two phones', d.ok && liu && d.role === 'chief' && d.event === 'bstw2027' && d.devices === 2 && d.roles === undefined, d);

// --- the 管理员 sets 跨年's 总管邮箱 and appoints the same email there: the same person
d = await adm('/mailto', { event: 'ye2027', chief: 'liu@example.com' }, ADMIN);
check('总管邮箱 before any 总管: waits', d.ok && d.sent.chief === 'wait', d);
take();
d = await adm('/admins', { event: 'ye2027', name: '刘峥', role: 'chief', email: 'liu@example.com' }, ADMIN);
check('same email: the same person, no new link or password', d.ok && d.same_person === true && d.known_as === '刘峥' && !d.link && !d.pin && d.letter === 'sent', d);
const liuYe = d.id;
let row = db.prepare('SELECT * FROM reg_admin WHERE id=?').get(liuYe);
check('the new role points to the sign-in row and holds none itself', row.person_id === 'admin:' + liuBj.id && row.link_hash === null && row.pin_hash === null, row);
let ms = take();
const letter = ms.find(m => m.to === 'liu@example.com' && /任命/.test(m.subject));
check('任命信: the same password, a new link, the phones stay', letter && /同一个密码/.test(letter.body) && /密码不变/.test(letter.body) && !/临时密码/.test(letter.body)
  && /已登入的手机不受影响/.test(letter.body) && /\/event\/yearend-2027\/register\/in\/\?m=[0-9a-f]{32}#[0-9a-f]{48}/.test(letter.body), ms);
const newLink = (/(https:\S+#[0-9a-f]{48})/.exec(letter ? letter.body : '') || [])[1];
d = await call('POST', '/reg/login/hello', { key: keyOf(liuBj.link) });
check('one link per person: the one before stops', d._s === 404, d);
d = await call('POST', '/reg/login/hello', { key: keyOf(newLink), m: (/\?m=([0-9a-f]{32})/.exec(newLink || '') || [])[1] }, liu);
check('the new link: whose, both roles, the current event first', d.ok && d.name === '刘峥' && d.event === 'bstw2027' && d.state === 'ok' && d.same === true
  && (d.roles || []).map(r => r.event + ':' + r.role).join() === 'bstw2027:chief,ye2027:chief', d);
check('opening it verifies 跨年\'s 总管邮箱', d.mail_ok === true && /^liu@example\.com\|/.test((db.prepare("SELECT value FROM reg_setting WHERE event='ye2027' AND key='chief_verified'").get() || {}).value || ''), d);
d = await call('POST', '/reg/login/hello', { key: keyOf(newLink), event: 'ye2027' });
check('the page may name the event', d.event === 'ye2027' && d.event_name === '跨年 2027' && d.role === 'chief', d);

// --- the same phone in both events, no second sign-in
d = await list('ye2027', liu); check('same phone: 跨年, as its 总管', d._s === 200 && d.event === 'ye2027' && d.me.role === 'chief', d);
d = await list('bstw2027', liu); check('same phone: 北京, as its 总管', d._s === 200 && d.me.role === 'chief', d);
d = await list('past2026', liu); check('an event without a role: not let in', d._s === 401, d);
db.prepare("UPDATE reg_device SET auth_at=? WHERE kind='admin' AND person=? AND ended_at IS NULL").run(new Date(Date.now() - 13 * 36e5).toISOString(), liuBj.id);
d = await list('ye2027', liu); check('12 hours on: the password again, whichever event', d._s === 401 && d.error === 'reauth' && d.role === 'chief', d);
d = await call('POST', '/reg/login/again', { pin: PIN }, liu); check('typed once', d.ok, d);
d = await list('bstw2027', liu); check('then in again', d._s === 200, d);

// --- a 经理 of 北京 only, as before
d = await adm('/admins', { event: 'bstw2027', name: '小王', role: 'deputy', pin: PIN }, liu);
check('a 经理 without an email: as before', d.ok && keyOf(d.link) && /^\d{6}$/.test(d.pin), d);
const wang = (await signIn(d.link, d.pin, '482913')).token;
d = await list('ye2027', wang); check('经理 of 北京 only: 跨年 refused', d._s === 401, d);

// --- 前台 in both events: one link, one password, the passes of both
d = await adm('/staff', { event: 'bstw2027', name: '阿凯', email: 'kai@example.com', pin: PIN }, liu);
check('前台 with an email: a new person', d.ok && keyOf(d.link) && /^\d{6}$/.test(d.pin) && !d.same_person, d);
const kaiBj = d;
d = await adm('/staff', { event: 'ye2027', name: '阿凯', email: 'KAI@example.com', pin: PIN }, liu);
check('前台 in 跨年 with the same email: the same person', d.ok && d.same_person === true && d.known_as === '阿凯' && !d.link && !d.pin, d);
const kaiYe = d.id;
d = await adm('/staff', { event: 'ye2027', name: '凯凯', email: 'kai@example.com', pin: PIN }, liu);
check('one role per person per event', d._s === 409 && d.error === 'already_here' && d.name === '阿凯', d);
d = await adm('/admins', { event: 'ye2027', name: '凯', role: 'deputy', email: 'kai@example.com' }, ADMIN);
check('not as 经理 there either', d._s === 409 && d.error === 'already_here', d);
// not at the same time (Shiao 2026-11-25): 上海 shares 6/22 with 北京
d = await adm('/staff', { event: 'sh2027', name: '阿凯', email: 'kai@example.com' }, ADMIN);
check('same time: refused, saying which event and its days', d._s === 409 && d.error === 'same_time' && d.event_name === '北京精选探戈周末 2027' && d.starts === '2027-06-18' && d.ends === '2027-06-22', d);
check('...nothing written', db.prepare("SELECT COUNT(*) n FROM reg_staff WHERE event='sh2027'").get().n === 0);
d = await adm('/admins', { event: 'sh2027', name: '刘峥', role: 'chief', email: 'liu@example.com' }, ADMIN);
check('same time: not as 总管 either, and no letter', d._s === 409 && d.error === 'same_time' && !mails.some(m => /上海/.test(m.subject)), d);
d = await adm('/staff', { event: 'tj2027', name: '阿凯', email: 'kai@example.com' }, ADMIN);
check('the day after 北京 ends (one-day event): allowed', d.ok && d.same_person, d);
d = await adm('/staff/delete', { event: 'tj2027', id: d.id }, ADMIN); check('(天津 role taken away again)', d.ok, d);
d = await adm('/staff', { event: 'nd2027', name: '阿凯', email: 'kai@example.com' }, ADMIN);
check('an event without its days: cannot be checked, refused', d._s === 409 && d.error === 'no_dates' && d.event_name === '没日期', d);
d = await adm('/staff', { event: 'nd2027', name: '新人', email: 'new@example.com' }, ADMIN);
check('...someone new there: as before (nothing to compare)', d.ok && keyOf(d.link), d);
d = await adm('/staff', { event: 'ye2027', name: '新人', email: 'new@example.com', pin: PIN }, liu);
check('...and from there into a dated event: refused, the other has no days', d._s === 409 && d.error === 'no_dates' && d.event_name === '没日期', d);
d = await adm('/staff', { event: 'ye2027', name: '小林', pin: PIN }, liu); check('another 前台 of 跨年', d.ok, d);
d = await adm('/staff', { event: 'bstw2027', name: '小美', email: 'mei@example.com', pin: PIN }, liu); check('小美, 前台 of 北京', d.ok, d);
d = await adm('/staff', { event: 'ye2027', name: '小林', email: 'mei@example.com', pin: PIN }, liu);
check('the name must still be free in that event', d._s === 409 && d.error === 'name_taken', d);
d = await adm('/staff', { event: 'ye2027', name: '小美', email: 'mei@', pin: PIN }, liu);
check('a wrong email is refused', d._s === 400 && d.error === 'bad_email', d);

d = await signIn(kaiBj.link, kaiBj.pin, '594028');
let kai = d.token;
check('前台 signs in once: both roles, one phone', d.ok && kai && d.role === 'desk' && d.home === 'checkin' && d.devices === 1 && (d.roles || []).length === 2, d);
const regRow = (event, code, items) => db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at) VALUES(?,?,'a@example.com','en','paid',1,?,300,?,?)")
  .run(event, code, JSON.stringify({ people: [{ name: 'Amy ' + code, role: 'follower', country: 'KR', city: 'Seoul', items }] }), now, now);
regRow('ye2027', 'YE27-0001', ['N1']); regRow('bstw2027', 'BJ27-0901', ['M1']); regRow('past2026', 'PA26-0001', ['N1']);
const pYe = encodeURIComponent(await R.passFor(env, 'YE27-0001', 0)), pBj = encodeURIComponent(await R.passFor(env, 'BJ27-0901', 0)), pPa = encodeURIComponent(await R.passFor(env, 'PA26-0001', 0));
d = await call('GET', '/reg/door/me', null, kai); check('check-in page: who, as before', d.ok && d.role === 'desk' && d.name === '阿凯', d);
d = await call('GET', '/reg/door/pass?p=' + pBj, null, kai); check('a pass of 北京', d.ok && d.code === 'BJ27-0901', d);
d = await call('GET', '/reg/door/pass?p=' + pYe, null, kai); check('a pass of 跨年, same phone', d.ok && d.code === 'YE27-0001', d);
d = await call('POST', '/reg/door/checkin', { p: decodeURIComponent(pYe), item: 'N1' }, kai); check('checks in there, under the name given there', d.ok && d.by === '阿凯', d);
d = await call('GET', '/reg/door/pass?p=' + pPa, null, kai); check('a pass of an event they do not work in: refused', d._s === 404 && d.error === 'bad_pass', d);
d = await call('GET', '/reg/door/pass?p=' + pYe, null, wang); check('经理 of 北京 only: a 跨年 pass refused', d._s === 404, d);

// --- the settings page: the role shows the person's sign-in and that they work elsewhere too
let ye = await list('ye2027'), bj = await list('bstw2027');
const kYe = ye.staff.find(x => x.name === '阿凯'), kBj = bj.staff.find(x => x.name === '阿凯');
check('前台 in 跨年: their sign-in, from the row they signed in with', kYe.login.state === 'on' && kYe.login.devices === 1 && kYe.others === 1 && kYe.v === kBj.v && kYe.v.length === 8, kYe);
check('the same in 北京', kBj.login.state === 'on' && kBj.others === 1, kBj);
const lYe = ye.admins.find(x => x.name === '刘峥');
check('总管 in 跨年 the same way', lYe.login.state === 'on' && lYe.login.devices === 1 && lYe.login.max === 2 && lYe.others === 1, lYe);
check('someone in one event only: as before', bj.admins.find(x => x.name === '小王').others === undefined && ye.staff.find(x => x.name === '小林').others === undefined && ye.staff.find(x => x.name === '小林').login.state === 'new', ye.staff);
check('no hash and no email in the lists', !/pin_hash|pin_salt|link_hash|example\.com/.test(JSON.stringify([ye.admins, ye.staff, bj.admins, bj.staff])));

// --- 「重设」 is the person's
d = await adm('/staff/reset', { event: 'ye2027', id: kaiYe, v: kYe.v, pin: PIN }, liu);
check('总管 of both events resets: one new link and password for both', d.ok && keyOf(d.link) && /^\d{6}$/.test(d.pin) && /yearend-2027/.test(d.link), d);
const kaiNew = d;
d = await call('GET', '/reg/door/me', null, kai); check('reset: the phone is signed out', d._s === 401 && d.error === 'signed_out' && d.why === 'reset', d);
d = await call('POST', '/reg/login/hello', { key: keyOf(kaiBj.link) }); check('reset: the link from 北京 has stopped too', d._s === 404, d);
d = await signIn(kaiNew.link, kaiNew.pin, '594028'); kai = d.token;
check('reset: the new link signs in to both again', d.ok && kai && (d.roles || []).length === 2, d);

// --- 搬家: 刘峥 leaves 北京; his 跨年 role now holds his sign-in, same link, same password, same phone
d = await adm('/admins/delete', { event: 'bstw2027', id: liuBj.id }, ADMIN);
check('the 管理员 deletes his 北京 role', d.ok, d);
row = db.prepare('SELECT * FROM reg_admin WHERE id=?').get(liuYe);
check('搬家: his 跨年 role holds the sign-in now', row.person_id === null && row.link_hash === sha(keyOf(newLink)) && !!row.pin_hash && row.pin_temp === 0, row);
d = await list('ye2027', liu); check('搬家: the same phone, still 总管 of 跨年', d._s === 200 && d.me.role === 'chief', d);
d = await list('bstw2027', liu); check('搬家: no longer in 北京', d._s === 401, d);
d = await call('POST', '/reg/login/hello', { key: keyOf(newLink) }); check('搬家: the same link, 跨年 only now', d.ok && d.event === 'ye2027' && d.roles === undefined && d.state === 'ok', d);
d = await adm('/staff', { event: 'ye2027', name: '阿明', pin: PIN }, liu); check('搬家: the same password still works for 任免', d.ok, d);

// a 总管 of one event cannot reset someone who also works in another; the 管理员 can
d = await adm('/staff/reset', { event: 'ye2027', id: kaiYe, pin: PIN }, liu);
check('总管 of 跨年 only: no reset for someone also in 北京', d._s === 403 && d.error === 'other_events', d);
d = await adm('/staff/reset', { event: 'ye2027', id: kaiYe }, ADMIN);
check('the 管理员 may', d.ok && keyOf(d.link), d);
kai = (await signIn(d.link, d.pin, '594028')).token;
check('signs in with it', !!kai);

// deleting the other role: the phone stays, in 北京 only
d = await adm('/staff/delete', { event: 'ye2027', id: kaiYe, pin: PIN }, liu); check('his 跨年 role deleted', d.ok, d);
d = await call('GET', '/reg/door/pass?p=' + pBj, null, kai); check('his phone still works in 北京', d.ok, d);
d = await call('GET', '/reg/door/pass?p=' + pYe, null, kai); check('...and no longer in 跨年', d._s === 404, d);
d = await adm('/staff/delete', { event: 'ye2027', id: kaiYe, pin: PIN }, liu); check('deleted already: not found', d._s === 404, d);

// 搬家 to the other table, and a smaller limit: the phone that signed in first goes
d = await adm('/admins', { event: 'bstw2027', name: '阿秋', role: 'deputy', email: 'qiu@example.com' }, ADMIN);
const qiu = d;
const q1 = (await signIn(qiu.link, qiu.pin, '615283')).token, q2 = (await signIn(qiu.link, '615283')).token;
check('经理: two phones', q1 && q2 && q1 !== q2);
d = await adm('/staff', { event: 'ye2027', name: '阿秋', email: 'qiu@example.com', pin: PIN }, liu); check('and 前台 of 跨年', d.ok && d.same_person, d);
const qiuYe = d.id;
d = await adm('/admins/delete', { event: 'bstw2027', id: qiu.id }, ADMIN); check('the 经理 role deleted (the check reminder stays)', d.ok && d.check === true, d);
row = db.prepare('SELECT * FROM reg_staff WHERE id=?').get(qiuYe);
check('搬家 across: the 前台 row holds the sign-in', row.person_id === null && row.link_hash === sha(keyOf(qiu.link)) && !!row.pin_hash, row);
d = await call('GET', '/reg/door/me', null, q1); check('over the 前台 limit: the first phone is signed out', d._s === 401 && d.why === 'role', d);
d = await call('GET', '/reg/door/me', null, q2); check('the later phone stays: 前台 of 跨年', d.ok && d.role === 'desk' && d.name === '阿秋', d);
d = await call('POST', '/reg/login/hello', { key: keyOf(qiu.link) }); check('the same link', d.ok && d.event === 'ye2027' && d.role === 'desk', d);

// the last role gone: the person is gone, as before
d = await adm('/staff/delete', { event: 'ye2027', id: qiuYe, pin: PIN }, liu); check('last role deleted', d.ok, d);
d = await call('GET', '/reg/door/me', null, q2); check('...every phone out', d._s === 401 && d.why === 'deleted', d);

// an event over is skipped when the page names none
d = await adm('/staff', { event: 'past2026', name: '阿荣', email: 'rong@example.com' }, ADMIN); const rong = d;
d = await adm('/admins', { event: 'bstw2027', name: '阿荣', role: 'deputy', email: 'rong@example.com' }, ADMIN); check('阿荣, also 经理 of 北京', d.ok && d.same_person, d);
d = await signIn(rong.link, rong.pin, '736481');
check('signs in to the current event, not the one over', d.ok && d.event === 'bstw2027' && d.role === 'deputy' && d.home === 'admin' && d.devices === 2, d);
d = await call('POST', '/reg/login/hello', { key: keyOf(rong.link), event: 'past2026' }); check('asked for the one over: ended', d.state === 'ended', d);

// the 总管邮箱 of an event counts as the email of its 总管
d = await adm('/mailto', { event: 'past2026', chief: 'boss@example.com' }, ADMIN); check('past2026 总管邮箱', d.ok, d);
d = await adm('/admins', { event: 'past2026', name: '老板', role: 'chief' }, ADMIN); check('its 总管, no email on the row', d.ok && d.link, d);
d = await adm('/staff', { event: 'ye2027', name: '老板', email: 'Boss@example.com', pin: PIN }, liu);
check('the 总管邮箱 finds that 总管', d.ok && d.same_person && d.known_as === '老板', d);
take();

// --- before migration 0028: an email cannot be kept yet; without one, all as before
const old = database(false), oenv = { ...env, SDB: D1(old), DB: D1(old) };
d = await adm('/staff', { event: 'bstw2027', name: '老张', email: 'zhang@example.com' }, ADMIN, oenv); check('old database: an email waits for the migration', d._s === 503 && d.error === 'not_ready', d);
d = await adm('/staff', { event: 'bstw2027', name: '老张' }, ADMIN, oenv); check('old database: without one, as before', d.ok && keyOf(d.link), d);
const z = await call('POST', '/reg/login', { key: keyOf(d.link), pin: d.pin, new_pin: '594028' }, null, oenv);
check('old database: sign-in as before', z.ok && z.token && z.roles === undefined && z.devices === 1, z);
d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN, oenv); check('old database: the list as before', d._s === 200 && d.staff[0].login.state === 'on' && d.staff[0].others === undefined, d.staff);
d = await adm('/staff/delete', { event: 'bstw2027', id: d.staff[0].id }, ADMIN, oenv); check('old database: delete as before', d.ok, d);
d = await call('GET', '/reg/door/me', null, z.token, oenv); check('old database: the phone out', d._s === 401 && d.why === 'deleted', d);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-person tests passed:', passed);
