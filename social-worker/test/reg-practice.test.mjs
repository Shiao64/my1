// Platform step 5 (实习, Drive 《TP 实习方案（v2）》, spec v0.6, Shiao 2026-11-24/25): 测试 → 实习 → 结束实习并清空 → 正式.
// Practice registrations only with the link's code, P numbers, 5 per person and a cap in all, letters straight and
// marked [实习] with no real payment QR; clearing deletes only practice/test data, thanks the helpers, tells the organizers.
// Run: node social-worker/test/reg-practice.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-practice';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'inmail.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social, regInboundMail } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);
const PAGES = new Set(['/event/beijing-2027-tango-weekend/', '/event/yearend-2027/']);
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { const url = new URL(typeof u === 'string' ? u : u.url); if (url.hostname === 'tangoweekend.org') return new Response(null, { status: PAGES.has(url.pathname) ? 200 : 404 }); return realFetch(u, o); };

const MIGS = ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql', '0025_no_site_manager.sql', '0026_reg_mailto.sql', '0027_reg_event.sql', '0028_reg_person.sql'];
function database(stage) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
    verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
  CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
  for (const f of [...MIGS, ...(stage ? ['0029_reg_stage.sql'] : [])]) db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
  return db;
}
const D1 = d => ({
  async batch(list) { d.exec('BEGIN'); try { const out = list.map(x => x.run()); d.exec('COMMIT'); return out; } catch (e) { d.exec('ROLLBACK'); throw e; } },
  prepare(sql) { const st = d.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    async first(col) { const r = st.get(...args); return r ? (col ? r[col] ?? null : r) : null; },
    async all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } });
