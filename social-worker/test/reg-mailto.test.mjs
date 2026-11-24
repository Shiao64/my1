// 活动邮箱 (Shiao, 2026-11-24): only the 管理员 changes them, the 总管 only sees them. Every registration letter and the
// 新报名 notice go, each as its own letter, to the 总管邮箱, the 副本邮箱 (may be empty) and the 管理员 (fixed; can be
// turned off, but not while the 总管邮箱 is empty or not verified). The registrant sees none of them. The 任命信 carries
// the link only, never the password; opening it verifies the 总管邮箱. The 副本邮箱 gets short notices, never a link.
// Test stage: everything except the 管理员's own mail only to the test inbox.
// Run: node social-worker/test/reg-mailto.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-mailto';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social, regCron } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
const mig = f => db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql', '0025_no_site_manager.sql']) mig(f);
function D1(database) {
  return {
    async batch(list) { database.exec('BEGIN'); try { const out = list.map(x => x.run()); database.exec('COMMIT'); return out; } catch (e) { database.exec('ROLLBACK'); throw e; } },
    prepare(sql) { const st = database.prepare(sql); let args = []; return {
      bind(...a) { args = a; return this; },
      async first(col) { const r = st.get(...args); return r ? (col ? r[col] ?? null : r) : null; },
      async all() { return { results: st.all(...args) }; },
      run() { const r = st.run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; }
    }; } };
}
const ADMIN = 'a'.repeat(32), INBOX = 'selecttango@gmail.com', BOSS = 'boss@example.com';
// REG_NOTIFY = the 管理员's own address; a different one from the test inbox here, so where each letter goes is plain
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_NOTIFY: BOSS, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 700) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(parse(s)); else if (!/^(tp mail|reg owner mail)/.test(s)) orig(...a); };
function parse(s) {   // the log line ends the subject with any extra headers as JSON
  const m = /^\[mail:log\] from=(.*?) to=(\S+)( cc=\S+)?( reply-to=\S+)? subject=([^\n]*?)( \{[^\n]*\})?\n([\s\S]*)$/.exec(s);
  return m ? { from: m[1], to: m[2], cc: (m[3] || '').trim(), replyTo: (m[4] || '').replace(' reply-to=', ''), subject: m[5], body: m[7] } : { raw: s, subject: '', body: '' };
}
const take = () => mails.splice(0, mails.length);
const subs = ms => ms.map(m => m.to + ' | ' + m.subject);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const keyOf = link => (/\/register\/in\/(?:\?m=[0-9a-f]{32})?#([0-9a-f]{48})/.exec(link || '') || [])[1];
const mOf = text => (/\/register\/in\/\?m=([0-9a-f]{32})#/.exec(text || '') || [])[1];
function subscriber(email, name) {
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, 'en', '2026-11-01', '2026-11-01');
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), '2026-11-01');
  return tok;
}
async function call(method, p, body, auth) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const person = (o = {}) => ({ name: 'Amy Lee', country: 'KR', city: 'Seoul', role: 'follower', pkg: 'full', items: [], ...o });
const form = (o = {}) => ({ event: 'bstw2027', lang: 'en', people: [person()], hotel: 'no', ...o });
const signIn = async (made, own) => (await call('POST', '/reg/login', { key: keyOf(made.link), pin: made.pin, new_pin: own })).token;
const list = auth => call('GET', '/admin/reg?event=bstw2027', null, auth);
const mailto = async () => (await list(ADMIN)).mailto;
const save = body => call('POST', '/admin/reg/mailto', { event: 'bstw2027', ...body }, ADMIN);
const idOf = async code => (await list(ADMIN)).rows.find(r => r.code === code).id;
const logs = (code, like) => db.prepare("SELECT l.action,l.detail FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.code=? AND l.action LIKE ? ORDER BY l.id").all(code, like);
const CHIEF = 'chief@example.com', CHIEF2 = 'chief2@example.com', COPY = 'copy@example.com';
const T = to => '[TEST → ' + to + '] ', O = '[测试] ';   // test stage: a registrant off the 测试名单 → test inbox; organizers straight, marked
// who got a copy of this letter (by the subject's tail), test stage or live
const whom = m => m.subject.startsWith('[TEST → ') ? m.subject.slice(8, m.subject.indexOf(']')) : m.to;
const copyTo = (ms, tail) => ms.filter(m => m.subject.endsWith('[副本] ' + tail)).map(whom).sort();
const notified = (ms, code) => ms.filter(m => m.subject.endsWith('新报名 ' + code)).map(whom).sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify([...b].sort());

