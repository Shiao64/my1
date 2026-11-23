// Event registration (register.js): subscriber-only submit, server-side pricing and checks, organizer actions, letters.
// Run: node social-worker/test/register.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-register';
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social, regCron } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql']) db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
// readLag: like a real network database, a read answers a little later, so requests sent together really overlap
let readLag = 0;
const later = v => readLag ? new Promise(ok => setTimeout(() => ok(v), readLag)) : v;
function D1(database) {
  return {
    // like D1: all or nothing, on one connection (so changes() is the statement before)
    async batch(list) { database.exec('BEGIN'); try { const out = list.map(x => x.run()); database.exec('COMMIT'); return out; } catch (e) { database.exec('ROLLBACK'); throw e; } },
    prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return later(null); return later(col ? r[col] ?? null : r); },
    all() { return later({ results: st.all(...args) }); },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const ADMIN = 'a'.repeat(32);
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests',
  REG_CODES: JSON.stringify({ Alpha618: 'Chris Han', Gamma618: 'Ajit', Delta618: 'Uno', Beta618: 'Kostas', Echo618: 'Robin' }) };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
// sign-in (TP step 2): the same hash the worker keeps, and a phone signed in straight in the database for fixtures
const pinH = (salt, pin) => crypto.createHmac('sha256', env.REG_PIN_PEPPER).update(salt + ':' + pin).digest('hex');
const PIN = new Map();   // phone key -> that person's password, sent along where the rules ask for it again
function phoneFor(kind, id, event, pin = '730195', authAt = new Date().toISOString()) {
  const salt = crypto.randomBytes(8).toString('hex'), key = crypto.randomBytes(32).toString('hex');
  db.prepare(`UPDATE ${kind === 'staff' ? 'reg_staff' : 'reg_admin'} SET link_hash=?,pin_hash=?,pin_salt=?,pin_temp=0 WHERE id=?`).run(sha(crypto.randomBytes(24).toString('hex')), pinH(salt, pin), salt, id);
  db.prepare('INSERT INTO reg_device(kind,person,event,token_hash,created_at,auth_at) VALUES(?,?,?,?,?,?)').run(kind, id, event, sha(key), authAt, authAt);
  PIN.set('dev:' + key, pin); return 'dev:' + key;
}
const keyOf = link => (/\/register\/in\/#([0-9a-f]{48})$/.exec(link || '') || [])[1];
// through the real pages' calls: link + temporary password, then one's own
async function signIn(made, own = '730195') {
  const key = keyOf(made.link);
  const d = await call('POST', '/reg/login', { key, pin: made.pin, new_pin: own });
  if (d.token) PIN.set(d.token, own);
  return d.token;
}
function subscriber(email, name, verified = true) {
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, 'en', verified ? '2026-11-01' : null, '2026-11-01');
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), '2026-11-01');
  return tok;
}
async function call(method, p, body, auth) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const person = (o = {}) => ({ name: 'Amy Lee', country: 'KR', city: 'Seoul', role: 'follower', pkg: 'full', items: [], ...o });
const form = (o = {}) => ({ event: 'bstw2027', lang: 'en', people: [person()], hotel: 'no', ...o });

// --- pricing (pure) ---
const at = Date.parse('2026-12-05T00:00:00+08:00'), after = Date.parse('2027-02-03T00:00:00+08:00');
let e = R.evaluate(form(), env, at); check('full 1450', e.total === 1450, e);
e = R.evaluate(form({ code: 'early' }), env, at); check('early 1350 before 2/2', e.total === 1350);
e = R.evaluate(form({ code: ' EARLY ' }), env, after); check('early over after 2/1 → 1450', e.total === 1450 && e.promo.kind === 'early_over');
e = R.evaluate(form({ code: 'beta618' }), env, at); check('friend code any case → 1200 + DJ', e.total === 1200 && e.promo.dj === 'Kostas');
e = R.evaluate(form({ code: 'Contas618' }), env, at); check('Contas618 unknown → 1450', e.total === 1450 && e.promo.kind === 'unknown');
e = R.evaluate(form({ code: 'Alpha618', people: [person({ pkg: 'combo' })] }), env, at); check('code does not touch combo', e.total === 1150);
e = R.evaluate(form({ people: [person({ pkg: 'combo', items: ['tour', 'yard'] })] }), env, at); check('combo + tour; yard already covered', e.total === 1600);
e = R.evaluate(form({ people: [person({ pkg: 'pass', items: ['yard'] })] }), env, at); check('pass + yard', e.total === 1150);
e = R.evaluate(form({ people: [person({ pkg: 'single', items: ['sat-eve', 'sun-aft', 'tour'] })] }), env, at); check('single 200+150+450', e.total === 800);
e = R.evaluate(form({ people: [person({ pkg: 'single', items: ['tour'] })] }), env, at); check('single needs a milonga', e.error === 'need_items');
e = R.evaluate(form({ people: [person({ pkg: '', items: [] })] }), env, at); check('nothing chosen', e.error === 'need_items');
e = R.evaluate(form({ people: [person({ pkg: '', items: ['walk'] })] }), env, at); check('only an extra is fine', e.total === 400);
e = R.evaluate(form({ code: 'Delta618', people: [person(), person({ name: 'Bob' }), person({ name: 'Cat', pkg: 'pass' })] }), env, at); check('3 people, code on full only', e.total === 1200 * 2 + 700);
e = R.evaluate(form({ people: Array.from({ length: 7 }, (_, i) => person({ name: 'P' + i })) }), env, at); check('max 6 people', e.error === 'bad_people');
e = R.evaluate(form({ people: [person(), person({ name: 'Bob', email: 'bob@' })] }), env, at); check('companion bad email', e.error === 'bad_email');
e = R.evaluate(form({ people: [person({ role: '' })] }), env, at); check('role required', e.error === 'need_role');
e = R.evaluate(form({ people: [person({ city: ' ' })] }), env, at); check('city required', e.error === 'need_city');
// hotel
const two = [person(), person({ name: 'Bob Kim', country: 'CN' })];
const pp2 = [{ s: 'LEE', g: 'AMY' }, { s: 'KIM', g: 'BOB' }];
e = R.evaluate(form({ people: two, hotel: 'yes', rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-23', guests: [0, 1] }], passports: pp2 }), env, at);
check('hotel king 5 nights', e.hotel === 2500 && e.total === 1450 * 2 + 2500, e);
check('domestic flag when anyone is CN', e.domestic === 1);
e = R.evaluate(form({ people: two, hotel: 'yes', rooms: [{ type: 'twin', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], passports: pp2 }), env, at); check('twin 2 nights, Bob elsewhere ok', e.hotel === 1100);
const hot = (rooms, passports = pp2, people = two) => R.evaluate(form({ people, hotel: 'yes', rooms, passports }), env, at).error;
check('3 in a room refused', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0, 1, 2] }], [...pp2, { s: 'C', g: 'C' }], [...two, person({ name: 'C' })]) === 'bad_guests');
check('empty room refused', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [] }]) === 'bad_guests');
check('same person twice in one room', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0, 0] }]) === 'bad_guests');
check('same person in two rooms', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }, { type: 'twin', ci: '2027-06-18', co: '2027-06-20', guests: [0] }]) === 'guest_twice');
check('more rooms than people', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }, { type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [1] }], pp2, two) === undefined);
check('more rooms than people refused', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }, { type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], [pp2[0]], [person()]) === 'bad_rooms');
check('share room type gone', hot([{ type: 'share', ci: '2027-06-18', co: '2027-06-20', guests: [0] }]) === 'bad_room_type');
check('6/10 check-in refused', hot([{ type: 'king', ci: '2027-06-10', co: '2027-06-20', guests: [0] }]) === 'bad_dates');
check('6/29 check-out refused', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-29', guests: [0] }]) === 'bad_dates');
check('same-day refused', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-18', guests: [0] }]) === 'bad_dates');
check('6/11–6/28 ok', hot([{ type: 'king', ci: '2027-06-11', co: '2027-06-28', guests: [0] }]) === undefined);
check('passport Chinese refused', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], [{ s: '李', g: 'AMY' }, pp2[1]]) === 'bad_passport');
check('passport needed for everyone', hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], [pp2[0]]) === 'bad_passport');
check("passport O'NEIL / MARY-ANN ok", hot([{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], [{ s: "O'NEIL", g: 'MARY-ANN' }, pp2[1]]) === undefined);

// --- submit over HTTP ---
const amy = subscriber('amy@gmail.com', 'Amy');
let d = await call('POST', '/reg', form());
check('not subscribed → 401 need_subscribe', d._s === 401 && d.error === 'need_subscribe', d);
const ghost = subscriber('ghost@gmail.com', 'Ghost', false);
d = await call('POST', '/reg', form(), ghost); check('unverified subscriber refused', d._s === 401);
const wx = subscriber('wx:abc123', 'Wx'); d = await call('POST', '/reg', form(), wx); check('WeChat-only account refused', d._s === 403 && d.error === 'need_email_subscribe', d);
d = await call('POST', '/reg', form({ people: [person({ pkg: 'full' })], code: 'Echo618', total: 1 }), amy);
check('submit ok, code BJ27-0001, server total', d.ok && d.code === 'BJ27-0001' && d.total === 1200, d);
check('received letter goes to test inbox while not live', mails.some(m => m.includes('to=selecttango@gmail.com') && m.includes('[TEST → amy@gmail.com] Registration received · BJ27-0001')), mails.slice(-2));
check('owner notified', mails.some(m => m.includes('新报名 BJ27-0001')));
d = await call('POST', '/reg', form({ people: [person({ pkg: 'pass' })] }), amy);
check('resubmit while pending updates same code', d.ok && d.code === 'BJ27-0001' && d.updated && d.total === 700, d);
d = await call('GET', '/reg/me?event=bstw2027', null, amy); check('me shows pending reg', d.reg && d.reg.code === 'BJ27-0001' && d.reg.status === 'pending', d);
d = await call('GET', '/reg/left?event=bstw2027'); check('left full caps, no T1/T2', d.left.S1 === 120 && d.left.M1 === 300 && !('T1' in d.left) && !('T2' in d.left), d);

// --- organizer ---
d = await call('GET', '/admin/reg?event=bstw2027'); check('admin needs token', d._s === 401);
d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); check('admin list', d.rows.length === 1 && d.counts.pending === 1, d);
const id1 = d.rows[0].id;
d = await call('POST', '/admin/reg/act', { id: id1, action: 'paid' }, ADMIN); check('cannot mark pending as paid', d._s === 409);
mails.length = 0;
d = await call('POST', '/admin/reg/act', { id: id1, action: 'confirm' }, ADMIN);
check('confirm sets due date +14d', d.ok && d.status === 'confirmed' && Math.abs(Date.parse(d.due) - Date.now() - 14 * 864e5) < 6e4, d);
check('confirmation letter has pay + rules + QR', mails.some(m => m.includes('Registration confirmed · BJ27-0001') && m.includes('WeChat Pay or Alipay') && m.includes('June 11, 2027') && m.includes('/register/draft/?lang=en#pay') && !m.includes('transfer note') && !m.includes('/social/reg/qr/')), mails);
d = await call('GET', '/reg/left?event=bstw2027'); check('confirmed pass uses M1–M4, not S1', d.left.M1 === 299 && d.left.S1 === 120, d.left);
d = await call('POST', '/reg', form(), amy); check('cannot resubmit after confirm', d._s === 409 && d.error === 'exists');
// capacity: fill S1 to 1 left, then a 2-person S1 form cannot be confirmed
const bob = subscriber('bob@naver.com', 'Bob');
d = await call('POST', '/reg', form({ lang: 'ko', people: [person({ name: 'Bob' }), person({ name: 'Cat', role: 'leader' })] }), bob);
const id2 = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.code === d.code).id;
db.prepare("INSERT INTO reg(event,code,email,status,people,data,amount,created_at,updated_at) VALUES('bstw2027','X-1','x@x.com','paid',119,?,0,'2026-12-01','2026-12-01')")
  .run(JSON.stringify({ people: Array.from({ length: 119 }, () => ({ items: ['S1'] })), rooms: [], passports: [] }));
