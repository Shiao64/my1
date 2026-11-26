// 修改报名 (Shiao, 2026-11-26 「现在做」): the 总管 (or 管理员) changes items, people and hotel from the admin page.
// A preview first (writes nothing, no password), then the password again. Prices as at the original registration; ¥50
// once money was received (nofee waives it); a full item needs over; what someone checked in for stays; before entry
// codes are out a person taken off leaves (rooms follow), after they keep their place as gone and their code stops
// working (everyone else keeps theirs); after the refund date a lowered total keeps the difference (an automatic 加收).
// The update letter says what changed and what that means for the money; paid ones carry the entry codes.
// Run: node social-worker/test/reg-modify.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dir = '/tmp/atm-reg-modify';
fs.mkdirSync(path.join(dir, 'vendor'), { recursive: true });
for (const f of ['unsub.js', 'going.js', 'register.js', 'qrpng.js', 'vendor/qrcode.js']) fs.copyFileSync(path.join(root, 'social-worker/src', f), path.join(dir, f));
fs.writeFileSync(path.join(dir, 'social.js'), fs.readFileSync(path.join(root, 'social-worker/src/social.js'), 'utf8')
  .replace("import { gmailSend } from './smtp.js';\n", 'const gmailSend = async () => { throw new Error("no smtp"); };\n'));
const { social } = await import(pathToFileURL(path.join(dir, 'social.js')).href);
const R = await import(pathToFileURL(path.join(dir, 'register.js')).href);

