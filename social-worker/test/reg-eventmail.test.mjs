// 活动专属邮箱 (step 3, Shiao 2026-11-24): the 管理员 sets it; TP adds/removes its own Cloudflare rule (a fake Cloudflare
// here) and only calls it bound when its test letter comes back; then the event's letters reply to it. Mail arriving:
// a registrant's → to the organizers (attachments too); an organizer's answer to a letter TP sent them (secret tag) → to the
// registrant in the event's name; anyone else's → the 管理员 only; forged / automatic / our own → dropped.
// Run: node social-worker/test/reg-eventmail.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-eventmail';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'inmail.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social, regInboundMail } = await import(pathToFileURL(path.join(dir, 'social.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, created_at TEXT NOT NULL, ip_hash TEXT, city TEXT, role TEXT, wx_used INTEGER DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);`);
for (const f of ['0020_registrations.sql', '0021_reg_checkin.sql', '0022_reg_admins_ledger.sql', '0023_rename_bstw2027.sql', '0024_reg_login.sql', '0025_no_site_manager.sql', '0026_reg_mailto.sql'])
  db.exec(fs.readFileSync(path.join(root, 'social-worker/migrations', f), 'utf8'));
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
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_NOTIFY: BOSS, REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 700) : '')); };
const mails = [], logs = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(parse(s)); else logs.push(s); };
function parse(s) {
  const m = /^\[mail:log\] from=(.*?) to=(\S+)( cc=\S+)?( reply-to=\S+)? subject=([^\n]*?)( \{[^\n]*\})?\n([\s\S]*)$/.exec(s);
  if (!m) return { raw: s, subject: '', body: '' };
  const atts = /\n\[attachments\] (.*)$/.exec(m[7]);
  return { from: m[1], to: m[2], cc: (m[3] || '').trim(), replyTo: (m[4] || '').replace(' reply-to=', ''), subject: m[5], headers: m[6] ? JSON.parse(m[6]) : {}, body: m[7].replace(/\n\[attachments\] .*$/, ''), atts: atts ? atts[1].split(' | ').map(x => x.split(' ')[0]) : [] };
}
const take = () => mails.splice(0, mails.length);
const subs = ms => ms.map(m => m.to + ' | ' + m.subject + ' | rt=' + m.replyTo);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
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
const list = () => call('GET', '/admin/reg?event=bstw2027', null, ADMIN);
const save = body => call('POST', '/admin/reg/mailto', { event: 'bstw2027', ...body }, ADMIN);
const idOf = async code => (await list()).rows.find(r => r.code === code).id;
const regLog = (code, like) => db.prepare("SELECT l.action,l.detail FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.code=? AND l.action LIKE ? ORDER BY l.id").all(code, like);
const CHIEF = 'chief@example.com', COPY = 'copy@example.com', EV = 'bstw2027@tangoweekend.org';
const T = to => '[TEST → ' + to + '] ';
const keyOf = code => crypto.createHmac('sha256', 'regpass:' + env.REG_PASS_SECRET).update('relay:' + code).digest('hex').slice(0, 10);

// --- a fake Cloudflare API: rules by id; every call recorded
const cfRules = new Map(); let cfNext = 1; const cfCalls = []; let cfDown = false;
cfRules.set('r-info', { id: 'r-info', matchers: [{ type: 'literal', field: 'to', value: 'info@tangoweekend.org' }], actions: [{ type: 'forward', value: ['owner@example.com'] }] });
cfRules.set('r-taken', { id: 'r-taken', matchers: [{ type: 'literal', field: 'to', value: 'party@tangoweekend.org' }], actions: [{ type: 'forward', value: ['someone@example.com'] }] });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), m = init.method || 'GET';
  if (u.hostname !== 'api.cloudflare.com') return realFetch(url, init);
  cfCalls.push({ m, path: u.pathname + u.search, auth: (init.headers || {}).Authorization, body: init.body ? JSON.parse(init.body) : null });
  const ok = result => new Response(JSON.stringify({ success: true, result, result_info: { total_pages: 1 } }), { status: 200 });
  if (cfDown) return new Response(JSON.stringify({ success: false, errors: [{ message: 'down' }] }), { status: 500 });
  if (u.pathname === '/client/v4/zones' && m === 'GET') return ok(u.searchParams.get('name') === 'tangoweekend.org' ? [{ id: 'zone1' }] : []);
  const r = /^\/client\/v4\/zones\/zone1\/email\/routing\/rules(?:\/([^/]+))?$/.exec(u.pathname);
  if (r && m === 'GET' && !r[1]) return ok([...cfRules.values()]);
  if (r && m === 'POST' && !r[1]) { const id = 'r' + cfNext++; const rule = { id, ...JSON.parse(init.body) }; cfRules.set(id, rule); return ok(rule); }
  if (r && m === 'DELETE' && r[1]) { if (!cfRules.has(r[1])) return new Response('{"success":false}', { status: 404 }); cfRules.delete(r[1]); return ok({ id: r[1] }); }
  return new Response('{"success":false}', { status: 404 });
};
const ruleFor = addr => [...cfRules.values()].find(x => x.matchers.some(m => m.value === addr));

