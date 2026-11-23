// 2026-11-23: the BSTW registration page signs in with the email code only and gets its own code letter.
// Run: node social-worker/test/reg-code-letter.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dir = '/tmp/atm-reg-code-letter';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = read('social-worker/src/social.js').replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { buildRegCodeLetter } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0015_going_pass.sql', '0016_phone_bind.sql', '0018_confirm_claim.sql', '0019_confirm_code.sql']) {
  db.exec(read(path.join('social-worker/migrations', file)));
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
  GOING_CARDS: { F1: { email: 'fest@example.com', kind: 'event', title: 'Festival', title_zh: '节日' } }
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const logs = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) logs.push(s); else orig(...a); };


async function post(pathname, body) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + pathname, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org' }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + pathname), json);
  const d = await res.json(); d._s = res.status; return d;
}
const REG = 'https://tangoweekend.org/event/beijing-2027-tango-weekend/register/draft/';
const regBody = (email, rlang, extra) => ({ email, for: 'reg', rlang, sub: 1, lang: rlang === 'zh' ? 'zh' : 'en', ret: REG, ts: '', ...(extra || {}) });
const last = () => logs[logs.length - 1] || '';
const subjectOf = m => (m.match(/ subject=([^\n{]*)/) || [])[1] || '';
const codeOf = m => (subjectOf(m).match(/(\d{6})\s*$/) || [])[1] || '';
const bj = iso => Number.isFinite(Date.parse(iso)) ? new Date(Date.parse(iso) + 8 * 3600e3).toISOString().slice(11, 16) : 'no-time';
const back = (email, s) => db.prepare('UPDATE profile_verify SET sent_at=? WHERE email=?').run(new Date(Date.now() - s * 1000).toISOString(), email);
const subStatus = email => (db.prepare('SELECT status FROM email_subs WHERE email=?').get(email) || {}).status || '';

// 1) no phone last-4 needed from the registration page; letter in the page language with the code in the subject
let n = logs.length;
const a = await post('/profile', regBody('kim@example.com', 'ko'));
const ma = last();
check('registration page: no last-4 needed, one mail sent', a._s === 200 && a.ok === true && logs.length === n + 1);
check('registration page: send time returned', typeof a.sent_at === 'string' && Number.isFinite(Date.parse(a.sent_at)));
check('Korean letter, code in the subject', subjectOf(ma).startsWith('베이징 셀렉트 탱고 위켄드 신청 인증 코드 ') && /^\d{6}$/.test(codeOf(ma)) && ma.includes('인증 코드: ' + codeOf(ma)));
check('letter shows the Beijing send time and newest-code rule', ma.includes('베이징 시간 ' + bj(a.sent_at) + '에 발송') && ma.includes('가장 최근 메일의 코드만'));
check('letter has no subscription wording, no link, no last-4', !/订阅|subscri|구독|末 4|last 4|끝 4|\/social\/going\/confirm/i.test(ma));
check('sender is the event', ma.includes('from=Beijing Select Tango Weekend '));
const ok1 = await post('/going/code', { email: 'kim@example.com', code: codeOf(ma) });
check('the code signs in', ok1._s === 200 && ok1.ok === true && /^[0-9a-f]{64}$/.test(ok1.session || ''));
check('signing in from the registration page does not subscribe', subStatus('kim@example.com') !== 'active');

// 2) two sends: the first code stops working, the newest works
const b1 = await post('/profile', regBody('two@example.com', 'zh'));
const c1 = codeOf(last());
back('two@example.com', 61);
const b2 = await post('/profile', regBody('two@example.com', 'zh'));
const m2 = last(), c2 = codeOf(m2);
check('Chinese letter subject and first line', subjectOf(m2).trim() === '北京精选探戈周末报名验证码 ' + c2 && m2.includes('\n你的验证码：' + c2 + '\n'));
check('Chinese letter: newest-code rule with time', m2.includes('这封信在北京时间 ' + bj(b2.sent_at) + ' 寄出。如果你寄了好几次，只有最新一封信里的验证码有效。'));
const old = c1 === c2 ? { error: 'same' } : await post('/going/code', { email: 'two@example.com', code: c1 });
check('the older code is refused as wrong', b1.ok && b2.ok && old._s === 400 && old.error === 'wrong_code');
const ok2 = await post('/going/code', { email: 'two@example.com', code: c2 });
check('the newest code works', ok2.ok === true && !!ok2.session);

// 3) the other languages, and an unknown one falls back to the account language
for (const [lang, start] of [['en', 'Beijing Select Tango Weekend registration code '], ['es', 'Código de inscripción Beijing Select Tango Weekend: '], ['ru', 'Код регистрации Beijing Select Tango Weekend: ']]) {
  const r = await post('/profile', regBody(lang + '@example.com', lang));
  check(lang + ' letter subject', r.ok && subjectOf(last()).startsWith(start) && /^\d{6}$/.test(codeOf(last())));
}
const xx = await post('/profile', regBody('xx@example.com', 'xx', { lang: 'zh' }));
check('unknown page language falls back to the account language', xx.ok && subjectOf(last()).startsWith('北京精选探戈周末报名验证码 '));

// 4) an active subscriber signing in from the registration page stays subscribed
db.prepare("INSERT INTO users(email,name,lang,verified_at,created_at) VALUES('sub@example.com','Sub','zh',?,?)").run(new Date().toISOString(), new Date().toISOString());
db.prepare("INSERT INTO email_subs(email,name,types,cities,lang,status,created_at,confirmed_at) VALUES('sub@example.com','Sub','featured,regular','all','zh','active',?,?)").run(new Date().toISOString(), new Date().toISOString());
const s1 = await post('/profile', regBody('sub@example.com', 'zh'));
const s2 = await post('/going/code', { email: 'sub@example.com', code: codeOf(last()) });
check('a subscriber can sign in with the code alone', s1.ok && s2.ok && !!s2.session);
check('the subscription is unchanged', subStatus('sub@example.com') === 'active');

// 5) other pages are unchanged: without for:'reg' the last 4 are still required and the old letter is sent
n = logs.length;
const noTail = await post('/profile', { email: 'atm@example.com', sub: 1, lang: 'zh', ret: 'https://tangoweekend.org/zh/asia/', ts: '' });
check('ATM still needs the last 4', noTail._s === 400 && noTail.error === 'need_phone' && logs.length === n);
const atm = await post('/profile', { email: 'atm@example.com', last4: '1234', sub: 1, lang: 'zh', ret: 'https://tangoweekend.org/zh/asia/', ts: '' });
check('ATM keeps its letter and gets no send time', atm.ok && subjectOf(last()).trim() === '请确认订阅亚洲探戈地图' && atm.sent_at === undefined);
const oldPage = await post('/profile', { email: 'oldpage@example.com', last4: '1234', sub: 1, lang: 'en', ret: REG, ts: '' });
check('an old cached registration page (last 4, no tag) still works', oldPage.ok && subjectOf(last()).trim() === 'Please confirm your Asia Tango Map subscription');

// 6) the letter itself
const L = buildRegCodeLetter('es', '012345', '2026-11-23T16:05:00.000Z');
check('letter: Beijing time crosses midnight correctly', L.text.includes('a las 00:05, hora de Pekín') && L.subject.endsWith(': 012345') && L.html.includes('>012345<') && !/\{[ct]\}/.test(L.subject + L.text + L.html));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('reg code letter ok');
