// Single-letter organizer mail for one visitor. No network and no real email.
// Run: node social-worker/test/going-test-send.test.mjs
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-test-send';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { occurrenceDates, shYmd, runGoingDigests, testLetterOn, dancerLine } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0011_going_digests.sql']) {
  db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', file), 'utf8'));
}
db.exec(`
CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, code_hash TEXT, code_sent_at TEXT, code_tries INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE email_subs(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT, types TEXT, cities TEXT, lang TEXT, status TEXT,
  confirm_hash TEXT, pending_since TEXT, unsub_token TEXT, created_at TEXT, confirmed_at TEXT, unsubscribed_at TEXT);
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
const DANCER = 'shiaochang@icloud.com';
const CARDS = {
  DIR: { email: '', kind: 'weekly', weekday: 5, time: '20:00-23:00', title: 'Directory night', title_zh: '目录之夜' },
  OTH: { email: '', kind: 'weekly', weekday: 5, time: '20:00-23:00', title: 'Other org', title_zh: '另一组织' },
  PUB: { email: 'public-org@example.com', kind: 'event', title: 'Public fest', title_zh: '公开节日' },
  NONE: { email: '', kind: 'event', title: 'No address', title_zh: '无地址' },
  OLD: { email: 'old-org@example.com', kind: 'event', title: 'Already saved', title_zh: '早先保存' }
};
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log',
  ALLOW_NO_TURNSTILE: '1', GOING_CARDS: CARDS, GOING_NOW: '2026-10-02T04:00:00Z',
  GOING_ORG_DIR: {
    orgs: { O114: 'dir-o114@example.com', O77: 'dir-other@example.com' },
    links: { DIR: ['O114'], OTH: ['O77'] },
    cards: {}
  }
};
const kit = { ID_RE: /^[A-Za-z0-9_-]{1,64}$/, EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
const fail = [];
const check = (name, ok) => { if (!ok) fail.push(name); };
const mails = [];
const orig = console.log;
console.log = (...a) => {
  const s = a.map(x => typeof x === 'string' ? x : String(x)).join(' ');
  if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a);
};
const sha = s => createHash('sha256').update(s).digest('hex');
const now = '2026-10-02T04:00:00.000Z';
function user(email, name) {
  db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at,city,role) VALUES(?,?,?,?,?,?,?)').run(email, name, 'zh', now, now, 'Shanghai', 'leader');
  const id = db.prepare('SELECT id FROM users WHERE email=?').get(email).id;
  const token = sha(email).slice(0, 64);
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(token), id, now);
  return token;
}
const dancerToken = user(DANCER, 'Shiao');
const otherToken = user('visitor@example.com', 'Visitor');
const ret = 'https://tangoweekend.org/asia/?card=DIR';
const dates = occurrenceDates(CARDS.DIR, shYmd(Date.parse(env.GOING_NOW)), 3);
async function post(path, body, token, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(headers || {}) },
    body: JSON.stringify(body)
  }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
function going(token, id, intent, extra) {
  return post('/going', { id, intent, anchor: dates[0], date: intent === 'going' ? dates[0] : '', explicit: 1, disclose: 1, notify: 1, transport: 0, ts: 'x', ret, lang: 'zh', ...(extra || {}) }, token);
}
const orgMails = () => mails.filter(m => m.includes('to=dir-o114@example.com') || m.includes('to=dir-other@example.com') || m.includes('to=public-org@example.com') || m.includes('to=old-org@example.com'));
const goingSrc = fs.readFileSync(path.join(root, 'social-worker/src/going.js'), 'utf8');
const star = fs.readFileSync(path.join(root, 'asia/atm-star.js'), 'utf8');

check('flag off matches nobody', testLetterOn(env, DANCER, kit) === false);
check('dancer address is not hardcoded in the worker', !goingSrc.includes(DANCER) && !goingSrc.includes('O114') && !goingSrc.includes('dir-o114@'));
check('toast source does not lock a saved intent when mail fails', star.includes('function noticeLine') && star.includes('function unlock') && !star.includes('function mailBad') && star.includes("return L.savedShort") && !/savedOk[\s\S]{0,180}mailBad/.test(star));

const before = orgMails().length;
const off = await going(dancerToken, 'DIR', 'going');
check('unset flag saves and does not mail', off.ok && off.notice === 'off' && off.mailed === false && off.mail === 'queued' && orgMails().length === before);
const cap = [];
for (const intent of ['going', 'going', 'going', 'going']) cap.push(await going(otherToken, 'DIR', intent));
check('other visitors stay saved with no notification failure', cap.every(d => d.ok && d.notice === 'off' && d.mailed === false && d.mail !== 'rate_limited' && d._s === 200) && orgMails().length === before && db.prepare('SELECT COUNT(*) n FROM going_sends').get().n === 0);

env.GOING_TEST_SEND = 'on';
check('flag on without a dancer address still matches nobody', testLetterOn(env, DANCER, kit) === false);
const noDancer = await going(dancerToken, 'OTH', 'going');
check('missing dancer env does not mail', noDancer.notice === 'off' && noDancer.mailed === false && orgMails().length === before);

env.GOING_TEST_DANCER = DANCER;
check('only that dancer is enabled', testLetterOn(env, DANCER, kit) === true && testLetterOn(env, 'visitor@example.com', kit) === false);
const queuedBefore = db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='DIR'").get(DANCER).s;
check('the earlier save is still unsent', queuedBefore === 'queued');
const swept = await runGoingDigests(env, kit);
check('turning the flag on does not backfill or run the digest', swept.enabled === false && swept.sent === 0 && orgMails().length === before);
db.prepare("INSERT INTO going_intents(email,card_id,anchor,intent,transport,notify,status,mail_status,created_at,updated_at) VALUES(?,?,?,?,0,1,'active','queued',?,?)").run(DANCER, 'OLD', '', 'going', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z');
const still = await runGoingDigests({ ...env, GOING_DIGEST_SEND: '' }, kit);
check('an older queued intent is not mailed', still.enabled === false && !orgMails().some(m => m.includes('to=old-org@example.com')) && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='OLD'").get(DANCER).s === 'queued');

const first = await going(dancerToken, 'DIR', 'interested');
const firstMail = orgMails().filter(m => m.includes('to=dir-o114@example.com'));
check('a new interested submission is refused and the going row stays', first._s === 400 && first.error === 'interested_closed' && first.stored === false && firstMail.length === 0 && db.prepare("SELECT intent i, mail_status s FROM going_intents WHERE email=? AND card_id='DIR' AND anchor=?").get(DANCER, dates[0]).i === 'going' && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='DIR' AND anchor=?").get(DANCER, dates[0]).s === 'queued');
const sample = dancerLine('探戈助理', 'follower', '北京');
check('wording shape is name, role, from city', sample.zh === '探戈助理，跟舞，来自北京' && sample.en === '探戈助理, follower, from 北京' && dancerLine('Tango Assistant', 'follower', 'Beijing').en === 'Tango Assistant, follower, from Beijing' && dancerLine('Tango Assistant', 'follower', 'Beijing').zh === 'Tango Assistant，跟舞，来自Beijing');
check('both is 都可 / both', dancerLine('A', 'both', '北京').zh === 'A，都可，来自北京' && dancerLine('A', 'both', '北京').en === 'A, both, from 北京');
check('a missing city or role is omitted', dancerLine('A', 'leader', '').zh === 'A，领舞' && dancerLine('A', 'leader', '').en === 'A, leader' && dancerLine('A', '', '北京').zh === 'A，来自北京' && dancerLine('A', '', '北京').en === 'A, from 北京' && dancerLine('A', '', '').zh === 'A' && dancerLine('A', '', '').en === 'A');
check('the unsent earlier Going was not sent', orgMails().filter(m => m.includes('要参加') && m.includes('to=dir-o114@example.com')).length === 0);
check('the going row stays queued', db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='DIR' AND anchor=?").get(DANCER, dates[0]).s === 'queued');

const again = await going(dancerToken, 'DIR', 'interested');
check('interested again is refused and does not mail', again._s === 400 && again.error === 'interested_closed' && orgMails().filter(m => m.includes('to=dir-o114@example.com')).length === 0);

const other = await going(otherToken, 'OTH', 'going');
check('another visitor still only saves', other.notice === 'off' && other.mailed === false && !orgMails().some(m => m.includes('to=dir-other@example.com')));

const secondOrg = await going(dancerToken, 'OTH', 'going');
check('a different organizer is mailed through the same lookup', secondOrg.notice === 'sent' && orgMails().some(m => m.includes('to=dir-other@example.com') && m.includes('cc=' + DANCER)));
const pub = await going(dancerToken, 'PUB', 'going');
check('a public card address is mailed too', pub.notice === 'sent' && orgMails().some(m => m.includes('to=public-org@example.com') && m.includes('探友Shiao（领舞，Shanghai）') && m.includes('Dancer Shiao (leader, Shanghai)')));

const away = await going(dancerToken, 'DIR', 'absent');
check('a new not-going is refused and does not send', away._s === 400 && away.error === 'absent_closed' && away.stored === false && orgMails().filter(m => m.includes('to=dir-o114@example.com')).length === 0);
db.prepare('UPDATE users SET city=?, role=? WHERE email=?').run('北京', 'follower', DANCER);
const shaped = await going(dancerToken, 'DIR', 'going');
const shapedMail = orgMails().filter(m => m.includes('to=dir-o114@example.com')).pop();
check('a later regular letter uses 跟舞 and the city', shaped.notice === 'sent' && shapedMail.includes('subject=ATM Website · Event Attendance Notice') && shapedMail.includes('探友Shiao（跟舞，北京）') && shapedMail.includes('Dancer Shiao (follower, 北京)') && shapedMail.includes('勾选了要参加') && shapedMail.includes('going to') && shapedMail.includes('对方已在抄送里，请「回复全部」。') && !shapedMail.includes('希望收到交通指引') && !shapedMail.includes('asked for directions'));
db.prepare('UPDATE users SET city=NULL, role=NULL WHERE email=?').run(DANCER);
const partial = await going(dancerToken, 'DIR', 'interested');
const partialCount = orgMails().filter(m => m.includes('to=dir-o114@example.com')).length;
check('interested after a letter is refused and does not send another', partial._s === 400 && partial.error === 'interested_closed' && partial.stored === false && partialCount === 1 && db.prepare("SELECT intent i FROM going_intents WHERE email=? AND card_id='DIR' AND anchor=?").get(DANCER, dates[0]).i === 'going');
const unfav = await post('/going/unfav', { id: 'OTH', explicit: 1 }, dancerToken);
check('unfavorite saves and does not mail', unfav.ok && unfav.removed && unfav.notice === 'off' && unfav.mailed === false && orgMails().filter(m => m.includes('to=dir-other@example.com')).length === 1);

const missing = await going(dancerToken, 'NONE', 'going');
check('a missing directory address is saved and is not called a send failure', missing.ok && missing.notice === 'missing' && missing.mail === 'no_organizer' && missing.mailed === false && db.prepare("SELECT intent i, mail_status s FROM going_intents WHERE email=? AND card_id='NONE'").get(DANCER).i === 'going');

const flips = [];
for (const intent of ['interested', 'going', 'interested', 'going']) flips.push(await going(dancerToken, 'PUB', intent));
check('Going changes still save and Interested is refused', flips[0]._s === 400 && flips[0].error === 'interested_closed' && flips[1].ok && flips[1].notice !== 'failed' && flips[2]._s === 400 && flips[3].ok && flips[3].notice !== 'failed');

const ip = '203.0.113.9';
const iph = sha(ip + 'atm').slice(0, 16);
for (let i = 0; i < 12; i++) db.prepare('INSERT INTO going_sends(email,card_id,ip_hash,created_at) VALUES(?,?,?,?)').run('other' + i + '@example.com', 'PUB', iph, new Date().toISOString());
const capped = await going(dancerToken, 'OTH', 'interested', {});
const cappedIp = await post('/going', { id: 'OTH', intent: 'going', anchor: dates[1], date: dates[1], explicit: 1, disclose: 1, notify: 1, transport: 0, ts: 'x', ret, lang: 'zh' }, dancerToken, { 'CF-Connecting-IP': ip });
check('ip cap still saves, names the wait, and does not send', cappedIp.ok && cappedIp.notice === 'failed' && cappedIp.mailed === false && cappedIp.wait > 0 && db.prepare("SELECT intent i FROM going_intents WHERE email=? AND card_id='OTH' AND anchor=?").get(DANCER, dates[1]).i === 'going');
check('the ip cap did not apply to the previous address', capped._s === 400 && capped.error === 'interested_closed' && !capped.wait);

const realFetch = globalThis.fetch;
let resendCalls = [];
globalThis.fetch = async (url, opt) => {
  if (String(url).includes('api.resend.com')) {
    resendCalls.push(String(opt && opt.body || ''));
    if (resendCalls.length === 1) return { ok: false, status: 500, text: async () => 'no' };
    return { ok: true, status: 200, text: async () => '{}' };
  }
  return realFetch(url, opt);
};
env.SOCIAL_MAIL = 'resend';
env.RESEND_API_KEY = 'test-key';
const failed = await going(dancerToken, 'OLD', 'going');
check('a send failure still saves', failed.ok && failed.notice === 'failed' && failed.mailed === false && db.prepare("SELECT intent i, status s FROM going_intents WHERE email=? AND card_id='OLD'").get(DANCER).i === 'going' && db.prepare("SELECT status s FROM going_intents WHERE email=? AND card_id='OLD'").get(DANCER).s === 'active');
const dropped = await going(dancerToken, 'OLD', 'absent');
check('not going after a failed letter is refused and sends nothing', dropped._s === 400 && dropped.error === 'absent_closed' && resendCalls.length === 1 && db.prepare("SELECT intent i FROM going_intents WHERE email=? AND card_id='OLD'").get(DANCER).i === 'going');
const final = await going(dancerToken, 'OLD', 'interested');
check('interested after a failed Going letter is refused', final._s === 400 && final.error === 'interested_closed' && final.stored === false && resendCalls.length === 1 && db.prepare("SELECT intent i FROM going_intents WHERE email=? AND card_id='OLD'").get(DANCER).i === 'going');
globalThis.fetch = realFetch;

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going test-send ok', { letters: orgMails().length });