// --- mail arriving at Cloudflare: a fake message as the Worker gets it (headers ASCII; subject MIME-encoded)
const enc = s => '=?UTF-8?B?' + Buffer.from(s).toString('base64') + '?=';
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
function inbound({ from, to = EV, subject, text = 'Hello', auth = 'mx.cloudflare.net; dkim=pass header.d=example.com; spf=pass; dmarc=pass', extra = {}, png = false, size }) {
  from = from.replace(/^([^<]+)</, (m0, n) => /[^\x00-\x7f]/.test(n) ? enc(n.trim()) + ' <' : m0);   // a display name in Chinese, as mail headers carry it
  const b = 'b' + crypto.randomBytes(4).toString('hex');
  const raw = [`From: ${from}`, `To: ${to}`, `Subject: ${enc(subject)}`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${b}"`, '', `--${b}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(text).toString('base64'),
    ...(png ? [`--${b}`, 'Content-Type: image/png; name="pay.png"', 'Content-Disposition: attachment; filename="pay.png"', 'Content-Transfer-Encoding: base64', '', PNG] : []), `--${b}--`, ''].join('\r\n');
  const headers = new Headers({ from, to, subject: enc(subject), ...(auth ? { 'authentication-results': auth } : {}), ...extra });
  return { to, from: (/<([^>]+)>/.exec(from) || [, from])[1], headers, raw, rawSize: size || raw.length };
}

// --- setup: the 活动邮箱 from step 1, a registration
d = await save({ copy: COPY, chief: CHIEF }); take();
var d;
const amy = subscriber('amy@example.com', 'Amy');
d = await call('POST', '/reg', form(), amy); const amyCode = d.code; take();
const amyId = await idOf(amyCode);

// --- not set up: the page says so; nothing goes to Cloudflare without the key
d = await list(); check('page: no 活动专属邮箱 yet, Cloudflare key missing', d.mailto.event_mail === '' && d.mailto.event_mail_ok === false && d.mailto.cf_ready === false && d.mailto.domain === 'tangoweekend.org', d.mailto);
d = await save({ event_mail: 'bstw2027' }); check('no CF_MAIL_TOKEN: not ready, Cloudflare not called', d.ok && d.sent.event_mail === 'cf_not_ready' && cfCalls.length === 0, [d, cfCalls]);
env.CF_MAIL_TOKEN = 'cf-token';
d = await save({ event_mail: 'Bad Name!' }); check('bad name refused', d.sent.event_mail === 'bad', d);
d = await save({ event_mail: 'info' }); check('reserved name refused', d.sent.event_mail === 'reserved', d);
d = await save({ event_mail: 'party' }); check('an address Cloudflare already routes elsewhere: refused, untouched', d.sent.event_mail === 'exists' && cfRules.has('r-taken') && !cfCalls.some(c => c.m !== 'GET'), [d, cfCalls]);
d = await call('POST', '/admin/reg/mailto', { event: 'bstw2027', event_mail: 'x' }, subscriber('nobody@example.com', 'N')); check('not the 管理员: refused', d._s === 401 || d._s === 403, d);
check('Cloudflare: zone looked up by name once, with the key', cfCalls.filter(c => c.path === '/client/v4/zones?name=tangoweekend.org').length === 1 && cfCalls.every(c => c.auth === 'Bearer cf-token'), cfCalls);
take(); cfCalls.length = 0;