// --- before migration 0026: letters as before, plus the 管理员's copy (the default); nothing can be saved yet
const amy = subscriber('amy@example.com', 'Amy');
let d = await call('POST', '/reg', form(), amy);
let ms = take();
check('old database: registration still works', d.ok && d.mail === 'sent' && d.code === 'BJ27-0001', d);
check('old database: the 管理员 gets a copy and the 新报名 notice, straight', same(copyTo(ms, 'Registration received · BJ27-0001'), [BOSS]) && same(notified(ms, 'BJ27-0001'), [BOSS])
  && ms.filter(m => m.to === BOSS).every(m => !m.subject.startsWith('[TEST')), subs(ms));
d = await mailto(); check('old database: list shows the fixed 管理员 and nothing else', d && d.chief === '' && d.copy === '' && d.admin === BOSS && d.admin_on === true && d.verified === false && d.live === false, d);
d = await save({ copy: COPY }); check('old database: saving says not ready', d._s === 503 && d.error === 'not_ready', d);
mig('0026_reg_mailto.sql');
mig('0026_reg_mailto.sql');   // running it twice is harmless

// --- who may: the 管理员 changes; a 经理 is not even sent them
const dep = await call('POST', '/admin/reg/admins', { event: 'bstw2027', name: '竟文', role: 'deputy' }, ADMIN);
check('deputy appointed, no letter (only the 总管 gets one)', dep.ok && dep.letter === undefined, dep);
const depTok = await signIn(dep, '730195');
d = await list(depTok); check('经理: list has no mailto at all', d.rows && !('mailto' in d), Object.keys(d));
d = await call('POST', '/admin/reg/mailto', { event: 'bstw2027', copy: COPY }, depTok); check('经理 cannot change', d._s === 403, d);
d = await save({ copy: 'not an email' }); check('bad 副本 address refused', d._s === 400 && d.error === 'bad_email' && d.which === 'copy', d);
d = await save({ chief: 'x@y' }); check('bad 总管 address refused', d._s === 400 && d.which === 'chief', d);
take();

// --- 副本邮箱: a short notice, no link, to the test inbox only
d = await save({ copy: ' Copy@Example.com ' }); ms = take();
check('copy saved (trimmed, lower case), notice sent', d.ok && d.mailto.copy === COPY && d.sent.copy === 'sent', d);
check('copy notice: one letter, straight to it, marked [测试]', ms.length === 1 && ms[0].to === COPY && ms[0].subject === O + '探戈通：副本邮箱已设定（北京精选探戈周末 2027）', subs(ms));
check('copy notice: from 探戈通, replies to info@, no link', ms[0] && ms[0].from === '探戈通 Tango Pass' && ms[0].replyTo === 'info@tangoweekend.org' && !/https?:/.test(ms[0].body), ms[0]);
check('copy notice: explains', ms[0] && ms[0].body.includes('副本邮箱') && ms[0].body.includes('报名者看不到'), ms[0] && ms[0].body);
d = await save({ copy: COPY }); ms = take();
check('same address again: nothing sent', d.ok && Object.keys(d.sent).length === 0 && ms.length === 0, [d, ms]);