const db = database(true);
const ADMIN = 'a'.repeat(32), EVM = 'yearend2027@tangoweekend.org', CHIEF = 'liu@example.org', INBOX = 'selecttango@gmail.com';
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests', REG_CODES: '{}' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 700) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(parse(s)); else if (!/^reg_event:|^tp inbound/.test(s)) orig(...a); };
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
const tp = (p, body, e) => call(body ? 'POST' : 'GET', '/admin/tp' + p, body, ADMIN, e);
const ev = (d, id) => (d.events || []).find(x => x.id === id);
function subscriber(email, name, e = db) {
  const r = e.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, 'en', '2026-11-01', '2026-11-01');
  const tok = crypto.randomBytes(32).toString('hex');
  e.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), '2026-11-01');
  return tok;
}
const form = (o = {}) => ({ event: 'yearend2027', lang: 'en', hotel: 'no', people: [{ name: 'Practice A', country: 'KR', city: 'Seoul', role: 'leader', pkg: 'all', items: [] }], ...o });
const setting = (k, v) => db.prepare("INSERT INTO reg_setting(event,key,value,updated_at) VALUES('yearend2027',?,?,?) ON CONFLICT(event,key) DO UPDATE SET value=excluded.value").run(k, v, new Date().toISOString());
const enc = s => '=?UTF-8?B?' + Buffer.from(s).toString('base64') + '?=';
function inbound({ from, to = EVM, subject, text = 'Hello' }) {
  const b = 'b' + crypto.randomBytes(4).toString('hex');
  const raw = [`From: ${from}`, `To: ${to}`, `Subject: ${enc(subject)}`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${b}"`, '', `--${b}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(text).toString('base64'), `--${b}--`, ''].join('\r\n');
  const headers = new Headers({ from, to, subject: enc(subject), 'authentication-results': 'mx.cloudflare.net; dkim=pass header.d=example.org; spf=pass; dmarc=pass' });
  return { to, from, headers, raw, rawSize: raw.length };
}

// --- an event from its card, its form, page, 定案, 总管 verified, 专属邮箱 bound
let d = await tp('/events', { card: 'E200', id: 'yearend2027', slug: 'yearend-2027', prefix: 'YE27', short: '跨年', sign: '刘峥', name: { zh: '跨年 2027', en: 'New Year 2027' }, starts: '2027-12-31', ends: '2028-01-01' });
check('setup: event made', d.ok, d);
const cfg = JSON.parse(db.prepare("SELECT config FROM reg_event WHERE id='yearend2027'").get().config);
db.prepare("UPDATE reg_event SET config=? WHERE id='yearend2027'").run(JSON.stringify({ ...cfg, items: { N1: { key: 'eve', price: 300, cap: 50 } }, pkgs: { all: { price: 300, covers: ['N1'] }, single: { price: 0, covers: [] } }, names: { zh: { N1: '跨年舞会', all: '全程', single: '单场' }, en: { N1: 'NYE milonga', all: 'All', single: 'Single' } } }));
const tester = subscriber('tess@qq.com', 'Tess');
d = await call('POST', '/reg', form({ people: [{ name: 'Test T', country: 'KR', city: 'Seoul', role: 'leader', pkg: 'all', items: [] }] }), tester);
check('测试 mode: a registration, marked test, its normal number', d.ok && d.code === 'YE27-0001' && db.prepare("SELECT stage FROM reg WHERE code='YE27-0001'").get().stage === 'test', d);
d = await tp('/mode', { event: 'yearend2027', mode: 'practice' });
check('实习 refused before ①–④, saying what is missing', d._s === 409 && d.error === 'not_ready' && d.gate.filter(g => !g.ok).map(g => g.key).join() === 'form,chief,event_mail', d);
d = await tp('/lock', { event: 'yearend2027' }); check('定案', d.ok, d);
await call('POST', '/admin/reg/admins', { event: 'yearend2027', name: '刘峥', role: 'chief' }, ADMIN);
await call('POST', '/admin/reg/mailto', { event: 'yearend2027', chief: CHIEF }, ADMIN);
setting('chief_verified', CHIEF + '|direct|2026-11-25T00:00:00Z'); setting('event_mail', EVM); setting('event_mail_ok', EVM + '|2026-11-25T00:00:00Z');
await call('POST', '/admin/reg/asset?event=yearend2027', { name: 'intl-alipay', mime: 'image/png', b64: 'iVBORw0KGgo=' }, ADMIN);
take();

// --- 清空测试资料 (in 测试): preview, thank only the 测试名单, delete only marked
setting('test_list', 'tess@qq.com');
d = await tp('/clear', { event: 'yearend2027' });
check('test clear preview: what goes, who is thanked', d.ok && d.preview && d.what === 'test' && d.counts.regs === 1 && d.thank.map(x => x.email + ':' + x.codes.join()).join() === 'tess@qq.com:YE27-0001', d);
db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at) VALUES('bstw2027','BJ27-0777','real@example.org','en','paid',1,'{\"people\":[]}',100,?,?)").run(new Date().toISOString(), new Date().toISOString());
d = await tp('/clear', { event: 'yearend2027', confirm: true, thank: [] });
check('test clear: deleted, nobody thanked when unticked, still 测试', d.ok && d.cleared.regs === 1 && d.thanked === 0 && d.mode === 'test' && !db.prepare("SELECT 1 FROM reg WHERE event='yearend2027'").get(), d);
check('...a real registration elsewhere untouched', !!db.prepare("SELECT 1 FROM reg WHERE code='BJ27-0777'").get());
ms = take(); check('...the organizers told, marked [测试]', ms.some(m => m.to === CHIEF && m.subject === '[测试] 测试资料已清空：跨年 2027' && m.body.includes('1 笔报名')) && !ms.some(m => /谢谢帮忙/.test(m.subject)), ms.map(m => m.to + ' | ' + m.subject));
var ms;
d = await tp(''); check('⑤ not done by clearing test data', !ev(d, 'yearend2027').steps[4].done && ev(d, 'yearend2027').can_practice === true, ev(d, 'yearend2027').steps);

