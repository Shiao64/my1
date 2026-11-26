// 改动手续费 (Shiao, 2026-11-26): 「报名还没有确认的，还没有缴费的，更改不用扣手续费；已经报名确认，缴费的，要扣 ¥50」.
// 修改报名 before any money (待审核, 候补, 已确认, 到场付款 not yet paid) is free; once money was received (paid, or paid in
// part) the first change carries ¥50, once per registration, and a later cancellation keeps only that one ¥50. The update
// letter names the fee only when the total holds it; the rules (letters, and rule 3 now shown on the form) say so in five
// languages.
// Run: node social-worker/test/reg-change-fee.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-change-fee';
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

// a ¥700 pass (周末 4 场) in the state asked for, with what was paid
let n = 0;
async function make(state, paid = 0) {
  const email = `fee${++n}@example.test`, tok = subscriber(email, 'Fee');
  const d = await call('POST', '/reg', form(), tok);
  const id = dbRow(db.prepare('SELECT id FROM reg WHERE code=?').get(d.code).id).id;
  if (state === 'waitlist') await act({ id, action: 'waitlist', silent: 1 });
  if (['confirmed', 'cash', 'paid'].includes(state)) await act({ id, action: 'confirm', silent: 1 });
  if (state === 'cash') await act({ id, action: 'cash', silent: 1 });
  if (paid) await act({ id, action: 'pay', silent: 1, pay: { amount: paid, method: 'alipay' } });
  take();
  return { id, code: d.code, email, tok };
}
const PLUS = form({ people: [person({ items: ['tour'] })] });   // pass + 一日游 ¥450 = ¥1,150
const FEE = 'The ¥50 handling fee is included in the total.';
async function modify(x, data) { const d = await act({ id: x.id, action: 'modify', data }); const ms = take(); return { d, to: mine(ms, x.email), ms }; }

// --- 1. before any money: free
let x = await make('pending');
let c = await modify(x, PLUS);
check('待审核, changed by the 总管: no fee', c.d.ok && c.d.amount === 1150 && dbRow(x.id).fee === 0, c.d);
let d = await call('POST', '/reg', form({ people: [person({ items: ['walk'] })] }), x.tok);
check('待审核, changed by the registrant: no fee', d.ok && d.updated && d.total === 1100, d);

x = await make('waitlist'); c = await modify(x, PLUS);
check('候补: no fee', c.d.ok && c.d.amount === 1150 && dbRow(x.id).fee === 0, c.d);

