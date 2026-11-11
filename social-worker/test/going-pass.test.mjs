// Personal subscription link. No network and no real mail.
// Run: node social-worker/test/going-pass.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-pass';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0015_going_pass.sql', '0016_phone_bind.sql']) {
  db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', file), 'utf8'));
}
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE email_subs(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT, types TEXT, cities TEXT, lang TEXT, status TEXT, confirm_hash TEXT, pending_since TEXT, unsub_token TEXT, created_at TEXT, confirmed_at TEXT, unsubscribed_at TEXT);
CREATE TABLE mail_unsub(email TEXT PRIMARY KEY, at TEXT NOT NULL);`);
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log',
  ALLOW_NO_TURNSTILE: '1', PREVIEW_SHOW_CODE: '1'
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const logs = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) logs.push(s); else orig(...a); };
async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const ret = 'https://tangoweekend.org/zh/asia/?atm_y=80';
const who = { name: 'Mei', email: 'mei@example.com', city: 'Shanghai', role: 'follower', lang: 'zh', alert: 0, ret, ts: 'x', last4: '8000' };
async function post(pathname, body, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + pathname, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(headers || {}) }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + pathname), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function get(pathname, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + pathname, { headers: headers || {} }), env, new URL('https://api.tangoweekend.org/social' + pathname), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function confirm(link, headers) {
  const u = new URL(link);
  const res = await social(new Request('https://api.tangoweekend.org/social/going/confirm', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(headers || {}) }, body: new URLSearchParams({ e: u.searchParams.get('e'), t: u.searchParams.get('t'), confirm: '1' }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/confirm'), json);
  return { status: res.status, html: await res.text(), cookie: res.headers.get('Set-Cookie') || '' };
}
function passUrlOf(html) { return (html.match(/id="atm-pass"[^>]*value="([^"]+)"/) || [])[1] || ''; }
function passTok(url) { return (String(url || '').match(/\/enter\/([0-9a-f]{64})$/) || [])[1] || ''; }
function sessionOf(cookie) { return (String(cookie || '').match(/atm_session=([0-9a-f]{64})/) || [])[1] || ''; }

const scan = await post('/profile', who);
const scanned = await social(new Request(scan.preview_link), env, new URL(scan.preview_link), json);
check('a preview of the confirm link does not issue a personal link', (await scanned.text()).includes('name="confirm"') && !db.prepare('SELECT user_id FROM going_pass').get());
const done = await confirm(scan.preview_link, { Cookie: 'atm_verify=1' });
const link = passUrlOf(done.html);
const token = passTok(link);
const session = sessionOf(done.cookie);
const hash = token ? await sha('atm-pass:' + token) : '';
const stored = db.prepare('SELECT token_hash h, created_at at FROM going_pass').get();
check('confirm shows one personal link and stores only its hash', done.status === 200 && /^https:\/\/api\.tangoweekend\.org\/social\/going\/enter\/[0-9a-f]{64}$/.test(link) && stored && stored.h === hash && stored.h !== token && !JSON.stringify(stored).includes(token));
check('confirm mail is still the short confirm, not the personal link', logs.length === 1 && logs.every(line => !line.includes('/going/enter/') && !line.includes(token)));
check('the confirm page hands the link to this browser without putting it in the session cookie', done.html.includes('#p=' + token) && done.cookie.includes('atm_session=' + session) && !done.cookie.includes(token) && session !== token);

const open = await social(new Request(link, { headers: { 'User-Agent': 'Mozilla/5.0 MicroMessenger/8.0' } }), env, new URL(link), json);
const openHtml = await open.text();
check('opening the link in WeChat does not sign in until the form posts', open.status === 200 && !(open.headers.get('Set-Cookie') || '').includes('atm_session') && openHtml.includes('document.forms[0].submit()') && !openHtml.includes('http-equiv="refresh"') && !openHtml.includes('在浏览器中打开') && !openHtml.includes('微信内置浏览器') && db.prepare('SELECT COUNT(*) n FROM sessions').get().n === 1);

const before = db.prepare('SELECT COUNT(*) n FROM sessions').get().n;
const entered = await social(new Request('https://api.tangoweekend.org/social/going/enter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 MicroMessenger/8.0', Referer: link }, body: new URLSearchParams({ k: token }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/enter'), json);
const enteredHtml = await entered.text();
const enteredSession = (entered.headers.get('Set-Cookie') || '').match(/atm_session=([0-9a-f]{64})/);
check('WeChat still auto-redirects and sets a session', entered.status === 200 && !!enteredSession && enteredHtml.includes('http-equiv="refresh"') && enteredHtml.includes('/zh/asia/?s=' + enteredSession[1]) && enteredHtml.includes('#p=' + token) && !enteredHtml.includes('在浏览器中打开') && !enteredHtml.includes('微信内置浏览器') && !enteredHtml.includes(who.email));
check('the personal link does not send mail', logs.length === 1 && db.prepare('SELECT COUNT(*) n FROM sessions').get().n === before + 1);
const mine = await get('/going/mine', { Authorization: 'Bearer ' + enteredSession[1] });
check('the new browser is already subscribed', mine.name === who.name && mine.city === who.city && mine.role === who.role && mine.email === who.email);
const again = await social(new Request('https://api.tangoweekend.org/social/going/enter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 MicroMessenger/8.0' }, body: new URLSearchParams({ k: token }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/enter'), json);
check('the same link works more than once', again.status === 200 && (again.headers.get('Set-Cookie') || '').includes('atm_session='));

const typed = await post('/profile', who);
check('typing a verified address still asks for the confirm email', typed.confirm === true && typed.session !== true && !typed.url && !typed.token && logs.length === 2 && logs[1].includes('/social/going/confirm') && !logs[1].includes('/going/enter/'));

const kept = stored.h;
const second = await confirm(typed.preview_link, { Cookie: 'atm_verify=1' });
check('a later confirm does not replace the personal link', !second.html.includes('id="atm-pass"') && db.prepare('SELECT token_hash h FROM going_pass').get().h === kept);

const auth = { Authorization: 'Bearer ' + session };
const status = await get('/going/pass', auth);
check('profile can see that a link exists without receiving it again', status.active === true && !status.url && status._s === 200);
const proved = await post('/going/pass', { prove: token }, auth);
check('this browser can check its saved link', proved.match === true && !JSON.stringify(proved).includes(token));
const rotated = await post('/going/pass', { rotate: 1 }, auth);
const next = passTok(rotated.url);
check('rotate returns one new link', rotated.ok === true && next && next !== token && (await sha('atm-pass:' + next)) === db.prepare('SELECT token_hash h FROM going_pass').get().h);
const dead = await social(new Request('https://api.tangoweekend.org/social/going/enter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ k: token }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/enter'), json);
const deadHtml = await dead.text();
check('the old link stops working', dead.status === 400 && !(dead.headers.get('Set-Cookie') || '').includes('atm_session') && !deadHtml.includes(token) && !deadHtml.includes(who.email));
const live = await social(new Request('https://api.tangoweekend.org/social/going/enter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ k: next }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/enter'), json);
check('the new link signs in', live.status === 200 && (live.headers.get('Set-Cookie') || '').includes('atm_session='));
const still = await get('/going/mine', auth);
check('an already signed-in browser stays signed in', still.email === who.email && still._s === 200);
const duplicate = await post('/going/pass', { issue: 1 }, auth);
check('issuing again does not reveal the current link', duplicate._s === 409 && !duplicate.url);
const stale = await post('/going/pass', { prove: token }, auth);
check('the revoked link no longer matches', stale.match === false);

db.prepare('DELETE FROM going_pass').run();
const issued = await post('/going/pass', { issue: 1 }, auth);
check('a signed-in profile can create the first link', issued.ok === true && passTok(issued.url) && (await sha('atm-pass:' + passTok(issued.url))) === db.prepare('SELECT token_hash h FROM going_pass').get().h);
check('an unknown link is refused', (await social(new Request('https://api.tangoweekend.org/social/going/enter/' + 'cd'.repeat(32)), env, new URL('https://api.tangoweekend.org/social/going/enter/' + 'cd'.repeat(32)), json)).status === 400);
const insecureUrl = 'http://api.tangoweekend.org/social/going/enter/' + passTok(issued.url);
const insecure = await social(new Request(insecureUrl), env, new URL(insecureUrl), json);
const insecureHtml = await insecure.text();
check('an http link is refused', insecure.status === 400 && !(insecure.headers.get('Set-Cookie') || '').includes('atm_session') && !insecureHtml.includes(passTok(issued.url)));
check('status requires a session', (await get('/going/pass'))._s === 401);
check('nothing logged the personal link', logs.every(line => !line.includes('/going/enter/') && !line.includes(token) && !line.includes(next)));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going pass ok');