// --- 总管邮箱 before there is a 总管: kept, the letter waits for the appointment
d = await save({ chief: CHIEF }); ms = take();
check('chief address saved, waits for a 总管', d.ok && d.mailto.chief === CHIEF && d.sent.chief === 'wait' && !d.mailto.verified && ms.length === 0, [d, ms]);

// --- appointing the 总管: 任命信 with the link (and its own token), never the password; the 副本邮箱 told, no link
const chief = await call('POST', '/admin/reg/admins', { event: 'bstw2027', name: '李总', role: 'chief' }, ADMIN);
ms = take();
check('appointed, letter sent', chief.ok && chief.letter === 'sent' && keyOf(chief.link) && /^\d{6}$/.test(chief.pin) && !chief.link.includes('?m='), chief);
const appoint = ms.find(m => m.subject.includes('你被任命为总管'));
const m1 = appoint && mOf(appoint.body);
check('任命信 straight to the 总管邮箱, marked [测试]', appoint && appoint.to === CHIEF && appoint.subject === O + '探戈通：你被任命为总管（北京精选探戈周末 2027）', subs(ms));
check('任命信: the same link as the page, plus a token', appoint && keyOf(appoint.body) === keyOf(chief.link) && m1, appoint && appoint.body);
check('任命信: no password anywhere', ms.every(m => !m.body.includes(chief.pin)), chief.pin);
check('任命信: password by WeChat or phone; opening the link checks the mailbox', appoint && appoint.body.includes('微信或电话') && appoint.body.includes('这封信里没有密码') && appoint.body.includes('确认了这个邮箱'), appoint && appoint.body);
const told = ms.find(m => m.subject.includes('总管已任命'));
check('副本邮箱 told, without a link', told && told.to === COPY && told.subject === O + '探戈通：总管已任命（北京精选探戈周末 2027）' && told.body.includes('李总') && told.body.includes(CHIEF) && !told.body.includes('/register/in/'), told);
check('appointment: two letters, straight, marked, no Cc', ms.length === 2 && ms.every(m => [CHIEF, COPY].includes(m.to) && m.subject.startsWith(O) && !m.cc), subs(ms));
const chiefTok = await signIn(chief, '730195');
d = await mailto(); check('signed in with the page link: not verified', d.verified === false, d);
d = await call('POST', '/reg/login/hello', { key: keyOf(chief.link), m: 'f'.repeat(32) }); check('a wrong token verifies nothing', d.ok && !d.mail_ok, d);
d = await call('POST', '/reg/login/hello', { key: keyOf(dep.link), m: m1 }); check('the token with someone else\'s link verifies nothing', !d.mail_ok, d);
d = await call('POST', '/reg/login/hello', { key: keyOf(appoint.body), m: m1 }); check('opening the 任命信 link: verified', d.ok && d.mail_ok === true && d.name === '李总', d);
d = await mailto(); check('settings: 总管邮箱 verified, with the time', d.verified === true && !!d.verified_at, d);
d = await list(chiefTok); check('总管 sees the 活动邮箱', d.mailto && d.mailto.chief === CHIEF && d.mailto.copy === COPY && d.mailto.admin === BOSS && !('chief_token' in d.mailto), d.mailto);
d = await call('POST', '/admin/reg/mailto', { event: 'bstw2027', copy: 'x@example.com' }, chiefTok); check('总管 cannot change them', d._s === 403, d);
d = await call('POST', '/admin/reg/mailto', { event: 'bstw2027', admin_on: false }, chiefTok); check('总管 cannot turn the 管理员 off', d._s === 403, d);
take();

