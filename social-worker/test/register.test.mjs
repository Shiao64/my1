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
d = await call('POST', '/admin/reg/staff/delete', { id: sid }, ADMIN); check('delete helper', d.ok);
check('deleted helper leaves no row', !db.prepare('SELECT 1 FROM reg_staff WHERE id=?').get(sid));
check('deleted helper: check-in keeps the name', db.prepare("SELECT staff FROM reg_checkin WHERE staff='王凯'").get());
d = await call('POST', '/admin/reg/staff/reissue', { id: sid }, ADMIN); check('deleted helper cannot be brought back', d._s === 404);
d = await call('POST', '/admin/reg/staff', { name: '主办' }, ADMIN); check('desk cannot take the organizer name', d._s === 409 && d.error === 'name_reserved');
d = await call('GET', '/reg/door/me', null, phone2); check('deleted helper locked out', d._s === 401);
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
// --- four roles, own passwords, payment ledger ---
{ let d = await call('POST', '/admin/reg/admins', { name: '王凯' }, ADMIN);
  check('site manager by default: collect + front desk', d.ok && /^[0-9a-f]{40}$/.test(d.password) && d.role === 'manager' && d.perms === 'collect,staff', d);
  const wk = d.password, wkId = d.id;
  d = await call('POST', '/admin/reg/admins', { name: '竟文', role: 'chief' }, ADMIN); const jw = d.password, jwId = d.id;
  check('organizer appoints a chief', d.ok && d.role === 'chief', d);
  d = await call('POST', '/admin/reg/admins', { name: '主办' }, ADMIN); check('organizer name is reserved', d._s === 409);
  d = await call('POST', '/admin/reg/admins', { name: 'X', role: 'owner' }, ADMIN); check('unknown role refused', d._s === 400);
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk); check('manager sees own role', d.role === 'manager' && d.perms.join() === 'collect,staff' && !d.owner, d);
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, jw); check('chief sees own role', d.role === 'chief' && !d.owner && d.perms.includes('export'), d);
  d = await call('GET', '/admin/reg?event=bstw2027', null, wk);
  check('manager gets no list, emails, ledger or admins', d._s === 200 && Object.keys(d).filter(k => k !== '_s').sort().join() === 'event,me,mine,staff' && !JSON.stringify(d).includes('@'), d);
  const fay = subscriber('fay@gmail.com', 'Fay');
  const fr = await call('POST', '/reg', form({ people: [person({ name: 'Fay', pkg: 'pass' }), person({ name: 'Gus', pkg: 'pass', role: 'leader' })] }), fay);
  const fid = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.code === fr.code).id;
  for (const action of ['confirm', 'waitlist', 'decline', 'cash', 'refund', 'cancel', 'modify', 'note', 'paid', 'bogus']) {
    d = await call('POST', '/admin/reg/act', { id: fid, action, silent: 1 }, wk); check('manager cannot ' + action, d._s === 403 && d.error === 'no_permission', d); }
  for (const [path, body] of [['', { name: 'M2' }], ['', { name: 'C2', role: 'chief' }], ['/perms', { id: wkId, role: 'chief' }], ['/reset', { id: jwId }], ['/delete', { id: jwId }]]) {
    d = await call('POST', '/admin/reg/admins' + path, body, wk); check('manager cannot manage people ' + (path || '/add') + (body.role || ''), d._s === 403, d); }
  d = await call('POST', '/admin/reg/asset', { name: 'cn-alipay', mime: 'image/png', b64: 'AA' }, wk); check('manager cannot change payment QR', d._s === 403);
  d = await call('POST', '/admin/reg/asset', { name: 'cn-alipay', mime: 'image/png', b64: 'AA' }, jw); check('chief cannot change payment QR', d._s === 403);
  for (const [path, body] of [['', { name: 'C3', role: 'chief' }], ['/perms', { id: wkId, role: 'chief' }], ['/perms', { id: jwId, role: 'manager' }], ['/reset', { id: jwId }], ['/delete', { id: jwId }]]) {
    d = await call('POST', '/admin/reg/admins' + path, body, jw); check('chief cannot appoint or touch a chief ' + (path || '/add') + (body.role || ''), d._s === 403, d); }
  d = await call('POST', '/admin/reg/admins', { name: '小陈', perms: ['collect', 'chief', 'export'] }, jw);
  check('chief adds a manager; unknown perms dropped', d.ok && d.role === 'manager' && d.perms === 'collect', d);
  const cid = d.id, cpw = d.password;
  d = await call('POST', '/admin/reg/staff', { name: 'NoStaff' }, cpw); check('manager without staff cannot add a desk', d._s === 403);
  d = await call('POST', '/admin/reg/admins/perms', { id: cid, perms: ['collect', 'staff'] }, jw); check('chief changes a manager', d.ok && d.perms === 'collect,staff', d);
  d = await call('POST', '/admin/reg/staff', { name: '小李' }, cpw); check('manager adds a desk', d.ok, d);
  check('manager deletes a desk', (await call('POST', '/admin/reg/staff/delete', { id: d.id }, cpw)).ok);
  check('chief deletes a manager', (await call('POST', '/admin/reg/admins/delete', { id: cid }, jw)).ok);
  check('deleted manager locked out', (await call('GET', '/reg/door/me', null, cpw))._s === 401);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'confirm', silent: 1 }, jw); check('chief confirms', d.ok && d.status === 'confirmed');
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'pay', pay: { amount: 600 } }, wk); check('manager cannot record a screenshot payment', d._s === 403, d);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'pay', pay: { amount: 600, method: 'alipay', note: '单号 123', collector: '王凯' }, silent: 1 }, jw);
  check('partial payment recorded, still confirmed', d.ok && d.status === 'confirmed' && d.paid === 600 && d.rest === 800, d);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'pay', pay: { method: 'wechat' }, silent: 1 }, jw);
  check('second payment covers the rest → paid', d.ok && d.status === 'paid' && d.paid === 1400 && d.rest === 0, d);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'pay', pay: { amount: -5 } }, jw); check('nothing more on a fully paid one', d._s === 409 && d.error === 'already_paid');
  d = await call('GET', '/admin/reg?event=bstw2027', null, jw); const fr2 = d.rows.find(r => r.id === fid);
  check('chief sees list and ledger per collector', d.admins.length === 2 && d.ledger['王凯'].in === 600 && d.ledger['竟文'].in === 800 && fr2.paid_total === 1400 && fr2.payments[0].by_admin === '竟文', d.ledger);
  d = await call('GET', '/admin/reg?event=bstw2027', null, wk); check('money someone else recorded is not "mine"', d.mine.length === 0, d.mine);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'cancel', silent: 1 }, jw); check('cancel refunds what was paid minus ¥50', d.ok && d.refund === 1350, d);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'refund', pay: { amount: 2000, method: 'wechat' }, silent: 1 }, jw); check('cannot refund more than held', d._s === 400);
  d = await call('POST', '/admin/reg/act', { id: fid, action: 'refund', pay: { method: 'wechat' }, silent: 1 }, jw); check('refund recorded as negative', d.ok && d.refunded === 1350 && d.due === 0, d);
  d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); check('ledger shows refund out', d.ledger['竟文'].out === 1350 && d.rows.find(r => r.id === fid).paid_total === 50, d.ledger);
  for (const path of ['?event=bstw2027&format=csv', '/payments?event=bstw2027']) {
    const u = 'https://api.tangoweekend.org/social/admin/reg' + path, get = t => social(new Request(u, { headers: { Authorization: 'Bearer ' + t } }), env, new URL(u), json);
    check('manager cannot export ' + path, (await get(wk)).status === 403);
    const ok = await get(jw), text = await ok.text();
    check('chief exports ' + path, ok.status === 200 && (path.includes('csv') || (text.includes('alipay,王凯,竟文,单号 123') && text.includes('-1350'))), text.slice(0, 300)); }
  d = await call('GET', '/reg/door/me', null, wk); check('manager uses the door page', d.ok && d.name === '王凯' && d.role === 'manager' && d.collect);
  d = await call('POST', '/admin/reg/admins/reset', { id: wkId }, jw); const wk2 = d.password;
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk); check('old password stops after reset', d._s === 401);
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk2); check('new password works', d.name === '王凯');
  check('organizer promotes', (await call('POST', '/admin/reg/admins/perms', { id: wkId, role: 'chief' }, ADMIN)).ok && (await call('GET', '/admin/reg/me?event=bstw2027', null, wk2)).role === 'chief');
  check('organizer demotes', (await call('POST', '/admin/reg/admins/perms', { id: wkId, role: 'manager' }, ADMIN)).perms === 'collect,staff');
  db.prepare("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at) VALUES('other2027','OtherChief',?,'chief','2026-12-01')").run(sha('c'.repeat(40)));
  check('chief of another event is nobody here', (await call('GET', '/admin/reg?event=bstw2027', null, 'c'.repeat(40)))._s === 401);
  db.prepare("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at) VALUES('bstw2027','Old',?,'review,export,cancel','2026-12-01')").run(sha('d'.repeat(40)));
  check('old-style perms never grant more than a site manager', (await call('GET', '/admin/reg/me?event=bstw2027', null, 'd'.repeat(40))).perms.length === 0);
  d = await call('POST', '/admin/reg/admins/delete', { id: wkId }, ADMIN); check('organizer deletes', d.ok && !db.prepare('SELECT 1 FROM reg_admin WHERE id=?').get(wkId));
  d = await call('GET', '/admin/reg/me?event=bstw2027', null, wk2); check('deleted person locked out', d._s === 401);
  check('payments keep the deleted name', db.prepare("SELECT 1 FROM reg_payment WHERE collector='王凯'").get()); }
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
  db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at,due_at) VALUES('bstw2027','BJ27-0901','qr@x.com','en','confirmed',1,?,1450,'2026-01-01','2026-01-01','2026-01-01T00:00:00Z','2026-01-15T00:00:00Z')").run(JSON.stringify({ people: [], rooms: [], passports: [], hotel: false }));
  await regCron(env);
  check('reminder: both uploaded QRs, Alipay first', mails.some(m => m.includes('BJ27-0901') && m.indexOf('/qr/intl-alipay') > 0 && m.indexOf('/qr/intl-alipay') < m.indexOf('/qr/intl-wechat'))); }
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
  const mk = db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at) VALUES('bstw2027','BJ27-0950','arr@x.com','ko','confirmed',2,?,2900,'2026-12-01','2026-12-01','2026-12-01T00:00:00Z')")
    .run(JSON.stringify({ people: [person({ pkg: 'single', items: ['M1'], amount: 1450 }), person({ name: 'Second', pkg: 'single', items: ['M1'], amount: 1450 })], rooms: [], passports: [], hotel: false }));
  const aid = Number(mk.lastInsertRowid);
  db.prepare("UPDATE reg SET note='private note' WHERE id=?").run(aid);
  let a = await call('POST', '/admin/reg/act', { id: aid, action: 'pay', pay: { amount: 900, method: 'alipay' } }, ADMIN);
  check('arrival: part paid first', a.ok && a.rest === 2000, a);
  a = await call('POST', '/admin/reg/act', { id: aid, action: 'cash' }, ADMIN);
  check('arrival: letter shows what is left, zh + ko', a.ok && mails.some(m => m.includes('BJ27-0950') && m.includes('¥2,000') && m.includes('付款后才能入场') && m.includes('결제 후 입장')), mails);
  const arr = subscriber('arr@x.com', 'Arr');
  const me = await call('GET', '/reg/me?event=bstw2027', null, arr);
  check('arrival: page gets lang, people and rest', me.reg.lang === 'ko' && me.reg.people === 2 && me.reg.rest === 2000 && me.reg.passes.length === 2, me);
  const [p1, p2] = me.reg.passes.map(x => encodeURIComponent(x.pass));
  const desk = await call('POST', '/admin/reg/staff', { name: 'Desk' }, ADMIN);
  const dt = (await call('POST', '/reg/door/activate', { act: desk.link.match(/act=([0-9a-f]{48})/)[1] })).token;
  a = await call('GET', '/reg/door/pass?p=' + p1, null, dt);
  check('front desk: pay first, no amount, no note', a.pay_first === true && !a.collect && !a.cash_due && a.note === '' && !JSON.stringify(a).includes('2000') && a.lang === 'ko', a);
  a = await call('POST', '/reg/door/checkin', { p: me.reg.passes[0].pass, item: 'M1' }, dt);
  check('cannot check in before paying', a._s === 409 && a.error === 'pay_first', a);
  a = await call('POST', '/admin/reg/act', { id: aid, action: 'pay', pay: { method: 'alipay' } }, dt);
  check('front desk cannot collect', a._s === 401 || a._s === 403, a);
  const rev = await call('POST', '/admin/reg/admins', { name: 'Reviewer', perms: ['staff'] }, ADMIN), col = await call('POST', '/admin/reg/admins', { name: 'Collector', perms: ['collect'] }, ADMIN);
  const pw = x => x.password || x.pass || x.token;
  a = await call('GET', '/reg/door/pass?p=' + p1, null, pw(rev));
  check('manager without collect: no amount', a.pay_first && !a.collect, a);
  a = await call('POST', '/admin/reg/act', { id: aid, action: 'pay', pay: { method: 'alipay' } }, pw(rev));
  check('manager without collect cannot collect', a._s === 403, a);
  a = await call('GET', '/reg/door/pass?p=' + p2, null, pw(col));
  check('collector: rest from a companion code', a.collect.id === aid && a.collect.rest === 2000 && a.collect.paid === 900, a);
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
  check('manager sees own takings', a.mine.length === 1 && a.mine[0].amount === 2000 && a.mine[0].code === 'BJ27-0950', a.mine);
  a = await call('GET', '/reg/door/pass?p=' + p1, null, pw(col));
  check('manager: no amount and no note once paid', a.collect.paid === undefined && a.collect.rest === 0 && a.note === '', a);
  for (const p of me.reg.passes) { a = await call('POST', '/reg/door/checkin', { p: p.pass, item: 'M1' }, dt); check('after payment everyone can enter', a.ok, a); }
  const undo = who => call('POST', '/reg/door/checkin', { p: me.reg.passes[0].pass, item: 'M1', undo: 1 }, who);
  a = await undo(dt); check('front desk cannot undo', a._s === 403 && a.error === 'manager_only', a);
  a = await call('GET', '/reg/door/pass?p=' + p1, null, dt); check('check-in still there after refused undo', a.checkins.length === 1, a);
  a = await undo(pw(rev)); check('any manager can undo', a.ok && a.undone, a);
  await undo(pw(rev));
  a = (await call('GET', '/admin/reg', null, ADMIN)).rows.find(r => r.id === aid);
  check('undo keeps who did it, once', a.undos.length === 1 && a.undos[0].by === 'Reviewer' && a.undos[0].item === 'M1' && a.undos[0].person === 0 && a.undos[0].at, a.undos);
  db.prepare("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at) VALUES('other2027','Other',?,'collect','2026-12-01')").run(sha('b'.repeat(40)));
  a = await call('GET', '/reg/door/pass?p=' + p1, null, 'b'.repeat(40));
  check('manager of another event cannot read the pass', a._s === 404, a); }
// CSV: no formulas from typed text, Beijing time
{ db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at) VALUES('bstw2027','BJ27-0960','csv@x.com','en','pending',1,?,0,'2026-12-01T17:30:00.000Z','2026-12-01')")
    .run(JSON.stringify({ people: [{ name: '=1+1', city: '@x', wechat: '+86 123', pkg: 'single', items: [], extra: [], amount: 0 }], rooms: [], passports: [], hotel: false }));
  const u = 'https://api.tangoweekend.org/social/admin/reg?event=bstw2027&format=csv';
  const t = await (await social(new Request(u, { headers: { Authorization: 'Bearer ' + ADMIN } }), env, new URL(u), json)).text();
  const line = t.split('\n').find(l => l.startsWith('BJ27-0960'));
  check('csv: formulas neutralised', line.includes("'=1+1") && line.includes("'@x") && line.includes("'+86 123"), line);
  check('csv: Beijing time', line.includes('2026-12-02 01:30'), line); }
// cron before migration is quiet
const bare = new DatabaseSync(':memory:'); const rr2 = await regCron({ ...env, SDB: D1(bare) }); check('cron quiet before migration', rr2.sent === 0);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('register tests passed:', passed);
