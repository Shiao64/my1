// Event registration: Beijing Select Tango Weekend 2027 (bstw2027). Mounted under /social/* by social.js.
//
// Public
//   GET  /social/reg/left?event=bstw2027        -> {left:{M1:280,...}}  seats left; events without a cap are left out
//   GET  /social/reg/me?event=bstw2027 (Bearer) -> {email, reg:{code,status}|null}
//   POST /social/reg (Bearer subscriber)      -> {ok, code, total}   new form, or update of a still-pending one
//   GET  /social/reg/qr/<name>?k=KEY          -> payment QR image used inside the confirmation letter
// Management (Bearer REG_ADMIN_TOKEN / ADMIN_TOKEN = platform admin, or dev:<key> = one signed-in phone). Rules: docs/tangopass.md.
//   POST /social/reg/login/hello {key, m?}        -> {name, role, state, mail_ok?, same?}   the personal link opened
//   POST /social/reg/login {key, pin, new_pin?}   -> {token:'dev:…', role, home}   link + six-digit password
//   POST /social/reg/login/again {pin}  (dev:)     password again when it is due;  /out  signs this phone out
//   GET  /social/admin/reg?event=bstw2027[&format=csv] -> only what that role may see
//   POST /social/admin/reg/act {id, action, from?, note?, was?, pay?, data?, p?, pin?}
//        confirm|waitlist|decline|pay|cash|refund|cancel|modify|note; from / was / pay.seen = what the caller's screen showed
//   POST /social/admin/reg/admins[/role|/reset|/delete], /staff[/reset|/delete] {…, pin}   appointments
//   POST /social/admin/reg/export {what: regs|payments, pin}   CSV
//   POST /social/admin/reg/asset {name, mime, b64}         upload a payment QR
//   POST /social/admin/reg/mailto {chief?, copy?, admin_on?, resend?, event_mail?, event_mail_test?, test_list?}  管理员 only: 活动邮箱 ('' clears)
//   Mail to a 活动专属邮箱 (Cloudflare Email Routing → live.js email → regInbound) is relayed: see 「活动专属邮箱」 below
//   Organizer page: /tp/admin/?event=bstw2027 (static, shared by every event since platform step 3; the old
//   /event/beijing-2027-tango-weekend/register/{admin,checkin,in}/ addresses forward to /tp/ with ?event=bstw2027)
//
// Safety: until REG_LIVE=1, a letter to a registrant goes to REG_TEST_INBOX (default selecttango@gmail.com) unless they are
// on the 测试名单; the 管理员 (REG_NOTIFY), 总管邮箱 and 副本邮箱 get theirs straight, marked [测试].

export const EVENTS = {
  bstw2027: {
    id: 'bstw2027', prefix: 'BJ27',   // 2026-11-23 Shiao: 张孝 is the 管理员 (long password) and appoints one 总管
    name: { en: 'Beijing Select Tango Weekend 2027', zh: '北京精选探戈周末 2027' },
    items: {
      MV: { key: 'welcome', price: 150, cap: 200 },
      M1: { key: 'sat-aft', price: 150, cap: 300 },
      M2: { key: 'sat-eve', price: 200, cap: 300 },
      M3: { key: 'sun-aft', price: 150, cap: 300 },
      M4: { key: 'sun-eve', price: 200, cap: 300 },
      T1: { key: 'tour', price: 450, cap: null },
      S1: { key: 'yard', price: 450, cap: 120 },
      T2: { key: 'walk', price: 400, cap: null },
      MF: { key: 'farewell', price: 150, cap: 150 }
    },
    pkgs: {
      full: { price: 1450, covers: ['MV', 'M1', 'M2', 'M3', 'M4', 'S1', 'MF'] },
      combo: { price: 1150, covers: ['M1', 'M2', 'M3', 'M4', 'S1'] },
      pass: { price: 700, covers: ['M1', 'M2', 'M3', 'M4'] },
      single: { price: 0, covers: [] }
    },
    rooms: { king: 500, twin: 550 },
    ciMin: '2027-06-11', ciMax: '2027-06-27', coMin: '2027-06-12', coMax: '2027-06-28',
    earlyEnd: Date.parse('2027-02-02T00:00:00+08:00'), earlyPrice: 1350, friendPrice: 1200,
    hotelRefundBy: '2027-06-11', fee: 50, payDays: 14, remindDay: 10, maxPeople: 6,
    deskEnds: '2027-06-22T22:00:00.000Z',   // 前台 sign-ins end 2027-06-23 06:00 Beijing, after the farewell milonga
    starts: '2027-06-18', ends: '2027-06-22',   // its days (Beijing dates), as on its ATM card E093: 一人多场 never at the same time
    short: { zh: '北京', en: 'Beijing' }, color: '#b3121b',   // in the organizers' subjects, and its band on the shared /tp/ pages
    card: 'E093',   // its ATM card (平台管理页)
    itemOrder: ['MV', 'T1', 'M1', 'M2', 'M3', 'M4', 'S1', 'T2', 'MF'],   // as the 管理页 lists them: by day
    // where its pages are, what the letters say it is from, and a 单场 needs one of the four weekend milongas
    slug: 'beijing-2027-tango-weekend', regPath: 'register/draft/', from: 'Beijing Select Tango Weekend', singleNeeds: ['M1', 'M2', 'M3', 'M4']
  }
};
// looked up by what a visitor typed: 'constructor' and the like are not entries
const own = (o, k) => (Object.hasOwn(o, String(k)) ? o[k] : undefined);

// ---------- events (platform stage 1, spec v0.6) ----------
// An event's settings: a row in reg_event (migration 0027) when it has one, else the settings written above.
// 北京 has no row yet, so it is exactly the object above (and behaves as before); a row for an id written above
// overrides those settings field by field. reg_event.mode: 'test' | 'practice' | 'live'; none = the site-wide REG_LIVE.
// Config fields, as above: prefix, name {zh,en}, items {CODE: {key, price, cap}}, pkgs {key: {price, covers}},
// and optionally names {lang: {CODE|pkg: name}}, letters {lang: {key: text}} (sign, rules, …), from, slug, regPath,
// rooms, ciMin…coMax, earlyEnd, earlyPrice, friendPrice, promoPkg, codes {code: who}, singleNeeds, fee, payDays,
// remindDay, maxPeople, hotelRefundBy, deskEnds, starts/ends (its days, Beijing dates YYYY-MM-DD, as on its ATM card),
// short {zh, en} (in the organizers' subjects), color (#rrggbb, its band on the shared /tp/ pages), itemOrder (the 管理页's order).
const EV_NEEDS = ['prefix', 'name', 'items', 'pkgs'];
const noSuchTable = e => /no such table/i.test(String(e && e.message));
function eventOfRow(row) {
  let cfg; try { cfg = JSON.parse(row.config || '{}'); } catch { cfg = null; }
  const base = own(EVENTS, row.id);
  if (!cfg || typeof cfg !== 'object') { console.log('reg_event: config is not JSON', row.id); return base; }
  const ev = { maxPeople: 6, fee: 0, payDays: 14, remindDay: 10, ...(base || {}), ...cfg, id: row.id };
  if (row.slug) ev.slug = row.slug;
  if (row.mode) ev.mode = row.mode;
  if (row.card) ev.card = row.card;
  if (typeof ev.earlyEnd === 'string') ev.earlyEnd = Date.parse(ev.earlyEnd);
  if (!EV_NEEDS.every(k => ev[k] && typeof ev[k] === 'object' || k === 'prefix') || !/^[A-Z0-9]{2,6}$/.test(String(ev.prefix || ''))) {
    console.log('reg_event: missing settings', row.id); return base;
  }
  return ev;
}
// the event a request names, or undefined
export async function getEvent(env, id) {
  id = str(id, 40); if (!id) return undefined;
  let row = null;
  try { row = await env.SDB.prepare('SELECT * FROM reg_event WHERE id=?').bind(id).first(); } catch (e) { if (!noSuchTable(e)) throw e; }
  return row ? eventOfRow(row) : own(EVENTS, id);
}
export async function listEvents(env) {
  const out = new Map(Object.entries(EVENTS));
  let rows = [];
  try { rows = (await env.SDB.prepare('SELECT * FROM reg_event').all()).results || []; } catch (e) { if (!noSuchTable(e)) throw e; }
  for (const r of rows) { const ev = eventOfRow(r); if (ev) out.set(r.id, ev); }
  return [...out.values()];
}
// live = letters go to the people themselves; else the test-stage rules (plan 1225)
const isLive = (env, ev) => ev && ev.mode ? ev.mode === 'live' : env.REG_LIVE === '1';
const BSTW = () => EVENTS.bstw2027;
const siteBase = env => String(env.REG_SITE || 'https://tangoweekend.org').replace(/\/$/, '');
const evSlug = ev => (ev && ev.slug) || BSTW().slug;
const evFrom = ev => (ev && (ev.from || (ev.name && ev.name.en))) || BSTW().from;
const KEY2CODE = ev => Object.fromEntries(Object.entries(ev.items).map(([c, it]) => [it.key, c]));
const ROLES = ['leader', 'follower', 'both'];
const LANGS = ['en', 'ko', 'es', 'ru', 'zh'];
const SEATED = ['confirmed', 'paid', 'cash'];
const EMAIL_STRICT = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9_%+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
const PASSPORT = /^[A-Za-z][A-Za-z '\-]*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const nowIso = () => new Date().toISOString();
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

// Friend codes come from the REG_CODES secret: {"<code>":"<DJ name>",...}. Never in the repo.
function friendCodes(env) { try { const o = JSON.parse(env.REG_CODES || '{}'); return Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k).toLowerCase(), String(v)])); } catch { return {}; } }

export function promoOf(raw, env, ev, at) {
  const c = str(raw, 40).toLowerCase();
  if (!c) return { code: '', kind: '' };
  if (c === 'early') return { code: c, kind: ev.earlyEnd && at < ev.earlyEnd ? 'early' : 'early_over' };
  const codes = ev.codes ? Object.fromEntries(Object.entries(ev.codes).map(([k, v]) => [String(k).toLowerCase(), String(v)])) : friendCodes(env);
  const dj = codes[c];
  return dj ? { code: c, kind: 'friend', dj } : { code: c, kind: 'unknown' };
}
// ---------- entry passes: one per person, signed, issued once paid ----------
const PASS_RE = /^([A-Z0-9]+-\d{4})-(\d)\.([0-9a-f]{20})$/;
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode('regpass:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function passFor(env, code, idx) { if (!env.REG_PASS_SECRET) return ''; return code + '-' + (idx + 1) + '.' + (await hmac(env.REG_PASS_SECRET, code + '-' + (idx + 1))).slice(0, 20); }
export async function readPass(env, p) {
  const m = PASS_RE.exec(String(p || '')); if (!m || !env.REG_PASS_SECRET) return null;
  if ((await hmac(env.REG_PASS_SECRET, m[1] + '-' + m[2])).slice(0, 20) !== m[3]) return null;
  return { code: m[1], idx: Number(m[2]) - 1, pass: m[0] };
}
const PAID = ['paid', 'cash'];
async function passesOf(env, reg) { const d = typeof reg.data === 'string' ? JSON.parse(reg.data) : reg.data;
  if (!PAID.includes(reg.status)) return [];
  return Promise.all(d.people.map(async (p, i) => ({ name: p.name, items: p.items || [], pass: await passFor(env, reg.code, i) }))).then(a => a.filter(x => x.pass)); }
const passImg = (env, pass) => String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '') + '/social/reg/pass/' + encodeURIComponent(pass) + '.png';
// 北京 keeps the address its entry codes already carry (that page forwards to /tp/checkin/); every other event the shared page
const checkinUrl = (env, pass, ev) => !ev || ev.id === 'bstw2027' ? siteBase(env) + '/event/' + evSlug(ev) + '/register/checkin/?p=' + encodeURIComponent(pass)
  : siteBase(env) + '/tp/checkin/?event=' + encodeURIComponent(ev.id) + '&p=' + encodeURIComponent(pass);
const bjDate = iso => new Date(Date.parse(iso) + 8 * 36e5).toISOString().slice(0, 10);   // Beijing date, as on the page
const regPage = (env, ev) => siteBase(env) + '/event/' + evSlug(ev) + '/' + ((ev || BSTW()).regPath || 'register/');   // 北京: draft/ until 12/1

function nights(ci, co) { const n = Math.round((Date.parse(co + 'T00:00:00Z') - Date.parse(ci + 'T00:00:00Z')) / 864e5); return n > 0 ? n : 0; }

// Validate a submitted form and compute every amount. Returns {error} or {data, total, hotel, domestic, promo}.
export function evaluate(b, env, at = Date.now(), evIn) {
  const ev = evIn || own(EVENTS, str(b && b.event, 20));
  if (!ev) return { error: 'bad_event' };
  const k2c = KEY2CODE(ev);
  const people = Array.isArray(b.people) ? b.people : [];
  if (people.length < 1 || people.length > ev.maxPeople) return { error: 'bad_people' };
  const promo = promoOf(b.code, env, ev, at);
  const promoPkg = ev.promoPkg || 'full', pp0 = own(ev.pkgs, promoPkg);
  const promoPrice = !pp0 ? 0 : promo.kind === 'friend' && ev.friendPrice != null ? ev.friendPrice : promo.kind === 'early' && ev.earlyPrice != null ? ev.earlyPrice : pp0.price;
  const outPeople = [];
  for (let i = 0; i < people.length; i++) {
    const p = people[i] || {};
    const q = { name: str(p.name, 80), nick: str(p.nick, 60), email: str(p.email, 254).toLowerCase(), wechat: str(p.wechat, 64), facebook: str(p.facebook, 120),
      country: str(p.country, 8).toUpperCase(), city: str(p.city, 80), role: ROLES.includes(p.role) ? p.role : '' };
    if (!q.name) return { error: 'need_name', person: i };
    if (!/^[A-Z]{2,5}$/.test(q.country)) return { error: 'need_country', person: i };
    if (!q.city) return { error: 'need_city', person: i };
    if (!q.role) return { error: 'need_role', person: i };
    if (i > 0 && q.email && !EMAIL_STRICT.test(q.email)) return { error: 'bad_email', person: i };
    const pkg = own(ev.pkgs, p.pkg) ? p.pkg : '';
    const picked = (Array.isArray(p.items) ? p.items : []).map(k => own(k2c, k) || (own(ev.items, k) ? k : '')).filter(Boolean);
    const covers = pkg ? ev.pkgs[pkg].covers : [];
    const extra = [...new Set(picked)].filter(c => !covers.includes(c));
    if (pkg === 'single' && !extra.some(c => !ev.singleNeeds || ev.singleNeeds.includes(c))) return { error: 'need_items', person: i };
    if (!pkg && !extra.length) return { error: 'need_items', person: i };
    const base = pkg && pkg === promoPkg ? promoPrice : pkg ? ev.pkgs[pkg].price : 0;
    const amount = base + extra.reduce((s, c) => s + ev.items[c].price, 0);
    outPeople.push({ ...q, pkg, items: [...covers, ...extra], extra, amount });
  }
  let rooms = [], passports = [], hotel = 0;
  if (b.hotel === 'yes') {
    if (!ev.rooms) return { error: 'no_hotel' };
    const rs = Array.isArray(b.rooms) ? b.rooms : [];
    if (rs.length < 1 || rs.length > outPeople.length) return { error: 'bad_rooms' };
    const used = new Set();
    for (const r of rs) {
      const type = own(ev.rooms, r && r.type) ? r.type : '';
      const ci = str(r && r.ci, 10), co = str(r && r.co, 10);
      const guests = (Array.isArray(r && r.guests) ? r.guests : []).map(Number).filter(g => Number.isInteger(g) && g >= 0 && g < outPeople.length);
      if (!type) return { error: 'bad_room_type' };
      if (!DATE.test(ci) || !DATE.test(co) || ci < ev.ciMin || ci > ev.ciMax || co < ev.coMin || co > ev.coMax || !nights(ci, co)) return { error: 'bad_dates' };
      if (guests.length < 1 || guests.length > 2 || new Set(guests).size !== guests.length) return { error: 'bad_guests' };
      for (const g of guests) { if (used.has(g)) return { error: 'guest_twice' }; used.add(g); }
      const n = nights(ci, co), amount = ev.rooms[type] * n;
      rooms.push({ type, ci, co, nights: n, guests, amount }); hotel += amount;
    }
    const pp = Array.isArray(b.passports) ? b.passports : [];
    for (let i = 0; i < outPeople.length; i++) {
      const s = str(pp[i] && pp[i].s, 60).toUpperCase(), g = str(pp[i] && pp[i].g, 60).toUpperCase();
      if (!PASSPORT.test(s) || !PASSPORT.test(g)) return { error: 'bad_passport', person: i };
      passports.push({ s, g });
    }
  }
  const total = outPeople.reduce((s, p) => s + p.amount, 0) + hotel;
  const lang = LANGS.includes(b.lang) ? b.lang : 'en';
  const data = { event: ev.id, lang, people: outPeople, hotel: b.hotel === 'yes', rooms, passports, src: str(b.src, 20), msg: str(b.msg, 2000), promo };
  return { ev, data, total, hotel, domestic: outPeople.some(p => p.country === 'CN') ? 1 : 0, promo, lang };
}

// Seats used per capped item by registrations that hold a place. Pass skipId to leave one registration out.
export async function usedSeats(env, evId, skipId) {
  const rows = (await env.SDB.prepare(`SELECT id,data FROM reg WHERE event=? AND status IN ('confirmed','paid','cash')`).bind(evId).all()).results || [];
  const used = {};
  for (const r of rows) { if (r.id === skipId) continue; let d; try { d = JSON.parse(r.data); } catch { continue; }
    for (const p of d.people || []) for (const c of p.items || []) used[c] = (used[c] || 0) + 1; }
  return used;
}
export async function seatsLeft(env, ev, skipId) {
  const used = await usedSeats(env, ev.id, skipId), left = {};
  for (const [c, it] of Object.entries(ev.items)) if (it.cap) left[c] = Math.max(0, it.cap - (used[c] || 0));
  return left;
}
function need(data) { const n = {}; for (const p of data.people) for (const c of p.items) n[c] = (n[c] || 0) + 1; return n; }
// The seat check written into the UPDATE itself (same count as usedSeats): two people confirming the last seat at the same
// moment cannot both pass, because the second statement already sees the first one's registration as seated (S02, 2026-11-23).
const ROOM_SQL = ` AND NOT EXISTS (SELECT 1 FROM json_each(?) n WHERE json_extract(n.value,'$.k') + (
  SELECT COUNT(*) FROM reg r, json_each(CASE WHEN json_valid(r.data) THEN r.data ELSE '{}' END,'$.people') p, json_each(p.value,'$.items') i
  WHERE r.event=? AND r.status IN ('confirmed','paid','cash') AND r.id<>? AND i.value=n.key) > json_extract(n.value,'$.cap'))`;
const roomArgs = (ev, data, id) => [JSON.stringify(Object.fromEntries(Object.entries(need(data)).filter(([c]) => ev.items[c] && ev.items[c].cap).map(([c, k]) => [c, { k, cap: ev.items[c].cap }]))), ev.id, id];
async function full(env, ev, data, id, json) {
  const left = await seatsLeft(env, ev, id);
  for (const [c, k] of Object.entries(need(data))) if (left[c] != null && k > left[c]) return json({ error: 'full', item: c, left: left[c], need: k }, 409);
  return null;
}

async function log(env, id, action, detail) { await env.SDB.prepare('INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)').bind(id, nowIso(), action, detail ? String(detail).slice(0, 1000) : null).run(); }
// One statement takes the next number and refuses a second live form of the same email, so any number of people can send at once.
// 实习 (platform step 5, 《TP 实习方案（v2）》): its own numbers (<prefix>P-0001), up to 5 per person and the event's cap in all,
// in that same statement. stage: 'practice' | 'test' | null (see regStage).
const PRACTICE_MINE = 5;
const regStage = ev => ev && ev.mode === 'practice' ? 'practice' : ev && ev.mode === 'test' ? 'test' : null;   // 北京 before moving in: never marked
// the 实习 link's code and the cap in all (5–30, 10 unless the 管理员 set it), from the setting 'practice' = code|cap|since
function practiceOf(s) { const [code, cap, at] = String((s && s.practice) || '').split('|'); return /^[A-Z0-9]{6}$/.test(code || '') ? { code, cap: Math.min(30, Math.max(5, +cap || 10)), at } : null; }
async function addReg(env, r, userId, email, data, ts, stage, pr) {
  const pre = r.ev.prefix + (stage === 'practice' ? 'P' : '') + '-';
  const [guard, gargs] = stage === 'practice'
    ? ["(SELECT COUNT(*) FROM reg WHERE event=? AND stage='practice' AND (email=? OR (user_id IS NOT NULL AND user_id=?)))<? AND (SELECT COUNT(*) FROM reg WHERE event=? AND stage='practice')<?", [r.ev.id, email, userId, PRACTICE_MINE, r.ev.id, pr.cap]]
    : ["NOT EXISTS (SELECT 1 FROM reg WHERE event=? AND email=? AND status<>'cancelled')", [r.ev.id, email]];
  const run = marked => env.SDB.prepare(`INSERT INTO reg(event,code,user_id,email,lang,status,domestic,people,data,amount,hotel_amount,promo,promo_dj,created_at,updated_at${marked ? ',stage' : ''})
    SELECT ?,(SELECT ? || printf('%04d', COALESCE(MAX(CAST(substr(code,?) AS INTEGER)),0)+1) FROM reg WHERE code LIKE ?),?,?,?,'pending',?,?,?,?,?,?,?,?,?${marked ? ',?' : ''}
    WHERE ${guard}`)
    .bind(r.ev.id, pre, pre.length + 1, pre + '%', userId, email, r.lang, r.domestic, r.data.people.length, data, r.total, r.hotel, r.promo.code || null, r.promo.dj || null, ts, ts, ...(marked ? [stage] : []), ...gargs).run();
  let ins;
  try { ins = await run(!!stage); }
  catch (e) { if (stage !== 'test' || !noColumn(e)) throw e; ins = await run(false); }   // before migration 0029 a test registration is simply not marked
  return ins.meta.changes ? env.SDB.prepare('SELECT * FROM reg WHERE id=?').bind(ins.meta.last_row_id).first() : null;
}

