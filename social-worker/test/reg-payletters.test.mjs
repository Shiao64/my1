// 收款信写金额、部分付款也寄信、到场付款补款先请他用支付宝／微信 (Shiao, 2026-11-26).
// Run: node social-worker/test/reg-payletters.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-payletters';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

// the clock: 2027-01-05, open everywhere and before the refund date
const Real = globalThis.Date, NOW = Real.parse('2027-01-05T12:00:00+08:00');
globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };

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
function subscriber(email, name) {
  const now = new Date().toISOString();
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, 'en', now, now);
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), now);
  return tok;
}
async function call(method, p, body, auth) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
    body: body ? JSON.stringify(body) : undefined }), env, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const person = (o = {}) => ({ name: 'Amy Lee', country: 'KR', city: 'Seoul', role: 'follower', pkg: 'pass', items: [], ...o });
const form = (o = {}) => ({ event: 'bstw2027', lang: 'en', people: [person()], hotel: 'no', ...o });
const act = body => call('POST', '/admin/reg/act', { event: 'bstw2027', ...body }, ADMIN);
const dbRow = id => db.prepare('SELECT * FROM reg WHERE id=?').get(id);
const me = tok => call('GET', '/reg/me?event=bstw2027&lang=en', null, tok);

// the two payment codes the organizers uploaded
for (const name of ['intl-alipay', 'intl-wechat']) await call('POST', '/admin/reg/asset', { event: 'bstw2027', name, mime: 'image/png', b64: Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64') }, ADMIN);
let n = 0;
async function make(state) {
  const email = `pay${++n}@example.test`, tok = subscriber(email, 'Pay');
  const d = await call('POST', '/reg', form(), tok);
  const id = db.prepare('SELECT id FROM reg WHERE code=?').get(d.code).id;
  if (['confirmed', 'cash', 'paid'].includes(state)) await act({ id, action: 'confirm', silent: 1 });
  if (state === 'cash') await act({ id, action: 'cash', silent: 1 });
  if (state === 'paid') await act({ id, action: 'pay', silent: 1, pay: { amount: 700, method: 'alipay' } });
  take();
  return { id, code: d.code, email, tok };
}
const pay = async (x, amount, method = 'alipay', extra = {}) => { const d = await act({ id: x.id, action: 'pay', pay: { amount, method }, ...extra }); const ms = take(); return { d, ms, to: mine(ms, x.email) }; };
const logged = (x, a) => db.prepare('SELECT COUNT(*) c FROM reg_log WHERE reg_id=? AND action=?').get(x.id, a).c;
const count = (s, w) => s.split(w).length - 1;
const QR = '/social/reg/qr/intl-alipay', PASS = '/social/reg/pass';

// --- part of it, while 待付款: a letter with what came in, what is owed, the date and the codes
let x = await make('confirmed');
let r = await pay(x, 300);
let t = r.to[0] ? r.to[0].body : '';
check('part: one letter to the registrant, logged', r.d.ok && r.d.mail === 'sent' && r.to.length === 1 && r.to[0].subject === 'Part payment received · ' + x.code && logged(x, 'mail:part') === 1, [r.d, r.ms.map(m => m.subject)]);
check('part: this payment, method and date; total, paid, still to pay', t.includes(`We have received your payment of ¥300 (Alipay, 2027-01-05) for ${x.code}.`) && t.includes('Total ¥700, paid ¥300, still to pay ¥400.'), t);
check('part: pay the rest by the date, with the codes and the steps once above them', /Please pay the remaining ¥400 by 2027-01-19 with Alipay or WeChat Pay/.test(t) && t.includes(QR) && t.includes('#pay') && t.includes('If you cannot use'), t);
check('part: not called complete, no placeholders', !t.includes('registration is complete') && !/\{[a-z]\}|undefined/.test(t), t);
check('part: the organizers get the copy', r.ms.some(m => m.to === BOSS && /\[副本/.test(m.subject) && m.body.includes('still to pay ¥400')), r.ms.map(m => m.to + ' ' + m.subject));
let me1 = await me(x.tok);
check('page: still the codes and the rest', me1.reg.status === 'confirmed' && me1.reg.rest === 400 && me1.reg.pay.length === 2, me1.reg);
// --- the rest: the receipt says this payment and that it is all paid
r = await pay(x, 400, 'wechat'); t = r.to[0].body;
check('paid: this payment, then total and paid in full', r.to[0].subject === 'Payment received · ' + x.code && t.includes(`We have received your payment of ¥400 (WeChat Pay, 2027-01-05) for ${x.code}.`) && t.includes('Total ¥700, paid ¥700: paid in full.') && t.includes('Your registration is complete. See you in Beijing!'), t);
check('paid: entry codes, no payment codes', t.includes('Your entry QR codes') && !t.includes(QR) && t.includes('#passes'), t);

x = await make('confirmed'); r = await pay(x, 300, 'alipay', { silent: 1 });
check('part, 不寄信: no letter', r.d.ok && r.ms.length === 0, r.ms);
db.prepare('UPDATE reg SET due_at=? WHERE id=?').run('2027-01-01T00:00:00.000Z', x.id);
r = await pay(x, 100, 'other'); t = r.to[0].body;
check('part after the date: no past date; 其他 names no method', t.includes(`We have received your payment of ¥100 (2027-01-05) for ${x.code}.`) && t.includes('Please pay the remaining ¥300 soon') && !t.includes('2027-01-01'), t);

// --- part of it, while 到场付款: asked to pay now, on arrival only if that is not possible
x = await make('cash'); r = await pay(x, 300, 'cash'); t = r.to[0].body;
check('part on 到场付款: pay now, arrival only if no app', t.includes('(cash, 2027-01-05)') && t.includes('¥400 is still to pay. Please pay it now with Alipay or WeChat Pay') && t.includes('Only if you cannot use Alipay or WeChat Pay, pay when you arrive') && t.includes(QR) && !t.includes('flight ticket instead'), t);
me1 = await me(x.tok);
check('page: 到场付款 that owes gets the payment codes', me1.reg.status === 'cash' && me1.reg.pay.length === 2, me1.reg);

// --- paid, then something added: the update letter asks to pay now, with payment codes and entry codes
x = await make('paid');
me1 = await me(x.tok); check('page: nothing owed, no payment codes', me1.reg.pay.length === 0, me1.reg);
let d = await act({ id: x.id, action: 'modify', data: form({ people: [person({ items: ['tour'] })] }) }); let ms = take(); t = mine(ms, x.email)[0].body;
check('modify: 到场付款, owes ¥500', d.ok && d.status === 'cash' && d.rest === 500, d);
check('modify: new wording, not "pay it when you arrive (…cash)"', t.includes(`¥500 is still to pay. Please pay it now with Alipay or WeChat Pay`) && t.includes('registration number ' + x.code) && !t.includes('please pay it when you arrive'), t);
const html = t.slice(t.indexOf('<!doctype'));
check('modify: payment codes with steps once, and the entry codes, in one letter', html.includes(QR) && count(html, 'How to pay:') === 1 && html.includes('alt="QR"') && html.indexOf('How to pay:') < html.indexOf(QR) && html.indexOf(QR) < html.indexOf('alt="QR"') && count(html, '<!doctype') === 1, html.slice(0, 600));
check('modify: the button opens the payment part', html.includes('#pay'), html.slice(0, 600));
check('modify: copy to organizers has payment codes but no entry codes', ms.some(m => m.to === BOSS && m.body.includes(QR) && !m.body.includes('alt="QR"')), ms.map(m => m.to + ' ' + m.subject));
// 调整金额 on a paid one
x = await make('paid'); d = await act({ id: x.id, action: 'adjust', adjust: { d: 200, part: 'reg', why: 'extra' } }); ms = take();
const adj = mine(ms, x.email).find(m => /Amount changed/.test(m.subject));
check('调整金额 → 到场付款: same wording with the codes', adj && adj.body.includes('¥200 is still to pay. Please pay it now') && adj.body.includes(QR), adj || d);
// the flight-ticket letter stays: those cannot use the apps
x = await make('confirmed'); await act({ id: x.id, action: 'cash' }); t = mine(take(), x.email)[0].body;
check('机票截图 letter unchanged: on arrival, no payment codes', t.includes('Please pay ¥700 when you arrive') && !t.includes(QR), t);
me1 = await me(x.tok);
check('page: a flight-ticket one is not asked to pay ahead', me1.reg.status === 'cash' && me1.reg.rest === 700 && me1.reg.pay.length === 0, me1.reg);
await act({ id: x.id, action: 'adjust', adjust: { d: 100, part: 'reg', why: 'extra' } }); take(); me1 = await me(x.tok);
check('page: after a change to it, the codes show (as that letter says)', me1.reg.pay.length === 2, me1.reg);

// --- every language, no code uploaded, and an old record without payments
const base = { code: 'BJ27-0012', event: 'bstw2027', amount: 1450, due_at: '2027-02-01T00:00:00.000Z', domestic: 0, data: { people: [{ name: 'A', amount: 1450, pkg: 'full', extra: [], items: [] }], rooms: [], hotel: false } };
for (const lang of ['en', 'zh', 'ko', 'es', 'ru']) {
  const got = { amount: 200, method: 'wechat', at: '2027-01-05T04:00:00.000Z' };
  for (const [kind, o] of [['part', { status: 'confirmed', rest: 1250, paidNow: 200, got }], ['part', { status: 'cash', rest: 1250, paidNow: 200, got }], ['paid', { status: 'paid', paidNow: 1450, got }], ['upd', { status: 'cash', rest: 200, upd: {} }], ['adj', { status: 'cash', rest: 200, adj: { d: 200, why: 'w', was: 1250, paid: 1250, over: 0 } }]]) {
    const m = R.letter(kind, { ...base, lang, ...o }, env, null, ['intl-alipay']);
    check(`${lang} ${kind} ${o.status}: filled in, one code`, m.subject.includes('BJ27-0012') && !/\{[a-z]\}|undefined|NaN/.test(m.subject + m.text) && (o.status === 'paid' || m.html.includes('intl-alipay')), m.text);
  }
}
let m = R.letter('upd', { ...base, lang: 'zh', status: 'cash', rest: 200, upd: {} }, env, null, ['intl-alipay', 'intl-wechat']);
check('zh wording', m.text.includes('还差 ¥200。请现在用支付宝或微信支付') && m.text.includes('实在无法使用支付宝或微信的，可到场付清后入场'), m.text);
m = R.letter('part', { ...base, lang: 'zh', status: 'cash', rest: 200, paidNow: 1250, got: { amount: 100, method: 'alipay', at: '2027-01-05T04:00:00.000Z' } }, env, null, ['cn-alipay']);
check('zh part', m.subject === '已收到部分付款 · BJ27-0012' && m.text.includes('已收到报名 BJ27-0012 的付款 ¥100（支付宝，2027-01-05）。') && m.text.includes('本报名合计 ¥1,450，已付 ¥1,250，还差 ¥200。'), m.text);
m = R.letter('upd', { ...base, lang: 'zh', status: 'cash', rest: 200, upd: {} }, env, null, []);
check('no code uploaded: the old line, nothing points at a missing code', m.text.includes('请到场时支付') && !m.text.includes('付款码'), m.text);
m = R.letter('part', { ...base, lang: 'en', status: 'cash', rest: 200, paidNow: 1250 }, env, null, []);
check('part with no code uploaded: no payment-QR link', m.text.includes('when you arrive') && !m.text.includes('#pay') && !m.text.includes('payment QR'), m.text);
m = R.letter('paid', { ...base, lang: 'zh', status: 'paid', paidNow: 0 }, env, null, []);
check('marked paid with no payment recorded: the old sentence', m.text.includes('已收到报名 BJ27-0012 的付款，报名完成。北京见！') && !m.text.includes('已付 ¥0'), m.text);

console.log(`reg-payletters: ${passed} passed, ${fail.length} failed`);
if (fail.length) { console.log(fail.join('\n')); process.exit(1); }
