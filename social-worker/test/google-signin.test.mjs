// 2026-11-24: the BSTW registration page may sign in with Google (people outside mainland China).
// The backend checks Google's signed ID token itself. Run: node social-worker/test/google-signin.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dir = '/tmp/atm-google-signin';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = read('social-worker/src/social.js').replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
for (const file of ['0009_going.sql', '0012_going_occ.sql', '0013_going_confirm_show.sql', '0014_profile_verify_pending.sql', '0015_going_pass.sql', '0016_phone_bind.sql', '0018_confirm_claim.sql', '0019_confirm_code.sql']) {
  db.exec(read(path.join('social-worker/migrations', file)));
}
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, code_hash TEXT);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE email_subs(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT, types TEXT, cities TEXT, lang TEXT, status TEXT, confirm_hash TEXT, pending_since TEXT, unsub_token TEXT, created_at TEXT);
CREATE TABLE mail_unsub(email TEXT PRIMARY KEY, at TEXT NOT NULL);`);
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
const CID = '1234567890-testclient.apps.googleusercontent.com';
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ALLOW_NO_TURNSTILE: '1', PREVIEW_SHOW_CODE: '1', GOOGLE_CLIENT_ID: CID };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const logs = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) logs.push(s); else orig(...a); };

// a fake Google: our own RSA key published at Google's key address
const alg = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
const good = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
const evil = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
const pub = { ...(await crypto.subtle.exportKey('jwk', good.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
let certCalls = 0, certsDown = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  if (String(u) === 'https://www.googleapis.com/oauth2/v3/certs') {
    certCalls++;
    if (certsDown) return new Response('down', { status: 503 });
    return new Response(JSON.stringify({ keys: [pub] }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=20000' } });
  }
  return realFetch(u, o);
};
const b64u = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
async function idToken(over = {}, { key = good.privateKey, head = {} } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u({ alg: 'RS256', kid: 'k1', typ: 'JWT', ...head });
  const p = b64u({ iss: 'https://accounts.google.com', aud: CID, azp: CID, sub: '1100' + Math.random().toString().slice(2, 10), email: 'kim@gmail.com', email_verified: true, name: 'Kim Minji', iat: now - 5, exp: now + 3595, ...over });
  const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + p))).toString('base64url');
  return h + '.' + p + '.' + sig;
}
async function call(method, pathname, body, headers = {}, e = env) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + pathname, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', 'CF-Connecting-IP': '203.0.113.9', ...headers }, body: body ? JSON.stringify(body) : undefined }), e, new URL('https://api.tangoweekend.org/social' + pathname), json);
  const d = await res.json(); d._s = res.status; return d;
}
const google = (credential, extra) => call('POST', '/going/google', { credential, lang: 'en', ...(extra || {}) });
const sha = async t => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))).toString('hex');
const userOf = email => db.prepare('SELECT * FROM users WHERE email=?').get(email);
const sessionsOf = email => db.prepare('SELECT COUNT(*) n FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.email=?').get(email).n;

// 1) config hands the page the Client ID; without one the button stays hidden
let c = await call('GET', '/going/config');
check('config gives the Client ID', c.google === CID);
c = await call('GET', '/going/config', null, {}, { ...env, GOOGLE_CLIENT_ID: undefined });
check('no Cloudflare variable -> the built-in Client ID', /^481674560823-[0-9a-z]+\.apps\.googleusercontent\.com$/.test(c.google));
c = await call('GET', '/going/config', null, {}, { ...env, GOOGLE_CLIENT_ID: 'off' });
check('kill switch (variable = off) -> config gives none', c.google === '');
c = await call('GET', '/going/config', null, {}, { ...env, GOOGLE_CLIENT_ID: '' });
check('variable empty -> config gives none', c.google === '');
c = await call('GET', '/going/config', null, {}, { ...env, GOOGLE_CLIENT_ID: 'not a client id' });
check('malformed Client ID -> config gives none', c.google === '');
let r = await call('POST', '/going/google', { credential: await idToken() }, {}, { ...env, GOOGLE_CLIENT_ID: 'off' });
check('kill switch -> sign-in refused (google_off)', r._s === 503 && r.error === 'google_off');
check('refused sign-in creates nobody', !userOf('kim@gmail.com'));

// 2) a good token signs a new person in, no mail, no subscription
let n = logs.length;
r = await google(await idToken());
check('good token -> signed in', r._s === 200 && r.ok === true && /^[0-9a-f]{64}$/.test(r.session || ''));
let u = userOf('kim@gmail.com');
check('new person is verified, name from Google', !!(u && u.verified_at && u.name === 'Kim Minji' && u.lang === 'en'));
check('session belongs to that person', !!db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND user_id=?').get(await sha(r.session), u.id));
check('no mail sent', logs.length === n);
check('no subscription created', !db.prepare('SELECT 1 FROM email_subs WHERE email=?').get('kim@gmail.com'));
const me = await call('GET', '/going/mine', null, { Authorization: 'Bearer ' + r.session });
check('session works on the backend', me._s === 200);

// 3) email is stored lower-case; an existing person keeps their name and id
db.prepare("INSERT INTO users(email,name,lang,verified_at,created_at,ip_hash) VALUES('lee@example.kr','이서연','en','2026-11-01T00:00:00Z','2026-11-01T00:00:00Z','x')").run();
const before = userOf('lee@example.kr');
r = await google(await idToken({ email: 'Lee@Example.KR', name: 'Seoyeon Lee' }), { lang: 'zh' });
u = userOf('lee@example.kr');
check('existing person: same account, name kept', r.ok === true && u.id === before.id && u.name === '이서연' && u.verified_at === '2026-11-01T00:00:00Z');
check('upper-case Google email matched', !userOf('Lee@Example.KR'));
check('page language saved', u.lang === 'zh');
db.prepare("INSERT INTO users(email,name,lang,created_at,ip_hash) VALUES('new@example.jp','','en','2026-11-24T00:00:00Z','y')").run();
r = await google(await idToken({ email: 'new@example.jp', name: 'Sato' }));
u = userOf('new@example.jp');
check('unverified person: becomes verified, blank name filled', r.ok === true && !!u.verified_at && u.name === 'Sato');

// 4) everything a forged or stale token could try is refused, and creates nobody
const bad = async (label, tok) => { const x = await google(tok); check(label + ' -> google_bad', x._s === 400 && x.error === 'google_bad'); };
await bad('signed with another key', await idToken({ email: 'x1@gmail.com' }, { key: evil.privateKey }));
await bad('other app (aud)', await idToken({ email: 'x2@gmail.com', aud: '999-other.apps.googleusercontent.com' }));
await bad('not Google (iss)', await idToken({ email: 'x3@gmail.com', iss: 'https://evil.example' }));
await bad('expired', await idToken({ email: 'x4@gmail.com', iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 }));
await bad('older than 10 minutes', await idToken({ email: 'x5@gmail.com', iat: Math.floor(Date.now() / 1000) - 900 }));
await bad('issued in the future', await idToken({ email: 'x6@gmail.com', iat: Math.floor(Date.now() / 1000) + 3600 }));
await bad('email not verified', await idToken({ email: 'x7@gmail.com', email_verified: false }));
await bad('no email', await idToken({ email: '' }));
await bad('unknown key id', await idToken({ email: 'x8@gmail.com' }, { head: { kid: 'k9' } }));
await bad('alg none', (await idToken({ email: 'x9@gmail.com' }, { head: { alg: 'none' } })).split('.').slice(0, 2).join('.') + '.');
await bad('HS256 with the public key', await idToken({ email: 'x10@gmail.com' }, { head: { alg: 'HS256' } }));
const t = await idToken({ email: 'x11@gmail.com' }); const parts = t.split('.');
const p2 = b64u({ ...JSON.parse(Buffer.from(parts[1], 'base64url')), email: 'victim@gmail.com' });
await bad('changed email after signing', parts[0] + '.' + p2 + '.' + parts[2]);
await bad('garbage', 'not.a.token');
await bad('empty', '');
await bad('huge', 'a'.repeat(5000));
check('no refused token created a person', db.prepare("SELECT COUNT(*) n FROM users WHERE email LIKE 'x%@gmail.com' OR email='victim@gmail.com'").get().n === 0);
check('Google keys fetched once and cached', certCalls === 1);

// 5) Google's key address down -> a clear "try again", nobody created
certsDown = true;
const certMod = await import(pathToFileURL(path.join(dir, 'going.js')).href);
// a new key id forces a refetch only after a minute; simulate by a fresh module copy
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going2.js'));
const fresh = await import(pathToFileURL(path.join(dir, 'going2.js')).href);
let threw = false; try { await fresh.verifyGoogleToken(await idToken({ email: 'down@gmail.com' }), CID); } catch { threw = true; }
check('keys unreachable -> error (route answers google_down)', threw);
certsDown = false;
check('verify exported for the route', typeof certMod.verifyGoogleToken === 'function');

// 6) the same cap on new people per network as the email-code route (8 an hour)
for (let i = 0; i < 9; i++) db.prepare("INSERT INTO users(email,name,lang,created_at,ip_hash) VALUES(?,?,?,?,?)").run('cap' + i + '@example.test', '', 'en', new Date().toISOString(), (await sha('198.51.100.7atm')).slice(0, 16));
r = await call('POST', '/going/google', { credential: await idToken({ email: 'cap-new@gmail.com' }), lang: 'en' }, { 'CF-Connecting-IP': '198.51.100.7' });
check('busy network: new person refused', r._s === 429 && r.error === 'rate_limited' && !userOf('cap-new@gmail.com'));
r = await call('POST', '/going/google', { credential: await idToken({ email: 'kim@gmail.com' }), lang: 'en' }, { 'CF-Connecting-IP': '198.51.100.7' });
check('busy network: existing person still signs in', r.ok === true && sessionsOf('kim@gmail.com') === 2);

// 7) the email-code route is unchanged
n = logs.length;
r = await call('POST', '/profile', { email: 'code@example.com', for: 'reg', rlang: 'en', sub: 1, lang: 'en', ret: 'https://tangoweekend.org/event/beijing-2027-tango-weekend/register/draft/', ts: '' });
check('email code still sends one letter', r._s === 200 && r.ok === true && logs.length === n + 1);

globalThis.fetch = realFetch;
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('google sign-in ok');
