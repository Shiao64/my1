// 退费期限统一 (Shiao, 2026-11-26): one refund date for everything, hotel included. Cancelled on or before June 11, 2027
// (Beijing) → what was paid minus the ¥50 fee, once; from June 12 → nothing, and the cancellation letter says why (never
// "Refund: ¥0"). The confirmation and update letters state the rule in all five languages, and so does the registration
// form (r4). A cancellation with nothing paid gets no refund line at all; the refund button has nothing to return.
// Run: node social-worker/test/reg-refund-date.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-refund-date';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

// the clock: registrations on 2027-01-05 (open everywhere), cancellations around the refund date
const Real = globalThis.Date; let NOW = Real.parse('2027-01-05T12:00:00+08:00');
globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = s => { NOW = Real.parse(s); };

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
// live: letters go to the registrants themselves
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
function subscriber(email, name, lang = 'en') {
  const now = new Date().toISOString();
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, lang, now, now);
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), now);
  return tok;
}
async function call(method, p, body, auth) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
    body: body ? JSON.stringify(body) : undefined }), env, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const person = (o = {}) => ({ name: 'Amy Lee', country: 'KR', city: 'Seoul', role: 'follower', pkg: 'full', items: [], ...o });
const form = (o = {}) => ({ event: 'bstw2027', lang: 'en', people: [person()], hotel: 'no', ...o });
const act = body => call('POST', '/admin/reg/act', { event: 'bstw2027', ...body }, ADMIN);
const dbRow = code => db.prepare('SELECT * FROM reg WHERE code=?').get(code);

// --- 1. the rule in the confirmation and update letters, five languages
const RULE = {
  en: 'If you cancel on or before June 11, 2027, we refund your payment minus ¥50; after that nothing is refunded, hotel included.',
  zh: '2027年6月11日（含）前取消可退费，扣除手续费 ¥50；之后取消不退费，房费也一样。',
  ko: '2027년 6월 11일(포함)까지 취소하면 ¥50을 제외하고 환불하며, 그 후에 취소하면 호텔 요금을 포함해 환불되지 않습니다.',
  es: 'Si cancelas hasta el 11 de junio de 2027 (incluido), devolvemos lo pagado menos ¥50; después no se reembolsa nada, tampoco el hotel.',
  ru: 'При отмене до 11 июня 2027 включительно вернём оплату за вычетом ¥50; позже деньги не возвращаются, в том числе за отель.' };
const OLD = { en: 'Hotel charges are refunded only', zh: '如无法出席，可退费', ko: '취소 시에만 환불됩니다', es: 'El hotel solo se reembolsa', ru: 'Отель возвращается только' };
const lreg = (lang, o = {}) => ({ code: 'BJ27-0099', amount: 1450, due_at: '2027-01-19T04:00:00.000Z', status: 'confirmed', lang, domestic: 0,
  data: { people: [{ name: 'Amy Lee', amount: 1450, pkg: 'full', extra: [], items: [] }], rooms: [], hotel: false }, ...o });
for (const lang of Object.keys(RULE)) for (const kind of ['conf', 'upd']) {
  const m = R.letter(kind, lreg(lang), env, null, ['intl-alipay', 'intl-wechat']);
  check(`${lang} ${kind}: one refund date, hotel included`, m.text.includes(RULE[lang]) && m.html.includes(RULE[lang]), m.text);
  check(`${lang} ${kind}: the old hotel-only wording is gone`, !m.text.includes(OLD[lang]) && !m.html.includes(OLD[lang]), m.text);
}

// --- 2. cancelling around the refund date (Beijing midnight)
let n = 0;
async function one(status, paid, lang = 'en') {
  at('2027-01-05T12:00:00+08:00');
  const email = `cut${++n}@example.test`, tok = subscriber(email, 'Cut', lang);
  const d = await call('POST', '/reg', form({ lang, hotel: 'yes', rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], passports: [{ s: 'TEST', g: 'CUT' }] }), tok);
  const r = dbRow(d.code);
  db.prepare('UPDATE reg SET status=?,amount=2450,hotel_amount=1000 WHERE id=?').run(status, r.id);
  if (paid) db.prepare("INSERT INTO reg_payment(reg_id,at,amount,method,collector,by_admin) VALUES(?,'2027-01-06',?,'alipay','x','x')").run(r.id, paid);
  take();
  return { id: r.id, code: d.code, email };
}
async function cancelAt(x, when) { at(when); const d = await act({ id: x.id, action: 'cancel' }); const ms = take(); return { d, ms, to: mine(ms, x.email) }; }
const NO = { en: 'Under the registration rules, cancellations after June 11, 2027 are not refunded.', zh: '依报名规则，2027年6月11日之后取消不退费。' };

