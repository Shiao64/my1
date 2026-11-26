// Platform stage 1 (spec v0.6): an event's settings from reg_event (migration 0027), 北京 unchanged without a row.
// A second event here has its own items, prices, names, letter wording, sender, pages, rules and test/live mode.
// Run: node social-worker/test/reg-event.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-event';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'inmail.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social, regCron } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
const mig = f => db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql', '0025_no_site_manager.sql', '0026_reg_mailto.sql']) mig(f);
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
const ADMIN = 'a'.repeat(32), INBOX = 'selecttango@gmail.com';
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests',
  REG_CODES: JSON.stringify({ Alpha618: 'Chris Han' }) };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 600) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(parse(s)); else if (!/^reg_event:/.test(s)) orig(...a); };
function parse(s) {
  const m = /^\[mail:log\] from=(.*?) to=(\S+)( cc=\S+)?( reply-to=\S+)? subject=([^\n]*?)( \{[^\n]*\})?\n([\s\S]*)$/.exec(s);
  return m ? { from: m[1], to: m[2], subject: m[5], body: m[7] } : { raw: s, subject: '', body: '' };
}
const take = () => mails.splice(0, mails.length);
const subs = ms => ms.map(m => m.to + ' | ' + m.subject + ' | ' + m.from);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function subscriber(email, name) {
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, 'en', '2026-11-01', '2026-11-01');
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), '2026-11-01');
  return tok;
}
async function call(method, p, body, auth) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t, _raw: res }; } d._s = res.status; return d;
}
const person = (o = {}) => ({ name: 'Amy Lee', country: 'KR', city: 'Seoul', role: 'follower', pkg: 'all', items: [], ...o });
const ye = (o = {}) => ({ event: 'ye2027', lang: 'en', people: [person()], hotel: 'no', ...o });
const bj = (o = {}) => ({ event: 'bstw2027', lang: 'en', people: [{ name: 'Bo Bj', country: 'KR', city: 'Seoul', role: 'leader', pkg: 'pass', items: [] }], hotel: 'no', ...o });
const idOf = async (ev, code) => (await call('GET', '/admin/reg?event=' + ev, null, ADMIN)).rows.find(r => r.code === code).id;
const now = new Date().toISOString();

// --- before migration 0027: 北京 as always, any other event unknown
d = await call('GET', '/reg/left?event=bstw2027'); check('old database: 北京 seats', d._s === 200 && d.left.S1 === 120, d);
var d = await call('GET', '/reg/left?event=ye2027'); check('old database: other event unknown', d._s === 400 && d.error === 'bad_event', d);
mig('0027_reg_event.sql'); mig('0027_reg_event.sql');

// --- a second event, from the database
const YE = {
  prefix: 'YE27', name: { zh: 'Milonga V 跨年 2027', en: 'Milonga V New Year 2027' }, from: 'Milonga V New Year',
  items: { N1: { key: 'eve', price: 300, cap: 2 }, N2: { key: 'day1', price: 200, cap: null }, W1: { key: 'class', price: 150, cap: null } },
  pkgs: { all: { price: 450, covers: ['N1', 'N2'] }, single: { price: 0, covers: [] } },
  names: { zh: { all: '全程', single: '单场', N1: '跨年舞会', N2: '元旦舞会', W1: '课程' }, en: { all: 'All pass', single: 'Single', N1: 'New Year Eve milonga', N2: 'New Year Day milonga', W1: 'Class' } },
  letters: { zh: { sign: '刘峥\nMilonga V', rules: '跨年规则：改动收手续费 ¥30。' }, en: { sign: 'Liu Zheng\nMilonga V', rules: 'Rules: changes carry a ¥30 fee.' } },
  promoPkg: 'all', earlyEnd: '2099-01-01T00:00:00+08:00', earlyPrice: 400, friendPrice: 380, codes: { YeFriend: 'DJ Ye' },
  fee: 30, payDays: 7, remindDay: 5, maxPeople: 4, deskEnds: '2027-01-01T22:00:00.000Z'
};
const putEvent = (id, cfg, mode = null, slug = null) => db.prepare('INSERT INTO reg_event(id,slug,mode,config,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,mode=excluded.mode,config=excluded.config').run(id, slug, mode, JSON.stringify(cfg), now, now);
putEvent('ye2027', YE, null, 'yearend-2027');
d = await call('GET', '/reg/left?event=ye2027'); check('new event: its own seats (capped items only)', d._s === 200 && JSON.stringify(d.left) === '{"N1":2}', d);
d = await call('GET', '/reg/left?event=bstw2027'); check('北京 still its own', d.left.S1 === 120 && !('N1' in d.left), d);
d = await call('GET', '/reg/left?event=nope'); check('unknown event refused', d._s === 400, d);