d = await call('POST', '/admin/reg/act', { id: id2, action: 'confirm' }, ADMIN); check('no overbooking: S1 1 left, need 2', d._s === 409 && d.error === 'full' && d.item === 'S1' && d.left === 1 && d.need === 2, d);
d = await call('POST', '/admin/reg/act', { id: id2, action: 'waitlist' }, ADMIN); check('waitlist', d.status === 'waitlist');
check('waitlist letter in Korean', mails.some(m => m.includes('대기자 명단 · BJ27-0002')));
db.prepare("DELETE FROM reg WHERE code='X-1'").run();
d = await call('POST', '/admin/reg/act', { id: id2, action: 'confirm' }, ADMIN); check('confirm from waitlist when seats free', d.status === 'confirmed');
// --- entry passes and door check-in ---
d = await call('GET', '/reg/me?event=bstw2027', null, bob); check('no passes before payment', d.reg && d.reg.passes.length === 0, d);
mails.length = 0;
d = await call('POST', '/admin/reg/act', { id: id2, action: 'paid' }, ADMIN); check('bob paid', d.status === 'paid');
check('paid letter suggests a screenshot', mails.some(m => m.includes('결제 확인 · BJ27-0002') && m.includes('캡처해')));
check('paid letter carries one QR per person', mails.some(m => m.includes('결제 확인 · BJ27-0002') && (m.match(/\/social\/reg\/pass\/BJ27-0002-\d\.[0-9a-f]{20}\.png/g) || []).length === 2), mails);
d = await call('GET', '/reg/me?event=bstw2027', null, bob);
check('me shows a pass for each person', d.reg.passes.length === 2 && d.reg.passes[1].name === 'Cat' && Array.isArray(d.reg.passes[1].items) && d.reg.passes[1].items.includes('M2') && /^BJ27-0002-2\.[0-9a-f]{20}$/.test(d.reg.passes[1].pass), d);
const [pBob, pCat] = d.reg.passes.map(x => x.pass);
const png = await social(new Request('https://api.tangoweekend.org/social/reg/pass/' + pBob + '.png'), env, new URL('https://api.tangoweekend.org/social/reg/pass/' + pBob + '.png'), json);
const pngBytes = new Uint8Array(await png.arrayBuffer());
check('pass QR is a PNG', png.status === 200 && pngBytes[1] === 0x50 && pngBytes[2] === 0x4e && pngBytes[3] === 0x47);
const forged = pBob.slice(0, -1) + (pBob.endsWith('0') ? '1' : '0');
const bad = await social(new Request('https://api.tangoweekend.org/social/reg/pass/' + forged + '.png'), env, new URL('https://api.tangoweekend.org/social/reg/pass/' + forged + '.png'), json);
check('forged pass gives no QR', bad.status === 404);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pCat)); check('door lookup needs password', d._s === 401);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pCat), null, ADMIN);
check('door lookup shows the person', d.ok && d.person.name === 'Cat' && d.valid && d.person.items.includes('M2') && d.checkins.length === 0, d);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(forged), null, ADMIN); check('door lookup rejects forged pass', d._s === 404);
d = await call('POST', '/reg/door/checkin', { p: pCat, item: 'M2' }, ADMIN); check('check in Cat for M2', d.ok);
d = await call('POST', '/reg/door/checkin', { p: pCat, item: 'M2' }, ADMIN); check('second scan says already', d._s === 409 && d.error === 'already' && d.at, d);
d = await call('POST', '/reg/door/checkin', { p: pCat, item: 'T1' }, ADMIN); check('not registered for T1', d._s === 409 && d.error === 'not_registered');
d = await call('POST', '/reg/door/checkin', { p: pCat, item: 'M2', undo: 1 }, ADMIN); check('undo check-in', d.ok && d.undone);
d = await call('POST', '/reg/door/checkin', { p: pCat, item: 'M2' }, ADMIN); check('check in again after undo', d.ok);
d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); check('admin counts check-ins per event', d.checked.M2 === 1 && d.rows.find(r => r.id === id2).checkins.length === 1, d.checked);
// --- front desk (TP step 2): personal link + six-digit password, one phone ---
d = await call('POST', '/admin/reg/staff', { name: '王凯' }); check('adding a desk needs to be signed in', d._s === 401);
d = await call('POST', '/admin/reg/staff', { name: '王凯' }, ADMIN); check('add desk → personal link and a temporary password', d.ok && keyOf(d.link) && /^\d{6}$/.test(d.pin) && !d.link.includes(d.pin), d);
const desk1 = d, sid = d.id;
d = await call('POST', '/admin/reg/staff', { name: '王凯' }, ADMIN); check('same name twice refused', d._s === 409);
d = await call('POST', '/reg/door/activate', { act: 'a'.repeat(48) }); check('the old one-time links are gone', d._s === 410);
const phone1 = await signIn(desk1);
check('desk signs in with link + password', /^dev:[0-9a-f]{64}$/.test(phone1 || ''));
d = await call('GET', '/reg/door/me', null, phone1); check('desk phone recognised', d.ok && d.name === '王凯' && !d.admin && d.until === R.EVENTS.bstw2027.deskEnds, d);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pBob), null, phone1); check('desk can look up a pass', d.ok && d.person.name === 'Bob');
d = await call('GET', '/admin/reg?event=bstw2027', null, phone1); check('desk cannot open the admin list', d._s === 401);
d = await call('POST', '/admin/reg/act', { id: id2, action: 'cancel' }, phone1); check('desk cannot change registrations', d._s === 401);
d = await call('POST', '/reg/door/checkin', { p: pBob, item: 'M1' }, phone1); check('desk checks in, name recorded', d.ok && d.by === '王凯', d);
d = await call('POST', '/reg/door/checkin', { p: pBob, item: 'M1' }, ADMIN); check('organizer rescan shows who did it', d._s === 409 && d.error === 'already' && d.by === '王凯', d);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pBob), null, 'dev:' + 'f'.repeat(64)); check('unknown phone key refused', d._s === 401);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pBob), null, 'staff:' + 'f'.repeat(64)); check('old desk keys refused', d._s === 401);
d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); check('admin shows desk with count and state', d.staff.length === 1 && d.staff[0].checkins === 1 && d.staff[0].login.state === 'on' && d.staff[0].login.devices === 1, d.staff);
d = await call('POST', '/admin/reg/staff/reset', { id: sid }, ADMIN); const desk2 = d; check('reset gives a new link and password', d.ok && keyOf(d.link) && keyOf(d.link) !== keyOf(desk1.link) && /^\d{6}$/.test(d.pin));
d = await call('GET', '/reg/door/me', null, phone1); check('the phone stops at once after a reset, and is told why', d._s === 401 && d.error === 'signed_out' && d.why === 'reset', d);
d = await call('POST', '/reg/login/hello', { key: keyOf(desk1.link) }); check('old link dead after reset', d._s === 404);
const phone2 = await signIn(desk2); check('new link works', !!phone2);
d = await call('POST', '/admin/reg/staff/delete', { id: sid }, ADMIN); check('delete desk', d.ok);
check('deleted desk leaves no row', !db.prepare('SELECT 1 FROM reg_staff WHERE id=?').get(sid));
check('deleted desk: check-in keeps the name', db.prepare("SELECT staff FROM reg_checkin WHERE staff='王凯'").get());
d = await call('POST', '/admin/reg/staff/reset', { id: sid }, ADMIN); check('deleted desk cannot be brought back', d._s === 404);
d = await call('POST', '/admin/reg/staff', { name: '主办' }, ADMIN); check('desk cannot take the organizer name', d._s === 409 && d.error === 'name_reserved');
d = await call('GET', '/reg/door/me', null, phone2); check('deleted desk signed out, told why', d._s === 401 && d.why === 'deleted', d);
// modify after confirm: +¥50 once
d = await call('POST', '/admin/reg/act', { id: id1, action: 'modify', data: form({ people: [person({ pkg: 'pass', items: ['tour'] })] }) }, ADMIN);
check('modify adds ¥50 fee', d.ok && d.amount === 700 + 450 + 50, d);
d = await call('POST', '/admin/reg/act', { id: id1, action: 'modify', data: form({ people: [person({ pkg: 'pass' })] }) }, ADMIN);
check('second modify: fee still once', d.amount === 700 + 50, d);
d = await call('POST', '/admin/reg/act', { id: id1, action: 'paid' }, ADMIN); check('mark paid', d.status === 'paid');
d = await call('POST', '/admin/reg/act', { id: id1, action: 'cancel' }, ADMIN); check('cancel paid → refund minus ¥50 once', d.status === 'cancelled' && d.refund === 700, d);
d = await call('GET', '/reg/left?event=bstw2027'); check('cancel frees seats', d.left.M1 === 298, d.left);
// hotel refund after 6/11 — use a direct row with paid hotel
const late = R.EVENTS.bstw2027; const saved = late.hotelRefundBy; late.hotelRefundBy = '2000-01-01';
db.prepare("INSERT INTO reg(event,code,email,status,people,data,amount,hotel_amount,created_at,updated_at) VALUES('bstw2027','H-1','h@h.com','paid',1,?,3950,2500,'2026-12-01','2026-12-01')")
  .run(JSON.stringify({ people: [person({ items: [] })], rooms: [], passports: [] }));
const hid = db.prepare("SELECT id FROM reg WHERE code='H-1'").get().id;
d = await call('POST', '/admin/reg/act', { id: hid, action: 'cancel', silent: 1 }, ADMIN); check('late cancel keeps hotel', d.refund === 3950 - 50 - 2500, d);
late.hotelRefundBy = saved;
// registration-only password works for registration admin only
env.REG_ADMIN_TOKEN = 'r'.repeat(32);
d = await call('GET', '/admin/reg?event=bstw2027', null, env.REG_ADMIN_TOKEN); check('REG_ADMIN_TOKEN opens registration admin', d._s === 200 && Array.isArray(d.rows));
d = await call('GET', '/admin/wx-pending', null, env.REG_ADMIN_TOKEN); check('REG_ADMIN_TOKEN cannot open site admin', d._s === 401);
d = await call('GET', '/admin/reg?event=bstw2027', null, 'short'); check('short token refused', d._s === 401);
// note, csv
d = await call('POST', '/admin/reg/act', { id: id2, action: 'note', note: '付款截图已收' }, ADMIN); check('note', d.ok);
const csvRes = await social(new Request('https://api.tangoweekend.org/social/admin/reg?event=bstw2027&format=csv', { headers: { Authorization: 'Bearer ' + ADMIN } }), env, new URL('https://api.tangoweekend.org/social/admin/reg?event=bstw2027&format=csv'), json);
const csv = await csvRes.text(); check('csv one line per person + passport cols', csv.includes('passport_surname') && csv.split('\n').filter(l => l.startsWith('BJ27-0002')).length === 2, csv.slice(0, 300));
// reminder after 10 days
db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at,due_at) VALUES('bstw2027','BJ27-0900','late@x.com','en','confirmed',1,?,1450,'2026-01-01','2026-01-01','2026-01-01T00:00:00Z','2026-01-15T00:00:00Z')")
  .run(JSON.stringify({ people: [person({ items: ['M1'] })], rooms: [], passports: [], hotel: false })); mails.length = 0;
