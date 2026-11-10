// One email confirmation, then the server decides. No network and no real mail.
// Run: node social-worker/test/going-continue.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-continue';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0009_going.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0012_going_occ.sql'), 'utf8'));
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
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
    F1: { email: 'fest@example.com', kind: 'event', title: 'Festival', title_zh: '节日' },
    W1: { email: 'org@example.com', kind: 'weekly', weekday: 5, time: '20:00–22:00', title: 'Friday', title_zh: '周五' },
    LIST: { email: '', kind: 'event', title: 'List' },
    NONE: { email: '', kind: 'event', title: 'None' }
  },
  GOING_ORG_DIR: { orgs: { O9: 'list-only@example.com' }, links: { LIST: ['O9'] }, cards: {} },
  GOING_NOW: '2026-11-09T01:00:00.000Z'
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const ret = 'https://tangoweekend.org/asia/?card=F1';
async function post(path, body, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(headers || {}) }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function get(path, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { headers: headers || {} }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function confirm(link) {
  const u = new URL(link);
  const res = await social(new Request('https://api.tangoweekend.org/social/going/confirm', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ e: u.searchParams.get('e'), t: u.searchParams.get('t'), next: ret, confirm: '1' }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/confirm'), json);
  return res.text();
}
const star = fs.readFileSync(path.join(root, 'asia/atm-star.js'), 'utf8');
check('chinese and english each have one continue button', star.includes("verifyBtn: '确认邮箱并继续'") && star.includes("verifyBtn: 'Confirm email and continue'") && !star.includes('asg-restore') && !star.includes('用邮箱恢复登录'));

const fresh = await post('/going', { id: 'F1', intent: 'interested', email: 'new@example.com', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh', notify: 0, date: '' });
check('new user email does not queue', fresh.confirm && fresh.preview_link && !db.prepare('SELECT id FROM going_intents WHERE email=?').get('new@example.com'));
check('choice is kept', db.prepare('SELECT intent i, notify n FROM going_pending WHERE email=? AND consumed_at IS NULL').get('new@example.com').i === 'interested' && db.prepare('SELECT notify n FROM going_pending WHERE email=?').get('new@example.com').n === 0);
const first = await confirm(fresh.preview_link);
const token = (first.match(/atm=([0-9a-f]{64})/) || [])[1];
check('confirm link returns to the card and does not queue', token && first.includes('card=F1') && first.includes('going=ready') && !db.prepare('SELECT id FROM going_intents WHERE email=?').get('new@example.com') && !mails.some(m => m.includes('to=fest@example.com')));
const again = await confirm(fresh.preview_link);
check('token cannot be reused', again.includes('过期') || again.includes('无效') || again.includes('expired') || again.includes('invalid'));
const mine = await get('/going/mine', { Authorization: 'Bearer ' + token });
check('draft survives for the new session', mine.drafts && mine.drafts[0].id === 'F1' && mine.drafts[0].intent === 'interested' && mine.drafts[0].notify === false);
const early = await post('/going', { id: 'F1', intent: 'interested', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh' }, { Authorization: 'Bearer ' + token });
check('incomplete profile cannot final confirm', early._s === 400 && early.need_profile && !db.prepare('SELECT id FROM going_intents WHERE email=?').get('new@example.com'));
const done = await post('/going', { id: 'F1', intent: 'interested', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh', name: 'Niu', city: 'Beijing', role: 'leader' }, { Authorization: 'Bearer ' + token });
check('final confirm queues once', done.mail === 'queued' && db.prepare("SELECT mail_status s FROM going_intents WHERE email=?").get('new@example.com').s === 'queued' && !db.prepare('SELECT id FROM going_pending WHERE email=? AND consumed_at IS NULL').get('new@example.com'));

db.prepare("INSERT INTO users(email,name,city,role,verified_at,created_at) VALUES('old@example.com','Ada','Seoul','leader','2026-11-01T00:00:00.000Z','2026-11-01T00:00:00.000Z')").run();
const old = await post('/going', { id: 'W1', intent: 'going', email: 'old@example.com', name: '', city: '', role: '', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'en', date: '2026-11-13', notify: 1 });
const oldText = await confirm(old.preview_link);
const oldUser = db.prepare('SELECT name n, city c, role r FROM users WHERE email=?').get('old@example.com');
check('empty form does not wipe an old profile', oldUser.n === 'Ada' && oldUser.c === 'Seoul' && oldUser.r === 'leader');
const oldToken = (oldText.match(/atm=([0-9a-f]{64})/) || [])[1];
const oldMine = await get('/going/mine', { Authorization: 'Bearer ' + oldToken });
check('old device gets the saved date', oldMine.drafts.some(d => d.id === 'W1' && d.intent === 'going' && d.date === '2026-11-13') && oldMine.role === 'leader');
const oldFinal = await post('/going', { id: 'W1', intent: 'going', date: '2026-11-13', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'en' }, { Authorization: 'Bearer ' + oldToken });
check('complete old user queues without a new profile', oldFinal.mail === 'queued' && oldFinal.verified);

db.prepare("UPDATE users SET city=NULL WHERE email=?").run('gap@example.com');
db.prepare("INSERT INTO users(email,name,city,role,verified_at,created_at) VALUES('gap@example.com','Gao',NULL,'follower','2026-11-01T00:00:00.000Z','2026-11-01T00:00:00.000Z')").run();
const gap = await post('/going', { id: 'F1', intent: 'interested', email: 'gap@example.com', name: '', city: 'Busan', role: '', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'en' });
await confirm(gap.preview_link);
const gapUser = db.prepare('SELECT name n, city c, role r FROM users WHERE email=?').get('gap@example.com');
check('only the blank city is filled', gapUser.n === 'Gao' && gapUser.c === 'Busan' && gapUser.r === 'follower');

db.prepare("UPDATE profile_verify SET sent_at='2020-01-01T00:00:00.000Z' WHERE email=?").run('late@example.com');
const late = await post('/going', { id: 'F1', intent: 'going', email: 'late@example.com', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'en' });
db.prepare("UPDATE profile_verify SET sent_at='2020-01-01T00:00:00.000Z' WHERE email=?").run('late@example.com');
const lateText = await confirm(late.preview_link);
check('expired token does not verify', (lateText.includes('expired') || lateText.includes('过期')) && !db.prepare('SELECT verified_at v FROM users WHERE email=?').get('late@example.com').v);

const reach = await get('/going/reach?ids=LIST,NONE');
check('directory reach still hides the address', reach.reach.LIST === true && reach.reach.NONE === false && !JSON.stringify(reach).includes('list-only@example.com'));
check('no organizer mail was sent', !mails.some(m => m.includes('cc=selecttango@gmail.com')));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going continue ok');
