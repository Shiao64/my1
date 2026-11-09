// Star intent: profile, confirm-once, organizer mail + CC, idempotency, stats drafts.
// SOCIAL_MAIL=log. No network and no real email. Run: node social-worker/test/going.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { occurrenceDates, shYmd, generateGoingStats } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0009_going.sql'), 'utf8'));
db.exec(`
CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, code_hash TEXT, code_sent_at TEXT, code_tries INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE email_subs(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT, types TEXT NOT NULL DEFAULT 'featured,regular',
  cities TEXT NOT NULL DEFAULT 'all', lang TEXT NOT NULL DEFAULT 'en', status TEXT NOT NULL, confirm_hash TEXT, pending_since TEXT,
  unsub_token TEXT NOT NULL, created_at TEXT NOT NULL, confirmed_at TEXT, unsubscribed_at TEXT);
CREATE TABLE mail_unsub(email TEXT PRIMARY KEY, at TEXT NOT NULL);
`);
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const CARDS = {
  W1: { email: 'org@example.com', kind: 'weekly', weekday: 5, title: 'Friday Milonga', title_zh: '周五舞会' },
  F1: { email: 'fest@example.com', kind: 'event', start: '2026-09-01', end: '2026-09-03', title: 'Festival', title_zh: '节日' },
  NONE: { email: '', kind: 'weekly', weekday: 1, title: 'No mail' }
};
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log',
  ALLOW_NO_TURNSTILE: '1', PREVIEW_SHOW_CODE: '1', ADMIN_TOKEN: 'test-admin-token-not-a-secret',
  GOING_CARDS: CARDS, GOING_NOW: '2026-10-02T04:00:00Z'
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
const fail = [];
const check = (name, ok) => { if (!ok) fail.push(name); };
const mails = [];
const orig = console.log;
console.log = (...a) => {
  const s = a.map(x => typeof x === 'string' ? x : String(x)).join(' ');
  if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a);
};
const ret = 'https://tangoweekend.org/asia/?card=W1';
const dev = 'going-device-0001';
async function post(path, body, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(headers || {}) }, body: JSON.stringify(body)
  }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function get(path, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { headers: headers || {} }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
function orgMails() { return mails.filter(m => m.includes('cc=selecttango@gmail.com') && m.includes('to=org@example.com')); }
function userMails(to) { return mails.filter(m => m.includes('to=' + to) && !m.includes('cc=selecttango@gmail.com')); }
const base = { ts: 'x', dev, lang: 'en', ret, disclose: 1, explicit: 1, name: 'Ana', email: 'ana@example.com', city: 'Seoul', role: 'leader' };

const today = shYmd(Date.parse(env.GOING_NOW));
const dates = occurrenceDates(CARDS.W1, today, 4);
check('friday dates', dates.length >= 2 && dates.every(d => new Date(d + 'T00:00:00Z').getUTCDay() === 5) && dates[0] >= today);

const noRole = await post('/profile', { ...base, role: '' });
check('role required', noRole._s === 400 && noRole.error === 'need_role');
const noCity = await post('/profile', { ...base, city: '  ' });
check('city required', noCity._s === 400 && noCity.error === 'need_city');
const badRole = await post('/profile', { ...base, role: 'dj' });
check('role is not dj', badRole._s === 400 && badRole.error === 'need_role');
check('bad profile sent nothing', mails.length === 0);

const menu = await post('/profile', base);
check('menu verify', menu._s === 200 && menu.confirm && menu.mailed === false && menu.preview_link);
check('menu mail is not organizer', userMails('ana@example.com').length === 1 && orgMails().length === 0 && userMails('ana@example.com')[0].includes('does not email an organizer'));
const link = menu.preview_link;
const got = async (method, u, body) => social(new Request(u, { method, ...(body ? { body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } : {}) }), env, new URL(u), json);
const scan = await got('GET', link);
check('scanner does not confirm', (await scan.text()).includes('name="confirm"') && !db.prepare('SELECT verified_at v FROM users WHERE email=?').get('ana@example.com').v);
const done = await got('POST', 'https://api.tangoweekend.org/social/going/confirm', new URLSearchParams({ e: 'ana@example.com', t: new URL(link).searchParams.get('t'), next: ret, confirm: '1' }).toString());
const doneText = await done.text();
check('profile confirm is not organizer mail', done.status === 200 && doneText.includes('Profile saved') && !doneText.includes('notified') && orgMails().length === 0);
const token = (doneText.match(/atm=([0-9a-f]{64})/) || [])[1];
check('session issued', !!token && db.prepare('SELECT COUNT(*) n FROM sessions').get().n === 1);
check('no intent from menu', db.prepare('SELECT COUNT(*) n FROM going_intents').get().n === 0);

const auth = { Authorization: 'Bearer ' + token };
const star = await post('/going', { ...base, id: 'W1', intent: 'going', date: dates[0], notify: 1, transport: 0 }, auth);
check('session submit mails organizer', star._s === 200 && star.verified && star.mailed && star.mail === 'sent' && orgMails().length === 1);
const org = orgMails()[0];
check('cc and reply-to and assistant', org.includes('cc=selecttango@gmail.com') && org.includes('reply-to=ana@example.com') && org.includes('from=探戈助理') && org.includes('not a ticket') && !org.includes('Seoul') && !org.includes('leader'));
const again = await post('/going', { ...base, id: 'W1', intent: 'going', date: dates[0], notify: 0 }, auth);
check('same intent is idempotent', again.mail === 'unchanged' && again.mailed === false && orgMails().length === 1);
check('notify change did not mail', db.prepare('SELECT notify n FROM going_intents WHERE email=? AND card_id=?').get('ana@example.com', 'W1').n === 0);
const changed = await post('/going', { ...base, id: 'W1', intent: 'interested', date: dates[1], transport: 1 }, auth);
check('changed intent mails once more', changed.mail === 'sent' && orgMails().length === 2 && orgMails()[1].includes('Interested') && orgMails()[1].includes('Directions'));
const counts = await get('/going/counts?ids=W1,F1,NONE');
check('deduped count is one', counts.counts.W1 === 1 && !counts.counts.F1);
const cancel = await post('/going/cancel', { id: 'W1', explicit: 1 }, auth);
check('cancel sends nothing', cancel.cancelled && cancel.mailed === false && orgMails().length === 2);
check('cancel drops the count', (await get('/going/counts?ids=W1')).counts.W1 === undefined);

const pendingBefore = mails.length;
const fresh = await post('/going', { ...base, email: 'bea@example.com', name: 'Bea', id: 'F1', intent: 'interested', role: 'follower' });
check('unverified explicit does not mail organizer', fresh.confirm && fresh.mailed === false && orgMails().length === 2 && userMails('bea@example.com').length === 1);
check('pending stored', db.prepare("SELECT intent i FROM going_pending WHERE email=? AND consumed_at IS NULL").get('bea@example.com').i === 'interested');
check('unverified not counted', (await get('/going/counts?ids=F1')).counts.F1 === undefined);
const beaLink = fresh.preview_link;
const beaDone = await got('POST', 'https://api.tangoweekend.org/social/going/confirm', new URLSearchParams({ e: 'bea@example.com', t: new URL(beaLink).searchParams.get('t'), next: 'https://tangoweekend.org/asia/?card=F1', confirm: '1' }).toString());
const beaText = await beaDone.text();
check('verify then organizer', beaText.includes('notified') && mails.some(m => m.includes('to=fest@example.com') && m.includes('cc=selecttango@gmail.com') && m.includes('reply-to=bea@example.com')));
check('featured counted after verify', (await get('/going/counts?ids=F1')).counts.F1 === 1);

const none = await post('/going', { ...base, id: 'NONE', intent: 'going' }, auth);
check('no organizer email rejected', none._s === 404 && none.error === 'no_organizer' && orgMails().length === 2);
const openOnly = await post('/going', { ...base, id: 'W1', intent: 'going', explicit: 0 }, auth);
check('opening without confirm does not mail', openOnly._s === 400 && openOnly.error === 'need_explicit' && orgMails().length === 2);

const imp = await post('/going', { ...base, email: 'ana@example.com', id: 'F1', intent: 'going' });
check('typed verified email is not a session', !imp.token && imp.confirm && imp.mailed === false);
const mine = await get('/going/mine', auth);
check('mine is the session user', mine.email === 'ana@example.com' && mine.role === 'leader' && mine.city === 'Seoul');
const stranger = await get('/going/mine');
check('mine requires session', stranger._s === 401);

db.prepare("UPDATE users SET city=NULL, role=NULL WHERE email=?").run('ana@example.com');
const gap = await post('/going', { id: 'W1', intent: 'going', explicit: 1, disclose: 1, ts: 'x', ret, lang: 'en' }, auth);
check('session can fill missing fields without a new verify mail', gap._s === 400 && gap.need_profile);
const anaBefore = userMails('ana@example.com').length;
const filled = await post('/going', { id: 'W1', intent: 'going', date: dates[0], explicit: 1, disclose: 1, ts: 'x', ret, lang: 'zh', city: 'Busan', role: 'both', name: 'Ana' }, auth);
check('filled profile submits', filled._s === 200 && filled.verified && db.prepare('SELECT role r, city c FROM users WHERE email=?').get('ana@example.com').r === 'both');
check('fill did not send another verify to ana', userMails('ana@example.com').length === anaBefore);

const ts = new Date().toISOString();
db.prepare("INSERT INTO going_intents(email,card_id,intent,occurrence_date,transport,notify,status,mail_status,created_at,updated_at) VALUES('q@example.com','W1','going','2026-08-07',0,1,'active','sent',?,?)").run(ts, ts);
db.prepare("INSERT INTO going_intents(email,card_id,intent,occurrence_date,transport,notify,status,mail_status,created_at,updated_at) VALUES('q@example.com','W2','interested','2026-08-14',0,1,'active','sent',?,?)").run(ts, ts);
const beforeStats = mails.length;
const off = await generateGoingStats(env, { ID_RE: /^[A-Za-z0-9_-]{1,64}$/, EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, clean: (s, n) => String(s || '').slice(0, n) });
check('stats off by default', off.enabled === false && db.prepare('SELECT COUNT(*) n FROM going_reports').get().n === 0);
const run = await post('/admin/going-reports/run', {}, { Authorization: 'Bearer test-admin-token-not-a-secret' });
check('admin run creates drafts only', run.ok && run.sent === false && run.created.includes('regular:2026Q3') && run.created.includes('featured:F1'));
const run2 = await post('/admin/going-reports/run', {}, { Authorization: 'Bearer test-admin-token-not-a-secret' });
check('stats retry does not duplicate', run2.created.length === 0 && db.prepare('SELECT COUNT(*) n FROM going_reports').get().n === run.created.length);
const report = await get('/admin/going-reports?key=regular:2026Q3', { Authorization: 'Bearer test-admin-token-not-a-secret' });
check('report is review and labeled', report.status === 'review' && report.tz === 'Asia/Shanghai' && report.body.unique_emails >= 1 && /not unique people/.test(report.body.note) && report.sent === false);
check('stats sent no mail', mails.length === beforeStats);
const denied = await get('/admin/going-reports');
check('stats admin is closed', denied._s === 401);
check('no public report route', (await get('/going/reports'))._s === 404 || (await get('/going/reports')).error === 'not_found');

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going tests ok', { mails: mails.length, pendingBefore });
