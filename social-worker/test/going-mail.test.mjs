// Mail binding compatibility. No network send. Run: node social-worker/test/going-mail.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-mail';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0009_going.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0012_going_occ.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0013_going_confirm_show.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0014_profile_verify_pending.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0016_phone_bind.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0018_confirm_claim.sql'), 'utf8'));
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
const calls = [];
const emailCalls = [];
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SENDER: 'subscribe@tangoweekend.org',
  ALLOW_NO_TURNSTILE: '1', GOING_CARDS: {}, TURNSTILE_SITEKEY: 'public-site-key', TURNSTILE_SECRET: 'do-not-leak',
  SUB_MAIL: { async send(msg) { calls.push(msg); } },
  EMAIL: { async send(msg) { emailCalls.push(msg); } }
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
async function post(path, body) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
async function get(path) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
const cfg = await get('/going/config');
check('config is the public site key only', cfg.sitekey === 'public-site-key' && !JSON.stringify(cfg).includes('do-not-leak') && !cfg.secret);
delete env.TURNSTILE_SECRET;
const ret = 'https://tangoweekend.org/asia/?card=W1';
const sent = await post('/profile', { name: 'Li', email: 'submail@example.com', city: 'Osaka', role: 'leader', lang: 'en', alert: 0, ret, ts: 'x', last4: '8000' });
check('unset SOCIAL_MAIL uses SUB_MAIL', sent.confirm && calls.length === 1 && calls[0].to === 'submail@example.com' && calls[0].from.email === 'subscribe@tangoweekend.org' && calls[0].from.name);
check('EMAIL is not the profile sender', emailCalls.length === 0);
env.SOCIAL_MAIL = 'log';
const logged = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) logged.push(s); else orig(...a); };
const again = await post('/profile', { name: 'Li', email: 'log@example.com', city: 'Osaka', role: 'follower', lang: 'en', alert: 0, ret, ts: 'x', last4: '8000' });
check('explicit log does not call SUB_MAIL', again.confirm && calls.length === 1 && logged.length === 1);
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going mail tests ok');