x = await make('confirmed'); c = await modify(x, PLUS);
check('已确认, not paid yet: no fee', c.d.ok && c.d.status === 'confirmed' && c.d.amount === 1150 && dbRow(x.id).fee === 0, c.d);
check('已确认, not paid yet: the update letter says nothing about a fee', c.to.length === 1 && c.to[0].body.includes(`Your registration ${x.code} has been updated.`) && !c.to[0].body.includes(FEE) && !/Fee — /.test(c.to[0].body), c.to.map(m => m.body));
check('the organizers\' copy says nothing about a fee either', c.ms.some(m => m.to === BOSS && /\[副本/.test(m.subject) && !m.body.includes(FEE)), c.ms.map(m => m.to + ' ' + m.subject));

x = await make('cash'); c = await modify(x, PLUS);
check('到场付款, nothing paid yet: no fee', c.d.ok && c.d.status === 'cash' && c.d.amount === 1150 && dbRow(x.id).fee === 0, c.d);

// --- 2. once money was received: ¥50, once
x = await make('confirmed', 300); c = await modify(x, PLUS);
check('已确认 with ¥300 paid (part): ¥50', c.d.ok && c.d.amount === 1200 && dbRow(x.id).fee === 50, c.d);
check('part paid: the update letter names the fee', c.to.length === 1 && c.to[0].body.includes(FEE) && /Fee — ¥50/.test(c.to[0].body), c.to.map(m => m.body));

const p = await make('paid', 700);
check('the paid one is paid', dbRow(p.id).status === 'paid');
c = await modify(p, PLUS);
check('已付款 raised: ¥50 (first change after payment), 到场付款 for the rest', c.d.ok && c.d.amount === 1200 && c.d.status === 'cash' && (await me(p.tok)).reg.rest === 500, c.d);
check('已付款: the update letter names the fee', c.to.length === 1 && c.to[0].body.includes(FEE), c.to.map(m => m.body));
c = await modify(p, form());
check('a second change: the fee is not charged again', c.d.ok && c.d.amount === 750 && dbRow(p.id).fee === 50, c.d);

const q = await make('paid', 700);
c = await modify(q, form({ people: [person({ pkg: 'single', items: ['sat-eve'] })] }));   // 周六晚会 ¥200
check('已付款 lowered: ¥200 + ¥50 = ¥250, still paid, ¥450 to refund (退还多付)', c.d.ok && c.d.amount === 250 && c.d.status === 'paid' && (await me(q.tok)).reg.over === 450, c.d);
d = await act({ id: q.id, action: 'cancel', silent: 1 });
check('then cancelled before 6/11: ¥50 kept once, ¥650 back', d.ok && d.refund === 650, d);

// --- 3. the letters' rules and the update letter, five languages
const RULE = {
  en: 'Changes, additions and cancellations after payment: ¥50 handling fee, charged once per registration; before payment they are free.',
  zh: '付款后改动、增加或取消，每份报名收一次手续费 ¥50；付款前改动、取消都不收。',
  ko: '결제 후 변경·추가·취소 시 신청 건당 ¥50 수수료가 한 번 부과되며, 결제 전에는 수수료가 없습니다.',
  es: 'Cambios, añadidos y cancelaciones después de pagar: cargo de ¥50, una sola vez por inscripción; antes de pagar no tienen cargo.',
  ru: 'Изменения, добавления и отмена после оплаты: сбор ¥50, один раз за регистрацию; до оплаты — бесплатно.' };
const OLD = { en: 'Changes, additions and cancellations: ¥50', zh: '报名后改动、增加、取消，每份报名收一次', ko: '신청 후 변경·추가·취소 시 신청 건당 ¥50 수수료가 한 번 부과됩니다.', es: 'Cambios, añadidos y cancelaciones: cargo', ru: 'Изменения, добавления и отмена: сбор' };
const UPD = { en: 'Your registration BJ27-0099 has been updated.', zh: '你的报名 BJ27-0099 已更新。', ko: '신청 BJ27-0099이(가) 변경되었습니다.', es: 'Tu inscripción BJ27-0099 ha sido actualizada.', ru: 'Ваша регистрация BJ27-0099 изменена.' };
const WITH = { en: FEE, zh: '合计已含手续费 ¥50。', ko: '합계에 수수료 ¥50이 포함되어 있습니다.', es: 'El total incluye el cargo de ¥50.', ru: 'В итог включён сбор ¥50.' };
const lreg = (lang, o = {}) => ({ code: 'BJ27-0099', amount: 700, due_at: '2027-01-19T04:00:00.000Z', status: 'confirmed', lang, domestic: 0, fee: 0,
  data: { people: [{ name: 'Amy Lee', amount: 700, pkg: 'pass', extra: [], items: [] }], rooms: [], hotel: false }, ...o });
for (const lang of Object.keys(RULE)) {
  for (const kind of ['conf', 'upd']) {
    const m = R.letter(kind, lreg(lang), env, null, ['intl-alipay', 'intl-wechat']);
    check(`${lang} ${kind}: the rule says before payment is free`, m.text.includes(RULE[lang]) && m.html.includes(RULE[lang]) && !m.text.includes(OLD[lang]), m.text);
  }
  const free = R.letter('upd', lreg(lang), env, null, ['intl-alipay', 'intl-wechat']).text;
  check(`${lang} upd, no fee: updated, no fee sentence`, free.includes(UPD[lang]) && !free.includes(WITH[lang]), free);
  const paid = R.letter('upd', lreg(lang, { fee: 50, amount: 750 }), env, null, ['intl-alipay', 'intl-wechat']).text;
  check(`${lang} upd, fee charged: the fee sentence`, paid.includes(WITH[lang]), paid);
}

// --- 4. the registration form: rule 3 says it, five languages, and the list shows it (between rules 2 and 4)
const FORM = {
  zh: '付款后改动、增加或取消，每份报名收一次手续费 ¥50；付款前改动、取消都不收。',
  en: 'After payment, changes, additions and cancellations carry a ¥50 handling fee, once per registration; before payment they are free.',
  ko: '결제 후 변경·추가·취소 시 신청 건당 ¥50 수수료가 한 번 부과되며, 결제 전에는 수수료가 없습니다.',
  es: 'Después de pagar, los cambios, añadidos y cancelaciones tienen un cargo de ¥50, una sola vez por inscripción; antes de pagar no tienen cargo.',
  ru: 'После оплаты изменения, добавления и отмена стоят ¥50, один раз за регистрацию; до оплаты — бесплатно.' };
const pages = ['register/index.html', 'register/draft/index.html'].map(f => path.join(root, 'event/beijing-2027-tango-weekend', f)).filter(f => fs.existsSync(f));
const page = pages.map(f => fs.readFileSync(f, 'utf8')).find(s => s.includes("r4:'")) || '';
const lines = page.split('\n');
for (const lang of Object.keys(FORM)) {
  const i = lines.findIndex(l => l.startsWith(lang + ':{')), block = i < 0 ? '' : lines.slice(i, i + 12).join('\n');
  check(`form ${lang}: rule 3 says before payment is free`, ((/r3:'((?:[^'\\]|\\.)*)'/.exec(block) || [])[1] || '') === FORM[lang], block.slice(0, 80));
}
const at = k => page.indexOf(`<li data-t="${k}">`);
check('form: the list shows rule 3, between rules 2 and 4', at('r2') > 0 && at('r2') < at('r3') && at('r3') < at('r4'), [at('r2'), at('r3'), at('r4')]);

orig(`reg-change-fee: ${passed} passed, ${fail.length} failed`);
if (fail.length) { orig(fail.join('\n')); process.exit(1); }
