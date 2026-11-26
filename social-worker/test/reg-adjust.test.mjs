// 调整金额 (Shiao, 2026-11-26): the 总管 (and the 管理员) adds to or takes off one registration's total, money only.
// The password again (like a refund), a reason the registrant is told, an internal note they never see, no handling fee.
// After it: paid but owing again → 到场付款 (entry codes stay); 待付款 / 到场付款 covered → paid; paid above the new total →
// the difference is refunded without cancelling. A total taken to ¥0 before review is paid as soon as it is confirmed.
// A new total worked out from the form again (the registrant editing a pending one, or 修改报名) keeps the adjustments.
// Run: node social-worker/test/reg-adjust.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

// a day after the opening (12/1 00:00 Beijing, the gate #450 adds while REG_LIVE=1), so this test does not depend on today
const RealDate = Date, OFFSET = RealDate.parse('2027-01-05T12:00:00+08:00') - RealDate.now();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [RealDate.now() + OFFSET])); } static now() { return RealDate.now() + OFFSET; } };
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-adjust';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql', '0025_no_site_manager.sql', '0026_reg_mailto.sql'])
  db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
function D1(database) {
  return {
    async batch(list) { database.exec('BEGIN'); try { const out = list.map(x => x.run()); database.exec('COMMIT'); return out; } catch (e) { database.exec('ROLLBACK'); throw e; } },
    prepare(sql) { const st = database.prepare(sql); let args = []; return {
      bind(...a) { args = a; return this; },
      async first(col) { const r = st.get(...args); return r ? (col ? r[col] ?? null : r) : null; },
      async all() { return { results: st.all(...args) }; },
      run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
    }; } };
}
const ADMIN = 'a'.repeat(32), BOSS = 'boss@example.com';
// live: letters go to the registrants themselves, so where each one goes is plain
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_NOTIFY: BOSS, REG_LIVE: '1',
  REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 900) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(parse(s)); else if (!/^(tp mail|reg owner mail)/.test(s)) orig(...a); };