let rr = await regCron(env); check('reminder sent once', rr.sent === 1 && mails.some(m => m.includes('BJ27-0900')), rr);
rr = await regCron(env); check('reminder not repeated', rr.sent === 0);
// QR asset
d = await call('POST', '/admin/reg/asset', { name: 'intl-wechat', mime: 'image/png', b64: Buffer.from('PNGDATA').toString('base64') }, ADMIN); check('upload QR', d.ok);
const q1 = await social(new Request('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=qrkey'), env, new URL('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=qrkey'), json);
check('QR served with key', q1.status === 200 && (await q1.text()) === 'PNGDATA');
const q2 = await social(new Request('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=bad'), env, new URL('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=bad'), json);
check('QR hidden without key', q2.status === 404);
// status on the registration page / site reminder
{ const eve = subscriber('eve@gmail.com', 'Eve');
  let m = await call('POST', '/reg', form({ people: [person({ name: 'Eve', pkg: 'pass' })] }), eve);
  const eid = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.code === m.code).id;
  m = await call('GET', '/reg/me?event=bstw2027', null, eve); check('pending: status, amount, lines, no pay QR', m.reg.status === 'pending' && m.reg.amount === 700 && m.reg.lines.length === 1 && m.reg.pay.length === 0, m.reg);
  await call('POST', '/admin/reg/act', { id: eid, action: 'confirm', silent: 1 }, ADMIN);
  m = await call('GET', '/reg/me?event=bstw2027', null, eve);
  check('confirmed: due date and only uploaded pay QR', m.reg.status === 'confirmed' && m.reg.due && m.reg.pay.length === 1 && m.reg.pay[0].name === 'intl-wechat' && /\/social\/reg\/qr\/intl-wechat\?k=qrkey$/.test(m.reg.pay[0].img), m.reg);
  await call('POST', '/admin/reg/act', { id: eid, action: 'paid', silent: 1 }, ADMIN);
  m = await call('GET', '/reg/me?event=bstw2027', null, eve); check('paid: passes, no pay QR', m.reg.passes.length === 1 && m.reg.pay.length === 0);
  await call('POST', '/admin/reg/act', { id: eid, action: 'cancel', silent: 1 }, ADMIN);
  m = await call('GET', '/reg/me?event=bstw2027', null, eve); check('cancelled: shown with refund', m.reg.status === 'cancelled' && m.reg.refund === 650, m.reg);
  m = await call('POST', '/reg', form({ people: [person({ name: 'Eve', pkg: 'combo' })] }), eve); check('can register again after cancel', m.ok && m.code !== undefined);
  m = await call('GET', '/reg/me?event=bstw2027', null, eve); check('me prefers the live registration over the cancelled one', m.reg.status === 'pending' && m.reg.amount === 1150, m.reg); }
