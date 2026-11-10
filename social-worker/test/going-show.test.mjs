// Per-show intent, favorites, confirm-mail limits. No network and no real mail.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-show';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { occurrenceDates, shYmd, digestSchedule } = await import(pathToFileURL(path.join(dir, 'going.js')).href);
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0009_going.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0012_going_occ.sql'), 'utf8'));
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
    run() { const r = st.run(...args); return { meta: { changes: r.changes } }; }
  }; } };
}
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.example.test', SOCIAL_MAIL: 'log', ALLOW_NO_TURNSTILE: '1', PREVIEW_SHOW_CODE: '1',
  GOING_CARDS: { W1: { email: 'org@example.com', kind: 'weekly', weekday: 5, time: '20:30–24:30', title: 'Friday', title_zh: '周五' }, F1: { email: 'fest@example.com', kind: 'event', title: 'Fest', title_zh: '节日' } },
  GOING_NOW: '2026-10-02T04:00:00Z'
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : String(x)).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const ret = 'https://tangoweekend.org/asia/?card=W1';
const dates = occurrenceDates(env.GOING_CARDS.W1, shYmd(Date.parse(env.GOING_NOW)), 3);
async function post(path, body, headers) {
  const res = await social(new Request('https://api.example.test/social' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(headers || {}) }, body: JSON.stringify(body) }), env, new URL('https://api.example.test/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function get(path, headers) {
  const res = await social(new Request('https://api.example.test/social' + path, { headers: headers || {} }), env, new URL('https://api.example.test/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
const base = { ts: 'x', dev: 'device-show-0001', lang: 'zh', ret, disclose: 1, explicit: 1, name: '安', email: 'ann@example.com', city: '上海', role: 'leader' };
const first = await post('/going', { ...base, id: 'W1', intent: 'going', anchor: dates[0], date: dates[0], alert: 1 });
check('guest confirm mail states the subscribe choice and the delete line', first.confirm && mails.some(m => m.includes('ann@example.com') && m.includes('同时订阅') && m.includes('要删除资料，请回信到 selecttango@gmail.com')));
check('guest row is pending, not an intent', !db.prepare('SELECT id FROM going_intents WHERE email=?').get('ann@example.com') && db.prepare('SELECT anchor a, intent i FROM going_pending WHERE email=?').get('ann@example.com').a === dates[0]);
const link = first.preview_link;
const done = await social(new Request('https://api.example.test/social/going/confirm', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ e: 'ann@example.com', t: new URL(link).searchParams.get('t'), next: ret, confirm: '1' }).toString() }), env, new URL('https://api.example.test/social/going/confirm'), json);
const token = ((await done.text()).match(/atm=([0-9a-f]{64})/) || [])[1];
check('the checked subscribe choice starts only after the link is confirmed', db.prepare("SELECT status s FROM email_subs WHERE email=?").get('ann@example.com').s === 'active');
const plain = await post('/going', { ...base, email: 'plain@example.com', name: 'Plain', id: 'F1', intent: 'interested', alert: 0 });
const plainDone = await social(new Request('https://api.example.test/social/going/confirm', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ e: 'plain@example.com', t: new URL(plain.preview_link).searchParams.get('t'), next: ret, confirm: '1' }).toString() }), env, new URL('https://api.example.test/social/going/confirm'), json);
await plainDone.text();
check('an unchecked person is verified without joining the list', !db.prepare('SELECT id FROM email_subs WHERE email=?').get('plain@example.com'));
const auth = { Authorization: 'Bearer ' + token };
const save = await post('/going', { id: 'W1', intent: 'going', anchor: dates[0], date: dates[0], explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh', notify: 1 }, auth);
const row = db.prepare('SELECT intent i, attend_date a, anchor n, mail_status s FROM going_intents WHERE email=? AND anchor=?').get('ann@example.com', dates[0]);
check('going writes the attendance date and queues once', save.mail === 'queued' && row.i === 'going' && row.a === dates[0] && row.n === dates[0] && db.prepare('SELECT COUNT(*) n FROM going_sends').get().n === 1);
check('confirm adds the series favorite', db.prepare('SELECT card_id FROM going_favs WHERE email=?').get('ann@example.com').card_id === 'W1');
const interest = await post('/going', { id: 'W1', intent: 'interested', anchor: dates[1], date: dates[1], explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh' }, auth);
const irow = db.prepare('SELECT attend_date a, anchor n, mail_status s FROM going_intents WHERE email=? AND anchor=?').get('ann@example.com', dates[1]);
check('interested keeps the anchor and does not write an attendance date', interest.mail === 'queued' && !irow.a && irow.n === dates[1]);
const away = await post('/going', { id: 'W1', intent: 'absent', anchor: dates[0], explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh' }, auth);
const arow = db.prepare('SELECT intent i, mail_status s, attend_date a FROM going_intents WHERE email=? AND anchor=?').get('ann@example.com', dates[0]);
check('not going leaves the digest queue and keeps the favorite', away.mail === 'withheld' && arow.i === 'absent' && arow.s === 'none' && !arow.a && db.prepare('SELECT card_id FROM going_favs WHERE email=?').get('ann@example.com').card_id === 'W1');
const next = db.prepare('SELECT intent i FROM going_intents WHERE email=? AND anchor=?').get('ann@example.com', dates[2]);
check('the next show is not copied', !next);
const mine = await get('/going/mine', auth);
check('mine returns favorites and per-show rows', mine.favs.includes('W1') && mine.items.some(x => x.anchor === dates[1] && x.intent === 'interested' && x.date === ''));
const drop = await post('/going/unfav', { id: 'W1', explicit: 1 }, auth);
check('unfavorite cancels every saved show', drop.removed && !db.prepare("SELECT id FROM going_intents WHERE email=? AND status='active'").get('ann@example.com') && !db.prepare('SELECT card_id FROM going_favs WHERE email=?').get('ann@example.com'));
for (let n = 0; n < 3; n++) await post('/going', { ...base, email: 'cap@example.com', name: 'Cap', id: 'F1', intent: 'interested', dev: 'device-show-0002' });
const blocked = await post('/going', { ...base, email: 'cap@example.com', name: 'Cap', id: 'F1', intent: 'interested', dev: 'device-show-0002' });
check('the fourth mail in an hour is a plain retry', blocked._s === 429 && blocked.error === 'rate_limited' && !JSON.stringify(blocked).includes('cap@'));
const now = new Date().toISOString();
for (let n = 0; n < 10; n++) db.prepare('INSERT INTO going_confirm_log(email,dev,ip_hash,created_at) VALUES(?,?,?,?)').run('d' + n + '@example.com', 'device-full-0001', 'ip-other', now);
const overDev = await post('/going', { ...base, email: 'fresh@example.com', name: 'Fresh', id: 'F1', intent: 'interested', dev: 'device-full-0001' });
check('a full device gets the same retry, with no existence hint', overDev._s === 429 && overDev.error === 'rate_limited' && !JSON.stringify(overDev).includes('fresh@'));
const guestAway = await post('/going', { ...base, email: 'guest-away@example.com', name: 'Guest', id: 'W1', intent: 'absent', anchor: dates[0], date: dates[0] });
check('an unverified not-going is not stored and sends nothing', guestAway.ok && guestAway.stored === false && guestAway.mail === 'withheld' && !db.prepare('SELECT id FROM going_intents WHERE email=?').get('guest-away@example.com') && !db.prepare('SELECT id FROM going_pending WHERE email=?').get('guest-away@example.com'));
const realFetch = globalThis.fetch;
env.TURNSTILE_SECRET = 'present';
globalThis.fetch = async (url, opt) => String(url).includes('siteverify') ? { ok: true, json: async () => ({ success: false }) } : realFetch(url, opt);
const awayLater = await post('/going', { id: 'W1', intent: 'absent', anchor: dates[2], date: '', explicit: 1, disclose: 1, ts: '', ret, lang: 'zh' }, auth);
const awayLaterRow = db.prepare('SELECT intent i, mail_status s, attend_date a FROM going_intents WHERE email=? AND anchor=?').get('ann@example.com', dates[2]);
check('a verified not-going is stored without a human-check token', awayLater.mail === 'withheld' && awayLaterRow && awayLaterRow.i === 'absent' && awayLaterRow.s === 'none' && !awayLaterRow.a);
const noTs = await post('/going', { ...base, email: 'nots@example.com', name: 'NoTs', id: 'F1', intent: 'interested', ts: '', dev: 'device-nots-0001' });
check('intent confirm ignores a failing human check', noTs.confirm === true && noTs._s === 200 && !noTs.error);
const profileBlocked = await post('/profile', { name: 'NoTs', email: 'profile-ts@example.com', city: '上海', role: 'leader', lang: 'zh', alert: 0, ret, ts: '' });
check('profile still requires the human check', profileBlocked._s === 403 && profileBlocked.error === 'turnstile');
const restoreBlocked = await post('/going/restore', { email: 'ann@example.com', ret, ts: '', lang: 'zh' });
check('restore still requires the human check', restoreBlocked._s === 403 && restoreBlocked.error === 'turnstile');
delete env.TURNSTILE_SECRET;
globalThis.fetch = realFetch;
const dayNow = new Date().toISOString();
for (let n = 0; n < 10; n++) db.prepare('INSERT INTO going_confirm_log(email,dev,ip_hash,created_at) VALUES(?,?,?,?)').run('daycap@example.com', 'device-day-other', 'ip-day-other', dayNow);
const overDay = await post('/going', { ...base, email: 'daycap@example.com', name: 'Day', id: 'F1', intent: 'interested', dev: 'device-day-0001' });
check('the eleventh mail in a day is the same retry', overDay._s === 429 && overDay.error === 'rate_limited' && !JSON.stringify(overDay).includes('daycap@'));
const ipHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('203.0.113.9atm')))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
for (let n = 0; n < 10; n++) db.prepare('INSERT INTO going_confirm_log(email,dev,ip_hash,created_at) VALUES(?,?,?,?)').run('ip' + n + '@example.com', 'device-ip-other-' + n, ipHash, dayNow);
const overIp = await post('/going', { ...base, email: 'ipfresh@example.com', name: 'Ip', id: 'F1', intent: 'interested', dev: 'device-ip-fresh1' }, { 'CF-Connecting-IP': '203.0.113.9' });
check('the eleventh address from one ip in an hour is the same retry', overIp._s === 429 && overIp.error === 'rate_limited' && !JSON.stringify(overIp).includes('ipfresh@'));
const sched = digestSchedule({});
check('featured default is Monday 14:00 and still not approved', sched.weekday === 1 && sched.hour === 14 && sched.approved === false && sched.pendingReview === true);
const sub = fs.readFileSync(path.join(root, 'asia/asia-subscribe.js'), 'utf8');
check('menu subscribe no longer posts an empty token', !sub.includes("ts: ''") && sub.includes('turnstile') && sub.includes('/social/going/config'));
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going show ok');
