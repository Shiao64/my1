// 12/1 opening (Shiao 2026-11-25): once live (REG_LIVE=1), nobody registers before 2026-12-01 00:00 Beijing; testing is not held;
// after the opening anyone registers (mainland China too: no hold, the team reviews by hand), letters to the person, links to register/.
// Run: node social-worker/test/reg-open.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-open';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'social-worker/src')).filter(f => f.endsWith('.js'))) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.copyFileSync(path.join(root, 'social-worker/src/vendor/qrcode.js'), path.join(dir, 'vendor/qrcode.js'));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
for (const f of fs.readdirSync(path.join(root, 'social-worker/migrations')).filter(f => /^00(2[0-6])_/.test(f)).sort()) db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
const D1 = d => ({
  async batch(list) { d.exec('BEGIN'); try { const out = list.map(x => x.run()); d.exec('COMMIT'); return out; } catch (e) { d.exec('ROLLBACK'); throw e; } },
  prepare(sql) { const st = d.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    async first(col) { const r = st.get(...args); return r ? (col ? r[col] ?? null : r) : null; },
    async all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } });
const base = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: 'a'.repeat(32), REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests', REG_CODES: '{}' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 500) : '')); };
const mails = [];
const orig = console.log; console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function subscriber(email) {
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, 'Test', 'en', '2026-11-01', '2026-11-01');
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), '2026-11-01');
  return tok;
}
async function reg(env, tok, country = 'KR') {
  const res = await social(new Request('https://api.tangoweekend.org/social/reg', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', Authorization: 'Bearer ' + tok },
    body: JSON.stringify({ event: 'bstw2027', lang: 'en', hotel: 'no', people: [{ name: 'Amy Lee', country, city: 'Seoul', role: 'follower', pkg: 'pass', items: [] }] }) }), env, new URL('https://api.tangoweekend.org/social/reg'), json);
  const d = await res.json(); d._s = res.status; return d;
}
const realNow = Date.now, at = iso => { Date.now = () => Date.parse(iso); };

at('2026-11-30T23:59:00+08:00');
let d = await reg({ ...base, REG_LIVE: '1' }, subscriber('early@gmail.com'));
check('live, a minute before 00:00 Beijing: not open yet, says when', d._s === 403 && d.error === 'not_open_yet' && d.opens === '2026-12-01T00:00:00+08:00', d);
d = await reg(base, subscriber('tester@gmail.com'));
check('test mode before the opening: testing goes on', d.ok && d.code === 'BJ27-0001', d);
at('2026-12-01T00:00:00+08:00'); mails.length = 0;
d = await reg({ ...base, REG_LIVE: '1' }, subscriber('first@gmail.com'));
check('live at 00:00: open', d.ok && d.code === 'BJ27-0002', d);
check('...her letter to her, no [TEST], its link to register/ (not draft/)', mails.some(m => / to=first@gmail\.com /.test(m) && / subject=Registration received · BJ27-0002/.test(m)) && !mails.some(m => m.includes('/register/draft/')), mails.map(m => m.slice(0, 120)));
d = await reg({ ...base, REG_LIVE: '1' }, subscriber('cn@qq.com'), 'CN');
check('mainland China: let in too (the team reviews by hand)', d.ok && db.prepare("SELECT domestic FROM reg WHERE code=?").get(d.code).domestic === 1, d);
Date.now = realNow;

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-open tests passed:', passed);