// --- five roles (docs/tangopass.md, first section): can / cannot, appointments, simultaneous work ---
{ const EV = R.EVENTS.bstw2027, seat = EV.chief, U = 'https://api.tangoweekend.org/social';
  const raw = (path, tok) => social(new Request(U + path, { headers: { Authorization: 'Bearer ' + tok } }), env, new URL(U + path), json);
  // the password goes along wherever the rules ask for it again (任免, a 总管's refund and export)
  const post = (path, body, tok) => call('POST', '/admin/reg' + path, PIN.has(tok) && body && body.pin === undefined ? { ...body, pin: PIN.get(tok) } : body, tok);
  const rawPost = (path, body, tok) => social(new Request(U + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(PIN.has(tok) ? { ...body, pin: PIN.get(tok) } : body) }), env, new URL(U + path), json);
  // BSTW since 2026-11-23 (Shiao): 张孝 is the 管理员 and appoints one 总管
  let d = await call('GET', '/admin/reg/me', null, ADMIN);
  check('BSTW: the 管理员 is offered the 总管 seat', seat === undefined && d.role === 'owner' && d.seat === 'owner' && d.appoint.join() === 'chief,deputy,manager,desk' && d.perms.includes('asset'), d);
  d = await post('/admins', { name: 'T-Seat1', role: 'chief' }, ADMIN);
  check('BSTW: the 管理员 appoints a 总管 (link + temporary password)', d.ok && d.role === 'chief' && /\/register\/in\/#[0-9a-f]{48}$/.test(d.link) && /^\d{6}$/.test(d.pin), d);
  const listed = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN);
  check('BSTW: the 总管 shows in the settings, the seat is no longer the 管理员', listed.chief === '' && listed.admins.some(x => x.name === 'T-Seat1' && x.role === 'chief'), [listed.chief, listed.admins]);
  d = await post('/admins', { name: 'T-Seat2', role: 'chief' }, ADMIN);
  check('BSTW: only one 总管', d._s === 409 && d.error === 'chief_taken', d);
  d = await post('/admins', { name: 'T-Seat2', role: 'deputy' }, ADMIN);
  d = await post('/admins/role', { id: d.id, role: 'chief' }, ADMIN);
  check('BSTW: no second 总管 by promotion either', d._s === 409 && d.error === 'chief_taken', d);
  db.exec("DELETE FROM reg_admin WHERE name LIKE 'T-Seat%'");
  EV.chief = 'owner';   // an event whose 总管 is the 管理员 himself: the seat is taken
  d = await post('/admins', { name: 'Seat', role: 'chief' }, ADMIN);
  check('chief:owner: the 总管 seat is taken by the 管理员', d._s === 409 && d.error === 'chief_taken', d);
  d = await call('GET', '/admin/reg/me', null, ADMIN);
  check('chief:owner: the 管理员 is the 总管 and is not offered a second one', d.role === 'owner' && d.seat === 'chief' && d.appoint.join() === 'deputy,manager,desk' && d.perms.includes('asset'), d);
  delete EV.chief;   // from here: BSTW as it is, with an appointed 总管

  let n = 0;
  const wipe = () => { db.exec("DELETE FROM reg_admin WHERE name LIKE 'T-%'"); db.exec("DELETE FROM reg_staff WHERE name LIKE 'T-%'"); };   // their reg_device rows stay: ended or orphaned, like the real thing after a delete
  const person_ = (role, event = 'bstw2027') => { n++;
    const name = 'T-' + role + n;
    if (role === 'owner') return { tok: ADMIN, role, name: '张孝' };
    if (role === 'desk') {
      const r = db.prepare("INSERT INTO reg_staff(event,name,created_at) VALUES(?,?,'2026-11-01')").run(event, name), id = Number(r.lastInsertRowid);
      return { tok: phoneFor('staff', id, event), id, role, name }; }
    const r = db.prepare("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at) VALUES(?,?,'-',?,'2026-11-01')").run(event, name, role), id = Number(r.lastInsertRowid);
    return { tok: phoneFor('admin', id, event), id, role, name }; };
  const codes = [];
  const seed = async (status, o = {}) => { n++;
    const code = 'BJ27-' + (7000 + n), amount = o.amount || 1000;
    const r = db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,refund,note,created_at,updated_at) VALUES('bstw2027',?,?,'en',?,1,?,?,?,?,'2026-11-20','2026-11-20')")
      .run(code, code + '@example.com', status, JSON.stringify({ people: [person({ pkg: 'single', items: ['M3'], amount })], rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-19', nights: 1, guests: [0], amount: 500 }], hotel: true, passports: [{ s: 'SECRETSURNAME', g: 'SECRETGIVEN' }] }), amount, o.refund ?? null, o.note || 'PRIVATE');
    const id = Number(r.lastInsertRowid); codes.push(id);
    if (o.paid) db.prepare("INSERT INTO reg_payment(reg_id,at,amount,method,collector,by_admin) VALUES(?,'2026-11-21',?,'alipay','Earlier','Earlier')").run(id, o.paid);
    return { id, code, p: await R.passFor(env, code, 0) }; };
  const status = id => db.prepare('SELECT status FROM reg WHERE id=?').get(id).status;

  // 3. every role × every row of the table
  const CAN = { owner: 'door undo site review list cancel refund passport export asset', chief: 'door undo site review list cancel refund passport export', deputy: 'door undo site review list', manager: 'door undo site', desk: 'door' };
  for (const role of Object.keys(CAN)) {
    wipe();
    const who = person_(role), t = who.tok, may = x => CAN[role].split(' ').includes(x), no = role === 'desk' ? 401 : 403;
    const expect = (what, res, perm, extra = true) => check(`${role}: ${may(perm) ? 'can' : 'cannot'} ${what}`, res._s === (may(perm) ? 200 : no) && extra, res);
    const paid = await seed('paid', { paid: 1000 }), cash = await seed('cash', { paid: 300 });
    let a = await call('GET', '/reg/door/pass?p=' + paid.p, null, t);
    check(role + ': scans', a.ok, a);
    check(role + ': note only with the list', (a.note === 'PRIVATE') === may('list'), a);
    check(role + ': who sees what was paid', may('list') ? a.collect.paid === 1000 : !JSON.stringify(a).includes('1000'), a);
    a = await call('POST', '/reg/door/checkin', { p: paid.p, item: 'M3' }, t);
    check(role + ': checks in, own name', a.ok && a.by === who.name, a);
    a = await call('POST', '/reg/door/checkin', { p: paid.p, item: 'M3', undo: 1 }, t);
    check(`${role}: undo`, may('undo') ? a.undone : a._s === 403 && a.error === 'manager_only', a);
    a = await call('POST', '/reg/door/checkin', { p: cash.p, item: 'M3' }, t);
    check(role + ': no check-in before arrival payment is settled', a._s === 409 && a.error === 'pay_first', a);
    a = await call('GET', '/reg/door/pass?p=' + cash.p, null, t);
    check(role + ': amount to take only for collectors', may('site') ? a.collect.rest === 700 : !a.collect && !JSON.stringify(a).includes('700'), a);
    a = await post('/act', { id: cash.id, p: cash.p, action: 'pay', pay: { method: 'cash' } }, t);
    expect('collect on site', a, 'site', !may('site') || status(cash.id) === 'paid');
    for (const [action, from, to] of [['confirm', 'pending', 'confirmed'], ['waitlist', 'pending', 'waitlist'], ['decline', 'pending', 'declined'], ['cash', 'confirmed', 'cash'], ['pay', 'confirmed', 'paid']]) {
      const x = await seed(from);
      a = await post('/act', { id: x.id, action, pay: { method: 'alipay' }, silent: 1 }, t);
      expect(action === 'pay' ? 'record a screenshot payment' : action, a, 'review', status(x.id) === (may('review') ? to : from)); }
    const c = await seed('paid', { paid: 1000 }), rf = await seed('cancelled', { paid: 1000, refund: 950 }), nt = await seed('pending');
    expect('edit the note', await post('/act', { id: nt.id, action: 'note', note: 'x' }, t), 'list');
    expect('cancel', await post('/act', { id: c.id, action: 'cancel', silent: 1 }, t), 'cancel', status(c.id) === (may('cancel') ? 'cancelled' : 'paid'));
    expect('refund', await post('/act', { id: rf.id, action: 'refund', pay: { method: 'alipay' } }, t), 'refund');
    const mo = await seed('pending');
    expect('modify a registration', await post('/act', { id: mo.id, action: 'modify', silent: 1, data: form() }, t), 'cancel');
    const res = await raw('/admin/reg?event=bstw2027', t), text = await res.text();
    check(role + ': list', res.status === (role === 'desk' ? 401 : 200) && text.includes('"rows"') === may('list'), res.status);
    check(role + ': emails, notes, full ledger', text.includes('@example.com') === may('list') && text.includes('PRIVATE') === may('list') && text.includes('"ledger"') === may('list'));
    check(role + ': passport names are not even sent', text.includes('SECRETSURNAME') === may('passport') && text.includes('SECRETGIVEN') === may('passport'));
    check(role + ': no hashes sent', !/pass_hash|device_hash|link_hash|pin_hash|pin_salt|token_hash/.test(text));
    for (const what of ['regs', 'payments']) {
      const r = await rawPost('/admin/reg/export', { what }, t);
      check(`${role}: export ${what}`, r.status === (may('export') ? 200 : no) && (!may('export') || (await r.text()).includes(what === 'regs' ? 'passport_surname' : 'recorded_by')), r.status); }
    if (role !== 'owner') for (const path of ['/admin/reg?format=csv', '/admin/reg/payments']) {
      const r = await raw(path, t);
      check(`${role}: no export without the password again ${path}`, r.status === (may('export') ? 401 : no), r.status); }
    expect('change the payment QR', await post('/asset', { name: 'test-qr', mime: 'image/png', b64: 'AA' }, t), 'asset');
  }
  db.exec("DELETE FROM reg_asset WHERE name='test-qr'");

  // 2. every actor × every target × every kind of appointment
  const RK = { desk: 0, manager: 1, deputy: 2, chief: 3, owner: 4 }, ROLES5 = Object.keys(RK);
  for (const actor of ROLES5) for (const target of ['chief', 'deputy', 'manager', 'desk']) {
    const ok = (...roles) => RK[actor] >= 2 && roles.every(r => RK[actor] > RK[r]), no = actor === 'desk' ? 401 : 403;
    const ops = target === 'desk' ? ['add', 'reset', 'delete'] : ['add', 'reset', 'delete', 'to:chief', 'to:deputy', 'to:manager'];
    for (const op of ops) {
      wipe();
      const who = person_(actor), it = op === 'add' ? null : person_(target);
      let res, want;
      if (op === 'add') { want = ok(target);
        res = target === 'desk' ? await post('/staff', { name: 'T-new' }, who.tok) : await post('/admins', { name: 'T-new', role: target }, who.tok);
      } else if (op.startsWith('to:')) { const role = op.slice(3); want = ok(target, role);
        res = await post('/admins/role', { id: it.id, role }, who.tok);
        if (want) check(`demoting a deputy reminds (${actor})`, !!res.check === (target === 'deputy' && role === 'manager'), res);
        if (target !== role) check(`${actor} ${op} from ${target}: stored`, (db.prepare('SELECT perms FROM reg_admin WHERE id=?').get(it.id).perms === role) === want, res);
        if (want && target !== role) check(`${actor} ${op} from ${target}: that person's phones are out`, (await call('GET', '/reg/door/me', null, it.tok)).why === 'role');
      } else { want = ok(target);
        res = await post((target === 'desk' ? '/staff/' : '/admins/') + op, { id: it.id }, who.tok);
        if (op === 'delete') {
          check(`${actor} delete ${target}: row gone only if allowed`, !db.prepare(`SELECT 1 FROM ${target === 'desk' ? 'reg_staff' : 'reg_admin'} WHERE id=?`).get(it.id) === want, res);
          if (want) { check(`deleted ${target} stops at once`, (await call('GET', '/reg/door/me', null, it.tok)).why === 'deleted');
            check(`deleting reminds only for a deputy (${target})`, !!res.check === (target === 'deputy'), res); } }
      }
      check(`appoint: ${actor} ${op} ${target}`, res._s === (want ? 200 : no), res);
    }
  }
  for (const role of ['chief', 'deputy', 'manager']) { wipe(); const me = person_(role);
    for (const [path, body] of [['/admins/role', { role: 'manager' }], ['/admins/role', { role: 'chief' }], ['/admins/reset', {}], ['/admins/delete', {}]])
      check(`${role}: never acts on oneself ${path}`, (await post(path, { id: me.id, ...body }, me.tok))._s === 403); }
  { wipe(); const other = person_('chief', 'other2027'), here = person_('manager'), x = await seed('paid', { paid: 1000 });
    check('chief of another event: no list', (await call('GET', '/admin/reg', null, other.tok))._s === 401);
    check('chief of another event: no appointments', (await post('/admins/delete', { id: here.id }, other.tok))._s === 401);
    check('chief of another event: no pass', (await call('GET', '/reg/door/pass?p=' + x.p, null, other.tok))._s === 404);
    const chief = person_('chief'), there = person_('manager', 'other2027');
    check('chief here cannot touch someone there', (await post('/admins/delete', { id: there.id }, chief.tok))._s === 404);
    check('prototype names are not events', (await call('GET', '/admin/reg/me?event=constructor', null, here.tok))._s === 400);
    check('prototype names are not actions', (await post('/act', { id: x.id, action: 'constructor' }, chief.tok))._s === 400); }

  // passwords, names, limits
  wipe();
  const made = await post('/admins', { name: 'T-made', role: 'manager' }, ADMIN);
  check('personal link and a temporary password, shown once', keyOf(made.link) && /^\d{6}$/.test(made.pin) && !('password' in made), made);
  const madeTok = await signIn(made);
  d = await post('/admins/reset', { id: made.id }, ADMIN);
  check('after a reset the phone is out', (await call('GET', '/admin/reg/me', null, madeTok)).why === 'reset');
  check('after a reset the old link is dead', (await call('POST', '/reg/login/hello', { key: keyOf(made.link) }))._s === 404);
  check('the new link works', (await call('GET', '/admin/reg/me', null, await signIn(d))).name === 'T-made');
  check('a desk cannot take a working manager\'s name', (await post('/staff', { name: 'T-made' }, ADMIN)).error === 'name_taken');
  check('platform admin name is reserved', (await post('/admins', { name: '张孝' }, ADMIN)).error === 'name_reserved');
  check('unknown role refused', (await post('/admins', { name: 'T-x', role: 'owner' }, ADMIN))._s === 400);
  const old = Number(db.prepare("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at) VALUES('bstw2027','T-old','-','review,export,cancel','2026-11-01')").run().lastInsertRowid);
  d = await call('GET', '/admin/reg/me', null, phoneFor('admin', old, 'bstw2027'));
  check('someone from before the rules is a site manager', d.role === 'manager' && d.perms.join() === 'door,undo,collect' && !d.appoint.length, d);
  const deputies = () => db.prepare("SELECT COUNT(*) c FROM reg_admin WHERE perms='deputy' AND name LIKE 'T-%' AND event='bstw2027'").get().c;
  wipe();
  readLag = 5;
  let many = await Promise.all([1, 2, 3, 4, 5, 6].map(i => post('/admins', { name: 'T-dep' + i, role: 'deputy' }, ADMIN)));
  check('six deputies at once → three', many.filter(x => x.ok).length === 3 && deputies() === 3 && many.filter(x => !x.ok).every(x => x.error === 'deputy_full'), many);
  const up = person_('manager');
  check('no fourth by promotion', (await post('/admins/role', { id: up.id, role: 'deputy' }, ADMIN)).error === 'deputy_full' && deputies() === 3);
  wipe();
  const cands = [1, 2, 3, 4].map(() => person_('manager'));
  many = await Promise.all(cands.map(c => post('/admins/role', { id: c.id, role: 'chief' }, ADMIN)));
  check('four chiefs at once → one', many.filter(x => x.ok).length === 1 && db.prepare("SELECT COUNT(*) c FROM reg_admin WHERE perms='chief' AND name LIKE 'T-%' AND event='bstw2027'").get().c === 1, many);
  wipe();
  many = await Promise.all([1, 2, 3].map(() => post('/admins', { name: 'T-same' }, ADMIN)));
  check('same name at once → one', many.filter(x => x.ok).length === 1 && many.filter(x => x.error === 'name_taken').length === 2, many);

  readLag = 0;
  { wipe();
    const m = person_('manager'), k = person_('desk'), list = await call('GET', '/admin/reg', null, ADMIN);
    const mv = list.admins.find(a => a.id === m.id).v, kv = list.staff.find(a => a.id === k.id).v;
    check('reset from the screen that is current', (await post('/admins/reset', { id: m.id, v: mv }, ADMIN)).ok);
    check('reset from an older screen loses', (await post('/admins/reset', { id: m.id, v: mv }, ADMIN)).error === 'changed');
    check('desk reset from the screen that is current', (await post('/staff/reset', { id: k.id, v: kv }, ADMIN)).ok);
    check('desk reset from an older screen loses', (await post('/staff/reset', { id: k.id, v: kv }, ADMIN)).error === 'changed'); }
  // 4. a site manager: only the scanned one, only own account
  wipe();
  const mg = person_('manager'), mg2 = person_('manager'), c1 = await seed('cash', { paid: 250 }), c2 = await seed('cash'), cf = await seed('confirmed');
  check('manager: needs the scanned code', (await post('/act', { id: c1.id, action: 'pay' }, mg.tok))._s === 403);
  check('manager: a forged code is refused', (await post('/act', { id: c1.id, p: c1.p.slice(0, -1) + (c1.p.endsWith('0') ? '1' : '0'), action: 'pay' }, mg.tok))._s === 403);
  check('manager: the code pays only its own registration', (await post('/act', { id: c2.id, p: c1.p, action: 'pay' }, mg.tok))._s === 403 && status(c2.id) === 'cash');
  d = await post('/act', { id: cf.id, p: cf.p, action: 'pay', pay: { amount: 1000 } }, mg.tok);
  check('manager: not before pay-on-arrival is approved', d._s === 409 && status(cf.id) === 'confirmed', d);
  d = await post('/act', { id: c1.id, p: c1.p, action: 'pay', pay: { amount: 750, method: 'cash', collector: 'Someone else' }, silent: 1 }, mg.tok);
  check('manager: answer has no other payments', d.ok && !('paid' in d) && !('amount' in d) && !JSON.stringify(d).includes('250'), d);
  const p1 = db.prepare('SELECT * FROM reg_payment WHERE reg_id=? ORDER BY id DESC').get(c1.id);
  check('manager: recorded under own name whatever was sent', p1.collector === mg.name && p1.by_admin === mg.name, p1);
  check('manager: own takings', (await call('GET', '/admin/reg', null, mg.tok)).mine.map(x => x.amount).join() === '750');
  check('manager: not a colleague\'s takings', (await call('GET', '/admin/reg', null, mg2.tok)).mine.length === 0);
  d = await post('/act', { id: c1.id, p: c1.p, action: 'pay' }, mg2.tok);
  check('manager late: sees who, not how or how much', d.error === 'already_paid' && d.last.by === mg.name && !d.last.method && !JSON.stringify(d).includes('750'), d);

  // 6. several at once: one wins, the others learn who, one log line, one letter
  wipe();
  const deps = [1, 2, 3].map(() => person_('deputy')), boss = person_('chief'), team = [ADMIN, boss.tok, ...deps.map(x => x.tok)];
  const name = new Map([[ADMIN, '张孝'], [boss.tok, boss.name], ...deps.map(x => [x.tok, x.name])]);
  for (const [action, from, o, crew] of [['confirm', 'pending', {}, team], ['waitlist', 'pending', {}, team], ['decline', 'pending', {}, team], ['cash', 'confirmed', {}, team], ['pay', 'confirmed', {}, team], ['cancel', 'paid', { paid: 1000 }, team.slice(0, 2)], ['refund', 'cancelled', { paid: 1000, refund: 950 }, team.slice(0, 2)],
    // same kind of caller = same timing, so these really read before either has written
    ['pay', 'confirmed', {}, deps.map(x => x.tok)], ['cash', 'confirmed', {}, deps.map(x => x.tok)], ['cancel', 'paid', { paid: 1000 }, [boss.tok, boss.tok]], ['refund', 'cancelled', { paid: 1000, refund: 950 }, [boss.tok, boss.tok]]]) {
    const x = await seed(from, o), before = mails.length;
    readLag = 25;
    const out = await Promise.all(crew.map(t => post('/act', { id: x.id, action, from, pay: { method: 'alipay' } }, t)));
    readLag = 0;
    const won = out.map((r, i) => r.ok ? name.get(crew[i]) : '').filter(Boolean);
    check(`at once: ${action} → one wins`, won.length === 1, out);
    check(`at once: ${action} → the others see who`, out.filter(r => !r.ok).every(r => r._s === 409 && r.last && r.last.by === won[0] && r.last.at), out);
    check(`at once: ${action} → one log line`, db.prepare('SELECT COUNT(*) c FROM reg_log WHERE reg_id=? AND action=?').get(x.id, action).c === 1);
    check(`at once: ${action} → one letter at most`, mails.length - before === (action === 'refund' ? 0 : 1), mails.length - before);
    if (action === 'pay' || action === 'refund') check(`at once: ${action} → one amount`, db.prepare('SELECT COUNT(*) c FROM reg_payment WHERE reg_id=? AND by_admin<>?').get(x.id, 'Earlier').c === 1);
  }
  const st = await seed('pending');
  await post('/act', { id: st.id, action: 'waitlist', from: 'pending', silent: 1 }, deps[0].tok);
  d = await post('/act', { id: st.id, action: 'confirm', from: 'pending', silent: 1 }, deps[1].tok);
  check('an old screen cannot overwrite what was decided', d.error === 'bad_state' && d.last.by === deps[0].name && status(st.id) === 'waitlist', d);
  const part = await seed('confirmed');
  await post('/act', { id: part.id, action: 'pay', pay: { amount: 300, seen: 1000 } }, deps[0].tok);
  d = await post('/act', { id: part.id, action: 'pay', pay: { amount: 300, seen: 1000 } }, deps[1].tok);
  check('the same screenshot twice from an old screen → once', d.error === 'already_paid' && d.last.by === deps[0].name, d);
  check('a second instalment from a fresh screen is fine', (await post('/act', { id: part.id, action: 'pay', pay: { amount: 300, seen: 700 } }, deps[1].tok)).rest === 400);
  const no_ = await seed('pending', { note: 'first' });
  check('note saved', (await post('/act', { id: no_.id, action: 'note', was: 'first', note: 'mine' }, deps[0].tok)).note === 'mine');
  d = await post('/act', { id: no_.id, action: 'note', was: 'first', note: 'theirs' }, deps[1].tok);
  check('note: late writer sees who', d.error === 'note_changed' && d.note === 'mine' && d.last.by === deps[0].name, d);

  // 5. refunds together never above what is due
  const rf = await seed('cancelled', { paid: 2000, refund: 1200 });
  check('refund above due (although held)', (await post('/act', { id: rf.id, action: 'refund', pay: { amount: 1201 } }, boss.tok))._s === 400);
  check('refund in parts', (await post('/act', { id: rf.id, action: 'refund', pay: { amount: 700 } }, boss.tok)).due === 500);
  check('second part above the rest', (await post('/act', { id: rf.id, action: 'refund', pay: { amount: 501 } }, boss.tok))._s === 400);
  check('last part', (await post('/act', { id: rf.id, action: 'refund', pay: { amount: 500 } }, boss.tok)).due === 0);
  d = await post('/act', { id: rf.id, action: 'refund', pay: { amount: 1 } }, ADMIN);
  check('nothing more once all is back', d.error === 'already_refunded' && d.last.by === boss.name, d);
  const none = await seed('cancelled', { paid: 50, refund: 0 });
  check('nothing due → nothing refunded', (await post('/act', { id: none.id, action: 'refund', pay: { amount: 50 } }, boss.tok))._s === 400);

  readLag = 5;
  // check-in and undo at once
  const ci = await seed('paid', { paid: 1000 }), m1 = person_('manager'), m2 = person_('manager');
  many = await Promise.all([m1, m2].map(x => call('POST', '/reg/door/checkin', { p: ci.p, item: 'M3' }, x.tok)));
  check('check-in at once → one, the other sees who', many.filter(x => x.ok).length === 1 && many.find(x => !x.ok).by === many.find(x => x.ok).by, many);
  const at = many.find(x => x.ok).at;
  many = await Promise.all([m1, m2].map(x => call('POST', '/reg/door/checkin', { p: ci.p, item: 'M3', undo: 1, at }, x.tok)));
  const un = [m1, m2][many.findIndex(x => x.ok)];
  check('undo at once → one, the other sees who', many.filter(x => x.ok).length === 1 && many.find(x => !x.ok).last.by === un.name, many);

  readLag = 0;
  const again = await call('POST', '/reg/door/checkin', { p: ci.p, item: 'M3' }, m1.tok);
  d = await call('POST', '/reg/door/checkin', { p: ci.p, item: 'M3', undo: 1, at: '2026-11-01T00:00:00.000Z' }, m2.tok);
  check('an old screen cannot undo a newer check-in', again.ok && d.error === 'already_undone' && d.last.action === 'checkin' && d.last.by === m1.name && db.prepare('SELECT 1 FROM reg_checkin WHERE reg_id=?').get(ci.id), d);
  // 7. names and times on the page
  const h = await seed('pending');
  for (const [action, t] of [['confirm', deps[0].tok], ['cash', deps[1].tok], ['cancel', ADMIN]]) await post('/act', { id: h.id, action, silent: 1 }, t);
  db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)").run(st.id, '2026-11-22T00:00:00Z', 'decline', 'sorry (by Old Name)');
  db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)").run(st.id, '2026-11-22T00:00:01Z', 'checkin_undo', '0:M3 by Old Undo');
  d = await call('GET', '/admin/reg', null, boss.tok);
  const row = id => d.rows.find(r => r.id === id);
  check('history: every step with name and time', row(h.id).log.map(l => l.action + ':' + l.by).join() === `confirm:${deps[0].name},cash:${deps[1].name},cancel:张孝` && row(h.id).log.every(l => l.at), row(h.id).log);
  check('history: undo with the name', row(ci.id).undos[0].by === un.name && row(ci.id).undos[0].item === 'M3', row(ci.id).undos);
  check('history: lines from before still read', row(st.id).log.some(l => l.by === 'Old Name') && row(st.id).undos.some(u => u.by === 'Old Undo'), row(st.id).log);
  check('history: money has who recorded it', row(rf.id).payments.filter(p => p.amount < 0).every(p => p.by_admin === boss.name && p.at));
  const c = await rawPost('/admin/reg/export', { what: 'payments' }, boss.tok);
  check('ledger CSV has the recorder', (await c.text()).includes(boss.name));

  wipe();
  for (const id of codes) for (const [t, col] of [['reg_checkin', 'reg_id'], ['reg_payment', 'reg_id'], ['reg_log', 'reg_id'], ['reg', 'id']]) db.prepare(`DELETE FROM ${t} WHERE ${col}=?`).run(id);
  mails.length = 0;
  EV.chief = seat; }