// the clock: 2027-01-05 (open everywhere, before the refund date); moved for the 6/11 case
const Real = globalThis.Date; let NOW = Real.parse('2027-01-05T12:00:00+08:00');
globalThis.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = s => { NOW = Real.parse(s); };

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
const ADMIN = 'a'.repeat(32), BOSS = 'boss@example.com';
const env = { SDB: D1(db), DB: D1(db), API_BASE: 'https://api.tangoweekend.org', SOCIAL_MAIL: 'log', ADMIN_TOKEN: ADMIN, REG_NOTIFY: BOSS, REG_LIVE: '1',
  REG_QR_KEY: 'qrkey', REG_PASS_SECRET: 'pass-secret-for-tests', REG_PIN_PEPPER: 'pepper-for-tests' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
const fail = []; let passed = 0;
const check = (n, ok, info) => { if (ok) passed++; else fail.push(n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 900) : '')); };
const mails = [];
const orig = console.log;
console.log = (...a) => { const s = a.map(String).join(' '); if (s.startsWith('[mail:log]')) mails.push(parse(s)); else if (!/^(tp mail|reg owner mail)/.test(s)) orig(...a); };
function parse(s) {
  const m = /^\[mail:log\] from=(.*?) to=(\S+)( cc=\S+)?( reply-to=\S+)? subject=([^\n]*?)( \{[^\n]*\})?\n([\s\S]*)$/.exec(s);
  return m ? { to: m[2], subject: m[5], body: m[7], raw: s } : { raw: s, subject: '', body: '' };
}
const take = () => mails.splice(0, mails.length);
const mine = (ms, to) => ms.filter(m => m.to === to && !/\[副本/.test(m.subject));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const keyOf = link => (/\/register\/in\/(?:\?m=[0-9a-f]{32})?#([0-9a-f]{48})/.exec(link || '') || [])[1];
function subscriber(email, name) {
  const now = new Date().toISOString();
  const r = db.prepare('INSERT INTO users(email,name,lang,verified_at,created_at) VALUES(?,?,?,?,?)').run(email, name, 'en', now, now);
  const tok = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').run(sha(tok), Number(r.lastInsertRowid), now);
  return tok;
}
async function call(method, p, body, auth) {
  const res = await social(new Request('https://api.tangoweekend.org/social' + p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://tangoweekend.org', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
    body: body ? JSON.stringify(body) : undefined }), env, new URL('https://api.tangoweekend.org/social' + p), json);
  const t = await res.text(); let d; try { d = JSON.parse(t); } catch { d = { _text: t }; } d._s = res.status; return d;
}
const person = (o = {}) => ({ name: 'Amy Lee', country: 'KR', city: 'Seoul', role: 'follower', pkg: 'pass', items: [], ...o });
const form = (o = {}) => ({ event: 'bstw2027', lang: 'en', people: [person()], hotel: 'no', ...o });
const act = (body, auth = ADMIN) => call('POST', '/admin/reg/act', { event: 'bstw2027', ...body }, auth);
const row = id => db.prepare('SELECT * FROM reg WHERE id=?').get(id);
const data = id => JSON.parse(row(id).data);
const me = tok => call('GET', '/reg/me?event=bstw2027&lang=en', null, tok);
const signIn = async (made, own) => (await call('POST', '/reg/login', { key: keyOf(made.link), pin: made.pin, new_pin: own })).token;
// the screen sends back what it showed, changed (input shape: items = what is picked beyond the package)
const back = (id, f = x => x) => { const d = data(id); return f({ hotel: d.hotel ? 'yes' : 'no', people: d.people.map(p => ({ name: p.name, country: p.country, city: p.city, role: p.role, pkg: p.pkg, items: p.extra.slice(), ...(p.gone ? { gone: true } : {}) })),
  rooms: d.rooms.map(r => ({ type: r.type, ci: r.ci, co: r.co, guests: r.guests.slice() })), passports: d.passports.slice() }); };
const modify = (id, dataIn, o = {}) => act({ id, action: 'modify', seen: row(id).updated_at, data: dataIn, ...o });

let n = 0;
async function make(state, paid = 0, f = form()) {
  at('2027-01-05T12:00:00+08:00');
  const email = `mod${++n}@example.test`, tok = subscriber(email, 'Mod');
  const d = await call('POST', '/reg', f, tok);
  if (!d.ok) throw Error('make ' + JSON.stringify(d));
  const id = db.prepare('SELECT id FROM reg WHERE code=?').get(d.code).id;
  if (state === 'waitlist') await act({ id, action: 'waitlist', silent: 1 });
  if (['confirmed', 'cash', 'paid'].includes(state)) await act({ id, action: 'confirm', silent: 1 });
  if (state === 'cash') await act({ id, action: 'cash', silent: 1 });
  if (paid) await act({ id, action: 'pay', silent: 1, pay: { amount: paid, method: 'alipay' } });
  take();
  return { id, code: d.code, email, tok };
}
const three = form({ people: [person(), person({ name: 'Bob Kim', role: 'leader' }), person({ name: 'Cat Wu' })] });   // 3 × ¥700

// --- 1. who may, the password, the preview
const chiefMade = await call('POST', '/admin/reg/admins', { event: 'bstw2027', name: '刘峥', role: 'chief' }, ADMIN);
const CH = await signIn(chiefMade, '730195');
const depMade = await call('POST', '/admin/reg/admins', { event: 'bstw2027', name: '竟文', role: 'deputy' }, ADMIN);
const DP = await signIn(depMade, '841726');
check('team signed in', CH && DP);
let x = await make('confirmed');
const full = back(x.id, d => { d.people[0].pkg = 'full'; return d; });
let d = await act({ id: x.id, action: 'modify_preview', seen: row(x.id).updated_at, data: full }, DP);
check('经理 may not, not even the preview', d._s === 403 && d.error === 'no_permission', d);
d = await act({ id: x.id, action: 'modify_preview', seen: row(x.id).updated_at, data: full }, CH);
check('总管 preview: no password asked', d.ok && d.preview && d.was === 700 && d.amount === 1450 && d.feeWhy === 'unpaid' && d.status === 'confirmed', d);
check('preview says what changes', d.changes.length === 1 && d.changes[0] === 'Amy Lee：周末舞会（4 场） → 全程套餐', d.changes);
d = await act({ id: x.id, action: 'modify', preview: 1, seen: row(x.id).updated_at, data: full }, CH);
check('preview only through its own action: preview:1 on modify is not one (asks the password)', d._s === 401 && d.error === 'pin_needed', d);
check('preview wrote nothing, sent nothing', row(x.id).amount === 700 && !db.prepare("SELECT 1 FROM reg_log WHERE reg_id=? AND action='modify'").get(x.id) && take().length === 0);
d = await act({ id: x.id, action: 'modify', seen: row(x.id).updated_at, data: full }, CH);
check('总管 saving: the password again', d._s === 401 && d.error === 'pin_needed', d);
d = await act({ id: x.id, action: 'modify', seen: '2020-01-01T00:00:00.000Z', data: full, pin: '730195' }, CH);
check('a screen that showed an older version: refused', d._s === 409 && d.error === 'bad_state', d);
d = await act({ id: x.id, action: 'modify', seen: row(x.id).updated_at, data: back(x.id), pin: '730195' }, CH);
check('nothing changed: refused', d._s === 400 && d.error === 'no_change', d);
d = await act({ id: x.id, action: 'modify', seen: row(x.id).updated_at, data: full, why: 'asked on WeChat', pin: '730195' }, CH);
let ms = take(), to = mine(ms, x.email);
check('总管 with the password: changed, no fee (not paid yet)', d.ok && d.amount === 1450 && d.status === 'confirmed' && row(x.id).fee === 0, d);
check('the letter: the note, what changed, then pay (with codes, steps)', to.length === 1 && /Note from the organizers: asked on WeChat/.test(to[0].body) && /What changed:\n· Amy Lee: All 4 weekend milongas → Full Pass/.test(to[0].body)
  && /Please pay ¥1,450 by/.test(to[0].body), to.map(m => m.body));
check('the organizers get a copy', ms.some(m => m.to === BOSS && /\[副本\] Registration updated/.test(m.subject)), ms.map(m => m.to + ' ' + m.subject));
const log1 = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.id === x.id).log.find(l => l.action === 'modify');
check('the history keeps what changed and who', log1 && log1.by === '刘峥' && /Amy Lee：周末舞会（4 场） → 全程套餐/.test(log1.text) && /合计 ¥700 → ¥1,450/.test(log1.text) && /说明：asked on WeChat/.test(log1.text), log1);