// ---------- letters ----------
// 实习 (platform step 5): instead of how to pay — nobody pays, the organizers press 「记收款」 to practise
const PRACTICE_PAY = { zh: '实习用：不要付款。组织者会在管理页按「记收款」练习收款。', en: 'Practice: please do not pay. The organizers will record a payment in their admin page to practise.' };
const T = {
  en: { viewPay: 'View registration and payment QR', viewPass: 'View registration and entry QR', passT: 'Your entry QR codes (one per person) are below. Show them at the door. You can also see them on the registration page after signing in. Tip: take a screenshot of your QR code now, in case there is no internet at the door.', hi: 'Hi {n},', sign: 'Shiao Chang & Liu Zheng\nBeijing Select Tango Weekend', total: 'Total', hotel: 'Hotel', nights: 'nights', details: 'Your registration',
    recvS: 'Registration received · {c}', recv: 'We have received your registration {c}. We will review it and reply within 10 days.',
    confS: 'Registration confirmed · {c}', conf: 'Your registration {c} is confirmed.',
    pay: 'Please pay {t} by {d} (within 2 weeks of this email) by WeChat Pay or Alipay, using the payment QR code. After paying, reply to this email with a screenshot of the payment.',
    noApp: 'If you cannot use WeChat Pay or Alipay, reply to this email with a screenshot of your flight ticket instead; you can then pay when you arrive.',
    rules: 'Changes, additions and cancellations: ¥50 handling fee, charged once per registration. If you cannot attend, we refund your payment minus ¥50. Hotel charges are refunded only for cancellations on or before June 11, 2027. Places cannot be passed to another person.',
    waitS: 'Waiting list · {c}', wait: 'Your registration {c} is on the waiting list. We will email you as soon as a place opens.',
    declS: 'Registration · {c}', decl: 'We are sorry, we cannot accept your registration {c} this time. Thank you for your interest.',
    remS: 'Payment reminder · {c}', rem: 'A friendly reminder: payment for {c} ({t}) is due by {d}.',
    paidS: 'Payment received · {c}', paid: 'We have received your payment for {c}. Your registration is complete. See you in Beijing!',
    cashS: 'Pay at the event · {c}', cash: 'We have received your flight ticket for {c}. Please pay {t} when you arrive (Alipay, WeChat Pay or cash).',
    cancS: 'Registration cancelled · {c}', canc: 'Your registration {c} has been cancelled.', refund: 'Refund: {r}.',
    updS: 'Registration updated · {c}', upd: 'Your registration {c} has been updated. The ¥50 handling fee is included in the total.' },
  zh: { viewPay: '查看报名和付款码', viewPass: '查看报名和入场码', passT: '下方是每个人的入场二维码，请在入场时出示。登入报名页也看得到。建议先把入场码截图存在手机里，以免现场网络不好。', hi: '{n}，你好：', sign: '张孝、刘峥\n北京精选探戈周末', total: '合计', hotel: '住宿', nights: '晚', details: '你的报名',
    recvS: '已收到报名 · {c}', recv: '我们已收到你的报名 {c}，审核后会在 10 天内回复。',
    confS: '报名确认 · {c}', conf: '你的报名 {c} 已确认。',
    pay: '请在 {d} 前（收到本信后 2 周内）用微信或支付宝扫付款码支付 {t}，付款后直接回复本邮件并附上付款截图。请不要发送你自己支付宝、微信里的「付款码」。',
    noApp: '如无法使用微信、支付宝，请回复本邮件并附上机票截图，即可到场付款。',
    rules: '报名后改动、增加、取消，每份报名收一次手续费 ¥50。如无法出席，可退费，扣除手续费 ¥50。房费在 2027年6月11日（含）前取消可退，之后不退。参加资格仅限报名者本人，不能换人。',
    waitS: '候补名单 · {c}', wait: '你的报名 {c} 目前在候补名单上，有名额时我们会立即通知你。',
    declS: '报名结果 · {c}', decl: '很抱歉，这次无法接受你的报名 {c}。谢谢你的关注。',
    remS: '付款提醒 · {c}', rem: '提醒你：报名 {c} 的款项 {t} 请在 {d} 前支付。',
    paidS: '已收到付款 · {c}', paid: '已收到报名 {c} 的付款，报名完成。北京见！',
    cashS: '到场付款 · {c}', cash: '已收到报名 {c} 的机票截图，请到场时支付 {t}（支付宝、微信或现金）。',
    cancS: '报名已取消 · {c}', canc: '你的报名 {c} 已取消。', refund: '退款：{r}。',
    updS: '报名已更新 · {c}', upd: '你的报名 {c} 已更新，合计已含手续费 ¥50。' },
  ko: { viewPay: '신청 내역·결제 QR 보기', viewPass: '신청 내역·입장 QR 보기', passT: '아래는 1인당 하나씩인 입장 QR 코드입니다. 입장할 때 보여 주세요. 신청 페이지에 로그인해도 볼 수 있습니다. 현장에 인터넷이 약할 수 있으니 입장 QR 코드를 미리 캡처해 휴대폰에 저장해 두세요.', hi: '{n} 님, 안녕하세요.', sign: 'Shiao Chang & Liu Zheng\nBeijing Select Tango Weekend', total: '합계', hotel: '호텔', nights: '박', details: '신청 내역',
    recvS: '신청 접수 · {c}', recv: '신청 {c}이(가) 접수되었습니다. 검토 후 10일 이내에 답장드리겠습니다.',
    confS: '신청 확정 · {c}', conf: '신청 {c}이(가) 확정되었습니다.',
    pay: '{d}까지(이 메일을 받은 후 2주 이내) 결제 QR 코드로 위챗페이 또는 알리페이로 {t}을(를) 결제해 주세요. 결제 후 이 메일에 결제 캡처를 첨부해 회신해 주세요.',
    noApp: '위챗페이/알리페이를 사용할 수 없다면 항공권 캡처를 회신해 주세요. 도착해서 결제할 수 있습니다.',
    rules: '신청 후 변경·추가·취소 시 신청 건당 ¥50 수수료가 한 번 부과됩니다. 참가할 수 없게 되면 ¥50을 제외하고 환불합니다. 호텔 요금은 2027년 6월 11일(포함)까지 취소 시에만 환불됩니다. 다른 사람으로 바꿀 수 없습니다.',
    waitS: '대기자 명단 · {c}', wait: '신청 {c}은(는) 대기자 명단에 있습니다. 자리가 나면 바로 알려드리겠습니다.',
    declS: '신청 결과 · {c}', decl: '죄송하지만 이번에는 신청 {c}을(를) 받을 수 없습니다. 관심 가져 주셔서 감사합니다.',
    remS: '결제 안내 · {c}', rem: '신청 {c}의 결제({t}) 기한은 {d}입니다.',
    paidS: '결제 확인 · {c}', paid: '신청 {c}의 결제를 확인했습니다. 신청이 완료되었습니다. 베이징에서 만나요!',
    cashS: '현장 결제 · {c}', cash: '신청 {c}의 항공권을 확인했습니다. 도착 시 {t}을(를) 결제해 주세요(알리페이, 위챗페이 또는 현금).',
    cancS: '신청 취소 · {c}', canc: '신청 {c}이(가) 취소되었습니다.', refund: '환불: {r}.',
    updS: '신청 변경 · {c}', upd: '신청 {c}이(가) 변경되었습니다. 합계에 수수료 ¥50이 포함되어 있습니다.' },
  es: { viewPay: 'Ver inscripción y QR de pago', viewPass: 'Ver inscripción y QR de entrada', passT: 'Abajo están los códigos QR de entrada (uno por persona). Muéstralos en la puerta. También puedes verlos en la página de inscripción al iniciar sesión. Consejo: haz ya una captura de tu código QR por si no hay internet en la puerta.', hi: 'Hola, {n}:', sign: 'Shiao Chang y Liu Zheng\nBeijing Select Tango Weekend', total: 'Total', hotel: 'Hotel', nights: 'noches', details: 'Tu inscripción',
    recvS: 'Inscripción recibida · {c}', recv: 'Hemos recibido tu inscripción {c}. La revisaremos y te responderemos en 10 días.',
    confS: 'Inscripción confirmada · {c}', conf: 'Tu inscripción {c} está confirmada.',
    pay: 'Paga {t} antes del {d} (2 semanas desde este email) con WeChat Pay o Alipay usando el código QR de pago. Después de pagar, responde a este email con una captura del pago.',
    noApp: 'Si no puedes usar WeChat Pay ni Alipay, responde con una captura de tu billete de avión; así podrás pagar al llegar.',
    rules: 'Cambios, añadidos y cancelaciones: cargo de ¥50, una sola vez por inscripción. Si no puedes asistir, devolvemos lo pagado menos ¥50. El hotel solo se reembolsa si cancelas hasta el 11 de junio de 2027. La plaza no se puede ceder a otra persona.',
    waitS: 'Lista de espera · {c}', wait: 'Tu inscripción {c} está en lista de espera. Te escribiremos en cuanto haya plaza.',
    declS: 'Inscripción · {c}', decl: 'Lo sentimos, esta vez no podemos aceptar tu inscripción {c}. Gracias por tu interés.',
    remS: 'Recordatorio de pago · {c}', rem: 'Recordatorio: el pago de {c} ({t}) vence el {d}.',
    paidS: 'Pago recibido · {c}', paid: 'Hemos recibido el pago de {c}. Tu inscripción está completa. ¡Nos vemos en Pekín!',
    cashS: 'Pago en el evento · {c}', cash: 'Hemos recibido tu billete de avión para {c}. Paga {t} al llegar (Alipay, WeChat Pay o efectivo).',
    cancS: 'Inscripción cancelada · {c}', canc: 'Tu inscripción {c} ha sido cancelada.', refund: 'Reembolso: {r}.',
    updS: 'Inscripción actualizada · {c}', upd: 'Tu inscripción {c} ha sido actualizada. El total incluye el cargo de ¥50.' },
  ru: { viewPay: 'Регистрация и QR для оплаты', viewPass: 'Регистрация и входной QR', passT: 'Ниже входные QR-коды (по одному на человека). Покажите их на входе. Их также видно на странице регистрации после входа. Совет: сохраните скриншот QR-кода заранее — на входе может не быть интернета.', hi: 'Здравствуйте, {n}!', sign: 'Shiao Chang и Liu Zheng\nBeijing Select Tango Weekend', total: 'Итого', hotel: 'Отель', nights: 'ноч.', details: 'Ваша регистрация',
    recvS: 'Регистрация получена · {c}', recv: 'Мы получили вашу регистрацию {c}. Проверим её и ответим в течение 10 дней.',
    confS: 'Регистрация подтверждена · {c}', conf: 'Ваша регистрация {c} подтверждена.',
    pay: 'Оплатите {t} до {d} (в течение 2 недель после этого письма) через WeChat Pay или Alipay по QR-коду для оплаты. После оплаты ответьте на это письмо со скриншотом.',
    noApp: 'Если не можете пользоваться WeChat Pay или Alipay, пришлите в ответ скриншот авиабилета — тогда оплата по прибытии.',
    rules: 'Изменения, добавления и отмена: сбор ¥50, один раз за регистрацию. Если вы не сможете приехать, вернём оплату за вычетом ¥50. Отель возвращается только при отмене до 11 июня 2027 включительно. Место нельзя передать другому человеку.',
    waitS: 'Лист ожидания · {c}', wait: 'Ваша регистрация {c} в листе ожидания. Напишем, как только освободится место.',
    declS: 'Регистрация · {c}', decl: 'К сожалению, в этот раз мы не можем принять регистрацию {c}. Спасибо за интерес.',
    remS: 'Напоминание об оплате · {c}', rem: 'Напоминаем: оплата {c} ({t}) до {d}.',
    paidS: 'Оплата получена · {c}', paid: 'Мы получили оплату {c}. Регистрация завершена. До встречи в Пекине!',
    cashS: 'Оплата на месте · {c}', cash: 'Мы получили авиабилет для {c}. Оплатите {t} по прибытии (Alipay, WeChat Pay или наличные).',
    cancS: 'Регистрация отменена · {c}', canc: 'Ваша регистрация {c} отменена.', refund: 'Возврат: {r}.',
    updS: 'Регистрация изменена · {c}', upd: 'Ваша регистрация {c} изменена. В итог включён сбор ¥50.' }
};
// Words that go with a QR code: always Chinese, plus the registrant's language.
const CAP = {
 "zh": {
  "pay": "请扫码付款，付款后回复确认信并附截图",
  "pass": "入场码：请出示给前台，每人一个",
  "cash": "到场付款：请出示此二维码给经理，付款后才能入场"
 },
 "en": {
  "pay": "Scan to pay, then reply to the confirmation email with a screenshot",
  "pass": "Entry code: show it at the front desk, one per person",
  "cash": "Pay on arrival: show this QR code to an event manager. Entry is possible after payment"
 },
 "ko": {
  "pay": "QR을 스캔해 결제한 뒤 확인 메일에 캡처를 첨부해 회신해 주세요",
  "pass": "입장 코드: 안내 데스크에 보여 주세요. 1인당 하나입니다",
  "cash": "현장 결제: 이 QR 코드를 행사 매니저에게 보여 주세요. 결제 후 입장할 수 있습니다"
 },
 "es": {
  "pay": "Escanea para pagar y responde al email de confirmación con una captura",
  "pass": "Código de entrada: muéstralo en recepción, uno por persona",
  "cash": "Pago al llegar: muestra este código QR al responsable del evento. Podrás entrar después de pagar"
 },
 "ru": {
  "pay": "Отсканируйте для оплаты и ответьте на письмо с подтверждением, приложив скриншот",
  "pass": "Входной код: покажите на стойке, один на человека",
  "cash": "Оплата на месте: покажите этот QR-код менеджеру мероприятия. Вход возможен после оплаты"
 }
};
const caption = (lang, k) => (lang !== 'zh' && CAP[lang] ? [CAP.zh[k], CAP[lang][k]] : [CAP.zh[k]]);
const NAMES = {
  en: { full: 'Full Pass', combo: 'Weekend Package', pass: 'All 4 weekend milongas', single: 'Single milongas', MV: 'Fri Welcome Milonga', M1: 'Sat afternoon milonga', M2: 'Sat night milonga', M3: 'Sun afternoon milonga', M4: 'Sun night milonga', T1: 'Fri Day Tour', S1: 'Mon Tango Courtyard', T2: 'Tue City Walk', MF: 'Tue Farewell Milonga', king: 'Queen room', twin: 'Twin room' },
  zh: { full: '全程套餐', combo: '周末套餐', pass: '周末舞会（4 场）', single: '单场舞会', MV: '周五 欢迎舞会', M1: '周六 下午场', M2: '周六 晚场', M3: '周日 下午场', M4: '周日 晚场', T1: '周五 一日游', S1: '周一 探戈小院', T2: '周二 城市漫步', MF: '周二 告别舞会', king: '大床房', twin: '双床房' },
  ko: { full: '풀 패스', combo: '위켄드 패키지', pass: '주말 밀롱가 4회', single: '개별 밀롱가', MV: '금 웰컴 밀롱가', M1: '토 오후 밀롱가', M2: '토 저녁 밀롱가', M3: '일 오후 밀롱가', M4: '일 저녁 밀롱가', T1: '금 데이 투어', S1: '월 탱고 정원', T2: '화 시티 워크', MF: '화 페어웰 밀롱가', king: '퀸 룸', twin: '트윈 룸' },
  es: { full: 'Pase Completo', combo: 'Paquete Fin de Semana', pass: 'Las 4 milongas del fin de semana', single: 'Milongas sueltas', MV: 'Vie Milonga de bienvenida', M1: 'Sáb milonga tarde', M2: 'Sáb milonga noche', M3: 'Dom milonga tarde', M4: 'Dom milonga noche', T1: 'Vie Excursión', S1: 'Lun Patio del Tango', T2: 'Mar Paseo', MF: 'Mar Milonga de despedida', king: 'Habitación queen', twin: 'Dos camas' },
  ru: { full: 'Полный пакет', combo: 'Пакет «Уикенд»', pass: '4 милонги выходных', single: 'Отдельные милонги', MV: 'Пт приветственная милонга', M1: 'Сб дневная милонга', M2: 'Сб вечерняя милонга', M3: 'Вс дневная милонга', M4: 'Вс вечерняя милонга', T1: 'Пт экскурсия', S1: 'Пн Танго-дворик', T2: 'Вт прогулка', MF: 'Вт прощальная милонга', king: 'Двуспальная', twin: 'Две кровати' }
};
const fmt = n => '¥' + Number(n || 0).toLocaleString('en-US');
const fill = (s, v) => s.replace(/\{(\w)\}/g, (_, k) => v[k] == null ? '' : v[k]);
const he = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function detailLines(d, lang, ev) {
  const own_ = ev && ev.names ? (ev.names[lang] || ev.names.en || ev.names.zh) : null;
  const N = own_ || NAMES[lang] || NAMES.en, L = T[lang] || T.en, out = [];
  for (const p of d.people) {
    const what = [p.pkg && p.pkg !== 'single' ? N[p.pkg] : '', ...(p.pkg && p.pkg !== 'single' ? p.extra : p.items).map(c => N[c])].filter(Boolean).join(' + ');
    out.push(`${p.name}: ${what} — ${fmt(p.amount)}`);
  }
  if (d.hotel) d.rooms.forEach(r => out.push(`${L.hotel}: ${N[r.type]} ${r.ci} → ${r.co} (${r.nights} ${L.nights}), ${r.guests.map(g => d.people[g] && d.people[g].name).join(', ')} — ${fmt(r.amount)}`));
  return out;
}
// qrs: names of the payment QR images that are really uploaded (a missing one would be a broken image).
export function letter(kind, reg, env, passes, qrs = [], evIn) {
  const ev = evIn || own(EVENTS, reg.event) || BSTW();
  const d = typeof reg.data === 'string' ? JSON.parse(reg.data) : reg.data;
  const lang = T[reg.lang] ? reg.lang : 'en', L = { ...T[lang], ...((ev.letters && (ev.letters[lang] || ev.letters.en)) || {}) };
  const v = { n: d.people[0] && d.people[0].name, c: reg.code, t: fmt(reg.rest == null ? reg.amount : reg.rest), d: reg.due_at ? bjDate(reg.due_at) : '', r: fmt(reg.refund || 0) };
  const body = [fill(L.hi, v), '', fill(L[kind], v)];
  if (kind === 'canc' && reg.refund != null) body.push(fill(L.refund, v));
  if (['recv', 'conf', 'upd'].includes(kind)) { const colon = lang === 'zh' ? '：' : ': ';
    body.push('', L.details + colon.trim(), ...detailLines(d, lang, ev).map(s => '· ' + s));
    if (reg.fee) body.push('· ' + (lang === 'zh' ? '手续费' : 'Fee') + ' — ' + fmt(reg.fee)); body.push(L.total + colon + fmt(reg.amount)); }
  if (kind === 'conf' || kind === 'upd' || kind === 'rem') body.push('', ...(ev && ev.mode === 'practice' ? [PRACTICE_PAY[lang] || PRACTICE_PAY.en] : [fill(L.pay, v), L.noApp]));
  if (kind === 'conf' || kind === 'upd') body.push('', L.rules);
  if ((kind === 'paid' || kind === 'cash') && passes && passes.length) body.push('', fill(L.passT, v));
  const toPay = kind === 'conf' || kind === 'upd' || kind === 'rem', toPass = kind === 'paid' || kind === 'cash';
  const view = toPay ? L.viewPay : L.viewPass, href = regPage(env, ev) + '?lang=' + lang + (toPay ? '#pay' : '#passes');
  const button = `<p style="margin:18px 0 6px"><a href="${he(href)}" style="display:inline-block;background:#4a0609;color:#f6e3b4;padding:11px 22px;border-radius:999px;text-decoration:none;font-weight:700">${he(view)}</a></p>`;
  const capK = toPay ? 'pay' : kind === 'cash' ? 'cash' : 'pass';
  if ((toPay && qrs.length) || (toPass && passes && passes.length)) body.push('', ...caption(lang, capK));
  const capHtml = caption(lang, capK).map(x => `<div style="max-width:220px;margin:5px auto 0;font-size:13px;line-height:1.4">${he(x)}</div>`).join('');
  if (toPay || toPass) body.push('', view + (lang === 'zh' ? '：' : ': '), href);
  body.push('', L.sign);
  const text = body.join('\n');
  let html = '';
  if (kind === 'conf' || kind === 'upd' || kind === 'rem') {
    const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
    const imgs = qrs.map(n => `<div style="display:inline-block;text-align:center;margin:6px"><div style="font-weight:700">${/alipay/.test(n) ? 'Alipay 支付宝' : 'WeChat Pay 微信支付'}</div><img src="${he(base)}/social/reg/qr/${encodeURIComponent(n)}?k=${encodeURIComponent(env.REG_QR_KEY || '')}" alt="${he(n)}" width="220" style="border:1px solid #e7d3b0;border-radius:8px">${capHtml}</div>`).join('');
    html = `<!doctype html><html><body style="font-family:Georgia,serif;color:#2a1a14;background:#fbf5e9;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7d3b0;border-radius:12px;padding:20px">` +
      he(text).replace(/\n/g, '<br>') + button + `<div style="margin-top:14px">${imgs}</div></div></body></html>`;
  }
  if ((kind === 'paid' || kind === 'cash') && passes && passes.length) {
    const cards = passes.map(x => `<div style="display:inline-block;text-align:center;margin:8px"><img src="${he(passImg(env, x.pass))}" alt="QR" width="200" height="200" style="border:1px solid #e7d3b0;border-radius:8px"><div style="font-weight:700">${he(x.name)}</div><div style="font-size:12px;color:#7a6255">${he(x.pass.split('.')[0])}</div>${capHtml}</div>`).join('');
    html = `<!doctype html><html><body style="font-family:Georgia,serif;color:#2a1a14;background:#fbf5e9;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7d3b0;border-radius:12px;padding:20px">` +
      he(text).replace(/\n/g, '<br>') + button + `<div style="margin-top:14px;text-align:center">${cards}</div></div></body></html>`;
  }
  return { subject: fill(L[kind + 'S'], v), text, html };
}
const KIND = { recv: 'recv', confirm: 'conf', waitlist: 'wait', decline: 'decl', remind: 'rem', paid: 'paid', cash: 'cash', cancel: 'canc', modify: 'upd' };

// 收款码 per event (platform step 4, spec v0.6): 北京 keeps the names it has; another event's are '<event id>-<name>'.
const assetName = (ev, name) => !ev || ev.id === 'bstw2027' ? name : ev.id + '-' + name;
// The payment QR codes for this registration that the organizer uploaded, Alipay first.
async function payNames(env, reg) {
  if (!env.REG_QR_KEY) return [];
  const ev = await getEvent(env, reg.event);
  if (ev && ev.mode === 'practice') return [];   // 实习: never the real payment QR (《TP 实习方案（v2）》)
  const want = String((reg.domestic ? env.REG_QR_CN : env.REG_QR_INTL) || (reg.domestic ? 'cn-alipay,cn-wechat' : 'intl-alipay,intl-wechat')).split(',').map(x => x.trim()).filter(Boolean).map(n => assetName(ev, n));
  const have = new Set((((await env.SDB.prepare('SELECT name FROM reg_asset').all()).results) || []).map(x => x.name));
  return want.filter(n => have.has(n));
}
// Test stage (no REG_LIVE=1; plan 「1225」, Shiao 2026-11-24):
//   the organizers (管理员, 总管邮箱, 副本邮箱) get their own mail straight, the subject marked [测试];
//   a registrant on the 测试名单 gets theirs straight, marked [测试]; any other registrant's goes only to the test inbox,
//   its subject saying whom it was for, so nobody outside the list ever gets a test letter.
const TEST_TAG = '[测试] ';
const testInbox = env => env.REG_TEST_INBOX || 'selecttango@gmail.com';
const PRACTICE_TAG = '[实习] ';
const toOrganizer = (t, to) => ({ to, pre: t && t.live ? '' : t && t.practice ? PRACTICE_TAG : TEST_TAG });
function toRegistrant(env, t, to) {
  if (t && t.live) return { to, pre: '' };
  if (t && t.practice) return { to, pre: PRACTICE_TAG };   // 实习: those who practise are our own people, letters straight
  if (t && (t.test_list || []).includes(String(to || '').toLowerCase())) return { to, pre: TEST_TAG };
  return { to: testInbox(env), pre: '[TEST → ' + to + '] ' };
}
const replyTo = env => env.REG_REPLY_TO || 'info@tangoweekend.org';
const stageOf = live => live ? 'live' : 'test';
const adminMail = env => String(env.REG_NOTIFY || 'selecttango@gmail.com').trim().toLowerCase();
// 'sent' or 'failed'; what was saved stays saved either way
async function send(env, kit, reg, action) {
  const kind = KIND[action]; if (!kind) return undefined;
  const passes = (action === 'paid' || action === 'cash') ? await passesOf(env, reg) : null;
  const qrs = ['conf', 'upd', 'rem'].includes(kind) ? await payNames(env, reg) : [];
  const rest = kind === 'cash' || kind === 'rem' ? Math.max(0, reg.amount - await paidSum(env, reg.id)) : null;
  const shown = rest == null ? reg : { ...reg, rest };
  const ev = await getEvent(env, reg.event), m = letter(kind, shown, env, passes, qrs, ev);
  const t = await mailTo(env, reg.event, ev), dest = toRegistrant(env, t, reg.email);
  try { await kit.deliver(env, dest.to, dest.pre + m.subject, m.text, m.html || undefined, undefined, { fromName: evFrom(ev), replyTo: replyFor(env, t) }); await log(env, reg.id, 'mail:' + action, dest.to); }
  catch (e) { await log(env, reg.id, 'mail_failed:' + action, String(e && e.message || e)); return 'failed'; }
  await sendCopies(env, kit, reg, action, kind, shown, qrs, passes, t, ev);
  return 'sent';
}

