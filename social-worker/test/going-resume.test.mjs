// Subscribe once, then return to the card. No network and no real mail.
// Run: node social-worker/test/going-resume.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-resume';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0015_going_pass.sql', '0016_phone_bind.sql', '0017_confirm_claim.sql']) {
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
  ALLOW_NO_TURNSTILE: '1', PREVIEW_SHOW_CODE: '1',
  GOING_CARDS: {
    F1: { email: 'fest@example.com', kind: 'event', title: 'Festival', title_zh: '节日' }
  }
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const ret = 'https://tangoweekend.org/asia/?atm_y=480';
const zhRet = 'https://tangoweekend.org/zh/asia/?card=somewhere&atm_y=220';
async function post(path, body, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(headers || {}) }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; d._cookie = res.headers.get('Set-Cookie') || ''; return d;
}
async function confirm(link, headers) {
  const u = new URL(link);
  const res = await social(new Request('https://api.tangoweekend.org/social/going/confirm', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(headers || {}) }, body: new URLSearchParams({ e: u.searchParams.get('e'), t: u.searchParams.get('t'), confirm: '1' }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/confirm'), json);
  return { status: res.status, html: await res.text(), cookie: res.headers.get('Set-Cookie') || '' };
}
function tokenOf(cookie) { return (String(cookie || '').match(/atm_session=([0-9a-f]{64})/) || [])[1] || ''; }

const star = await post('/going', { id: 'F1', intent: 'interested', email: 'new@example.com', name: 'Niu', city: 'Beijing', role: 'leader', explicit: 1, disclose: 1, alert: 1, ts: 'x', ret: zhRet, lang: 'zh', notify: 1, last4: '8000' });
const row = db.prepare('SELECT pending_intent i, card_id c, wants_sitewide w, ret r FROM profile_verify WHERE email=?').get('new@example.com');
check('token row keeps the profile choice', star.confirm && star._cookie.includes('atm_verify=1') && row.i === 'interested' && row.c === 'F1' && row.w === 1 && row.r === zhRet);
const same = await confirm(star.preview_link, { Cookie: 'atm_verify=1' });
const sameToken = tokenOf(same.cookie);
check('any browser gets the finish page and a session', same.status === 200 && same.html.includes('订阅成功，可以关掉这个页面') && same.html.includes('去看亚洲探戈地图') && same.html.includes('https://tangoweekend.org/zh/asia/') && !same.html.includes('http-equiv="refresh"') && same.cookie.includes('atm_session=' + sameToken));
const other = await post('/going', { id: 'F1', intent: 'going', email: 'other@example.com', name: 'Ora', city: 'Osaka', role: 'follower', explicit: 1, disclose: 1, alert: 0, ts: 'x', ret, lang: 'en', last4: '8000' });
const otherPage = await confirm(other.preview_link);
check('english finish page has no refresh', otherPage.status === 200 && !otherPage.html.includes('http-equiv="refresh"') && otherPage.html.includes('Subscribed — you can close this page') && otherPage.html.includes('Go to Asia Tango Map') && otherPage.html.includes('https://tangoweekend.org/asia/') && !otherPage.html.includes('WeChat') && !otherPage.html.includes('微信'));
const wx = await post('/going', { id: 'F1', intent: 'going', email: 'wx@example.com', name: 'Wei', city: 'Shanghai', role: 'both', explicit: 1, disclose: 1, alert: 1, ts: 'x', ret: zhRet, lang: 'zh', last4: '8000' });
const wxPage = await confirm(wx.preview_link, { Cookie: 'atm_verify=1', 'User-Agent': 'Mozilla/5.0 MicroMessenger/8.0' });
check('wechat still gets the finish page', wxPage.status === 200 && !wxPage.html.includes('http-equiv="refresh"') && wxPage.html.includes('订阅成功，可以关掉这个页面') && !wxPage.html.includes('在浏览器中打开'));
check('opening the link records the intent', db.prepare("SELECT intent i FROM going_intents WHERE email=?").get('wx@example.com').i === 'going');
const wxToken = tokenOf(wxPage.cookie);
const awaited = await post('/going/await', { nonce: wx.nonce });
check('the nonce, not the email, returns the session', awaited.confirmed === true && awaited.session === wxToken && !(await post('/going/await', { email: 'wx@example.com' })).session);
const mine = await social(new Request('https://api.tangoweekend.org/social/going/mine', { headers: { Authorization: 'Bearer ' + wxToken } }), env, new URL('https://api.tangoweekend.org/social/going/mine'), json);
const mineBody = await mine.json();
check('the new session already has the shared profile and the saved intent', mineBody.name === 'Wei' && mineBody.city === 'Shanghai' && mineBody.role === 'both' && mineBody.items.some(x => x.intent === 'going') && mineBody.sitewide === true);
const again = await confirm(wx.preview_link);
check('the link still opens after the first confirm', again.status === 200 && again.html.includes('订阅成功，可以关掉这个页面'));

db.prepare("UPDATE profile_verify SET sent_at='2020-01-01T00:00:00.000Z' WHERE email=?").run('other@example.com');
const late = await confirm(other.preview_link);
check('an expired link is the bilingual star page', late.status === 400 && late.html.includes('链接已过期。请回到页面，再次点五角星，即可收到一封新邮件。') && late.html.includes('This link has expired. Go back and tap the star again to get a new email.') && !late.html.includes('intent=resume'));

const menu = await post('/profile', { name: 'Mei', email: 'mei@example.com', city: 'Osaka', role: 'follower', lang: 'zh', alert: 1, ret: zhRet, ts: 'x', last4: '8000' });
const menuPage = await confirm(menu.preview_link, { Cookie: 'atm_verify=1' });
const menuToken = tokenOf(menuPage.cookie);
check('menu confirm is the finish page and does not open the intent dialog', menuPage.html.includes('订阅成功，可以关掉这个页面') && menuPage.html.includes('去看亚洲探戈地图') && !menuPage.html.includes('intent=resume'));
check('menu confirm created no intent', !db.prepare('SELECT id FROM going_intents WHERE email=?').get('mei@example.com') && !db.prepare('SELECT id FROM going_pending WHERE email=?').get('mei@example.com'));
const before = mails.length;
const off = await post('/profile', { name: 'Mei', email: 'mei@example.com', city: 'Kyoto', role: 'both', lang: 'zh', alert: 0, ret: zhRet, ts: 'x' }, { Authorization: 'Bearer ' + menuToken });
check('unchecking site-wide takes effect without another email', off.session && off.mailed === false && off.sitewide === false && mails.length === before && db.prepare("SELECT status s FROM email_subs WHERE email=?").get('mei@example.com').s === 'unsubscribed' && db.prepare('SELECT city c, role r FROM users WHERE email=?').get('mei@example.com').c === 'Kyoto');
const on = await post('/profile', { name: 'Mei', email: 'mei@example.com', city: 'Kyoto', role: 'both', lang: 'zh', alert: 1, ret: zhRet, ts: 'x' }, { Authorization: 'Bearer ' + menuToken });
check('re-checking site-wide takes effect without another email', on.session && on.mailed === false && on.sitewide === true && mails.length === before && db.prepare("SELECT status s FROM email_subs WHERE email=?").get('mei@example.com').s === 'active');
const final = await post('/going', { id: 'F1', intent: 'interested', explicit: 1, disclose: 1, ts: 'x', ret: zhRet, lang: 'zh' }, { Authorization: 'Bearer ' + sameToken });
check('a confirmed profile is not asked again', (final.mail === 'queued' || final.mail === 'unchanged') && !final.need_profile && db.prepare('SELECT name n, city c, role r FROM users WHERE email=?').get('new@example.com').n === 'Niu');

const shot = process.env.ATM_SHOT_DIR;
if (shot) {
  fs.mkdirSync(shot, { recursive: true });
  fs.writeFileSync(path.join(shot, 'same.html'), same.html);
  fs.writeFileSync(path.join(shot, 'other.html'), otherPage.html);
  fs.writeFileSync(path.join(shot, 'wechat.html'), wxPage.html);
  fs.writeFileSync(path.join(shot, 'expired.html'), late.html);
  fs.writeFileSync(path.join(shot, 'menu.html'), menuPage.html);
}

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going resume ok');
