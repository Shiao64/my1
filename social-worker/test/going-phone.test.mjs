// Email + phone last-4 sign-in. No network and no real mail.
// Run: node social-worker/test/going-phone.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dir = '/tmp/atm-going-phone';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = read('social-worker/src/social.js').replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { buildConfirmLetter, normalizePhone, phoneLast4 } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0015_going_pass.sql', '0016_phone_bind.sql', '0018_confirm_claim.sql']) {
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

const spaced = '138 0013 8000';
const dashed = '138-0013-8001';
const plus = '+86 138 0013 8002';
const paren = '(415) 555-0133';
function digits(s) { return String(s || '').replace(/\D/g, ''); }
function tail(s) { return digits(s).slice(-4); }
function storedOk(saved, sample) {
  const want = digits(sample);
  const got = digits(saved);
  const signed = String(sample).trim().startsWith('+');
  return !!saved && got === want && got.slice(-4) === tail(sample) && got.length >= 8 && got.length <= 15
    && String(saved) !== tail(sample) && (signed ? String(saved).startsWith('+') : !String(saved).startsWith('+'));
}
function leaked(text, sample) {
  const d = digits(sample);
  return d.length >= 8 && String(text || '').includes(d);
}
function userPhone(email) {
  const u = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (!u) return '';
  const row = db.prepare('SELECT phone FROM user_phone WHERE user_id=?').get(u.id);
  return row ? row.phone : '';
}
function stagedPhone(email) {
  const row = db.prepare('SELECT phone FROM profile_phone WHERE email=?').get(email);
  return row ? row.phone : '';
}

const ret = 'https://tangoweekend.org/zh/asia/?atm_y=80';
const baseWho = { name: 'Mei', city: 'Shanghai', role: 'follower', lang: 'zh', alert: 0, ret, ts: 'x' };
async function post(pathname, body, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + pathname, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(headers || {}) }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + pathname), json);
  const d = await res.json();
  d._s = res.status;
  d._cookie = res.headers.get('Set-Cookie') || '';
  return d;
}
async function confirm(link) {
  const u = new URL(link);
  const res = await social(new Request('https://api.tangoweekend.org/social/going/confirm', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: 'atm_verify=1' }, body: new URLSearchParams({ e: u.searchParams.get('e'), t: u.searchParams.get('t'), confirm: '1' }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/confirm'), json);
  return { status: res.status, html: await res.text(), cookie: res.headers.get('Set-Cookie') || '' };
}
function sessionOf(cookie) { return (String(cookie || '').match(/atm_session=([0-9a-f]{64})/) || [])[1] || ''; }
function passTok(html) { return (String(html || '').match(/\/enter\/([0-9a-f]{64})/) || [])[1] || ''; }
async function get(pathname, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + pathname, { headers: { Origin: 'https://tangoweekend.org', ...(headers || {}) } }), env, new URL('https://api.tangoweekend.org/social' + pathname), json);
  const d = await res.json();
  d._s = res.status;
  return d;
}
async function login(email, last4, headers) {
  return post('/going/phone', { email, last4 }, headers);
}

const hintZh = '已经订阅过？请输入邮箱和电话末 4 码，不必再等确认信。';
const hintEn = 'Already subscribed? Enter your email and the last 4 digits of your phone. You don\u2019t need another confirmation email.';
const nextZh = '确认后，若要在微信或其他浏览器使用，请输入你的邮箱和电话末 4 码，不必再等确认信。';
const nextEn = 'After you confirm, to use WeChat or another browser, enter your email and the last 4 digits of your phone. You don\u2019t need another confirmation email.';
const starSrc = read('asia/atm-star.js');
const subSrc = read('asia/asia-subscribe.js');
const migration = read('social-worker/migrations/0016_phone_bind.sql');
check('both not-logged-in forms show the return hint', starSrc.includes(hintZh) && subSrc.includes(hintZh) && starSrc.includes('You don\\u2019t need another confirmation email.') && subSrc.includes('You don\\u2019t need another confirmation email.'));
check('the personal subscription link stays in the profile form', subSrc.includes("passTitle: '我的订阅'") && subSrc.includes("passTitle: 'My subscription'") && read('social-worker/src/going.js').includes('export async function goingEnter'));
check('migration 0016 is not applied from this change', migration.includes('CREATE TABLE IF NOT EXISTS user_phone') && migration.includes('Not applied to production') && !fs.existsSync(path.join(root, 'social-worker/migrations/0015_org_notice.sql')));