// ---------- 活动邮箱 (Shiao, 2026-11-24; rules in docs/tangopass.md) ----------
// Per event, changed by the 管理员 only, seen by the 总管: the 总管邮箱 and a 副本邮箱 (may be empty); the 管理员's own
// address is fixed. Every registration letter and the 新报名 notice go to each of them as a separate letter, never Cc or
// Bcc, so the registrant sees none of them. The 管理员 may turn their own off (「管理员也收信」), but still gets them
// while the 总管邮箱 is empty or not verified: verified = the 总管 opened the link in the 任命信, in this same stage.
const SETTINGS = ['chief_email', 'copy_email', 'admin_copy', 'chief_token', 'chief_verified', 'event_mail', 'event_mail_rule', 'event_mail_token', 'event_mail_ok', 'test_list', 'practice_cleared', 'practice'];
const TEST_LIST_MAX = 10;
const noTable = e => /no such table/i.test(String(e && e.message));
async function settingsOf(env, evId) {
  const s = {};
  try { for (const r of ((await env.SDB.prepare(`SELECT key,value FROM reg_setting WHERE event=? AND key IN (${SETTINGS.map(() => '?')})`).bind(evId, ...SETTINGS).all()).results || [])) s[r.key] = r.value || ''; }
  catch (e) { if (!noTable(e)) throw e; }   // before migration 0026: nothing set, so the 管理员 gets everything
  return s;
}
async function setSetting(env, evId, key, value, by) {
  await env.SDB.prepare('INSERT INTO reg_setting(event,key,value,updated_at,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(event,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by')
    .bind(evId, key, value, nowIso(), by).run();
}
// what the settings page shows (never the token)
async function mailTo(env, evId, evIn) {
  const ev_ = evIn || await getEvent(env, evId), live = isLive(env, ev_), practice = !!ev_ && ev_.mode === 'practice';
  const s = await settingsOf(env, evId), chief = s.chief_email || '', v = String(s.chief_verified || '').split('|');
  const verified = !!chief && v[0] === chief && (v[1] === 'direct' || v[1] === stageOf(live));
  const event_mail = s.event_mail || '', ok = String(s.event_mail_ok || '').split('|'), bound = !!event_mail && ok[0] === event_mail;
  return { chief, copy: s.copy_email || '', admin: adminMail(env), admin_on: s.admin_copy !== '0', verified, verified_at: verified ? v[2] : undefined, live,
    event_mail, event_mail_ok: bound, event_mail_at: bound ? ok[1] : undefined, domain: mailDomain(env), cf_ready: !!env.CF_MAIL_TOKEN,
    test_list: String(s.test_list || '').split(',').filter(Boolean), practice };
}
// replies to a registration letter: the 活动专属邮箱 once it is bound (its test letter came back), else info@
const replyFor = (env, t) => t && t.event_mail && t.event_mail_ok ? t.event_mail : replyTo(env);
// who gets a copy, each address once; skip = the registrant, who has the letter itself
function recipients(t, skip) {
  const out = [], add = (addr, who) => { if (addr && addr !== skip && !out.some(x => x.addr === addr)) out.push({ addr, who }); };
  add(t.chief, 'chief'); add(t.copy, 'copy');
  if (t.admin_on || !t.verified) add(t.admin, 'admin');
  return out;
}
const route = (t, x) => toOrganizer(t, x.addr);
// The copy is the same letter with a line on top. Entry codes belong to the registrant alone: never in a copy.
async function sendCopies(env, kit, reg, action, kind, shown, qrs, passes, t, ev) {
  ev = ev || await getEvent(env, reg.event);
  t = t || await mailTo(env, reg.event, ev);
  const list = recipients(t, String(reg.email || '').toLowerCase());
  if (!list.length) return;
  const m = letter(kind, shown, env, null, qrs, ev);
  const bound = t.event_mail && t.event_mail_ok, tag = (bound ? `[副本 #${await relayKey(env, reg.code)}]` : '[副本]') + (evTag(ev) || ' ');
  const head = `副本：这是寄给报名者 ${reg.email}（${reg.code}）那封信的副本，报名者看不到这个副本。` + (passes && passes.length ? '入场码只寄给报名者本人，副本里没有。' : '')
    + (bound ? `直接回复这封副本，会以活动名义寄给报名者（报名者看不到你的邮箱）。` : '');
  const html = m.html ? m.html.replace(/(<body[^>]*>)/, `$1<div style="max-width:560px;margin:0 auto 12px;font-family:sans-serif;font-size:14px;color:#7a6255">${he(head)}</div>`) : undefined;
  const done = [], failed = [];
  for (const x of list) {
    const dest = route(t, x);
    try { await kit.deliver(env, dest.to, dest.pre + tag + m.subject, head + '\n\n' + m.text, html, undefined, { fromName: evFrom(ev), replyTo: replyFor(env, t) }); done.push(x.who); }
    catch (e) { failed.push(x.who + ': ' + String(e && e.message || e).slice(0, 200)); }
  }
  if (done.length) await log(env, reg.id, 'copy:' + action, done.join(','));
  if (failed.length) await log(env, reg.id, 'copy_failed:' + action, failed.join(' | '));
}
// The 新报名 notice: to the same people, each their own. A failure to the 管理员 shows on the page, as before.
async function notifyOwner(env, kit, reg) {
  const d = JSON.parse(reg.data), ev = await getEvent(env, reg.event);
  const text = [`New registration ${reg.code} (${reg.people} people${reg.domestic ? ', domestic' : ''})`, `${reg.email} · ${reg.lang}`, ...detailLines(d, 'zh', ev), `合计 ${fmt(reg.amount)}`, d.promo && d.promo.code ? `码 ${d.promo.code}${d.promo.dj ? ' (' + d.promo.dj + ')' : ''}` : '', d.msg ? '留言：' + d.msg : ''].filter(Boolean).join('\n');
  const done = [], failed = [];
  const t = await mailTo(env, reg.event, ev);
  for (const x of recipients(t)) {
    const dest = route(t, x);
    try { await kit.deliver(env, dest.to, dest.pre + evTag(ev) + '新报名 ' + reg.code, text, undefined, undefined, { fromName: 'Registration' }); if (x.who !== 'admin') done.push(x.who); }
    catch (e) {
      const why = String(e && e.message || e);
      if (x.who === 'admin') { console.log('reg owner mail', why.slice(0, 120)); await log(env, reg.id, 'mail_failed:notify', why); }
      else failed.push(x.who + ': ' + why.slice(0, 200));
    }
  }
  if (done.length) await log(env, reg.id, 'copy:notify', done.join(','));
  if (failed.length) await log(env, reg.id, 'copy_failed:notify', failed.join(' | '));
}
// Letters about the people who run an event: the system's own name, never a password in them.
const TP_SIGN = '\n\n探戈通 Tango Pass · tangoweekend.org\n（有问题请直接回信）';
async function tpMail(env, kit, t, to, subject, text) {
  const dest = toOrganizer(t, to);   // 任命信 and notices go to the 总管邮箱 / 副本邮箱 only
  try { await kit.deliver(env, dest.to, dest.pre + subject, text + TP_SIGN, undefined, undefined, { fromName: '探戈通 Tango Pass', replyTo: replyTo(env) }); return 'sent'; }
  catch (e) { console.log('tp mail', String(e && e.message || e).slice(0, 120)); return 'failed'; }
}
const OPEN_LINK = '请用 Safari 或 Chrome 打开（在微信里按右上角 ··· 选「在浏览器打开」）。打开这个链接，也就确认了这个邮箱收得到信。';
const NO_PIN = '六位临时密码管理员会用微信或电话另外告诉你，这封信里没有密码。第一次登入要换成自己的密码。';
const CHIEF_DOES = '总管有这场活动报名系统的全部权限：审核、收款、退款、看护照姓名、导出，并任免经理和前台。';
const COPIES = '此后，这场活动每封报名相关的信，都会另外寄一份到这个邮箱（报名者看不到）。';
// mode: new = just appointed (temporary password); reset = new link and temporary password;
//       relink = a new link for the 总管 already there (the 总管邮箱 set or changed, or sent again): same password, phones stay;
//       promoted = a 经理 made 总管: a new link, same password, the phones were signed out by the change;
//       added = someone already working in another event made 总管 here (一人多场): their one link made new, same password, phones stay.
export function chiefLetter(ev, name, mode, link, temp) {
  const e = ev.name.zh, top = name + '，你好：\n\n', linkPart = `你的专属登入链接（登入后进管理页）：\n${link}\n\n${OPEN_LINK}`;
  const pin = mode !== 'new' && mode !== 'reset' && !temp ? '密码不变：输入你自己的六位密码。' : NO_PIN;
  if (mode === 'reset') return { subject: `探戈通：你的总管登入已重设（${e}）`,
    text: top + `管理员重设了你在「${e}」的登入：旧链接、旧密码都已失效，所有手机都已退出。\n\n${linkPart}\n${pin}\n\n链接和密码都不要转发。` };
  const first = mode === 'relink' ? `你是「${e}」的总管。下面是你新的专属登入链接，旧链接已失效；已登入的手机不受影响。`
    : `管理员任命你为「${e}」的总管。${CHIEF_DOES}` + (mode === 'promoted' ? '职务改了，手机要用下面的新链接重新登入，旧链接已失效。'
      : mode === 'added' ? '你在其他活动用的探戈通登入也管这场：同一个人、同一个密码。下面是你新的专属登入链接，旧链接已失效；已登入的手机不受影响，进管理页就能看到这场活动。' : '');
  return { subject: `探戈通：你被任命为总管（${e}）`, text: top + first + '\n\n' + linkPart + '\n' + pin + '\n\n' + COPIES + '\n\n链接和密码都不要转发。不是你本人，或没想到会收到这封信，请回信告诉我们。' };
}
// to the 副本邮箱: short, never a link
export function copyLetter(ev, mode, o = {}) {
  const e = ev.name.zh;
  if (mode === 'set') return { subject: `探戈通：副本邮箱已设定（${e}）`,
    text: `你好：\n\n管理员把这个邮箱设为「${e}」的副本邮箱。${COPIES}\n\n不是你的邮箱，或不想再收，请回信告诉我们。` };
  return { subject: `探戈通：总管已任命（${e}）`,
    text: `你好：\n\n「${o.name}」是「${e}」的总管，任命信已寄到总管邮箱 ${o.chief}（信里只有专属登入链接，没有密码）。` };
}
// The 任命信 to the 总管邮箱. Its link carries a token of its own (?m=): opening it verifies the address.
// 'sent' | 'failed', or undefined when no 总管邮箱 is set. tell: the 副本邮箱 hears of it (not of a reset or a resend).
async function mailChief(env, kit, ev, name, mode, key, temp, tell) {
  const t = await mailTo(env, ev.id); if (!t.chief) return undefined;
  const m = rndHex(16);
  // the letter goes straight to the 总管邮箱 in both stages now, so opening it proves that address: 'direct'
  await setSetting(env, ev.id, 'chief_token', `${await sha256(m)}|${t.chief}|direct`, name);
  const l = chiefLetter(ev, name, mode, personLink(env, key, m, ev), temp);
  const r = await tpMail(env, kit, t, t.chief, l.subject, l.text);
  if (r === 'sent' && tell && t.copy && t.copy !== t.chief) { const o = copyLetter(ev, 'chief', { name, chief: t.chief }); await tpMail(env, kit, t, t.copy, o.subject, o.text); }
  return r;
}
// A link for the 总管 already there: only its hash is kept, so a new one is made and mailed. The password and the
// phones signed in stay. If the letter cannot go out, the old link is put back.
// 一人多场: a 总管 who signed in with another event's role first gets that person's one link, made new.
async function relinkChief(env, kit, ev, mode, tell) {
  if (!(await mailTo(env, ev.id)).chief) return undefined;
  const row = await env.SDB.prepare("SELECT * FROM reg_admin WHERE event=? AND perms='chief' AND disabled_at IS NULL ORDER BY id LIMIT 1").bind(ev.id).first();
  if (!row) return 'wait';   // sent when a 总管 is appointed
  const h = await homeOf(env, 'admin', row); if (!h) return 'changed';
  const home = h.row, T = TABLE[h.kind];
  if (!home.pin_hash || home.stopped_at) return 'need_reset';
  const key = rndHex(24), hash = await sha256(key), old = home.link_hash || '';
  const ch = row.person_id
    ? await env.SDB.prepare(`UPDATE ${T} SET link_hash=? WHERE id=? AND COALESCE(link_hash,'')=? AND disabled_at IS NULL AND person_id IS NULL AND EXISTS (SELECT 1 FROM reg_admin WHERE id=? AND perms='chief' AND person_id=? AND disabled_at IS NULL)`)
      .bind(hash, home.id, old, row.id, row.person_id).run()
    : await env.SDB.prepare("UPDATE reg_admin SET link_hash=? WHERE id=? AND perms='chief' AND COALESCE(link_hash,'')=? AND disabled_at IS NULL").bind(hash, row.id, old).run();
  if (!ch.meta.changes) return 'changed';
  const r = await mailChief(env, kit, ev, row.name, mode, key, !!home.pin_temp, tell);
  if (r !== 'sent') await env.SDB.prepare(`UPDATE ${T} SET link_hash=? WHERE id=? AND link_hash=?`).bind(old || null, home.id, hash).run();
  return r || 'failed';
}
// Opening the 任命信's link: only the 总管's own link with the token of the latest letter, to the address set now,
// in the stage it was sent in (a letter read in the test inbox does not count once live).
// list: the person's roles (一人多场); the letter is the one of an event where they are 总管.
async function mailOk(env, list, m) {
  if (!/^[0-9a-f]{32}$/.test(String(m || ''))) return undefined;
  for (const { kind, row, role, ev } of list) {
    if (kind !== 'admin' || role !== 'chief') continue;
    const s = await settingsOf(env, row.event), [h, addr, stage] = String(s.chief_token || '').split('|');
    if (!s.chief_email || addr !== s.chief_email || (stage !== 'direct' && stage !== stageOf(isLive(env, ev))) || h !== await sha256(String(m))) continue;
    await setSetting(env, row.event, 'chief_verified', `${addr}|${stage}|${nowIso()}`, row.name);
    return true;
  }
  return undefined;
}
// A 总管 deleted or no longer 总管 stops getting copies.
async function dropChiefMail(env, ev, by) {
  try { const t = await mailTo(env, ev.id); if (!t.chief) return false; await setSetting(env, ev.id, 'chief_email', '', by); return true; }
  catch (e) { if (noTable(e)) return false; throw e; }
}

// ---------- 活动专属邮箱 (step 3, Shiao 2026-11-24; rules in docs/tangopass.md) ----------
// The 管理员 sets one address per event (e.g. bstw2027@tangoweekend.org). TP itself adds the Cloudflare Email Routing rule
// "that address → this Worker" (secret CF_MAIL_TOKEN: Email Routing Rules edit on this one zone, + Zone read unless
// CF_ZONE_ID is set), and removes only the rule it made. A test letter to the address must come back before it is
// "bound"; from then on the event's letters reply to it. Mail that arrives there:
//   from a registrant of the event          → to the 总管邮箱, 副本邮箱 and 管理员 (same rules as the copies), attachments too
//   from one of those, answering a letter TP sent them (its subject carries the 报名编号 and a short secret tag #…)
//                                           → to that registrant, in the event's name (they never see the address), copies to the others.
//                                             The tag, not the sender's address, is what lets a letter out: addresses can be forged.
//   from anyone else                        → to the 管理员 only (Shiao, 2026-11-24)
//   forged (no SPF/DKIM/DMARC pass), automatic replies, our own relays → dropped
const mailDomain = env => String(env.REG_MAIL_DOMAIN || 'tangoweekend.org').toLowerCase();
const LOCAL_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
const RESERVED_LOCAL = new Set(['info', 'huodong', 'subscribe', 'admin', 'administrator', 'postmaster', 'abuse', 'hostmaster', 'webmaster', 'noreply', 'no-reply',
  'root', 'mail', 'email', 'security', 'support', 'contact', 'hello', 'atm', 'tp', 'test', 'www', 'dmarc', 'bounce', 'bounces', 'mailer-daemon', 'register', 'registration']);
