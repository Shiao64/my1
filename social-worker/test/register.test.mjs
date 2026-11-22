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
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql']) db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const ADMIN = 'a'.repeat(32);
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests',
  REG_CODES: JSON.stringify({ Alpha618: 'Chris Han', Gamma618: 'Ajit', Delta618: 'Uno', Beta618: 'Kostas', Echo618: 'Robin' }) };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
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
check('confirmation letter has pay + rules + QR', mails.some(m => m.includes('Registration confirmed · BJ27-0001') && m.includes('WeChat Pay or Alipay') && m.includes('June 11, 2027') && m.includes('/social/reg/qr/intl-wechat?k=qrkey')), mails);
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
// --- door helpers: one-time link bound to the first phone ---
d = await call('POST', '/admin/reg/staff', { name: '王凯' }); check('adding a helper needs the password', d._s === 401);
d = await call('POST', '/admin/reg/staff', { name: '王凯' }, ADMIN); check('add helper → link', d.ok && /checkin\/\?act=[0-9a-f]{48}$/.test(d.link), d);
const act1 = d.link.split('act=')[1], sid = d.id;
d = await call('POST', '/admin/reg/staff', { name: '王凯' }, ADMIN); check('same name twice refused', d._s === 409);
d = await call('POST', '/reg/door/activate', { act: act1 }); check('first phone activates', d.ok && d.name === '王凯' && /^staff:[0-9a-f]{64}$/.test(d.token), d);
const phone1 = d.token;
d = await call('POST', '/reg/door/activate', { act: act1 }); check('second phone cannot reuse the link', d._s === 409);
d = await call('GET', '/reg/door/me', null, phone1); check('helper phone recognised', d.ok && d.name === '王凯' && !d.admin);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pBob), null, phone1); check('helper can look up a pass', d.ok && d.person.name === 'Bob');
d = await call('GET', '/admin/reg?event=bstw2027', null, phone1); check('helper cannot open the admin list', d._s === 401);
d = await call('POST', '/admin/reg/act', { id: id2, action: 'cancel' }, phone1); check('helper cannot change registrations', d._s === 401);
d = await call('POST', '/reg/door/checkin', { p: pBob, item: 'M1' }, phone1); check('helper checks in, name recorded', d.ok && d.by === '王凯', d);
d = await call('POST', '/reg/door/checkin', { p: pBob, item: 'M1' }, ADMIN); check('organizer rescan shows who did it', d._s === 409 && d.error === 'already' && d.by === '王凯', d);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pBob), null, 'staff:' + 'f'.repeat(64)); check('unknown phone token refused', d._s === 401);
d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); check('admin shows helper with count', d.staff.length === 1 && d.staff[0].checkins === 1 && d.staff[0].activated_at, d.staff);
d = await call('POST', '/admin/reg/staff/reissue', { id: sid }, ADMIN); const act2 = d.link.split('act=')[1]; check('reissue gives a new link', d.ok && act2 !== act1);
d = await call('GET', '/reg/door/me', null, phone1); check('old phone stops after reissue', d._s === 401);
d = await call('POST', '/reg/door/activate', { act: act1 }); check('old link dead after reissue', d._s === 409);
d = await call('POST', '/reg/door/activate', { act: act2 }); const phone2 = d.token; check('new link works on the new phone', d.ok);
d = await call('POST', '/admin/reg/staff/disable', { id: sid }, ADMIN); check('disable helper', d.ok);
d = await call('GET', '/reg/door/me', null, phone2); check('disabled helper locked out', d._s === 401);
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
// --- organizers: own passwords, permissions, payment ledger ---
{ let d = await call('POST', '/admin/reg/admins', { name: '王凯', perms: ['collect'] }, env.REG_ADMIN_TOKEN);
  check('owner adds a collector, password shown once', d.ok && /^[0-9a-f]{40}$/.test(d.password) && d.perms.join() === 'collect', d);
  const wk = d.password, wkId = d.id;
  d = await call('POST', '/admin/reg/admins', { name: '竟文', perms: ['review', 'collect', 'cancel', 'export'] }, env.REG_ADMIN_TOKEN); const jw = d.password;
  d = await call('POST', '/admin/reg/admins', { name: '刘峥', perms: ['nonsense', 'review'] }, wk); check('only the owner manages organizers', d._s === 403);
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk); check('collector sees own name and perms', d.name === '王凯' && d.perms.join() === 'collect' && !d.owner, d);
  d = await call('GET', '/admin/reg?event=bstw2027', null, wk); check('collector can view the list', d._s === 200 && d.admins === undefined && d.staff.length === 0);
  const fay = subscriber('fay@gmail.com', 'Fay');
  const fr = await call('POST', '/reg', form({ people: [person({ name: 'Fay', pkg: 'pass' }), person({ name: 'Gus', pkg: 'pass', role: 'leader' })] }), fay);
  const fid = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.code === fr.code).id;
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'confirm', silent: 1 }, wk); check('collector cannot confirm', d._s === 403 && d.error === 'no_permission');
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'confirm', silent: 1 }, jw); check('reviewer confirms', d.ok && d.status === 'confirmed');
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'pay', pay: { amount: 600, method: 'alipay', note: '单号 123' }, silent: 1 }, wk);
  check('partial payment recorded, still confirmed', d.ok && d.status === 'confirmed' && d.paid === 600 && d.rest === 800, d);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'pay', pay: { method: 'wechat' }, silent: 1 }, jw);
  check('second payment covers the rest → paid', d.ok && d.status === 'paid' && d.paid === 1400 && d.rest === 0, d);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'pay', pay: { amount: -5 } }, wk); check('bad amount refused', d._s === 400);
  d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); const fr2 = d.rows.find(r => r.id === fid);
  check('ledger per collector', d.ledger['王凯'].in === 600 && d.ledger['竟文'].in === 800 && fr2.paid_total === 1400 && fr2.payments[0].by_admin === '王凯' && fr2.payments[0].method === 'alipay', d.ledger);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'cancel', silent: 1 }, wk); check('collector cannot cancel', d._s === 403);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'cancel', silent: 1 }, jw); check('cancel refunds what was paid minus ¥50', d.ok && d.refund === 1350, d);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'refund', pay: { amount: 2000, method: 'wechat' }, silent: 1 }, wk); check('cannot refund more than held', d._s === 400);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'refund', pay: { method: 'wechat' }, silent: 1 }, wk); check('refund recorded as negative', d.ok && d.refunded === 1350 && d.due === 0, d);
  d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); check('ledger shows refund out', d.ledger['王凯'].out === 1350 && d.rows.find(r => r.id === fid).paid_total === 50, d.ledger);
  const pr = await social(new Request('https://api.tangoweekend.org/social/admin/reg/payments?event=bstw2027', { headers: { Authorization: 'Bearer ' + wk } }), env, new URL('https://api.tangoweekend.org/social/admin/reg/payments?event=bstw2027'), json);
  check('collector without export cannot download ledger', pr.status === 403);
  const pj = await social(new Request('https://api.tangoweekend.org/social/admin/reg/payments?event=bstw2027', { headers: { Authorization: 'Bearer ' + jw } }), env, new URL('https://api.tangoweekend.org/social/admin/reg/payments?event=bstw2027'), json);
  const csvp = await pj.text(); check('ledger CSV has collector and recorder', pj.status === 200 && csvp.includes('alipay,王凯,王凯,单号 123') && csvp.includes('-1350'), csvp.slice(0, 300));
  d = await call('GET', '/reg/door/me', null, wk); check('any organizer can use the door page', d.ok && d.name === '王凯');
  d = await call('POST', '/admin/reg/admins/reset', { id: wkId }, env.REG_ADMIN_TOKEN); const wk2 = d.password;
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk); check('old password stops after reset', d._s === 401);
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk2); check('new password works', d.name === '王凯');
  d = await call('POST', '/admin/reg/admins/perms', { id: wkId, perms: ['collect', 'cancel'] }, env.REG_ADMIN_TOKEN); check('owner changes perms', d.ok);
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk2); check('perms take effect', d.perms.includes('cancel'));
  d = await call('POST', '/admin/reg/admins/disable', { id: wkId }, env.REG_ADMIN_TOKEN);
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk2); check('disabled organizer locked out', d._s === 401); }
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
// cron before migration is quiet
const bare = new DatabaseSync(':memory:'); const rr2 = await regCron({ ...env, SDB: D1(bare) }); check('cron quiet before migration', rr2.sent === 0);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('register tests passed:', passed);