const zhLetter = buildConfirmLetter({ lang: 'zh', name: '安', email: 'person@example.com' }, 'https://api.tangoweekend.org/social/going/confirm?e=a&t=b', null, s => s);
const enLetter = buildConfirmLetter({ lang: 'en', name: 'Ann', email: 'person@example.com' }, 'https://api.tangoweekend.org/social/going/confirm?e=a&t=b', null, s => s);
check('the confirm letter tells the dancer about the last 4', zhLetter.text.includes(nextZh) && zhLetter.html.includes(nextZh) && enLetter.text.includes(nextEn) && enLetter.html.includes(nextEn) && zhLetter.text.includes(hintZh) && zhLetter.html.includes(hintZh) && enLetter.text.includes(hintEn) && enLetter.html.includes(hintEn));
check('formatted numbers keep a full value and the same last 4', storedOk(normalizePhone(spaced), spaced) && storedOk(normalizePhone(dashed), dashed) && storedOk(normalizePhone(plus), plus) && storedOk(normalizePhone(paren), paren) && phoneLast4(normalizePhone(spaced)) === tail(spaced) && normalizePhone('12-34') === '');

const tooShort = await post('/profile', { ...baseWho, email: 'short@example.com', last4: '12' });
check('a too-short phone is refused and does not send mail', tooShort._s === 400 && tooShort.error === 'bad_phone' && tooShort.mailed === false && logs.length === 0 && !userPhone('short@example.com'));
const fullRefused = await post('/profile', { ...baseWho, email: 'full@example.com', phone: spaced });
check('a full phone number is not stored on a new registration', fullRefused._s === 400 && fullRefused.error === 'bad_phone' && fullRefused.mailed === false && logs.length === 0 && !userPhone('full@example.com') && !stagedPhone('full@example.com'));

const first = await post('/profile', { ...baseWho, email: 'mei@example.com', last4: tail(spaced) });
const before = db.prepare('SELECT verified_at v FROM users WHERE email=?').get('mei@example.com');
check('first subscribe still asks for email confirm and does not bind yet', first.confirm === true && first.session !== true && !first._cookie.includes('atm_session=') && logs.length === 1 && !before.v && !userPhone('mei@example.com') && stagedPhone('mei@example.com') === tail(spaced));
check('the confirm mail does not include the phone', logs.length === 1 && !leaked(logs[0], spaced) && logs[0].includes(nextZh) && logs[0].includes(hintZh));
const early = await login('mei@example.com', tail(spaced));
check('last 4 before confirm does not log in and does not send mail', early.register === true && early.mailed === false && !early.session && !early._cookie.includes('atm_session=') && logs.length === 1);

const done = await confirm(first.preview_link);
const session = sessionOf(done.cookie);
const pass = passTok(done.html);
check('confirm binds the last 4 and signs this browser in', done.status === 200 && /^[0-9a-f]{64}$/.test(session) && done.cookie.includes('atm_session=' + session) && !!db.prepare('SELECT verified_at v FROM users WHERE email=?').get('mei@example.com').v && userPhone('mei@example.com') === tail(spaced) && !stagedPhone('mei@example.com') && logs.length === 1 && !leaked(done.html, spaced));
check('confirm still shows the personal link', /^[0-9a-f]{64}$/.test(pass) && done.html.includes('/social/going/enter/' + pass));

