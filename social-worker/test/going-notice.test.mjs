// Per-event update queue. Log mail only. Run: node social-worker/test/going-notice.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-notice';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { noticesFromCard } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0009_going.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0010_going_notices.sql'), 'utf8'));
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, code_hash TEXT, code_sent_at TEXT, code_tries INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const CARDS = {
  NOTE: { email: 'org@example.com', kind: 'event', title: 'Notes', note: 'Early bird until Nov 1. Registration closes sometime.' },
  CHG: { email: 'org@example.com', kind: 'weekly', weekday: 5, title: 'Friday', temp_notices: [{ status: 'changed', date: '2026-11-20', time: '21:00–23:00', text: '场地临时调整', text_en: 'Venue moved' }] },
  NODATE: { email: 'org@example.com', kind: 'event', title: 'Vague', temp_notices: [{ status: 'cancelled', text: 'sometime later' }], alerts: [{ kind: 'early_bird_end', reviewed: true, text: 'ends soon' }] },
  DRAFT: { email: 'org@example.com', kind: 'event', title: 'Draft', alerts: [{ kind: 'early_bird_start', date: '2026-11-01', reviewed: false, text: 'not published' }] },
  BIRD: { email: 'org@example.com', kind: 'event', start: '2026-12-01', end: '2026-12-03', title: 'Festival', title_zh: '节日', alerts: [{ kind: 'early_bird_end', date: '2026-11-30', reviewed: 1, text: '早鸟到11/30', text_en: 'Early bird ends 30 Nov' }] }
};
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log',
  ALLOW_NO_TURNSTILE: '1', ADMIN_TOKEN: 'test-admin-token-not-a-secret', GOING_CARDS: CARDS, GOING_NOW: '2026-11-09T02:00:00Z'
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const auth = { Authorization: 'Bearer test-admin-token-not-a-secret' };
async function post(path, body, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(headers || {}) }, body: JSON.stringify(body || {}) }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function get(path, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { headers: headers || {} }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
check('notes are not dates', noticesFromCard({ id: 'NOTE', note: CARDS.NOTE.note, temp_notices: [], alerts: [] }).length === 0);
check('undated cancel is dropped', noticesFromCard(CARDS.NODATE).length === 0);
check('unreviewed alert is dropped', noticesFromCard(CARDS.DRAFT).length === 0);
check('dated change and reviewed early bird stay', noticesFromCard({ ...CARDS.CHG, id: 'CHG' }).length === 1 && noticesFromCard({ ...CARDS.BIRD, id: 'BIRD' }).some(n => n.kind === 'early_bird_end' && n.event_date === '2026-11-30'));

const dry = await post('/admin/going-notices/run', {}, auth);
check('enqueue without send', dry.ok && dry.enabled === false && dry.created.length === 2 && mails.length === 0);
check('queue has change and early bird only', db.prepare("SELECT COUNT(*) n FROM going_notice_queue WHERE kind IN ('change','early_bird_end')").get().n === 2);
check('no invented notice', db.prepare("SELECT COUNT(*) n FROM going_notice_queue WHERE card_id IN ('NOTE','NODATE','DRAFT')").get().n === 0);
const again = await post('/admin/going-notices/run', {}, auth);
check('enqueue is idempotent', again.created.length === 0);

const now = new Date().toISOString();
db.prepare("INSERT INTO users(email,name,lang,verified_at,created_at) VALUES('on@example.com','On','zh',?,?)").run(now, now);
db.prepare("INSERT INTO users(email,name,lang,verified_at,created_at) VALUES('off@example.com','Off','en',?,?)").run(now, now);
db.prepare("INSERT INTO going_intents(email,card_id,intent,transport,notify,status,mail_status,created_at,updated_at) VALUES('on@example.com','BIRD','going',0,1,'active','sent',?,?)").run(now, now);
db.prepare("INSERT INTO going_intents(email,card_id,intent,transport,notify,status,mail_status,created_at,updated_at) VALUES('off@example.com','BIRD','interested',0,0,'active','sent',?,?)").run(now, now);
db.prepare("UPDATE going_notice_queue SET status='sent' WHERE card_id!='BIRD'").run();
env.GOING_NOTICE_SEND = 'on';
const sent = await post('/admin/going-notices/run', {}, auth);
check('only the opted-in address is mailed', sent.enabled === true && sent.sent === 1 && sent.skipped === 1);
const bird = mails.filter(m => m.includes('to=on@example.com'));
check('user mail has no organizer cc', bird.length === 1 && !bird[0].includes('cc=') && bird[0].includes('2026-11-30') && bird[0].includes('from=探戈助理'));
check('unsubscribed person got nothing', !mails.some(m => m.includes('to=off@example.com')));
check('unsubscribe keeps the intent', db.prepare("SELECT status s, intent i FROM going_intents WHERE email='off@example.com'").get().s === 'active');
const sent2 = await post('/admin/going-notices/run', {}, auth);
check('second send does not repeat', sent2.sent === 0 && mails.filter(m => m.includes('to=on@example.com')).length === 1);

const denied = await post('/admin/going-notices', { card_id: 'BIRD', kind: 'host', text: 'hello', reviewed: 0 }, auth);
check('unreviewed host message is refused', denied._s === 400 && denied.error === 'need_review' && db.prepare("SELECT COUNT(*) n FROM going_notice_queue WHERE kind='host'").get().n === 0);
const host = await post('/admin/going-notices', { card_id: 'BIRD', kind: 'host', text: '欢迎来', text_en: 'Welcome', reviewed: 1 }, auth);
check('reviewed host message is queued and not sent yet', host.ok && host.queued && host.sent === false);
env.SOCIAL_MAIL = 'gmail';
const failed = await post('/admin/going-notices/run', {}, auth);
check('send failure is recorded', failed.failed === 1 && db.prepare("SELECT status FROM going_notice_sends WHERE email='on@example.com' AND status='failed'").get());
env.SOCIAL_MAIL = 'log';
check('failure did not claim delivery', !mails.some(m => m.includes('Welcome') && m.includes('cc=')));

const list = await get('/admin/going-notices', auth);
check('review list is readable and send flag is visible', list.items.length >= 2 && list.send_enabled === true);
check('public cannot read the queue', (await get('/admin/going-notices'))._s === 401);

const linkMail = mails.find(m => m.includes('to=on@example.com') && m.includes('/social/going/unsub'));
const unsubUrl = (linkMail.match(/https:\/\/api\.tangoweekend\.org\/social\/going\/unsub\?[^\s]+/) || [])[0];
check('mail has an unsubscribe link', !!unsubUrl);
const got = (method, u, body) => social(new Request(u, { method, ...(body ? { body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } : {}) }), env, new URL(u), json);
const scan = await got('GET', unsubUrl);
check('scanner does not unsubscribe', (await scan.text()).includes('name="confirm"') && db.prepare("SELECT notify n FROM going_intents WHERE email='on@example.com'").get().n === 1);
const u = new URL(unsubUrl);
const off = await got('POST', 'https://api.tangoweekend.org/social/going/unsub', new URLSearchParams({ e: u.searchParams.get('e'), c: u.searchParams.get('c'), t: u.searchParams.get('t'), confirm: '1' }).toString());
check('unsubscribe keeps Going', (await off.text()).includes('Going') && db.prepare("SELECT status s, notify n, intent i FROM going_intents WHERE email='on@example.com'").get().s === 'active' && db.prepare("SELECT notify n FROM going_intents WHERE email='on@example.com'").get().n === 0);

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going notice tests ok', { mails: mails.length });