// --- every registration letter and the 新报名 notice: one each, separately; the registrant sees none of the addresses
const bob = subscriber('bob@example.com', 'Bob');
d = await call('POST', '/reg', form({ people: [person({ name: 'Bob Kim', items: [] })] }), bob);
const bobCode = d.code; ms = take();
const own = ms.find(m => m.subject === T('bob@example.com') + 'Registration received · ' + bobCode);
check('received: copies to 总管, 副本 and 管理员', same(copyTo(ms, 'Registration received · ' + bobCode), [BOSS, CHIEF, COPY]), subs(ms));
check('新报名 notice: to 总管, 副本 and 管理员', same(notified(ms, bobCode), [BOSS, CHIEF, COPY]), subs(ms));
check('test stage: registrant (off the list) in the test inbox; 总管, 副本, 管理员 straight, marked', ms.filter(m => m.to === INBOX).length === 1 && ms.filter(m => m.to !== INBOX).every(m => m.subject.startsWith(O)) && [BOSS, CHIEF, COPY].every(a => ms.filter(m => m.to === a).length === 2), subs(ms));
check('7 letters, none with Cc', ms.length === 7 && ms.every(m => !m.cc), subs(ms));
check('registrant letter names none of them', own && ![CHIEF, COPY, BOSS].some(a => own.body.includes(a)), own && own.body);
const cc1 = ms.find(m => m.to === CHIEF && m.subject === O + '[副本] Registration received · ' + bobCode);
check('copy says whose letter it is and carries it', cc1 && cc1.body.startsWith('副本：这是寄给报名者 bob@example.com（' + bobCode + '）那封信的副本') && cc1.body.includes('Bob Kim'), cc1 && cc1.body.slice(0, 90));
check('copies reply to info@ like the letter', ms.filter(m => m.subject.includes('[副本]')).every(m => m.replyTo === 'info@tangoweekend.org'));
const n1 = ms.find(m => m.to === CHIEF && m.subject === O + '新报名 ' + bobCode), nb = ms.find(m => m.to === BOSS && m.subject === O + '新报名 ' + bobCode);
check('新报名 notice to the 总管: same text as the 管理员\'s', n1 && nb && n1.body === nb.body && n1.body.includes('bob@example.com'), n1);
check('log: copies recorded without addresses', logs(bobCode, 'copy%').map(x => x.action + '=' + x.detail).join(' ') === 'copy:recv=chief,copy,admin copy:notify=chief,copy', logs(bobCode, 'copy%'));
const bobId = await idOf(bobCode);
d = await list(ADMIN); check('copies do not count as unsent letters', d.rows.find(r => r.id === bobId).mail_failed.length === 0);

// --- 管理员也收信: off, and the 总管邮箱 verified → the 管理员 gets none
d = await save({ admin_on: false }); ms = take();
check('管理员 off: saved, no letter', d.ok && d.mailto.admin_on === false && ms.length === 0, [d, ms]);
d = await call('POST', '/admin/reg/act', { id: bobId, action: 'waitlist' }, ADMIN); ms = take();
check('管理员 off + verified: copies only to 总管 and 副本', same(copyTo(ms, 'Waiting list · ' + bobCode), [CHIEF, COPY]), subs(ms));
const cat = subscriber('cat@example.com', 'Cat');
d = await call('POST', '/reg', form({ people: [person({ name: 'Cat Wu' })] }), cat); const catCode = d.code; ms = take();
check('管理员 off + verified: no 新报名 to the 管理员', same(notified(ms, catCode), [CHIEF, COPY]), subs(ms));