const good = await login('mei@example.com', tail(spaced));
const goodSession = good.session || '';
check('the right email and last 4 issue a session and do not send mail', good._s === 200 && good.ok === true && good.verified === true && good.mailed === false && /^[0-9a-f]{64}$/.test(goodSession) && good._cookie.includes('atm_session=' + goodSession) && !good.phone && logs.length === 1);
const mine = await get('/going/mine', { Authorization: 'Bearer ' + goodSession });
check('the new browser is signed in and the full number stays off the profile response', mine._s === 200 && mine.email === 'mei@example.com' && mine.phone_tail === tail(spaced) && mine.phone_tail.length === 4 && !leaked(JSON.stringify(mine), spaced));

const wrong = await login('mei@example.com', '0000');
check('a wrong last 4 does not log in and does not send mail', wrong._s === 401 && wrong.error === 'phone_login' && wrong.mailed === false && !wrong.session && !wrong._cookie.includes('atm_session=') && logs.length === 1);
const unknown = await login('nobody@example.com', tail(spaced));
check('an unknown email is registration, not a login, and does not send mail', unknown.register === true && unknown.mailed === false && !unknown.session && logs.length === 1 && unknown.error !== 'phone_login');

const star = await post('/going', { id: 'F1', intent: 'interested', email: 'star@example.com', name: 'An', city: 'Seoul', role: 'leader', explicit: 1, disclose: 1, lang: 'en', ret, last4: tail(dashed) });
check('a first star subscribe still sends the confirm mail and waits to bind', star.confirm === true && star._s === 200 && logs.length === 2 && !userPhone('star@example.com') && stagedPhone('star@example.com') === tail(dashed) && !leaked(logs[1], dashed));
const starEarly = await login('star@example.com', tail(dashed));
check('the star phone cannot sign in before confirm', starEarly.register === true && !starEarly.session && logs.length === 2);
const starDone = await confirm(star.preview_link);
check('confirm after the star binds only the last 4', starDone.status === 200 && userPhone('star@example.com') === tail(dashed) && logs.length === 2 && !leaked(starDone.html, dashed));
const starIn = await login('star@example.com', tail(dashed));
check('the last 4 signs in and does not send mail', starIn._s === 200 && !!starIn.session && starIn.mailed === false && logs.length === 2);
const starIntent = await post('/going/phone', { email: 'star@example.com', last4: tail(dashed), id: 'F1', intent: 'interested', explicit: 1, disclose: 1, lang: 'en', ret });
check('a confirmed star signs in and records the intent with no second confirm', starIntent._s === 200 && starIntent.session && starIntent.confirm !== true && starIntent.mailed === false && (starIntent.mail === 'queued' || starIntent.mail === 'unchanged') && logs.length === 2 && db.prepare("SELECT intent i FROM going_intents WHERE email=? AND card_id='F1'").get('star@example.com').i === 'interested');