// a form re-sent at the moment someone reviews it
{ const ned = subscriber('ned@example.com', 'Ned'), first = await call('POST', '/reg', form({ people: [person({ name: 'Ned', pkg: 'pass' })] }), ned);
  const real = env.SDB.prepare;
  env.SDB.prepare = sql => { if (sql.startsWith('UPDATE reg SET lang=')) db.prepare("UPDATE reg SET status='waitlist' WHERE code=?").run(first.code); return real(sql); };
  const d = await call('POST', '/reg', form({ people: [person({ name: 'Ned', pkg: 'full' })] }), ned);
  env.SDB.prepare = real;
  check('a re-sent form cannot change what was just reviewed', d._s === 409 && d.status === 'waitlist' && db.prepare('SELECT amount FROM reg WHERE code=?').get(first.code).amount === 700, d); }
// --- three bugs found 2026-11-23 (all reproduced on real D1 before they were fixed) ---
{ const safe = (...a) => call(...a).catch(e => ({ _s: 500, error: String(e && e.message || e) }));
  // 1. sent together → every one saved, every code different
  const toks = Array.from({ length: 200 }, (_, i) => subscriber(`burst${i}@example.test`, 'Burst ' + i));
  readLag = 10;
  const out = await Promise.all(toks.map(t => safe('POST', '/reg', form(), t)));
  readLag = 0;
  check('200 sent at once: none fails', out.every(r => r.ok), [out.filter(r => !r.ok).length, out.find(r => !r.ok)]);
  check('200 sent at once: 200 different codes', new Set(out.filter(r => r.ok).map(r => r.code)).size === 200 && out.every(r => !r.ok || /^BJ27-\d{4}$/.test(r.code)));
  // 2. one email pressing again and again → one registration, one receipt
  for (const gap of [0, 12, 40]) {
    const email = `press${gap}@example.test`, t = subscriber(email, 'Press'), before = mails.length;
    readLag = 25;
    const r = await Promise.all([0, 1, 2, 3, 4].map(i => new Promise(ok => setTimeout(ok, i * gap)).then(() => safe('POST', '/reg', form(), t))));
    readLag = 0;
    check(`same email pressed five times (${gap} ms): one row`, db.prepare('SELECT COUNT(*) c FROM reg WHERE email=?').get(email).c === 1);
    check(`same email pressed five times (${gap} ms): every press gets that code`, r.every(x => x.ok && x.code === r[0].code), r);
    check(`same email pressed five times (${gap} ms): one receipt`, mails.slice(before).filter(m => m.includes(`to=${email}`) || m.includes(`${email}] `)).length === 1, mails.length - before);
  }
  { const t = subscriber('edit@example.test', 'Edit');
    await call('POST', '/reg', form(), t);
    const d = await call('POST', '/reg', form({ people: [person({ pkg: 'pass' })] }), t);
    check('a changed form still updates the waiting one', d.ok && d.updated && d.total === 700, d); }
  // 3. the hotel refund date ends at Beijing midnight
  for (const [at, want] of [['2027-06-11T23:59:59+08:00', 2400], ['2027-06-12T00:00:00+08:00', 1400]]) {
    const email = `cut${want}@example.test`, t = subscriber(email, 'Cut');
    const reg = await call('POST', '/reg', form({ hotel: 'yes', rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], passports: [{ s: 'TEST', g: 'CUT' }] }), t);
    const id = db.prepare('SELECT id FROM reg WHERE code=?').get(reg.code).id;
    db.prepare("UPDATE reg SET status='paid',amount=2450,hotel_amount=1000 WHERE id=?").run(id);
    db.prepare("INSERT INTO reg_payment(reg_id,at,amount,method,collector,by_admin) VALUES(?,'2027-01-01',2450,'alipay','x','x')").run(id);
    const Real = globalThis.Date, now = Real.parse(at);
    globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
    const d = await call('POST', '/admin/reg/act', { id, action: 'cancel', silent: 1 }, ADMIN);
    globalThis.Date = Real;
    check('hotel refund, Beijing time ' + at, d.refund === want, d);
  }
  const mine = "SELECT id FROM reg WHERE email LIKE '%@example.test'";
  for (const t of ['reg_payment', 'reg_log']) db.exec(`DELETE FROM ${t} WHERE reg_id IN (${mine})`);
  db.exec("DELETE FROM reg WHERE email LIKE '%@example.test'");
  mails.length = 0; }
// --- found by the 200-registration run, 2026-11-23 ---
{ const t = subscriber('odd@example.test', 'Odd');
  for (const o of [{ event: 'constructor' }, { people: [person({ pkg: 'constructor', items: [] })] }, { people: [person({ pkg: 'single', items: ['constructor'] })] }, { hotel: 'yes', passports: [{ s: 'AA', g: 'BB' }], rooms: [{ type: 'constructor', ci: '2027-06-18', co: '2027-06-20', guests: [0] }] }]) {
    const d = await call('POST', '/reg', form(o), t).catch(e => ({ _s: 500, error: String(e.message) }));
    check('odd input is refused, not a server error', d._s === 400, d); }
  const ids = [];
  for (let i = 0; i < 3; i++) ids.push(Number(db.prepare("INSERT INTO reg(event,code,email,status,people,data,amount,created_at,updated_at,confirmed_at) VALUES('bstw2027',?,?,'confirmed',1,'{\"people\":[],\"rooms\":[],\"passports\":[]}',700,'2026-01-01','2026-01-01','2026-01-01T00:00:00Z')").run('BJ27-84' + String(i).padStart(2, '0'), `due${i}@example.test`).lastInsertRowid));
  mails.length = 0; readLag = 20;
  await Promise.all([regCron(env), regCron(env), regCron(env)]);
  readLag = 0;
  check('overlapping timers: one reminder each', ids.every((_, i) => mails.filter(m => m.includes('BJ27-840' + i)).length === 1), mails.length);
  db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,'2026-11-23','mail_failed:paid','SMTP secret detail')").run(ids[0]);
  db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,'2026-11-23','mail_failed:remind','x'),(?,'2026-11-24','mail:remind','to')").run(ids[1], ids[1]);
  const list = await call('GET', '/admin/reg', null, ADMIN), row = i => list.rows.find(r => r.id === ids[i]);
  check('failed letters are shown, without the error text', row(0).mail_failed.map(f => f.action).join() === 'paid' && !JSON.stringify(list).includes('SMTP secret detail'), row(0).mail_failed);
  check('a later success clears it', row(1).mail_failed.length === 0);
  for (const id of ids) { db.prepare('DELETE FROM reg_log WHERE reg_id=?').run(id); db.prepare('DELETE FROM reg WHERE id=?').run(id); }
  mails.length = 0; }