// --- 测试 → 实习
d = await tp('/mode', { event: 'yearend2027', mode: 'practice', cap: 6 });
check('切到实习: a code, the link, the cap', d.ok && d.mode === 'practice' && /^[A-HJ-NP-Z2-9]{6}$/.test(d.code) && d.link === 'https://tangoweekend.org/event/yearend-2027/register/?practice=' + d.code && d.cap === 6, d);
const CODE = d.code;
ms = take();
const plan = ms.find(m => m.to === CHIEF);
check('the practice plan to the organizers, [实习], with the link and the 10 cases', plan && plan.subject === '[实习] 实习开始：跨年 2027' && plan.body.includes(d.link) && plan.body.includes('10 备用') && plan.body.includes('结束实习并清空') && ms.some(m => m.to === INBOX), ms.map(m => m.to + ' | ' + m.subject));
d = await tp('/mode', { event: 'yearend2027', mode: 'live' }); check('实习 never straight to 正式', d._s === 409 && d.error === 'practising', d);
d = await tp(''); let e = ev(d, 'yearend2027');
check('platform: 实习, ⑤ says so, the link and count', e.mode === 'practice' && e.steps[4].text.startsWith('实习中') && e.practice.code === CODE && e.practice.cap === 6 && e.practice.count === 0 && e.can_clear && !e.can_live, e);
d = await call('GET', '/admin/reg/me?event=yearend2027', null, ADMIN); check('the admin page knows (yellow banner)', d.event_info.mode === 'practice', d.event_info);
d = await tp('/practice', { event: 'yearend2027', cap: 3 }); check('cap below 5 refused', d._s === 400, d);
d = await tp('/practice', { event: 'yearend2027', cap: 31 }); check('cap above 30 refused', d._s === 400, d);

// --- practice registrations
const amy = subscriber('amy@163.com', 'Amy'), bob = subscriber('bob@example.com', 'Bob'), cat = subscriber('cat@gmail.com', 'Cat');
d = await call('POST', '/reg', form(), amy); check('no code: 即将开放', d._s === 403 && d.error === 'not_open' && d.practice, d);
d = await call('POST', '/reg', form({ practice: 'ZZZZZZ' }), amy); check('a wrong code: the same', d._s === 403 && d.error === 'not_open', d);
d = await call('POST', '/reg', form({ practice: CODE }), amy);
check('with the code: a P number, marked practice', d.ok && d.code === 'YE27P-0001' && db.prepare("SELECT stage FROM reg WHERE code='YE27P-0001'").get().stage === 'practice', d);
ms = take();
check('her letter straight to her, [实习]', ms.some(m => m.to === 'amy@163.com' && m.subject === '[实习] Registration received · YE27P-0001'), ms.map(m => m.to + ' | ' + m.subject));
check('copies and the notice: [实习], the event\'s short name', ms.some(m => m.to === CHIEF && m.subject === '[实习] [副本 #' + m.subject.split('#')[1]) && ms.some(m => m.to === CHIEF && m.subject === '[实习] [跨年] 新报名 YE27P-0001'), ms.map(m => m.to + ' | ' + m.subject));
d = await call('POST', '/reg', form({ practice: CODE, people: [{ name: 'Practice A2', country: 'KR', city: 'Seoul', role: 'leader', pkg: 'all', items: [] }] }), amy);
check('again without 「再报一笔」: the same one updated', d.ok && d.code === 'YE27P-0001' && d.updated, d);
for (let i = 2; i <= 5; i++) { d = await call('POST', '/reg', form({ practice: CODE, another: true }), amy); check('再报一笔 #' + i, d.ok && d.code === 'YE27P-000' + i, d); }
d = await call('POST', '/reg', form({ practice: CODE, another: true }), amy); check('a sixth: 5 per person', d._s === 409 && d.error === 'practice_mine_full' && d.max === 5, d);
d = await call('POST', '/reg', form({ practice: CODE }), bob); check('Bob: YE27P-0006', d.ok && d.code === 'YE27P-0006', d);
d = await call('POST', '/reg', form({ practice: CODE }), cat); check('the cap in all (6): Cat refused', d._s === 409 && d.error === 'practice_full' && d.cap === 6, d);
d = await tp('/practice', { event: 'yearend2027', cap: 7 }); check('cap raised', d.ok && d.cap === 7, d);
d = await call('POST', '/reg', form({ practice: CODE }), cat); check('...Cat in', d.ok && d.code === 'YE27P-0007', d);
take();
d = await call('GET', '/reg/me?event=yearend2027', null, amy);
check('my practice registrations: 5 of 5, each its number', d.practice && d.practice.mine === 5 && d.practice.max === 5 && d.regs.map(x => x.code).join() === 'YE27P-0001,YE27P-0002,YE27P-0003,YE27P-0004,YE27P-0005' && d.reg.code === 'YE27P-0005', d);