// --- prices and rules of the new event
const at = Date.now();
let e = R.evaluate(ye(), env, at, await R.getEvent(env, 'ye2027')); check('price: its package', e.total === 450, e);
e = R.evaluate(ye({ code: 'early' }), env, at, await R.getEvent(env, 'ye2027')); check('price: its early price on its promo package', e.total === 400, e);
e = R.evaluate(ye({ code: 'yefriend' }), env, at, await R.getEvent(env, 'ye2027')); check('price: its own friend code', e.total === 380 && e.promo.dj === 'DJ Ye', e);
e = R.evaluate(ye({ code: 'Alpha618' }), env, at, await R.getEvent(env, 'ye2027')); check('price: 北京\'s friend code does not count here', e.total === 450 && e.promo.kind === 'unknown', e);
e = R.evaluate(ye({ people: [person({ pkg: 'single', items: ['class'] })] }), env, at, await R.getEvent(env, 'ye2027')); check('single: any item will do here', e.total === 150, e);
e = R.evaluate(ye({ hotel: 'yes', rooms: [{ type: 'king', ci: '2026-12-30', co: '2027-01-01', guests: [0] }] }), env, at, await R.getEvent(env, 'ye2027')); check('no hotel here', e.error === 'no_hotel', e);
e = R.evaluate(ye({ people: [1, 2, 3, 4, 5].map(i => person({ name: 'P' + i })) }), env, at, await R.getEvent(env, 'ye2027')); check('its own maximum of people', e.error === 'bad_people', e);
e = R.evaluate(bj({ people: [{ name: 'X', country: 'KR', city: 'Seoul', role: 'leader', pkg: 'single', items: ['tour'] }] }), env, at); check('北京 single still needs a milonga', e.error === 'need_items', e);
e = R.evaluate(bj({ code: 'Alpha618', people: [{ name: 'X', country: 'KR', city: 'Seoul', role: 'leader', pkg: 'full', items: [] }] }), env, at); check('北京 friend price unchanged', e.total === 1200, e);

// --- registration, numbering and the letter
const amy = subscriber('amy@example.com', 'Amy');
d = await call('POST', '/reg', ye({ people: [person()] }), amy); let ms = take();
check('registered under its own prefix', d.ok && d.code === 'YE27-0001' && d.total === 450, d);
const own = ms.find(m => m.subject.includes('YE27-0001') && m.subject.startsWith('[TEST → amy@example.com]'));
check('letter: its sender name', own && own.from === 'Milonga V New Year', subs(ms));
check('letter: its wording and item names', own && own.body.includes('Liu Zheng') && own.body.includes('All pass') && !own.body.includes('Beijing Select Tango Weekend'), own && own.body.slice(0, 600));
const bo = subscriber('bo@example.com', 'Bo');
d = await call('POST', '/reg', bj(), bo); ms = take();
check('北京 numbering separate', d.code === 'BJ27-0001', d);
const bjl = ms.find(m => m.subject.includes('BJ27-0001') && m.subject.startsWith('[TEST → bo@example.com]'));
check('北京 letter unchanged (sender, signature)', bjl && bjl.from === 'Beijing Select Tango Weekend' && bjl.body.includes('Shiao Chang & Liu Zheng'), bjl && [bjl.from, bjl.body.slice(-120)]);
const zhu = subscriber('zhu@example.com', 'Zhu');
d = await call('POST', '/reg', ye({ lang: 'zh', people: [person({ name: '朱' })] }), zhu); ms = take();
const zh = ms.find(m => m.subject.includes(d.code) && m.subject.startsWith('[TEST → zhu@example.com]'));
check('letter in Chinese: its Chinese signature and names', zh && zh.body.includes('刘峥') && zh.body.includes('全程'), zh && zh.body.slice(0, 400));

// --- its rules: payment days, seat cap, admin list
d = await call('POST', '/admin/reg/act', { event: 'ye2027', id: await idOf('ye2027', 'YE27-0001'), action: 'confirm' }, ADMIN); ms = take();
const days = d.due ? Math.round((Date.parse(d.due) - Date.now()) / 864e5) : -1;
check('confirm: its own payment days (7)', d.ok && days === 7, d);
const conf = ms.find(m => m.subject.startsWith('[TEST → amy@example.com]'));
check('confirmation: link to its own registration page', conf && conf.body.includes('https://tangoweekend.org/event/yearend-2027/register/?lang=en#pay') && conf.body.includes('¥30'), conf && conf.body.slice(0, 900));
d = await call('POST', '/admin/reg/act', { event: 'ye2027', id: await idOf('ye2027', 'YE27-0002'), action: 'confirm' }, ADMIN); take();
const cat = subscriber('cat@example.com', 'Cat');
d = await call('POST', '/reg', ye({ people: [person({ name: 'Cat' })] }), cat); take();
d = await call('POST', '/admin/reg/act', { event: 'ye2027', id: await idOf('ye2027', d.code), action: 'confirm' }, ADMIN); take();
check('its own seat cap: the third full pass is refused', d._s === 409 && d.error === 'full' && d.item === 'N1' && d.left === 0, d);
d = await call('GET', '/admin/reg?event=ye2027', null, ADMIN); check('admin list: only its registrations', d.rows.length === 3 && d.rows.every(r => r.code.startsWith('YE27-')), d.rows && d.rows.map(r => r.code));
d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN); check('北京 list unchanged', d.rows.length === 1 && d.rows[0].code === 'BJ27-0001', d.rows && d.rows.map(r => r.code));

