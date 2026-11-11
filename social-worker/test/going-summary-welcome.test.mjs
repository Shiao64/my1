// Featured Monday summary, organizer welcome review, and send-flag isolation.
// Log mail only. No network. Run: node social-worker/test/going-summary-welcome.test.mjs
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-summary-welcome';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const {
  runGoingDigests, digestCronOf, organizerMailOn, testLetterOn, welcomeTemplates,
  reviewOrganizerWelcome, sendOrganizerWelcome, organizerAddress, eventRange
} = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const fail = [];
const check = (name, ok) => { if (!ok) fail.push(name); };
const kit = {
  ID_RE: /^[A-Za-z0-9_-]{1,64}$/, EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  he: s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])),
  clean: (s, n) => String(s || '').trim().slice(0, n), now: () => new Date().toISOString()
};
const dancer = 'dancer@example.com';
const other = 'other@example.com';
check('monday summary cron is 06:00 UTC Monday', digestCronOf({}) === '0 6 * * 1' && digestCronOf({}) !== '*/10 * * * *' && digestCronOf({}) !== '17 3 * * *');
check('test pair is not global send', testLetterOn({ GOING_TEST_SEND: 'on', GOING_TEST_DANCER: dancer }, dancer, kit) === true && organizerMailOn({ GOING_TEST_SEND: 'on', GOING_TEST_DANCER: dancer }, other, kit) === false && organizerMailOn({ GOING_TEST_SEND: 'on', GOING_TEST_DANCER: dancer }, dancer, kit) === true);
check('unset and near-miss flags stay off', organizerMailOn({}, other, kit) === false && organizerMailOn({ GOING_NOTICE_SEND: 'yes' }, other, kit) === false && organizerMailOn({ GOING_TEST_SEND: 'on' }, dancer, kit) === false && organizerMailOn({ GOING_DIGEST_SEND: 'on', GOING_WELCOME_SEND: 'on' }, other, kit) === false);
check('notice flag opens every dancer and does not require the test pair', organizerMailOn({ GOING_NOTICE_SEND: 'on' }, other, kit) === true && testLetterOn({ GOING_NOTICE_SEND: 'on' }, other, kit) === false);