// rename migration moves old bj2027 rows
db.prepare("INSERT INTO reg(event,code,email,status,people,data,amount,created_at,updated_at) VALUES('bj2027','OLD-1','old@x.com','pending',1,'{\"people\":[],\"rooms\":[],\"passports\":[]}',0,'2026-11-01','2026-11-01')").run();
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0023_rename_bstw2027.sql'), 'utf8'));
check('rename migration moves old rows to bstw2027', db.prepare("SELECT event FROM reg WHERE code='OLD-1'").get().event === 'bstw2027');
db.prepare("DELETE FROM reg WHERE code='OLD-1'").run();
// live mode goes to the dancer
env.REG_LIVE = '1'; mails.length = 0; const cat = subscriber('cat@qq.com', 'Cat');
d = await call('POST', '/reg', form({ lang: 'zh' }), cat); check('live: letter to the dancer in Chinese', mails.some(m => m.includes('to=cat@qq.com') && m.includes('已收到报名')), mails);
// Cloudflare send_email binding: Reply-To must not be sent as a custom header
{ const sent = []; const benv = { ...env, SOCIAL_MAIL: 'sub_mail', REG_LIVE: '', SUB_MAIL: { send: async m => { if (m.headers && (m.headers['Reply-To'] || m.headers.Cc)) throw new Error("custom header 'Reply-To' is not allowed"); sent.push(m); } } };
  const dan = subscriber('dan@gmail.com', 'Dan');
  const res = await social(new Request('https://api.tangoweekend.org/social/reg', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', Authorization: 'Bearer ' + dan }, body: JSON.stringify(form()) }), benv, new URL('https://api.tangoweekend.org/social/reg'), json);
  check('binding mail goes out with replyTo field, no Reply-To header', (await res.json()).ok && sent.some(m => m.replyTo === 'info@tangoweekend.org' && /Registration received/.test(m.subject)), sent.map(m => m.subject)); }
// letters: only uploaded QR codes, page link, Beijing date, no transfer note
{ const reg = { code: 'BJ27-0777', lang: 'zh', amount: 1450, due_at: '2026-12-14T17:30:00.000Z', data: { people: [], rooms: [], hotel: false } };
  for (const lang of ['en', 'zh', 'ko', 'es', 'ru']) for (const kind of ['conf', 'upd', 'rem']) {
    const m = R.letter(kind, { ...reg, lang }, env, null, ['intl-alipay']);
    check(`${lang} ${kind}: date, link, only uploaded QR`, m.text.includes('2026-12-15') && !m.text.includes('2026-12-14') && m.html.includes(`?lang=${lang}#pay"`) && m.html.includes('intl-alipay') && !m.html.includes('intl-wechat'), m.text);
    check(`${lang} ${kind}: no transfer note, new word`, !/transfer note|转账备注|收款码|송금 메모|nota de la transferencia|комментарии к переводу/.test(m.text));
  }
  const p = R.letter('paid', reg, env, [{ name: 'A', pass: 'BJ27-0777-1.x' }]);
  check('paid letter links to the live page', p.text.includes('/register/draft/?lang=zh#passes') && p.html.includes('#passes"'));
  mails.length = 0;
  db.prepare("INSERT INTO reg_asset(name,mime,data,updated_at) SELECT 'intl-alipay',mime,data,updated_at FROM reg_asset WHERE name='intl-wechat'").run();
  db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at,due_at) VALUES('bstw2027','BJ27-8901','qr@x.com','en','confirmed',1,?,1450,'2026-01-01','2026-01-01','2026-01-01T00:00:00Z','2026-01-15T00:00:00Z')").run(JSON.stringify({ people: [], rooms: [], passports: [], hotel: false }));
  await regCron(env);
  check('reminder: both uploaded QRs, Alipay first', mails.some(m => m.includes('BJ27-8901') && m.indexOf('/qr/intl-alipay') > 0 && m.indexOf('/qr/intl-alipay') < m.indexOf('/qr/intl-wechat'))); }
// registration sign-in must not change update-mail consent
{ db.exec("CREATE TABLE IF NOT EXISTS email_subs(id INTEGER PRIMARY KEY, email TEXT, status TEXT, unsubscribed_at TEXT); CREATE TABLE IF NOT EXISTS mail_unsub(email TEXT PRIMARY KEY, at TEXT); CREATE TABLE IF NOT EXISTS user_phone(user_id INTEGER PRIMARY KEY, phone TEXT, updated_at TEXT)");
  const st = subscriber('stay@x.com', 'Stay'); db.prepare("INSERT INTO email_subs(email,status) VALUES('stay@x.com','active')").run();
  const status = () => db.prepare("SELECT status FROM email_subs WHERE email='stay@x.com'").get().status;
  const ret = 'https://tangoweekend.org/event/beijing-2027-tango-weekend/register/draft/';
  let p = await call('POST', '/profile', { email: 'stay@x.com', sub: 1, ret }, st);
  check('sign-in again keeps the subscription', p.ok && status() === 'active', p);
  p = await call('POST', '/profile', { email: 'stay@x.com', sub: 1, alert: 0, ret }, st);
  check('explicit opt-out still works', p.ok && status() === 'unsubscribed', p); }
// pay on arrival: scan to collect, no entry before payment, no double collection
{ mails.length = 0;
  const mk = db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at) VALUES('bstw2027','BJ27-8950','arr@x.com','ko','confirmed',2,?,2900,'2026-12-01','2026-12-01','2026-12-01T00:00:00Z')")
    .run(JSON.stringify({ people: [person({ pkg: 'single', items: ['M1'], amount: 1450 }), person({ name: 'Second', pkg: 'single', items: ['M1'], amount: 1450 })], rooms: [], passports: [], hotel: false }));
  const aid = Number(mk.lastInsertRowid);
  db.prepare("UPDATE reg SET note='private note' WHERE id=?").run(aid);
  let a = await call('POST', '/admin/reg/act', { id: aid, action: 'pay', pay: { amount: 900, method: 'alipay' } }, ADMIN);
  check('arrival: part paid first', a.ok && a.rest === 2000, a);
  a = await call('POST', '/admin/reg/act', { id: aid, action: 'cash' }, ADMIN);
  check('arrival: letter shows what is left, zh + ko', a.ok && mails.some(m => m.includes('BJ27-8950') && m.includes('¥2,000') && m.includes('付款后才能入场') && m.includes('결제 후 입장')), mails);
  const arr = subscriber('arr@x.com', 'Arr');
  const me = await call('GET', '/reg/me?event=bstw2027', null, arr);
  check('arrival: page gets lang, people and rest', me.reg.lang === 'ko' && me.reg.people === 2 && me.reg.rest === 2000 && me.reg.passes.length === 2, me);
  const [p1, p2] = me.reg.passes.map(x => encodeURIComponent(x.pass));
  const dt = await signIn(await call('POST', '/admin/reg/staff', { name: 'Desk' }, ADMIN));
  a = await call('GET', '/reg/door/pass?p=' + p1, null, dt);
  check('front desk: pay first, no amount, no note', a.pay_first === true && !a.collect && !a.cash_due && a.note === '' && !JSON.stringify(a).includes('2000') && a.lang === 'ko', a);
  a = await call('POST', '/reg/door/checkin', { p: me.reg.passes[0].pass, item: 'M1' }, dt);
  check('cannot check in before paying', a._s === 409 && a.error === 'pay_first', a);
  a = await call('POST', '/admin/reg/act', { id: aid, action: 'pay', pay: { method: 'alipay' } }, dt);
  check('front desk cannot collect', a._s === 401 || a._s === 403, a);
  const rev = await signIn(await call('POST', '/admin/reg/admins', { name: 'Reviewer', role: 'deputy' }, ADMIN)), col = await signIn(await call('POST', '/admin/reg/admins', { name: 'Collector', perms: ['collect'] }, ADMIN));
  const pw = x => x;
  a = await call('GET', '/reg/door/pass?p=' + p1, null, pw(rev));
  check('deputy: rest and what was paid before', a.pay_first && a.collect.rest === 2000 && a.collect.paid === 900, a);
  a = await call('GET', '/reg/door/pass?p=' + p2, null, pw(col));
  check('collector: rest from a companion code, not the earlier payment', a.collect.id === aid && a.collect.rest === 2000 && a.collect.paid === undefined, a);
  check('collector: /me says collect', (await call('GET', '/reg/door/me', null, pw(col))).collect === true);
  a = await call('POST', '/admin/reg/act', { id: aid, action: 'pay', pay: { amount: 2000 } }, pw(col));
  check('manager collects only with the scanned code', a._s === 403, a);
  a = await call('POST', '/admin/reg/act', { id: aid + 1, p: me.reg.passes[1].pass, action: 'pay', pay: { amount: 100 } }, pw(col));
  check('a scanned code pays only its own registration', a._s === 403, a);
  a = await call('POST', '/admin/reg/act', { id: aid, p: me.reg.passes[1].pass, action: 'pay', pay: { amount: -5 } }, pw(col));
  check('bad amount refused', a._s === 400, a);
  a = await call('POST', '/admin/reg/act', { id: aid, p: me.reg.passes[1].pass, action: 'pay', pay: { amount: 2001 } }, pw(col));
  check('cannot collect more than is owed', a._s === 400 && a.rest === 2000, a);
  const both = await Promise.all([1, 2].map(() => call('POST', '/admin/reg/act', { id: aid, p: me.reg.passes[1].pass, action: 'pay', pay: { amount: 2000, method: 'cash' } }, pw(col))));
  check('simultaneous collection: only one recorded', both.filter(x => x.ok).length === 1 && both.some(x => x._s === 409) && db.prepare('SELECT SUM(amount) s FROM reg_payment WHERE reg_id=?').get(aid).s === 2900, both);
  a = await call('POST', '/admin/reg/act', { id: aid, p: me.reg.passes[1].pass, action: 'pay', pay: { amount: 100 } }, pw(col));
  check('paid registration refuses more', a._s === 409 && a.error === 'already_paid' && a.last.collector === 'Collector', a);
  a = await call('GET', '/admin/reg?event=bstw2027', null, pw(col));
  check('manager sees own takings', a.mine.length === 1 && a.mine[0].amount === 2000 && a.mine[0].code === 'BJ27-8950', a.mine);
  a = await call('GET', '/reg/door/pass?p=' + p1, null, pw(col));
  check('manager: no amount and no note once paid', a.collect.paid === undefined && a.collect.rest === 0 && a.note === '', a);
  for (const p of me.reg.passes) { a = await call('POST', '/reg/door/checkin', { p: p.pass, item: 'M1' }, dt); check('after payment everyone can enter', a.ok, a); }
  const undo = who => call('POST', '/reg/door/checkin', { p: me.reg.passes[0].pass, item: 'M1', undo: 1 }, who);
  a = await undo(dt); check('front desk cannot undo', a._s === 403 && a.error === 'manager_only', a);
  a = await call('GET', '/reg/door/pass?p=' + p1, null, dt); check('check-in still there after refused undo', a.checkins.length === 1, a);
  a = await undo(pw(rev)); check('deputy can undo', a.ok && a.undone, a);
  await undo(pw(rev));
  a = (await call('GET', '/admin/reg', null, ADMIN)).rows.find(r => r.id === aid);
  check('undo keeps who did it, once', a.undos.length === 1 && a.undos[0].by === 'Reviewer' && a.undos[0].item === 'M1' && a.undos[0].person === 0 && a.undos[0].at, a.undos);
  const oth = Number(db.prepare("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at) VALUES('other2027','Other','-','collect','2026-12-01')").run().lastInsertRowid);
  a = await call('GET', '/reg/door/pass?p=' + p1, null, phoneFor('admin', oth, 'other2027'));
  check('manager of another event cannot read the pass', a._s === 404, a); }
// CSV: no formulas from typed text, Beijing time
{ db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at) VALUES('bstw2027','BJ27-8960','csv@x.com','en','pending',1,?,0,'2026-12-01T17:30:00.000Z','2026-12-01')")
    .run(JSON.stringify({ people: [{ name: '=1+1', city: '@x', wechat: '+86 123', pkg: 'single', items: [], extra: [], amount: 0 }], rooms: [], passports: [], hotel: false }));
  const u = 'https://api.tangoweekend.org/social/admin/reg?event=bstw2027&format=csv';
  const t = await (await social(new Request(u, { headers: { Authorization: 'Bearer ' + ADMIN } }), env, new URL(u), json)).text();
  const line = t.split('\n').find(l => l.startsWith('BJ27-8960'));
  check('csv: formulas neutralised', line.includes("'=1+1") && line.includes("'@x") && line.includes("'+86 123"), line);
  check('csv: Beijing time', line.includes('2026-12-02 01:30'), line); }