const bare = await post('/profile', { ...baseWho, email: 'old@example.com', name: 'Old', last4: '1111' });
const bareDone = await confirm(bare.preview_link);
const bareSession = sessionOf(bareDone.cookie);
db.prepare('DELETE FROM user_phone WHERE user_id=?').run(db.prepare('SELECT id FROM users WHERE email=?').get('old@example.com').id);
check('an earlier subscriber can be confirmed with no phone left on file', bare.confirm === true && logs.length === 3 && !userPhone('old@example.com') && /^[0-9a-f]{64}$/.test(bareSession));
const bareTry = await login('old@example.com', tail(plus));
check('no bound phone means no last-4 login and no mail', bareTry._s === 401 && bareTry.register !== true && logs.length === 3);
const added = await post('/profile', { ...baseWho, email: 'old@example.com', name: 'Old', last4: tail(plus) }, { Authorization: 'Bearer ' + bareSession });
check('a signed-in profile binds the last 4 without mail', added._s === 200 && added.ok === true && added.session === true && added.mailed === false && added.phone_tail === tail(plus) && userPhone('old@example.com') === tail(plus) && logs.length === 3 && !leaked(JSON.stringify(added), plus));
const plusIn = await login('old@example.com', tail(plus));
check('the saved last 4 signs in', plusIn._s === 200 && !!plusIn.session && plusIn.mailed === false && logs.length === 3);
const changed = await post('/profile', { ...baseWho, email: 'old@example.com', name: 'Old', last4: tail(paren) }, { Authorization: 'Bearer ' + bareSession });
const oldTail = await login('old@example.com', tail(plus));
const newTail = await login('old@example.com', tail(paren));
check('updating the last 4 from the profile replaces it and does not send mail', changed.mailed === false && changed.phone_tail === tail(paren) && userPhone('old@example.com') === tail(paren) && oldTail._s === 401 && newTail._s === 200 && !!newTail.session && logs.length === 3);
const kept = await post('/profile', { ...baseWho, email: 'old@example.com', name: 'Old' }, { Authorization: 'Bearer ' + bareSession });
check('saving the profile without a last 4 leaves the bound digits', kept._s === 200 && kept.mailed === false && kept.phone_tail === tail(paren) && userPhone('old@example.com') === tail(paren) && logs.length === 3);
db.prepare("INSERT INTO users(email,name,lang,verified_at,created_at,city,role) VALUES('legacy@example.com','Legacy','zh',?,'2026-01-01T00:00:00.000Z','Shanghai','follower')").run(new Date().toISOString());
db.prepare('INSERT INTO user_phone(user_id,phone,updated_at) VALUES(?,?,?)').run(db.prepare("SELECT id FROM users WHERE email='legacy@example.com'").get().id, normalizePhone(plus), '2026-01-01T00:00:00.000Z');
const legacyIn = await login('legacy@example.com', tail(plus));
check('a full phone already on file signs in with its last 4 and is not rewritten', legacyIn._s === 200 && !!legacyIn.session && legacyIn.mailed === false && userPhone('legacy@example.com') === normalizePhone(plus) && logs.length === 3);

const lockedUser = await post('/profile', { ...baseWho, email: 'lock@example.com', name: 'Lock', last4: tail(dashed) });
await confirm(lockedUser.preview_link);
const mailsAtLock = logs.length;
let lastFail = null;
for (let i = 0; i < 5; i++) lastFail = await login('lock@example.com', '9999');
const blocked = await login('lock@example.com', '9999');
const blockedRight = await login('lock@example.com', tail(dashed));
check('five wrong tries still say no match', lastFail && lastFail._s === 401 && lastFail.error === 'phone_login' && lastFail.mailed === false);
check('further tries lock, including a correct last 4, and do not send mail', blocked._s === 429 && blocked.error === 'rate_limited' && blocked.mailed === false && !blocked.session && blockedRight._s === 429 && blockedRight.mailed === false && !blockedRight.session && logs.length === mailsAtLock);
const other = await login('mei@example.com', tail(spaced));
check('a different email is not locked by those tries', other._s === 200 && !!other.session && other.mailed === false && logs.length === mailsAtLock);
db.prepare("UPDATE phone_login_lock SET locked_until='2000-01-01T00:00:00.000Z' WHERE subject=?").run('e:lock@example.com');
const after = await login('lock@example.com', tail(dashed));
check('the lock is temporary', after._s === 200 && !!after.session && after.mailed === false && logs.length === mailsAtLock);

const entered = await social(new Request('https://api.tangoweekend.org/social/going/enter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ k: pass }).toString() }), env, new URL('https://api.tangoweekend.org/social/going/enter'), json);
const enteredHtml = await entered.text();
check('the personal link still signs in and does not send mail', entered.status === 200 && (entered.headers.get('Set-Cookie') || '').includes('atm_session=') && !leaked(enteredHtml, spaced) && logs.length === mailsAtLock);
const beforeSneak = logs.length;
const sneak = await post('/profile', { ...baseWho, email: 'mei@example.com', last4: '9999' });
const sneakDone = await confirm(sneak.preview_link);
check('a later confirm does not replace a phone already bound', sneak.confirm === true && sneak.session !== true && sneakDone.status === 200 && logs.length === beforeSneak + 1 && userPhone('mei@example.com') === tail(spaced) && !leaked(logs[logs.length - 1], dashed) && !leaked(sneakDone.html, dashed));
check('nothing logged a full phone', [spaced, dashed, plus, paren].every(sample => logs.every(line => !leaked(line, sample))));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going phone ok');