const templates = welcomeTemplates();
const templateText = templates.zh.text + '\n' + templates.en.text + '\n' + templates.zh.subject + '\n' + templates.en.subject;
check('welcome templates use the design copy', templates.zh.subject === '亚洲探戈地图将为你转来想参加活动的探友' && templates.en.subject === 'Asia Tango Map will forward dancers who want to join your events' && templates.zh.text.startsWith('{姓名}你好，我是探戈助理。') && templates.en.text.startsWith('Hello {name}, this is Tango Assistant.') && templates.zh.text.includes('回复全部') && templates.zh.text.includes('需要翻译') && templates.zh.text.includes('打车用的中文地址') && templates.en.text.includes('Reply all') && templates.en.text.includes('Need translation') && templates.zh.text.includes('探戈助理 · Asia Tango Map') && templates.en.text.includes('Tango Assistant · Asia Tango Map'));
check('welcome templates omit cadence, unlist, and confirm-email', !/退订|unsubscribe|确认邮箱|confirm email|每周|Monday|guazong@/i.test(templateText) && !templateText.includes('@'));
const range = eventRange({ start: '2027-06-18', end: '2027-06-22' });
check('featured dates match the design shape', range.zh === '2027-06-18 至 06-22' && range.en === '18–22 Jun 2027');

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0011_going_digests.sql', '0017_org_notice.sql']) {
  db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', file), 'utf8'));
}
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, city TEXT, role TEXT, created_at TEXT NOT NULL);
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
  F1: { email: '', kind: 'event', title: '4th Beijing Select Tango Weekend', title_zh: '北京精选探戈周末', start: '2027-06-18', end: '2027-06-22' },
  W1: { email: '', kind: 'weekly', weekday: 5, time: '20:00-23:00', title: 'Directory night', title_zh: '目录之夜' }
};
const ORG = {
  orgs: { O501: 'one@example.com', O502: 'two@example.com', O503: 'selecttango@gmail.com', O504: { email: 'obj@example.com', name: '丙' } },
  names: { O501: { name: '甲', lang: 'zh' }, O502: { name: '乙', name_en: 'Yi', lang: 'en' } },
  links: { F1: ['O501', 'O502'], W1: ['O501'] }
};
const env = {
  SDB: D1(db), DB: D1(db), GOING_CARDS: CARDS, GOING_ORG_DIR: ORG, GOING_NOW: '2026-11-09T06:00:00.000Z',
  API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ALLOW_NO_TURNSTILE: '1',
  ADMIN_TOKEN: '123456789012345678901234'
};
check('string and object directory addresses still resolve', organizerAddress({ id: 'W1', email: '' }, env, kit) === 'one@example.com' && organizerAddress({ id: 'ONLY', email: '' }, { GOING_ORG_DIR: { orgs: { O504: { email: 'obj@example.com', name: '丙' } }, links: { ONLY: ['O504'] } } }, kit) === 'obj@example.com');
const mails = [];
let deliverCalls = 0;
const orig = console.log;
console.log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : String(x)).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
kit.deliver = async (e, to, subject, text, html, headers, opt) => {
  deliverCalls++;
  opt = opt || {};
  console.log(`[mail:log] from=${opt.fromName || ''} to=${to}${opt.cc ? ' cc=' + opt.cc : ''}${opt.replyTo ? ' reply-to=' + opt.replyTo : ''} subject=${subject}\n${text}`);
};
function user(email, name, city, role) {
  db.prepare('INSERT INTO users(email,name,city,role,verified_at,created_at) VALUES(?,?,?,?,?,?)').run(email, name, city, role, '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z');
}
function intent(email, card, intentName, status, mail, at) {
  db.prepare(`INSERT INTO going_intents(email,card_id,anchor,intent,transport,notify,status,mail_status,created_at,updated_at) VALUES(?,?,?,?,0,1,?,?,?,?)`)
    .run(email, card, '', intentName, status, mail, at, at);
}
user('ana@example.com', 'Ana', 'Beijing', 'leader');
user('bea@example.com', 'Bea', 'Shanghai', 'follower');
user('cy@example.com', 'Cy', 'Busan', 'both');
db.prepare('UPDATE users SET verified_at=NULL WHERE email=?').run('cy@example.com');
user('nix@example.com', 'Nix', 'Seoul', 'leader');
user('away@example.com', 'Away', 'Guangzhou', 'leader');
intent('ana@example.com', 'F1', 'going', 'active', 'sent', '2026-11-08T02:00:00.000Z');
intent('bea@example.com', 'F1', 'interested', 'active', 'queued', '2026-11-08T03:00:00.000Z');
intent('cy@example.com', 'F1', 'going', 'active', 'queued', '2026-11-08T03:00:00.000Z');
intent('nix@example.com', 'F1', 'going', 'cancelled', 'queued', '2026-11-08T04:00:00.000Z');
intent('away@example.com', 'F1', 'absent', 'active', 'queued', '2026-11-08T05:00:00.000Z');

