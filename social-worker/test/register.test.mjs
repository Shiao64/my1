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
for (const f of ['unsub.js', 'going.js', 'register.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social, regCron } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0020_registrations.sql'), 'utf8'));
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const ADMIN = 'a'.repeat(32);
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey',
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
const form = (o = {}) => ({ event: 'bj2027', lang: 'en', people: [person()], hotel: 'no', ...o });

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
d = await call('GET', '/reg/me?event=bj2027', null, amy); check('me shows pending reg', d.reg && d.reg.code === 'BJ27-0001' && d.reg.status === 'pending', d);
d = await call('GET', '/reg/left?event=bj2027'); check('left full caps, no T1/T2', d.left.S1 === 120 && d.left.M1 === 300 && !('T1' in d.left) && !('T2' in d.left), d);

// --- organizer ---
d = await call('GET', '/admin/reg?event=bj2027'); check('admin needs token', d._s === 401);
d = await call('GET', '/admin/reg?event=bj2027', null, ADMIN); check('admin list', d.rows.length === 1 && d.counts.pending === 1, d);
const id1 = d.rows[0].id;
d = await call('POST', '/admin/reg/act', { id: id1, action: 'paid' }, ADMIN); check('cannot mark pending as paid', d._s === 409);
mails.length = 0;
d = await call('POST', '/admin/reg/act', { id: id1, action: 'confirm' }, ADMIN);
check('confirm sets due date +14d', d.ok && d.status === 'confirmed' && Math.abs(Date.parse(d.due) - Date.now() - 14 * 864e5) < 6e4, d);
check('confirmation letter has pay + rules + QR', mails.some(m => m.includes('Registration confirmed · BJ27-0001') && m.includes('WeChat Pay or Alipay') && m.includes('June 11, 2027') && m.includes('/social/reg/qr/intl-wechat?k=qrkey')), mails);
d = await call('GET', '/reg/left?event=bj2027'); check('confirmed pass uses M1–M4, not S1', d.left.M1 === 299 && d.left.S1 === 120, d.left);
d = await call('POST', '/reg', form(), amy); check('cannot resubmit after confirm', d._s === 409 && d.error === 'exists');
// capacity: fill S1 to 1 left, then a 2-person S1 form cannot be confirmed
const bob = subscriber('bob@naver.com', 'Bob');
d = await call('POST', '/reg', form({ lang: 'ko', people: [person({ name: 'Bob' }), person({ name: 'Cat', role: 'leader' })] }), bob);
const id2 = (await call('GET', '/admin/reg?event=bj2027', null, ADMIN)).rows.find(r => r.code === d.code).id;
db.prepare("INSERT INTO reg(event,code,email,status,people,data,amount,created_at,updated_at) VALUES('bj2027','X-1','x@x.com','paid',119,?,0,'2026-12-01','2026-12-01')")
  .run(JSON.stringify({ people: Array.from({ length: 119 }, () => ({ items: ['S1'] })), rooms: [], passports: [] }));