// --- 2. 待审核: the letter asks for nothing yet
x = await make('pending');
d = await modify(x.id, back(x.id, f => { f.people[0].items = ['tour']; return f; })); ms = take(); to = mine(ms, x.email);
check('待审核 + 一日游: ¥1,150, still pending', d.ok && d.amount === 1150 && d.status === 'pending', d);
check('待审核: no pay line, no codes, the later payment letter uses the new amount', to.length === 1 && !/Please pay/.test(to[0].body) && /will use the new amount/.test(to[0].body) && !/qr\/intl/.test(to[0].raw), to.map(m => m.body));

// --- 3. before the codes: a companion added, one in the middle taken off (rooms follow)
const hotel3 = form({ people: three.people, hotel: 'yes', rooms: [{ type: 'twin', ci: '2027-06-18', co: '2027-06-20', guests: [0, 1] }, { type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [2] }],
  passports: [{ s: 'LEE', g: 'AMY' }, { s: 'KIM', g: 'BOB' }, { s: 'WU', g: 'CAT' }] });
x = await make('confirmed', 0, hotel3);
check('three with two rooms: 2100 + 1100 + 1000', row(x.id).amount === 4200, row(x.id).amount);
d = await modify(x.id, back(x.id, f => { f.people[1].gone = true; f.rooms[0].guests = [0]; return f; })); ms = take(); to = mine(ms, x.email);
let dd = data(x.id);
check('not paid yet: Bob simply leaves, Cat moves up, her room follows', d.ok && dd.people.length === 2 && dd.people[1].name === 'Cat Wu' && dd.rooms[1].guests[0] === 1 && dd.passports[1].s === 'WU' && row(x.id).people === 2, dd);
check('…¥4,200 − ¥700 = ¥3,500, no fee', d.amount === 3500 && row(x.id).fee === 0, d);
check('the letter says who was taken off', to.length === 1 && /Removed: Bob Kim/.test(to[0].body), to.map(m => m.body));
d = await modify(x.id, back(x.id, f => { f.people.push({ name: 'Dan Ho', country: 'CN', city: '上海', role: 'leader', pkg: 'single', items: ['sat-eve'] }); f.passports.push({ s: 'HO', g: 'DAN' }); return f; })); ms = take(); to = mine(ms, x.email);
check('a companion added: +¥200, now domestic too', d.ok && d.amount === 3700 && row(x.id).people === 3 && row(x.id).domestic === 1, d);
check('the letter says who was added', to.length === 1 && /Added: Dan Ho \(Sat night milonga\)/.test(to[0].body), to.map(m => m.body));
d = await modify(x.id, back(x.id, f => { f.people[2].items = []; return f; }));
check('a single without a milonga: refused, says who', d._s === 400 && d.error === 'need_items' && d.person === 2, d);
d = await modify(x.id, back(x.id, f => { f.rooms[1].guests = [1, 2]; f.rooms[0].guests = [0, 2]; return f; }));
check('one person in two rooms: refused', d._s === 400 && d.error === 'guest_twice', d);