const off = await runGoingDigests({ ...env, GOING_DIGEST_SEND: '' }, kit);
check('digest flag off sends nothing', off.enabled === false && off.sent === 0 && deliverCalls === 0 && db.prepare('SELECT COUNT(*) n FROM going_digests').get().n === 0);
const early = await runGoingDigests({ ...env, GOING_DIGEST_SEND: 'on', GOING_NOW: '2026-11-09T05:00:00.000Z' }, kit);
check('before Monday 14:00 the new week is not sent', early.sent === 0 && deliverCalls === 0);
env.GOING_DIGEST_SEND = 'on';
const featured = await runGoingDigests(env, kit);
const bodies = mails.map(m => m.slice(m.indexOf('\n') + 1));
const zh = mails.find(m => m.includes('to=one@example.com'));
const en = mails.find(m => m.includes('to=two@example.com'));
check('digest sends one summary per directory organizer', featured.sent === 1 && mails.length === 2 && zh && en);
check('chinese summary has names and cities only', zh.includes('subject=探戈助理：意向名单「北京精选探戈周末」（2 人）') && zh.includes('cc=selecttango@gmail.com, guazong@mail.grokbot.com') && zh.includes('甲你好') && bodies[0].includes('Ana，Beijing') && (zh.includes('Bea，Shanghai') || en.includes('Bea, Shanghai')) && zh.includes('要参加（1）') && zh.includes('感兴趣（1）') && zh.includes('2027-06-18 至 06-22') && !zh.includes('reply-to=') && !bodies.join('\n').includes('ana@example.com') && !bodies.join('\n').includes('leader') && !bodies.join('\n').includes('follower') && !bodies.join('\n').includes('Cy') && !bodies.join('\n').includes('Nix') && !bodies.join('\n').includes('Away'));
check('english organizer gets the english template', en.includes('subject=Tango Assistant: interest list for 4th Beijing Select Tango Weekend (2 people)') && en.includes('Hello Yi,') && en.includes('Going (1)') && en.includes('Interested (1)') && en.includes('18–22 Jun 2027') && en.includes('Tango Assistant · Asia Tango Map'));
check('summary does not copy dancers or consume the letter queue', !zh.includes(dancer) && !zh.includes('ana@example.com') && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='F1'").get('ana@example.com').s === 'sent' && db.prepare("SELECT mail_status s FROM going_intents WHERE email=? AND card_id='F1'").get('bea@example.com').s === 'queued');
const again = await runGoingDigests(env, kit);
check('the same Monday does not send twice', again.sent === 0 && mails.length === 2);
const testOnly = await runGoingDigests({ ...env, GOING_DIGEST_SEND: '', GOING_TEST_SEND: 'on', GOING_TEST_DANCER: dancer, GOING_NOTICE_SEND: 'on' }, kit);
check('test and notice flags do not run the summary', testOnly.enabled === false && mails.length === 2);

const review = reviewOrganizerWelcome(env, kit);
const reviewJson = JSON.stringify(review);
check('welcome review lists id and name and does not send', review.send_enabled === false && review.mailed === false && review.sent === 0 && deliverCalls === mails.length && review.recipients.some(r => r.id === 'O501' && r.name === '甲') && review.recipients.some(r => r.id === 'O502' && r.name === '乙') && review.recipients.some(r => r.id === 'O504' && r.name === '丙') && !review.recipients.some(r => r.id === 'O503') && !reviewJson.includes('@') && !reviewJson.includes('email'));
const blocked = await sendOrganizerWelcome({ ...env, GOING_WELCOME_SEND: '' }, kit);
check('welcome send flag off does not send', blocked.mailed === false && blocked.sent === 0 && deliverCalls === mails.length && db.prepare('SELECT COUNT(*) n FROM org_notice').get().n === 0);
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
async function admin(method, body) {
  const res = await social(new Request('https://api.tangoweekend.org/social/admin/going-welcome', {
    method, headers: { Authorization: 'Bearer ' + env.ADMIN_TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
  }), env, new URL('https://api.tangoweekend.org/social/admin/going-welcome'), json);
  return res.json();
}
const got = await admin('GET');
const posted = await admin('POST', { mode: 'send' });
check('admin review and a send request stay dry while the flag is off', got.mailed === false && posted.mailed === false && posted.sent === 0 && !JSON.stringify(got).includes('@') && !JSON.stringify(posted).includes('@') && deliverCalls === mails.length);
env.GOING_WELCOME_SEND = 'on';
const looked = await admin('GET');
check('flag on still does not send from review', looked.send_enabled === true && looked.mailed === false && deliverCalls === mails.length);
const sentWelcome = await admin('POST', { mode: 'send' });
const welcomeMails = mails.filter(m => m.includes('subject=亚洲探戈地图将为你转来想参加活动的探友') || m.includes('subject=Asia Tango Map will forward dancers'));
check('welcome send is one letter each and copies only the select inbox', sentWelcome.mailed === true && sentWelcome.sent === 3 && welcomeMails.length === 3 && welcomeMails.every(m => m.includes('cc=selecttango@gmail.com') && !m.includes('guazong') && !m.includes('reply-to=')) && welcomeMails.some(m => m.includes('甲你好，我是探戈助理。') && m.includes('需要翻译') && m.includes('回复全部')) && welcomeMails.some(m => m.includes('Hello Yi, this is Tango Assistant.') && m.includes('Need translation')));
check('welcome response still hides addresses', !JSON.stringify(sentWelcome).includes('@') && sentWelcome.recipients.every(r => r.id && !('email' in r)));
const row = db.prepare('SELECT welcome_sent_at sent, opted_out_at out FROM org_notice WHERE org_id=?').get('O501');
check('welcome is recorded once', row.sent && !row.out && db.prepare('SELECT COUNT(*) n FROM org_notice').get().n === 3);
const second = await sendOrganizerWelcome(env, kit);
check('a second welcome does not send again', second.sent === 0 && second.skipped === 3 && mails.filter(m => m.includes('我是探戈助理') || m.includes('this is Tango Assistant')).length === 3);
db.prepare('UPDATE org_notice SET welcome_sent_at=NULL, opted_out_at=? WHERE org_id=?').run('2026-11-11T00:00:00.000Z', 'O504');
const opted = await sendOrganizerWelcome(env, kit);
check('an opted-out organizer is not welcomed', opted.sent === 0 && opted.recipients.some(r => r.id === 'O504' && r.status === 'opted_out'));
env.GOING_WELCOME_SEND = '';
const digestStill = await runGoingDigests({ ...env, GOING_DIGEST_SEND: 'on', GOING_WELCOME_SEND: 'on', GOING_TEST_SEND: 'on', GOING_TEST_DANCER: dancer }, kit);
check('welcome and test flags do not send another summary', digestStill.sent === 0);

const sha = s => createHash('sha256').update(s).digest('hex');
function session(email, name) {
  db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at,city,role) VALUES(?,?,?,?,?,?,?)').run(email, name, 'zh', '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z', 'Beijing', 'leader');
  const id = db.prepare('SELECT id FROM users WHERE email=?').get(email).id;
  const token = sha(email);
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(token), id, '2026-11-01T00:00:00.000Z');
  return token;
}
const visitor = session(other, 'Visitor');
const beforeLetters = mails.length;
async function postGoing(token, intentName) {
  const res = await social(new Request('https://api.tangoweekend.org/social/going', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'W1', intent: intentName, anchor: '2026-11-13', date: intentName === 'going' ? '2026-11-13' : '', explicit: 1, disclose: 1, notify: 1, transport: 0, ts: 'x', ret: 'https://tangoweekend.org/asia/?card=W1', lang: 'zh' })
  }), { ...env, GOING_DIGEST_SEND: '', GOING_WELCOME_SEND: '' }, new URL('https://api.tangoweekend.org/social/going'), json);
  const d = await res.json(); d._s = res.status; return d;
}
env.GOING_TEST_SEND = 'on';
env.GOING_TEST_DANCER = dancer;
env.GOING_NOTICE_SEND = '';
const saved = await postGoing(visitor, 'going');
check('test vars do not mail a different dancer', saved.ok && saved.notice === 'off' && saved.mailed === false && mails.length === beforeLetters);
env.GOING_TEST_SEND = '';
env.GOING_TEST_DANCER = '';
env.GOING_NOTICE_SEND = 'on';
const global = await postGoing(visitor, 'interested');
const letter = mails.filter(m => m.includes('to=one@example.com') && m.includes('Visitor'));
check('global notice flag sends the organizer letter for that dancer', global.notice === 'sent' && global.mailed === true && letter.length === 1 && letter[0].includes('cc=' + other + ', selecttango@gmail.com, guazong@mail.grokbot.com') && letter[0].includes('探友Visitor（领舞，Beijing）') && letter[0].includes('Dancer Visitor (leader, Beijing)'));
check('that letter is not a summary or a welcome', letter.length === 1 && !letter[0].includes('意向名单') && !letter[0].includes('我是探戈助理'));
const source = fs.readFileSync(path.join(root, 'social-worker/src/going.js'), 'utf8');
check('worker source does not name a sample organizer or dancer', !source.includes('O114') && !source.includes('刘峥') && !source.includes('Liu Zheng') && !source.includes('shiaochang@'));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going summary welcome ok', { mails: mails.length });