let zoneMemo = '';
async function cf(env, method, path, body) {
  const r = await fetch('https://api.cloudflare.com/client/v4' + path, { method, headers: { Authorization: 'Bearer ' + env.CF_MAIL_TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let d = {}; try { d = await r.json(); } catch { /* not JSON */ }
  if (!r.ok || d.success === false) throw new Error('cloudflare ' + r.status + ' ' + JSON.stringify(d.errors || []).slice(0, 200));
  return d;
}
async function zoneOf(env) {
  if (env.CF_ZONE_ID) return env.CF_ZONE_ID;
  if (zoneMemo) return zoneMemo;
  const z = ((await cf(env, 'GET', '/zones?name=' + encodeURIComponent(mailDomain(env)))).result || [])[0];
  if (!z) throw new Error('cloudflare zone not found');
  return (zoneMemo = z.id);
}
async function cfRules(env, z) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const d = await cf(env, 'GET', `/zones/${z}/email/routing/rules?per_page=50&page=${page}`);
    out.push(...(d.result || []));
    const n = (d.result_info || {}).total_pages || 1; if (page >= n) break;
  }
  return out;
}
const ruleTo = r => String(((r.matchers || []).find(m => m.type === 'literal' && m.field === 'to') || {}).value || '').toLowerCase();
const ruleId = r => r && (r.id || r.tag);
// set, change or clear (want = the part before @, '' clears). { state } for the page:
//   testing (rule made, test letter on its way) | test_failed | cleared | same | bad | reserved | taken (another event) |
//   exists (Cloudflare already routes that address elsewhere) | cf_not_ready (no token) | cf_error
async function setEventMail(env, kit, ev, want, by) {
  want = String(want || '').trim().toLowerCase().replace(new RegExp('@' + mailDomain(env).replace(/\./g, '\\.') + '$'), '');
  if (want && !LOCAL_RE.test(want)) return { state: 'bad' };
  if (RESERVED_LOCAL.has(want)) return { state: 'reserved' };
  const s = await settingsOf(env, ev.id), cur = s.event_mail || '', addr = want ? want + '@' + mailDomain(env) : '';
  if (addr === cur) return { state: 'same' };
  if (!env.CF_MAIL_TOKEN) return { state: 'cf_not_ready' };
  if (addr && await env.SDB.prepare("SELECT 1 x FROM reg_setting WHERE key='event_mail' AND value=? AND event<>?").bind(addr, ev.id).first()) return { state: 'taken' };
  let z, rules;
  try { z = await zoneOf(env); rules = await cfRules(env, z); } catch (e) { console.log('tp cf', String(e.message).slice(0, 200)); return { state: 'cf_error' }; }
  if (addr && rules.some(r => ruleTo(r) === addr)) return { state: 'exists' };
  if (cur && s.event_mail_rule) {
    // only the rule TP made, and only while it still is that address to this Worker
    const r = rules.find(x => ruleId(x) === s.event_mail_rule);
    if (r && ruleTo(r) === cur && (r.actions || []).every(a => a.type === 'worker')) {
      try { await cf(env, 'DELETE', `/zones/${z}/email/routing/rules/${s.event_mail_rule}`); } catch (e) { console.log('tp cf', String(e.message).slice(0, 200)); return { state: 'cf_error' }; }
    }
  }
  for (const k of ['event_mail', 'event_mail_rule', 'event_mail_token', 'event_mail_ok']) await setSetting(env, ev.id, k, '', by);
  if (!addr) return { state: 'cleared' };
  let made;
  try { made = await cf(env, 'POST', `/zones/${z}/email/routing/rules`, { name: `TP ${ev.id} 活动专属邮箱`, enabled: true,
    matchers: [{ type: 'literal', field: 'to', value: addr }], actions: [{ type: 'worker', value: [env.CF_WORKER_NAME || 'tango-subscribe'] }] }); }
  catch (e) { console.log('tp cf', String(e.message).slice(0, 200)); return { state: 'cf_error' }; }
  await setSetting(env, ev.id, 'event_mail', addr, by);
  await setSetting(env, ev.id, 'event_mail_rule', ruleId(made.result) || '', by);
  return { state: await bindTest(env, kit, ev, addr, by) };
}
// The test letter goes to the address itself (not the test inbox: it is our own address), from our own sender.
async function bindTest(env, kit, ev, addr, by) {
  const k = rndHex(16);
  await setSetting(env, ev.id, 'event_mail_token', `${await sha256(k)}|${addr}`, by);
  try { await kit.deliver(env, addr, `探戈通：活动专属邮箱绑定测试 [TP-BIND ${k}]`, `这是「${ev.name.zh}」活动专属邮箱 ${addr} 的绑定测试信，系统收到就会显示「已绑定」。不用回复。`, undefined, { 'X-TP-Relay': 'bind' }, { fromName: '探戈通 Tango Pass' }); return 'testing'; }
  catch (e) { console.log('tp bind test', String(e && e.message || e).slice(0, 160)); return 'test_failed'; }
}
async function bindOk(env, ev, addr, k) {
  const s = await settingsOf(env, ev.id), [h, a] = String(s.event_mail_token || '').split('|');
  if (!h || a !== addr || s.event_mail !== addr || h !== await sha256(k)) { console.log('tp bind: token does not match'); return; }
  await setSetting(env, ev.id, 'event_mail_ok', `${addr}|${nowIso()}`, 'system');
  await setSetting(env, ev.id, 'event_mail_token', '', 'system');
}

const ROLE_ZH = { chief: '总管', copy: '副本邮箱', admin: '管理员' };
const STATUS_ZH = { pending: '待审核', confirmed: '待付款', paid: '已付款', cash: '到场付款', waitlist: '候补', declined: '婉拒', cancelled: '已取消' };
const MAX_FILES_OUT = 10, MAX_BYTES_OUT = 20 * 1024 * 1024;
function addrOf(v) { const m = /<([^<>@\s]+@[^<>\s]+)>/.exec(String(v || '')) || /([^\s<>"',;:]+@[^\s<>"',;:]+)/.exec(String(v || '')); return m ? m[1].toLowerCase() : ''; }
function emailsOf(reg) { const d = typeof reg.data === 'string' ? JSON.parse(reg.data) : reg.data; return [reg.email, ...((d && d.people) || []).map(p => p.email)].filter(Boolean).map(x => String(x).toLowerCase()); }
const nameOf = reg => { try { return (JSON.parse(reg.data).people[0] || {}).name || ''; } catch { return ''; } };
// In the subject of every letter TP sends the organizers about a registration once the 活动专属邮箱 is bound: the 报名编号
// and a tag only they see (HMAC of the code), so an answer to it can go back to that registrant and nothing else can.
async function relayKey(env, code) { return env.REG_PASS_SECRET ? (await hmac(env.REG_PASS_SECRET, 'relay:' + code)).slice(0, 10) : ''; }
const tagOf = (code, k) => `[回信 ${code} #${k}]`;
function cleanSubject(s, ev) {
  let x = String(s || ''); const tg = evTag(ev).trim(); if (tg) x = x.split(tg).join(' ');   // the event's [北京] in organizers' subjects
  return x.replace(/\[TEST → [^\]]*\]\s*/g, '').replace(/\[(回信 [A-Z0-9]+-\d{4}(?: #[0-9a-f]+)?|副本(?: #[0-9a-f]+)?|来信|测试|实习)\]\s*/g, '').replace(/^((re|回复|答复|fw|fwd|转发)\s*[:：]\s*)+/i, '').trim();
}
// files that fit in one letter; the rest are named in the text
function filesOut(parsed) {
  const keep = [], left = []; let size = 0;
  for (const f of parsed.files) { if (keep.length < MAX_FILES_OUT && size + f.bytes.length <= MAX_BYTES_OUT) { keep.push(f); size += f.bytes.length; } else left.push(f.name); }
  return { keep, note: left.length ? `\n（附件太大或太多，没有转：${left.join('、')}。请直接向对方要。）` : '' };
}
// Returns false when the address is not a 活动专属邮箱 (the caller then handles it as before).
export async function regInbound(message, env, kit) {
  const to = String(message.to || '').trim().toLowerCase();
  let row;
  try { row = await env.SDB.prepare("SELECT event FROM reg_setting WHERE key='event_mail' AND value=?").bind(to).first(); } catch (e) { if (noTable(e)) return false; throw e; }
  const ev = row && await getEvent(env, row.event); if (!ev) return false;
  const M = await import('./inmail.js'), h = message.headers;
  const subject = M.decodeWords(h.get('subject') || '').trim();
  const bind = /\[TP-BIND ([0-9a-f]{32})\]/.exec(subject);
  if (bind) { await bindOk(env, ev, to, bind[1]); return true; }
  const drop = why => { console.log('tp inbound dropped: ' + why); return true; };
  if (h.get('x-tp-relay')) return drop('our own relay');
  if (!M.authPassed(h)) return drop('not authenticated');
  if (M.isAuto(h, subject)) return drop('automatic reply');
  const from = addrOf(h.get('from')) || String(message.from || '').toLowerCase();
  const t = await mailTo(env, ev.id, ev), orgs = { [t.chief]: 'chief', [t.copy]: 'copy', [t.admin]: 'admin' };
  delete orgs['']; const role = Object.hasOwn(orgs, from) ? orgs[from] : '';
  const code = (new RegExp(ev.prefix + 'P?-\\d{4}').exec(subject) || [])[0];   // a practice number too (实习, P)
  const reg = code ? await env.SDB.prepare('SELECT * FROM reg WHERE event=? AND code=?').bind(ev.id, code).first() : null;
  const k = reg ? await relayKey(env, reg.code) : '', keyed = !!k && subject.includes('#' + k);
  let mine = reg && emailsOf(reg).includes(from) ? reg : null;
  if (!mine && !role) mine = await env.SDB.prepare("SELECT * FROM reg WHERE event=? AND (email=? OR instr(lower(data),?)>0) ORDER BY (status='cancelled'), id DESC LIMIT 1").bind(ev.id, from, '"email":"' + from + '"').first();
  // test stage: the registrant's letters land in the test inbox, so a reply from there to one of them stands for that registrant
  const testReply = !t.live && !t.practice && reg && from === String(env.REG_TEST_INBOX || 'selecttango@gmail.com').toLowerCase() && /\[TEST → [^\]]+\]/.test(subject) && !keyed;
  if (message.rawSize > 25 * 1024 * 1024) {
    const x = { addr: t.admin, who: 'admin' }, d = route(t, x);
    await kit.deliver(env, d.to, d.pre + '[来信太大] ' + subject, `${from} 寄到 ${to} 的信超过 25MB，没有转寄。请直接联系寄件人。`, undefined, { 'X-TP-Relay': 'big' }, { fromName: '探戈通 Tango Pass', replyTo: from }).catch(() => {});
    return true;
  }
  const buf = new Uint8Array(await new Response(message.raw).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const parsed = M.parseMime(bin), plain = parsed.texts.find(x => x.type === 'text/plain'), htm = parsed.texts.find(x => x.type === 'text/html');
  const body = (plain ? plain.text : htm ? M.htmlText(htm.text) : '').trim(), files = filesOut(parsed);
  const relay = async (x, subj, text, opt) => { const d = route(t, x); await kit.deliver(env, d.to, d.pre + subj, text, undefined, { 'X-TP-Relay': opt.kind }, { fromName: opt.fromName, replyTo: opt.replyTo, attachments: files.keep }); };
  if (role && keyed) {
    // an organizer answers a letter TP sent them: to the registrant in the event's name; the others get a copy
    const subj = 'Re: ' + cleanSubject(subject, ev).replace(new RegExp('\\s*·?\\s*' + reg.code + '\\s*'), ' ').trim() + ' · ' + reg.code;
    const d = toRegistrant(env, t, reg.email);
    try { await kit.deliver(env, d.to, d.pre + subj, body, undefined, { 'X-TP-Relay': 'out' }, { fromName: evFrom(ev), replyTo: to, attachments: files.keep }); }
    catch (e) {
      await log(env, reg.id, 'reply_failed:out', String(e && e.message || e));
      const x = { addr: from, who: role }; await relay(x, '探戈通：没寄出 ' + reg.code, `你回给报名者 ${reg.email}（${reg.code}）的信没有寄出，请稍后再回复一次。\n\n原信标题：${subject}`, { kind: 'notice', fromName: '探戈通 Tango Pass', replyTo: replyTo(env) }).catch(() => {});
      return true;
    }
    const head = `副本：${ROLE_ZH[role]}（${from}）以「${ev.name.zh}」的名义回给报名者 ${reg.email}（${reg.code}）的信。报名者看不到寄件人的邮箱。`;
    for (const x of recipients(t, from)) await relay(x, `[副本 #${k}] ` + subj, head + '\n\n' + body + files.note, { kind: 'copy', fromName: evFrom(ev), replyTo: to }).catch(e => console.log('tp relay copy', String(e && e.message || e).slice(0, 120)));
    await log(env, reg.id, 'reply:out', role + (files.keep.length ? ' +' + files.keep.length : ''));
    return true;
  }
  const r = mine || (testReply ? reg : null);
  if (r) {
    // a registrant writes: to the organizers, each their own letter; answering it goes back through this address
    const head = `回信：报名者 ${nameOf(r)}（${r.email}，${r.code}，${STATUS_ZH[r.status] || r.status}）寄到活动专属邮箱 ${to}。` +
      `直接回复这封信，会以「${ev.name.zh}」的名义寄给报名者（报名者看不到你的邮箱），也会寄副本给其他人。` + (files.keep.length ? `附件 ${files.keep.length} 个。` : '');
    const subj = tagOf(r.code, await relayKey(env, r.code)) + ' ' + cleanSubject(subject, ev);
    const done = [];
    for (const x of recipients(t, from)) { try { await relay(x, subj, head + '\n\n' + body + files.note, { kind: 'in', fromName: '报名回信', replyTo: to }); done.push(x.who); } catch (e) { console.log('tp relay in', String(e && e.message || e).slice(0, 120)); } }
    await log(env, r.id, done.length ? 'reply:in' : 'reply_failed:in', done.join(',') + (files.keep.length ? ' +' + files.keep.length : ''));
    return true;
  }
  if (role) {
    // an organizer writing fresh, or with the tag removed: TP cannot tell it is really them, so it goes nowhere
    await relay({ addr: from, who: role }, '探戈通：没寄出', `你寄到 ${to} 的信「${subject || '（无主题）'}」没有寄给报名者：只有直接回复系统转来的信（标题里有报名编号和 #… 记号）才会寄出。请找到那封信按「回复」再写一次。`, { kind: 'notice', fromName: '探戈通 Tango Pass', replyTo: replyTo(env) }).catch(() => {});
    return true;
  }
  // someone who is not a registrant: to the 管理员 only, who can answer them directly
  await relay({ addr: t.admin, who: 'admin' }, '[来信] ' + (subject || '（无主题）'), `来信：${from} 寄到「${ev.name.zh}」的活动专属邮箱 ${to}。寄件人不是这场活动的报名者，只转给管理员。直接回复会寄给寄件人。\n\n` + body + files.note,
    { kind: 'stranger', fromName: '报名来信', replyTo: from }).catch(e => console.log('tp relay stranger', String(e && e.message || e).slice(0, 120)));
  return true;
}

// ---------- public handlers ----------
export async function regLeft(url, env, json) {
  const ev = await getEvent(env, url.searchParams.get('event') || 'bstw2027');
  if (!ev) return json({ error: 'bad_event' }, 400);
  return json({ left: await seatsLeft(env, ev) });
}
export async function regMe(req, env, url, json, kit) {
  const u = await kit.user(req, env); if (!u) return json({ error: 'auth' }, 401);
  const ev = await getEvent(env, url.searchParams.get('event') || 'bstw2027'); if (!ev) return json({ error: 'bad_event' }, 400);
  const email = String(u.email).toLowerCase(), practice = ev.mode === 'practice';
  // 实习 (platform step 5): 「我的实习报名（n/5）」, each with its number, state and entry codes; otherwise the one registration
  const rows = practice ? ((await env.SDB.prepare("SELECT * FROM reg WHERE event=? AND email=? AND stage='practice' ORDER BY id").bind(ev.id, email).all()).results || [])
    : [await env.SDB.prepare('SELECT * FROM reg WHERE event=? AND email=? ORDER BY (status=\'cancelled\'), id DESC LIMIT 1').bind(ev.id, email).first()].filter(Boolean);
  const more = practice ? { practice: { mine: rows.length, max: PRACTICE_MINE } } : {};
  if (!rows.length) return json({ email: u.email, name: u.name, reg: null, ...more, ...(practice ? { regs: [] } : {}) });
  const one = async r => {
    const passes = (await passesOf(env, r)).map(x => ({ name: x.name, items: x.items, pass: x.pass, img: passImg(env, x.pass) }));
    // Payment QR codes only for a confirmed, unpaid registration, and only those the organizer uploaded (never in 实习).
    let pay = [];
    if (r.status === 'confirmed' && env.REG_QR_KEY) {
      const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
      pay = (await payNames(env, r)).map(n => ({ name: n, img: base + '/social/reg/qr/' + encodeURIComponent(n) + '?k=' + encodeURIComponent(env.REG_QR_KEY) }));
    }
    const d = JSON.parse(r.data);
    const rest = r.status === 'confirmed' || r.status === 'cash' ? Math.max(0, r.amount - await paidSum(env, r.id)) : 0;
    return { code: r.code, lang: r.lang, people: r.people, rest, status: r.status, amount: r.amount, fee: r.fee, refund: r.refund, due: r.due_at, domestic: !!r.domestic,
      updated: r.updated_at, lines: detailLines(d, ['en', 'ko', 'es', 'ru', 'zh'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : r.lang, ev), pay, passes };
  };
  if (!practice) return json({ email: u.email, name: u.name, reg: await one(rows[0]) });
  const regs = []; for (const r of rows) regs.push(await one(r));
  return json({ email: u.email, name: u.name, reg: regs[regs.length - 1], regs, ...more });
}
export async function regSubmit(req, env, b, json, kit) {
  const u = await kit.user(req, env);
  if (!u) return json({ error: 'need_subscribe' }, 401);
  const email = String(u.email || '').toLowerCase();
  if (!EMAIL_STRICT.test(email)) return json({ error: 'need_email_subscribe' }, 403);
  if (b && b.website) return json({ ok: true });   // honeypot
  const r = evaluate(b, env, Date.now(), await getEvent(env, b && b.event));
  if (r.error) return json(r, 400);
  // 实习: only with the 实习报名链接's code; without it the page says 「即将开放」 (《TP 实习方案（v2）》)
  const stage = regStage(r.ev);
  let pr = null;
  if (b && b.practice && stage !== 'practice') return json({ error: 'practice_over' }, 403);   // the 实习 link ends with the 实习
  if (stage === 'practice') {
    pr = practiceOf(await settingsOf(env, r.ev.id));
    if (!pr || String((b && b.practice) || '') !== pr.code) return json({ error: 'not_open', practice: true }, 403);
  }
  const ts = nowIso(), data = JSON.stringify(r.data);
  // 实习: the latest of one's practice registrations, or none when 「再报一笔」 asks for another (up to 5)
  const live = () => stage === 'practice'
    ? (b.another ? Promise.resolve(null) : env.SDB.prepare("SELECT * FROM reg WHERE event=? AND email=? AND stage='practice' ORDER BY id DESC LIMIT 1").bind(r.ev.id, email).first())
    : env.SDB.prepare("SELECT * FROM reg WHERE event=? AND email=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1").bind(r.ev.id, email).first();
  let reg = null, ex = await live();
  if (!ex) {
    reg = await addReg(env, r, u.id, email, data, ts, stage, pr);
    if (reg) await log(env, reg.id, 'submit');
    else if (stage === 'practice') {
      const mine = (await env.SDB.prepare("SELECT COUNT(*) n FROM reg WHERE event=? AND stage='practice' AND (email=? OR user_id=?)").bind(r.ev.id, email, u.id).first()).n;
      return json(mine >= PRACTICE_MINE ? { error: 'practice_mine_full', max: PRACTICE_MINE } : { error: 'practice_full', cap: pr.cap }, 409);
    }
    else if (!(ex = await live())) return json({ error: 'busy' }, 409);
  }
  if (ex) {
    if (ex.status !== 'pending') return json({ error: 'exists', code: ex.code, status: ex.status }, 409);
    // the same form again within two minutes is the same press of the button (or a retry after a lost answer): no second letter
    if (ex.data === data && ex.amount === r.total && Date.parse(ts) - Date.parse(ex.updated_at) < 12e4) {
      const sent = await env.SDB.prepare("SELECT action FROM reg_log WHERE reg_id=? AND action IN ('mail:recv','mail_failed:recv') ORDER BY id DESC LIMIT 1").bind(ex.id).first();
      return json({ ok: true, code: ex.code, total: ex.amount, updated: true, mail: !sent ? undefined : sent.action === 'mail:recv' ? 'sent' : 'failed', promo: r.promo.kind });
    }
    const up = await env.SDB.prepare("UPDATE reg SET lang=?,domestic=?,people=?,data=?,amount=?,hotel_amount=?,promo=?,promo_dj=?,updated_at=? WHERE id=? AND status='pending'")
      .bind(r.lang, r.domestic, r.data.people.length, data, r.total, r.hotel, r.promo.code || null, r.promo.dj || null, ts, ex.id).run();
    reg = await env.SDB.prepare('SELECT * FROM reg WHERE id=?').bind(ex.id).first();
    if (!up.meta.changes) return json({ error: 'exists', code: reg.code, status: reg.status }, 409);   // reviewed while they were editing: what was reviewed stands
    await log(env, reg.id, 'resubmit');
  }
  const mail = await send(env, kit, reg, 'recv');
  await notifyOwner(env, kit, reg);
  return json({ ok: true, code: reg.code, total: reg.amount, updated: !!ex, mail, promo: r.promo.kind });
}
export async function regPassPng(url, env) {
  const p = await readPass(env, decodeURIComponent(url.pathname.split('/').pop() || '').replace(/\.png$/, ''));
  if (!p) return new Response('not found', { status: 404 });
  const reg = await env.SDB.prepare('SELECT event,status,people FROM reg WHERE code=?').bind(p.code).first();
  if (!reg || !PAID.includes(reg.status) || p.idx >= reg.people) return new Response('not found', { status: 404 });
  const { qrPng } = await import('./qrpng.js');
  return new Response(await qrPng(checkinUrl(env, p.pass, await getEvent(env, reg.event)), 8), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400' } });
}
export async function regQr(url, env) {
  const name = decodeURIComponent(url.pathname.split('/').pop() || '');
  if (!env.REG_QR_KEY || url.searchParams.get('k') !== env.REG_QR_KEY) return new Response('not found', { status: 404 });
  const a = await env.SDB.prepare('SELECT mime,data FROM reg_asset WHERE name=?').bind(name).first();
  if (!a) return new Response('not found', { status: 404 });
  const bin = Uint8Array.from(atob(a.data), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': a.mime, 'Cache-Control': 'private, max-age=3600' } });
}

// ---------- organizer ----------
// Registration has its own organizer password (REG_ADMIN_TOKEN) so it can be shared without the site-wide ADMIN_TOKEN.
function adminOK(req, env) {
  const a = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (a.length < 24) return false;
  return (!!env.REG_ADMIN_TOKEN && a === env.REG_ADMIN_TOKEN) || (!!env.ADMIN_TOKEN && a === env.ADMIN_TOKEN);
}
const CSV_COLS = ['code', 'status', 'created', 'email', 'lang', 'person', 'name', 'nick', 'role', 'country', 'city', 'domestic', 'wechat', 'facebook', 'package', 'items', 'person_amount', 'room', 'room_type', 'check_in', 'check_out', 'nights', 'passport_surname', 'passport_given', 'promo', 'promo_dj', 'total', 'fee', 'refund', 'due', 'paid_at', 'note'];
// Text typed by registrants must never run as a formula in Excel: such cells get a leading '. Real numbers stay numbers.
const csvCell = v => { let s = String(v == null ? '' : v); if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const bjTime = iso => iso ? new Date(Date.parse(iso) + 8 * 36e5).toISOString().slice(0, 16).replace('T', ' ') : '';   // exports use Beijing time
// Who is calling. The rules are the first section of docs/tangopass.md (2026-11-23):
//   owner    管理员 (平台管理员 until 2026-11-23): every event, appoints everyone. Where the event says chief:'owner', also that event's 总管
//   chief    总管: one per event
//   deputy   经理 (副总管 until 2026-11-23, same rights): three at most per event
//   manager  the old 现场经理 (money on site, for the code just scanned). Since 2026-11-23 (Shiao) no longer appointed:
//            migration 0025 made every one 经理; only a value from before the rules still lands here
//   desk     前台 (reg_staff): check-in only
// Nobody acts on their own rank or above. reg_admin.perms holds the role; any older value is a site manager.
const RANK = { desk: 0, manager: 1, deputy: 2, chief: 3, owner: 4 };
const LIMIT = { chief: 1, deputy: 3 };
const ALL = ['door', 'undo', 'collect', 'review', 'list', 'cancel', 'refund', 'modify', 'passport', 'export'];
const GRANT = { owner: [...ALL, 'asset'], chief: ALL, deputy: ['door', 'undo', 'collect', 'review', 'list'], manager: ['door', 'undo', 'collect'], desk: ['door'] };
const ACT_NEEDS = { confirm: 'review', waitlist: 'review', decline: 'review', cash: 'review', paid: 'review', pay: 'review', note: 'review', cancel: 'cancel', refund: 'refund', modify: 'modify' };
const roleOf = perms => perms === 'chief' || perms === 'deputy' ? perms : 'manager';
const can = (who, perm) => !!who && GRANT[who.role].includes(perm);
const mayAppoint = (who, role) => RANK[who.role] >= RANK.deputy && RANK[who.role] > RANK[role];
// The caller: the platform admin's long password, or one signed-in phone (dev:<key>, see "sign-in" below).
// { who } when they may go on; { err } is the body of a 401 that tells the page why not (signed out, or password due again).
async function callerOf(req, env, opt) {
  if (adminOK(req, env)) return { who: { name: ownerName(env), role: 'owner' } };
  return deviceWho(req, env, opt);
}
// in this event's role (一人多场): someone with none here, or only 前台, is not let in
async function adminWho(req, env, evId) {
  const c = await callerOf(req, env, { event: evId });
  if (c.err) return c;
  const who = c.who;
  if (!who || who.role === 'desk' || (evId && who.event && who.event !== evId)) return {};
  return c;
}
const ownerName = env => env.REG_OWNER_NAME || '张孝';
// Names are what the records keep, so nobody is added under the platform admin's, and two working people never share one.
const reserved = (env, name) => [ownerName(env), '主办', '组织者'].includes(name);
const NAME_FREE = 'NOT EXISTS (SELECT 1 FROM reg_admin WHERE event=? AND name=? AND disabled_at IS NULL) AND NOT EXISTS (SELECT 1 FROM reg_staff WHERE event=? AND name=? AND disabled_at IS NULL)';
async function nameFree(env, evId, name) { return !!(await env.SDB.prepare('SELECT 1 x WHERE ' + NAME_FREE).bind(evId, name, evId, name).first()); }
function meOf(who, ev) {
  const appoint = ['chief', 'deputy', 'desk'].filter(x => mayAppoint(who, x) && !(x === 'chief' && ev.chief === 'owner'));
  return { name: who.name, role: who.role, seat: who.role === 'owner' && ev.chief === 'owner' ? 'chief' : who.role, perms: GRANT[who.role], appoint };
}
// v = which password or link a screen was showing; a reset or reissue from an older screen loses. Not a secret: a piece of a hash.
const verOf = h => String(h || '').slice(0, 8);
// Deleted people leave their name in the records; someone added later under that name only counts from their own start.
const LIVE_DEVICES = kind => `(SELECT COUNT(*) FROM reg_device d WHERE d.kind='${kind}' AND d.person=x.id AND d.ended_at IS NULL) devices`;
// what the settings page shows about someone's sign-in; never a hash, never the digits
function loginOf(x, role, now = nowIso(), max = DEVICES[role] || 1) {
  const state = x.stopped_at ? 'stopped' : !x.link_hash ? 'none' : x.locked_until && x.locked_until > now ? 'locked' : x.pin_temp ? 'new' : x.devices ? 'on' : 'off';
  return { state, devices: x.devices || 0, max, until: state === 'locked' ? x.locked_until : undefined };
}
async function staffList(env, evId) {
  const rows = (await env.SDB.prepare(`SELECT x.id,x.name,x.created_at,x.activated_at,x.disabled_at,x.link_hash,x.pin_temp,x.locked_until,x.stopped_at,${LIVE_DEVICES('staff')},
    (SELECT COUNT(*) FROM reg_checkin c JOIN reg r ON r.id=c.reg_id WHERE r.event=x.event AND c.staff=x.name AND c.at>=x.created_at) checkins
    FROM reg_staff x WHERE x.event=? ORDER BY x.id`).bind(evId).all()).results || [];
  const per = await personsIn(env, 'staff', await withPersonIds(env, 'staff', evId, rows));
  return rows.map((x, i) => { const { link_hash, pin_temp, locked_until, stopped_at, devices, ...y } = x, q = per[i], src = (q && q.home) || x;
    return { ...y, v: verOf(src.link_hash), login: q && q.home === null ? { state: 'none', devices: 0, max: 1 } : loginOf(src, 'desk', undefined, (q && q.max) || 1), others: q && q.others || undefined }; });
}
async function managerHome(env, ev, who, json) {
  const mine = (await env.SDB.prepare(`SELECT p.id,p.at,p.amount,p.method,r.code,r.data FROM reg_payment p JOIN reg r ON r.id=p.reg_id
    WHERE r.event=? AND p.by_admin=? AND p.amount>0 AND p.at>=? ORDER BY p.id`).bind(ev.id, who.name, who.since).all()).results || [];
  return json({ event: ev.id, me: meOf(who, ev), mine: mine.map(({ data, ...x }) => ({ ...x, name: (JSON.parse(data).people[0] || {}).name || '' })) });
}

// ---------- who did what
// A change and its log line go in one batch (a transaction): the line is written only if the change was made, so the
// first of two simultaneous callers wins and the later one can always be told who that was.
const doLogged = async (env, change, id, action, by, text = '', ...more) => (await env.SDB.batch([
  change,
  env.SDB.prepare('INSERT INTO reg_log(reg_id,at,action,detail) SELECT ?,?,?,? WHERE changes()>0').bind(id, nowIso(), action, JSON.stringify({ by, text: String(text).slice(0, 700) })),
  ...more]))[0].meta.changes > 0;
const HANDLED = ['confirm', 'waitlist', 'decline', 'cash', 'pay', 'refund', 'cancel', 'modify', 'note', 'checkin_undo'];
function readLog(l) {
  const raw = String(l.detail || '');
  try { const d = JSON.parse(raw); if (d && typeof d.by === 'string') return { action: l.action, at: l.at, by: d.by, text: d.text || '' }; } catch { /* a line from before 2026-11-23 */ }
  const m = l.action === 'checkin_undo' ? /^(\S+) by (.*)$/.exec(raw) : /^(.*)\((?:recorded )?by ([^()]*)\)$/.exec(raw);
  return { action: l.action, at: l.at, by: m ? m[2] : '', text: m ? m[1].trim() : raw };
}
async function lastHandled(env, regId, actions = HANDLED.filter(x => x !== 'note' && x !== 'checkin_undo')) {
  const l = await env.SDB.prepare(`SELECT action,at,detail FROM reg_log WHERE reg_id=? AND action IN (${actions.map(() => '?')}) ORDER BY id DESC LIMIT 1`).bind(regId, ...actions).first();
  if (!l) return null;
  const { action, at, by } = readLog(l);   // never the text: it can hold an amount
  return { action, at, by };
}
async function lastPayment(env, regId, who, sign = 1) {
  const p = await env.SDB.prepare(`SELECT at,collector,method,by_admin FROM reg_payment WHERE reg_id=? AND amount${sign > 0 ? '>' : '<'}0 ORDER BY id DESC LIMIT 1`).bind(regId).first();
  if (!p) return null;
  const out = { action: sign > 0 ? 'pay' : 'refund', at: p.at, by: p.by_admin, collector: p.collector };
  return can(who, 'list') ? { ...out, method: p.method } : out;
}
export async function paidSum(env, regId) { const r = await env.SDB.prepare('SELECT COALESCE(SUM(amount),0) s FROM reg_payment WHERE reg_id=?').bind(regId).first(); return Number(r && r.s || 0); }
async function moneyOf(env, regId) {
  const r = (await env.SDB.prepare('SELECT COUNT(*) n,COALESCE(SUM(amount),0) s,COALESCE(SUM(CASE WHEN amount<0 THEN -amount ELSE 0 END),0) o FROM reg_payment WHERE reg_id=?').bind(regId).first()) || {};
  return { n: Number(r.n || 0), sum: Number(r.s || 0), out: Number(r.o || 0) };
}
export async function regAdmin(req, env, url, b, json, kit) {
  const p = url.pathname.slice('/social/admin/reg'.length);
  const evId = String((b && b.event) || url.searchParams.get('event') || 'bstw2027');
  const ev = (await getEvent(env, evId)) || null;
  if (!ev) return json({ error: 'bad_event' }, 400);
  const caller = await adminWho(req, env, ev.id);
  if (caller.err) return json(caller.err, 401);
  const who = caller.who;
  if (!who) return json({ error: 'auth' }, 401);
  const deny = () => json({ error: 'no_permission' }, 403);
  // 任免 (总管 and 经理), and a 总管's refunds and exports, carry the password again in that same request.
  // The platform admin keeps the long password and is not asked (Shiao, 2026-11-23).
  const stepUp = async () => {
    if (who.role === 'owner') return null;
    if (!b || b.pin == null || b.pin === '') return json({ error: 'pin_needed' }, 401);
    const r = await checkPin(env, who.kind, who.id, b.pin);
    if (!r.ok) return pinRefused(r, json);
    await env.SDB.prepare('UPDATE reg_device SET auth_at=? WHERE id=? AND ended_at IS NULL').bind(nowIso(), who.dev).run();
    return null;
  };
  if (p === '/me' && req.method === 'GET') return json({ ok: true, ...meOf(who, ev), event_info: evInfo(ev), ...(await switchList(env, who)) });
  const csv = (body, name) => new Response('\ufeff' + body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${ev.id}-${name}.csv"`, 'Cache-Control': 'no-store' } });
  if (p === '/export' && req.method === 'POST') {
    if (!can(who, 'export')) return deny();
    const no = await stepUp(); if (no) return no;
    return b.what === 'payments' ? csv(await paymentsCsv(env, ev), 'payments') : csv(await regsCsv(env, ev), 'registrations');
  }
  if (p === '' && req.method === 'GET') {
    if (!can(who, 'list')) return url.searchParams.get('format') ? deny() : managerHome(env, ev, who, json);
    if (url.searchParams.get('format') === 'csv') {
      if (!can(who, 'export')) return deny();
      if (who.role !== 'owner') return json({ error: 'pin_needed' }, 401);   // the page uses POST /export with the password
      return csv(await regsCsv(env, ev), 'registrations');
    }
    const rows = ((await env.SDB.prepare('SELECT * FROM reg WHERE event=? ORDER BY id').bind(ev.id).all()).results || []).map(r => ({ ...r, data: JSON.parse(r.data) }));
    const left = await seatsLeft(env, ev), roles = { leader: 0, follower: 0, both: 0 }, counts = {};
    let overdue = 0; const t = Date.now();
    for (const r of rows) { counts[r.status] = (counts[r.status] || 0) + 1;
      if (SEATED.includes(r.status)) r.data.people.forEach(pp => roles[pp.role]++);
      if (r.status === 'confirmed' && r.due_at && Date.parse(r.due_at) < t) { r.overdue = true; overdue++; } }
    const caps = Object.fromEntries(Object.entries(ev.items).filter(([, it]) => it.cap).map(([c, it]) => [c, it.cap]));
    const checked = {}, inRows = {};
    for (const c of ((await env.SDB.prepare('SELECT c.reg_id,c.person,c.item,c.staff FROM reg_checkin c JOIN reg r ON r.id=c.reg_id WHERE r.event=?').bind(ev.id).all()).results || [])) {
      checked[c.item] = (checked[c.item] || 0) + 1;
      (inRows[c.reg_id] = inRows[c.reg_id] || []).push({ person: c.person, item: c.item, staff: c.staff }); }
    const undone = {}, history = {};
    for (const raw of ((await env.SDB.prepare(`SELECT l.reg_id,l.action,l.at,l.detail FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.event=? AND l.action IN (${HANDLED.map(() => '?')}) ORDER BY l.id`).bind(ev.id, ...HANDLED).all()).results || [])) {
      const l = readLog(raw);
      if (l.action === 'checkin_undo') {
        const m = /^(\d+):(\w+)/.exec(l.text);
        if (m) (undone[raw.reg_id] = undone[raw.reg_id] || []).push({ at: l.at, person: +m[1], item: m[2], by: l.by });
      } else if (l.action !== 'pay' && l.action !== 'refund') (history[raw.reg_id] = history[raw.reg_id] || []).push({ action: l.action, at: l.at, by: l.by }); }   // money is shown from reg_payment
    // letters that did not go out, unless the same kind went out later. Never the error text or the address.
    const unsent = {};
    for (const l of ((await env.SDB.prepare("SELECT l.reg_id,l.action,l.at FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.event=? AND substr(l.action,1,4)='mail' ORDER BY l.id").bind(ev.id).all()).results || [])) {
      const [state, kind] = l.action.split(':'), m = unsent[l.reg_id] = unsent[l.reg_id] || {};
      if (state === 'mail_failed') m[kind] = { action: kind, at: l.at }; else delete m[kind]; }
    rows.forEach(r => { r.mail_failed = Object.values(unsent[r.id] || {}); r.checkins = inRows[r.id] || []; r.undos = undone[r.id] || []; r.log = history[r.id] || [];
      if (!can(who, 'passport')) delete r.data.passports; });   // not sent at all, not just hidden
    const staff = await staffList(env, ev.id);
    const pays = ((await env.SDB.prepare('SELECT p.* FROM reg_payment p JOIN reg r ON r.id=p.reg_id WHERE r.event=? ORDER BY p.id').bind(ev.id).all()).results) || [];
    const byReg = {}, byCollector = {};
    for (const x of pays) { (byReg[x.reg_id] = byReg[x.reg_id] || []).push(x); const c = byCollector[x.collector] = byCollector[x.collector] || { in: 0, out: 0, n: 0 }; if (x.amount >= 0) c.in += x.amount; else c.out -= x.amount; c.n++; }
    rows.forEach(r => { r.payments = byReg[r.id] || []; r.paid_total = r.payments.reduce((s, x) => s + x.amount, 0); });
    const adminRows = (await env.SDB.prepare(`SELECT x.id,x.name,x.perms,x.link_hash,x.pin_temp,x.locked_until,x.stopped_at,x.created_at,x.disabled_at,${LIVE_DEVICES('admin')} FROM reg_admin x WHERE x.event=? ORDER BY x.id`).bind(ev.id).all()).results || [];
    const per = await personsIn(env, 'admin', await withPersonIds(env, 'admin', ev.id, adminRows));
    const admins = adminRows
      .map((x, i) => { const { perms, link_hash, pin_temp, locked_until, stopped_at, devices, ...y } = x, role = roleOf(perms), manage = mayAppoint(who, role), q = per[i], src = (q && q.home) || x;
        const login = q && q.home === null ? { state: 'none', devices: 0, max: DEVICES[role] || 1 } : loginOf(src, role, undefined, (q && q.max) || DEVICES[role] || 1);
        return { ...y, role, manage, v: manage ? verOf(src.link_hash) : undefined, login: manage ? login : undefined, others: manage && q && q.others || undefined }; })
      .sort((x, y) => RANK[y.role] - RANK[x.role] || x.id - y.id);
    // 活动邮箱: the 管理员 changes them, the 总管 sees them, nobody else is sent them
    const mailto = who.role === 'owner' || who.role === 'chief' ? await mailTo(env, ev.id) : undefined;
    return json({ event: ev.id, event_info: evInfo(ev), names: namesFor(ev), ...(await switchList(env, who)), me: meOf(who, ev), chief: ev.chief === 'owner' ? ownerName(env) : '', left, caps, roles, counts, overdue, checked, staff, ledger: byCollector, admins, mailto, rows });
  }
  // 活动邮箱 {chief?, copy?, admin_on?, resend?:'chief'}: only the 管理员 (Shiao, 2026-11-24)
  if (p === '/mailto' && req.method === 'POST') {
    if (who.role !== 'owner') return deny();
    const want = {};
    for (const k of ['copy', 'chief']) {   // the 副本邮箱 first, so an appointment in the same save is told to the new one
      if (!b || b[k] == null) continue;
      const v = str(b[k], 254).toLowerCase();
      if (v && !EMAIL_STRICT.test(v)) return json({ error: 'bad_email', which: k }, 400);
      want[k] = v;
    }
    // 测试名单: addresses whose registration letters go straight to them while testing (comma, space or newline)
    let list = null;
    if (b && b.test_list != null) {
      list = [...new Set((Array.isArray(b.test_list) ? b.test_list : String(b.test_list).split(/[\s,;，；、]+/)).map(x => str(x, 254).toLowerCase()).filter(Boolean))];
      const bad = list.find(x => !EMAIL_STRICT.test(x));
      if (bad) return json({ error: 'bad_email', which: 'test_list', bad }, 400);
      if (list.length > TEST_LIST_MAX) return json({ error: 'too_many', which: 'test_list', max: TEST_LIST_MAX }, 400);
    }
    const cur = await mailTo(env, ev.id), sent = {};
    try {
      if (list && list.join(',') !== cur.test_list.join(',')) { await setSetting(env, ev.id, 'test_list', list.join(','), who.name); sent.test_list = 'saved'; }
      if (b.admin_on != null && !!b.admin_on !== cur.admin_on) await setSetting(env, ev.id, 'admin_copy', b.admin_on ? '1' : '0', who.name);
      for (const k of Object.keys(want)) {
        if (want[k] === cur[k]) continue;
        await setSetting(env, ev.id, k + '_email', want[k], who.name);
        if (!want[k]) { sent[k] = 'cleared'; continue; }
        if (k === 'copy') { const o = copyLetter(ev, 'set'); sent.copy = await tpMail(env, kit, cur, want.copy, o.subject, o.text); }
        else sent.chief = await relinkChief(env, kit, ev, 'relink', true);   // sent | failed | wait (no 总管 yet) | need_reset | changed
      }
      // 重寄任命信: lost, or read in the test inbox before going live
      if (b.resend === 'chief' && !sent.chief) sent.chief = (await relinkChief(env, kit, ev, 'relink', false)) || 'no_mail';
      // 活动专属邮箱: TP adds or removes its Cloudflare rule itself, then a test letter
      if (b.event_mail != null) sent.event_mail = (await setEventMail(env, kit, ev, b.event_mail, who.name)).state;
      if (b.event_mail_test && !sent.event_mail) {
        const s = await settingsOf(env, ev.id);
        sent.event_mail = !s.event_mail ? 'no_mail' : !env.CF_MAIL_TOKEN ? 'cf_not_ready' : await bindTest(env, kit, ev, s.event_mail, who.name);
      }
    } catch (e) { if (noTable(e)) return json({ error: 'not_ready' }, 503); throw e; }
    return json({ ok: true, mailto: await mailTo(env, ev.id), sent });
  }
  if (p === '/payments' && req.method === 'GET') {
    if (!can(who, 'export')) return deny();
    if (who.role !== 'owner') return json({ error: 'pin_needed' }, 401);
    return csv(await paymentsCsv(env, ev), 'payments');
  }
  if (p.startsWith('/admins')) {
    if (RANK[who.role] < RANK.deputy) return deny();
    if (req.method !== 'POST') return json({ error: 'not_found' }, 404);
    const want = b && b.role;
    if (p === '/admins' || p === '/admins/role') {
      if (!['chief', 'deputy'].includes(want)) return json({ error: 'bad_role' }, 400);   // no 现场经理 since 2026-11-23
      if (!mayAppoint(who, want)) return deny();
      if (want === 'chief' && ev.chief === 'owner') return json({ error: 'chief_taken' }, 409);
    }
    // the limit is part of the write itself, so two people appointing at once cannot pass it
    const room = LIMIT[want] ? ' AND (SELECT COUNT(*) FROM reg_admin WHERE event=? AND perms=? AND disabled_at IS NULL)<?' : '';
    const roomArgs = LIMIT[want] ? [ev.id, want, LIMIT[want]] : [];
    const noRoom = () => json({ error: want === 'chief' ? 'chief_taken' : 'deputy_full' }, 409);
    if (p === '/admins') {
      const name = str(b.name, 40); if (!name) return json({ error: 'need_name' }, 400);
      if (reserved(env, name)) return json({ error: 'name_reserved' }, 409);
      const no = await stepUp(); if (no) return no;
      // 一人多场: an email TP already has makes this a role of that person (no new link, no new password)
      const same = await samePerson(env, b.email); if (same.error) return sameRefused(same, json);
      if (same.home) {
        const a = await addRole(env, ev, 'admin', name, want, same, room, roomArgs);
        if (a.error === 'full') return noRoom();
        if (a.error) return json(a, 409);
        // a 总管 still gets the 任命信 at the 总管邮箱: their one link, made new; the password stays theirs
        const letter = want === 'chief' ? await relinkChief(env, kit, ev, 'added', true) : undefined;
        return json({ ok: true, id: a.id, name, role: want, same_person: true, known_as: a.known_as, letter });
      }
      const c = await freshCredentials(env), em = same.email ? [same.email] : [];
      const r = await env.SDB.prepare(`INSERT INTO reg_admin(event,name,pass_hash,perms,created_at,link_hash,pin_hash,pin_salt,pin_temp${em.length ? ',email' : ''}) SELECT ?,?,'-',?,?,?,?,?,1${em.length ? ',?' : ''} WHERE ` + NAME_FREE + room)
        .bind(ev.id, name, want, nowIso(), c.link_hash, c.pin_hash, c.pin_salt, ...em, ev.id, name, ev.id, name, ...roomArgs).run();
      if (!r.meta.changes) return (await nameFree(env, ev.id, name)) ? noRoom() : json({ error: 'name_taken' }, 409);
      const link = personLink(env, c.key, null, ev);
      // a new 总管 gets the 任命信 at the 总管邮箱: the link only, the password is given another way
      const letter = want === 'chief' ? await mailChief(env, kit, ev, name, 'new', c.key, true, true) : undefined;
      return json({ ok: true, id: r.meta.last_row_id, name, role: want, link, pin: c.pin, letter });
    }
    const id = Number(b && b.id) || 0;
    const t = await env.SDB.prepare('SELECT * FROM reg_admin WHERE id=? AND event=?').bind(id, ev.id).first();
    if (!t) return json({ error: 'not_found' }, 404);
    const had = roleOf(t.perms);
    if (!mayAppoint(who, had)) return deny();   // peers, anyone above, and oneself
    const changed = () => json({ error: 'changed' }, 409);
    // 一人多场: the sign-in (link, password, phones) is the person's, kept on the row they signed in with first
    const h = await homeOf(env, 'admin', t), hk = h ? h.kind : 'admin', hid = h ? h.row.id : id;
    if (p === '/admins/role' && had === want && !t.disabled_at) return json({ ok: true, role: want });
    if (p === '/admins/reset' && b.v != null && b.v !== verOf((h ? h.row : t).link_hash)) return changed();
    const no = await stepUp(); if (no) return no;
    // every write repeats what was read, so someone promoted a moment ago is not touched from below;
    // and in the same batch every phone of that person is signed out
    const write = async (change, why) => (await env.SDB.batch([change, endDevices(env, hk, hid, why)]))[0].meta.changes > 0;
    if (p === '/admins/role') {
      if (t.disabled_at) return changed();
      if (await write(env.SDB.prepare('UPDATE reg_admin SET perms=? WHERE id=? AND perms=? AND disabled_at IS NULL' + room).bind(want, id, t.perms, ...roomArgs), 'role'))
        return json({ ok: true, role: want, check: had === 'deputy' && RANK[want] < RANK.deputy,
          letter: want === 'chief' ? await relinkChief(env, kit, ev, 'promoted', true) : undefined,
          mail_cleared: had === 'chief' ? await dropChiefMail(env, ev, who.name) : undefined });
      const now = await env.SDB.prepare('SELECT perms FROM reg_admin WHERE id=? AND disabled_at IS NULL').bind(id).first();
      return now && now.perms === t.perms && room ? noRoom() : changed();
    }
    if (p === '/admins/reset') {
      // a new link and a new temporary password; the old ones and every phone stop at once, and a stop or lock is lifted
      if (h && !outranksAll(who, await withEvents(env, await rolesOf(env, h.kind, h.row)))) return json({ error: 'other_events' }, 403);
      const c = await freshCredentials(env);
      const ok = await write(resetStmt(env, 'admin', t, h, c, ' AND perms=?', [t.perms]), 'reset');
      if (!ok) return changed();
      const link = personLink(env, c.key, null, ev);
      return json({ ok: true, link, pin: c.pin, letter: had === 'chief' ? await mailChief(env, kit, ev, t.name, 'reset', c.key, true, false) : undefined });
    }
    if (p === '/admins/delete') {
      // check: a removed deputy knows the links they handed out, and may have seen temporary passwords
      if (!(await dropRole(env, 'admin', t, ' AND perms=?', [t.perms]))) return changed();
      return json({ ok: true, check: had === 'deputy' && !t.disabled_at, mail_cleared: had === 'chief' ? await dropChiefMail(env, ev, who.name) : undefined });
    }
    return json({ error: 'not_found' }, 404);
  }
  if (p === '/asset' && req.method === 'POST') {
    if (!can(who, 'asset')) return deny();
    const name = str(b.name, 40), mime = str(b.mime, 40), data = String(b.b64 || '').replace(/^data:[^,]+,/, '');
    if (!/^[a-z0-9-]{2,40}$/.test(name) || !/^image\/(png|jpeg|webp|gif)$/.test(mime) || !data || data.length > 1.4e6) return json({ error: 'bad_asset' }, 400);
    const stored = assetName(ev, name);   // this event's own (北京: the name as it is)
    await env.SDB.prepare('INSERT INTO reg_asset(name,mime,data,updated_at) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET mime=excluded.mime,data=excluded.data,updated_at=excluded.updated_at').bind(stored, mime, data, nowIso()).run();
    return json({ ok: true, name: stored });
  }
  if (p === '/act' && req.method === 'POST') {
    const a = String(b.action || '');
    if (can(who, 'list')) {
      if (!Object.hasOwn(ACT_NEEDS, a)) return json({ error: 'bad_action' }, 400);
      if (!can(who, ACT_NEEDS[a])) return deny();
      if (a === 'refund') { const no = await stepUp(); if (no) return no; }
      return regAct(env, b, json, kit, ev, who);
    }
    // A site manager only takes money, for the code just scanned, of someone approved to pay on arrival.
    if (a !== 'pay' || !can(who, 'collect') || !b.p) return deny();
    const x = await passContext(env, b.p);
    if (x.error || x.reg.event !== ev.id || x.reg.id !== Number(b.id)) return deny();
    const pay = b.pay || {};
    return regAct(env, { id: x.reg.id, action: 'pay', pay: { amount: pay.amount, method: pay.method, seen: pay.seen } }, json, kit, ev, who);
  }
  if (p.startsWith('/staff')) {
    if (!mayAppoint(who, 'desk')) return deny();
    const f = { '/staff': staffAdd, '/staff/reset': staffReset, '/staff/delete': staffDelete }[p];
    if (!f || req.method !== 'POST') return json({ error: 'not_found' }, 404);
    if (p === '/staff' && !str(b && b.name, 40)) return json({ error: 'need_name' }, 400);
    const no = await stepUp(); if (no) return no;
    return f(env, ev, b, json, who);
  }
  return json({ error: 'not_found' }, 404);
}
async function regsCsv(env, ev) {
  const rows = ((await env.SDB.prepare('SELECT * FROM reg WHERE event=? ORDER BY id').bind(ev.id).all()).results || []).map(r => ({ ...r, data: JSON.parse(r.data) }));
  const lines = [CSV_COLS.join(',')];
  for (const r of rows) r.data.people.forEach((pp, i) => {
    const ri = r.data.rooms.findIndex(x => x.guests.includes(i)), room = ri >= 0 ? r.data.rooms[ri] : null, pass = r.data.passports[i] || {};
    lines.push([r.code, r.status, bjTime(r.created_at), r.email, r.lang, i + 1, pp.name, pp.nick, pp.role, pp.country, pp.city, pp.country === 'CN' ? 1 : 0, pp.wechat, pp.facebook, pp.pkg, pp.items.join(' '), pp.amount,
      room ? ri + 1 : '', room ? room.type : '', room ? room.ci : '', room ? room.co : '', room ? room.nights : '', pass.s, pass.g, r.promo, r.promo_dj, i ? '' : r.amount, i ? '' : r.fee, i ? '' : r.refund, i ? '' : bjTime(r.due_at), i ? '' : bjTime(r.paid_at), i ? '' : r.note].map(csvCell).join(','));
  });
  return lines.join('\n');
}
async function paymentsCsv(env, ev) {
  const rows = ((await env.SDB.prepare('SELECT p.*,r.code,r.email FROM reg_payment p JOIN reg r ON r.id=p.reg_id WHERE r.event=? ORDER BY p.id').bind(ev.id).all()).results) || [];
  return [['at', 'code', 'email', 'amount', 'method', 'collector', 'recorded_by', 'note'].join(',')].concat(rows.map(x => [bjTime(x.at), x.code, x.email, x.amount, x.method, x.collector, x.by_admin, x.note].map(csvCell).join(','))).join('\n');
}
const NEXT = { confirm: ['pending', 'waitlist'], waitlist: ['pending'], decline: ['pending', 'waitlist'], pay: ['confirmed', 'cash', 'paid'], refund: ['cancelled'], cash: ['confirmed'], cancel: ['pending', 'confirmed', 'waitlist', 'paid', 'cash'], modify: ['pending', 'confirmed', 'waitlist', 'paid', 'cash'], note: null };
const METHODS = ['wechat', 'alipay', 'cash', 'other'];
export async function regAct(env, b, json, kit, ev, who) {
  const reg = await env.SDB.prepare('SELECT * FROM reg WHERE id=? AND event=?').bind(Number(b.id) || 0, ev.id).first();
  if (!reg) return json({ error: 'not_found' }, 404);
  const a = b.action === 'paid' ? 'pay' : String(b.action || '');
  if (!Object.hasOwn(NEXT, a)) return json({ error: 'bad_action' }, 400);
  const db = env.SDB, ts = nowIso(), d = JSON.parse(reg.data);
  const done = (change, text = '', ...more) => doLogged(env, change, reg.id, a, who.name, text, ...more);
  // Someone else got there first: say who, and change nothing.
  const late = async () => {
    const now = await db.prepare('SELECT status FROM reg WHERE id=?').bind(reg.id).first();
    return json({ error: 'bad_state', status: now && now.status, last: await lastHandled(env, reg.id) }, 409);
  };
  if (a === 'note') {
    const text = str(b.note, 2000), cur = reg.note || '';
    const clash = async () => json({ error: 'note_changed', note: ((await db.prepare('SELECT note FROM reg WHERE id=?').bind(reg.id).first()) || {}).note || '', last: await lastHandled(env, reg.id, ['note']) }, 409);
    if (b.was != null && str(b.was, 2000) !== str(cur, 2000)) return clash();
    if (text === cur) return json({ ok: true, note: cur });
    if (!(await done(db.prepare("UPDATE reg SET note=?,updated_at=? WHERE id=? AND COALESCE(note,'')=?").bind(text, ts, reg.id, cur)))) return clash();
    return json({ ok: true, note: text });
  }
  if (a === 'pay') {
    // Record money received. Default: the rest of what is owed. The registration becomes paid once fully covered.
    // Payments are only ever added, so their count tells whether anything was recorded since we looked.
    const pay = b.pay || {}, got = await moneyOf(env, reg.id), rest = reg.amount - got.sum, site = !can(who, 'review');
    const already = async () => json({ error: 'already_paid', last: await lastPayment(env, reg.id, who) }, 409);
    if (rest <= 0 && ['confirmed', 'cash', 'paid'].includes(reg.status)) return already();
    if (site ? reg.status !== 'cash' : !NEXT.pay.includes(reg.status) || (b.from && b.from !== reg.status)) return late();
    if (pay.seen != null && Number(pay.seen) !== rest) return already();
    const amount = pay.amount == null || pay.amount === '' ? rest : Math.round(Number(pay.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > rest) return json({ error: 'bad_amount', rest }, 400);
    const method = METHODS.includes(pay.method) ? pay.method : 'wechat', collector = (!site && str(pay.collector, 40)) || who.name;
    const covered = got.sum + amount >= reg.amount && reg.status !== 'paid';
    // recorded only while nothing else happened to it since it was read: no other payment, same status, same amount.
    // So a cancel at the same moment either comes first (and this is refused) or sees this payment (S09, 2026-11-23).
    const ok = await done(
      db.prepare('INSERT INTO reg_payment(reg_id,at,amount,method,collector,note,by_admin) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM reg_payment WHERE reg_id=?)=? AND EXISTS (SELECT 1 FROM reg WHERE id=? AND status=? AND amount=?)')
        .bind(reg.id, ts, amount, method, collector, str(pay.note, 300) || null, who.name, reg.id, got.n, reg.id, reg.status, reg.amount),
      `${amount} ${method} → ${collector}`,
      covered ? db.prepare("UPDATE reg SET status='paid',paid_at=?,updated_at=? WHERE id=? AND status=? AND changes()>0").bind(ts, ts, reg.id, reg.status)
        : db.prepare('UPDATE reg SET updated_at=? WHERE id=? AND changes()>0').bind(ts, reg.id));
    if (!ok) {
      const now = await db.prepare('SELECT status,amount FROM reg WHERE id=?').bind(reg.id).first();
      return now && (now.status !== reg.status || now.amount !== reg.amount) ? late() : already();
    }
    const after = await db.prepare('SELECT * FROM reg WHERE id=?').bind(reg.id).first(), total = got.sum + amount, left = Math.max(0, after.amount - total);
    let mail;
    if (covered && after.status === 'paid' && (site || b.silent !== 1)) mail = await send(env, kit, after, 'paid');
    return json(site ? { ok: true, status: after.status, rest: left, mail } : { ok: true, status: after.status, amount: after.amount, paid: total, rest: left, mail });
  }
  if ((b.from && b.from !== reg.status) || !NEXT[a].includes(reg.status)) return late();
  if (a === 'refund') {
    // all refunds together never exceed what is due, nor what is still held
    const pay = b.pay || {}, got = await moneyOf(env, reg.id), due = Math.max(0, (reg.refund == null ? 0 : reg.refund) - got.out);
    const already = async () => json({ error: 'already_refunded', due, last: await lastPayment(env, reg.id, who, -1) }, 409);
    if (got.out > 0 && (!due || (pay.seen != null && Number(pay.seen) !== due))) return already();
    const amount = pay.amount == null || pay.amount === '' ? due : Math.round(Number(pay.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > due || amount > got.sum) return json({ error: 'bad_amount', due: Math.min(due, Math.max(0, got.sum)) }, 400);
    const method = METHODS.includes(pay.method) ? pay.method : 'wechat', collector = str(pay.collector, 40) || who.name;
    const ok = await done(
      db.prepare('INSERT INTO reg_payment(reg_id,at,amount,method,collector,note,by_admin) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM reg_payment WHERE reg_id=?)=?')
        .bind(reg.id, ts, -amount, method, collector, str(pay.note, 300) || 'refund', who.name, reg.id, got.n),
      `${amount} ${method} by ${collector}`);
    if (!ok) return already();
    return json({ ok: true, refunded: got.out + amount, due: Math.max(0, due - amount) });
  }
  // The rest change the registration itself, and only from the status it was read in.
  let change;
  let seats = null;   // the seats this change takes, checked inside the write
  if (a === 'confirm') {
    const no = await full(env, ev, d, reg.id, json); if (no) return no;
    const due = new Date(Date.now() + ev.payDays * 864e5).toISOString();
    seats = d;
    change = db.prepare("UPDATE reg SET status='confirmed',confirmed_at=?,due_at=?,reminded_at=NULL,updated_at=? WHERE id=? AND status=?" + ROOM_SQL).bind(ts, due, ts, reg.id, reg.status, ...roomArgs(ev, d, reg.id));
  } else if (a === 'waitlist' || a === 'decline' || a === 'cash') {
    change = db.prepare('UPDATE reg SET status=?,updated_at=? WHERE id=? AND status=?').bind({ waitlist: 'waitlist', decline: 'declined', cash: 'cash' }[a], ts, reg.id, reg.status);
  } else if (a === 'cancel') {
    // Refund only what was paid: everything minus the ¥50 fee (once), minus hotel after the hotel refund date.
    let refund = null;
    const got = await moneyOf(env, reg.id), paid = got.sum, took = reg.status === 'paid' ? Math.max(paid, paid ? 0 : reg.amount) : paid;
    if (took > 0) {
      const afterCutoff = bjDate(ts) > ev.hotelRefundBy;
      refund = Math.max(0, took - ev.fee - (afterCutoff ? reg.hotel_amount : 0));   // the ¥50 fee is kept once, whether or not a change already charged it
    }
    // the refund is worked out from the payments read just now; if one is recorded before this lands, the cancel is refused (S09)
    change = db.prepare("UPDATE reg SET status='cancelled',cancelled_at=?,refund=?,fee=CASE WHEN fee>0 THEN fee ELSE ? END,updated_at=? WHERE id=? AND status=? AND (SELECT COUNT(*) FROM reg_payment WHERE reg_id=?)=?")
      .bind(ts, refund, took > 0 ? ev.fee : 0, ts, reg.id, reg.status, reg.id, got.n);
  } else if (a === 'modify') {
    const r = evaluate({ ...b.data, event: ev.id, lang: reg.lang }, env, Date.parse(reg.created_at), ev);   // promo judged at the original submit time
    if (r.error) return json(r, 400);
    const fee = reg.status === 'pending' ? reg.fee : ev.fee;   // changes after review carry the ¥50 fee, once
    const seated = SEATED.includes(reg.status);
    if (seated) { const no = await full(env, ev, r.data, reg.id, json); if (no) return no; seats = r.data; }
    change = db.prepare('UPDATE reg SET data=?,people=?,domestic=?,amount=?,hotel_amount=?,fee=?,promo=?,promo_dj=?,updated_at=? WHERE id=? AND status=? AND data=?' + (seated ? ROOM_SQL : ''))
      .bind(JSON.stringify(r.data), r.data.people.length, r.domestic, r.total + fee, r.hotel, fee, r.promo.code || null, r.promo.dj || null, ts, reg.id, reg.status, reg.data, ...(seated ? roomArgs(ev, r.data, reg.id) : []));
  }
  if (!(await done(change, b.note ? str(b.note, 500) : ''))) {   // and no letter from the one who was late
    // still as read: then what stopped it was the seats, taken a moment ago by someone else
    const now = await db.prepare('SELECT status,data FROM reg WHERE id=?').bind(reg.id).first();
    if (seats && now && now.status === reg.status && now.data === reg.data) { const no = await full(env, ev, seats, reg.id, json); if (no) return no; }
    return late();
  }
  const after = await db.prepare('SELECT * FROM reg WHERE id=?').bind(reg.id).first();
  const mail = b.silent !== 1 ? await send(env, kit, after, a) : undefined;
  return json({ ok: true, status: after.status, amount: after.amount, refund: after.refund, due: after.due_at, mail });
}

// Day-10 reminder for confirmed registrations that are still unpaid. Called from the 10-minute cron.
export async function regRemind(env, kit) {
  const out = { sent: 0 };
  for (const ev of await listEvents(env)) {
    const cutoff = new Date(Date.now() - ev.remindDay * 864e5).toISOString();
    const rows = (await env.SDB.prepare("SELECT * FROM reg WHERE event=? AND status='confirmed' AND reminded_at IS NULL AND confirmed_at<=? LIMIT 20").bind(ev.id, cutoff).all()).results || [];
    for (const r of rows) {
      // timers can overlap: only the run that claims a registration writes to them, and not if it was paid meanwhile
      const claim = await env.SDB.prepare("UPDATE reg SET reminded_at=? WHERE id=? AND reminded_at IS NULL AND status='confirmed'").bind(nowIso(), r.id).run();
      if (!claim.meta.changes) continue;
      await send(env, kit, r, 'remind'); out.sent++;
    }
  }
  return out;
}

// ---------- sign-in (TP step 2, docs/tangopass.md, 2026-11-23) ----------
// Everyone below the platform admin: a personal link (its QR holds no password) + a six-digit password, both needed.
// Each phone that signs in gets its own key (dev:…); the server keeps only hashes, and a row per phone so it can say why it was signed out.
const rndHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha256(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join(''); }
const bearer = req => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
// m: only in the link mailed to the 总管邮箱, so opening that one verifies the address
const personLink = (env, key, m, ev) => siteBase(env) + '/tp/in/?event=' + encodeURIComponent((ev || BSTW()).id) + (m ? '&m=' + m : '') + '#' + key;
const TABLE = { admin: 'reg_admin', staff: 'reg_staff' };
const DEVICES = { chief: 2, deputy: 2, manager: 1, desk: 1 };   // over the limit, the phone that signed in first is signed out
const LOCK_AT = 5, STOP_AT = 10, LOCK_MS = 15 * 60e3, AGAIN_MS = 12 * 3600e3;
const roleOfRow = (kind, row) => kind === 'staff' ? 'desk' : roleOf(row.perms);
// Six digits have only a million values, so a plain hash would give them away: an HMAC whose key is only in the Worker's secrets.
let pepper = null, pepperOf = '';
async function pinHash(env, salt, pin) {
  if (!env.REG_PIN_PEPPER) throw new Error('REG_PIN_PEPPER is not set');
  if (pepperOf !== env.REG_PIN_PEPPER) { pepper = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.REG_PIN_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); pepperOf = env.REG_PIN_PEPPER; }
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', pepper, new TextEncoder().encode(salt + ':' + pin)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
// Too simple (Shiao, 2026-11-23): one digit, runs up or down, repeats, about twenty common ones, the temporary one. Birthdays are not checked.
const COMMON_PINS = new Set(['520520', '521521', '520521', '521520', '520131', '131420', '147258', '258369', '147369', '159753', '159357', '753951', '951753', '123321', '321123', '147852', '963852', '789456', '456123', '123654', '135790', '246810', '135246', '102030']);
export function pinWeak(p, temp) {
  p = String(p == null ? '' : p);
  if (!/^\d{6}$/.test(p)) return 'format';
  if (temp && p === String(temp)) return 'temp';
  const d = [...p].map(Number), step = d[1] - d[0];
  if (d.every(x => x === d[0])) return 'same';
  if ((step === 1 || step === -1) && d.every((x, i) => !i || x - d[i - 1] === step)) return 'run';
  if (p.slice(0, 2).repeat(3) === p || p.slice(0, 3).repeat(2) === p || (p[0] === p[1] && p[2] === p[3] && p[4] === p[5])) return 'repeat';
  if (COMMON_PINS.has(p)) return 'common';
  return '';
}
function tempPin() { for (;;) { const p = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0'); if (!pinWeak(p)) return p; } }
async function freshCredentials(env) {
  const key = rndHex(24), pin = tempPin(), salt = rndHex(16);
  return { key, pin, link_hash: await sha256(key), pin_hash: await pinHash(env, salt, pin), pin_salt: salt };
}
// 现场经理: once a day, the day changing at 06:00 Beijing so a milonga past midnight goes on (Shiao, 2026-11-23)
function workdayStart(t) { const bj = new Date(t + 8 * 36e5), d = Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate(), 6) - 8 * 36e5; return t >= d ? d : d - 864e5; }
function due(role, authAt, t = Date.now()) {
  const a = Date.parse(authAt) || 0;
  if (role === 'chief' || role === 'deputy') return t - a > AGAIN_MS;
  if (role === 'manager') return a < workdayStart(t);
  return false;   // 前台: once, when the phone is set up
}
const over = (role, ev, t = Date.now()) => role === 'desk' && !!ev && !!ev.deskEnds && t >= Date.parse(ev.deskEnds);
const endDevices = (env, kind, id, why) => env.SDB.prepare('UPDATE reg_device SET ended_at=?,why=? WHERE kind=? AND person=? AND ended_at IS NULL AND changes()>0').bind(nowIso(), why, kind, id);
// over a smaller limit, the phones that signed in first are signed out (only if the change it follows was made: guard)
const trimDevices = (env, kind, id, max, why, guard, args = []) => env.SDB.prepare(`UPDATE reg_device SET ended_at=?,why=? WHERE kind=? AND person=? AND ended_at IS NULL AND ${guard} AND id NOT IN (SELECT id FROM reg_device WHERE kind=? AND person=? AND ended_at IS NULL ORDER BY id DESC LIMIT ?)`)
  .bind(nowIso(), why, kind, id, ...args, kind, id, max);

// ---------- one person, several events (platform stage 2, spec v0.6 「一人多场」, 2026-11-25) ----------
// One link and one password, whatever events someone works in. Their first role (the "home" row, as before) keeps the
// sign-in: link, password, tries, lock, phones. A role in another event points to it (person_id 'admin:12' / 'staff:7')
// and has no sign-in of its own; it is made by giving, at the appointment, an email that person already has with TP.
// A request acts in the role of the event it names; a phone naming none (the check-in page) in the current event.
// Before migration 0028 there is no person_id: everyone has one role, exactly as before.
const pkey = (kind, id) => kind + ':' + id;
const pkeyOf = s => { const m = /^(admin|staff):(\d+)$/.exec(String(s || '')); return m ? { kind: m[1], id: +m[2] } : null; };
const noColumn = e => /no such column|has no column named/i.test(String(e && e.message));   // reading / writing a column a migration adds
// every role of the person whose sign-in row this is: that row first, then the others in the order they were given
async function rolesOf(env, kind, home) {
  const out = [{ kind, row: home }];
  try {
    for (const k of ['admin', 'staff'])
      for (const row of (await env.SDB.prepare(`SELECT * FROM ${TABLE[k]} WHERE person_id=? AND disabled_at IS NULL ORDER BY id`).bind(pkey(kind, home.id)).all()).results || []) out.push({ kind: k, row });
  } catch (e) { if (!noColumn(e)) throw e; }
  return out;
}
// unknown: keep a role whose event is not (or no longer) set up, as a phone always was: signed in, but every event's
// pages and passes refuse it. Signing in with the link needs a real event (as before).
async function withEvents(env, roles, unknown = false) {
  const out = [];
  for (const r of roles) {
    const ev = (await getEvent(env, r.row.event)) || (unknown ? { id: r.row.event, name: { zh: r.row.event }, unknown: true } : null);
    if (ev) out.push({ ...r, ev, role: roleOfRow(r.kind, r.row) });
  }
  return out;
}
// the sign-in row behind a role: the row itself, or the role that person signed in with first
async function homeOf(env, kind, row) {
  const h = pkeyOf(row.person_id); if (!h) return { kind, row };
  const home = await env.SDB.prepare(`SELECT * FROM ${TABLE[h.kind]} WHERE id=? AND disabled_at IS NULL`).bind(h.id).first();
  return home && !home.person_id ? { kind: h.kind, row: home } : null;
}
// The current event: the soonest one not over yet (the events are not at the same time, Shiao 2026-11-24); all over, the last.
// An event's days (Beijing dates, both ends counted). Shiao 2026-11-25: one person never works two events at the same time.
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// a real calendar day (2027-13-01 or 2027-02-30 are not)
const realDay = v => DAY.test(String(v || '')) && (t => !isNaN(t) && new Date(t).toISOString().slice(0, 10) === v)(Date.parse(v + 'T00:00:00Z'));
function evDays(ev) {
  const from = ev && ev.starts, to = ev && (ev.ends || ev.starts);
  return realDay(from) && realDay(to) && from <= to ? { from, to } : null;
}
// what the shared /tp/ pages show of an event: name, short name, days, color, when 前台 sign-ins end
const PALETTE = ['#1f5fa8', '#1f7a3a', '#7a3fa0', '#b8660a', '#0f7c80', '#a0335a'];
const evShort = ev => (ev && ev.short && (ev.short.zh || ev.short)) || (ev && ev.name && ev.name.zh) || '';
const evTag = ev => evShort(ev) ? '[' + evShort(ev) + '] ' : '';
function evColor(ev) {
  if (ev && /^#[0-9a-f]{6}$/i.test(String(ev.color || ''))) return ev.color;
  let h = 0; for (const c of String((ev && ev.id) || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
// the zh names of an event's items (in its order) and packages, for the shared 管理页; 北京: the names its letters use
function namesFor(ev) {
  const N = (ev.names && (ev.names.zh || ev.names.en)) || NAMES.zh, order = (ev.itemOrder || []).filter(c => own(ev.items, c));
  for (const c of Object.keys(ev.items || {})) if (!order.includes(c)) order.push(c);
  return { items: order.map(c => [c, N[c] || c]), pkgs: Object.fromEntries(Object.keys(ev.pkgs || {}).map(k => [k, N[k] || k])) };
}
const evInfo = ev => { const d = evDays(ev) || {}; return { id: ev.id, name: ev.name.zh, name_en: ev.name.en, short: evShort(ev), starts: d.from, ends: d.to, color: evColor(ev), desk_ends: ev.deskEnds, mode: ev.mode || undefined }; };
const evEnds = ev => Date.parse((ev && ev.deskEnds) || '') || (evDays(ev) ? Date.parse(evDays(ev).to + 'T23:59:59+08:00') : 0) || Infinity;
function pickRole(list, evId) {
  if (evId) return list.find(r => r.ev.id === evId) || null;
  const t = Date.now(), open = list.filter(r => evEnds(r.ev) > t);
  return (open.length ? [...open].sort((a, b) => evEnds(a.ev) - evEnds(b.ev)) : [...list].sort((a, b) => evEnds(b.ev) - evEnds(a.ev)))[0] || null;
}
const devicesFor = list => Math.max(1, ...list.map(r => DEVICES[r.role] || 1));
const rolesShown = list => list.length > 1 ? list.map(r => ({ event: r.ev.id, event_name: r.ev.name.zh, role: r.role, name: r.row.name })) : undefined;
// the person behind a signed-in phone, with every role they hold
async function devicePerson(req, env) {
  const m = /^dev:([0-9a-f]{64})$/.exec(bearer(req)); if (!m) return {};
  let d;
  try { d = await env.SDB.prepare('SELECT * FROM reg_device WHERE token_hash=?').bind(await sha256(m[1])).first(); }
  catch (e) { if (/no such table/i.test(String(e && e.message))) return {}; throw e; }
  if (!d) return {};
  if (d.ended_at) return { err: { error: 'signed_out', why: d.why, at: d.ended_at } };
  const home = await env.SDB.prepare(`SELECT * FROM ${TABLE[d.kind]} WHERE id=?`).bind(d.person).first();
  if (!home || home.disabled_at || home.person_id) return { err: { error: 'signed_out', why: 'deleted' } };
  if (home.stopped_at) return { err: { error: 'signed_out', why: 'stopped', at: home.stopped_at } };
  return { p: { d, kind: d.kind, home, roles: await withEvents(env, await rolesOf(env, d.kind, home), true) } };
}
// that person in one event's role. { none } when they have none there.
function roleWho(p, { again = false, event } = {}) {
  const r = pickRole(p.roles, event); if (!r) return { none: true };
  if (over(r.role, r.ev)) return { err: { error: 'signed_out', why: 'ended', at: r.ev.deskEnds } };
  const who = { kind: p.kind, id: p.home.id, event: r.ev.id, name: r.row.name, since: r.row.created_at, role: r.role, dev: p.d.id, auth_at: p.d.auth_at, person: p };
  if (!again && due(r.role, p.d.auth_at)) return { err: { error: 'reauth', role: r.role, at: p.d.auth_at }, who };
  return { who };
}
async function deviceWho(req, env, opt = {}) {
  const c = await devicePerson(req, env);
  return c.p ? roleWho(c.p, opt) : c;
}
// a pass of another event than the one the phone works in: the same person may work there too
function whoAt(who, evId) {
  if (!who || !who.event || who.event === evId) return { who };
  return who.person ? roleWho(who.person, { event: evId }) : { none: true };
}
// The email given at an appointment (may be left out). One TP already has for someone working in an event (given at
// their appointment, or the 总管邮箱 of the event where they are 总管) makes the new role that same person's:
// no new link, no new password. { email?, home? } | { error }
async function samePerson(env, raw) {
  if (raw == null || raw === '') return {};
  const email = str(raw, 254).toLowerCase();
  if (!EMAIL_STRICT.test(email)) return { error: 'bad_email' };
  let hit = null;
  try {
    for (const k of ['admin', 'staff']) {
      const row = hit ? null : await env.SDB.prepare(`SELECT * FROM ${TABLE[k]} WHERE email=? AND disabled_at IS NULL ORDER BY id LIMIT 1`).bind(email).first();
      if (row) hit = { kind: k, row };
    }
  } catch (e) { if (noColumn(e)) return { error: 'not_ready' }; throw e; }
  if (!hit) {
    let evs = [];
    try { evs = (await env.SDB.prepare("SELECT event FROM reg_setting WHERE key='chief_email' AND value=? ORDER BY updated_at").bind(email).all()).results || []; }
    catch (e) { if (!noTable(e)) throw e; }
    for (const { event } of evs) {
      const row = hit ? null : await env.SDB.prepare("SELECT * FROM reg_admin WHERE event=? AND perms='chief' AND disabled_at IS NULL ORDER BY id LIMIT 1").bind(event).first();
      if (row) hit = { kind: 'admin', row };
    }
  }
  if (!hit) return { email };
  const home = await homeOf(env, hit.kind, hit.row);
  return home ? { email, home } : { error: 'changed' };
}
const sameRefused = (s, json) => json({ error: s.error }, s.error === 'bad_email' ? 400 : s.error === 'not_ready' ? 503 : 409);
// one role per person per event
async function roleHere(env, evId, h) {
  const K = pkey(h.kind, h.row.id);
  for (const k of ['admin', 'staff']) {
    const r = await env.SDB.prepare(`SELECT id,name FROM ${TABLE[k]} WHERE event=? AND disabled_at IS NULL AND (person_id=? OR (?=? AND id=?)) LIMIT 1`).bind(evId, K, k, h.kind, h.row.id).first();
    if (r) return r;
  }
  return null;
}
// A role for someone TP already knows: in one write, so the name, the limit, "one role here" and their sign-in row
// are all as they were checked. { id, known_as } | { error: already_here | name_taken | full | changed }
async function addRole(env, ev, kind, name, perms, same, room = '', roomArgs = []) {
  const h = same.home, K = pkey(h.kind, h.row.id), here = await roleHere(env, ev.id, h);
  if (here) return { error: 'already_here', name: here.name };
  const clash = sameTime(ev, await withEvents(env, await rolesOf(env, h.kind, h.row)));
  if (clash) return clash;
  const [cols, vals, args] = kind === 'admin'
    ? ['event,name,pass_hash,perms,created_at,person_id,email', "?,?,'-',?,?,?,?", [ev.id, name, perms, nowIso(), K, same.email]]
    : ['event,name,created_at,person_id,email', '?,?,?,?,?', [ev.id, name, nowIso(), K, same.email]];
  const r = await env.SDB.prepare(`INSERT INTO ${TABLE[kind]}(${cols}) SELECT ${vals} WHERE ${NAME_FREE}${room}
      AND EXISTS (SELECT 1 FROM ${TABLE[h.kind]} WHERE id=? AND person_id IS NULL AND disabled_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM reg_admin WHERE event=? AND disabled_at IS NULL AND (person_id=? OR (?='admin' AND id=?)))
      AND NOT EXISTS (SELECT 1 FROM reg_staff WHERE event=? AND disabled_at IS NULL AND (person_id=? OR (?='staff' AND id=?)))`)
    .bind(...args, ev.id, name, ev.id, name, ...roomArgs, h.row.id, ev.id, K, h.kind, h.row.id, ev.id, K, h.kind, h.row.id).run();
  if (r.meta.changes) return { id: r.meta.last_row_id, known_as: h.row.name };
  const again = await roleHere(env, ev.id, h);
  return again ? { error: 'already_here', name: again.name } : !(await nameFree(env, ev.id, name)) ? { error: 'name_taken' } : room ? { error: 'full' } : { error: 'changed' };
}
// Not at the same time (Shiao 2026-11-25): the new event's days must not touch any day of the person's other events.
// An event whose days are not set cannot be checked, so it is refused too (the days come from its ATM card).
function sameTime(ev, list) {
  const mine = evDays(ev);
  if (!mine) return { error: 'no_dates', event_name: ev.name.zh };
  for (const r of list) {
    if (r.ev.id === ev.id) continue;
    const d = evDays(r.ev);
    if (!d) return { error: 'no_dates', event_name: r.ev.name.zh };
    if (mine.from <= d.to && d.from <= mine.to) return { error: 'same_time', event_name: r.ev.name.zh, starts: d.from, ends: d.to };
  }
  return null;
}
// 「重设」 is the person's: one link and one password for every event they work in. Someone who works in other events
// too is reset only by whoever is above them in each of those (the 管理员 always is).
function outranksAll(who, list) {
  if (who.role === 'owner') return true;
  const mine = (who.person && who.person.roles) || [];
  return list.every(r => { const m = mine.find(x => x.ev.id === r.ev.id); return !!m && mayAppoint({ role: m.role }, r.role); });
}
// New credentials on the person's sign-in row, from a role row t that was read as it is (guard: what else must still hold).
function resetStmt(env, kind, t, h, c, guard, args) {
  if (t.person_id && !h) return env.SDB.prepare(`UPDATE ${TABLE[kind]} SET person_id=NULL,link_hash=?,pin_hash=?,pin_salt=?,pin_temp=1,fails=0,locked_until=NULL,stopped_at=NULL WHERE id=? AND person_id=? AND disabled_at IS NULL${guard}`)
    .bind(c.link_hash, c.pin_hash, c.pin_salt, t.id, t.person_id, ...args);
  if (!t.person_id) return env.SDB.prepare(`UPDATE ${TABLE[kind]} SET link_hash=?,pin_hash=?,pin_salt=?,pin_temp=1,fails=0,locked_until=NULL,stopped_at=NULL WHERE id=?${guard} AND COALESCE(link_hash,'')=? AND disabled_at IS NULL`)
    .bind(c.link_hash, c.pin_hash, c.pin_salt, t.id, ...args, t.link_hash || '');
  return env.SDB.prepare(`UPDATE ${TABLE[h.kind]} SET link_hash=?,pin_hash=?,pin_salt=?,pin_temp=1,fails=0,locked_until=NULL,stopped_at=NULL WHERE id=? AND COALESCE(link_hash,'')=? AND disabled_at IS NULL AND person_id IS NULL
      AND EXISTS (SELECT 1 FROM ${TABLE[kind]} WHERE id=? AND person_id=? AND disabled_at IS NULL${guard})`)
    .bind(c.link_hash, c.pin_hash, c.pin_salt, h.row.id, h.row.link_hash || '', t.id, t.person_id, ...args);
}
// Deleting a role is final (no history, no undo; what they did stays under their name). Someone who still works in
// other events keeps their link, password and phones: if this role held the sign-in, it moves to their next role
// (搬家, nobody signs in again). Their phones over the smaller limit, if any, are signed out. The last role gone, all go.
async function dropRole(env, kind, t, guard, args) {
  const T = TABLE[kind];
  if (t.person_id) {
    const h = await homeOf(env, kind, t);
    const del = env.SDB.prepare(`DELETE FROM ${T} WHERE id=? AND person_id=?${guard}`).bind(t.id, t.person_id, ...args);
    if (!h) return (await del.run()).meta.changes > 0;
    const rest = (await withEvents(env, await rolesOf(env, h.kind, h.row))).filter(r => !(r.kind === kind && r.row.id === t.id));
    return (await env.SDB.batch([del, trimDevices(env, h.kind, h.row.id, devicesFor(rest), 'role', 'changes()>0')]))[0].meta.changes > 0;
  }
  const rest = (await rolesOf(env, kind, t)).slice(1)
    .sort((a, b) => String(a.row.created_at).localeCompare(String(b.row.created_at)) || a.row.id - b.row.id);
  if (!rest.length) return (await env.SDB.batch([env.SDB.prepare(`DELETE FROM ${T} WHERE id=?${guard}`).bind(t.id, ...args), endDevices(env, kind, t.id, 'deleted')]))[0].meta.changes > 0;
  const n = rest[0], nT = TABLE[n.kind], K = pkey(kind, t.id), N = pkey(n.kind, n.row.id);
  // the sign-in as it was read moves; changed meanwhile (a try, a reset), nothing happens and the caller is told
  const del = env.SDB.prepare(`DELETE FROM ${T} WHERE id=?${guard} AND person_id IS NULL AND link_hash IS ? AND pin_hash IS ? AND pin_salt IS ? AND pin_temp=? AND fails=? AND locked_until IS ? AND stopped_at IS ?`)
    .bind(t.id, ...args, t.link_hash, t.pin_hash, t.pin_salt, t.pin_temp, t.fails, t.locked_until, t.stopped_at);
  const moved = `NOT EXISTS (SELECT 1 FROM ${T} WHERE id=?) AND EXISTS (SELECT 1 FROM ${nT} WHERE id=? AND person_id IS NULL)`;
  const max = devicesFor(await withEvents(env, rest));
  const out = await env.SDB.batch([
    del,
    env.SDB.prepare(`UPDATE ${nT} SET person_id=NULL,link_hash=?,pin_hash=?,pin_salt=?,pin_temp=?,fails=?,locked_until=?,stopped_at=? WHERE id=? AND person_id=? AND changes()>0`)
      .bind(t.link_hash, t.pin_hash, t.pin_salt, t.pin_temp, t.fails, t.locked_until, t.stopped_at, n.row.id, K),
    env.SDB.prepare(`UPDATE reg_admin SET person_id=? WHERE person_id=? AND ${moved}`).bind(N, K, t.id, n.row.id),
    env.SDB.prepare(`UPDATE reg_staff SET person_id=? WHERE person_id=? AND ${moved}`).bind(N, K, t.id, n.row.id),
    env.SDB.prepare(`UPDATE reg_device SET kind=?,person=? WHERE kind=? AND person=? AND ended_at IS NULL AND ${moved}`).bind(n.kind, n.row.id, kind, t.id, t.id, n.row.id),
    trimDevices(env, n.kind, n.row.id, max, 'role', moved, [t.id, n.row.id])]);
  return out[0].meta.changes > 0;
}
// 一人多场 on the settings page: a role of someone who signs in with another shows that sign-in (their link, password
// state, phones and limit), and each person how many other events they work in. Nothing changes before migration 0028.
async function personsIn(env, kind, rows) {
  let att = [];
  try {
    for (const k of ['admin', 'staff'])
      for (const r of (await env.SDB.prepare(`SELECT id,event,person_id${k === 'admin' ? ',perms' : ''} FROM ${TABLE[k]} WHERE person_id IS NOT NULL AND disabled_at IS NULL`).all()).results || []) att.push({ kind: k, ...r });
  } catch (e) { if (noColumn(e)) return rows.map(() => null); throw e; }
  if (!att.length) return rows.map(() => null);
  const by = {}; for (const a of att) (by[a.person_id] = by[a.person_id] || []).push(a);
  const want = { admin: new Set(), staff: new Set() };
  for (const k of Object.keys(by)) { const h = pkeyOf(k); if (h) want[h.kind].add(h.id); }
  const homes = {};
  for (const k of ['admin', 'staff']) for (let ids = [...want[k]], i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50);
    for (const x of (await env.SDB.prepare(`SELECT x.id,x.event,${k === 'admin' ? 'x.perms' : "'' perms"},x.link_hash,x.pin_temp,x.locked_until,x.stopped_at,${LIVE_DEVICES(k)} FROM ${TABLE[k]} x WHERE x.id IN (${part.map(() => '?')}) AND x.disabled_at IS NULL AND x.person_id IS NULL`).bind(...part).all()).results || []) homes[pkey(k, x.id)] = { kind: k, ...x };
  }
  return rows.map(x => {
    const own = x.person_id || pkey(kind, x.id), home = homes[own], more = by[own];
    if (!more) return null;                        // one role only: shown as before
    if (!home) return { home: null, others: 0 };   // its sign-in row is gone: a reset gives it one
    const all = [home, ...more];
    return { home: x.person_id ? home : undefined, others: all.length - 1, max: Math.max(...all.map(r => DEVICES[roleOfRow(r.kind, r)] || 1)) };
  });
}
// person_id of one event's rows, when there is such a column (migration 0028)
async function withPersonIds(env, kind, evId, rows) {
  if (!rows.length) return rows;
  let m;
  try { m = new Map(((await env.SDB.prepare(`SELECT id,person_id FROM ${TABLE[kind]} WHERE event=? AND person_id IS NOT NULL`).bind(evId).all()).results || []).map(r => [r.id, r.person_id])); }
  catch (e) { if (noColumn(e)) return rows; throw e; }
  return rows.map(x => m.has(x.id) ? { ...x, person_id: m.get(x.id) } : x);
}
// One try. It is counted before the digits are compared, so tries sent together cannot get round the lock.
async function checkPin(env, kind, id, pin, linkHash) {
  const T = TABLE[kind], now = nowIso(), until = new Date(Date.now() + LOCK_MS).toISOString(), byLink = linkHash ? ' AND link_hash=?' : '';
  const claim = await env.SDB.prepare(`UPDATE ${T} SET fails=fails+1,
      locked_until=CASE WHEN fails+1=${LOCK_AT} THEN ? ELSE locked_until END,
      stopped_at=CASE WHEN fails+1>=${STOP_AT} THEN ? ELSE stopped_at END
    WHERE id=? AND stopped_at IS NULL AND disabled_at IS NULL AND pin_hash IS NOT NULL AND (locked_until IS NULL OR locked_until<=?)${byLink}`)
    .bind(until, now, id, now, ...(linkHash ? [linkHash] : [])).run();
  const row = await env.SDB.prepare(`SELECT * FROM ${T} WHERE id=?`).bind(id).first();
  if (!row || row.disabled_at || (linkHash && row.link_hash !== linkHash)) return { error: 'not_found' };
  if (!claim.meta.changes) return row.stopped_at ? { error: 'stopped' } : row.locked_until && row.locked_until > now ? { error: 'locked', until: row.locked_until } : { error: 'not_found' };
  if (/^\d{6}$/.test(String(pin == null ? '' : pin)) && await pinHash(env, row.pin_salt, String(pin)) === row.pin_hash) {
    // right: the count starts again, and a lock or stop that this very try set is lifted
    await env.SDB.prepare('UPDATE ' + T + ' SET fails=0,locked_until=CASE WHEN locked_until=? THEN NULL ELSE locked_until END,stopped_at=CASE WHEN stopped_at=? THEN NULL ELSE stopped_at END WHERE id=? AND pin_hash=?')
      .bind(until, now, id, row.pin_hash).run();
    return { ok: true, row };
  }
  if (row.stopped_at) return { error: 'stopped' };
  if (row.locked_until && row.locked_until > now) return { error: 'locked', until: row.locked_until };
  const f = row.fails;
  return { error: 'wrong_pin', left: f < LOCK_AT ? LOCK_AT - f : STOP_AT - f, then: f < LOCK_AT ? 'lock' : 'stop' };
}
function pinRefused(r, json) { return json(r, { wrong_pin: 401, locked: 423, stopped: 403, not_found: 404 }[r.error] || 409); }
async function byLink(env, key) {
  if (!/^[0-9a-f]{48}$/.test(String(key || ''))) return null;
  const h = await sha256(String(key));
  for (const kind of ['admin', 'staff']) {
    const row = await env.SDB.prepare(`SELECT * FROM ${TABLE[kind]} WHERE link_hash=? AND disabled_at IS NULL`).bind(h).first();
    if (row && !row.person_id) return { kind, row };   // only a sign-in row has a link
  }
  return null;
}
export async function regLogin(req, env, url, b, json) {
  const p = url.pathname.slice('/social/reg/login'.length);
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404);
  if (!env.REG_PIN_PEPPER) return json({ error: 'not_ready' }, 503);
  if (p === '/again' || p === '/out') {
    const c = await deviceWho(req, env, { again: true });
    if (!c.who) return json(c.err || { error: 'auth' }, 401);
    if (p === '/out') { await env.SDB.prepare("UPDATE reg_device SET ended_at=?,why='logout' WHERE id=? AND ended_at IS NULL").bind(nowIso(), c.who.dev).run(); return json({ ok: true }); }
    const r = await checkPin(env, c.who.kind, c.who.id, b && b.pin);
    if (!r.ok) return pinRefused(r, json);
    await env.SDB.prepare('UPDATE reg_device SET auth_at=? WHERE id=? AND ended_at IS NULL').bind(nowIso(), c.who.dev).run();
    return json({ ok: true });
  }
  const found = await byLink(env, b && b.key);
  const list = found ? await withEvents(env, await rolesOf(env, found.kind, found.row)) : [];
  // 一人多场: the role in the event the page names, else the current one; roles lists them all when there are several
  const at = (b && typeof b.event === 'string' && pickRole(list, b.event)) || pickRole(list);
  if (!at) return json({ error: 'not_found' }, 404);   // reset, deleted, or never was
  const { kind, row } = found, { role, ev } = at;
  const base = { name: at.row.name, role, event: ev.id, event_name: ev.name.zh, devices: devicesFor(list), roles: rolesShown(list) };
  if (p === '/hello') {   // opening the link shows whose it is (Shiao, 2026-11-23); nothing else without the password
    const now = nowIso(), state = over(role, ev) ? 'ended' : row.stopped_at ? 'stopped' : row.locked_until && row.locked_until > now ? 'locked' : !row.pin_hash ? 'none' : row.pin_temp ? 'new' : 'ok';
    const mail_ok = b.m ? await mailOk(env, list, b.m) : undefined;
    // a new link (重寄任命信) opened on a phone already signed in as the same person: no need to sign out first
    const c = bearer(req).startsWith('dev:') ? await deviceWho(req, env, { again: true }) : {};
    const same = c.who && c.who.kind === kind && c.who.id === row.id ? true : undefined;
    return json({ ok: true, ...base, state, until: state === 'locked' ? row.locked_until : state === 'ended' ? ev.deskEnds : undefined, mail_ok, same });
  }
  if (p !== '') return json({ error: 'not_found' }, 404);
  if (over(role, ev)) return json({ error: 'ended', until: ev.deskEnds }, 403);
  const want = b.new_pin == null || b.new_pin === '' ? null : String(b.new_pin);
  // a too-simple new password is refused before the temporary one is spent on a try
  if (want != null && row.pin_temp) { const w = pinWeak(want, b.pin); if (w) return json({ error: 'too_simple', why: w }, 400); }
  const r = await checkPin(env, kind, row.id, b.pin, row.link_hash);
  if (!r.ok) return pinRefused(r, json);
  const cur = r.row;
  if (cur.pin_temp) {
    if (want == null) return json({ ok: false, need_new: true, ...base });
    const salt = rndHex(16);
    const u = await env.SDB.prepare(`UPDATE ${TABLE[kind]} SET pin_hash=?,pin_salt=?,pin_temp=0 WHERE id=? AND pin_hash=? AND pin_temp=1`).bind(await pinHash(env, salt, want), salt, cur.id, cur.pin_hash).run();
    if (!u.meta.changes) return json({ error: 'changed' }, 409);
  }
  // this phone in and, over the limit, the earliest out: one batch, so two phones signing in together still keep the limit
  const tok = rndHex(32), now = nowIso();
  const out = await env.SDB.batch([
    env.SDB.prepare(`INSERT INTO reg_device(kind,person,event,token_hash,created_at,auth_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM ${TABLE[kind]} WHERE id=? AND link_hash=? AND stopped_at IS NULL AND disabled_at IS NULL)`)
      .bind(kind, cur.id, ev.id, await sha256(tok), now, now, cur.id, cur.link_hash),
    env.SDB.prepare("UPDATE reg_device SET ended_at=?,why='replaced' WHERE kind=? AND person=? AND ended_at IS NULL AND changes()>0 AND id NOT IN (SELECT id FROM reg_device WHERE kind=? AND person=? AND ended_at IS NULL ORDER BY id DESC LIMIT ?)")
      .bind(now, kind, cur.id, kind, cur.id, base.devices)]);
  if (!out[0].meta.changes) return json({ error: 'changed' }, 409);
  return json({ ok: true, ...base, token: 'dev:' + tok, home: role === 'desk' ? 'checkin' : 'admin', until: role === 'desk' ? ev.deskEnds : undefined, replaced: out[1].meta.changes || 0 });
}

// ---------- door check-in ----------
// Who may scan: a signed-in phone of this event (前台 included), or the platform admin.
// evId: the event the page works in (platform step 3); without one, the current event, as before
async function doorWho(req, env, evId) {
  const c = await callerOf(req, env, evId ? { event: evId } : undefined);
  return c.who && !c.err ? { who: c.who } : c;
}
// The events someone may switch between on the shared /tp/ pages, and the current one: the 管理员 every event,
// anyone else the events where they have a role (一人多场), soonest first.
async function switchList(env, who) {
  const list = who.role === 'owner' ? (await listEvents(env)).map(ev => ({ ev, role: 'owner' })) : ((who.person && who.person.roles) || []).filter(r => !r.ev.unknown);
  const cur = pickRole(list);
  const events = list.map(r => ({ ...evInfo(r.ev), role: r.role })).sort((a, b) => String(a.starts || '9999').localeCompare(String(b.starts || '9999')) || a.id.localeCompare(b.id));
  return { events, current: cur ? cur.ev.id : undefined };
}
// a pass of another event than the page's: refused, saying whose it is (the pass itself is signed, so this tells nothing new)
async function otherEvent(env, evId, json) { const e = await getEvent(env, evId); return json({ error: 'other_event', event: evId, event_name: e ? e.name.zh : evId }, 409); }
async function staffAdd(env, ev, b, json) {
  const name = str(b && b.name, 40); if (!name) return json({ error: 'need_name' }, 400);
  if (reserved(env, name)) return json({ error: 'name_reserved' }, 409);
  // 一人多场: an email TP already has makes this a role of that person (no new link, no new password)
  const same = await samePerson(env, b && b.email); if (same.error) return sameRefused(same, json);
  if (same.home) {
    const a = await addRole(env, ev, 'staff', name, null, same);
    return a.error ? json(a, 409) : json({ ok: true, id: a.id, name, same_person: true, known_as: a.known_as });
  }
  const c = await freshCredentials(env), em = same.email ? [same.email] : [];
  const r = await env.SDB.prepare(`INSERT INTO reg_staff(event,name,created_at,link_hash,pin_hash,pin_salt,pin_temp${em.length ? ',email' : ''}) SELECT ?,?,?,?,?,?,1${em.length ? ',?' : ''} WHERE ` + NAME_FREE)
    .bind(ev.id, name, nowIso(), c.link_hash, c.pin_hash, c.pin_salt, ...em, ev.id, name, ev.id, name).run();
  if (!r.meta.changes) return json({ error: 'name_taken' }, 409);
  return json({ ok: true, id: r.meta.last_row_id, name, link: personLink(env, c.key, null, ev), pin: c.pin });
}
// 「重设」: a new link and a new temporary password; the old ones and the phone stop at once. Of two resets at once, one wins.
// They are the person's (一人多场): someone working in other events too is reset by whoever is above them in each.
async function staffReset(env, ev, b, json, who) {
  const st = await env.SDB.prepare('SELECT * FROM reg_staff WHERE id=? AND event=? AND disabled_at IS NULL').bind(Number(b && b.id) || 0, ev.id).first(); if (!st) return json({ error: 'not_found' }, 404);
  const h = await homeOf(env, 'staff', st);
  if (b.v != null && b.v !== verOf((h ? h.row : st).link_hash)) return json({ error: 'changed' }, 409);
  if (h && !outranksAll(who, await withEvents(env, await rolesOf(env, h.kind, h.row)))) return json({ error: 'other_events' }, 403);
  const c = await freshCredentials(env);
  const out = await env.SDB.batch([resetStmt(env, 'staff', st, h, c, '', []), endDevices(env, h ? h.kind : 'staff', h ? h.row.id : st.id, 'reset')]);
  if (!out[0].meta.changes) return json({ error: 'changed' }, 409);
  return json({ ok: true, id: st.id, name: st.name, link: personLink(env, c.key, null, ev), pin: c.pin });
}
// Deleting is final: no history and no undo. What they checked in stays, under their name.
// 一人多场: someone who still works in other events keeps their sign-in there (see dropRole).
async function staffDelete(env, ev, b, json) {
  const id = Number(b && b.id) || 0;
  const st = await env.SDB.prepare('SELECT * FROM reg_staff WHERE id=? AND event=?').bind(id, ev.id).first();
  if (!st) return json({ error: 'not_found' }, 404);
  if (await dropRole(env, 'staff', st, ' AND event=?', [ev.id])) return json({ ok: true });
  return (await env.SDB.prepare('SELECT 1 x FROM reg_staff WHERE id=?').bind(id).first()) ? json({ error: 'changed' }, 409) : json({ error: 'not_found' }, 404);
}
export async function regDoor(req, env, url, b, json) {
  const p = url.pathname.slice('/social/reg/door'.length);
  if (p === '/activate') return json({ error: 'gone' }, 410);   // the one-time front-desk links ended 2026-11-23: personal link + password now
  // the shared check-in page names its event (?event=): then only that one counts
  const asked = str((b && b.event) || url.searchParams.get('event'), 40) || undefined;
  if (asked && !(await getEvent(env, asked))) return json({ error: 'bad_event' }, 400);
  const c = await doorWho(req, env, asked);
  if (c.err) return json(c.err, 401);
  if (c.none) return json({ error: 'no_role', event: asked }, 403);
  const who = c.who; if (!who) return json({ error: 'auth' }, 401);
  const ev = await getEvent(env, who.event || asked);
  if (p === '/me' && req.method === 'GET') return json({ ok: true, name: who.name, role: who.role, admin: who.role !== 'desk', collect: can(who, 'collect'), until: who.role === 'desk' && ev ? ev.deskEnds : undefined,
    event: ev ? ev.id : undefined, event_info: ev ? evInfo(ev) : undefined, names: ev ? namesFor(ev) : undefined, ...(await switchList(env, who)) });
  if (p === '/pass' && req.method === 'GET') return regPassInfo(env, url.searchParams.get('p'), json, who, asked);
  if (p === '/checkin' && req.method === 'POST') return regCheckin(env, b, json, who, asked);
  return json({ error: 'not_found' }, 404);
}

async function passContext(env, raw) {
  const p = await readPass(env, raw); if (!p) return { error: 'bad_pass' };
  const reg = await env.SDB.prepare('SELECT * FROM reg WHERE code=?').bind(p.code).first();
  if (!reg) return { error: 'bad_pass' };
  const d = JSON.parse(reg.data), person = d.people[p.idx]; if (!person) return { error: 'bad_pass' };
  return { p, reg, d, person };
}
export async function regPassInfo(env, raw, json, who, asked) {
  const x = await passContext(env, raw); if (x.error) return json(x, 404);
  if (asked && x.reg.event !== asked) return otherEvent(env, x.reg.event, json);
  const w = asked ? { who } : whoAt(who, x.reg.event); if (w.err) return json(w.err, 401); who = w.who;
  if (w.none || (who && who.event && who.event !== x.reg.event)) return json({ error: 'bad_pass' }, 404);
  const ins = ((await env.SDB.prepare('SELECT item,at,staff FROM reg_checkin WHERE reg_id=? AND person=?').bind(x.reg.id, x.p.idx).all()).results) || [];
  // Amounts: whoever may collect, and a site manager only the rest to take now (the other payments are not their account).
  let collect;
  if (can(who, 'collect') && PAID.includes(x.reg.status)) {
    const got = await paidSum(env, x.reg.id), due = x.reg.status === 'cash';
    collect = { id: x.reg.id, event: x.reg.event, paid: can(who, 'list') ? got : undefined, rest: due ? Math.max(0, x.reg.amount - got) : 0, last: await lastPayment(env, x.reg.id, who) };
  }
  return json({ ok: true, code: x.reg.code, pass: x.p.pass.split('.')[0], status: x.reg.status, valid: PAID.includes(x.reg.status),
    pay_first: x.reg.status === 'cash', lang: x.reg.lang, people: x.reg.people, collect,
    person: { name: x.person.name, nick: x.person.nick || '', role: x.person.role, country: x.person.country, city: x.person.city, items: x.person.items },
    checkins: ins, note: can(who, 'list') ? x.reg.note || '' : '' });
}
export async function regCheckin(env, b, json, who, asked) {
  const x = await passContext(env, b && b.p); if (x.error) return json(x, 404);
  if (asked && x.reg.event !== asked) return otherEvent(env, x.reg.event, json);
  const w = asked ? { who } : whoAt(who, x.reg.event); if (w.err) return json(w.err, 401); who = w.who;
  if (w.none || (who && who.event && who.event !== x.reg.event)) return json({ error: 'bad_pass' }, 404);
  const item = String(b.item || '');
  if (!PAID.includes(x.reg.status)) return json({ error: 'not_paid', status: x.reg.status }, 409);
  if (!x.person.items.includes(item)) return json({ error: 'not_registered', item }, 409);
  if (b.undo === 1) {   // the front desk only checks in; a wrong tap is undone by someone above, and their name is kept
    if (!can(who, 'undo')) return json({ error: 'manager_only' }, 403);
    const key = x.p.idx + ':' + item, seen = b.at ? String(b.at) : null;   // seen = which check-in the caller's screen showed
    const change = env.SDB.prepare('DELETE FROM reg_checkin WHERE reg_id=? AND person=? AND item=?' + (seen ? ' AND at=?' : '')).bind(x.reg.id, x.p.idx, item, ...(seen ? [seen] : []));
    if (await doLogged(env, change, x.reg.id, 'checkin_undo', who.name, key)) return json({ ok: true, undone: true });
    const again = await env.SDB.prepare('SELECT at,staff FROM reg_checkin WHERE reg_id=? AND person=? AND item=?').bind(x.reg.id, x.p.idx, item).first();
    if (again) return json({ error: 'already_undone', last: { action: 'checkin', at: again.at, by: again.staff || '' } }, 409);   // undone and checked in again since that screen
    const mine = ((await env.SDB.prepare("SELECT action,at,detail FROM reg_log WHERE reg_id=? AND action='checkin_undo' ORDER BY id DESC").bind(x.reg.id).all()).results || []).map(readLog).find(l => l.text.startsWith(key));
    return json({ error: 'already_undone', last: mine ? { at: mine.at, by: mine.by } : null }, 409);
  }
  if (x.reg.status === 'cash') return json({ error: 'pay_first' }, 409);   // pass is out, but entry only after the money is in
  const at = nowIso(), by = who ? who.name : '';
  // INSERT OR IGNORE: two phones scanning the same person at once still give one row, and the slower one sees 'already'.
  const fresh = await doLogged(env, env.SDB.prepare('INSERT OR IGNORE INTO reg_checkin(reg_id,person,item,at,staff) VALUES(?,?,?,?,?)').bind(x.reg.id, x.p.idx, item, at, by),
    x.reg.id, 'checkin', by, x.p.idx + ':' + item);
  if (!fresh) { const had = await env.SDB.prepare('SELECT at,staff FROM reg_checkin WHERE reg_id=? AND person=? AND item=?').bind(x.reg.id, x.p.idx, item).first();
    return json({ error: 'already', at: had && had.at, by: had && had.staff }, 409); }
  return json({ ok: true, at, by });
}

// ---------- 平台管理页 /tp/ (platform step 4; spec v0.6 「平台管理页」「TP 开通流程」「模式」, Shiao 2026-11-25) ----------
// Only the 管理员 (the long password). Every event's seven steps and what comes next, the five checks before 正式,
// events made from an ATM card, 定案 (the form locked for good), 测试 → 正式, 北京 moving in (from then on its mode is
// the platform's, not REG_LIVE's), and the totals across events. The form itself is filled in by Claude until the
// 设定页 of phase 2 (spec v0.6, 时程).
const QR_NAMES = env => [...new Set([env.REG_QR_INTL || 'intl-alipay,intl-wechat', env.REG_QR_CN || 'cn-alipay,cn-wechat'].join(',').split(',').map(x => x.trim()).filter(Boolean))];
async function qrHave(env, ev) {
  const want = QR_NAMES(env).map(n => assetName(ev, n));
  try { return ((await env.SDB.prepare(`SELECT name FROM reg_asset WHERE name IN (${want.map(() => '?')})`).bind(...want).all()).results || []).map(x => x.name); }
  catch (e) { if (noTable(e)) return []; throw e; }
}
// its 活动网页 is up: one look at /event/<slug>/ (a page that is not there answers 404)
async function pageLive(env, ev) {
  if (!ev || !ev.slug) return false;
  try { const r = await fetch(siteBase(env) + '/event/' + ev.slug + '/', { method: 'HEAD', signal: AbortSignal.timeout(6000) }); return r.ok; } catch { return false; }
}
async function eventRow(env, id) {
  try { return await env.SDB.prepare('SELECT * FROM reg_event WHERE id=?').bind(id).first(); } catch (e) { if (noSuchTable(e)) return null; throw e; }
}
const todayBj = () => new Date(Date.now() + 288e5).toISOString().slice(0, 10);
// the form as the 管理员 reads it: sessions, packages, rules (a friend code is never shown, only how many)
function formOf(env, ev) {
  const n = namesFor(ev);
  let codes = 0; try { codes = Object.keys(ev.codes || JSON.parse(env.REG_CODES || '{}')).length; } catch { codes = 0; }
  return { items: n.items.map(([c, name]) => ({ code: c, name, price: ev.items[c].price, cap: ev.items[c].cap || null })),
    pkgs: Object.entries(ev.pkgs || {}).map(([k, x]) => ({ key: k, name: n.pkgs[k], price: x.price, covers: x.covers || [] })),
    rules: { fee: ev.fee || 0, payDays: ev.payDays, remindDay: ev.remindDay, maxPeople: ev.maxPeople, hotel: !!ev.rooms,
      earlyEnd: ev.earlyEnd ? new Date(ev.earlyEnd).toISOString() : undefined, earlyPrice: ev.earlyPrice, friendPrice: ev.friendPrice, codes } };
}
const STEP_MARK = '①②③④⑤⑥⑦';
async function platformEvent(env, ev) {
  const row = await eventRow(env, ev.id), code = !!own(EVENTS, ev.id), s = await settingsOf(env, ev.id), t = await mailTo(env, ev.id, ev);
  const live = isLive(env, ev), days = evDays(ev), now = nowIso();
  const counts = {}; let people = 0;
  for (const r of (await env.SDB.prepare('SELECT status,COUNT(*) n,SUM(people) p FROM reg WHERE event=? GROUP BY status').bind(ev.id).all()).results || []) { counts[r.status] = r.n; if (SEATED.includes(r.status)) people += r.p || 0; }
  const overdue = (await env.SDB.prepare("SELECT COUNT(*) n FROM reg WHERE event=? AND status='confirmed' AND due_at IS NOT NULL AND due_at<?").bind(ev.id, now).first()).n;
  const unsent = {};   // letters that did not go out, unless the same kind went out later (as on the 管理页)
  for (const l of (await env.SDB.prepare("SELECT l.reg_id,l.action FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.event=? AND substr(l.action,1,4)='mail' ORDER BY l.id").bind(ev.id).all()).results || []) {
    const [state, kind] = l.action.split(':'), m = unsent[l.reg_id] = unsent[l.reg_id] || {};
    if (state === 'mail_failed') m[kind] = 1; else delete m[kind];
  }
  const mailFailed = Object.values(unsent).filter(m => Object.keys(m).length).length;
  const chief = await env.SDB.prepare("SELECT name FROM reg_admin WHERE event=? AND perms='chief' AND disabled_at IS NULL ORDER BY id LIMIT 1").bind(ev.id).first();
  const qr = await qrHave(env, ev), page = await pageLive(env, ev);
  const hasForm = Object.keys(ev.items || {}).length > 0 && Object.keys(ev.pkgs || {}).length > 0;
  const locked = row ? !!row.locked_at : code;   // 北京's form is written in the code (open since 12/1)
  const mode = ev.mode || (live ? 'live' : 'test'), practicing = mode === 'practice', pr = practiceOf(s);
  const practice = !!s.practice_cleared && !practicing, ended = !!days && days.to < todayBj();
  // 实习 and 测试 data waiting to be cleared (before migration 0029 nothing is marked, and there is no 实习)
  const marked = { practice: 0, test: 0 }; let hasStage = true;
  try { for (const x of (await env.SDB.prepare("SELECT stage,COUNT(*) n FROM reg WHERE event=? AND stage IN ('practice','test') GROUP BY stage").bind(ev.id).all()).results || []) marked[x.stage] = x.n; }
  catch (e) { if (!noColumn(e)) throw e; hasStage = false; }
  // 测试 → 实习 needs ①–④ (spec v0.6: a step only after the ones before it)
  const practiceGate = [
    { key: 'page', ok: page, text: '活动网页已上线' },
    { key: 'form', ok: locked, text: '报名表已定案' },
    { key: 'chief', ok: !!chief && t.verified, text: '总管已验证' },
    { key: 'event_mail', ok: !!t.event_mail_ok, text: '活动专属邮箱已绑定' }];
  const steps = [
    { n: 1, done: true, todo: '' },
    { n: 2, done: page, todo: '活动网页还没上线（/event/' + ev.slug + '/）' },
    { n: 3, done: locked, todo: hasForm ? '报名表还没定案' : '报名表还没填（场次、套餐）' },
    { n: 4, done: !!chief && t.verified && t.event_mail_ok, todo: !chief ? '还没任命总管' : !t.chief ? '总管邮箱还没填' : !t.verified ? '总管邮箱还没验证' : '活动专属邮箱还没绑定' },
    { n: 5, done: practice, todo: practicing ? '实习中（练完按「结束实习并清空」）' : !row && code ? '按「搬进平台」（1225 实测算作实习）' : '还没实习（①到④完成后，在设定里按「切到实习」）' },
    { n: 6, done: live, todo: '还没切正式' },
    { n: 7, done: ended, todo: '活动结束后自动完成' }];
  const first = steps.find(x => !x.done && x.n < 7);
  const gate = [
    { key: 'page', ok: page, text: '活动网页已上线' },
    { key: 'form', ok: locked, text: '报名表已定案' },
    { key: 'qr', ok: qr.length > 0, text: '收款码已上传' },
    { key: 'chief', ok: !!chief && t.verified, text: '总管已验证' },
    { key: 'practice', ok: practice && !marked.practice && !marked.test, text: practice && marked.test ? `实习已清空（之后又有 ${marked.test} 笔测试报名，先「清空测试资料」）` : '实习已清空' }];
  return { ...evInfo(ev), card: (row && row.card) || ev.card || '', slug: ev.slug, prefix: ev.prefix, city: ev.city || '',
    mode, mode_from: row && row.mode ? 'platform' : 'REG_LIVE', in_platform: !!row, adoptable: !row && code, status: row ? row.status : 'open',
    locked_at: (row && row.locked_at) || undefined, chief: chief ? { name: chief.name, email: t.chief, verified: t.verified } : null,
    event_mail: t.event_mail ? { addr: t.event_mail, ok: t.event_mail_ok } : null,
    counts: { total: Object.values(counts).reduce((a, x) => a + x, 0), people, ...counts }, overdue, mail_failed: mailFailed, qr,
    page: { url: siteBase(env) + '/event/' + ev.slug + '/', live: page },
    steps: steps.map(x => ({ n: x.n, done: x.done, text: x.done ? '' : x.todo })),
    next: first ? '下一步：' + STEP_MARK[first.n - 1] + ' ' + first.todo : live && !ended ? '报名进行中' : '',
    gate, can_live: !live && !!row && !practicing && gate.every(g => g.ok), form: formOf(env, ev), sign: (ev.letters && ev.letters.zh && ev.letters.zh.sign) || '',
    practice_gate: practiceGate, can_practice: !!row && mode === 'test' && hasStage && practiceGate.every(g => g.ok), has_stage: hasStage, marked,
    practice: practicing && pr ? { code: pr.code, cap: pr.cap, at: pr.at, count: marked.practice, mine: PRACTICE_MINE, link: siteBase(env) + '/event/' + ev.slug + '/register/?practice=' + pr.code } : null,
    can_clear: hasStage && !live && (practicing || marked.practice + marked.test > 0) };
}
// letters TP sent today (Beijing date) about registrations: to registrants, and each copy and notice
async function mailsToday(env) {
  const from = new Date(Date.parse(todayBj() + 'T00:00:00+08:00')).toISOString();
  let n = 0;
  for (const l of (await env.SDB.prepare("SELECT action,detail FROM reg_log WHERE at>=? AND (substr(action,1,5)='mail:' OR substr(action,1,5)='copy:')").bind(from).all()).results || [])
    n += l.action.startsWith('mail:') ? 1 : String(l.detail || '').split(',').filter(Boolean).length;
  return n;
}
// what an event is called and when, from its ATM card (the page reads the card and sends it)
function cardFacts(b) {
  const name = { zh: str(b.name && b.name.zh, 80), en: str(b.name && b.name.en, 120) }, starts = str(b.starts, 10), ends = str(b.ends, 10) || starts;
  return { name: { zh: name.zh || name.en, en: name.en || name.zh }, starts, ends, city: str(b.city, 60) };
}
export async function regPlatform(req, env, url, b, json, kit) {
  const p = url.pathname.slice('/social/admin/tp'.length);
  if (!adminOK(req, env)) return json({ error: bearer(req).startsWith('dev:') ? 'owner_only' : 'auth' }, bearer(req).startsWith('dev:') ? 403 : 401);
  const who = ownerName(env);
  b = b || {};
  if (p === '' && req.method === 'GET') {
    const events = [];
    try { for (const ev of await listEvents(env)) events.push(await platformEvent(env, ev)); }
    catch (e) { if (noTable(e)) return json({ error: 'not_ready' }, 503); throw e; }
    events.sort((x, y) => String(x.starts || '9999').localeCompare(String(y.starts || '9999')) || x.id.localeCompare(y.id));
    const sum = k => events.reduce((a, e) => a + (k === 'pending' ? e.counts.pending || 0 : e[k] || 0), 0);
    return json({ ok: true, owner: who, events, totals: { pending: sum('pending'), overdue: sum('overdue'), mail_failed: sum('mail_failed') }, today: { mails: await mailsToday(env) } });
  }
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404);
  const bad = which => json({ error: 'bad_field', which }, 400);
  // 「从 ATM 卡建立」: ① done, 测试, not open; the form is filled in afterwards
  if (p === '/events') {
    // checked as typed: cutting a long one short would let a wrong one through
    const typed = v => String(v == null ? '' : v).trim();
    const id = typed(b.id).toLowerCase(), slug = typed(b.slug).toLowerCase(), prefix = typed(b.prefix).toUpperCase(), card = typed(b.card);
    const f = cardFacts(b), sign = String(b.sign == null ? '' : b.sign).replace(/\r/g, '').trim().slice(0, 300), short = str(b.short, 12) || f.name.zh;
    if (!/^[a-z0-9]{3,40}$/.test(id)) return bad('id');
    if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(slug)) return bad('slug');
    if (!/^[A-Z0-9]{2,6}$/.test(prefix)) return bad('prefix');
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(card)) return bad('card');
    if (!f.name.zh) return bad('name');
    if (!evDays(f)) return bad('dates');
    const all = await listEvents(env);
    for (const [k, v] of [['id', id], ['slug', slug], ['prefix', prefix], ['card', card]]) if (all.some(e => e[k] === v)) return json({ error: 'taken', which: k }, 409);
    const config = { prefix, name: f.name, short: { zh: short }, starts: f.starts, ends: f.ends, city: f.city, from: f.name.en,
      ...(sign ? { letters: { zh: { sign }, en: { sign } } } : {}), items: {}, pkgs: {} };
    const now = nowIso();
    try { await env.SDB.prepare("INSERT INTO reg_event(id,card,slug,mode,status,config,created_at,updated_at,updated_by) VALUES(?,?,?,'test','prep',?,?,?,?)").bind(id, card, slug, JSON.stringify(config), now, now, who).run(); }
    catch (e) { if (noSuchTable(e)) return json({ error: 'not_ready' }, 503); if (/UNIQUE/i.test(String(e && e.message))) return json({ error: 'taken' }, 409); throw e; }
    return json({ ok: true, id });
  }
  const ev = await getEvent(env, b.event); if (!ev) return json({ error: 'bad_event' }, 400);
  // 北京 moves in as it is: a row with its card and address, its mode as REG_LIVE has it now, the form taken as 定案,
  // and the 1225 test with the real team counted as its practice (spec v0.6). Everything else stays in the code.
  if (p === '/adopt') {
    if (!own(EVENTS, ev.id)) return json({ error: 'not_code_event' }, 409);
    if (await eventRow(env, ev.id)) return json({ error: 'already' }, 409);
    const now = nowIso(), mode = isLive(env, ev) ? 'live' : 'test';
    try { await env.SDB.prepare("INSERT INTO reg_event(id,card,slug,mode,status,config,locked_at,created_at,updated_at,updated_by) VALUES(?,?,?,?,'open','{}',?,?,?,?)").bind(ev.id, ev.card || null, ev.slug, mode, now, now, now, who).run(); }
    catch (e) { if (noSuchTable(e)) return json({ error: 'not_ready' }, 503); if (/UNIQUE/i.test(String(e && e.message))) return json({ error: 'already' }, 409); throw e; }
    await setSetting(env, ev.id, 'practice_cleared', 'migrated|' + now, who);
    return json({ ok: true, mode });
  }
  const row = await eventRow(env, ev.id);
  if (!row) return json({ error: 'not_in_platform' }, 409);
  // name and days again from its ATM card; new days must not put anyone working here at two events at once
  if (p === '/card') {
    const f = cardFacts(b); if (!f.name.zh) return bad('name'); if (!evDays(f)) return bad('dates');
    const was = evDays(ev) || {}, next = { ...ev, starts: f.starts, ends: f.ends };
    if (f.starts !== was.from || f.ends !== was.to) {
      const clash = [];
      for (const k of ['admin', 'staff'])
        for (const r of (await env.SDB.prepare(`SELECT * FROM ${TABLE[k]} WHERE event=? AND disabled_at IS NULL`).bind(ev.id).all()).results || []) {
          const h = await homeOf(env, k, r); if (!h) continue;
          const c = sameTime(next, await withEvents(env, await rolesOf(env, h.kind, h.row)));
          if (c) clash.push({ name: r.name, ...c });
        }
      if (clash.length) return json({ error: 'same_time_people', people: clash }, 409);
    }
    let cfg = {}; try { cfg = JSON.parse(row.config || '{}'); } catch { cfg = {}; }
    cfg = { ...cfg, name: f.name, starts: f.starts, ends: f.ends, ...(f.city ? { city: f.city } : {}) };
    const u = await env.SDB.prepare('UPDATE reg_event SET config=?,updated_at=?,updated_by=? WHERE id=? AND updated_at=?').bind(JSON.stringify(cfg), nowIso(), who, ev.id, row.updated_at).run();
    return u.meta.changes ? json({ ok: true }) : json({ error: 'changed' }, 409);
  }
  // 定案: sessions, prices and packages are locked for good (spec v0.6: what was paid must match the letters)
  if (p === '/lock') {
    if (row.locked_at) return json({ error: 'locked', at: row.locked_at }, 409);
    if (!Object.keys(ev.items || {}).length || !Object.keys(ev.pkgs || {}).length) return json({ error: 'no_form' }, 409);
    if (!(await pageLive(env, ev))) return json({ error: 'no_page' }, 409);
    const at = nowIso(), u = await env.SDB.prepare('UPDATE reg_event SET locked_at=?,updated_at=?,updated_by=? WHERE id=? AND locked_at IS NULL').bind(at, at, who, ev.id).run();
    return u.meta.changes ? json({ ok: true, locked_at: at }) : json({ error: 'changed' }, 409);
  }
  // 测试 → 正式 only, with the five checks; the order is fixed and 正式 never goes back (spec v0.6 「模式」)
  if (p === '/mode' && b.mode === 'practice') {
    if (row.mode === 'practice') return json({ ok: true, mode: 'practice' });
    if (row.mode === 'live') return json({ error: 'live' }, 409);   // 正式期间不开实习
    const pe = await platformEvent(env, ev);
    if (!pe.has_stage) return json({ error: 'not_ready' }, 503);
    if (!pe.practice_gate.every(g => g.ok)) return json({ error: 'not_ready', gate: pe.practice_gate }, 409);
    const code = practiceCode(), cap = Math.min(30, Math.max(5, Number(b.cap) || 10)), at = nowIso();
    const u = await env.SDB.prepare("UPDATE reg_event SET mode='practice',updated_at=?,updated_by=? WHERE id=? AND (mode IS NULL OR mode='test')").bind(at, who, ev.id).run();
    if (!u.meta.changes) return json({ error: 'changed' }, 409);
    await setSetting(env, ev.id, 'practice', `${code}|${cap}|${at}`, who);
    await setSetting(env, ev.id, 'practice_cleared', '', who);   // a new round: ⑤ again only once it is cleared
    const now = await getEvent(env, ev.id), link = siteBase(env) + '/event/' + now.slug + '/register/?practice=' + code;
    return json({ ok: true, mode: 'practice', code, cap, link, letter: await practiceLetter(env, kit, now, link, cap) });
  }
  // the cap in all while practising (5–30)
  if (p === '/practice') {
    const pr = practiceOf(await settingsOf(env, ev.id));
    if (row.mode !== 'practice' || !pr) return json({ error: 'not_practising' }, 409);
    const cap = Math.min(30, Math.max(5, Number(b.cap) || 0));
    if (!Number(b.cap) || cap !== Number(b.cap)) return bad('cap');
    await setSetting(env, ev.id, 'practice', `${pr.code}|${cap}|${pr.at}`, who);
    return json({ ok: true, cap });
  }
  // 「结束实习并清空」 (or 「清空测试资料」): first what goes and who is thanked, then, confirmed, only that
  if (p === '/clear') return clearMarked(env, kit, ev, row, b, json, who);
  if (p === '/mode') {
    if (b.mode !== 'live') return json({ error: 'bad_mode' }, 400);
    if (row.mode === 'live') return json({ ok: true, mode: 'live' });
    if (row.mode === 'practice') return json({ error: 'practising' }, 409);   // clear first: 测试 → 实习 → 清空 → 正式
    const pe = await platformEvent(env, ev);
    if (!pe.gate.every(g => g.ok)) return json({ error: 'not_ready', gate: pe.gate }, 409);
    const at = nowIso(), u = await env.SDB.prepare("UPDATE reg_event SET mode='live',status='open',updated_at=?,updated_by=? WHERE id=? AND (mode IS NULL OR mode='test')").bind(at, who, ev.id).run();
    return u.meta.changes ? json({ ok: true, mode: 'live' }) : json({ error: 'changed' }, 409);
  }
  return json({ error: 'not_found' }, 404);
}

// ---------- 实习 (platform step 5; Drive 《TP 实习方案（v2）》, spec v0.6 「模式」「清空与感谢信」, Shiao 2026-11-24/25) ----------
// 测试 → 实习 → 结束实习并清空 → 正式. The real 总管、经理、前台 practise on the usual pages with practice registrations
// (numbered <prefix>P-0001, at most the cap in all and 5 per person, made only with the 实习报名链接); then the 管理员
// clears them, the helpers are thanked, the organizers get a summary, and the event is back in 测试, ready for 正式.
// The registration page's own practice screens come with the shared registration page (Shiao 2026-11-25).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I
const practiceCode = () => [...crypto.getRandomValues(new Uint8Array(6))].map(x => CODE_CHARS[x % CODE_CHARS.length]).join('');
// addresses that only exist in tests and examples: no thank-you there
const fakeAddr = a => /@(?:example\.(?:com|org|net)|(?:[^@]+\.)?(?:test|invalid|example|localhost))$/i.test(String(a || ''));
const PRACTICE_PLAN = ['1 甲：确认，一次付清，门口签到（经理、前台）', '2 甲带 1 位同行者：确认，付清，两人各自扫码签到（经理、前台）', '3 甲：确认，分两次付（经理）',
  '4 乙：确认后改成到场付款；门口前台扫码被挡，经理扫码收款，再签到（经理、前台）', '5 乙：先候补，再确认（经理）', '6 乙：婉拒（经理）',
  '7 丙：确认，付清，取消，记退款（总管）', '8 丙：回复确认信并附截图（寄到活动专属邮箱）；总管从转来的信回信（总管）', '9 丙只报一个场次：门口扫到没报的场次，被挡下（前台）', '10 备用：自由练习'];
// when 实习 starts: the link and the plan to the organizers (总管邮箱, 副本邮箱, 管理员), marked [实习]
async function practiceLetter(env, kit, ev, link, cap) {
  const t = await mailTo(env, ev.id, ev), name = ev.name.zh;
  const text = `你好：\n\n管理员已把「${name}」切到实习。真的总管、经理、前台用平常的管理页和签到页练习；画面顶上会有黄色横幅，资料在实习结束后清空。\n\n` +
    `实习报名链接（只发给参加实习的人，各用自己的邮箱和手机）：\n${link}\n全场最多 ${cap} 笔，每人最多 ${PRACTICE_MINE} 笔；编号带 P（例如 ${ev.prefix}P-0001）。实习报名不付款，信里不会有真的收款码。\n\n` +
    `建议的 10 笔分配（3 个人：甲、乙、丙）：\n${PRACTICE_PLAN.join('\n')}\n\n各职务练什么：\n` +
    `总管：审核、记收款、批准到场付款、取消与退款、看护照姓名、导出、以活动名义回信、任免经理和前台。\n经理：确认、候补、婉拒、分两次收款、批准到场付款、名单和备注、签到页扫码收款、撤销签到。\n前台：登入签到页、选场次、扫码签到、同一个码扫两次、扫到没付清的、扫到没报的场次。\n\n` +
    `练完由管理员按「结束实习并清空」：实习报名和它们的收款、签到、纪录全部删除，团队帐号、登入的手机和设定都留着；清空后才能切正式。`;
  let n = 0;
  for (const x of recipients(t)) { const d = route(t, x); try { await kit.deliver(env, d.to, d.pre + `实习开始：${name}`, text, undefined, undefined, { fromName: '探戈通 Tango Pass', replyTo: replyFor(env, t) }); n++; } catch (e) { console.log('practice letter', String(e && e.message || e).slice(0, 120)); } }
  return n;
}
// the thank-you after clearing: zh and en, straight to the helper, replies to the event mailbox (spec v0.6)
function thankLetter(env, ev, row, what, codes) {
  const zh = what === 'practice' ? '实习' : '测试', en = what === 'practice' ? 'practice' : 'test', open = row && row.open_at ? bjDate(row.open_at) : '';
  const page = regPage(env, ev), sign = (ev.letters && ev.letters.zh && ev.letters.zh.sign) || evFrom(ev);
  return { subject: `${ev.name.zh}：${zh}完成，谢谢帮忙 · ${what === 'practice' ? 'Practice' : 'Test'} finished, thank you`,
    text: `你好：\n\n「${ev.name.zh}」的${zh}已经完成，谢谢你帮忙！你的${zh}报名（${codes.join('、')}）和入场码已经清空、失效，请不要拿来入场。` +
      (open ? `正式报名 ${open} 开放：${page}` : '正式报名开放时会另外公告。') + `有问题直接回这封信。\n\n` +
      `Hello,\n\nThe ${en} for "${ev.name.en}" is finished. Thank you for helping! Your ${en} registration (${codes.join(', ')}) and its entry codes have been cleared and no longer work: please do not use them at the door. ` +
      (open ? `Registration opens on ${open}: ${page}` : 'We will announce when registration opens.') + ` If you have a question, just reply to this email.\n\n${sign}` };
}
async function clearMarked(env, kit, ev, row, b, json, who) {
  if (row.mode === 'live') return json({ error: 'live' }, 409);
  const what = row.mode === 'practice' ? 'practice' : 'test';
  let regs;
  try { regs = (await env.SDB.prepare("SELECT id,code,email,people,stage FROM reg WHERE event=? AND stage IN ('practice','test') ORDER BY id").bind(ev.id).all()).results || []; }
  catch (e) { if (noColumn(e) || noTable(e)) return json({ error: 'not_ready' }, 503); throw e; }
  const sub = "SELECT id FROM reg WHERE event=? AND stage IN ('practice','test')";
  const n = async sql => (await env.SDB.prepare(sql).bind(ev.id).first()).n;
  const counts = { regs: regs.length, people: regs.reduce((a, r) => a + (r.people || 0), 0),
    payments: await n(`SELECT COUNT(*) n FROM reg_payment WHERE reg_id IN (${sub})`), checkins: await n(`SELECT COUNT(*) n FROM reg_checkin WHERE reg_id IN (${sub})`),
    records: await n(`SELECT COUNT(*) n FROM reg_log WHERE reg_id IN (${sub}) AND substr(action,1,4)<>'mail' AND substr(action,1,4)<>'copy'`),
    mails: await n(`SELECT COUNT(*) n FROM reg_log WHERE reg_id IN (${sub}) AND (substr(action,1,4)='mail' OR substr(action,1,4)='copy')`) };
  // who is thanked: in 实习 everyone who made a practice registration; in 测试 those on the 测试名单 who registered
  const t = await mailTo(env, ev.id, ev), list = new Set(t.test_list), by = new Map();
  for (const r of regs) { const a = String(r.email || '').toLowerCase(); if (!a || (what === 'test' && !list.has(a))) continue; if (!by.has(a)) by.set(a, []); by.get(a).push(r.code); }
  const thank = [...by].filter(([a]) => !fakeAddr(a)).map(([email, codes]) => ({ email, codes })), skipped = [...by.keys()].filter(fakeAddr);
  if (b.confirm !== true) return json({ ok: true, preview: true, what, mode: row.mode, counts, thank, skipped });
  const want = new Set((Array.isArray(b.thank) ? b.thank : []).map(x => String(x).toLowerCase()));
  const out = await env.SDB.batch([
    env.SDB.prepare(`DELETE FROM reg_checkin WHERE reg_id IN (${sub})`).bind(ev.id),
    env.SDB.prepare(`DELETE FROM reg_payment WHERE reg_id IN (${sub})`).bind(ev.id),
    env.SDB.prepare(`DELETE FROM reg_log WHERE reg_id IN (${sub})`).bind(ev.id),
    env.SDB.prepare("DELETE FROM reg WHERE event=? AND stage IN ('practice','test')").bind(ev.id)]);
  const cleared = { regs: out[3].meta.changes, payments: out[1].meta.changes, checkins: out[0].meta.changes, logs: out[2].meta.changes }, at = nowIso();
  if (what === 'practice') {   // back to 测试, ⑤ done, the link gone
    await env.SDB.prepare("UPDATE reg_event SET mode='test',updated_at=?,updated_by=? WHERE id=? AND mode='practice'").bind(at, who, ev.id).run();
    await setSetting(env, ev.id, 'practice', '', who);
    await setSetting(env, ev.id, 'practice_cleared', `${at}|${cleared.regs}`, who);
  }
  let thanked = 0, failed = 0;
  for (const x of thank.filter(x => want.has(x.email))) {
    const l = thankLetter(env, ev, row, what, x.codes);
    try { await kit.deliver(env, x.email, l.subject, l.text, undefined, undefined, { fromName: evFrom(ev), replyTo: replyFor(env, t) }); thanked++; }
    catch (e) { failed++; console.log('thank-you', String(e && e.message || e).slice(0, 120)); }
  }
  const zh = what === 'practice' ? '实习' : '测试';
  const sum = `你好：\n\n管理员（${who}）已清空「${ev.name.zh}」的${zh}资料：${cleared.regs} 笔报名（${counts.people} 人）、${cleared.payments} 笔收款、${cleared.checkins} 次签到、${cleared.logs} 条纪录；` +
    `寄了 ${thanked} 封感谢信${failed ? `（${failed} 封没寄出）` : ''}。活动设定、报名表、收款码、邮箱、团队帐号都留着。` + (what === 'practice' ? '\n\n实习已完成，现在回到测试；五项把关都完成后，管理员就可以切正式。' : '');
  for (const x of recipients(t)) { const d = toOrganizer(t, x.addr); try { await kit.deliver(env, d.to, d.pre + `${zh}资料已清空：${ev.name.zh}`, sum, undefined, undefined, { fromName: '探戈通 Tango Pass', replyTo: replyFor(env, t) }); } catch (e) { console.log('clear summary', String(e && e.message || e).slice(0, 120)); } }
  return json({ ok: true, what, cleared, thanked, failed, mode: what === 'practice' ? 'test' : row.mode });
}
