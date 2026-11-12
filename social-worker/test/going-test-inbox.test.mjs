// Test-inbox copy of an organizer letter. No network and no real email.
// Run: node social-worker/test/going-test-inbox.test.mjs
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-test-inbox';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { occurrenceDates, shYmd, runGoingDigests, testInboxOf, testLetterOn, weekSlot, digestSchedule } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

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
const DANCER = 'owner-test@example.com';
const VISITOR = 'visitor@example.com';
const INBOX = 'going-inbox@example.com';
const ORG = 'dir-o114@example.com';
const CARDS = {
  DIR: { email: '', kind: 'weekly', weekday: 5, time: '20:00-23:00', title: 'Directory night', title_zh: '目录之夜', region: 'China', country: 'China' },
  OTH: { email: '', kind: 'weekly', weekday: 5, time: '20:00-23:00', title: 'Other org', title_zh: '另一组织', region: 'China' },
  PUB: { email: 'public-org@example.com', kind: 'event', title: 'Public fest', title_zh: '公开节日', region: 'China' },
  NONE: { email: '', kind: 'event', title: 'No address', title_zh: '无地址' },
  EN: { email: 'en-org@example.com', kind: 'event', title: 'English night', title_zh: '英文之夜', region: 'United States', country: 'United States', organizers: ['En Host'], organizers_en: ['En Host'] },
  FCOPY: { email: 'fcopy-org@example.com', kind: 'event', title: 'Featured copy', title_zh: '特色副本', region: 'China' },
  FCTL: { email: 'fctl-org@example.com', kind: 'event', title: 'Featured control', title_zh: '特色对照', region: 'China' }
};
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log',
  ALLOW_NO_TURNSTILE: '1', GOING_CARDS: CARDS, GOING_NOW: '2026-10-02T04:00:00.000Z',
  GOING_ORG_DIR: {
    orgs: { O114: 'dir-o114@example.com', O77: 'dir-other@example.com' },
    names: { O114: { name: '目录夜主办', name_en: 'Directory Host', lang: 'zh' } },
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
const dancerToken = user(DANCER, 'Owner');
const visitorToken = user(VISITOR, 'Visitor');
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
function going(token, id, intent, extra, headers) {
  return post('/going', { id, intent, anchor: dates[0], date: intent === 'going' ? dates[0] : '', explicit: 1, disclose: 1, notify: 1, transport: 0, ts: 'x', ret, lang: 'zh', ...(extra || {}) }, token, headers);
}
function rowOf(email, id, anchor) {
  return db.prepare('SELECT intent i, mail_status s, mail_fp fp, status st FROM going_intents WHERE email=? AND card_id=? AND anchor=?').get(email, id, anchor == null ? dates[0] : anchor);
}
function head(mail) { return String(mail || '').split('\n')[0]; }
const toInbox = () => mails.filter(m => head(m).includes('to=' + INBOX));
const goingSrc = fs.readFileSync(path.join(root, 'social-worker/src/going.js'), 'utf8');
const toml = fs.readFileSync(path.join(root, 'subscribe-worker/wrangler.toml'), 'utf8');
const doc = fs.readFileSync(path.join(root, 'docs/going.md'), 'utf8');

check('inbox is read from the env var only', /pickEmail\(env\.GOING_TEST_INBOX/.test(goingSrc) && !/GOING_TEST_INBOX[\s\S]{0,120}selecttango/.test(goingSrc));
check('docs name the var and wrangler does not assign it', doc.includes('GOING_TEST_INBOX') && doc.includes('test_redirected') && doc.includes('selecttango@gmail.com') && !/^\s*GOING_TEST_INBOX\s*=/m.test(toml) && toml.includes('GOING_TEST_INBOX stays unset'));
check('unset inbox matches nobody', testInboxOf(env, VISITOR, kit) === '' && testLetterOn(env, DANCER, kit) === false);

const before = mails.length;
const saved = await going(visitorToken, 'DIR', 'going');
check('unset inbox saves and does not mail', saved.ok && saved.notice === 'off' && saved.mailed === false && saved.mail === 'queued' && mails.length === before && rowOf(VISITOR, 'DIR').s === 'queued');

env.GOING_TEST_INBOX = INBOX;
env.GOING_TEST_SEND = 'on';
env.GOING_TEST_DANCER = DANCER;
check('inbox is on for the other dancer only', testInboxOf(env, VISITOR, kit) === INBOX && testInboxOf(env, DANCER, kit) === '' && testLetterOn(env, DANCER, kit) === true);

const copied = await going(visitorToken, 'DIR', 'going');
const copy = toInbox();
const copyHead = head(copy[0]);
check('a later confirm of the unsent save copies once', copied.ok && copied.notice === 'off' && copied.mailed === false && copied.mail === 'test_redirected' && copy.length === 1);
check('copy is only to the inbox', copyHead.includes('from=探戈助理') && copyHead.includes('to=' + INBOX) && !copyHead.includes(' cc=') && !copyHead.includes(' reply-to=') && !copyHead.includes(ORG) && !copyHead.includes(VISITOR) && !copyHead.includes('selecttango') && !copyHead.includes('guazong'));
check('subject is the real title with a test mark', copyHead.includes('subject=「[测试]」[TEST] ATM 网站 · 活动参加通知'));
check('body is the real letter plus the organizer line', copy[0].includes('「[测试]」这封信没有发给主办方。真正的收件人会是主办方 O114 目录夜主办（di***@example.com）。') && copy[0].includes('[TEST] This message was not sent to the organizer. The real recipient would have been organizer O114 目录夜主办 (di***@example.com).') && copy[0].includes('探友Visitor（领舞，Shanghai）勾选了要参加') && copy[0].includes('Dancer Visitor (leader, Shanghai) has selected that they are going to') && copy[0].includes('对方已在抄送里，请「回复全部」。') && copy[0].includes('They are copied on this message; please “Reply all”.') && !copy[0].includes(ORG) && !copy[0].includes('guazong@') && copy[0].indexOf('真正的收件人会是主办方') < copy[0].indexOf('勾选了要参加'));
check('row is test_redirected and logged', rowOf(VISITOR, 'DIR').s === 'test_redirected' && rowOf(VISITOR, 'DIR').fp === 'going|' + dates[0] + '|0' && db.prepare('SELECT COUNT(*) n FROM going_sends WHERE email=? AND card_id=?').get(VISITOR, 'DIR').n === 1);

const again = await going(visitorToken, 'DIR', 'going');
check('the same facts are not copied again', again.notice === 'off' && again.mailed === false && again.mail === 'unchanged' && toInbox().length === 1 && rowOf(VISITOR, 'DIR').s === 'test_redirected');

const interest = await going(visitorToken, 'DIR', 'interested');
check('a changed intent copies the new letter only', interest.notice === 'off' && interest.mail === 'test_redirected' && toInbox().length === 2 && toInbox()[1].includes('subject=「[测试]」[TEST] ATM 网站 · 活动兴趣通知') && toInbox()[1].includes('勾选了对你的以下活动感兴趣') && !toInbox()[1].includes('勾选了要参加') && rowOf(VISITOR, 'DIR').fp.startsWith('interested|'));

const ride = await going(visitorToken, 'DIR', 'going', { transport: 1 });
check('a directions change copies again', ride.mail === 'test_redirected' && toInbox().length === 3 && toInbox()[2].includes('希望收到交通指引') && rowOf(VISITOR, 'DIR').fp.endsWith('|1'));

const away = await going(visitorToken, 'DIR', 'absent');
check('not going saves and does not copy', away.notice === 'off' && away.mail === 'withheld' && away.mailed === false && toInbox().length === 3);

const ownerMailBefore = mails.filter(m => head(m).includes('to=dir-other@example.com')).length;
const owner = await going(dancerToken, 'OTH', 'going');
const ownerMail = mails.filter(m => head(m).includes('to=dir-other@example.com'));
check('the test dancer still reaches the organizer', owner.notice === 'sent' && owner.mailed === true && owner.mail === 'sent' && ownerMail.length === ownerMailBefore + 1);
check('that letter keeps organizer, cc, and reply-to', head(ownerMail[0]).includes('to=dir-other@example.com') && head(ownerMail[0]).includes('cc=' + DANCER + ', selecttango@gmail.com, guazong@mail.grokbot.com') && head(ownerMail[0]).includes('reply-to=' + DANCER) && !head(ownerMail[0]).includes('「[测试]」') && !head(ownerMail[0]).includes('to=' + INBOX) && rowOf(DANCER, 'OTH').s === 'sent');

const orgInbox = 'dir-o114@example.com';
env.GOING_TEST_INBOX = orgInbox;
const blockedOrg = user('nomail-org@example.com', 'Nomail');
const orgTry = await going(blockedOrg, 'DIR', 'going');
check('an inbox that is the organizer does not send', orgTry.notice === 'off' && orgTry.mail === 'queued' && orgTry.mailed === false && !mails.some(m => head(m).includes('to=' + orgInbox)) && rowOf('nomail-org@example.com', 'DIR').s === 'queued');

env.GOING_TEST_INBOX = 'self-copy@example.com';
const selfToken = user('self-copy@example.com', 'Self');
const selfTry = await going(selfToken, 'OTH', 'interested');
check('an inbox that is the dancer does not send', selfTry.notice === 'off' && selfTry.mail === 'queued' && !mails.some(m => head(m).includes('to=self-copy@example.com')));

env.GOING_TEST_INBOX = INBOX;
env.GOING_NOTICE_SEND = 'on';
const heldToken = user('held@example.com', 'Held');
const held = await going(heldToken, 'PUB', 'going');
check('global send on does not copy', held.notice === 'off' && held.mail === 'queued' && held.mailed === false && !mails.some(m => head(m).includes('to=public-org@example.com')) && toInbox().length === 3);
env.GOING_NOTICE_SEND = '';
const heldCopy = await going(heldToken, 'PUB', 'going');
check('turning global send off copies on the next confirm', heldCopy.mail === 'test_redirected' && heldCopy.notice === 'off' && toInbox().length === 4 && rowOf('held@example.com', 'PUB', '').s === 'test_redirected');
env.GOING_NOTICE_SEND = 'on';
const heldSame = await going(heldToken, 'PUB', 'going');
check('global send on keeps the copy and does not queue it', heldSame.mail === 'unchanged' && heldSame.notice === 'off' && rowOf('held@example.com', 'PUB', '').s === 'test_redirected' && toInbox().length === 4);
env.GOING_NOTICE_SEND = '';

const english = await going(visitorToken, 'EN', 'going');
const enMail = toInbox().filter(m => m.includes('English night') || m.includes('ATM Website · Event Attendance Notice')).pop();
check('english letter keeps its subject under the test mark', english.mail === 'test_redirected' && enMail && head(enMail).includes('subject=「[测试]」[TEST] ATM Website · Event Attendance Notice') && enMail.includes('真正的收件人会是主办方 En Host（en***@example.com）') && enMail.includes('organizer En Host (en***@example.com)') && !enMail.includes('en-org@example.com') && !head(enMail).includes(' cc=') && !head(enMail).includes(' reply-to='));

const missing = await going(visitorToken, 'NONE', 'going');
check('a missing organizer is saved and not copied', missing.notice === 'off' && missing.mail === 'no_organizer' && missing.mailed === false && rowOf(VISITOR, 'NONE', '').s === 'none');

const unfav = await post('/going/unfav', { id: 'EN', explicit: 1 }, visitorToken);
check('unfavorite saves and does not copy', unfav.ok && unfav.notice === 'off' && unfav.mailed === false && toInbox().filter(m => m.includes('Event Attendance Notice')).length === 1);

const ip = '203.0.113.44';
const iph = sha(ip + 'atm').slice(0, 16);
for (let i = 0; i < 12; i++) db.prepare('INSERT INTO going_sends(email,card_id,ip_hash,created_at) VALUES(?,?,?,?)').run('cap' + i + '@example.com', 'PUB', iph, new Date().toISOString());
const cappedToken = user('capped@example.com', 'Capped');
const capped = await going(cappedToken, 'PUB', 'interested', {}, { 'CF-Connecting-IP': ip });
check('the ip cap does not block or surface the copy', capped.ok && capped.notice === 'off' && capped.mail === 'test_redirected' && capped.mailed === false && rowOf('capped@example.com', 'PUB', '').s === 'test_redirected');

const realFetch = globalThis.fetch;
const resendCalls = [];
let failNext = false;
let flipDuringSend = null;
globalThis.fetch = async (url, opt) => {
  if (String(url).includes('api.resend.com')) {
    const body = String(opt && opt.body || '');
    resendCalls.push(body);
    if (flipDuringSend) {
      const flip = flipDuringSend;
      flipDuringSend = null;
      db.prepare('UPDATE going_intents SET intent=? WHERE email=? AND card_id=? AND anchor=?').run(flip.intent, flip.email, flip.card, flip.anchor);
    }
    if (failNext) { failNext = false; return { ok: false, status: 500, text: async () => 'no' }; }
    return { ok: true, status: 200, text: async () => '{}' };
  }
  return realFetch(url, opt);
};
env.SOCIAL_MAIL = 'resend';
env.RESEND_API_KEY = 'test-key';
const retryToken = user('retry@example.com', 'Retry');
failNext = true;
const failed = await going(retryToken, 'FCOPY', 'going');
check('a failed copy stays unsent and does not say the notice failed', failed.ok && failed.notice === 'off' && failed.mailed === false && failed.mail === 'queued' && rowOf('retry@example.com', 'FCOPY', '').s === 'queued' && resendCalls.length === 1);
const retried = await going(retryToken, 'FCOPY', 'going');
const payload = JSON.parse(resendCalls[1] || '{}');
check('the retry sends only the final state to the inbox', retried.mail === 'test_redirected' && retried.notice === 'off' && resendCalls.length === 2 && payload.to && payload.to.length === 1 && payload.to[0] === INBOX && !payload.cc && !payload.reply_to && String(payload.subject || '').startsWith('「[测试]」[TEST] ') && !JSON.stringify(payload).includes('fcopy-org@example.com') && rowOf('retry@example.com', 'FCOPY', '').s === 'test_redirected');

const raceToken = user('race@example.com', 'Race');
flipDuringSend = { intent: 'interested', email: 'race@example.com', card: 'FCTL', anchor: '' };
const raced = await going(raceToken, 'FCTL', 'going');
check('an in-flight change does not lock the old facts', raced.mail === 'saved' && raced.notice === 'off' && rowOf('race@example.com', 'FCTL', '').i === 'interested' && rowOf('race@example.com', 'FCTL', '').s === 'pending');
const racedFinal = await going(raceToken, 'FCTL', 'interested');
check('the last state is the one recorded', racedFinal.mail === 'test_redirected' && rowOf('race@example.com', 'FCTL', '').s === 'test_redirected' && rowOf('race@example.com', 'FCTL', '').fp === 'interested||0' && resendCalls.length === 4 && resendCalls[3].includes('感兴趣') && !resendCalls[2].includes('test_redirected'));
globalThis.fetch = realFetch;
env.SOCIAL_MAIL = 'log';

const slot = weekSlot(Date.parse(env.GOING_NOW), digestSchedule(env));
const inWindow = new Date(slot.slotMs - 3600e3).toISOString();
check('digest window contains the stamp', !!(slot && Date.parse(inWindow) > slot.prevMs && Date.parse(inWindow) <= slot.slotMs));
db.prepare("UPDATE going_intents SET updated_at=? WHERE email=? AND card_id='FCOPY'").run(inWindow, 'retry@example.com');
const control = 'control@example.com';
user(control, 'Control');
db.prepare("INSERT INTO going_intents(email,card_id,anchor,intent,transport,notify,status,mail_status,created_at,updated_at) VALUES(?,?,?,?,0,1,'active','queued',?,?)").run(control, 'FCTL', '', 'going', inWindow, inWindow);
const orgBefore = mails.filter(m => head(m).includes('to=fcopy-org@example.com') || head(m).includes('to=fctl-org@example.com')).length;
env.GOING_DIGEST_SEND = 'on';
const digestKit = {
  ...kit,
  he: s => String(s == null ? '' : s),
  deliver(_env, to, subject, text, html, _headers, opt) {
    opt = opt || {};
    const cc = opt.cc ? String(opt.cc) : '';
    const replyTo = opt.replyTo || '';
    console.log(`[mail:log] from=${opt.fromName || ''} to=${to}${cc ? ' cc=' + cc : ''}${replyTo ? ' reply-to=' + replyTo : ''} subject=${subject}\n${text || ''}${html ? '\n' + html : ''}`);
  }
};
const swept = await runGoingDigests(env, digestKit);
env.GOING_DIGEST_SEND = '';
const controlMail = mails.filter(m => head(m).includes('to=fctl-org@example.com'));
check('digest sends a queued row and skips the copy', swept.enabled === true && swept.sent === 1 && controlMail.length === 1 && !mails.some(m => head(m).includes('to=fcopy-org@example.com')) && orgBefore === 0 && rowOf('retry@example.com', 'FCOPY', '').s === 'test_redirected' && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='FCTL'").get(control).s === 'sent');

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going test-inbox ok', { copies: toInbox().length });
