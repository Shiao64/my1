// Before the 12/1 opening (Shiao, 2026-11-27 「开始改」): live numbers from 0101, no letter lost at the event mailbox,
// payment dates said rightly, a resubmit keeps its discount.
// Run: node social-worker/test/reg-prelaunch.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-prelaunch';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'inmail.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
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
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_NOTIFY: BOSS, REG_LIVE: '',
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

const { regInboundMail } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const reg = (tok, o = {}) => call('POST', '/reg', form(o), tok);
// --- 1. test numbers start at 0001; live ones at 0101, then one after another
let d = await reg(subscriber('t1@example.test', 'T'));
check('test stage: BJ27-0001', d.code === 'BJ27-0001', d);
env.REG_LIVE = '1';
d = await reg(subscriber('l1@example.test', 'L'));
check('live: starts at 0101, above every test number', d.code === 'BJ27-0101', d);
d = await reg(subscriber('l2@example.test', 'L'));
check('live: then 0102', d.code === 'BJ27-0102', d);
db.prepare('DELETE FROM reg_log').run(); db.prepare('DELETE FROM reg').run();
d = await reg(subscriber('l3@example.test', 'L'));
check('live, test data cleared: the first real one is still 0101', d.code === 'BJ27-0101', d);
db.prepare("INSERT INTO reg(event,code,user_id,email,lang,status,domestic,people,data,amount,hotel_amount,created_at,updated_at) VALUES('bstw2027','BJ27-0250',999,'x@example.test','en','pending',0,1,'{}',1,0,'2027-01-01','2027-01-01')").run();
d = await reg(subscriber('l4@example.test', 'L'));
check('live: after a higher number, the next one', d.code === 'BJ27-0251', d);
env.REG_LIVE = '';
// --- 4. a resubmit with the code box empty keeps the discount already given
const early = subscriber('early@example.test', 'E');
d = await reg(early, { people: [person({ pkg: 'full' })], code: 'early' });
check('early code: ¥1,350', d.ok && d.total === 1350, d);
d = await reg(early, { people: [person({ pkg: 'full', name: 'Amy L.' })] });
check('resubmit without the code: still ¥1,350', d.ok && d.updated && d.total === 1350 && d.promo === 'early', d);
d = await reg(early, { people: [person({ pkg: 'pass' })] });
check('resubmit changed to the ¥700 pass: its price', d.ok && d.total === 700, d);
d = await reg(early, { people: [person({ pkg: 'full' })] });
check('back to the full pass: the early price again', d.ok && d.total === 1350, d);
d = await reg(early, { people: [person({ pkg: 'full' })], code: 'EARLY' });
check('the same code typed again: kept', d.total === 1350, d);
const kept = await call('GET', '/reg/me?event=bstw2027&lang=en', null, early);
check('the page is told the kept discount while pending', kept.reg.status === 'pending' && kept.reg.promo && kept.reg.promo.kind === 'early' && kept.reg.promo.code === 'early' && !('dj' in kept.reg.promo), kept.reg);
d = await reg(early, { people: [person({ pkg: 'full' })], code: 'nosuchcode' });
check('another code: judged now', d.total === 1450, d);
const plain = subscriber('plain@example.test', 'P');
await reg(plain, { people: [person({ pkg: 'full' })] }); d = await reg(plain, { people: [person({ pkg: 'full', name: 'B' })] });
check('never had a code: full price', d.total === 1450, d);
// --- 3. payment words
const base = { code: 'BJ27-0101', event: 'bstw2027', amount: 700, domestic: 0, status: 'confirmed', data: { people: [{ name: 'A', amount: 700, pkg: 'pass', extra: [], items: [] }], rooms: [], hotel: false } };
const ahead = { due_at: '2027-02-01T00:00:00.000Z' }, past = { due_at: '2027-01-01T00:00:00.000Z' };
const L = (kind, o, lang = 'en') => R.letter(kind, { ...base, lang, rest: 700, upd: {}, adj: { d: 100, why: 'w', was: 600, paid: 0, over: 0 }, ...o }, env, null, ['intl-alipay']).text;
check('confirmation: within 2 weeks', L('conf', ahead).includes('(within 2 weeks of this email)'));
for (const k of ['conf', 'rem', 'upd', 'adj']) for (const o of [ahead, past]) check(`zh ${k}: never send your own 付款码`, L(k, o, 'zh').includes('请不要发送你自己 App 里的「付款码」'), L(k, o, 'zh'));
for (const k of ['rem', 'upd', 'adj']) {
  check(`${k}, date ahead: names it, not 「2 weeks」`, L(k, ahead).includes('Please pay ¥700 by 2027-02-01') && !L(k, ahead).includes('2 weeks'), L(k, ahead));
  check(`${k}, date passed: no old date asked`, L(k, past).includes('Please pay ¥700 soon') && !L(k, past).includes('by 2027-01-01'), L(k, past));
}
check('reminder after the date: says it passed', L('rem', past).includes('was 2027-01-01. Please pay as soon as you can'), L('rem', past));
check('reminder: ignore if already paid', L('rem', ahead).includes('If you have already paid') && !L('conf', ahead).includes('If you have already paid'));
for (const lang of ['zh', 'ko', 'es', 'ru']) for (const k of ['rem', 'upd', 'adj']) for (const o of [ahead, past]) check(`${lang} ${k}: filled in`, !/\{[a-z]\}|undefined/.test(L(k, o, lang)), L(k, o, lang));
// --- 2. a reply that cannot be passed on is kept, not swallowed
const EV = 'bstw2027@tangoweekend.org';
db.prepare("INSERT INTO reg_setting(event,key,value,updated_at) VALUES('bstw2027','event_mail',?, '2027-01-01'),('bstw2027','event_mail_ok',?, '2027-01-01')").run(EV, EV + '|2027-01-01');
d = await reg(subscriber('amy@example.com', 'Amy')); const amy = d.code; take();
function inbound(from, { fwdFails = false } = {}) {
  const raw = `From: ${from}\r\nTo: ${EV}\r\nSubject: paid ${amy}\r\nContent-Type: text/plain\r\n\r\nDone\r\n`;
  const m = { to: EV, from, raw, rawSize: raw.length, headers: new Headers({ from, to: EV, subject: 'paid ' + amy, 'authentication-results': 'dkim=pass spf=pass dmarc=pass' }), forwarded: [], rejected: '',
    async forward(a) { if (fwdFails) throw new Error('not verified'); m.forwarded.push(a); }, setReject(w) { m.rejected = w; } };
  return m;
}
let m = inbound('amy@example.com');
check('normal reply: relayed, not forwarded or refused', await regInboundMail(m, env) === true && m.forwarded.length === 0 && !m.rejected && take().length > 0);
const good = env.SOCIAL_MAIL; env.SOCIAL_MAIL = 'sub_mail'; env.SUB_MAIL = { async send() { throw new Error('daily quota exceeded'); } };
m = inbound('amy@example.com');
check('nobody can be sent to: the message goes on to the 管理员 as it is', await regInboundMail(m, env) === true && m.forwarded.join() === BOSS && !m.rejected, m);
const row = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.code === amy);
check('the page shows it with the unsent ones', row.mail_failed.some(x => x.action === 'replyin'), row.mail_failed);
m = inbound('stranger@example.org');
check('a stranger\'s, same trouble: forwarded too', await regInboundMail(m, env) === true && m.forwarded.length === 1, m);
m = inbound('amy@example.com', { fwdFails: true });
check('forwarding fails too: refused, so the sender knows', await regInboundMail(m, env) === true && /send it again/.test(m.rejected), m);
env.SOCIAL_MAIL = good; delete env.SUB_MAIL;
await regInboundMail(inbound('amy@example.com'), env); take();
const row2 = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.code === amy);
check('a later reply that gets through clears it', !row2.mail_failed.some(x => x.action === 'replyin'), row2.mail_failed);

console.log(`reg-prelaunch: ${passed} passed, ${fail.length} failed`);
if (fail.length) { console.log(fail.join('\n')); process.exit(1); }
