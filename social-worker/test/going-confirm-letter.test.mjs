// Event-intent confirmation letter. No network and no real mail.
// Run: node social-worker/test/going-confirm-letter.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const cjk = /[\u3400-\u9fff]/;
const he = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const link = 'https://api.tangoweekend.org/social/going/confirm?e=preview%40example.com&t=preview&next=https%3A%2F%2Ftangoweekend.org%2Fasia%2F';
const body = {
  zh: '谢谢你订阅亚洲探戈地图（Asia Tango Map）。请在 30 分钟内点击下方按钮，确认你的邮箱。',
  en: 'Thanks for subscribing to Asia Tango Map. Please confirm your email within 30 minutes by tapping the button below.'
};
const expiredCopy = '链接已过期。请回到页面，再次点五角星，即可收到一封新邮件。 / This link has expired. Go back and tap the star again to get a new email.';

const dir = '/tmp/atm-confirm-letter';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = read('social-worker/src/social.js').replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { buildConfirmLetter } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

function letter(lang, name, pending) {
  return buildConfirmLetter({ lang, name, email: 'person@example.com', promo: false }, link, pending || null, he);
}
const enNamed = letter('en', 'Ann', { title: 'Friday milonga', intent: 'going' });
const enEmpty = letter('en', '  \n', { title: 'Friday milonga', intent: 'interested' });
const zhNamed = letter('zh', '安', { title: '周五探戈', intent: 'going' });
const zhEmpty = letter('zh', '', { title: '周五探戈', intent: 'interested' });
const enGoing = enNamed;
const zhGoing = zhNamed;

check('english greeting uses the name', enNamed.text.startsWith('Hi Ann,\n') && enNamed.html.includes('>Hi Ann,</p>') && enNamed.fromName === 'Tango Assistant · Asia Tango Map' && enNamed.subject === 'Please confirm your Asia Tango Map subscription');
check('english greeting drops an empty name', enEmpty.text.startsWith('Hi,\n') && enEmpty.html.includes('>Hi,</p>') && !enEmpty.text.includes('Hi ,') && !enEmpty.html.includes('Hi ,'));
check('chinese greeting uses the name', zhNamed.text.startsWith('安，你好！\n') && zhNamed.html.includes('>安，你好！</p>') && zhNamed.fromName === '探戈助理 · 亚洲探戈地图' && zhNamed.subject === '请确认订阅亚洲探戈地图');
check('chinese greeting drops an empty name', zhEmpty.text.startsWith('你好！\n') && zhEmpty.html.includes('>你好！</p>') && !zhEmpty.text.includes('，你好') && !zhEmpty.html.includes('，你好'));
check('both letters use the short subscription sentence', enNamed.text.includes(body.en) && enNamed.html.includes(body.en) && zhNamed.text.includes(body.zh) && zhNamed.html.includes(body.zh));
check('the old 7 day sentence is gone', !enNamed.text.includes('7 days') && !enNamed.html.includes('7 days') && !zhNamed.text.includes('7 天') && !zhNamed.html.includes('7 天'));
check('english letter and sender name have no chinese', !cjk.test(enNamed.subject + enNamed.text + enNamed.html + enNamed.fromName) && !cjk.test(enGoing.subject + enGoing.text + enGoing.html + enGoing.fromName) && !cjk.test(enEmpty.text + enEmpty.html));
check('chinese letter signs in chinese', zhNamed.text.endsWith('探戈助理 · 亚洲探戈地图') && zhNamed.html.includes('探戈助理 · 亚洲探戈地图</p>') && zhNamed.text.includes('如果不是你本人操作，忽略这封信即可。') && !zhNamed.text.includes('Tango Assistant'));
check('english letter signs in english', enNamed.text.endsWith('Tango Assistant · Asia Tango Map') && enNamed.html.includes('Tango Assistant · Asia Tango Map</p>') && enNamed.text.includes('If this wasn\'t you, you can simply ignore this email.'));
check('a name is escaped', letter('en', 'Ann <b>').html.includes('Hi Ann &lt;b&gt;,') && !letter('en', 'Ann <b>').html.includes('<b>'));
check('the confirm link and button stay', enNamed.html.includes('>Confirm subscription</a>') && zhNamed.html.includes('>确认订阅</a>') && enNamed.text.includes(link) && zhNamed.text.includes(link));
check('intent notes and the delete line stay out of the letter', !zhGoing.text.includes('周五探戈') && !zhGoing.text.includes('要删除资料') && !zhGoing.text.includes('组织者') && !enGoing.text.includes('Friday milonga') && !enGoing.text.includes('selecttango') && !enGoing.html.includes('Going'));
const promo = buildConfirmLetter({ lang: 'zh', name: '安', promo: true }, link, { title: '周五探戈', intent: 'going' }, he);
check('a checked subscribe box does not add a second paragraph', promo.text === zhNamed.text && promo.html === zhNamed.html);