// --- S02 and S09 (2026-11-23): the last seat, and a cancel at the same moment as a payment ---
{ const EV = R.EVENTS.bstw2027, cap0 = EV.items.S1.cap; let seatSeq = 0;
  const mk = (status, items = ['yard'], amount = 450, email) => Number(db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at) VALUES('bstw2027',?,?,'en',?,1,?,?,'2026-12-01','2026-12-01','2026-12-01T00:00:00Z')")
    .run('SEAT-' + (++seatSeq), email || `seat${seatSeq}@example.test`, status, JSON.stringify({ people: [person({ pkg: 'single', items: items.map(k => ({ yard: 'S1', 'sat-eve': 'M2' })[k] || k), amount })], rooms: [], passports: [], hotel: false }), amount).lastInsertRowid);
  const seated = () => db.prepare("SELECT data FROM reg WHERE event='bstw2027' AND status IN ('confirmed','paid','cash')").all().reduce((n, r) => n + JSON.parse(r.data).people.filter(p => (p.items || []).includes('S1')).length, 0);
  const clear = () => { db.exec("DELETE FROM reg_log WHERE reg_id IN (SELECT id FROM reg WHERE email LIKE 'seat%@example.test')"); db.exec("DELETE FROM reg_payment WHERE reg_id IN (SELECT id FROM reg WHERE email LIKE 'seat%@example.test')"); db.exec("DELETE FROM reg WHERE email LIKE 'seat%@example.test'"); };
  EV.items.S1.cap = seated() + 1;   // one seat left
  for (let round = 0; round < 5; round++) {
    const ids = [1, 2, 3, 4, 5].map(() => mk('pending'));
    readLag = 15;
    const out = await Promise.all(ids.map(id => call('POST', '/admin/reg/act', { id, action: 'confirm', silent: 1 }, ADMIN)));
    readLag = 0;
    check('S02: five confirm the last seat at once → one', out.filter(x => x.ok).length === 1 && out.filter(x => x.error === 'full').length === 4 && seated() === EV.items.S1.cap, out.map(x => x.error || 'ok'));
    db.prepare('UPDATE reg SET status=? WHERE id IN (' + ids.join() + ')').run('cancelled');
  }
  { const a = mk('pending'), b = mk('confirmed', ['sat-eve']);
    readLag = 15;
    const [c, m] = await Promise.all([call('POST', '/admin/reg/act', { id: a, action: 'confirm', silent: 1 }, ADMIN), call('POST', '/admin/reg/act', { id: b, action: 'modify', silent: 1, data: form({ people: [person({ pkg: 'single', items: ['yard', 'sat-eve'] })] }) }, ADMIN)]);
    readLag = 0;
    check('S02: a change into the last seat and a confirm at once → one', [c, m].filter(x => x.ok).length === 1 && seated() <= EV.items.S1.cap, [c.error || 'ok', m.error || 'ok', seated()]); }
  { // someone takes the last seat exactly while a change is being saved: the change is refused, says full
    EV.items.S1.cap = seated() + 1;
    const other = mk('pending'), b = mk('confirmed', ['sat-eve']), real = env.SDB.prepare;
    env.SDB.prepare = sql => { if (sql.startsWith('UPDATE reg SET data=')) { env.SDB.prepare = real; db.prepare("UPDATE reg SET status='confirmed' WHERE id=?").run(other); } return real(sql); };
    const m = await call('POST', '/admin/reg/act', { id: b, action: 'modify', silent: 1, data: form({ people: [person({ pkg: 'single', items: ['yard', 'sat-eve'] })] }) }, ADMIN);
    env.SDB.prepare = real;
    check('S02: a change saved while the last seat goes → refused, full', m.error === 'full' && m.item === 'S1' && seated() === EV.items.S1.cap, [m, seated()]); }
  EV.items.S1.cap = cap0; clear();
  // S09: whichever comes first, the other is refused and the money adds up
  let bad = 0;
  for (let i = 0; i < 20; i++) {
    const id = mk('confirmed', ['sat-eve'], 1000);
    if (i % 2) db.prepare("INSERT INTO reg_payment(reg_id,at,amount,method,collector,by_admin) VALUES(?,'2026-12-01',300,'alipay','x','x')").run(id);
    readLag = 5 + (i % 4) * 5;
    const [c, p] = await Promise.all([call('POST', '/admin/reg/act', { id, action: 'cancel', silent: 1 }, ADMIN), call('POST', '/admin/reg/act', { id, action: 'pay', pay: { method: 'alipay' }, silent: 1 }, ADMIN)]);
    readLag = 0;
    const row = db.prepare('SELECT status,refund FROM reg WHERE id=?').get(id), sum = db.prepare('SELECT COALESCE(SUM(amount),0) s FROM reg_payment WHERE reg_id=?').get(id).s;
    const right = row.status === 'cancelled' ? (row.refund || 0) === Math.max(0, sum - 50) && !(c.ok && p.ok) : row.status === 'paid' && sum === 1000;
    if (!right) bad++;
  }
  check('S09: cancel and payment at once → always adds up', bad === 0, bad);
  { const id = mk('confirmed', ['sat-eve'], 1000);
    db.prepare("UPDATE reg SET status='cancelled',refund=0 WHERE id=?").run(id);
    const d = await call('POST', '/admin/reg/act', { id, action: 'pay', from: 'confirmed', pay: { method: 'alipay' }, silent: 1 }, ADMIN);
    check('S09: no payment onto a cancelled registration', !d.ok && db.prepare('SELECT COUNT(*) c FROM reg_payment WHERE reg_id=?').get(id).c === 0, d); }
  // a payment read before a cancel lands later: refused, and says who cancelled
  { const id = mk('confirmed', ['sat-eve'], 1000), real = env.SDB.prepare;
    env.SDB.prepare = sql => { if (sql.startsWith('INSERT INTO reg_payment')) { env.SDB.prepare = real; db.prepare("UPDATE reg SET status='cancelled' WHERE id=?").run(id); db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)").run(id, '2026-12-02T00:00:00Z', 'cancel', JSON.stringify({ by: '总管Z', text: '' })); } return real(sql); };
    const d = await call('POST', '/admin/reg/act', { id, action: 'pay', pay: { method: 'alipay' }, silent: 1 }, ADMIN);
    env.SDB.prepare = real;
    check('S09: the later payment is told who cancelled', d.error === 'bad_state' && d.last && d.last.by === '总管Z' && db.prepare('SELECT COUNT(*) c FROM reg_payment WHERE reg_id=?').get(id).c === 0, d); }
  // a cancel read before a payment lands later: refused, says who paid; then a fresh cancel refunds the right amount
  { const id = mk('confirmed', ['sat-eve'], 1000), real = env.SDB.prepare;
    env.SDB.prepare = sql => { if (sql.startsWith("UPDATE reg SET status='cancelled'")) { env.SDB.prepare = real; db.prepare("INSERT INTO reg_payment(reg_id,at,amount,method,collector,by_admin) VALUES(?,'2026-12-02',300,'alipay','x','副总管F')").run(id); db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)").run(id, '2026-12-02T00:00:00Z', 'pay', JSON.stringify({ by: '副总管F', text: '' })); } return real(sql); };
    let d = await call('POST', '/admin/reg/act', { id, action: 'cancel', silent: 1 }, ADMIN);
    env.SDB.prepare = real;
    check('S09: a cancel worked out before a part payment landed is refused, says who', d.error === 'bad_state' && d.status === 'confirmed' && d.last.by === '副总管F' && db.prepare('SELECT status FROM reg WHERE id=?').get(id).status === 'confirmed', d);
    d = await call('POST', '/admin/reg/act', { id, action: 'cancel', silent: 1 }, ADMIN);
    check('S09: cancelled again from the new screen, refund counts that payment', d.ok && d.refund === 250, d); }
  clear(); mails.length = 0; }
// --- sign-in (TP step 2, docs/tangopass.md 2026-11-23): link + six digits, lock, stop, phones, password again ---
{ const Real = globalThis.Date;
  const at = iso => { const now = Real.parse(iso); globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }; };
  const back = () => { globalThis.Date = Real; };
  const L = (path, body, tok) => call('POST', '/reg/login' + path, body, tok);
  const me = tok => call('GET', '/admin/reg/me?event=bstw2027', null, tok);
  const T0 = '2027-06-19T01:00:00.000Z';   // 09:00 Beijing
  at(T0);
  // made: link + temporary password; the QR is the link and holds no password
  const m = await call('POST', '/admin/reg/admins', { name: 'L-mgr', role: 'manager' }, ADMIN), key = keyOf(m.link);
  check('login: link holds no password', key && !m.link.includes(m.pin) && m.link.startsWith('https://tangoweekend.org/event/beijing-2027-tango-weekend/register/in/#'), m);
  let d = await L('/hello', { key });
  check('login: opening the link says whose it is, and nothing else', d.ok && d.name === 'L-mgr' && d.role === 'manager' && d.state === 'new' && d.devices === 1 && Object.keys(d).sort().join() === '_s,devices,event,event_name,name,ok,role,state', d);
  check('login: unknown link', (await L('/hello', { key: 'a'.repeat(48) }))._s === 404 && (await L('/hello', { key: 'x' }))._s === 404);
  const row = () => db.prepare("SELECT * FROM reg_admin WHERE name='L-mgr'").get();
  check('login: the digits are never stored', !JSON.stringify(row()).includes(m.pin) && row().pin_hash !== sha(m.pin) && row().pin_hash === pinH(row().pin_salt, m.pin));
  // first sign-in: the temporary one must be changed, and not to something simple
  d = await L('', { key, pin: m.pin }); check('login: temporary password asks for a new one', d.need_new && !d.token, d);
  for (const [bad, why] of [['111111', 'same'], ['123456', 'run'], ['654321', 'run'], ['012345', 'run'], ['121212', 'repeat'], ['123123', 'repeat'], ['112233', 'repeat'], ['520520', 'repeat'], ['520131', 'common'], ['147258', 'common'], ['159753', 'common'], [m.pin, 'temp'], ['12345', 'format'], ['12a456', 'format']]) {
    d = await L('', { key, pin: m.pin, new_pin: bad }); check('login: too simple ' + bad, d._s === 400 && d.error === 'too_simple' && d.why === why, d); }
  check('login: refusing a simple one costs no try', row().fails === 0);
  check('login: a birthday is allowed', !R.pinWeak('19880412'.slice(2)) && !R.pinWeak('041288'));
  d = await L('', { key, pin: m.pin, new_pin: '730195' }); const ph1 = d.token;
  check('login: in, to the right page', d.ok && /^dev:[0-9a-f]{64}$/.test(ph1) && d.home === 'admin' && d.role === 'manager', d);
  check('login: the temporary one is spent', (await L('', { key, pin: m.pin }))._s === 401 && row().fails === 1);
  check('login: the link opens again', (await L('/hello', { key })).state === 'ok');
  d = await L('', { key, pin: '730195' }); check('login: the right one resets the count', d.ok && row().fails === 0, d);
  const ph2 = d.token;
  // one phone for a 现场经理: the earlier one is out and told why
  d = await me(ph1); check('phones: over the limit, the first is out', d._s === 401 && d.error === 'signed_out' && d.why === 'replaced' && d.at, d);
  check('phones: the newer one works', (await me(ph2)).name === 'L-mgr');
  // five wrong: 15 minutes; the right one does not help while locked
  for (let i = 1; i <= 4; i++) { d = await L('', { key, pin: '000001' }); check('lock: wrong ' + i + ' says how many are left', d._s === 401 && d.error === 'wrong_pin' && d.left === 5 - i && d.then === 'lock', d); }
  d = await L('', { key, pin: '000001' }); check('lock: the fifth locks 15 minutes', d._s === 423 && d.error === 'locked' && Real.parse(d.until) - Real.parse(T0) === 15 * 60e3, d);
  d = await L('', { key, pin: '730195' }); check('lock: right while locked is still refused', d._s === 423, d);
  check('lock: hello says locked', (await L('/hello', { key })).state === 'locked');
  check('lock: a phone already in goes on working', (await me(ph2)).name === 'L-mgr');
  at('2027-06-19T01:15:01.000Z');
  // after the lock, wrong goes on counting to ten: stopped, every phone out, only a reset brings back
  for (let i = 6; i <= 9; i++) { d = await L('', { key, pin: '000002' }); check('stop: wrong ' + i, d.error === 'wrong_pin' && d.left === 10 - i && d.then === 'stop', d); }
  d = await L('', { key, pin: '000002' }); check('stop: the tenth stops', d._s === 403 && d.error === 'stopped', d);
  check('stop: the right one no longer works', (await L('', { key, pin: '730195' }))._s === 403);
  check('stop: phones out, told why', (await me(ph2)).why === 'stopped');
  let list = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).admins.find(a => a.name === 'L-mgr');
  check('stop: settings show it', list.login.state === 'stopped', list.login);
  const r1 = await call('POST', '/admin/reg/admins/reset', { id: m.id }, ADMIN);
  check('stop: reset lifts it with a new link', r1.ok && (await L('/hello', { key: keyOf(r1.link) })).state === 'new' && (await L('/hello', { key }))._s === 404);
  const ph3 = await signIn(r1, '730195'); check('stop: in again after reset', (await me(ph3)).name === 'L-mgr');
  // tries sent together cannot get round the lock
  readLag = 15;
  let many = await Promise.all(Array.from({ length: 20 }, () => L('', { key: keyOf(r1.link), pin: '000003' })));
  readLag = 0;
  check('lock: twenty at once → at most five tried', many.filter(x => x.error === 'wrong_pin').length + many.filter(x => x._s === 423 && x.error === 'locked').length === 20 && many.filter(x => x.error === 'wrong_pin').length <= 5 && row().fails === 5, [row().fails, many.map(x => x.error).join()]);
  at('2027-06-19T01:31:00.000Z');
  check('lock: over after 15 minutes', (await L('', { key: keyOf(r1.link), pin: '730195' })).ok && row().fails === 0);
  // 现场经理 types it again once a day; the day changes at 06:00 Beijing
  const mk = async (name, role, iso) => { at(iso); const x = await call('POST', '/admin/reg/admins', { name, role }, ADMIN); return { ...x, tok: await signIn(x) }; };
  const mg = await mk('L-day', 'manager', '2027-06-18T23:00:00.000Z');   // 07:00 Beijing
  at('2027-06-19T18:30:00.000Z'); check('daily: past midnight the night goes on', (await me(mg.tok)).name === 'L-day');
  at('2027-06-19T21:59:00.000Z'); check('daily: still before 06:00', (await me(mg.tok)).name === 'L-day');
  at('2027-06-19T22:00:00.000Z'); d = await me(mg.tok); check('daily: from 06:00 the password again', d._s === 401 && d.error === 'reauth', d);
  check('daily: nothing works until then', (await call('GET', '/reg/door/pass?p=x', null, mg.tok)).error === 'reauth');
  d = await L('/again', { pin: '999999' }, mg.tok); check('again: wrong counts', d.error === 'wrong_pin' && d.left === 4, d);
  d = await L('/again', { pin: '730195' }, mg.tok); check('again: right, and on', d.ok && (await me(mg.tok)).name === 'L-day', d);
  const mg2 = await mk('L-dawn', 'manager', '2027-06-19T21:00:00.000Z');   // 05:00 Beijing: that day ends at 06:00
  at('2027-06-19T22:01:00.000Z'); check('daily: signed in at 05:00, again at 06:01', (await me(mg2.tok)).error === 'reauth');
  // 总管、副总管: every 12 hours; two phones, the third pushes out the first
  const dp = await mk('L-dep', 'deputy', '2027-06-19T00:00:00.000Z');
  const dp2 = await L('', { key: keyOf(dp.link), pin: '730195' }), dp3 = await L('', { key: keyOf(dp.link), pin: '730195' });
  check('phones: a 副总管 has two', (await me(dp.tok)).why === 'replaced' && (await me(dp2.token)).name === 'L-dep' && (await me(dp3.token)).name === 'L-dep');
  at('2027-06-19T11:59:00.000Z'); check('12 h: not yet', (await me(dp2.token)).name === 'L-dep');
  at('2027-06-19T12:01:00.000Z'); check('12 h: due', (await me(dp2.token)).error === 'reauth');
  check('12 h: per phone', (await L('/again', { pin: '730195' }, dp2.token)).ok && (await me(dp2.token)).name === 'L-dep' && (await me(dp3.token)).error === 'reauth');
  // 任免: the password again in the same request
  d = await call('POST', '/admin/reg/staff', { name: 'L-desk' }, dp2.token); check('appoint: without the password again', d._s === 401 && d.error === 'pin_needed', d);
  d = await call('POST', '/admin/reg/staff', { name: 'L-desk', pin: '111112' }, dp2.token); check('appoint: wrong password counts', d.error === 'wrong_pin' && d.left === 4, d);
  d = await call('POST', '/admin/reg/staff', { name: 'L-desk', pin: '730195' }, dp2.token); check('appoint: with it', d.ok && keyOf(d.link), d);
  const desk = d;
  // 前台: once, then until the event's end; one phone
  at('2027-06-19T12:05:00.000Z'); const dk = await signIn(desk, '730195');
  at('2027-06-22T21:59:00.000Z'); check('desk: no password again for days', (await call('GET', '/reg/door/me', null, dk)).name === 'L-desk');
  at('2027-06-22T22:00:00.000Z'); d = await call('GET', '/reg/door/me', null, dk); check('desk: out when the event ends (06-23 06:00 Beijing)', d.why === 'ended', d);
  check('desk: no sign-in after the end', (await L('', { key: keyOf(desk.link), pin: '730195' })).error === 'ended' && (await L('/hello', { key: keyOf(desk.link) })).state === 'ended');
  at('2027-06-19T12:10:00.000Z');
  const dkb = await L('', { key: keyOf(desk.link), pin: '730195' });
  check('desk: one phone', (await call('GET', '/reg/door/me', null, dk)).why === 'replaced' && (await call('GET', '/reg/door/me', null, dkb.token)).name === 'L-desk');
  // a 总管's refund and export take it again; the platform admin does not
  const ch = R.EVENTS.bstw2027.chief; delete R.EVENTS.bstw2027.chief;
  const cf = await mk('L-chief', 'chief', '2027-06-19T12:10:00.000Z');
  const rid = Number(db.prepare("INSERT INTO reg(event,code,email,status,people,data,amount,refund,created_at,updated_at) VALUES('bstw2027','BJ27-8970','rf@example.com','cancelled',1,'{\"people\":[],\"rooms\":[],\"passports\":[]}',1000,950,'2026-12-01','2026-12-01')").run().lastInsertRowid);
  db.prepare("INSERT INTO reg_payment(reg_id,at,amount,method,collector,by_admin) VALUES(?,'2026-12-01',1000,'alipay','x','x')").run(rid);
  d = await call('POST', '/admin/reg/act', { id: rid, action: 'refund', pay: { amount: 100 } }, cf.tok); check('chief refund: password needed', d.error === 'pin_needed', d);
  d = await call('POST', '/admin/reg/act', { id: rid, action: 'refund', pay: { amount: 100 }, pin: '730195' }, cf.tok); check('chief refund: with it', d.ok, d);
  d = await call('POST', '/admin/reg/export', { what: 'regs' }, cf.tok); check('chief export: password needed', d.error === 'pin_needed', d);
  d = await call('POST', '/admin/reg/act', { id: rid, action: 'refund', pay: { amount: 100 } }, ADMIN); check('platform admin: no password again', d.ok, d);
  R.EVENTS.bstw2027.chief = ch;
  // sign out; role change; delete
  check('logout: this phone only', (await L('/out', {}, dp2.token)).ok && (await me(dp2.token)).why === 'logout' && (await L('/again', { pin: '730195' }, dp3.token)).ok && (await me(dp3.token)).name === 'L-dep');
  d = await call('POST', '/admin/reg/admins/role', { id: dp.id, role: 'manager' }, ADMIN); check('role change: every phone out', d.ok && d.check && (await me(dp3.token)).why === 'role', d);
  d = await call('POST', '/admin/reg/admins/delete', { id: mg.id }, ADMIN); check('delete: out', d.ok && (await me(mg.tok)).why === 'deleted' && (await L('/hello', { key: keyOf(mg.link) }))._s === 404);
  // settings show the sign-in state, no hashes
  list = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN);
  const st = n => (list.admins.find(a => a.name === n) || list.staff.find(a => a.name === n)).login;
  check('settings: states', st('L-dep').state === 'off' && st('L-dep').devices === 0 && st('L-dawn').state === 'on' && st('L-dawn').devices === 1 && st('L-dawn').max === 1 && st('L-desk').state === 'on' && st('L-desk').max === 1, [st('L-dep'), st('L-dawn'), st('L-desk')]);
  check('settings: no hashes or keys', !/link_hash|pin_hash|pin_salt|token_hash|730195/.test(JSON.stringify(list)));
  // two phones signing in at once still keep the limit
  readLag = 10;
  many = await Promise.all([1, 2, 3, 4].map(() => L('', { key: keyOf(mg2.link), pin: '730195' })));
  readLag = 0;
  check('phones: four at once → one left', many.every(x => x.ok) && db.prepare("SELECT COUNT(*) c FROM reg_device WHERE kind='admin' AND person=? AND ended_at IS NULL").get(mg2.id).c === 1, many.map(x => x.error || 'ok'));
  // the old ways are gone
  check('old: 40-character passwords refused', (await me('d'.repeat(40)))._s === 401);
  check('old: the platform admin long password works', (await me(ADMIN)).role === 'owner');
  check('not ready without the secret', (await social(new Request('https://api.tangoweekend.org/social/reg/login/hello', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }), { ...env, REG_PIN_PEPPER: '' }, new URL('https://api.tangoweekend.org/social/reg/login/hello'), json)).status === 503);
  back();
  db.exec("DELETE FROM reg_admin WHERE name LIKE 'L-%'"); db.exec("DELETE FROM reg_staff WHERE name LIKE 'L-%'");
  for (const t of ['reg_payment', 'reg_log']) db.prepare(`DELETE FROM ${t} WHERE reg_id=?`).run(rid);
  db.prepare('DELETE FROM reg WHERE id=?').run(rid); }