// --- 总管邮箱 changed: not verified any more → the 管理员 gets them again, though off; a new link, the old one stops
const oldKey = keyOf(chief.link);
d = await save({ chief: CHIEF2 }); ms = take();
const re = ms.find(m => m.subject.includes('你被任命为总管'));
const newKey = re && keyOf(re.body), m2 = re && mOf(re.body);
check('relink: letter to the new address', d.ok && d.sent.chief === 'sent' && re && re.to === CHIEF2 && re.subject.startsWith(O) && d.mailto.verified === false, [d, subs(ms)]);
check('relink: a new link, not the old one', newKey && newKey !== oldKey && m2 && m2 !== m1, [newKey, oldKey]);
check('relink: says the password stays (already their own)', re && re.body.includes('密码不变') && !re.body.includes('730195'), re && re.body);
check('relink: 副本邮箱 told, with the new address', ms.some(m => m.subject.includes('总管已任命') && m.body.includes(CHIEF2)), subs(ms));
d = await call('POST', '/admin/reg/act', { id: await idOf(catCode), action: 'confirm' }, ADMIN); ms = take();
check('not verified: the 管理员 gets it although off', same(copyTo(ms, 'Registration confirmed · ' + catCode), [BOSS, CHIEF2, COPY]), subs(ms));
d = await call('POST', '/reg/login/hello', { key: oldKey }); check('relink: old link stops', d._s === 404, d);
d = await call('POST', '/reg/login/hello', { key: oldKey, m: m1 }); check('the old letter verifies nothing now', d._s === 404 && !d.mail_ok, d);
d = await call('POST', '/reg/login/hello', { key: newKey }, chiefTok); check('relink: new link on the 总管\'s own phone → same person', d.ok && d.name === '李总' && d.same === true && !d.mail_ok, d);
d = await call('POST', '/reg/login/hello', { key: newKey }, depTok); check('someone else\'s phone is not the same person', d.ok && !d.same, d);
d = await call('GET', '/admin/reg/me?event=bstw2027', null, chiefTok); check('relink: the signed-in phone stays in', d.ok && d.role === 'chief', d);
d = await call('POST', '/reg/login', { key: newKey, pin: '730195' }); check('relink: own password works with the new link', d.ok && d.token, d);
d = await call('POST', '/reg/login/hello', { key: newKey, m: m2 }); check('relink: opening it verifies the new address', d.mail_ok === true, d);
d = await call('POST', '/admin/reg/act', { id: await idOf(catCode), action: 'pay' }, ADMIN); ms = take();
check('verified again: the 管理员 off again', same(copyTo(ms, 'Payment received · ' + catCode), [CHIEF2, COPY]), subs(ms));

// --- live: a letter read in the test inbox does not count; everyone gets their own letter, never an entry code in a copy
env.REG_LIVE = '1';
d = await mailto(); check('live: a verification made at the 总管\'s own mailbox still counts', d.live === true && d.verified === true, d);
const vrow = db.prepare("SELECT value FROM reg_setting WHERE key='chief_verified'").get().value;
check('the verification is marked direct', /\|direct\|/.test(vrow), vrow);
db.prepare("UPDATE reg_setting SET value=? WHERE key='chief_verified'").run(vrow.replace('|direct|', '|test|'));
d = await mailto(); check('live: one read in the test inbox (before 1225) does not count', d.verified === false, d);
d = await call('POST', '/admin/reg/act', { id: bobId, action: 'confirm' }, ADMIN); ms = take();
check('live: confirm → registrant, 总管, 副本 and (not verified) 管理员, each straight', ms.length === 4 && ['bob@example.com', CHIEF2, COPY, BOSS].every(a => ms.some(m => m.to === a && !m.cc && !m.subject.startsWith('[TEST'))), subs(ms));
check('live: copy html has the copy line on top', ms.filter(m => m.to !== 'bob@example.com').every(m => /<body[^>]*><div[^>]*>副本：/.test(m.body)), ms.map(m => m.body.slice(-300)));
d = await save({ resend: 'chief' }); ms = take();
const re3 = ms.find(m => m.subject.includes('你被任命为总管'));
check('live: 重寄任命信 → straight to the 总管, 副本 not told of a resend', d.sent.chief === 'sent' && ms.length === 1 && re3 && re3.to === CHIEF2 && !re3.subject.startsWith('[TEST'), subs(ms));
d = await call('POST', '/reg/login/hello', { key: keyOf(re3.body), m: mOf(re3.body) }); check('live: opened → verified', d.mail_ok === true && (await mailto()).verified === true, d);
d = await call('POST', '/admin/reg/act', { id: bobId, action: 'paid' }, ADMIN); ms = take();
const paidOwn = ms.find(m => m.to === 'bob@example.com'), paidCopies = ms.filter(m => m.subject.includes('[副本]'));
check('live: paid letter has the entry code', paidOwn && /\/social\/reg\/pass\/BJ27-\d{4}-1\.[0-9a-f]{20}\.png/.test(paidOwn.body), paidOwn && paidOwn.body.slice(-300));
check('live: paid copies (管理员 off, verified): 总管 and 副本, no entry code, say so', same(paidCopies.map(m => m.to).sort(), [CHIEF2, COPY]) && paidCopies.every(m => !m.body.includes('/social/reg/pass/') && !m.body.includes('/checkin/?p=') && m.body.includes('入场码只寄给报名者本人')), subs(ms));
delete env.REG_LIVE;
d = await save({ admin_on: true }); check('管理员 back on', d.mailto.admin_on === true);
take();