// --- bind: a rule "address → this Worker", then a test letter to the address itself
d = await save({ event_mail: 'BSTW2027@tangoweekend.org' }); let ms = take();
const rule = ruleFor(EV);
check('bind: rule made, test letter on its way', d.ok && d.sent.event_mail === 'testing' && d.mailto.event_mail === EV && d.mailto.event_mail_ok === false, d);
check('bind: the rule sends that one address to this Worker only', rule && rule.enabled && rule.matchers.length === 1 && rule.matchers[0].type === 'literal' && rule.actions.length === 1 && rule.actions[0].type === 'worker' && rule.actions[0].value[0] === 'tango-subscribe', rule);
check('bind: one list, one new rule, nothing deleted', cfCalls.map(c => c.m).join() === 'GET,POST', cfCalls.map(c => c.m + ' ' + c.path));
const bindMail = ms.find(m => /\[TP-BIND [0-9a-f]{32}\]/.test(m.subject));
check('bind: test letter straight to the address (not the test inbox)', ms.length === 1 && bindMail && bindMail.to === EV && bindMail.headers['X-TP-Relay'] === 'bind', subs(ms));
d = await call('POST', '/admin/reg/act', { id: amyId, action: 'confirm' }, ADMIN); ms = take();
check('not bound yet: Reply-To info@, copies without the tag', ms.every(m => m.replyTo === 'info@tangoweekend.org') && ms.some(m => m.subject.includes('[副本] Registration confirmed')), subs(ms));
// a wrong token does nothing; the real one binds
check('wrong bind token: not bound', await regInboundMail(inbound({ from: 'subscribe@tangoweekend.org', subject: '探戈通：活动专属邮箱绑定测试 [TP-BIND ' + 'f'.repeat(32) + ']' }), env) === true && (await list()).mailto.event_mail_ok === false);
await regInboundMail(inbound({ from: 'subscribe@tangoweekend.org', subject: bindMail.subject }), env); ms = take();
d = await list(); check('test letter came back: bound, nothing forwarded', d.mailto.event_mail_ok === true && !!d.mailto.event_mail_at && ms.length === 0, [d.mailto, subs(ms)]);

// --- bound: the event's letters reply to it; copies carry the tag
d = await call('POST', '/admin/reg/act', { id: amyId, action: 'pay' }, ADMIN); ms = take();
const own = ms.find(m => m.subject.startsWith(T('amy@example.com')));
check('bound: registrant letter replies to the 活动专属邮箱', own && own.replyTo === EV, subs(ms));
check('bound: copies carry the secret tag and reply there too', ms.filter(m => m.subject.includes('[副本 #' + keyOf(amyCode) + ']')).length === 3 && ms.filter(m => m.subject.includes('[副本')).every(m => m.replyTo === EV), subs(ms));
check('bound: the registrant\'s letter never has the tag', !own.subject.includes('#') && !own.body.includes(keyOf(amyCode)));
d = await save({ copy: 'copy2@example.com' }); ms = take();
check('bound: 探戈通 notices still reply to info@ (system matters)', ms.length === 1 && ms[0].replyTo === 'info@tangoweekend.org', subs(ms));
d = await save({ copy: COPY }); take();

// --- a registrant replies (test stage: the reply comes from the test inbox, to a [TEST → amy] letter)
const r1 = await regInboundMail(inbound({ from: 'Shiao <selecttango@gmail.com>', subject: 'Re: ' + own.subject, text: 'Paid, screenshot attached.', png: true }), env); ms = take();
const k = keyOf(amyCode), tag = `[回信 ${amyCode} #${k}]`;
check('test stage: reply to a registrant letter → to the 总管, 副本 and 管理员', r1 === true && ms.length === 3 && ms.every(m => m.subject.endsWith(tag + ' Payment received · ' + amyCode)), subs(ms));
check('forwarded: 总管 and 副本 via the test inbox, 管理员 straight', ms.filter(m => m.to === INBOX).length === 2 && ms.some(m => m.to === BOSS && !m.subject.startsWith('[TEST')), subs(ms));
check('forwarded: replies go back to the 活动专属邮箱, the screenshot is attached', ms.every(m => m.replyTo === EV && m.atts.join() === 'pay.png' && m.headers['X-TP-Relay'] === 'in'), ms.map(m => [m.replyTo, m.atts]));
check('forwarded: says who wrote and how to answer', ms[0].body.includes('报名者 Amy Lee（amy@example.com，' + amyCode + '，已付款）') && ms[0].body.includes('Paid, screenshot attached.') && ms[0].body.includes('报名者看不到你的邮箱'), ms[0].body.slice(0, 300));
check('log: reply in', regLog(amyCode, 'reply%').map(x => x.action + '=' + x.detail).join() === 'reply:in=chief,copy,admin +1', regLog(amyCode, 'reply%'));