const goingSrc = read('social-worker/src/going.js');
check('token expiry is 30 minutes', goingSrc.includes('const PROFILE_MS = 30 * 60e3'));
check('resend limits stay', goingSrc.includes('const RESEND_GAP_MS = 60e3') && goingSrc.includes('if (rows.length >= 2) return { error: \'resend_used\' }') && goingSrc.includes('(eh || 0) >= 3 || (ed || 0) >= 10 || (ih || 0) >= 10 || (dh || 0) >= 10'));
check('menu profile and the star submit share this letter', /export async function goingProfile[\s\S]*?sendVerify\(/.test(goingSrc) && /export async function goingSubmit[\s\S]*?sendVerify\(/.test(goingSrc));
const magic = read('social-worker/src/social.js');
const subWorker = read('subscribe-worker/src/index.js');
check('the signup magic letter is a different template', magic.includes('async function sendMagic') && magic.includes('within 60 minutes') && magic.includes('亚洲探戈地图 Asia Tango Map') && !magic.includes('buildConfirmLetter'));
check('the subscribe-worker letter is a different template', subWorker.includes('The link is valid for 7 days') && subWorker.includes("cBody: l => `Hi!") && !subWorker.includes('buildConfirmLetter') && !subWorker.includes('Tango Assistant'));

const db = new DatabaseSync(':memory:');
db.exec(read('social-worker/migrations/0009_going.sql'));
db.exec(read('social-worker/migrations/0012_going_occ.sql'));
db.exec(read('social-worker/migrations/0013_going_confirm_show.sql'));
db.exec(read('social-worker/migrations/0014_profile_verify_pending.sql'));
db.exec(read('social-worker/migrations/0016_phone_bind.sql'));
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, code_hash TEXT, code_sent_at TEXT, code_tries INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT);
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
  GOING_CARDS: { F1: { email: 'fest@example.com', kind: 'event', title: 'Festival', title_zh: '节日' } },
  GOING_NOW: '2026-11-10T01:00:00.000Z'
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const ret = 'https://tangoweekend.org/asia/?card=F1';
async function post(path, body) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function openConfirm(preview, method) {
  const u = new URL(preview);
  const res = await social(new Request('https://api.tangoweekend.org/social/going/confirm' + (method === 'GET' ? u.search : ''), { method: method || 'GET' }), env, new URL('https://api.tangoweekend.org/social/going/confirm' + u.search), json);
  return { status: res.status, html: await res.text() };
}

const menu = await post('/profile', { name: 'Mei', email: 'mei@example.com', city: 'Osaka', role: 'follower', lang: 'en', alert: 0, ret, ts: 'x', last4: '8000' });
check('menu profile sends the english letter', menu.confirm && mails.some(m => m.includes('from=Tango Assistant · Asia Tango Map') && m.includes('to=mei@example.com') && m.includes('Hi Mei,') && m.includes(body.en) && m.includes('Confirm subscription') && !cjk.test(m)));
const blank = await post('/going', { id: 'F1', intent: 'interested', email: 'noname@example.com', name: '', city: 'Seoul', role: 'leader', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh' });
check('a star submit without a name is refused', blank._s === 400 && blank.error === 'need_name' && !mails.some(m => m.includes('to=noname@example.com')));
const star = await post('/going', { id: 'F1', intent: 'interested', email: 'named@example.com', name: '安', city: 'Seoul', role: 'leader', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh', last4: '8000' });
check('star mail with a name stays the short chinese letter', star.confirm && mails.some(m => m.includes('from=探戈助理 · 亚洲探戈地图') && m.includes('to=named@example.com') && m.includes('安，你好！') && m.includes(body.zh) && !m.includes('节日')));

const fresh = await openConfirm(menu.preview_link, 'GET');
check('a new link still shows the confirm button', fresh.status === 200 && fresh.html.includes('Confirm') && !fresh.html.includes('expired'));
db.prepare('UPDATE profile_verify SET sent_at=? WHERE email=?').run(new Date(Date.now() - 29 * 60e3).toISOString(), 'mei@example.com');
const within = await openConfirm(menu.preview_link, 'GET');
check('29 minutes is still valid', within.status === 200 && within.html.includes('name="confirm"') && !within.html.includes('expired'));
db.prepare('UPDATE profile_verify SET sent_at=? WHERE email=?').run(new Date(Date.now() - 31 * 60e3).toISOString(), 'mei@example.com');
const late = await openConfirm(menu.preview_link, 'GET');
check('31 minutes is the expired page', late.status === 400 && late.html.includes(expiredCopy) && !db.prepare('SELECT verified_at v FROM users WHERE email=?').get('mei@example.com').v);
db.prepare('UPDATE profile_verify SET sent_at=? WHERE email=?').run(new Date(Date.now() - 31 * 60e3).toISOString(), 'named@example.com');
const lateZh = await openConfirm(star.preview_link, 'GET');
check('the chinese expired page says the same thing', lateZh.status === 400 && lateZh.html.includes('链接已过期') && lateZh.html.includes('tap the star again') && lateZh.html.includes('lang="zh-CN"'));

const out = process.env.ATM_LETTER_OUT;
if (out) {
  fs.mkdirSync(out, { recursive: true });
  const files = {
    'en-with-name.html': enNamed.html,
    'en-no-name.html': enEmpty.html,
    'zh-with-name.html': zhNamed.html,
    'zh-no-name.html': zhEmpty.html,
    'expired-en.html': late.html,
    'expired-zh.html': lateZh.html,
    'en-with-name.txt': 'From: ' + enNamed.fromName + '\nSubject: ' + enNamed.subject + '\n\n' + enNamed.text,
    'en-no-name.txt': 'From: ' + enEmpty.fromName + '\nSubject: ' + enEmpty.subject + '\n\n' + enEmpty.text,
    'zh-with-name.txt': 'From: ' + zhNamed.fromName + '\nSubject: ' + zhNamed.subject + '\n\n' + zhNamed.text,
    'zh-no-name.txt': 'From: ' + zhEmpty.fromName + '\nSubject: ' + zhEmpty.subject + '\n\n' + zhEmpty.text
  };
  for (const [name, html] of Object.entries(files)) fs.writeFileSync(path.join(out, name), html);
}

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('confirm letter ok');