// --- 4. after the codes: places stay
const p3 = await make('paid', 2100, three);
const pass = i => R.passFor(env, p3.code, i);
const [c0, c1, c2] = [await pass(0), await pass(1), await pass(2)];
check('paid, three entry codes', row(p3.id).status === 'paid' && (await me(p3.tok)).reg.passes.length === 3);
d = await modify(p3.id, back(p3.id, f => { f.people[1].gone = true; return f; })); ms = take(); to = mine(ms, p3.email);
dd = data(p3.id);
check('paid: Bob taken off keeps his place as gone, Cat stays third', d.ok && dd.people.length === 3 && dd.people[1].gone && dd.people[2].name === 'Cat Wu' && row(p3.id).people === 2, dd.people);
check('paid: ¥1,400 + ¥50 (first change after payment), ¥650 paid too much', d.amount === 1450 && row(p3.id).fee === 50 && d.status === 'paid' && d.over === 650, d);
let mr = (await me(p3.tok)).reg;
check('the page: two codes left, Cat keeps hers', mr.passes.length === 2 && mr.passes.map(p => p.pass).join() === [c0, c2].join() && !mr.lines.some(l => /Bob/.test(l)) && mr.over === 650, mr);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(c1), null, ADMIN);
check('the door: Bob\'s code says taken off', d._s === 404 && d.error === 'removed', d);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(c2), null, ADMIN);
check('the door: Cat\'s code still works', d._s === 200 && !d.error, d);
check('no image for Bob\'s code, Cat\'s still there', (await call('GET', '/reg/pass/' + encodeURIComponent(c1) + '.png'))._s === 404 && (await call('GET', '/reg/pass/' + encodeURIComponent(c2) + '.png'))._s === 200);
check('the letter: removed (code void), everything paid, ¥650 back, the codes again', to.length === 1 && /Removed: Bob Kim \(their entry code no longer works\)/.test(to[0].body) && /You have paid ¥650 more than the new total/.test(to[0].body)
  && /Your entry QR codes/.test(to[0].body) && to[0].raw.includes(encodeURIComponent(c2)) && !to[0].raw.includes(encodeURIComponent(c1)) && /handling fee is included/.test(to[0].body), to.map(m => m.raw.slice(0, 1600)));