function parse(s) {
  const m = /^\[mail:log\] from=(.*?) to=(\S+)( cc=\S+)?( reply-to=\S+)? subject=([^\n]*?)( \{[^\n]*\})?\n([\s\S]*)$/.exec(s);
  return m ? { to: m[2], subject: m[5], body: m[7] } : { raw: s, subject: '', body: '' };
}
const take = () => mails.splice(0, mails.length);
const mine = (ms, to) => ms.filter(m => m.to === to && !/\[副本/.test(m.subject));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const keyOf = link => (/\/register\/in\/(?:\?m=[0-9a-f]{32})?#([0-9a-f]{48})/.exec(link || '') || [])[1];
function subscriber(email, name) {
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, 'en', '2026-11-01', '2026-11-01');
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
const signIn = async (made, own) => (await call('POST', '/reg/login', { key: keyOf(made.link), pin: made.pin, new_pin: own })).token;
const list = auth => call('GET', '/admin/reg?event=bstw2027', null, auth);
const row = async code => (await list(ADMIN)).rows.find(r => r.code === code);
const act = (body, auth = ADMIN) => call('POST', '/admin/reg/act', { event: 'bstw2027', ...body }, auth);
const adjust = (id, d, o = {}, auth = ADMIN) => act({ id, action: 'adjust', adjust: { d, why: o.why === undefined ? 'test' : o.why, part: o.part, note: o.note }, ...(o.pin ? { pin: o.pin } : {}), ...(o.seen != null ? { seen: o.seen } : {}) }, auth);
const me = tok => call('GET', '/reg/me?event=bstw2027&lang=en', null, tok);
const dbRow = code => db.prepare('SELECT * FROM reg WHERE code=?').get(code);

// --- the team: a 总管 and a 经理 on their phones
const chiefMade = await call('POST', '/admin/reg/admins', { event: 'bstw2027', name: '刘峥', role: 'chief' }, ADMIN);
const CH = await signIn(chiefMade, '730195');
const depMade = await call('POST', '/admin/reg/admins', { event: 'bstw2027', name: '竟文', role: 'deputy' }, ADMIN);
const DP = await signIn(depMade, '841726');
check('team signed in', CH && DP, { chiefMade, depMade });
take();

// --- who may, and what is refused (a pending one: ¥1450)
const amy = subscriber('amy@example.com', 'Amy');
let d = await call('POST', '/reg', form(), amy);
check('amy registered', d.ok && d.code === 'BJ27-0001' && d.total === 1450, d);
const A = (await row('BJ27-0001')).id;
take();
d = await adjust(A, 200, {}, DP); check('经理 may not adjust', d._s === 403 && d.error === 'no_permission', d);
d = await adjust(A, 200, {}, CH); check('总管 without the password: asked for it', d._s === 401 && d.error === 'pin_needed', d);
d = await adjust(A, 200, { pin: '111111' }, CH); check('总管 with a wrong password: refused', d._s === 401 && d.error === 'wrong_pin', d);
d = await adjust(A, 200, { why: ' ' }); check('a reason is required', d._s === 400 && d.error === 'need_why', d);
d = await adjust(A, 0); check('¥0 refused', d._s === 400 && d.error === 'bad_amount', d);
d = await adjust(A, 'x'); check('not a number refused', d._s === 400 && d.error === 'bad_amount', d);
d = await adjust(A, -300, { part: 'hotel' }); check('no hotel: nothing to take off it', d._s === 400 && d.error === 'no_hotel', d);
d = await adjust(A, -1451); check('never below ¥0: says how much at most', d._s === 400 && d.error === 'bad_amount' && d.max === 1450, d);
check('nothing written by the refused ones', dbRow('BJ27-0001').amount === 1450 && !db.prepare("SELECT 1 FROM reg_log WHERE action='adjust'").get() && take().length === 0);

// --- pending: +200 by the 总管 with the password
d = await adjust(A, 200, { pin: '730195', why: 'one more night', note: 'asked on WeChat' }, CH);
let ms = take(), to = mine(ms, 'amy@example.com');
check('总管 adds ¥200: total 1650, still pending', d.ok && d.amount === 1650 && d.status === 'pending', d);
check('amy gets the 金额调整 letter', to.length === 1 && to[0].subject === 'Amount changed · BJ27-0001', ms.map(m => m.to + ' ' + m.subject));
check('the letter: what changed, why, the totals, what next', /an extra charge of ¥200/.test(to[0].body) && /Note from the organizers: one more night/.test(to[0].body)
  && /Previous total ¥1,450, new total ¥1,650, paid so far ¥0/.test(to[0].body) && /once your registration is confirmed will use the new amount/.test(to[0].body), to[0].body);
check('the internal note never reaches the registrant', !/asked on WeChat/.test(to[0].body));
check('the organizers get a copy, without the internal note', ms.some(m => m.to === BOSS && /\[副本\] Amount changed · BJ27-0001/.test(m.subject) && !/asked on WeChat/.test(m.body)), ms.map(m => m.to + ' ' + m.subject));
d = await adjust(A, 100, { seen: 1450 }); check('a screen that showed the old total: refused, says who', d._s === 409 && d.error === 'bad_state' && d.last && d.last.action === 'adjust' && d.last.by === '刘峥', d);
let r = await row('BJ27-0001');
check('the list shows the adjustment with its note and who', r.adjusts.length === 1 && r.adjusts[0].d === 200 && r.adjusts[0].why === 'one more night' && r.adjusts[0].note === 'asked on WeChat' && r.adjusts[0].by === '刘峥', r.adjusts);
check('not twice in the history', !r.log.some(l => l.action === 'adjust'), r.log);
d = await me(amy);
check('amy sees it on the page, without the note', d.reg.amount === 1650 && d.reg.adjust.length === 1 && d.reg.adjust[0].d === 200 && d.reg.adjust[0].why === 'one more night' && !('note' in d.reg.adjust[0]) && !('by' in d.reg.adjust[0]), d.reg);
// the registrant edits the pending one: the adjustment stays
d = await call('POST', '/reg', form(), amy); ms = take();
check('the same form again at once: same press, no second letter', d.ok && d.total === 1650 && !mine(ms, 'amy@example.com').length, { d, ms: ms.map(m => m.subject) });
d = await call('POST', '/reg', form({ people: [person({ pkg: 'pass' })] }), amy); take();
check('edited to the ¥700 pass: 700 + 200', d.ok && d.total === 900 && dbRow('BJ27-0001').amount === 900, d);

// --- confirmed: the payment letter and −100
d = await act({ id: A, action: 'confirm' }); ms = take();
check('confirmed: the letter asks for the adjusted total', d.ok && d.amount === 900 && mine(ms, 'amy@example.com').some(m => /Total: ¥900/.test(m.body)), ms.map(m => m.subject));
d = await adjust(A, -100, { why: 'volunteer' }); ms = take(); to = mine(ms, 'amy@example.com');
check('−100 on a confirmed one: 800, still to pay', d.ok && d.amount === 800 && d.status === 'confirmed' && d.rest === 800, d);
check('the letter asks for the new amount', to.length === 1 && /a reduction of ¥100/.test(to[0].body) && /Please pay ¥800 by/.test(to[0].body), to.map(m => m.body));
d = await act({ id: A, action: 'pay', pay: { amount: 800, method: 'wechat' } }); take();
check('paid 800: paid', d.ok && d.status === 'paid', d);
const pass = (await me(amy)).reg.passes[0].pass;

// --- paid, then +300: 到场付款, the entry codes stay
d = await adjust(A, 300, { why: 'room upgrade' }); ms = take(); to = mine(ms, 'amy@example.com');
check('+300 on a paid one: 到场付款, 300 to pay', d.ok && d.amount === 1100 && d.status === 'cash' && d.rest === 300, d);
check('the letter: pay the rest at the door, the codes stay; no second paid letter', to.length === 1 && /¥300 is still to pay/.test(to[0].body) && /entry QR codes stay the same/.test(to[0].body), to.map(m => m.subject + ' | ' + m.body));
d = await me(amy); check('the page: 到场付款 with 300 left, still the entry codes', d.reg.status === 'cash' && d.reg.rest === 300 && d.reg.passes.length === 1, d.reg);
d = await call('GET', '/reg/pass/' + encodeURIComponent(pass) + '.png'); check('the entry code still opens', d._s === 200, d._s);
d = await act({ id: A, action: 'pay', pay: { amount: 300, method: 'cash' } }); take();
check('the 300 collected: paid again', d.ok && d.status === 'paid', d);

// --- paid, then −500: paid more than the total, refunded without cancelling
d = await adjust(A, -500, { why: 'session cancelled' }); ms = take(); to = mine(ms, 'amy@example.com');
check('−500 on a paid one: stays paid, 500 paid too much', d.ok && d.amount === 600 && d.status === 'paid' && d.over === 500, d);
check('the letter says it will be refunded', to.length === 1 && /You have paid ¥500 more than the new total/.test(to[0].body), to.map(m => m.body));
d = await me(amy); check('the page says so too', d.reg.over === 500 && d.reg.rest === 0, d.reg);
d = await act({ id: A, action: 'refund', from: 'paid', pay: { amount: 500, method: 'wechat' } }, CH); check('the 总管 refunds with the password again', d._s === 401 && d.error === 'pin_needed', d);
d = await act({ id: A, action: 'refund', from: 'paid', pay: { amount: 600, method: 'wechat' }, pin: '730195' }, CH); check('not more than was paid above the total', d._s === 400 && d.error === 'bad_amount' && d.due === 500, d);
d = await act({ id: A, action: 'refund', from: 'paid', pay: { amount: 500, method: 'wechat', seen: 500 }, pin: '730195' }, CH);
check('refunded 500, nothing more due', d.ok && d.due === 0, d);
d = await act({ id: A, action: 'refund', from: 'paid', pay: { amount: 1, method: 'wechat' } }); check('nothing left to refund', d._s === 409 && d.error === 'already_refunded', d);
check('still paid, 600 held for a 600 total', dbRow('BJ27-0001').status === 'paid' && db.prepare('SELECT SUM(amount) s FROM reg_payment WHERE reg_id=?').get(A).s === 600);
// cancelling afterwards refunds from the adjusted amount
d = await act({ id: A, action: 'cancel', from: 'paid' }); take();
check('cancel: 600 paid − ¥50 fee = 550', d.ok && d.refund === 550, d);
d = await adjust(A, 100); check('a cancelled one cannot be adjusted', d._s === 409 && d.error === 'bad_state', d);

// --- the hotel part
const bob = subscriber('bob@example.com', 'Bob');
d = await call('POST', '/reg', form({ people: [person({ name: 'Bob Kim' })], hotel: 'yes', rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], passports: [{ s: 'KIM', g: 'BOB' }] }), bob);
check('bob with a hotel: 1450 + 1000', d.ok && d.total === 2450, d);
const B = (await row(d.code)).id; take();
d = await adjust(B, -300, { part: 'hotel', why: 'hotel discount' }); take();
check('−300 on the hotel: both totals', d.ok && d.amount === 2150 && dbRow('BJ27-0002').hotel_amount === 700, { d, hotel: dbRow('BJ27-0002').hotel_amount });
d = await adjust(B, -800, { part: 'hotel' }); check('the hotel part never below ¥0', d._s === 400 && d.error === 'bad_amount' && d.max === 700, d);
d = await adjust(B, -1500); check('the registration part never below ¥0', d._s === 400 && d.error === 'bad_amount' && d.max === 1450, d);

// --- to ¥0 while pending: paid as soon as it is confirmed, with the entry codes
const cat = subscriber('cat@example.com', 'Cat');
d = await call('POST', '/reg', form({ people: [person({ name: 'Cat Wu' })] }), cat); const C = (await row(d.code)).id; take();
d = await adjust(C, -1450, { why: 'teacher' }); take();
check('to ¥0 before review: still pending', d.ok && d.amount === 0 && d.status === 'pending', d);
d = await act({ id: C, action: 'confirm' }); ms = take(); to = mine(ms, 'cat@example.com');
check('confirmed at ¥0: paid at once, the letter with the entry codes', d.ok && d.status === 'paid' && to.length === 1 && /Payment received/.test(to[0].subject), { d, s: to.map(m => m.subject) });

// --- to ¥0 once confirmed: paid, and the entry codes go out
const dan = subscriber('dan@example.com', 'Dan');
d = await call('POST', '/reg', form({ people: [person({ name: 'Dan Ho' })] }), dan); const D = (await row(d.code)).id;
await act({ id: D, action: 'confirm' }); take();
d = await adjust(D, -1450, { why: 'volunteer' }); ms = take(); to = mine(ms, 'dan@example.com');
check('confirmed taken to ¥0: paid', d.ok && d.status === 'paid' && d.amount === 0, d);
check('two letters: the adjustment, then the one with the entry codes', to.length === 2 && /Amount changed/.test(to[0].subject) && /Payment received/.test(to[1].subject), to.map(m => m.subject));

// --- 修改报名 keeps the adjustments; raising a paid one makes it 到场付款
const eve = subscriber('eve@example.com', 'Eve');
d = await call('POST', '/reg', form({ people: [person({ name: 'Eve Ma' })] }), eve); const E = (await row(d.code)).id; const eCode = d.code;
await adjust(E, 100, { why: 'late' }); await act({ id: E, action: 'confirm' }); take();
d = await act({ id: E, action: 'modify', silent: 1, data: form({ people: [person({ name: 'Eve Ma' })] }) });
check('修改报名 after review, not paid yet: no fee, 1450 + 100 kept', d.ok && d.amount === 1550, d);
await act({ id: E, action: 'pay', silent: 1, pay: { amount: 1550, method: 'alipay' } }); take();
d = await act({ id: E, action: 'modify', silent: 1, data: form({ people: [person({ name: 'Eve Ma', items: ['tour'] })] }) });
check('修改报名 raising a paid one: ¥50 (first change after payment), 到场付款, the rest shows', d.ok && d.amount === 2050 && d.status === 'cash' && (await me(eve)).reg.rest === 500, d);

// --- other languages
const kim = subscriber('kim@example.com', 'Kim');
d = await call('POST', '/reg', form({ lang: 'ko', people: [person({ name: 'Kim Min' })] }), kim); const K = (await row(d.code)).id; take();
d = await adjust(K, 150, { why: '추가' }); to = mine(take(), 'kim@example.com');
const kCode = db.prepare('SELECT code FROM reg WHERE id=?').get(K).code;
check('ko letter', d.ok && to.length === 1 && to[0].subject === '금액 변경 · ' + kCode && /추가 요금 ¥150/.test(to[0].body), to.map(m => m.subject + ' | ' + m.body.slice(0, 200)));
const zhu = subscriber('zhu@example.com', 'Zhu');
d = await call('POST', '/reg', form({ lang: 'zh', people: [person({ name: '朱一', country: 'CN' })] }), zhu); const Z = (await row(d.code)).id; take();
d = await adjust(Z, -150, { why: '义工' }); to = mine(take(), 'zhu@example.com');
check('zh letter', to.length === 1 && /^金额调整 · BJ27-/.test(to[0].subject) && /减收 ¥150/.test(to[0].body) && /说明：义工/.test(to[0].body), to.map(m => m.subject + ' | ' + m.body.slice(0, 200)));
for (const l of ['es', 'ru']) {
  const t = subscriber(l + '@example.com', l);
  d = await call('POST', '/reg', form({ lang: l, people: [person({ name: 'P ' + l })] }), t); const id = (await row(d.code)).id; take();
  await adjust(id, 50); to = mine(take(), l + '@example.com');
  check(l + ' letter has no gaps', to.length === 1 && !/undefined|\{[a-z]\}/.test(to[0].subject + to[0].body), to.map(m => m.subject + ' | ' + m.body));
}

// --- the export: the sum and the reasons on the first line
d = await call('GET', '/admin/reg?event=bstw2027&format=csv', null, ADMIN);
const csv = d._text.replace(/^﻿/, '').split('\n'), head = csv[0].split(',');
check('export: two new columns at the end', head.slice(-2).join(',') === 'adjust,adjust_why', head.slice(-3));
const amyLine = csv.find(l => l.startsWith('BJ27-0001,'));
check('export: amy −100 in all, with each reason', amyLine && /,-100,"?加收 200 one more night; 减收 100 volunteer; 加收 300 room upgrade; 减收 500 session cancelled"?$/.test(amyLine), amyLine);

orig(`reg-adjust: ${passed} passed, ${fail.length} failed`);
if (fail.length) { orig(fail.join('\n')); process.exit(1); }