// --- no letter, no copy
const dan = subscriber('dan@example.com', 'Dan');
d = await call('POST', '/reg', form({ people: [person({ name: 'Dan' })] }), dan); const danCode = d.code; take();
d = await call('POST', '/admin/reg/act', { id: await idOf(danCode), action: 'waitlist', silent: 1 }, ADMIN); ms = take();
check('silent action: no letter and no copy', d.ok && ms.length === 0, subs(ms));

// --- one address for two: one copy. The 总管 registering: no copy of their own letter to themself
d = await save({ copy: CHIEF2 }); ms = take();
check('副本 = 总管 address: notice sent', d.sent.copy === 'sent' && ms.length === 1 && ms[0].subject.includes('副本邮箱已设定'), subs(ms));
d = await call('POST', '/admin/reg/act', { id: await idOf(catCode), action: 'cancel' }, ADMIN); ms = take();
check('same address for two → one copy', same(copyTo(ms, 'Registration cancelled · ' + catCode), [BOSS, CHIEF2]), subs(ms));
d = await save({ copy: COPY }); take();
d = await call('POST', '/reg', form({ people: [person({ name: 'Li Zong' })] }), subscriber(CHIEF2, 'Li'));
ms = take();
check('总管 registers: own letter; copies only to 副本 and 管理员', ms.some(m => m.subject === T(CHIEF2) + 'Registration received · ' + d.code) && same(copyTo(ms, 'Registration received · ' + d.code), [BOSS, COPY]), subs(ms));

// --- the letter cannot go out: the old link is put back
const realFetch = globalThis.fetch;
env.SOCIAL_MAIL = 'resend'; env.RESEND_API_KEY = 'k';
globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'down' });
d = await save({ resend: 'chief' });
globalThis.fetch = realFetch; env.SOCIAL_MAIL = 'log'; delete env.RESEND_API_KEY;
check('resend failed: page is told', d.ok && d.sent.chief === 'failed', d);
d = await call('POST', '/reg/login/hello', { key: keyOf(re3.body) }); check('resend failed: the link from before still works', d.ok && d.name === '李总', d);
take();

// --- reset of the 总管: the new link by mail, no password; the 副本邮箱 not told
let chiefRow = (await list(ADMIN)).admins.find(x => x.name === '李总');
d = await call('POST', '/admin/reg/admins/reset', { event: 'bstw2027', id: chiefRow.id, v: chiefRow.v }, ADMIN); ms = take();
check('reset: letter sent, only to the 总管', d.ok && d.letter === 'sent' && ms.length === 1, [d, subs(ms)]);
check('reset: new link with a token, not the password', ms[0] && ms[0].to === CHIEF2 && ms[0].subject === O + '探戈通：你的总管登入已重设（北京精选探戈周末 2027）' && keyOf(ms[0].body) === keyOf(d.link) && mOf(ms[0].body) && !ms[0].body.includes(d.pin), ms[0]);
// sent again while the password is a temporary one: it comes another way
d = await save({ resend: 'chief' }); ms = take();
check('resend with a temporary password: says it comes by WeChat or phone', d.sent.chief === 'sent' && ms[0] && ms[0].body.includes('这封信里没有密码') && !ms[0].body.includes('密码不变'), ms[0] && ms[0].body);
const depRow = (await list(ADMIN)).admins.find(x => x.name === '竟文');
d = await call('POST', '/admin/reg/admins/reset', { event: 'bstw2027', id: depRow.id, v: depRow.v }, ADMIN); ms = take();
check('经理 reset: no letter', d.ok && d.letter === undefined && ms.length === 0, subs(ms));