check('the copy carries no codes', ms.some(m => m.to === BOSS && /\[副本/.test(m.subject) && !m.raw.includes(encodeURIComponent(c2))));
const csv = (await call('POST', '/admin/reg/export?event=bstw2027', { event: 'bstw2027', what: 'regs' }, ADMIN))._text || '';
check('the export leaves Bob out', csv.includes('Cat Wu') && !csv.split('\n').some(l => l.includes(p3.code) && l.includes('Bob Kim')), csv.split('\n').filter(l => l.includes(p3.code)));
d = await modify(p3.id, back(p3.id, f => { delete f.people[1].gone; return f; }));
check('a person taken off never comes back (their code was void)', d._s === 400 && d.error === 'bad_people', d);
d = await modify(p3.id, back(p3.id, f => { f.people.splice(1, 1); return f; }));
check('places cannot be dropped once the codes are out', d._s === 400 && d.error === 'bad_people', d);
d = await modify(p3.id, back(p3.id, f => { f.people[0].gone = true; return f; }));
check('the registrant cannot be taken off', d._s === 400 && d.error === 'bad_people', d);
d = await modify(p3.id, back(p3.id, f => { f.people.push({ name: 'Eve Ng', country: 'SG', city: 'Singapore', role: 'leader', pkg: 'pass', items: [] }); return f; })); take();
const c3 = await pass(3);
mr = (await me(p3.tok)).reg;
check('a new one gets the next place and their own code; no second fee; ¥50 still owed', d.ok && d.amount === 2150 && d.rest === 50 && row(p3.id).fee === 50 && mr.passes.map(p => p.pass).join() === [c0, c2, c3].join() && d.status === 'cash' && d.over === 0, { d, passes: mr.passes.map(p => p.pass) });

// --- 5. what someone checked in for stays
db.prepare("INSERT INTO reg_checkin(reg_id,person,item,at,staff) VALUES(?,0,'M1','2027-06-19T06:00:00.000Z','前台甲')").run(p3.id);
d = await modify(p3.id, back(p3.id, f => { f.people[0].pkg = 'single'; f.people[0].items = ['sat-eve']; return f; }));
check('Amy checked in for Sat afternoon: it cannot go', d._s === 409 && d.error === 'checked_in' && d.person === 'Amy Lee' && d.item === 'M1', d);
db.prepare("INSERT INTO reg_checkin(reg_id,person,item,at,staff) VALUES(?,2,'M2','2027-06-19T12:00:00.000Z','前台甲')").run(p3.id);
d = await modify(p3.id, back(p3.id, f => { f.people[2].gone = true; return f; }));
check('Cat checked in: she cannot be taken off', d._s === 409 && d.error === 'checked_in' && d.person === 'Cat Wu', d);
d = await modify(p3.id, back(p3.id, f => { f.people[0].items = ['tour']; return f; })); take();
check('adding to someone who checked in is fine: +¥450, 到场付款 for the rest', d.ok && d.amount === 2600 && d.status === 'cash' && d.rest === 500, d);

// --- 6. a full item: over
const S1 = R.EVENTS.bstw2027.items.S1, cap = S1.cap; S1.cap = (await R.usedSeats(env, 'bstw2027')).S1 + 1;   // one place left, after the seats already taken
const holder = await make('confirmed', 0, form({ people: [person({ items: ['yard'] })] }));
x = await make('confirmed');
const yard = back(x.id, f => { f.people[0].items = ['yard']; return f; });
d = await act({ id: x.id, action: 'modify_preview', seen: row(x.id).updated_at, data: yard });
check('preview: the yard is full, says so', d.ok && d.full && d.full.item === 'S1' && d.full.left === 0 && d.full.need === 1, d);
d = await modify(x.id, yard);
check('saving without over: refused as full', d._s === 409 && d.error === 'full' && d.item === 'S1', d);
d = await modify(x.id, yard, { over: 1 }); take();
check('with over: added beyond the cap, and the history says so', d.ok && d.amount === 1150 && /超额：周一 探戈小院/.test(JSON.parse(db.prepare("SELECT detail FROM reg_log WHERE reg_id=? AND action='modify'").get(x.id).detail).text), d);
S1.cap = cap; check('the holder is untouched', row(holder.id).status === 'confirmed');

// --- 7. the fee waived this once
x = await make('paid', 700);
const plusTour = back(x.id, f => { f.people[0].items = ['tour']; return f; });
d = await act({ id: x.id, action: 'modify_preview', seen: row(x.id).updated_at, data: plusTour, nofee: 1 });
check('preview with nofee: waived', d.ok && d.feeWhy === 'waived' && d.amount === 1150, d);
d = await modify(x.id, plusTour, { nofee: 1 }); ms = take(); to = mine(ms, x.email);
check('paid + 一日游, fee waived: ¥1,150, 到场付款 ¥450', d.ok && d.amount === 1150 && row(x.id).fee === 0 && d.status === 'cash' && d.rest === 450, d);
check('到场付款 letter: pay ¥450 on arrival, codes attached, no fee sentence', to.length === 1 && /¥450 is still to pay/.test(to[0].body) && /Your entry QR codes/.test(to[0].body) && !/handling fee is included/.test(to[0].body) && !/Please pay/.test(to[0].body), to.map(m => m.body));

// --- 8. part paid, now covered: paid, the codes go out
x = await make('confirmed', 300);
d = await modify(x.id, back(x.id, f => { f.people[0].pkg = 'single'; f.people[0].items = ['sat-eve']; return f; })); ms = take(); to = mine(ms, x.email);
check('¥300 paid, lowered to ¥200 + ¥50: paid, ¥50 back', d.ok && d.amount === 250 && d.status === 'paid' && d.over === 50 && !!row(x.id).paid_at, d);
check('…the letter carries the entry code', to.length === 1 && /Your entry QR codes/.test(to[0].body) && /You have paid ¥50 more/.test(to[0].body), to.map(m => m.body));

// --- 9. after the refund date: a lowered total keeps the difference
x = await make('paid', 700);
at('2027-06-15T10:00:00+08:00');
d = await modify(x.id, back(x.id, f => { f.people[0].pkg = 'single'; f.people[0].items = ['sat-eve']; return f; })); ms = take(); to = mine(ms, x.email);
check('6/15, paid ¥700, lowered to ¥250: stays ¥700, nothing to refund', d.ok && d.amount === 700 && d.keep === 450 && d.over === 0 && d.status === 'paid', d);
const adj = (await call('GET', '/admin/reg?event=bstw2027', null, ADMIN)).rows.find(r => r.id === x.id).adjusts;
check('…an automatic 加收 line keeps it', adj.length === 1 && adj[0].d === 450 && /6\/11/.test(adj[0].why), adj);
check('…the letter says the difference is not refunded', to.length === 1 && /a change after June 11, 2027 that lowers the total is not refunded/.test(to[0].body) && /Everything is paid/.test(to[0].body), to.map(m => m.body));
at('2027-01-05T12:00:00+08:00');

// --- 11. found in review before deploying
const adjustAct = (id, d, o = {}) => act({ id, action: 'adjust', silent: 1, adjust: { d, why: 'x', part: o.part } });
const single = f => { f.people[0].pkg = 'single'; f.people[0].items = ['sat-eve']; return f; };
const pass700 = f => { f.people[0].pkg = 'pass'; f.people[0].items = []; return f; };
// lower after 6/11, then put it back: nothing charged twice
x = await make('paid', 700);
at('2027-06-15T10:00:00+08:00');
await modify(x.id, back(x.id, single));
d = await modify(x.id, back(x.id, pass700));
check('after 6/11 lower then restore: 700 + ¥50 only, ¥50 owed', d.ok && d.amount === 750 && d.rest === 50 && d.keep === 0, d);
d = await modify(x.id, back(x.id, single));
check('…lowered again: stays at what was paid, never above it', d.ok && d.amount === 700 && row(x.id).amount === 700, d);
// a refund already owed survives a rename after 6/11
x = await make('paid', 700); await adjustAct(x.id, -200);
at('2027-06-15T10:00:00+08:00');
d = await modify(x.id, back(x.id, f => { f.people[0].name = 'Amy L'; return f; }));
check('after 6/11 a rename keeps the owed refund', d.ok && d.amount === 550 && d.over === 150 && d.keep === 0, d);
at('2027-01-05T12:00:00+08:00');
// nothing changed on a paid one: no fee
x = await make('paid', 700);
d = await act({ id: x.id, action: 'modify_preview', seen: row(x.id).updated_at, data: back(x.id) });
check('unchanged paid: preview shows no fee, same total', d.ok && d.same && d.fee === 0 && d.amount === 700 && d.status === 'paid', d);
d = await modify(x.id, back(x.id)); check('unchanged paid: refused, no fee', d.error === 'no_change' && row(x.id).fee === 0 && row(x.id).amount === 700, d);
// waived to ¥0 then raised: it is owed
x = await make('pending'); await adjustAct(x.id, -700); await act({ id: x.id, action: 'confirm', silent: 1 });
check('waived: paid with no money', row(x.id).status === 'paid');
d = await modify(x.id, back(x.id, f => { f.people[0].pkg = 'full'; return f; }));
check('waived then upgraded: 到场付款, the difference owed', d.ok && d.status === 'cash' && d.rest === 750 && d.amount === 750, d);
// legacy paid with no records: record the money first
x = await make('confirmed'); db.prepare("UPDATE reg SET status='paid' WHERE id=?").run(x.id);
d = await modify(x.id, back(x.id, f => { f.people[0].pkg = 'full'; return f; }));
check('paid with no records: refused, record the money first', d.error === 'no_payments' && row(x.id).amount === 700, d);
// hotel adjustments follow the hotel
const withHotel = form({ hotel: 'yes', rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], passports: [{ s: 'LEE', g: 'AMY' }] });
x = await make('confirmed', 0, withHotel); await adjustAct(x.id, -500, { part: 'hotel' });
check('pass + 2 nights - 500', row(x.id).amount === 1200);
d = await modify(x.id, back(x.id, f => { f.hotel = 'no'; f.rooms = []; f.passports = []; return f; }));
check('hotel removed: its discount goes with it, the pass stays ¥700', d.ok && d.amount === 700 && row(x.id).hotel_amount === 0, d);
d = await modify(x.id, back(x.id, f => { f.hotel = 'yes'; f.rooms = withHotel.rooms; f.passports = withHotel.passports; return f; }));
check('hotel back: full hotel price, no old discount', d.ok && d.amount === 1700, d);
// code removed later: the price basis stays
env.REG_CODES = JSON.stringify({ pal: 'Dee' });
x = await make('confirmed', 0, form({ code: 'pal', people: [person({ pkg: 'full' })] }));
const friendTotal = row(x.id).amount; delete env.REG_CODES;
d = await modify(x.id, back(x.id, f => { f.people[0].name = 'Amy N'; return f; }));
check('friend code since removed: a rename keeps the price', friendTotal < 1450 && d.ok && d.amount === friendTotal && row(x.id).promo_dj === 'Dee', { friendTotal, d });
// entry codes beyond place 9
x = await make('paid', 4200, form({ people: [0, 1, 2, 3, 4, 5].map(i => person({ name: 'P' + i })) }));
for (let k = 0; k < 4; k++) {
  const r = await modify(x.id, back(x.id, f => { const i = f.people.findIndex((p, n) => n > 0 && !p.gone); f.people[i].gone = true; f.people.push(person({ name: 'N' + k, pkg: 'pass' })); return f; }));
  if (!r.ok) { check('grow places', false, r); break; }
}
const ten = await R.passFor(env, x.code, 9);
d = await call('GET', '/reg/door/pass?p=' + encodeURIComponent(ten), null, ADMIN);
check('the 10th place\'s code works at the door', d._s === 200 && !d.error, { ten, d });
check('…and has its picture', (await call('GET', '/reg/pass/' + encodeURIComponent(ten) + '.png'))._s === 200);
// full item: a rename or removal needs no free seat
const S1b = R.EVENTS.bstw2027.items.S1, capb = S1b.cap;
x = await make('confirmed', 0, form({ people: [person({ items: ['yard'] }), person({ name: 'Bo', items: ['yard'] })] }));
S1b.cap = 0;
d = await modify(x.id, back(x.id, f => { f.people.pop(); return f; }));
check('over a full item: removing a person needs no seat', d.ok && !d.error, d);
S1b.cap = capb;
// letters: not-yet-paid removal says no code; room swap and role are listed
x = await make('confirmed', 0, form({ people: [person(), person({ name: 'Bo' })], hotel: 'yes', rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-20', guests: [0] }], passports: [{ s: 'LEE', g: 'AMY' }, { s: 'LI', g: 'BO' }] }));
d = await modify(x.id, back(x.id, f => { f.rooms[0].guests = [1]; f.people[1].role = 'leader'; return f; })); ms = take(); to = mine(ms, x.email);
check('room swap and role listed', to.length === 1 && /Hotel: .*\(Amy Lee\) → .*\(Bo\)/.test(to[0].body) && /Bo: Follower → Leader/.test(to[0].body), to.map(m => m.body));
d = await modify(x.id, back(x.id, f => { f.people.pop(); f.hotel = 'no'; f.rooms = []; f.passports = []; return f; })); ms = take(); to = mine(ms, x.email);
check('not paid yet: removed, nothing about a code', to.length === 1 && /Removed: Bo/.test(to[0].body) && !/entry code/.test(to[0].body), to.map(m => m.body));
// a stray check-in row for a place not held does not lock the registration
x = await make('paid', 700); db.prepare("INSERT INTO reg_checkin(reg_id,person,item,at,staff) VALUES(?,3,'M1','2027-06-19T06:00:00.000Z','x')").run(x.id);
d = await modify(x.id, back(x.id, f => { f.people[0].name = 'Amy Q'; return f; })); check('stray check-in row ignored', d.ok, d);

// --- 10. the letter in Chinese, with the hotel
const zhReg = { code: 'BJ27-0123', lang: 'zh', amount: 1450, fee: 0, status: 'pending', data: { people: [{ name: '朱一', pkg: 'full', extra: [], items: [], amount: 1450 }], rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-20', nights: 2, guests: [0], amount: 1000 }], hotel: true },
  upd: { was: { people: [{ name: '朱一', pkg: 'pass', extra: [], items: [] }, { name: '朱二', pkg: 'pass', extra: [], items: [] }], rooms: [], hotel: false },
    slots: { people: [{ name: '朱一', pkg: 'full', extra: [], items: [] }, { name: '朱二', gone: true, pkg: '', extra: [], items: [] }], rooms: [{ type: 'king', ci: '2027-06-18', co: '2027-06-20' }], hotel: true } } };
const zm = R.letter('upd', zhReg, env, null, []);
check('zh letter: what changed, person by person, and the hotel', zm.text.includes('改了什么：\n· 朱一：周末舞会（4 场） → 全程套餐\n· 删除：朱二（这位的入场码已作废）\n· 住宿：无 → 大床房 2027-06-18 → 2027-06-20') || /改了什么：[\s\S]*朱一：周末舞会（4 场） → 全程套餐[\s\S]*删除：朱二[\s\S]*住宿：无 →/.test(zm.text), zm.text);
check('zh letter: uses 你, no placeholders left', !/您/.test(zm.text) && !/\{[a-z]\}|undefined/.test(zm.text + zm.subject), zm.text);

orig(`reg-modify: ${passed} passed, ${fail.length} failed`);
if (fail.length) { orig(fail.join('\n')); process.exit(1); }