// --- the 总管 answers that letter: to the registrant, in the event's name; the others get a copy
const fwd = ms.find(m => m.subject.startsWith(T(CHIEF)));
const r2 = await regInboundMail(inbound({ from: '李总 <' + CHIEF + '>', subject: 'Re: ' + fwd.subject, text: 'Thanks Amy, received!', png: true }), env); ms = take();
const out = ms.find(m => m.subject.startsWith(T('amy@example.com')));
check('总管 answers: to the registrant (test inbox in the test stage)', r2 === true && out && out.subject === T('amy@example.com') + 'Re: Payment received · ' + amyCode && out.to === INBOX, subs(ms));
check('to the registrant: event name, replies to the 活动专属邮箱, no tag, no 总管 address', out.from === 'Beijing Select Tango Weekend' && out.replyTo === EV && !out.subject.includes('#') && !out.body.includes(CHIEF) && out.body.includes('Thanks Amy') && out.atts.join() === 'pay.png', out);
const outCopies = ms.filter(m => m.subject.includes('[副本 #' + k + ']'));
check('copies of the answer: 副本 and 管理员, not back to the 总管', outCopies.length === 2 && !outCopies.some(m => m.subject.startsWith(T(CHIEF))) && outCopies.every(m => m.body.startsWith('副本：总管（' + CHIEF + '）以「北京精选探戈周末 2027」的名义回给报名者')), subs(ms));
check('log: reply out', regLog(amyCode, 'reply:out%').map(x => x.detail).join() === 'chief +1', regLog(amyCode, 'reply:out%'));
// the 管理员 answers a copy of a registrant letter (tag in the copy) → also to the registrant
d = await regInboundMail(inbound({ from: BOSS, subject: 'Re: [副本 #' + k + '] Payment received · ' + amyCode, text: 'From the admin.' }), env); ms = take();
check('管理员 answers a tagged copy → to the registrant, copies to 总管 and 副本', ms.some(m => m.subject === T('amy@example.com') + 'Re: Payment received · ' + amyCode && m.body.includes('From the admin.')) && ms.filter(m => m.subject.includes('[副本 #')).length === 2, subs(ms));

// --- nothing goes to a registrant without the tag
d = await regInboundMail(inbound({ from: CHIEF, subject: 'About ' + amyCode, text: 'Fresh mail with only the number.' }), env); ms = take();
check('总管 writes fresh (no tag): not sent; told how', ms.length === 1 && ms[0].subject === T(CHIEF) + '探戈通：没寄出' && ms[0].body.includes('直接回复系统转来的信'), subs(ms));
d = await regInboundMail(inbound({ from: CHIEF, subject: `Re: [回信 ${amyCode} #0123456789] hi`, text: 'Wrong tag.' }), env); ms = take();
check('wrong tag: not sent', !ms.some(m => m.subject.startsWith(T('amy@example.com'))), subs(ms));
const bob = subscriber('bob@example.com', 'Bob');
d = await call('POST', '/reg', form({ people: [person({ name: 'Bob Kim' })] }), bob); const bobCode = d.code; take();
d = await regInboundMail(inbound({ from: CHIEF, subject: `Re: [回信 ${bobCode} #${k}] hi`, text: 'Amy\'s tag on Bob\'s number.' }), env); ms = take();
check('another registration\'s tag: not sent to Bob', !ms.some(m => m.subject.startsWith(T('bob@example.com'))), subs(ms));
d = await regInboundMail(inbound({ from: 'Mallory <mallory@evil.example>', subject: 'Re: ' + fwd.subject, text: 'I am not an organizer.' }), env); ms = take();
check('someone else with the tag: not to the registrant, only the 管理员 sees it', ms.length === 1 && ms[0].to === BOSS && ms[0].subject.startsWith('[来信]') && ms[0].replyTo === 'mallory@evil.example', subs(ms));

// --- dropped
const n0 = mails.length;
await regInboundMail(inbound({ from: 'amy@example.com', subject: 'Re: hi ' + amyCode, auth: '' }), env);
await regInboundMail(inbound({ from: 'amy@example.com', subject: 'Re: hi ' + amyCode, auth: 'mx.cloudflare.net; spf=fail; dkim=fail; dmarc=fail' }), env);
await regInboundMail(inbound({ from: 'amy@example.com', subject: 'Out of office', extra: { 'auto-submitted': 'auto-replied' } }), env);
await regInboundMail(inbound({ from: 'amy@example.com', subject: 'Re: x', extra: { 'x-tp-relay': 'in' } }), env);
check('forged, automatic and our own relays: dropped', mails.length === n0 && logs.filter(l => l.startsWith('tp inbound dropped')).length >= 4, logs.slice(-4));