// --- the 总管 no longer 总管: the address is cleared; with no 总管邮箱 the 管理员 gets everything even if off
d = await save({ admin_on: false }); take();
chiefRow = (await list(ADMIN)).admins.find(x => x.name === '李总');
d = await call('POST', '/admin/reg/admins/role', { event: 'bstw2027', id: chiefRow.id, role: 'deputy' }, ADMIN);
check('demoted: address cleared', d.ok && d.mail_cleared === true && d.letter === undefined, d);
d = await mailto(); check('demoted: 总管邮箱 empty, 副本 kept, not verified', d.chief === '' && d.copy === COPY && d.verified === false, d);
d = await call('POST', '/admin/reg/act', { id: await idOf(danCode), action: 'confirm' }, ADMIN); ms = take();
check('no 总管邮箱: the 管理员 gets it although off', same(copyTo(ms, 'Registration confirmed · ' + danCode), [BOSS, COPY]), subs(ms));
// a 经理 made 总管, with a 总管邮箱: a new link by mail (their phones were signed out by the change anyway)
d = await save({ chief: CHIEF }); check('no 总管 now: waits', d.sent.chief === 'wait', d);
const vBefore = (await list(ADMIN)).admins.find(x => x.name === '李总').v;
d = await call('POST', '/admin/reg/admins/role', { event: 'bstw2027', id: chiefRow.id, role: 'chief' }, ADMIN); ms = take();
const pro = ms.find(m => m.subject.includes('你被任命为总管'));
check('promoted: 任命信 with a new link and a token', d.ok && d.letter === 'sent' && pro && keyOf(pro.body) && mOf(pro.body) && pro.body.includes('职务改了'), [d, pro && pro.body]);
d = await call('POST', '/reg/login/hello', { key: keyOf(pro.body) }); check('promoted: the mailed link is 李总, now 总管', d.ok && d.role === 'chief', d);
check('promoted: the old link stopped', (await list(ADMIN)).admins.find(x => x.name === '李总').v !== vBefore);
check('promoted: 副本邮箱 told', ms.some(m => m.subject.includes('总管已任命')), subs(ms));
d = await call('POST', '/admin/reg/admins/delete', { event: 'bstw2027', id: chiefRow.id }, ADMIN);
check('deleted: address cleared', d.ok && d.mail_cleared === true, d);
d = await call('POST', '/admin/reg/admins/delete', { event: 'bstw2027', id: depRow.id }, ADMIN);
check('deleting a 经理 leaves the addresses alone', d.ok && d.mail_cleared === undefined, d);
d = await save({ resend: 'chief' }); check('resend with no 总管邮箱: said so', d.ok && d.sent.chief === 'no_mail', d);
take();

// --- the reminder from the timer has its copies too
db.prepare("INSERT INTO reg(event,code,email,lang,status,people,data,amount,created_at,updated_at,confirmed_at,due_at) VALUES('bstw2027','BJ27-0900','late@example.com','en','confirmed',1,?,1450,'2026-01-01','2026-01-01','2026-01-01T00:00:00Z','2026-01-15T00:00:00Z')")
  .run(JSON.stringify({ people: [person({ items: ['M1'] })], rooms: [], passports: [], hotel: false }));