d = await call('POST', '/admin/reg/act', { id: id2, action: 'confirm' }, ADMIN); check('no overbooking: S1 1 left, need 2', d._s === 409 && d.error === 'full' && d.item === 'S1' && d.left === 1 && d.need === 2, d);
d = await call('POST', '/admin/reg/act', { id: id2, action: 'waitlist' }, ADMIN); check('waitlist', d.status === 'waitlist');
check('waitlist letter in Korean', mails.some(m => m.includes('대기자 명단 · BJ27-0002')));
db.prepare("DELETE FROM reg WHERE code='X-1'").run();
d = await call('POST', '/admin/reg/act', { id: id2, action: 'confirm' }, ADMIN); check('confirm from waitlist when seats free', d.status === 'confirmed');
// modify after confirm: +¥50 once
d = await call('POST', '/admin/reg/act', { id: id1, action: 'modify', data: form({ people: [person({ pkg: 'pass', items: ['tour'] })] }) }, ADMIN);
check('modify adds ¥50 fee', d.ok && d.amount === 700 + 450 + 50, d);
d = await call('POST', '/admin/reg/act', { id: id1, action: 'modify', data: form({ people: [person({ pkg: 'pass' })] }) }, ADMIN);
check('second modify: fee still once', d.amount === 700 + 50, d);
d = await call('POST', '/admin/reg/act', { id: id1, action: 'paid' }, ADMIN); check('mark paid', d.status === 'paid');
d = await call('POST', '/admin/reg/act', { id: id1, action: 'cancel' }, ADMIN); check('cancel paid → refund minus ¥50 once', d.status === 'cancelled' && d.refund === 700, d);
d = await call('GET', '/reg/left?event=bj2027'); check('cancel frees seats', d.left.M1 === 298, d.left);
// hotel refund after 6/11 — use a direct row with paid hotel
const late = R.EVENTS.bj2027; const saved = late.hotelRefundBy; late.hotelRefundBy = '2000-01-01';
db.prepare("INSERT INTO reg(event,code,email,status,people,data,amount,hotel_amount,created_at,updated_at) VALUES('bj2027','H-1','h@h.com','paid',1,?,3950,2500,'2026-12-01','2026-12-01')")
  .run(JSON.stringify({ people: [person({ items: [] })], rooms: [], passports: [] }));
const hid = db.prepare("SELECT id FROM reg WHERE code='H-1'").get().id;
d = await call('POST', '/admin/reg/act', { id: hid, action: 'cancel', silent: 1 }, ADMIN); check('late cancel keeps hotel', d.refund === 3950 - 50 - 2500, d);
late.hotelRefundBy = saved;
// note, csv
d = await call('POST', '/admin/reg/act', { id: id2, action: 'note', note: '付款截图已收' }, ADMIN); check('note', d.ok);
const csvRes = await social(new Request('https://api.tangoweekend.org/social/admin/reg?event=bj2027&format=csv', { headers: { Authorization: 'Bearer ' + ADMIN } }), env, new URL('https://api.tangoweekend.org/social/admin/reg?event=bj2027&format=csv'), json);
const csv = await csvRes.text(); check('csv one line per person + passport cols', csv.includes('passport_surname') && csv.split('\n').filter(l => l.startsWith('BJ27-0002')).length === 2, csv.slice(0, 300));
// reminder after 10 days
db.prepare("UPDATE reg SET confirmed_at='2026-01-01T00:00:00Z' WHERE id=?").run(id2); mails.length = 0;
let rr = await regCron(env); check('reminder sent once', rr.sent === 1 && mails.some(m => m.includes('BJ27-0002')), rr);
rr = await regCron(env); check('reminder not repeated', rr.sent === 0);
// QR asset
d = await call('POST', '/admin/reg/asset', { name: 'intl-wechat', mime: 'image/png', b64: Buffer.from('PNGDATA').toString('base64') }, ADMIN); check('upload QR', d.ok);
const q1 = await social(new Request('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=qrkey'), env, new URL('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=qrkey'), json);
check('QR served with key', q1.status === 200 && (await q1.text()) === 'PNGDATA');
const q2 = await social(new Request('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=bad'), env, new URL('https://api.tangoweekend.org/social/reg/qr/intl-wechat?k=bad'), json);
check('QR hidden without key', q2.status === 404);
// live mode goes to the dancer
env.REG_LIVE = '1'; mails.length = 0; const cat = subscriber('cat@qq.com', 'Cat');
d = await call('POST', '/reg', form({ lang: 'zh' }), cat); check('live: letter to the dancer in Chinese', mails.some(m => m.includes('to=cat@qq.com') && m.includes('已收到报名')), mails);
// cron before migration is quiet
const bare = new DatabaseSync(':memory:'); const rr2 = await regCron({ ...env, SDB: D1(bare) }); check('cron quiet before migration', rr2.sent === 0);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('register tests passed:', passed);
