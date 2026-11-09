// Magic-link confirm: a GET (mail scanner, WeChat link check) must not burn the token.
// The link stays valid for 60 minutes and can be opened more than once. Run: node social-worker/test/confirm.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-confirm';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, code_hash TEXT, code_sent_at TEXT, code_tries INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT);
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
const env = {
  SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log',
  ALLOW_NO_TURNSTILE: '1', PREVIEW_SHOW_CODE: '1', ADMIN_TOKEN: 'test-admin-token-not-a-secret'
};
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
const ret = 'https://tangoweekend.org/zh/asia/?card=E093';
const fail = [];
const check = (name, ok) => { if (!ok) fail.push(name); };

async function signup(email, extra) {
  const res = await social(new Request('https://api.tangoweekend.org/social/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Li', city: 'Shanghai', role: 'leader', email, lang: 'zh', ts: 'x', magic: 1, updates: 1, ret, ...extra })
  }), env, new URL('https://api.tangoweekend.org/social/signup'), json);
  const body = await res.json();
  check('signup ' + email, res.status === 200 && body.ok && body.preview_link);
  return body.preview_link;
}
function user(email) { return db.prepare('SELECT code_hash h, code_tries t, verified_at v, code_sent_at s FROM users WHERE email=?').get(email); }
function sessions(email) { return db.prepare('SELECT COUNT(*) n FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.email=?').get(email).n; }

const link = await signup('owner@example.com');
const url = new URL(link);
check('link shape', url.pathname === '/social/confirm' && /^[0-9a-f]{64}$/.test(url.searchParams.get('t')) && url.searchParams.get('e') === 'owner@example.com');

const before = user('owner@example.com');
const got = async (method, u, body) => social(new Request(u, { method, ...(body ? { body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } : {}) }), env, new URL(u), json);
const g1 = await got('GET', link);
const g1t = await g1.text();
check('scanner GET is the button', g1.status === 200 && g1t.includes('name="confirm"') && g1t.includes('确认') && !g1t.includes('链接已过期'));
check('scanner GET did not burn', user('owner@example.com').h === before.h && user('owner@example.com').t === 0 && sessions('owner@example.com') === 0);
check('scanner GET did not subscribe', !db.prepare('SELECT 1 n FROM email_subs WHERE email=?').get('owner@example.com'));
const g2 = await got('GET', link);
check('second GET still the button', (await g2.text()).includes('name="confirm"') && user('owner@example.com').h === before.h);
const head = await got('HEAD', link);
check('HEAD is not an error page', head.status === 200 && user('owner@example.com').h === before.h);

const bare = await got('POST', 'https://api.tangoweekend.org/social/confirm', new URLSearchParams({ e: 'owner@example.com', t: url.searchParams.get('t'), next: ret }).toString());
check('POST without the button does not confirm', (await bare.text()).includes('name="confirm"') && !user('owner@example.com').v && sessions('owner@example.com') === 0);

const badGet = await got('GET', link.replace(url.searchParams.get('t'), 'ab'.repeat(32)));
check('bad GET is invalid and does not count', (await badGet.text()).includes('链接无效') && user('owner@example.com').t === 0);

const postBody = new URLSearchParams({ e: 'owner@example.com', t: url.searchParams.get('t'), next: ret, confirm: '1' }).toString();
const ok1 = await got('POST', 'https://api.tangoweekend.org/social/confirm', postBody);
const ok1t = await ok1.text();
check('button POST succeeds', ok1.status === 200 && ok1t.includes('订阅成功') && ok1t.includes('#atm='));
check('hash kept and subscribed', !!user('owner@example.com').h && user('owner@example.com').h === before.h && !!user('owner@example.com').v && db.prepare("SELECT status FROM email_subs WHERE email=?").get('owner@example.com').status === 'active');
const ok2 = await got('POST', 'https://api.tangoweekend.org/social/confirm', postBody);
check('second tap still succeeds', (await ok2.text()).includes('订阅成功') && sessions('owner@example.com') === 2);

db.prepare('UPDATE users SET code_sent_at=? WHERE email=?').run(new Date(Date.now() - 59 * 60e3).toISOString(), 'owner@example.com');
check('59 min still open', (await (await got('GET', link)).text()).includes('name="confirm"'));
db.prepare('UPDATE users SET code_sent_at=? WHERE email=?').run(new Date(Date.now() - 61 * 60e3).toISOString(), 'owner@example.com');
const old = await got('GET', link);
check('61 min is the expired screen', old.status === 400 && (await old.text()).includes('链接已过期。请回到页面重新发送确认邮件。 / This link has expired. Send a new confirmation email.'));

const plus = await signup('user+tag@example.com');
const plusTok = new URL(plus).searchParams.get('t');
check('plus address encoded', new URL(plus).searchParams.get('e') === 'user+tag@example.com');
const plusPage = await got('GET', 'https://api.tangoweekend.org/social/confirm?e=user+tag@example.com&t=' + plusTok + '&next=' + encodeURIComponent(ret));
check('literal plus still finds the row', (await plusPage.text()).includes('name="confirm"'));

const lock = await signup('lock@example.com');
const lockTok = new URL(lock).searchParams.get('t');
for (let i = 0; i < 5; i++) await got('POST', 'https://api.tangoweekend.org/social/confirm', new URLSearchParams({ e: 'lock@example.com', t: 'cd'.repeat(32), next: ret, confirm: '1' }).toString());
check('five bad taps lock it', user('lock@example.com').t === 5);
const locked = await got('POST', 'https://api.tangoweekend.org/social/confirm', new URLSearchParams({ e: 'lock@example.com', t: lockTok, next: ret, confirm: '1' }).toString());
check('locked link says expired', (await locked.text()).includes('链接已过期'));

const missing = await got('GET', 'https://api.tangoweekend.org/social/confirm?e=nobody@example.com&t=' + 'ef'.repeat(32) + '&next=' + encodeURIComponent(ret));
check('unknown email uses the expired screen', (await missing.text()).includes('链接已过期'));

if (fail.length) { console.error('FAIL', fail.join(', ')); process.exit(1); }
console.log('confirm link tests ok');