const rr = await regCron(env); ms = take();
const remind = ms.find(m => m.subject.startsWith(T('late@example.com')));
check('reminder: letter + copies', rr.sent === 1 && remind && same(copyTo(ms, remind.subject.slice(T('late@example.com').length)), [BOSS, COPY]), subs(ms));

// --- 测试名单 (plan 1225): while testing, a registrant on it gets their letters straight; anyone else's stay in the test inbox
d = await save({ test_list: 'not-an-email, a@example.com' }); check('测试名单: a bad address refused, named', d._s === 400 && d.error === 'bad_email' && d.which === 'test_list' && d.bad === 'not-an-email', d);
d = await save({ test_list: Array.from({ length: 11 }, (_, i) => `t${i}@example.com`).join(',') }); check('测试名单: at most 10', d._s === 400 && d.error === 'too_many' && d.max === 10, d);
d = await save({ test_list: ' Tess@Example.com，tess@example.com\nzed@example.com ' }); ms = take();
check('测试名单: saved trimmed, lower case, once each; no letter', d.ok && d.sent.test_list === 'saved' && d.mailto.test_list.join() === 'tess@example.com,zed@example.com' && ms.length === 0, [d, ms]);
d = await save({ test_list: 'zed@example.com tess@example.com' }); check('测试名单: same addresses again → saved (order is what was typed)', d.sent.test_list === 'saved');
d = await save({ test_list: 'zed@example.com tess@example.com' }); check('测试名单: unchanged → nothing', !d.sent.test_list, d);
const tess = subscriber('tess@example.com', 'Tess');
d = await call('POST', '/reg', form({ people: [person({ name: 'Tess' })] }), tess); const tessCode = d.code; ms = take();
check('on the list: her letter straight to her, marked [测试]', ms.some(m => m.to === 'tess@example.com' && m.subject === O + 'Registration received · ' + tessCode) && !ms.some(m => m.to === INBOX), subs(ms));
const ned = subscriber('ned@example.com', 'Ned');
d = await call('POST', '/reg', form({ people: [person({ name: 'Ned' })] }), ned); const nedCode = d.code; ms = take();
check('off the list: only the test inbox, never to him', ms.some(m => m.to === INBOX && m.subject === T('ned@example.com') + 'Registration received · ' + nedCode) && !ms.some(m => m.to === 'ned@example.com'), subs(ms));
env.REG_LIVE = '1';
d = await call('POST', '/admin/reg/act', { id: await idOf(nedCode), action: 'decline' }, ADMIN); ms = take();
check('live: the list no longer matters, no [测试]', ms.some(m => m.to === 'ned@example.com' && m.subject.endsWith(nedCode) && !m.subject.startsWith('[')) && ms.every(m => !m.subject.startsWith(O)), subs(ms));
delete env.REG_LIVE;
d = await save({ test_list: '' }); check('测试名单 cleared', d.sent.test_list === 'saved' && d.mailto.test_list.length === 0, d);
take();

// --- cleared: no notice, no more copies to it; the 管理员's address comes from REG_NOTIFY, else the test inbox's
d = await save({ copy: '' }); ms = take();
check('copy cleared: no letter', d.ok && d.sent.copy === 'cleared' && d.mailto.copy === '' && ms.length === 0, [d, ms]);
d = await call('POST', '/reg', form({ people: [person({ name: 'Eve' })] }), subscriber('eve@example.com', 'Eve')); ms = take();
check('only the 管理员 left: one copy, one notice', same(copyTo(ms, 'Registration received · ' + d.code), [BOSS]) && same(notified(ms, d.code), [BOSS]), subs(ms));
delete env.REG_NOTIFY;
d = await mailto(); check('no REG_NOTIFY: the 管理员 is selecttango@gmail.com', d.admin === INBOX, d);

console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-mailto tests passed:', passed);