// --- a registrant writing from their own address, live: straight to the organizers; strangers to the 管理员 only
env.REG_LIVE = '1';
d = await regInboundMail(inbound({ from: 'Bob Kim <bob@example.com>', subject: 'Question about the hotel', text: 'Can I add a night?' }), env); ms = take();
check('live: registrant (found by address) → 总管, 副本, 管理员 straight', ms.length === 3 && [CHIEF, COPY, BOSS].every(a => ms.some(m => m.to === a && m.subject === `[回信 ${bobCode} #${keyOf(bobCode)}] Question about the hotel`)), subs(ms));
const live1 = ms.find(m => m.to === CHIEF);
d = await regInboundMail(inbound({ from: CHIEF, subject: 'Re: ' + live1.subject, text: 'Yes you can.' }), env); ms = take();
check('live: the 总管\'s answer goes to Bob himself, from the event', ms.some(m => m.to === 'bob@example.com' && m.subject === 'Re: Question about the hotel · ' + bobCode && m.replyTo === EV && !m.cc), subs(ms));
d = await regInboundMail(inbound({ from: 'Eve <eve@example.org>', subject: 'Can I still register?', text: 'Hi' }), env); ms = take();
check('live: not a registrant → 管理员 only, Reply-To the sender', ms.length === 1 && ms[0].to === BOSS && ms[0].subject === '[来信] Can I still register?' && ms[0].replyTo === 'eve@example.org' && ms[0].body.includes('不是这场活动的报名者'), subs(ms));
d = await regInboundMail(inbound({ from: 'Eve <eve@example.org>', subject: 'Big', size: 30 * 1024 * 1024 }), env); ms = take();
check('too big: the 管理员 is told, nothing else', ms.length === 1 && ms[0].to === BOSS && ms[0].subject.startsWith('[来信太大]'), subs(ms));
delete env.REG_LIVE;

// --- not a 活动专属邮箱: false, so live.js hands it to huodong@ as before
check('other address: not ours', await regInboundMail(inbound({ from: 'amy@example.com', to: 'someone@tangoweekend.org', subject: 'x' }), env) === false);

// --- change and clear: only TP's own rule goes, the others stay
cfCalls.length = 0;
const old = rule.id;
d = await save({ event_mail: 'bstw' }); ms = take();
check('change: old rule removed, new one made, test letter to the new address', d.sent.event_mail === 'testing' && !cfRules.has(old) && ruleFor('bstw@tangoweekend.org') && ms.length === 1 && ms[0].to === 'bstw@tangoweekend.org' && d.mailto.event_mail_ok === false, [d, subs(ms)]);
d = await call('POST', '/admin/reg/act', { id: amyId, action: 'note', note: 'y' }, ADMIN);
await call('POST', '/admin/reg/act', { id: await idOf(bobCode), action: 'waitlist' }, ADMIN); ms = take();
check('change: until the new test letter is back, replies go to info@', ms.every(m => m.replyTo === 'info@tangoweekend.org'), subs(ms));
d = await save({ event_mail_test: true }); ms = take();
check('再测一次: a new test letter', d.sent.event_mail === 'testing' && ms.length === 1 && /\[TP-BIND /.test(ms[0].subject), [d, subs(ms)]);
await regInboundMail(inbound({ from: 'subscribe@tangoweekend.org', to: 'bstw@tangoweekend.org', subject: ms[0].subject }), env);
check('bound again', (await list()).mailto.event_mail_ok === true);
// someone changed our rule in the dashboard: TP leaves it alone
const mine = ruleFor('bstw@tangoweekend.org'); mine.actions = [{ type: 'forward', value: ['x@example.com'] }];
d = await save({ event_mail: '' });
check('clear: a rule no longer TP\'s own is left alone; settings cleared', d.sent.event_mail === 'cleared' && cfRules.has(mine.id) && d.mailto.event_mail === '' && cfRules.has('r-info') && cfRules.has('r-taken'), [d, [...cfRules.keys()]]);
cfRules.delete(mine.id);
check('cleared: mail to the old address is no longer ours', await regInboundMail(inbound({ from: 'amy@example.com', to: 'bstw@tangoweekend.org', subject: 'x' }), env) === false);
// Cloudflare down: says so, changes nothing
cfDown = true; d = await save({ event_mail: 'bstw2027' }); cfDown = false;
check('Cloudflare down: cf_error, nothing saved', d.sent.event_mail === 'cf_error' && d.mailto.event_mail === '', d);
// another event cannot take the same address (simulated row)
db.prepare("INSERT INTO reg_setting(event,key,value,updated_at) VALUES('2027mvny','event_mail','yearend@tangoweekend.org','2026-11-24')").run();
d = await save({ event_mail: 'yearend' }); check('another event\'s address: taken', d.sent.event_mail === 'taken', d);

globalThis.fetch = realFetch;
console.log = orig;
if (fail.length) { console.log('FAIL', fail.length, '\n' + fail.join('\n')); process.exit(1); }
console.log('reg-eventmail tests passed:', passed);
