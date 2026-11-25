// Platform step 4 (平台管理页 /tp/, spec v0.6, Shiao 2026-11-25): the 管理员 only; each event's seven steps and what is
// next; events made from an ATM card; 定案; 测试 → 正式 only with the five checks; 北京 moving in as it is; new days
// checked against 一人多场; payment QR codes per event.
// Run: node social-worker/test/reg-platform.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-platform';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'inmail.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
// the site: which event pages are up (the worker looks with a HEAD request)
const PAGES = new Set(['/event/beijing-2027-tango-weekend/', '/event/yearend-2027/']);
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { const url = new URL(typeof u === 'string' ? u : u.url); if (url.hostname === 'tangoweekend.org') return new Response(null, { status: PAGES.has(url.pathname) ? 200 : 404 }); return realFetch(u, o); };

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql', '0025_no_site_manager.sql', '0026_reg_mailto.sql', '0027_reg_event.sql', '0028_reg_person.sql'])
  db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
const D1 = d => ({
  async batch(list) { d.exec('BEGIN'); try { const out = list.map(x => x.run()); d.exec('COMMIT'); return out; } catch (e) { d.exec('ROLLBACK'); throw e; } },
  prepare(sql) { const st = d.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    async first(col) { const r = st.get(...args); return r ? (col ? r[col] ?? null : r) : null; },
    async all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } });
const ADMIN = 'a'.repeat(32);
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests',
  REG_CODES: JSON.stringify({ Alpha618: 'Chris Han', Beta618: 'Kostas' }) };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 700) : '')); };