// the switch-over: old passwords and desk links are cleared, nothing else
{ const old = new DatabaseSync(':memory:');
  for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql']) old.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
  old.exec("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at) VALUES('bstw2027','Jing','" + sha('e'.repeat(40)) + "','collect','2026-11-23'); INSERT INTO reg_staff(event,name,act_hash,device_hash,created_at,activated_at) VALUES('bstw2027','AAA','x','" + sha('f'.repeat(64)) + "','2026-11-22','2026-11-22'); INSERT INTO reg_staff(event,name,created_at,disabled_at) VALUES('bstw2027','KAI','2026-11-20','2026-11-21');");
  old.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0024_reg_login.sql'), 'utf8'));
  const a = old.prepare('SELECT * FROM reg_admin').get(), s = old.prepare("SELECT * FROM reg_staff WHERE name='AAA'").get();
  check('switch-over: old password cleared, the person stays', a.name === 'Jing' && a.perms === 'collect' && a.pass_hash === '-' && a.link_hash === null && a.fails === 0);
  check('switch-over: old desk link and phone cleared', s.act_hash === null && s.device_hash === null && s.name === 'AAA');
  check('switch-over: a stopped one stays as it was', old.prepare("SELECT disabled_at FROM reg_staff WHERE name='KAI'").get().disabled_at === '2026-11-21');
  const oenv = { ...env, SDB: D1(old), DB: D1(old) };
  const l = await social(new Request('https://api.tangoweekend.org/social/admin/reg?event=bstw2027', { headers: { Authorization: 'Bearer ' + ADMIN } }), oenv, new URL('https://api.tangoweekend.org/social/admin/reg?event=bstw2027'), json).then(r => r.json());
  check('switch-over: settings say who needs a reset', l.admins[0].login.state === 'none' && l.staff.find(x => x.name === 'AAA').login.state === 'none', [l.admins, l.staff]);
  const r = await social(new Request('https://api.tangoweekend.org/social/admin/reg/admins/reset', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ADMIN }, body: JSON.stringify({ event: 'bstw2027', id: a.id, v: l.admins[0].v }) }), oenv, new URL('https://api.tangoweekend.org/social/admin/reg/admins/reset'), json).then(r => r.json());
  check('switch-over: one reset and she has a link', r.ok && keyOf(r.link) && /^\d{6}$/.test(r.pin), r); }
// cron before migration is quiet
const bare = new DatabaseSync(':memory:'); const rr2 = await regCron({ ...env, SDB: D1(bare) }); check('cron quiet before migration', rr2.sent === 0);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('register tests passed:', passed);