let x = await one('paid', 2450), c = await cancelAt(x, '2027-06-11T23:59:59+08:00');
check('6/11 23:59:59: paid back minus ¥50, hotel included', c.d.ok && c.d.refund === 2400, c.d);
check('6/11: the letter says how much comes back', c.to.length === 1 && c.to[0].body.includes('Refund: ¥2,400.') && !c.to[0].body.includes(NO.en), c.to.map(m => m.body));

const late = await one('paid', 2450); c = await cancelAt(late, '2027-06-12T00:00:00+08:00');
check('6/12 00:00: nothing back, hotel included', c.d.ok && c.d.status === 'cancelled' && c.d.refund === 0, c.d);
check('6/12: the letter says why, never "Refund: ¥0"', c.to.length === 1 && c.to[0].body.includes(NO.en) && !/Refund: ¥0/.test(c.to[0].body), c.to.map(m => m.body));
check('6/12: the organizers\' copy says it too', c.ms.some(m => m.to === BOSS && /\[副本/.test(m.subject) && m.body.includes(NO.en)), c.ms.map(m => m.to + ' ' + m.subject));
let d = await act({ id: late.id, action: 'refund' });
check('6/12: the refund button has nothing to return', d._s === 400 && d.error === 'bad_amount' && d.due === 0, d);
const row = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.code === late.code);
check('the admin list: 应退 ¥0 with ¥2,450 kept (the page says 依规定不退)', row && row.refund === 0 && row.paid_total === 2450, row);

x = await one('paid', 2450, 'zh'); c = await cancelAt(x, '2027-06-20T10:00:00+08:00');
check('zh, after the date: the letter says why in Chinese, never 退款：¥0', c.d.refund === 0 && c.to.length === 1 && c.to[0].body.includes(NO.zh) && !c.to[0].body.includes('退款：¥0'), c.to.map(m => m.body));

x = await one('cash', 500); c = await cancelAt(x, '2027-06-15T10:00:00+08:00');
check('到场付款 with ¥500 paid, after the date: nothing back', c.d.refund === 0 && c.to.length === 1 && c.to[0].body.includes(NO.en), c.d);

x = await one('confirmed', 0); c = await cancelAt(x, '2027-06-15T10:00:00+08:00');
check('nothing paid, after the date: no refund line at all', c.d.refund == null && c.to.length === 1 && !c.to[0].body.includes(NO.en) && !/Refund:/.test(c.to[0].body), { d: c.d, body: c.to.map(m => m.body) });

x = await one('cash', 50); c = await cancelAt(x, '2027-06-01T10:00:00+08:00');
check('before the date, only ¥50 paid: ¥0 back is the fee, not the date', c.d.refund === 0 && c.to.length === 1 && c.to[0].body.includes('Refund: ¥0.') && !c.to[0].body.includes(NO.en), c.to.map(m => m.body));

// --- 3. the registration form says it (r4), five languages
const FORM = {
  zh: '2027年6月11日（含）前取消可退费；之后取消，报名费和房费都不退。',
  en: 'Cancellations on or before June 11, 2027 can be refunded; after that, neither the registration nor the hotel is refunded.',
  ko: '2027년 6월 11일(포함)까지 취소하면 환불되며, 그 후에 취소하면 참가비와 호텔 요금 모두 환불되지 않습니다.',
  es: 'Si cancelas hasta el 11 de junio de 2027 (incluido), hay reembolso; después no se reembolsa ni la inscripción ni el hotel.',
  ru: 'При отмене до 11 июня 2027 включительно деньги возвращаются; позже не возвращаются ни за участие, ни за отель.' };
const pages = ['register/index.html', 'register/draft/index.html'].map(p => path.join(root, 'event/beijing-2027-tango-weekend', p)).filter(p => fs.existsSync(p));
const page = pages.map(p => fs.readFileSync(p, 'utf8')).find(s => s.includes("r4:'"));
const lines = page ? page.split('\n') : [];
for (const lang of Object.keys(FORM)) {
  const i = lines.findIndex(l => l.startsWith(lang + ':{')), block = i < 0 ? '' : lines.slice(i, i + 12).join('\n');
  const r4 = (/r4:'((?:[^'\\]|\\.)*)'/.exec(block) || [])[1] || '';
  check(`form ${lang}: r4 states the refund date`, r4.includes(FORM[lang]), r4);
}

orig(`reg-refund-date: ${passed} passed, ${fail.length} failed`);
if (fail.length) { orig(fail.join('\n')); process.exit(1); }