// handled on the usual admin page: confirm (no real payment QR), pay, check in
const idOf = code => db.prepare('SELECT id FROM reg WHERE code=?').get(code).id;
d = await call('POST', '/admin/reg/act', { event: 'yearend2027', id: idOf('YE27P-0001'), action: 'confirm' }, ADMIN); check('confirm', d.ok, d);
ms = take(); const conf = ms.find(m => m.to === 'amy@163.com');
check('confirmation: [实习], do not pay, no payment QR', conf && conf.subject === '[实习] Registration confirmed · YE27P-0001' && conf.body.includes('Practice: please do not pay') && !conf.body.includes('/reg/qr/') && !conf.body.includes('using the payment QR code'), conf);
d = await call('GET', '/reg/me?event=yearend2027', null, amy); check('the page gets no payment QR either', d.regs[0].status === 'confirmed' && d.regs[0].pay.length === 0, d.regs[0]);
d = await call('POST', '/admin/reg/act', { event: 'yearend2027', id: idOf('YE27P-0001'), action: 'pay', pay: { method: 'alipay' } }, ADMIN); check('pay (practice)', d.ok, d);
const pass = await R.passFor(env, 'YE27P-0001', 0);
d = await call('POST', '/reg/door/checkin', { p: pass, item: 'N1', event: 'yearend2027' }, ADMIN); check('check-in with a practice entry code', d.ok, d);
take();
// a reply to a practice letter reaches the organizers (P numbers known)
d = await regInboundMail(inbound({ from: 'Amy <amy@163.com>', subject: 'Re: [实习] Registration confirmed · YE27P-0001', text: 'Screenshot attached.' }), env); ms = take();
check('her reply: to the organizers, with her P number', d === true && ms.some(m => m.to === CHIEF && m.subject.includes('YE27P-0001') && m.body.includes('Screenshot attached.')), ms.map(m => m.to + ' | ' + m.subject));

