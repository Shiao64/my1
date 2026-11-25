// Platform step 3 (shared pages /tp/, Shiao 2026-11-25): what the shared pages are told about the event they work in,
// the events someone may switch between, links to /tp/in/, and the check-in page counting only its own event.
// Run: node social-worker/test/reg-pages.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-pages';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'inmail.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

const db = new DatabaseSync(':memory:');
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
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests', REG_CODES: '{}' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 700) : '')); };
const orig = console.log; console.log = (...a) => { const s = a.map(String).join(' '); if (!s.startsWith('[mail:log]') && !/^reg_event:/.test(s)) orig(...a); };
async function call(method, p, body, auth) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const adm = (p, body, tok) => call('POST', '/admin/reg' + p, body, tok);
const keyOf = link => (/\/tp\/in\/\?event=[a-z0-9]+(?:&m=[0-9a-f]{32})?#([0-9a-f]{48})$/.exec(link || '') || [])[1];
const PIN = '730195';
const signIn = async (made, own = PIN) => (await call('POST', '/reg/login', { key: keyOf(made.link), pin: made.pin, new_pin: own })).token;
const now = new Date().toISOString();
const small = { items: { N1: { key: 'eve', price: 300, cap: null } }, pkgs: { all: { price: 300, covers: ['N1'] } } };
const putEvent = (id, cfg, slug) => db.prepare('INSERT INTO reg_event(id,slug,config,created_at,updated_at) VALUES(?,?,?,?,?)').run(id, slug, JSON.stringify(cfg), now, now);
putEvent('ye2027', { ...small, prefix: 'YE27', name: { zh: '跨年 2027', en: 'New Year 2027' }, starts: '2027-12-31', ends: '2028-01-01', deskEnds: '2028-01-01T22:00:00.000Z' }, 'yearend-2027');
putEvent('past2026', { ...small, prefix: 'PA26', name: { zh: '去年', en: 'Last year' }, short: { zh: '去年' }, color: '#123456', starts: '2025-12-31', ends: '2026-01-01' }, 'past-2026');

// --- links point to the shared sign-in page, with the event
let d = await adm('/admins', { event: 'bstw2027', name: '刘峥', role: 'chief', email: 'liu@example.com' }, ADMIN);
check('link: /tp/in/ with the event', /^https:\/\/tangoweekend\.org\/tp\/in\/\?event=bstw2027#[0-9a-f]{48}$/.test(d.link), d);
const liu = await signIn(d);
d = await adm('/admins', { event: 'ye2027', name: '刘峥', role: 'chief', email: 'liu@example.com' }, ADMIN); check('刘峥 also 总管 of 跨年', d.ok && d.same_person, d);
d = await adm('/staff', { event: 'bstw2027', name: '阿凯', email: 'kai@example.com' }, ADMIN);
check('link of another event: its own id', /\/tp\/in\/\?event=bstw2027#/.test(d.link), d);
const kai = await signIn(d, '594028');
d = await adm('/staff', { event: 'ye2027', name: '阿凯', email: 'kai@example.com' }, ADMIN); check('阿凯 also 前台 of 跨年', d.ok && d.same_person, d);
d = await adm('/staff', { event: 'ye2027', name: '小林' }, ADMIN);
check('someone new in 跨年: link to 跨年', /\/tp\/in\/\?event=ye2027#[0-9a-f]{48}$/.test(d.link), d);

// --- "where am I": the check-in page's /me, with or without the event
d = await call('GET', '/reg/door/me', null, kai);
check('no event named: the current one (北京, sooner), with its facts', d.ok && d.event === 'bstw2027' && d.current === 'bstw2027' && d.role === 'desk'
  && JSON.stringify(d.event_info) === JSON.stringify({ id: 'bstw2027', name: '北京精选探戈周末 2027', name_en: 'Beijing Select Tango Weekend 2027', short: '北京', starts: '2027-06-18', ends: '2027-06-22', color: '#b3121b', desk_ends: '2027-06-22T22:00:00.000Z' }), d);
check('his events to switch between: both, soonest first, with his role', d.events.map(e => e.id + ':' + e.role).join() === 'bstw2027:desk,ye2027:desk' && d.events[1].name === '跨年 2027' && /^#[0-9a-f]{6}$/.test(d.events[1].color) && d.events[1].color !== '#b3121b', d.events);
d = await call('GET', '/reg/door/me?event=ye2027', null, kai);
check('event named: that one', d.ok && d.event === 'ye2027' && d.event_info.short === '跨年 2027' && d.event_info.starts === '2027-12-31' && d.until === '2028-01-01T22:00:00.000Z', d);
d = await call('GET', '/reg/door/me?event=past2026', null, kai); check('an event he has no role in: no_role', d._s === 403 && d.error === 'no_role', d);
d = await call('GET', '/reg/door/me?event=nope', null, kai); check('no such event: bad_event', d._s === 400 && d.error === 'bad_event', d);
d = await call('GET', '/reg/door/me', null, ADMIN);
check('管理员: every event, the current one first not over', d.ok && d.role === 'owner' && d.current === 'bstw2027' && d.events.map(e => e.id).join() === 'past2026,bstw2027,ye2027' && d.events.every(e => e.role === 'owner') && d.events[0].color === '#123456', d);
d = await call('GET', '/admin/reg/me?event=ye2027', null, liu);
check('管理页 /me: this event\'s facts and his events', d.ok && d.role === 'chief' && d.event_info.id === 'ye2027' && d.events.map(e => e.id + ':' + e.role).join() === 'bstw2027:chief,ye2027:chief', d);
d = await call('GET', '/admin/reg?event=bstw2027', null, ADMIN);
check('管理页 list: the same two added', d.event === 'bstw2027' && d.event_info.short === '北京' && d.events.length === 3 && d.current === 'bstw2027', { e: d.event_info, n: d.events && d.events.length });

// --- the check-in page counts only its own event
const regRow = (event, code) => db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at) VALUES(?,?,'a@example.com','en','paid',1,?,300,?,?)")
  .run(event, code, JSON.stringify({ people: [{ name: 'Amy ' + code, role: 'follower', country: 'KR', city: 'Seoul', items: event === 'bstw2027' ? ['M1'] : ['N1'] }] }), now, now);
regRow('bstw2027', 'BJ27-0901'); regRow('ye2027', 'YE27-0001');
const pBj = await R.passFor(env, 'BJ27-0901', 0), pYe = await R.passFor(env, 'YE27-0001', 0), q = encodeURIComponent;
d = await call('GET', '/reg/door/pass?p=' + q(pBj) + '&event=bstw2027', null, kai); check('北京 page, 北京 pass: shown', d.ok && d.code === 'BJ27-0901', d);
d = await call('GET', '/reg/door/pass?p=' + q(pYe) + '&event=bstw2027', null, kai);
check('北京 page, 跨年 pass: refused, saying whose', d._s === 409 && d.error === 'other_event' && d.event === 'ye2027' && d.event_name === '跨年 2027', d);
d = await call('POST', '/reg/door/checkin', { p: pYe, item: 'N1', event: 'bstw2027' }, kai);
check('...and no check-in', d._s === 409 && d.error === 'other_event' && db.prepare('SELECT COUNT(*) n FROM reg_checkin').get().n === 0, d);
d = await call('POST', '/reg/door/checkin', { p: pYe, item: 'N1', event: 'ye2027' }, kai); check('跨年 page, 跨年 pass: checked in, his name there', d.ok && d.by === '阿凯', d);
d = await call('GET', '/reg/door/pass?p=' + q(pYe) + '&event=bstw2027', null, ADMIN); check('管理员 on the 北京 page: a 跨年 pass refused too', d._s === 409 && d.error === 'other_event', d);
d = await call('GET', '/reg/door/pass?p=' + q(pYe), null, kai); check('an old page naming no event: as in step 2 (his other event counts)', d.ok && d.code === 'YE27-0001', d);
d = await call('GET', '/reg/door/pass?p=' + q(pBj) + '&event=past2026', null, kai); check('a page of an event he has no role in: no_role', d._s === 403 && d.error === 'no_role', d);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-pages tests passed:', passed);