// --- test or live per event
db.prepare("UPDATE reg_event SET mode='live' WHERE id='ye2027'").run();
d = await call('POST', '/admin/reg/act', { event: 'ye2027', id: await idOf('ye2027', 'YE27-0001'), action: 'pay' }, ADMIN); ms = take();
check('event live: the letter goes to the registrant, no [TEST]', ms.some(m => m.to === 'amy@example.com' && !m.subject.startsWith('[')), subs(ms));
d = await call('POST', '/admin/reg/act', { id: await idOf('bstw2027', 'BJ27-0001'), action: 'waitlist' }, ADMIN); ms = take();
check('北京 at the same time still test (REG_LIVE unset)', ms.some(m => m.to === INBOX && m.subject.startsWith('[TEST → bo@example.com]')), subs(ms));
env.REG_LIVE = '1'; db.prepare("UPDATE reg_event SET mode='test' WHERE id='ye2027'").run();
d = await call('POST', '/admin/reg/act', { id: await idOf('bstw2027', 'BJ27-0001'), action: 'confirm' }, ADMIN); ms = take();
check('REG_LIVE on: 北京 live', ms.some(m => m.to === 'bo@example.com' && !m.subject.startsWith('[')), subs(ms));
d = await call('POST', '/admin/reg/act', { event: 'ye2027', id: await idOf('ye2027', 'YE27-0002'), action: 'pay' }, ADMIN); ms = take();
check('its own mode wins: still test', ms.some(m => m.to === INBOX && m.subject.startsWith('[TEST → zhu@example.com]')), subs(ms));
delete env.REG_LIVE;

// --- its entry codes and the timer
const pay = d.ok;
const passCode = 'YE27-0002';
const p0 = await R.passFor(env, passCode, 0);
const png = await social(new Request('https://api.tangoweekend.org/social/reg/pass/' + encodeURIComponent(p0) + '.png'), env, new URL('https://api.tangoweekend.org/social/reg/pass/' + encodeURIComponent(p0) + '.png'), json);
check('its entry code image', pay && png.status === 200 && png.headers.get('Content-Type') === 'image/png', png.status);
db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at,due_at) VALUES('ye2027','YE27-0900','late@example.com','en','confirmed',1,?,450,'2026-01-01','2026-01-01',?,?)")
  .run(JSON.stringify({ event: 'ye2027', people: [person({ items: ['N1', 'N2'], extra: [], amount: 450 })], rooms: [], passports: [], hotel: false }), new Date(Date.now() - 6 * 864e5).toISOString(), new Date(Date.now() + 864e5).toISOString());
let rr = await regCron(env); ms = take();
check('timer: its own reminder day (5)', rr.sent === 1 && ms.some(m => m.subject.includes('YE27-0900')), [rr, subs(ms)]);

// --- a row for 北京 overrides only what it says; a broken row is ignored
putEvent('bstw2027', { from: 'BSTW (row)' }, 'live');
const cy = subscriber('cy@example.com', 'Cy');
d = await call('POST', '/reg', bj({ people: [{ name: 'Cy', country: 'KR', city: 'Seoul', role: 'leader', pkg: 'pass', items: [] }] }), cy); ms = take();
check('北京 row: its fields win, the rest stays (price, prefix)', d.code === 'BJ27-0002' && d.total === 700 && ms.some(m => m.to === 'cy@example.com' && m.from === 'BSTW (row)'), [d, subs(ms)]);
db.prepare("DELETE FROM reg_event WHERE id='bstw2027'").run();
putEvent('bad2027', { prefix: 'bad!', name: { zh: 'x' } });
d = await call('GET', '/reg/left?event=bad2027'); check('a broken row: the event is unknown', d._s === 400, d);
d = await call('GET', '/reg/left?event=bstw2027'); check('北京 back to its own settings', d.left.S1 === 120, d);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-event tests passed:', passed);