// --- 结束实习并清空
d = await tp('/clear', { event: 'yearend2027' });
check('preview: what goes', d.ok && d.preview && d.what === 'practice' && d.counts.regs === 7 && d.counts.people === 7 && d.counts.payments === 1 && d.counts.checkins === 1 && d.counts.records > 0 && d.counts.mails > 0, d.counts);
check('preview: thanked once per address with their numbers; fake addresses left out', d.thank.map(x => x.email + ':' + x.codes.length).join() === 'amy@163.com:5,cat@gmail.com:1' && d.skipped.join() === 'bob@example.com', d);
check('nothing deleted by a preview', db.prepare("SELECT COUNT(*) n FROM reg WHERE event='yearend2027'").get().n === 7);
d = await tp('/clear', { event: 'yearend2027', confirm: true, thank: ['amy@163.com', 'nobody@else.org'] });
check('cleared: all of it, thanked the one ticked (no one else), back to 测试', d.ok && d.cleared.regs === 7 && d.cleared.payments === 1 && d.cleared.checkins === 1 && d.thanked === 1 && d.mode === 'test', d);
check('...nothing of the event left; 北京 untouched', db.prepare("SELECT COUNT(*) n FROM reg WHERE event='yearend2027'").get().n === 0 && db.prepare("SELECT COUNT(*) n FROM reg_checkin").get().n === 0 && !!db.prepare("SELECT 1 FROM reg WHERE code='BJ27-0777'").get());
ms = take();
const ty = ms.find(m => m.to === 'amy@163.com');
check('thank-you: zh and en, her numbers, void, replies to the 专属邮箱', ty && ty.subject.includes('实习完成，谢谢帮忙') && ty.body.includes('YE27P-0001、YE27P-0002') && ty.body.includes('请不要拿来入场') && ty.body.includes('Thank you for helping') && ty.from === 'New Year 2027' && !ms.some(m => m.to === 'cat@gmail.com' || m.to === 'nobody@else.org'), ty);
check('the organizers\' summary: [实习], the numbers, ready for 正式', ms.some(m => m.to === CHIEF && m.subject === '[实习] 实习资料已清空：跨年 2027' && m.body.includes('7 笔报名') && m.body.includes('寄了 1 封感谢信') && m.body.includes('可以切正式')), ms.map(m => m.to + ' | ' + m.subject));
d = await call('POST', '/reg', form({ practice: CODE }), cat); check('the link stops working: 实习已结束', d._s === 403 && d.error === 'practice_over', d);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(pass), null, ADMIN); check('the practice entry code stops working', d._s === 404, d);
d = await tp(''); e = ev(d, 'yearend2027');
check('⑤ done, 测试 again, no practice link, 正式 can be pressed', e.steps[4].done && e.mode === 'test' && !e.practice && e.gate.find(g => g.key === 'practice').ok && e.can_live, e);
const late = subscriber('late@qq.com', 'Late');
d = await call('POST', '/reg', form(), late); check('a test registration after clearing', d.ok && db.prepare('SELECT stage FROM reg WHERE code=?').get(d.code).stage === 'test', d);
d = await tp(''); e = ev(d, 'yearend2027');
check('正式 blocked again until that is cleared too, saying why', !e.can_live && e.gate.find(g => g.key === 'practice').text.includes('1 笔测试报名'), e.gate);
d = await tp('/mode', { event: 'yearend2027', mode: 'live' }); check('...refused', d._s === 409 && d.error === 'not_ready', d);
d = await tp('/clear', { event: 'yearend2027', confirm: true, thank: [] }); check('清空测试资料', d.ok && d.what === 'test' && d.cleared.regs === 1 && d.mode === 'test', d);
take();
d = await tp('/mode', { event: 'yearend2027', mode: 'live' }); check('正式', d.ok, d);
d = await call('POST', '/reg', form(), cat); check('正式: anyone, the first real number is 0001, not marked', d.ok && d.code === 'YE27-0001' && db.prepare("SELECT stage FROM reg WHERE code='YE27-0001'").get().stage === null, d);
ms = take(); check('正式: letters straight, no mark', ms.some(m => m.to === 'cat@gmail.com' && m.subject === 'Registration received · YE27-0001'), ms.map(m => m.to + ' | ' + m.subject));
d = await tp('/mode', { event: 'yearend2027', mode: 'practice' }); check('正式期间不开实习', d._s === 409 && d.error === 'live', d);
d = await tp('/clear', { event: 'yearend2027' }); check('nothing to clear in 正式', d._s === 409 && d.error === 'live', d);

// --- before migration 0029: no 实习, test registrations still work (unmarked)
const old = database(false), oenv = { ...env, SDB: D1(old), DB: D1(old) };
await call('POST', '/admin/tp/events', { card: 'E201', id: 'oldev2027', slug: 'yearend-2027', prefix: 'OL27', name: { zh: '旧', en: 'Old' }, starts: '2027-12-31' }, ADMIN, oenv);
old.prepare("UPDATE reg_event SET config=? WHERE id='oldev2027'").run(JSON.stringify({ prefix: 'OL27', name: { zh: '旧', en: 'Old' }, starts: '2027-12-31', ends: '2027-12-31', items: { N1: { key: 'eve', price: 300, cap: null } }, pkgs: { all: { price: 300, covers: ['N1'] } } }));
const otok = subscriber('ola@example.org', 'Ola', old);
d = await call('POST', '/reg', { ...form(), event: 'oldev2027' }, otok, oenv); check('old database: a test registration still works', d.ok && d.code === 'OL27-0001', d);
d = await call('POST', '/admin/tp/mode', { event: 'oldev2027', mode: 'practice' }, ADMIN, oenv); check('old database: no 实习 until the migration', d._s === 503 && d.error === 'not_ready', d);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-practice tests passed:', passed);
