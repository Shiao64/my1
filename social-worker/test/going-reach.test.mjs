// Organizer reach: public card email or a private directory keyed by card id / O### code.
// No network. The directory in this file is fake. Run: node social-worker/test/going-reach.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-going-reach';
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(root, 'social-worker/src/unsub.js'), path.join(dir, 'unsub.js'));
fs.copyFileSync(path.join(root, 'social-worker/src/going.js'), path.join(dir, 'going.js'));
const src = fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n');
fs.writeFileSync(path.join(dir, 'social.js'), src);
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const { organizerAddress, runGoingDigests } = await import(pathToFileURL(path.join(dir, 'going.js')).href);

const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const kit = { ID_RE: /^[A-Za-z0-9_-]{1,64}$/, EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ };
const CARDS = {
  PUB: { email: 'public@example.com', kind: 'event', title: 'Public', title_zh: '公开' },
  PRIV: { email: '', kind: 'event', title: 'Private card', title_zh: '卡内私有' },
  LIST: { email: '', kind: 'event', title: 'From the list', title_zh: '名单' },
  NONE: { email: '', kind: 'event', title: 'No mail', title_zh: '无邮箱' },
  CCARD: { email: '', kind: 'event', title: 'Site CC', title_zh: '抄送' },
  ORGCC: { email: '', kind: 'event', title: 'Org CC', title_zh: '名单抄送' }
};
const GOING_ORG_DIR = {
  cards: { PRIV: 'private-card@example.com', CCARD: 'selecttango@gmail.com' },
  orgs: { O9: 'org-list@example.com', O1: 'selecttango@gmail.com' },
  links: { LIST: ['O9'], ORGCC: ['O1'], PUB: ['O9'] }
};
const env = {
  GOING_CARDS: CARDS, GOING_ORG_DIR, GOING_NOW: '2026-11-09T06:00:00.000Z', GOING_DIGEST_SEND: 'on',
  API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ALLOW_NO_TURNSTILE: '1'
};
check('public card email wins over the directory', organizerAddress({ id: 'PUB', email: 'public@example.com' }, env, kit) === 'public@example.com');
check('card private email is used when the card shows none', organizerAddress({ id: 'PRIV', email: '' }, env, kit) === 'private-card@example.com');
check('organizer code O9 resolves', organizerAddress({ id: 'LIST', email: '' }, env, kit) === 'org-list@example.com');
check('site CC is not an organizer', organizerAddress({ id: 'CCARD', email: '' }, env, kit) === '' && organizerAddress({ id: 'ORGCC', email: '' }, env, kit) === '');
check('no address stays empty', organizerAddress({ id: 'NONE', email: '' }, env, kit) === '');
const sheetEnv = { GOING_ORG_DIR: JSON.stringify({
  v: 1,
  cards: { 'manual-cd-example': '邮箱：card-cell@example.com（备注）' },
  orgs: { o901: 'selecttango@gmail.com', O900: '名单：list-cell@example.com（11/3）' },
  links: { 'sheet-card': 'O901、O900（联合 O901+O900） 张三' }
}), GOING_ORG_DIR_2: '{"orgs":{"O900":"later@example.com"},"links":{"sheet-card":["O902"]}}', GOING_ORG_DIR_3: '{not json' };
check('sheet cell text and O codes resolve without the site CC', organizerAddress({ id: 'manual-cd-example', email: '' }, sheetEnv, kit) === 'card-cell@example.com');
check('link text uses the first usable O code and ignores a name', organizerAddress({ id: 'sheet-card', email: '' }, sheetEnv, kit) === 'list-cell@example.com');
check('a later directory part does not replace the first address', organizerAddress({ id: 'sheet-card', email: '' }, sheetEnv, kit) === 'list-cell@example.com');
const off = await runGoingDigests({ GOING_DIGEST_SEND: '' }, kit);
check('digest stays off without the digest table', off.enabled === false && off.sent === 0);

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0009_going.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0012_going_occ.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0013_going_confirm_show.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0014_profile_verify_pending.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations/0011_going_digests.sql'), 'utf8'));
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en', verified_at TEXT, city TEXT, role TEXT, created_at TEXT NOT NULL);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
function D1(database) {
  return { prepare(sql) { const st = database.prepare(sql); let args = []; return {
    bind(...a) { args = a; return this; },
    first(col) { const r = st.get(...args); if (!r) return null; return col ? r[col] ?? null : r; },
    all() { return { results: st.all(...args) }; },
    run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
  }; } };
}
env.SDB = D1(db); env.DB = D1(db);
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
async function get(path) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + path), env, new URL('https://api.tangoweekend.org/social' + path), json);
  const d = await res.json(); d._s = res.status; return d;
}
const reach = await get('/going/reach?ids=PUB,PRIV,LIST,NONE,CCARD,ORGCC');
const body = JSON.stringify(reach);
check('reach booleans follow the same addresses', reach._s === 200 && reach.reach.PUB === true && reach.reach.PRIV === true && reach.reach.LIST === true && reach.reach.NONE === false && reach.reach.CCARD === false && reach.reach.ORGCC === false);
check('reach does not reveal an address', !body.includes('private-card@example.com') && !body.includes('org-list@example.com') && !body.includes('public@example.com'));
const open = await get('/going/reach?ids=LIST');
check('reach does not require a session', open._s === 200 && open.reach.LIST === true);

db.prepare("INSERT INTO users(email,name,city,role,verified_at,created_at) VALUES('ada@example.com','Ada','Seoul','leader',?,?)").run('2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z');
db.prepare("INSERT INTO going_intents(email,card_id,intent,occurrence_date,transport,notify,status,mail_status,created_at,updated_at) VALUES('ada@example.com','LIST','going',NULL,0,0,'active','queued',?,?)").run('2026-11-08T02:00:00.000Z', '2026-11-08T02:00:00.000Z');
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : String(x)).join(' '); if (s.startsWith('[mail:log]')) mails.push(s); else orig(...a); };
const sent = await runGoingDigests(env, { ...kit, he: s => String(s), clean: (s, n) => String(s || '').slice(0, n), deliver: async (e, to, subject, text, html, headers, opt) => {
  opt = opt || {};
  console.log(`[mail:log] to=${to}${opt.cc ? ' cc=' + opt.cc : ''} subject=${subject}\n${text}`);
} });
const listMail = mails.filter(m => m.includes('to=org-list@example.com'));
check('the list address is the recipient and the site CC is only CC', sent.sent === 1 && listMail.length === 1 && listMail[0].includes('cc=selecttango@gmail.com') && !mails.some(m => m.includes('to=selecttango@gmail.com')) && listMail[0].includes('Seoul') && listMail[0].includes('leader'));

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going reach ok');