const orig = console.log; console.log = (...a) => { const s = a.map(String).join(' '); if (!s.startsWith('[mail:log]') && !/^reg_event:/.test(s)) orig(...a); };
async function call(method, p, body, auth, e = env) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), e, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const tp = (p, body, auth = ADMIN, e) => call(body ? 'POST' : 'GET', '/admin/tp' + p, body, auth, e);
const ev = (d, id) => (d.events || []).find(x => x.id === id);
const PIN = '730195';
const keyOf = link => (/#([0-9a-f]{48})$/.exec(link || '') || [])[1];
const signIn = async (made, own = PIN) => (await call('POST', '/reg/login', { key: keyOf(made.link), pin: made.pin, new_pin: own })).token;

// --- only the 管理员
check('no password: 401', (await tp('', null, null))._s === 401);
const lin = await call('POST', '/admin/reg/staff', { name: '小林' }, ADMIN); const linTok = await signIn(lin, '615283');
d = await tp('', null, linTok); check('a team phone: 403 owner_only', d._s === 403 && d.error === 'owner_only', d);
var d = await tp('');
check('管理员: the list, 北京 in it from the code', d.ok && d.events.length === 1 && ev(d, 'bstw2027').in_platform === false && ev(d, 'bstw2027').adoptable === true && ev(d, 'bstw2027').card === 'E093', d);
let bj = ev(d, 'bstw2027');
check('北京 before moving in: ①②③ done, ④ waits for the 总管, mode from REG_LIVE (测试)', bj.steps.map(s => +s.done).join('') === '1110000' && bj.mode === 'test' && bj.mode_from === 'REG_LIVE' && bj.next === '下一步：④ 还没任命总管', bj);
check('北京 form, read only: sessions in its order, packages, rules; friend codes only counted', bj.form.items.map(x => x.code).join() === 'MV,T1,M1,M2,M3,M4,S1,T2,MF' && bj.form.pkgs.find(x => x.key === 'full').price === 1450 && bj.form.rules.fee === 50 && bj.form.rules.codes === 2 && !JSON.stringify(d).includes('Alpha618'), bj.form);
check('the five checks before 正式, each with its state', bj.gate.map(g => g.key + ':' + +g.ok).join() === 'page:1,form:1,qr:0,chief:0,practice:0' && bj.can_live === false, bj.gate);
check('totals and today', d.totals.pending === 0 && d.totals.overdue === 0 && d.today.mails === 0, [d.totals, d.today]);

// --- 北京 moves in (as it is)
d = await tp('/mode', { event: 'bstw2027', mode: 'live' }); check('no mode switch before moving in', d._s === 409 && d.error === 'not_in_platform', d);
d = await tp('/adopt', { event: 'bstw2027' }); check('搬进平台', d.ok && d.mode === 'test', d);
const row = db.prepare("SELECT * FROM reg_event WHERE id='bstw2027'").get();
check('its row: card, address, mode, form taken as 定案, nothing else', row.card === 'E093' && row.slug === 'beijing-2027-tango-weekend' && row.mode === 'test' && !!row.locked_at && row.config === '{}' && row.status === 'open', row);
check('1225 counts as its practice', /^migrated\|/.test(db.prepare("SELECT value FROM reg_setting WHERE event='bstw2027' AND key='practice_cleared'").get().value));
d = await tp('/adopt', { event: 'bstw2027' }); check('not twice', d._s === 409 && d.error === 'already', d);
d = await call('GET', '/reg/left?event=bstw2027'); check('北京 still itself after moving in (its seats)', d.left && d.left.S1 === 120, d);
d = await tp(''); bj = ev(d, 'bstw2027');
check('after moving in: ⑤ done, mode from the platform', bj.in_platform && bj.steps[4].done && bj.mode_from === 'platform' && !bj.adoptable, bj);

// --- 正式 needs all five
d = await tp('/mode', { event: 'bstw2027', mode: 'live' });
check('正式 refused, saying what is missing', d._s === 409 && d.error === 'not_ready' && d.gate.filter(g => !g.ok).map(g => g.key).join() === 'qr,chief', d);
await call('POST', '/admin/reg/asset', { event: 'bstw2027', name: 'intl-alipay', mime: 'image/png', b64: 'iVBORw0KGgo=' }, ADMIN);
const c = await call('POST', '/admin/reg/admins', { name: '刘峥', role: 'chief' }, ADMIN);
await call('POST', '/admin/reg/mailto', { event: 'bstw2027', chief: 'liu@example.com' }, ADMIN);
d = await tp(''); bj = ev(d, 'bstw2027');
check('总管 appointed, 总管邮箱 not verified yet: ④ says so', bj.next === '下一步：④ 总管邮箱还没验证' && bj.gate.find(g => g.key === 'qr').ok && !bj.gate.find(g => g.key === 'chief').ok, bj);
db.prepare("INSERT INTO reg_setting(event,key,value,updated_at) VALUES('bstw2027','chief_verified','liu@example.com|direct|2026-11-25T00:00:00Z',?) ON CONFLICT(event,key) DO UPDATE SET value=excluded.value").run(new Date().toISOString());
d = await tp(''); bj = ev(d, 'bstw2027');
check('all five: 正式 can be pressed (④ still waits for the 专属邮箱)', bj.can_live === true && bj.next === '下一步：④ 活动专属邮箱还没绑定', bj);
d = await tp('/mode', { event: 'bstw2027', mode: 'test' }); check('only 测试 → 正式', d._s === 400 && d.error === 'bad_mode', d);
d = await tp('/mode', { event: 'bstw2027', mode: 'live' }); check('切到正式', d.ok && d.mode === 'live' && db.prepare("SELECT mode FROM reg_event WHERE id='bstw2027'").get().mode === 'live', d);
d = await tp(''); check('正式 now, never back', ev(d, 'bstw2027').mode === 'live' && ev(d, 'bstw2027').can_live === false, ev(d, 'bstw2027'));

// --- 从 ATM 卡建立
const card = { card: 'E200', id: 'yearend2027', slug: 'yearend-2027', prefix: 'YE27', short: '跨年', sign: '刘峥\nMilonga V', name: { zh: '跨年 2027', en: 'New Year 2027' }, starts: '2027-12-31', ends: '2028-01-01', city: 'Beijing' };
for (const [k, v, why] of [['id', 'YE', 'id'], ['slug', 'Yearend 2027', 'slug'], ['prefix', 'year27x', 'prefix'], ['card', '', 'card'], ['starts', '2027-13-01', 'dates']])
  { d = await tp('/events', { ...card, [k]: v }); check('bad ' + k + ': refused', d._s === 400 && d.error === 'bad_field' && d.which === why, d); }
for (const [k, v] of [['id', 'bstw2027'], ['slug', 'beijing-2027-tango-weekend'], ['prefix', 'BJ27'], ['card', 'E093']])
  { d = await tp('/events', { ...card, [k]: v }); check('taken ' + k + ': refused', d._s === 409 && d.error === 'taken' && d.which === k, d); }
d = await tp('/events', card, linTok); check('a team phone cannot make one', d._s === 403);
d = await tp('/events', card); check('建立', d.ok && d.id === 'yearend2027', d);
const yrow = db.prepare("SELECT * FROM reg_event WHERE id='yearend2027'").get(), ycfg = JSON.parse(yrow.config);
check('its row: card, address, 测试, not open, the facts from the card, empty form', yrow.card === 'E200' && yrow.slug === 'yearend-2027' && yrow.mode === 'test' && yrow.status === 'prep' && !yrow.locked_at
  && ycfg.prefix === 'YE27' && ycfg.name.zh === '跨年 2027' && ycfg.starts === '2027-12-31' && ycfg.letters.zh.sign === '刘峥\nMilonga V' && ycfg.short.zh === '跨年' && Object.keys(ycfg.items).length === 0, yrow);
d = await tp(''); let ye = ev(d, 'yearend2027');
check('new event: ①② done (its page is up), next ③ the form is not filled', ye.steps.map(s => +s.done).join('') === '1100000' && ye.next === '下一步：③ 报名表还没填（场次、套餐）' && ye.mode === 'test' && ye.short === '跨年', ye);
check('...and its 实习 cannot be done before step 5', ye.steps[4].text === '还没实习（第 5 步做好后才能实习）' && !ye.gate.find(g => g.key === 'practice').ok, ye.steps);
d = await call('GET', '/reg/door/me?event=yearend2027', null, ADMIN); check('the shared pages know it at once', d.ok && d.event_info.name === '跨年 2027' && d.event_info.short === '跨年', d.event_info);

// --- 定案
d = await tp('/lock', { event: 'yearend2027' }); check('定案 needs a form', d._s === 409 && d.error === 'no_form', d);
db.prepare('UPDATE reg_event SET config=? WHERE id=?').run(JSON.stringify({ ...ycfg, items: { N1: { key: 'eve', price: 300, cap: 2 } }, pkgs: { all: { price: 300, covers: ['N1'] } }, names: { zh: { N1: '跨年舞会', all: '全程' } } }), 'yearend2027');
PAGES.delete('/event/yearend-2027/');
d = await tp('/lock', { event: 'yearend2027' }); check('定案 needs its page up', d._s === 409 && d.error === 'no_page', d);
PAGES.add('/event/yearend-2027/');
d = await tp('/lock', { event: 'yearend2027' }); check('定案', d.ok && d.locked_at, d);
d = await tp('/lock', { event: 'yearend2027' }); check('not twice', d._s === 409 && d.error === 'locked', d);
d = await tp(''); ye = ev(d, 'yearend2027');
check('③ done; the form shows its own names', ye.steps[2].done && ye.form.items[0].name === '跨年舞会' && ye.form.items[0].cap === 2 && ye.form.pkgs[0].name === '全程', ye.form);
d = await tp('/mode', { event: 'yearend2027', mode: 'live' }); check('new event: 正式 refused without practice, QR, 总管', d._s === 409 && d.gate.filter(g => !g.ok).map(g => g.key).join() === 'qr,chief,practice', d);

// --- payment QR per event
await call('POST', '/admin/reg/asset?event=yearend2027', { name: 'intl-wechat', mime: 'image/png', b64: 'iVBORw0KGgo=' }, ADMIN);
check('its own name', !!db.prepare("SELECT 1 FROM reg_asset WHERE name='yearend2027-intl-wechat'").get() && !db.prepare("SELECT 1 FROM reg_asset WHERE name='intl-wechat'").get());
d = await tp(''); check('QR counted per event', ev(d, 'yearend2027').qr.join() === 'yearend2027-intl-wechat' && ev(d, 'bstw2027').qr.join() === 'intl-alipay', [ev(d, 'yearend2027').qr, ev(d, 'bstw2027').qr]);

// --- new days from the card: nobody may end up at two events at once
await call('POST', '/admin/reg/staff', { event: 'bstw2027', name: '阿凯', email: 'kai@example.com' }, ADMIN);
d = await call('POST', '/admin/reg/staff', { event: 'yearend2027', name: '阿凯', email: 'kai@example.com' }, ADMIN); check('阿凯 in both (days apart)', d.ok && d.same_person, d);
d = await tp('/card', { event: 'yearend2027', name: { zh: '跨年 2027', en: 'New Year 2027' }, starts: '2027-06-20', ends: '2027-06-21' });
check('days moved onto 北京\'s: refused, saying who and where', d._s === 409 && d.error === 'same_time_people' && d.people.length === 1 && d.people[0].name === '阿凯' && d.people[0].event_name === '北京精选探戈周末 2027', d);
d = await tp('/card', { event: 'yearend2027', name: { zh: '跨年 2027（改）', en: 'New Year 2027' }, starts: '2027-12-30', ends: '2028-01-01', city: 'Beijing' });
check('other days: updated', d.ok && JSON.parse(db.prepare("SELECT config FROM reg_event WHERE id='yearend2027'").get().config).starts === '2027-12-30', d);
d = await tp(''); check('...and shown', ev(d, 'yearend2027').name === '跨年 2027（改）' && ev(d, 'yearend2027').starts === '2027-12-30');

// --- the numbers
const ins = (event, code, status, extra = '') => db.prepare(`INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at${extra ? ',due_at' : ''}) VALUES(?,?,'a@example.com','en',?,2,'{"people":[]}',300,?,?${extra ? ',?' : ''})`).run(event, code, status, new Date().toISOString(), new Date().toISOString(), ...(extra ? [extra] : []));
ins('yearend2027', 'YE27-0001', 'pending'); ins('yearend2027', 'YE27-0002', 'confirmed', '2020-01-01T00:00:00Z'); ins('yearend2027', 'YE27-0003', 'paid');
const rid = db.prepare("SELECT id FROM reg WHERE code='YE27-0003'").get().id;
db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)").run(rid, new Date().toISOString(), 'mail_failed:paid', 'x');
db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)").run(rid, new Date().toISOString(), 'mail:recv', '');
db.prepare("INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)").run(rid, new Date().toISOString(), 'copy:recv', 'chief,copy,admin');
d = await tp(''); ye = ev(d, 'yearend2027');
check('per event: total, people, pending, overdue, paid, mail failed', ye.counts.total === 3 && ye.counts.people === 4 && ye.counts.pending === 1 && ye.overdue === 1 && ye.counts.paid === 1 && ye.mail_failed === 1, [ye.counts, ye.overdue, ye.mail_failed]);
check('totals across events, today\'s letters', d.totals.pending === 1 && d.totals.overdue === 1 && d.totals.mail_failed === 1 && d.today.mails === 4, [d.totals, d.today]);

// --- before migration 0027: the list says not ready, nothing breaks
const old = new DatabaseSync(':memory:');
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql']) old.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
const oenv = { ...env, SDB: D1(old), DB: D1(old) };
d = await tp('', null, ADMIN, oenv); check('old database: 北京 listed from the code', d.ok && d.events.length === 1 && d.events[0].id === 'bstw2027' && d.events[0].adoptable, d);
d = await tp('/adopt', { event: 'bstw2027' }, ADMIN, oenv); check('old database: moving in waits for the migration', d._s === 503 && d.error === 'not_ready', d);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-platform tests passed:', passed);
