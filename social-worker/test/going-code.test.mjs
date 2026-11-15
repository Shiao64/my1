// 6-digit code from the confirmation letter, entered in the starting page (WeChat), plus subscribe-only profiles.
// Run: node social-worker/test/going-code.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-code';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0015_going_pass.sql', '0016_phone_bind.sql', '0018_confirm_claim.sql', '0019_confirm_code.sql']) {
  db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', file), 'utf8'));
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
  GOING_CARDS: {
    F1: { email: 'fest@example.com', kind: 'event', title: 'Festival', title_zh: '节日' }
  }
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const ret = 'https://tangoweekend.org/asia/?atm_y=480';
const zhRet = 'https://tangoweekend.org/zh/asia/?card=somewhere&atm_y=220';
async function post(path, body, headers) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(headers || {}) }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; d._cookie = res.headers.get('Set-Cookie') || ''; return d;
}
const codeOf = () => ((mails[mails.length - 1] || '').match(/(?:验证码|the code) (\d{6})/) || [])[1] || '';
const who = { city: 'Taipei', role: 'both', lang: 'zh', ret, alert: 1 };
const A = 'code-a' + '@example.com';
const B = 'code-b' + '@example.com';

// B7: subscribing needs only the email and last 4 digits
const needName = await post('/profile', { email: A, last4: '1234', lang: 'zh', ret });
check('without sub:1 a name is still required', needName._s === 400 && needName.error === 'need_name');
const first = await post('/profile', { email: A, last4: '1234', lang: 'zh', ret, alert: 1, sub: 1 });
check('subscribe-only profile is accepted and says a code exists', first._s === 200 && first.confirm === true && first.code === true);
const code = codeOf();
check('the letter carries a 6-digit code', /^\d{6}$/.test(code) && mails[mails.length - 1].includes('输入验证码'));

// B6: the code signs the person in where they started
const bad = await post('/going/code', { email: A, code: code === '000000' ? '111111' : '000000' });
check('a wrong code is refused and counted', bad._s === 400 && bad.error === 'wrong_code' && bad.left === 4);
const ok = await post('/going/code', { email: A, code });
check('the right code confirms and returns a session', ok._s === 200 && ok.confirmed === true && /^[0-9a-f]{64}$/.test(ok.session || ''));
const u = db.prepare('SELECT name, verified_at FROM users WHERE email=?').get(A);
check('the subscribe-only user exists, verified, with an empty name', u && u.verified_at && u.name === '');
const again = await post('/going/code', { email: A, code });
check('the same code again returns the same session', again._s === 200 && again.session === ok.session);

// five wrong tries lock the code
await post('/profile', { email: B, last4: '5678', name: 'Bo', ...who });
const codeB = codeOf();
const wrong = codeB === '000000' ? '111111' : '000000';
for (let i = 0; i < 5; i++) await post('/going/code', { email: B, code: wrong });
const locked = await post('/going/code', { email: B, code: codeB });
check('after 5 wrong tries even the right code is refused', locked._s === 429 && locked.error === 'too_many');

// expiry and bad input
db.prepare("UPDATE profile_verify SET sent_at='2020-01-01T00:00:00.000Z', code_tries=0 WHERE email=?").run(B);
const old = await post('/going/code', { email: B, code: codeB });
check('an expired code is refused', old._s === 400 && old.error === 'expired');
const junk = await post('/going/code', { email: B, code: '12' });
check('a short code is refused', junk._s === 400 && junk.error === 'bad_code');

console.log = orig;
if (fail.length) { console.error('FAIL', fail); process.exit(1); }
console.log('going-code: all checks passed');
