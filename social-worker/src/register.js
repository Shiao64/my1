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
//   POST /social/admin/reg/act {id, action, from?, note?, was?, pay?, data?, p?, pin?, adjust?, seen?}
//        confirm|waitlist|decline|pay|cash|refund|cancel|modify|adjust|note; from / was / pay.seen / seen = what the caller's screen showed
//        adjust {d: +200 加收 | -200 减收, part: reg|hotel, why (the registrant sees it), note?}: 调整金额, see regAct
//   POST /social/admin/reg/admins[/role|/reset|/delete], /staff[/reset|/delete] {…, pin}   appointments
//   POST /social/admin/reg/export {what: regs|payments, pin}   CSV
//   POST /social/admin/reg/asset {name, mime, b64}         upload a payment QR
//   POST /social/admin/reg/mailto {chief?, copy?, admin_on?, resend?, event_mail?, event_mail_test?, test_list?}  管理员 only: 活动邮箱 ('' clears)
//   Mail to a 活动专属邮箱 (Cloudflare Email Routing → live.js email → regInbound) is relayed: see 「活动专属邮箱」 below
//   Organizer page: /event/beijing-2027-tango-weekend/register/admin/ (static, asks for the token)
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
    refundBy: '2027-06-11', fee: 50, payDays: 14, remindDay: 10, maxPeople: 6,   // refundBy: last day (Beijing) a cancellation gets money back, hotel included (Shiao, 2026-11-26)
    deskEnds: '2027-06-22T22:00:00.000Z'   // 前台 sign-ins end 2027-06-23 06:00 Beijing, after the farewell milonga
  }
};
// looked up by what a visitor typed: 'constructor' and the like are not entries
const own = (o, k) => (Object.hasOwn(o, String(k)) ? o[k] : undefined);
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
  if (c === 'early') return { code: c, kind: at < ev.earlyEnd ? 'early' : 'early_over' };
  const dj = friendCodes(env)[c];
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
const checkinUrl = (env, pass) => String(env.REG_SITE || 'https://tangoweekend.org').replace(/\/$/, '') + '/event/beijing-2027-tango-weekend/register/checkin/?p=' + encodeURIComponent(pass);
const bjDate = iso => new Date(Date.parse(iso) + 8 * 36e5).toISOString().slice(0, 10);   // Beijing date, as on the page
const regPage = env => String(env.REG_SITE || 'https://tangoweekend.org').replace(/\/$/, '') + '/event/beijing-2027-tango-weekend/register/draft/';   // 12/1: move to register/, or keep draft/ redirecting there

function nights(ci, co) { const n = Math.round((Date.parse(co + 'T00:00:00Z') - Date.parse(ci + 'T00:00:00Z')) / 864e5); return n > 0 ? n : 0; }

// Validate a submitted form and compute every amount. Returns {error} or {data, total, hotel, domestic, promo}.
export function evaluate(b, env, at = Date.now()) {
  const ev = own(EVENTS, str(b && b.event, 20));
  if (!ev) return { error: 'bad_event' };
  const k2c = KEY2CODE(ev);
  const people = Array.isArray(b.people) ? b.people : [];
  if (people.length < 1 || people.length > ev.maxPeople) return { error: 'bad_people' };
  const promo = promoOf(b.code, env, ev, at);
  const fullPrice = promo.kind === 'friend' ? ev.friendPrice : promo.kind === 'early' ? ev.earlyPrice : ev.pkgs.full.price;
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
    if (pkg === 'single' && !extra.some(c => /^M[1-4]$/.test(c))) return { error: 'need_items', person: i };
    if (!pkg && !extra.length) return { error: 'need_items', person: i };
    const base = pkg === 'full' ? fullPrice : pkg ? ev.pkgs[pkg].price : 0;
    const amount = base + extra.reduce((s, c) => s + ev.items[c].price, 0);
    outPeople.push({ ...q, pkg, items: [...covers, ...extra], extra, amount });
  }
  let rooms = [], passports = [], hotel = 0;
  if (b.hotel === 'yes') {
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
// 调整金额 (Shiao, 2026-11-26): each one is a reg_log line 'adjust' whose text is {d, part, why, note, was}; reg.amount
// (and reg.hotel_amount for the hotel part) already include them. A new total worked out from the form again (the
// registrant editing a pending one, or 修改报名) adds them back, so an adjustment is never lost on the way.
async function adjOf(env, regId) {
  const out = { all: 0, hotel: 0, list: [] };
  for (const l of ((await env.SDB.prepare("SELECT at,detail FROM reg_log WHERE reg_id=? AND action='adjust' ORDER BY id").bind(regId).all()).results) || []) {
    let x = null; try { const o = JSON.parse(l.detail || ''); x = JSON.parse(o.text || ''); x.by = o.by; } catch { continue; }
    const d = Math.round(Number(x.d)) || 0; if (!d) continue;
    out.all += d; if (x.part === 'hotel') out.hotel += d;
    out.list.push({ at: l.at, d, part: x.part === 'hotel' ? 'hotel' : 'reg', why: String(x.why || ''), note: String(x.note || ''), by: String(x.by || ''), was: Number(x.was) || 0 });
  }
  return out;
}
const withAdj = (total, hotel, adj) => ({ amount: Math.max(0, total + adj.all), hotel: Math.max(0, hotel + adj.hotel) });
// One statement takes the next number and refuses a second live form of the same email, so any number of people can send at once.
async function addReg(env, r, userId, email, data, ts) {
  const pre = r.ev.prefix + '-';
  const ins = await env.SDB.prepare(`INSERT INTO reg(event,code,user_id,email,lang,status,domestic,people,data,amount,hotel_amount,promo,promo_dj,created_at,updated_at)
    SELECT ?,(SELECT ? || printf('%04d', COALESCE(MAX(CAST(substr(code,?) AS INTEGER)),0)+1) FROM reg WHERE code LIKE ?),?,?,?,'pending',?,?,?,?,?,?,?,?,?
    WHERE NOT EXISTS (SELECT 1 FROM reg WHERE event=? AND email=? AND status<>'cancelled')`)
    .bind(r.ev.id, pre, pre.length + 1, pre + '%', userId, email, r.lang, r.domestic, r.data.people.length, data, r.total, r.hotel, r.promo.code || null, r.promo.dj || null, ts, ts, r.ev.id, email).run();
  return ins.meta.changes ? env.SDB.prepare('SELECT * FROM reg WHERE id=?').bind(ins.meta.last_row_id).first() : null;
}

// ---------- letters ----------
const T = {
  en: { appA: 'Alipay', appW: 'WeChat Pay', appOr: ' or ', stepsH: 'How to pay:', one: 'Two codes are attached: choose one and pay once.',
    st1: '① Take a screenshot, or press and hold, to save the payment QR code to your photos', st2a: 'Alipay: Scan → Album', st2w: 'WeChat: + (top right) → Scan → Album', st2j: '; ', stBank: ' (first time? Link a bank card in the app first)',
    st3: '③ Enter the amount, tap "Add note" and type this registration number ({c})', st4: '④ Take a screenshot of the payment result and reply to this email with it',
    key: '✅ Important: always put your registration number in the payment note.', noImg: 'Cannot see the payment QR codes in this email? Tap "{b}".',
    viewPay: 'View registration and payment QR', viewPass: 'View registration and entry QR', passT: 'Your entry QR codes (one per person) are below. Show them at the door. You can also see them on the registration page after signing in. Tip: take a screenshot of your QR code now, in case there is no internet at the door.', hi: 'Hi {n},', sign: 'Shiao Chang & Liu Zheng\nBeijing Select Tango Weekend', total: 'Total', hotel: 'Hotel', nights: 'nights', details: 'Your registration',
    recvS: 'Registration received · {c}', recv: 'We have received your registration {c}. We will review it and reply within 10 days.',
    confS: 'Registration confirmed · {c}', conf: 'Your registration {c} is confirmed.',
    pay: 'Please pay {t} by {d} (within 2 weeks of this email) with {y}, using the payment QR code.',
    noApp: 'If you cannot use {y}, reply to this email with a screenshot of your flight ticket instead; you can then pay when you arrive.',
    rules: 'Changes, additions and cancellations after payment: ¥50 handling fee, charged once per registration; before payment they are free. If you cancel on or before June 11, 2027, we refund your payment minus ¥50; after that nothing is refunded, hotel included. Places cannot be passed to another person.',
    waitS: 'Waiting list · {c}', wait: 'Your registration {c} is on the waiting list. We will email you as soon as a place opens.',
    declS: 'Registration · {c}', decl: 'We are sorry, we cannot accept your registration {c} this time. Thank you for your interest.',
    remS: 'Payment reminder · {c}', rem: 'A friendly reminder: payment for {c} ({t}) is due by {d}.',
    paidS: 'Payment received · {c}', paid: 'We have received your payment for {c}. Your registration is complete. See you in Beijing!',
    cashS: 'Pay at the event · {c}', cash: 'We have received your flight ticket for {c}. Please pay {t} when you arrive (Alipay, WeChat Pay or cash).',
    cancS: 'Registration cancelled · {c}', canc: 'Your registration {c} has been cancelled.', refund: 'Refund: {r}.', noRefund: 'Under the registration rules, cancellations after June 11, 2027 are not refunded.',
    updS: 'Registration updated · {c}', upd: 'Your registration {c} has been updated.', updFee: 'Your registration {c} has been updated. The ¥50 handling fee is included in the total.',
    adjS: 'Amount changed · {c}', adj: 'The amount of your registration {c} has changed: {x}.', up: 'an extra charge of {m}', down: 'a reduction of {m}', why: 'Note from the organizers: {w}',
    adjT: 'Previous total {o}, new total {a}, paid so far {p}.', adjLater: 'The payment email you get once your registration is confirmed will use the new amount.',
    adjCash: '{t} is still to pay: please pay it when you arrive (Alipay, WeChat Pay or cash), before going in. To pay earlier, just reply to this email. Your entry QR codes stay the same.',
    adjPaid: 'Everything is paid; there is nothing more to pay.', adjOver: 'You have paid {r} more than the new total. The organizers will refund it to you.', viewReg: 'View registration' },
  zh: { appA: '支付宝', appW: '微信', appOr: '或', stepsH: '付款步骤：', one: '附了两个付款码，选一个付一次就好。',
    st1: '① 截图或长按，把付款码存到相册', st2a: '支付宝：扫一扫 → 相册', st2w: '微信：右上角 + → 扫一扫 → 相册', st2j: '；', stBank: '（第一次用的，先在 App 里绑好银行卡）',
    st3: '③ 输入金额，点「添加备注」填这笔的编号（{c}）', st4: '④ 截下付款结果，回复本邮件附上截图',
    key: '✅ 重要提醒：付款备注一定要填报名编号。', noImg: '信里看不到付款码，点「{b}」。',
    viewPay: '查看报名和付款码', viewPass: '查看报名和入场码', passT: '下方是每个人的入场二维码，请在入场时出示。登入报名页也看得到。建议先把入场码截图存在手机里，以免现场网络不好。', hi: '{n}，你好：', sign: '张孝、刘峥\n北京精选探戈周末', total: '合计', hotel: '住宿', nights: '晚', details: '你的报名',
    recvS: '已收到报名 · {c}', recv: '我们已收到你的报名 {c}，审核后会在 10 天内回复。',
    confS: '报名确认 · {c}', conf: '你的报名 {c} 已确认。',
    pay: '请在 {d} 前（收到本信后 2 周内）用{y}扫付款码支付 {t}。请不要发送你自己 App 里的「付款码」。',
    noApp: '如无法使用{y}，请回复本邮件并附上机票截图，即可到场付款。',
    rules: '付款后改动、增加或取消，每份报名收一次手续费 ¥50；付款前改动、取消都不收。2027年6月11日（含）前取消可退费，扣除手续费 ¥50；之后取消不退费，房费也一样。参加资格仅限报名者本人，不能换人。',
    waitS: '候补名单 · {c}', wait: '你的报名 {c} 目前在候补名单上，有名额时我们会立即通知你。',
    declS: '报名结果 · {c}', decl: '很抱歉，这次无法接受你的报名 {c}。谢谢你的关注。',
    remS: '付款提醒 · {c}', rem: '提醒你：报名 {c} 的款项 {t} 请在 {d} 前支付。',
    paidS: '已收到付款 · {c}', paid: '已收到报名 {c} 的付款，报名完成。北京见！',
    cashS: '到场付款 · {c}', cash: '已收到报名 {c} 的机票截图，请到场时支付 {t}（支付宝、微信或现金）。',
    cancS: '报名已取消 · {c}', canc: '你的报名 {c} 已取消。', refund: '退款：{r}。', noRefund: '依报名规则，2027年6月11日之后取消不退费。',
    updS: '报名已更新 · {c}', upd: '你的报名 {c} 已更新。', updFee: '你的报名 {c} 已更新，合计已含手续费 ¥50。',
    adjS: '金额调整 · {c}', adj: '你的报名 {c} 的金额有调整：{x}。', up: '加收 {m}', down: '减收 {m}', why: '说明：{w}',
    adjT: '原来合计 {o}，现在合计 {a}，已付 {p}。', adjLater: '报名确认后寄出的付款信，会用新的金额。',
    adjCash: '还差 {t}，请到场时支付（支付宝、微信或现金），付清后入场；想先付的，直接回复本邮件。入场码不变。',
    adjPaid: '已经付清，不用再付款。', adjOver: '你多付了 {r}，组织者会退还给你。', viewReg: '查看报名' },
  ko: { appA: '알리페이', appW: '위챗페이', appOr: ' 또는 ', stepsH: '결제 방법:', one: '결제 QR 코드가 두 개 있습니다. 하나만 골라 한 번 결제하면 됩니다.',
    st1: '① 결제 QR 코드를 캡처하거나 길게 눌러 사진첩에 저장', st2a: '알리페이: 스캔 → 앨범', st2w: '위챗: 오른쪽 위 + → 스캔 → 앨범', st2j: '; ', stBank: ' (처음 사용한다면 먼저 앱에서 은행 카드를 연결하세요)',
    st3: '③ 금액을 입력하고 「메모 추가」를 눌러 이 신청 번호({c})를 입력', st4: '④ 결제 결과를 캡처해 이 메일에 첨부해 회신',
    key: '✅ 중요: 결제 메모에 꼭 신청 번호를 입력해 주세요.', noImg: '메일에서 결제 QR 코드가 보이지 않으면 「{b}」를 누르세요.',
    viewPay: '신청 내역·결제 QR 보기', viewPass: '신청 내역·입장 QR 보기', passT: '아래는 1인당 하나씩인 입장 QR 코드입니다. 입장할 때 보여 주세요. 신청 페이지에 로그인해도 볼 수 있습니다. 현장에 인터넷이 약할 수 있으니 입장 QR 코드를 미리 캡처해 휴대폰에 저장해 두세요.', hi: '{n} 님, 안녕하세요.', sign: 'Shiao Chang & Liu Zheng\nBeijing Select Tango Weekend', total: '합계', hotel: '호텔', nights: '박', details: '신청 내역',
    recvS: '신청 접수 · {c}', recv: '신청 {c}이(가) 접수되었습니다. 검토 후 10일 이내에 답장드리겠습니다.',
    confS: '신청 확정 · {c}', conf: '신청 {c}이(가) 확정되었습니다.',
    pay: '{d}까지(이 메일을 받은 후 2주 이내) {y}로 결제 QR 코드를 스캔해 {t}을(를) 결제해 주세요.',
    noApp: '{y}를 사용할 수 없다면 항공권 캡처를 회신해 주세요. 도착해서 결제할 수 있습니다.',
    rules: '결제 후 변경·추가·취소 시 신청 건당 ¥50 수수료가 한 번 부과되며, 결제 전에는 수수료가 없습니다. 2027년 6월 11일(포함)까지 취소하면 ¥50을 제외하고 환불하며, 그 후에 취소하면 호텔 요금을 포함해 환불되지 않습니다. 다른 사람으로 바꿀 수 없습니다.',
    waitS: '대기자 명단 · {c}', wait: '신청 {c}은(는) 대기자 명단에 있습니다. 자리가 나면 바로 알려드리겠습니다.',
    declS: '신청 결과 · {c}', decl: '죄송하지만 이번에는 신청 {c}을(를) 받을 수 없습니다. 관심 가져 주셔서 감사합니다.',
    remS: '결제 안내 · {c}', rem: '신청 {c}의 결제({t}) 기한은 {d}입니다.',
    paidS: '결제 확인 · {c}', paid: '신청 {c}의 결제를 확인했습니다. 신청이 완료되었습니다. 베이징에서 만나요!',
    cashS: '현장 결제 · {c}', cash: '신청 {c}의 항공권을 확인했습니다. 도착 시 {t}을(를) 결제해 주세요(알리페이, 위챗페이 또는 현금).',
    cancS: '신청 취소 · {c}', canc: '신청 {c}이(가) 취소되었습니다.', refund: '환불: {r}.', noRefund: '신청 규정에 따라 2027년 6월 11일 후에 취소하면 환불되지 않습니다.',
    updS: '신청 변경 · {c}', upd: '신청 {c}이(가) 변경되었습니다.', updFee: '신청 {c}이(가) 변경되었습니다. 합계에 수수료 ¥50이 포함되어 있습니다.',
    adjS: '금액 변경 · {c}', adj: '신청 {c}의 금액이 변경되었습니다: {x}.', up: '추가 요금 {m}', down: '{m} 할인', why: '주최 측 안내: {w}',
    adjT: '이전 합계 {o}, 새 합계 {a}, 지금까지 결제 {p}.', adjLater: '신청이 확정되면 받는 결제 안내 메일에 새 금액이 적용됩니다.',
    adjCash: '남은 금액 {t}은(는) 도착해서 입장 전에 결제해 주세요(알리페이, 위챗페이 또는 현금). 미리 결제하려면 이 메일에 회신해 주세요. 입장 QR 코드는 그대로입니다.',
    adjPaid: '모두 결제되었습니다. 더 결제할 금액이 없습니다.', adjOver: '새 합계보다 {r} 더 결제하셨습니다. 주최 측에서 환불해 드립니다.', viewReg: '신청 내역 보기' },
  es: { appA: 'Alipay', appW: 'WeChat Pay', appOr: ' o ', stepsH: 'Cómo pagar:', one: 'Hay dos códigos: elige uno y paga una sola vez.',
    st1: '① Haz una captura o mantén pulsado para guardar el código QR de pago en tus fotos', st2a: 'Alipay: Escanear → Álbum', st2w: 'WeChat: + (arriba a la derecha) → Escanear → Álbum', st2j: '; ', stBank: ' (¿primera vez? Vincula antes una tarjeta bancaria en la app)',
    st3: '③ Introduce el importe, toca «Añadir nota» y escribe este número de inscripción ({c})', st4: '④ Haz una captura del resultado del pago y responde a este email con ella',
    key: '✅ Importante: pon siempre tu número de inscripción en la nota del pago.', noImg: '¿No ves los códigos QR en este email? Toca «{b}».',
    viewPay: 'Ver inscripción y QR de pago', viewPass: 'Ver inscripción y QR de entrada', passT: 'Abajo están los códigos QR de entrada (uno por persona). Muéstralos en la puerta. También puedes verlos en la página de inscripción al iniciar sesión. Consejo: haz ya una captura de tu código QR por si no hay internet en la puerta.', hi: 'Hola, {n}:', sign: 'Shiao Chang y Liu Zheng\nBeijing Select Tango Weekend', total: 'Total', hotel: 'Hotel', nights: 'noches', details: 'Tu inscripción',
    recvS: 'Inscripción recibida · {c}', recv: 'Hemos recibido tu inscripción {c}. La revisaremos y te responderemos en 10 días.',
    confS: 'Inscripción confirmada · {c}', conf: 'Tu inscripción {c} está confirmada.',
    pay: 'Paga {t} antes del {d} (2 semanas desde este email) con {y}, usando el código QR de pago.',
    noApp: 'Si no puedes usar {y}, responde con una captura de tu billete de avión; así podrás pagar al llegar.',
    rules: 'Cambios, añadidos y cancelaciones después de pagar: cargo de ¥50, una sola vez por inscripción; antes de pagar no tienen cargo. Si cancelas hasta el 11 de junio de 2027 (incluido), devolvemos lo pagado menos ¥50; después no se reembolsa nada, tampoco el hotel. La plaza no se puede ceder a otra persona.',
    waitS: 'Lista de espera · {c}', wait: 'Tu inscripción {c} está en lista de espera. Te escribiremos en cuanto haya plaza.',
    declS: 'Inscripción · {c}', decl: 'Lo sentimos, esta vez no podemos aceptar tu inscripción {c}. Gracias por tu interés.',
    remS: 'Recordatorio de pago · {c}', rem: 'Recordatorio: el pago de {c} ({t}) vence el {d}.',
    paidS: 'Pago recibido · {c}', paid: 'Hemos recibido el pago de {c}. Tu inscripción está completa. ¡Nos vemos en Pekín!',
    cashS: 'Pago en el evento · {c}', cash: 'Hemos recibido tu billete de avión para {c}. Paga {t} al llegar (Alipay, WeChat Pay o efectivo).',
    cancS: 'Inscripción cancelada · {c}', canc: 'Tu inscripción {c} ha sido cancelada.', refund: 'Reembolso: {r}.', noRefund: 'Según las normas de inscripción, las cancelaciones después del 11 de junio de 2027 no se reembolsan.',
    updS: 'Inscripción actualizada · {c}', upd: 'Tu inscripción {c} ha sido actualizada.', updFee: 'Tu inscripción {c} ha sido actualizada. El total incluye el cargo de ¥50.',
    adjS: 'Cambio de importe · {c}', adj: 'El importe de tu inscripción {c} ha cambiado: {x}.', up: 'un cargo adicional de {m}', down: 'un descuento de {m}', why: 'Nota de los organizadores: {w}',
    adjT: 'Total anterior {o}, nuevo total {a}, pagado hasta ahora {p}.', adjLater: 'El email de pago que recibirás cuando se confirme tu inscripción usará el nuevo importe.',
    adjCash: 'Quedan {t} por pagar: págalos al llegar, antes de entrar (Alipay, WeChat Pay o efectivo). Si prefieres pagar antes, responde a este email. Tus códigos QR de entrada no cambian.',
    adjPaid: 'Todo está pagado; no hay nada más que pagar.', adjOver: 'Has pagado {r} más que el nuevo total. Los organizadores te lo devolverán.', viewReg: 'Ver inscripción' },
  ru: { appA: 'Alipay', appW: 'WeChat Pay', appOr: ' или ', stepsH: 'Как оплатить:', one: 'Приложены два кода: выберите один и оплатите один раз.',
    st1: '① Сделайте скриншот или нажмите и удерживайте, чтобы сохранить QR-код в галерею', st2a: 'Alipay: «Сканировать» → «Альбом»', st2w: 'WeChat: «+» справа вверху → «Сканировать» → «Альбом»', st2j: '; ', stBank: ' (впервые? Сначала привяжите банковскую карту в приложении)',
    st3: '③ Введите сумму, нажмите «Добавить примечание» и укажите номер регистрации ({c})', st4: '④ Сделайте скриншот результата оплаты и ответьте на это письмо, приложив его',
    key: '✅ Важно: обязательно укажите номер регистрации в примечании к платежу.', noImg: 'Не видно QR-кодов в письме? Нажмите «{b}».',
    viewPay: 'Регистрация и QR для оплаты', viewPass: 'Регистрация и входной QR', passT: 'Ниже входные QR-коды (по одному на человека). Покажите их на входе. Их также видно на странице регистрации после входа. Совет: сохраните скриншот QR-кода заранее — на входе может не быть интернета.', hi: 'Здравствуйте, {n}!', sign: 'Shiao Chang и Liu Zheng\nBeijing Select Tango Weekend', total: 'Итого', hotel: 'Отель', nights: 'ноч.', details: 'Ваша регистрация',
    recvS: 'Регистрация получена · {c}', recv: 'Мы получили вашу регистрацию {c}. Проверим её и ответим в течение 10 дней.',
    confS: 'Регистрация подтверждена · {c}', conf: 'Ваша регистрация {c} подтверждена.',
    pay: 'Оплатите {t} до {d} (в течение 2 недель после этого письма) через {y} по QR-коду для оплаты.',
    noApp: 'Если не можете пользоваться {y}, пришлите в ответ скриншот авиабилета — тогда оплата по прибытии.',
    rules: 'Изменения, добавления и отмена после оплаты: сбор ¥50, один раз за регистрацию; до оплаты — бесплатно. При отмене до 11 июня 2027 включительно вернём оплату за вычетом ¥50; позже деньги не возвращаются, в том числе за отель. Место нельзя передать другому человеку.',
    waitS: 'Лист ожидания · {c}', wait: 'Ваша регистрация {c} в листе ожидания. Напишем, как только освободится место.',
    declS: 'Регистрация · {c}', decl: 'К сожалению, в этот раз мы не можем принять регистрацию {c}. Спасибо за интерес.',
    remS: 'Напоминание об оплате · {c}', rem: 'Напоминаем: оплата {c} ({t}) до {d}.',
    paidS: 'Оплата получена · {c}', paid: 'Мы получили оплату {c}. Регистрация завершена. До встречи в Пекине!',
    cashS: 'Оплата на месте · {c}', cash: 'Мы получили авиабилет для {c}. Оплатите {t} по прибытии (Alipay, WeChat Pay или наличные).',
    cancS: 'Регистрация отменена · {c}', canc: 'Ваша регистрация {c} отменена.', refund: 'Возврат: {r}.', noRefund: 'По правилам регистрации при отмене после 11 июня 2027 года деньги не возвращаются.',
    updS: 'Регистрация изменена · {c}', upd: 'Ваша регистрация {c} изменена.', updFee: 'Ваша регистрация {c} изменена. В итог включён сбор ¥50.',
    adjS: 'Изменение суммы · {c}', adj: 'Сумма вашей регистрации {c} изменилась: {x}.', up: 'доплата {m}', down: 'скидка {m}', why: 'Комментарий организаторов: {w}',
    adjT: 'Было {o}, стало {a}, уже оплачено {p}.', adjLater: 'В письме об оплате после подтверждения регистрации будет новая сумма.',
    adjCash: 'Осталось оплатить {t}: оплатите по прибытии, до входа (Alipay, WeChat Pay или наличные). Чтобы оплатить заранее, просто ответьте на это письмо. Входные QR-коды остаются прежними.',
    adjPaid: 'Всё оплачено, больше ничего платить не нужно.', adjOver: 'Вы оплатили на {r} больше новой суммы. Организаторы вернут разницу.', viewReg: 'Посмотреть регистрацию' }
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

export function detailLines(d, lang) {
  const N = NAMES[lang] || NAMES.en, L = T[lang] || T.en, out = [];
  for (const p of d.people) {
    const what = [p.pkg && p.pkg !== 'single' ? N[p.pkg] : '', ...(p.pkg && p.pkg !== 'single' ? p.extra : p.items).map(c => N[c])].filter(Boolean).join(' + ');
    out.push(`${p.name}: ${what} — ${fmt(p.amount)}`);
  }
  if (d.hotel) d.rooms.forEach(r => out.push(`${L.hotel}: ${N[r.type]} ${r.ci} → ${r.co} (${r.nights} ${L.nights}), ${r.guests.map(g => d.people[g] && d.people[g].name).join(', ')} — ${fmt(r.amount)}`));
  return out;
}
// qrs: names of the payment QR images that are really uploaded (a missing one would be a broken image).
export function letter(kind, reg, env, passes, qrs = []) {
  const d = typeof reg.data === 'string' ? JSON.parse(reg.data) : reg.data;
  const lang = T[reg.lang] ? reg.lang : 'en', L = T[lang];
  const v = { n: d.people[0] && d.people[0].name, c: reg.code, t: fmt(reg.rest == null ? reg.amount : reg.rest), d: reg.due_at ? bjDate(reg.due_at) : '', r: fmt(reg.refund || 0) };
  // 金额调整: reg.adj = {d, why, was, paid, over}; what follows depends on where the registration stands now
  const a = kind === 'adj' && reg.adj ? reg.adj : null, adjPay = !!a && reg.status === 'confirmed' && reg.rest > 0;
  if (a) Object.assign(v, { x: fill(a.d > 0 ? L.up : L.down, { m: fmt(Math.abs(a.d)) }), w: a.why, o: fmt(a.was), a: fmt(reg.amount), p: fmt(a.paid), r: fmt(a.over) });
  // 付款步骤 (Shiao, 2026-11-26): name only the apps whose payment code is attached (none uploaded yet: both)
  const ali = qrs.some(n => /alipay/.test(n)), wx = qrs.some(n => /wechat/.test(n));
  v.y = ali && !wx ? L.appA : wx && !ali ? L.appW : L.appA + L.appOr + L.appW;
  const body = [fill(L.hi, v), '', fill(kind === 'upd' && reg.fee > 0 ? L.updFee : L[kind], v)];   // 修改确认信 names the fee only when the total holds it
  // one refund date for everything, hotel included (Shiao, 2026-11-26): cancelled after it, the letter says why nothing comes back
  const ev0 = own(EVENTS, reg.event), late = !!ev0 && !!reg.cancelled_at && bjDate(reg.cancelled_at) > ev0.refundBy;
  if (kind === 'canc' && reg.refund != null) body.push(reg.refund === 0 && late ? L.noRefund : fill(L.refund, v));
  if (a) {
    if (a.why) body.push(fill(L.why, v));
    body.push('', fill(L.adjT, v));
    if (reg.status === 'pending' || reg.status === 'waitlist') body.push(L.adjLater);
    else if (reg.status === 'cash' && reg.rest > 0) body.push(fill(L.adjCash, v));
    else if (reg.status === 'paid') body.push(a.over > 0 ? fill(L.adjOver, v) : L.adjPaid);
  }
  if (['recv', 'conf', 'upd'].includes(kind)) { const colon = lang === 'zh' ? '：' : ': ';
    body.push('', L.details + colon.trim(), ...detailLines(d, lang).map(s => '· ' + s));
    if (reg.fee) body.push('· ' + (lang === 'zh' ? '手续费' : 'Fee') + ' — ' + fmt(reg.fee)); body.push(L.total + colon + fmt(reg.amount)); }
  // The steps, whenever codes are attached: in the text right after the pay line, in the html right above the codes.
  // Step 2 only for the codes attached; first-timers from abroad bind a card first; the note carries the number.
  const STEPS = {}, steps = [];
  if ((kind === 'conf' || kind === 'upd' || kind === 'rem' || adjPay) && qrs.length) {
    steps.push(L.stepsH); if (ali && wx) steps.push(L.one);
    steps.push(L.st1, '② ' + [ali ? L.st2a : '', wx ? L.st2w : ''].filter(Boolean).join(L.st2j) + (reg.domestic ? '' : L.stBank),
      fill(L.st3, { c: reg.code }), L.st4, L.key, fill(L.noImg, { b: L.viewPay }));
  }
  if (kind === 'conf' || kind === 'upd' || kind === 'rem' || adjPay) body.push('', fill(L.pay, v), STEPS, fill(L.noApp, v));
  if (kind === 'conf' || kind === 'upd') body.push('', L.rules);
  if ((kind === 'paid' || kind === 'cash') && passes && passes.length) body.push('', fill(L.passT, v));
  const toPay = kind === 'conf' || kind === 'upd' || kind === 'rem' || adjPay, toPass = kind === 'paid' || kind === 'cash';
  const plain = !!a && !toPay && !PAID.includes(reg.status);   // an adjusted one not yet confirmed: the page, no codes yet
  const view = toPay ? L.viewPay : plain ? L.viewReg : L.viewPass, href = regPage(env) + '?lang=' + lang + (toPay ? '#pay' : plain ? '' : '#passes');
  const button = `<p style="margin:18px 0 6px"><a href="${he(href)}" style="display:inline-block;background:#4a0609;color:#f6e3b4;padding:11px 22px;border-radius:999px;text-decoration:none;font-weight:700">${he(view)}</a></p>`;
  const capK = toPay ? 'pay' : kind === 'cash' ? 'cash' : 'pass';
  if ((toPay && qrs.length) || (toPass && passes && passes.length)) body.push('', ...caption(lang, capK));
  const capHtml = caption(lang, capK).map(x => `<div style="max-width:220px;margin:5px auto 0;font-size:13px;line-height:1.4">${he(x)}</div>`).join('');
  if (toPay || toPass || a) body.push('', view + (lang === 'zh' ? '：' : ': '), href);
  body.push('', L.sign);
  const text = body.flatMap(x => x === STEPS ? (steps.length ? ['', ...steps, ''] : []) : [x]).join('\n');
  const htext = body.filter(x => x !== STEPS).join('\n');   // the html shows the steps by the codes instead
  let html = '';
  if (kind === 'conf' || kind === 'upd' || kind === 'rem' || adjPay) {
    const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
    const box = steps.length ? `<div style="margin:16px 0 4px;padding:12px 14px;background:#fbf5e9;border:1px solid #e7d3b0;border-radius:10px;line-height:1.7">${steps.map(x => x === L.stepsH || x === L.key ? `<b>${he(x)}</b>` : he(x)).join('<br>')}</div>` : '';
    const imgs = qrs.map(n => `<div style="display:inline-block;text-align:center;margin:6px"><div style="font-weight:700">${/alipay/.test(n) ? 'Alipay 支付宝' : 'WeChat Pay 微信支付'}</div><img src="${he(base)}/social/reg/qr/${encodeURIComponent(n)}?k=${encodeURIComponent(env.REG_QR_KEY || '')}" alt="${he(n)}" width="220" style="border:1px solid #e7d3b0;border-radius:8px">${capHtml}</div>`).join('');
    html = `<!doctype html><html><body style="font-family:Georgia,serif;color:#2a1a14;background:#fbf5e9;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7d3b0;border-radius:12px;padding:20px">` +
      he(htext).replace(/\n/g, '<br>') + button + box + `<div style="margin-top:14px">${imgs}</div></div></body></html>`;
  }
  if ((kind === 'paid' || kind === 'cash') && passes && passes.length) {
    const cards = passes.map(x => `<div style="display:inline-block;text-align:center;margin:8px"><img src="${he(passImg(env, x.pass))}" alt="QR" width="200" height="200" style="border:1px solid #e7d3b0;border-radius:8px"><div style="font-weight:700">${he(x.name)}</div><div style="font-size:12px;color:#7a6255">${he(x.pass.split('.')[0])}</div>${capHtml}</div>`).join('');
    html = `<!doctype html><html><body style="font-family:Georgia,serif;color:#2a1a14;background:#fbf5e9;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7d3b0;border-radius:12px;padding:20px">` +
      he(text).replace(/\n/g, '<br>') + button + `<div style="margin-top:14px;text-align:center">${cards}</div></div></body></html>`;
  }
  return { subject: fill(L[kind + 'S'], v), text, html };
}
const KIND = { recv: 'recv', confirm: 'conf', waitlist: 'wait', decline: 'decl', remind: 'rem', paid: 'paid', cash: 'cash', cancel: 'canc', modify: 'upd', adjust: 'adj' };

// The payment QR codes for this registration that the organizer uploaded, Alipay first.
async function payNames(env, reg) {
  if (!env.REG_QR_KEY) return [];
  const want = String((reg.domestic ? env.REG_QR_CN : env.REG_QR_INTL) || (reg.domestic ? 'cn-alipay,cn-wechat' : 'intl-alipay,intl-wechat')).split(',').map(x => x.trim()).filter(Boolean);
  const have = new Set((((await env.SDB.prepare('SELECT name FROM reg_asset').all()).results) || []).map(x => x.name));
  return want.filter(n => have.has(n));
}
// Test stage (no REG_LIVE=1; plan 「1225」, Shiao 2026-11-24):
//   the organizers (管理员, 总管邮箱, 副本邮箱) get their own mail straight, the subject marked [测试];
//   a registrant on the 测试名单 gets theirs straight, marked [测试]; any other registrant's goes only to the test inbox,
//   its subject saying whom it was for, so nobody outside the list ever gets a test letter.
const TEST_TAG = '[测试] ';
const testInbox = env => env.REG_TEST_INBOX || 'selecttango@gmail.com';
const toOrganizer = (env, to) => ({ to, pre: env.REG_LIVE === '1' ? '' : TEST_TAG });
function toRegistrant(env, t, to) {
  if (env.REG_LIVE === '1') return { to, pre: '' };
  if (t && (t.test_list || []).includes(String(to || '').toLowerCase())) return { to, pre: TEST_TAG };
  return { to: testInbox(env), pre: '[TEST → ' + to + '] ' };
}
const replyTo = env => env.REG_REPLY_TO || 'info@tangoweekend.org';
const stageOf = env => env.REG_LIVE === '1' ? 'live' : 'test';
const adminMail = env => String(env.REG_NOTIFY || 'selecttango@gmail.com').trim().toLowerCase();
// 'sent' or 'failed'; what was saved stays saved either way
async function send(env, kit, reg, action, extra) {
  const kind = KIND[action]; if (!kind) return undefined;
  const passes = (action === 'paid' || action === 'cash') ? await passesOf(env, reg) : null;
  const qrs = ['conf', 'upd', 'rem'].includes(kind) || (kind === 'adj' && reg.status === 'confirmed') ? await payNames(env, reg) : [];
  const rest = kind === 'cash' || kind === 'rem' || kind === 'adj' ? Math.max(0, reg.amount - await paidSum(env, reg.id)) : null;
  const shown = { ...reg, ...(rest == null ? {} : { rest }), ...(extra || {}) };
  const m = letter(kind, shown, env, passes, qrs);
  const t = await mailTo(env, reg.event), dest = toRegistrant(env, t, reg.email);
  try { await kit.deliver(env, dest.to, dest.pre + m.subject, m.text, m.html || undefined, undefined, { fromName: 'Beijing Select Tango Weekend', replyTo: replyFor(env, t) }); await log(env, reg.id, 'mail:' + action, dest.to); }
  catch (e) { await log(env, reg.id, 'mail_failed:' + action, String(e && e.message || e)); return 'failed'; }
  await sendCopies(env, kit, reg, action, kind, shown, qrs, passes, t);
  return 'sent';
}

// ---------- 活动邮箱 (Shiao, 2026-11-24; rules in docs/tangopass.md) ----------
// Per event, changed by the 管理员 only, seen by the 总管: the 总管邮箱 and a 副本邮箱 (may be empty); the 管理员's own
// address is fixed. Every registration letter and the 新报名 notice go to each of them as a separate letter, never Cc or
// Bcc, so the registrant sees none of them. The 管理员 may turn their own off (「管理员也收信」), but still gets them
// while the 总管邮箱 is empty or not verified: verified = the 总管 opened the link in the 任命信, in this same stage.
const SETTINGS = ['chief_email', 'copy_email', 'admin_copy', 'chief_token', 'chief_verified', 'event_mail', 'event_mail_rule', 'event_mail_token', 'event_mail_ok', 'test_list'];
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
async function mailTo(env, evId) {
  const s = await settingsOf(env, evId), chief = s.chief_email || '', v = String(s.chief_verified || '').split('|');
  const verified = !!chief && v[0] === chief && (v[1] === 'direct' || v[1] === stageOf(env));
  const event_mail = s.event_mail || '', ok = String(s.event_mail_ok || '').split('|'), bound = !!event_mail && ok[0] === event_mail;
  return { chief, copy: s.copy_email || '', admin: adminMail(env), admin_on: s.admin_copy !== '0', verified, verified_at: verified ? v[2] : undefined, live: env.REG_LIVE === '1',
    event_mail, event_mail_ok: bound, event_mail_at: bound ? ok[1] : undefined, domain: mailDomain(env), cf_ready: !!env.CF_MAIL_TOKEN,
    test_list: String(s.test_list || '').split(',').filter(Boolean) };
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
const route = (env, x) => toOrganizer(env, x.addr);
// The copy is the same letter with a line on top. Entry codes belong to the registrant alone: never in a copy.
async function sendCopies(env, kit, reg, action, kind, shown, qrs, passes, t) {
  t = t || await mailTo(env, reg.event);
  const list = recipients(t, String(reg.email || '').toLowerCase());
  if (!list.length) return;
  const m = letter(kind, shown, env, null, qrs);
  const bound = t.event_mail && t.event_mail_ok, tag = bound ? `[副本 #${await relayKey(env, reg.code)}] ` : '[副本] ';
  const head = `副本：这是寄给报名者 ${reg.email}（${reg.code}）那封信的副本，报名者看不到这个副本。` + (passes && passes.length ? '入场码只寄给报名者本人，副本里没有。' : '')
    + (bound ? `直接回复这封副本，会以活动名义寄给报名者（报名者看不到你的邮箱）。` : '');
  const html = m.html ? m.html.replace(/(<body[^>]*>)/, `$1<div style="max-width:560px;margin:0 auto 12px;font-family:sans-serif;font-size:14px;color:#7a6255">${he(head)}</div>`) : undefined;
  const done = [], failed = [];
  for (const x of list) {
    const dest = route(env, x);
    try { await kit.deliver(env, dest.to, dest.pre + tag + m.subject, head + '\n\n' + m.text, html, undefined, { fromName: 'Beijing Select Tango Weekend', replyTo: replyFor(env, t) }); done.push(x.who); }
    catch (e) { failed.push(x.who + ': ' + String(e && e.message || e).slice(0, 200)); }
  }
  if (done.length) await log(env, reg.id, 'copy:' + action, done.join(','));
  if (failed.length) await log(env, reg.id, 'copy_failed:' + action, failed.join(' | '));
}
// The 新报名 notice: to the same people, each their own. A failure to the 管理员 shows on the page, as before.
async function notifyOwner(env, kit, reg) {
  const d = JSON.parse(reg.data);
  const text = [`New registration ${reg.code} (${reg.people} people${reg.domestic ? ', domestic' : ''})`, `${reg.email} · ${reg.lang}`, ...detailLines(d, 'zh'), `合计 ${fmt(reg.amount)}`, d.promo && d.promo.code ? `码 ${d.promo.code}${d.promo.dj ? ' (' + d.promo.dj + ')' : ''}` : '', d.msg ? '留言：' + d.msg : ''].filter(Boolean).join('\n');
  const done = [], failed = [];
  for (const x of recipients(await mailTo(env, reg.event))) {
    const dest = route(env, x);
    try { await kit.deliver(env, dest.to, dest.pre + '新报名 ' + reg.code, text, undefined, undefined, { fromName: 'Registration' }); if (x.who !== 'admin') done.push(x.who); }
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
async function tpMail(env, kit, to, subject, text) {
  const dest = toOrganizer(env, to);   // 任命信 and notices go to the 总管邮箱 / 副本邮箱 only
  try { await kit.deliver(env, dest.to, dest.pre + subject, text + TP_SIGN, undefined, undefined, { fromName: '探戈通 Tango Pass', replyTo: replyTo(env) }); return 'sent'; }
  catch (e) { console.log('tp mail', String(e && e.message || e).slice(0, 120)); return 'failed'; }
}
const OPEN_LINK = '请用 Safari 或 Chrome 打开（在微信里按右上角 ··· 选「在浏览器打开」）。打开这个链接，也就确认了这个邮箱收得到信。';
const NO_PIN = '六位临时密码管理员会用微信或电话另外告诉你，这封信里没有密码。第一次登入要换成自己的密码。';
const CHIEF_DOES = '总管有这场活动报名系统的全部权限：审核、收款、退款、看护照姓名、导出，并任免经理和前台。';
const COPIES = '此后，这场活动每封报名相关的信，都会另外寄一份到这个邮箱（报名者看不到）。';
// mode: new = just appointed (temporary password); reset = new link and temporary password;
//       relink = a new link for the 总管 already there (the 总管邮箱 set or changed, or sent again): same password, phones stay;
//       promoted = a 经理 made 总管: a new link, same password, the phones were signed out by the change.
export function chiefLetter(ev, name, mode, link, temp) {
  const e = ev.name.zh, top = name + '，你好：\n\n', linkPart = `你的专属登入链接（登入后进管理页）：\n${link}\n\n${OPEN_LINK}`;
  const pin = mode !== 'new' && mode !== 'reset' && !temp ? '密码不变：输入你自己的六位密码。' : NO_PIN;
  if (mode === 'reset') return { subject: `探戈通：你的总管登入已重设（${e}）`,
    text: top + `管理员重设了你在「${e}」的登入：旧链接、旧密码都已失效，所有手机都已退出。\n\n${linkPart}\n${pin}\n\n链接和密码都不要转发。` };
  const first = mode === 'relink' ? `你是「${e}」的总管。下面是你新的专属登入链接，旧链接已失效；已登入的手机不受影响。`
    : `管理员任命你为「${e}」的总管。${CHIEF_DOES}` + (mode === 'promoted' ? '职务改了，手机要用下面的新链接重新登入，旧链接已失效。' : '');
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
  const l = chiefLetter(ev, name, mode, personLink(env, key, m), temp);
  const r = await tpMail(env, kit, t.chief, l.subject, l.text);
  if (r === 'sent' && tell && t.copy && t.copy !== t.chief) { const o = copyLetter(ev, 'chief', { name, chief: t.chief }); await tpMail(env, kit, t.copy, o.subject, o.text); }
  return r;
}
// A link for the 总管 already there: only its hash is kept, so a new one is made and mailed. The password and the
// phones signed in stay. If the letter cannot go out, the old link is put back.
async function relinkChief(env, kit, ev, mode, tell) {
  if (!(await mailTo(env, ev.id)).chief) return undefined;
  const row = await env.SDB.prepare("SELECT * FROM reg_admin WHERE event=? AND perms='chief' AND disabled_at IS NULL ORDER BY id LIMIT 1").bind(ev.id).first();
  if (!row) return 'wait';   // sent when a 总管 is appointed
  if (!row.pin_hash || row.stopped_at) return 'need_reset';
  const key = rndHex(24), h = await sha256(key), old = row.link_hash || '';
  const ch = await env.SDB.prepare("UPDATE reg_admin SET link_hash=? WHERE id=? AND perms='chief' AND COALESCE(link_hash,'')=? AND disabled_at IS NULL").bind(h, row.id, old).run();
  if (!ch.meta.changes) return 'changed';
  const r = await mailChief(env, kit, ev, row.name, mode, key, !!row.pin_temp, tell);
  if (r !== 'sent') await env.SDB.prepare('UPDATE reg_admin SET link_hash=? WHERE id=? AND link_hash=?').bind(old || null, row.id, h).run();
  return r || 'failed';
}
// Opening the 任命信's link: only the 总管's own link with the token of the latest letter, to the address set now,
// in the stage it was sent in (a letter read in the test inbox does not count once live).
async function mailOk(env, kind, row, m) {
  if (kind !== 'admin' || roleOf(row.perms) !== 'chief' || !/^[0-9a-f]{32}$/.test(String(m || ''))) return undefined;
  const s = await settingsOf(env, row.event), [h, addr, stage] = String(s.chief_token || '').split('|');
  if (!s.chief_email || addr !== s.chief_email || (stage !== 'direct' && stage !== stageOf(env)) || h !== await sha256(String(m))) return undefined;
  await setSetting(env, row.event, 'chief_verified', `${addr}|${stage}|${nowIso()}`, row.name);
  return true;
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
const cleanSubject = s => String(s || '').replace(/\[TEST → [^\]]*\]\s*/g, '').replace(/\[(回信 [A-Z0-9]+-\d{4}(?: #[0-9a-f]+)?|副本(?: #[0-9a-f]+)?|来信|测试)\]\s*/g, '').replace(/^((re|回复|答复|fw|fwd|转发)\s*[:：]\s*)+/i, '').trim();
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
  const ev = row && own(EVENTS, row.event); if (!ev) return false;
  const M = await import('./inmail.js'), h = message.headers;
  const subject = M.decodeWords(h.get('subject') || '').trim();
  const bind = /\[TP-BIND ([0-9a-f]{32})\]/.exec(subject);
  if (bind) { await bindOk(env, ev, to, bind[1]); return true; }
  const drop = why => { console.log('tp inbound dropped: ' + why); return true; };
  if (h.get('x-tp-relay')) return drop('our own relay');
  if (!M.authPassed(h)) return drop('not authenticated');
  if (M.isAuto(h, subject)) return drop('automatic reply');
  const from = addrOf(h.get('from')) || String(message.from || '').toLowerCase();
  const t = await mailTo(env, ev.id), orgs = { [t.chief]: 'chief', [t.copy]: 'copy', [t.admin]: 'admin' };
  delete orgs['']; const role = Object.hasOwn(orgs, from) ? orgs[from] : '';
  const code = (new RegExp(ev.prefix + '-\\d{4}').exec(subject) || [])[0];
  const reg = code ? await env.SDB.prepare('SELECT * FROM reg WHERE event=? AND code=?').bind(ev.id, code).first() : null;
  const k = reg ? await relayKey(env, reg.code) : '', keyed = !!k && subject.includes('#' + k);
  let mine = reg && emailsOf(reg).includes(from) ? reg : null;
  if (!mine && !role) mine = await env.SDB.prepare("SELECT * FROM reg WHERE event=? AND (email=? OR instr(lower(data),?)>0) ORDER BY (status='cancelled'), id DESC LIMIT 1").bind(ev.id, from, '"email":"' + from + '"').first();
  // test stage: the registrant's letters land in the test inbox, so a reply from there to one of them stands for that registrant
  const testReply = !t.live && reg && from === String(env.REG_TEST_INBOX || 'selecttango@gmail.com').toLowerCase() && /\[TEST → [^\]]+\]/.test(subject) && !keyed;
  if (message.rawSize > 25 * 1024 * 1024) {
    const x = { addr: t.admin, who: 'admin' }, d = route(env, x);
    await kit.deliver(env, d.to, d.pre + '[来信太大] ' + subject, `${from} 寄到 ${to} 的信超过 25MB，没有转寄。请直接联系寄件人。`, undefined, { 'X-TP-Relay': 'big' }, { fromName: '探戈通 Tango Pass', replyTo: from }).catch(() => {});
    return true;
  }
  const buf = new Uint8Array(await new Response(message.raw).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const parsed = M.parseMime(bin), plain = parsed.texts.find(x => x.type === 'text/plain'), htm = parsed.texts.find(x => x.type === 'text/html');
  const body = (plain ? plain.text : htm ? M.htmlText(htm.text) : '').trim(), files = filesOut(parsed);
  const relay = async (x, subj, text, opt) => { const d = route(env, x); await kit.deliver(env, d.to, d.pre + subj, text, undefined, { 'X-TP-Relay': opt.kind }, { fromName: opt.fromName, replyTo: opt.replyTo, attachments: files.keep }); };
  if (role && keyed) {
    // an organizer answers a letter TP sent them: to the registrant in the event's name; the others get a copy
    const subj = 'Re: ' + cleanSubject(subject).replace(new RegExp('\\s*·?\\s*' + reg.code + '\\s*'), ' ').trim() + ' · ' + reg.code;
    const d = toRegistrant(env, t, reg.email);
    try { await kit.deliver(env, d.to, d.pre + subj, body, undefined, { 'X-TP-Relay': 'out' }, { fromName: 'Beijing Select Tango Weekend', replyTo: to, attachments: files.keep }); }
    catch (e) {
      await log(env, reg.id, 'reply_failed:out', String(e && e.message || e));
      const x = { addr: from, who: role }; await relay(x, '探戈通：没寄出 ' + reg.code, `你回给报名者 ${reg.email}（${reg.code}）的信没有寄出，请稍后再回复一次。\n\n原信标题：${subject}`, { kind: 'notice', fromName: '探戈通 Tango Pass', replyTo: replyTo(env) }).catch(() => {});
      return true;
    }
    const head = `副本：${ROLE_ZH[role]}（${from}）以「${ev.name.zh}」的名义回给报名者 ${reg.email}（${reg.code}）的信。报名者看不到寄件人的邮箱。`;
    for (const x of recipients(t, from)) await relay(x, `[副本 #${k}] ` + subj, head + '\n\n' + body + files.note, { kind: 'copy', fromName: 'Beijing Select Tango Weekend', replyTo: to }).catch(e => console.log('tp relay copy', String(e && e.message || e).slice(0, 120)));
    await log(env, reg.id, 'reply:out', role + (files.keep.length ? ' +' + files.keep.length : ''));
    return true;
  }
  const r = mine || (testReply ? reg : null);
  if (r) {
    // a registrant writes: to the organizers, each their own letter; answering it goes back through this address
    const head = `回信：报名者 ${nameOf(r)}（${r.email}，${r.code}，${STATUS_ZH[r.status] || r.status}）寄到活动专属邮箱 ${to}。` +
      `直接回复这封信，会以「${ev.name.zh}」的名义寄给报名者（报名者看不到你的邮箱），也会寄副本给其他人。` + (files.keep.length ? `附件 ${files.keep.length} 个。` : '');
    const subj = tagOf(r.code, await relayKey(env, r.code)) + ' ' + cleanSubject(subject);
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
  const ev = own(EVENTS, url.searchParams.get('event') || 'bstw2027');
  if (!ev) return json({ error: 'bad_event' }, 400);
  return json({ left: await seatsLeft(env, ev) });
}
export async function regMe(req, env, url, json, kit) {
  const u = await kit.user(req, env); if (!u) return json({ error: 'auth' }, 401);
  const ev = own(EVENTS, url.searchParams.get('event') || 'bstw2027'); if (!ev) return json({ error: 'bad_event' }, 400);
  const r = await env.SDB.prepare('SELECT * FROM reg WHERE event=? AND email=? ORDER BY (status=\'cancelled\'), id DESC LIMIT 1').bind(ev.id, String(u.email).toLowerCase()).first();
  if (!r) return json({ email: u.email, name: u.name, reg: null });
  const passes = (await passesOf(env, r)).map(x => ({ name: x.name, items: x.items, pass: x.pass, img: passImg(env, x.pass) }));
  // Payment QR codes only for a confirmed, unpaid registration, and only those the organizer uploaded.
  let pay = [];
  if (r.status === 'confirmed' && env.REG_QR_KEY) {
    const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
    pay = (await payNames(env, r)).map(n => ({ name: n, img: base + '/social/reg/qr/' + encodeURIComponent(n) + '?k=' + encodeURIComponent(env.REG_QR_KEY) }));
  }
  const d = JSON.parse(r.data), got = await moneyOf(env, r.id), adj = await adjOf(env, r.id);
  // a paid one that owes again only after 修改报名 raised it (调整金额 turns it into 到场付款); one marked paid before the ledger owes nothing
  const rest = r.status === 'confirmed' || r.status === 'cash' || (r.status === 'paid' && got.n) ? Math.max(0, r.amount - got.sum) : 0;
  const over = r.status === 'paid' && got.n ? Math.max(0, got.sum - r.amount) : 0;   // paid more than a total that 调整金额 lowered
  return json({ email: u.email, name: u.name, reg: { code: r.code, lang: r.lang, people: r.people, rest, over, status: r.status, amount: r.amount, fee: r.fee, refund: r.refund, due: r.due_at, domestic: !!r.domestic,
    updated: r.updated_at, lines: detailLines(d, ['en', 'ko', 'es', 'ru', 'zh'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : r.lang), pay, passes,
    adjust: adj.list.map(x => ({ at: x.at, d: x.d, part: x.part, why: x.why })) } });   // never the internal note, nor who
}
export async function regSubmit(req, env, b, json, kit) {
  const u = await kit.user(req, env);
  if (!u) return json({ error: 'need_subscribe' }, 401);
  const email = String(u.email || '').toLowerCase();
  if (!EMAIL_STRICT.test(email)) return json({ error: 'need_email_subscribe' }, 403);
  if (b && b.website) return json({ ok: true });   // honeypot
  const r = evaluate(b, env);
  if (r.error) return json(r, 400);
  const ts = nowIso(), data = JSON.stringify(r.data);
  const live = () => env.SDB.prepare("SELECT * FROM reg WHERE event=? AND email=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1").bind(r.ev.id, email).first();
  let reg = null, ex = await live();
  if (!ex) {
    reg = await addReg(env, r, u.id, email, data, ts);
    if (reg) await log(env, reg.id, 'submit');
    else if (!(ex = await live())) return json({ error: 'busy' }, 409);
  }
  if (ex) {
    if (ex.status !== 'pending') return json({ error: 'exists', code: ex.code, status: ex.status }, 409);
    const m = withAdj(r.total, r.hotel, await adjOf(env, ex.id));   // an adjustment made while it waited stays
    // the same form again within two minutes is the same press of the button (or a retry after a lost answer): no second letter
    if (ex.data === data && ex.amount === m.amount && Date.parse(ts) - Date.parse(ex.updated_at) < 12e4) {
      const sent = await env.SDB.prepare("SELECT action FROM reg_log WHERE reg_id=? AND action IN ('mail:recv','mail_failed:recv') ORDER BY id DESC LIMIT 1").bind(ex.id).first();
      return json({ ok: true, code: ex.code, total: ex.amount, updated: true, mail: !sent ? undefined : sent.action === 'mail:recv' ? 'sent' : 'failed', promo: r.promo.kind });
    }
    const up = await env.SDB.prepare("UPDATE reg SET lang=?,domestic=?,people=?,data=?,amount=?,hotel_amount=?,promo=?,promo_dj=?,updated_at=? WHERE id=? AND status='pending'")
      .bind(r.lang, r.domestic, r.data.people.length, data, m.amount, m.hotel, r.promo.code || null, r.promo.dj || null, ts, ex.id).run();
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
  const reg = await env.SDB.prepare('SELECT status,people FROM reg WHERE code=?').bind(p.code).first();
  if (!reg || !PAID.includes(reg.status) || p.idx >= reg.people) return new Response('not found', { status: 404 });
  const { qrPng } = await import('./qrpng.js');
  return new Response(await qrPng(checkinUrl(env, p.pass), 8), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400' } });
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
const CSV_COLS = ['code', 'status', 'created', 'email', 'lang', 'person', 'name', 'nick', 'role', 'country', 'city', 'domestic', 'wechat', 'facebook', 'package', 'items', 'person_amount', 'room', 'room_type', 'check_in', 'check_out', 'nights', 'passport_surname', 'passport_given', 'promo', 'promo_dj', 'total', 'fee', 'refund', 'due', 'paid_at', 'note', 'adjust', 'adjust_why'];
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
const ACT_NEEDS = { confirm: 'review', waitlist: 'review', decline: 'review', cash: 'review', paid: 'review', pay: 'review', note: 'review', cancel: 'cancel', refund: 'refund', modify: 'modify', adjust: 'modify' };
const roleOf = perms => perms === 'chief' || perms === 'deputy' ? perms : 'manager';
const can = (who, perm) => !!who && GRANT[who.role].includes(perm);
const mayAppoint = (who, role) => RANK[who.role] >= RANK.deputy && RANK[who.role] > RANK[role];
// The caller: the platform admin's long password, or one signed-in phone (dev:<key>, see "sign-in" below).
// { who } when they may go on; { err } is the body of a 401 that tells the page why not (signed out, or password due again).
async function callerOf(req, env, opt) {
  if (adminOK(req, env)) return { who: { name: ownerName(env), role: 'owner' } };
  return deviceWho(req, env, opt);
}
async function adminWho(req, env, evId) {
  const c = await callerOf(req, env);
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
function loginOf(x, role, now = nowIso()) {
  const max = DEVICES[role] || 1;
  const state = x.stopped_at ? 'stopped' : !x.link_hash ? 'none' : x.locked_until && x.locked_until > now ? 'locked' : x.pin_temp ? 'new' : x.devices ? 'on' : 'off';
  return { state, devices: x.devices || 0, max, until: state === 'locked' ? x.locked_until : undefined };
}
async function staffList(env, evId) {
  const rows = (await env.SDB.prepare(`SELECT x.id,x.name,x.created_at,x.activated_at,x.disabled_at,x.link_hash,x.pin_temp,x.locked_until,x.stopped_at,${LIVE_DEVICES('staff')},
    (SELECT COUNT(*) FROM reg_checkin c JOIN reg r ON r.id=c.reg_id WHERE r.event=x.event AND c.staff=x.name AND c.at>=x.created_at) checkins
    FROM reg_staff x WHERE x.event=? ORDER BY x.id`).bind(evId).all()).results || [];
  return rows.map(x => { const { link_hash, pin_temp, locked_until, stopped_at, devices, ...y } = x; return { ...y, v: verOf(link_hash), login: loginOf(x, 'desk') }; });
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
const HANDLED = ['confirm', 'waitlist', 'decline', 'cash', 'pay', 'refund', 'cancel', 'modify', 'adjust', 'note', 'checkin_undo'];
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
  const ev = Object.hasOwn(EVENTS, evId) ? EVENTS[evId] : null;
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
  if (p === '/me' && req.method === 'GET') return json({ ok: true, ...meOf(who, ev) });
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
    const undone = {}, history = {}, adjusts = {};
    for (const raw of ((await env.SDB.prepare(`SELECT l.reg_id,l.action,l.at,l.detail FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.event=? AND l.action IN (${HANDLED.map(() => '?')}) ORDER BY l.id`).bind(ev.id, ...HANDLED).all()).results || [])) {
      const l = readLog(raw);
      if (l.action === 'checkin_undo') {
        const m = /^(\d+):(\w+)/.exec(l.text);
        if (m) (undone[raw.reg_id] = undone[raw.reg_id] || []).push({ at: l.at, person: +m[1], item: m[2], by: l.by });
      } else if (l.action === 'adjust') {   // 调整金额 with its amount, part, reason and internal note (only those who see the list)
        try { const x = JSON.parse(l.text); (adjusts[raw.reg_id] = adjusts[raw.reg_id] || []).push({ at: l.at, by: l.by, d: Number(x.d) || 0, part: x.part === 'hotel' ? 'hotel' : 'reg', why: String(x.why || ''), note: String(x.note || '') }); } catch { /* unreadable: left out */ }
      } else if (l.action !== 'pay' && l.action !== 'refund') (history[raw.reg_id] = history[raw.reg_id] || []).push({ action: l.action, at: l.at, by: l.by }); }   // money is shown from reg_payment
    // letters that did not go out, unless the same kind went out later. Never the error text or the address.
    const unsent = {};
    for (const l of ((await env.SDB.prepare("SELECT l.reg_id,l.action,l.at FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.event=? AND substr(l.action,1,4)='mail' ORDER BY l.id").bind(ev.id).all()).results || [])) {
      const [state, kind] = l.action.split(':'), m = unsent[l.reg_id] = unsent[l.reg_id] || {};
      if (state === 'mail_failed') m[kind] = { action: kind, at: l.at }; else delete m[kind]; }
    rows.forEach(r => { r.mail_failed = Object.values(unsent[r.id] || {}); r.checkins = inRows[r.id] || []; r.undos = undone[r.id] || []; r.log = history[r.id] || []; r.adjusts = adjusts[r.id] || [];
      if (!can(who, 'passport')) delete r.data.passports; });   // not sent at all, not just hidden
    const staff = await staffList(env, ev.id);
    const pays = ((await env.SDB.prepare('SELECT p.* FROM reg_payment p JOIN reg r ON r.id=p.reg_id WHERE r.event=? ORDER BY p.id').bind(ev.id).all()).results) || [];
    const byReg = {}, byCollector = {};
    for (const x of pays) { (byReg[x.reg_id] = byReg[x.reg_id] || []).push(x); const c = byCollector[x.collector] = byCollector[x.collector] || { in: 0, out: 0, n: 0 }; if (x.amount >= 0) c.in += x.amount; else c.out -= x.amount; c.n++; }
    rows.forEach(r => { r.payments = byReg[r.id] || []; r.paid_total = r.payments.reduce((s, x) => s + x.amount, 0); });
    const admins = ((await env.SDB.prepare(`SELECT x.id,x.name,x.perms,x.link_hash,x.pin_temp,x.locked_until,x.stopped_at,x.created_at,x.disabled_at,${LIVE_DEVICES('admin')} FROM reg_admin x WHERE x.event=? ORDER BY x.id`).bind(ev.id).all()).results || [])
      .map(x => { const { perms, link_hash, pin_temp, locked_until, stopped_at, devices, ...y } = x, role = roleOf(perms), manage = mayAppoint(who, role);
        return { ...y, role, manage, v: manage ? verOf(link_hash) : undefined, login: manage ? loginOf(x, role) : undefined }; })
      .sort((x, y) => RANK[y.role] - RANK[x.role] || x.id - y.id);
    // 活动邮箱: the 管理员 changes them, the 总管 sees them, nobody else is sent them
    const mailto = who.role === 'owner' || who.role === 'chief' ? await mailTo(env, ev.id) : undefined;
    return json({ event: ev.id, me: meOf(who, ev), chief: ev.chief === 'owner' ? ownerName(env) : '', left, caps, roles, counts, overdue, checked, staff, ledger: byCollector, admins, mailto, rows });
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
        if (k === 'copy') { const o = copyLetter(ev, 'set'); sent.copy = await tpMail(env, kit, want.copy, o.subject, o.text); }
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
      const c = await freshCredentials(env);
      const r = await env.SDB.prepare("INSERT INTO reg_admin(event,name,pass_hash,perms,created_at,link_hash,pin_hash,pin_salt,pin_temp) SELECT ?,?,'-',?,?,?,?,?,1 WHERE " + NAME_FREE + room)
        .bind(ev.id, name, want, nowIso(), c.link_hash, c.pin_hash, c.pin_salt, ev.id, name, ev.id, name, ...roomArgs).run();
      if (!r.meta.changes) return (await nameFree(env, ev.id, name)) ? noRoom() : json({ error: 'name_taken' }, 409);
      const link = personLink(env, c.key);
      // a new 总管 gets the 任命信 at the 总管邮箱: the link only, the password is given another way
      const letter = want === 'chief' ? await mailChief(env, kit, ev, name, 'new', c.key, true, true) : undefined;
      return json({ ok: true, id: r.meta.last_row_id, name, role: want, link, pin: c.pin, letter });
    }
    const id = Number(b && b.id) || 0;
    const t = await env.SDB.prepare('SELECT id,name,perms,link_hash,disabled_at FROM reg_admin WHERE id=? AND event=?').bind(id, ev.id).first();
    if (!t) return json({ error: 'not_found' }, 404);
    const had = roleOf(t.perms);
    if (!mayAppoint(who, had)) return deny();   // peers, anyone above, and oneself
    const changed = () => json({ error: 'changed' }, 409);
    if (p === '/admins/role' && had === want && !t.disabled_at) return json({ ok: true, role: want });
    if (p === '/admins/reset' && b.v != null && b.v !== verOf(t.link_hash)) return changed();
    const no = await stepUp(); if (no) return no;
    // every write repeats what was read, so someone promoted a moment ago is not touched from below;
    // and in the same batch every phone of that person is signed out
    const write = async (change, why) => (await env.SDB.batch([change, endDevices(env, 'admin', id, why)]))[0].meta.changes > 0;
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
      const c = await freshCredentials(env);
      const ok = await write(env.SDB.prepare("UPDATE reg_admin SET link_hash=?,pin_hash=?,pin_salt=?,pin_temp=1,fails=0,locked_until=NULL,stopped_at=NULL WHERE id=? AND perms=? AND COALESCE(link_hash,'')=? AND disabled_at IS NULL")
        .bind(c.link_hash, c.pin_hash, c.pin_salt, id, t.perms, t.link_hash || ''), 'reset');
      if (!ok) return changed();
      const link = personLink(env, c.key);
      return json({ ok: true, link, pin: c.pin, letter: had === 'chief' ? await mailChief(env, kit, ev, t.name, 'reset', c.key, true, false) : undefined });
    }
    if (p === '/admins/delete') {
      // check: a removed deputy knows the links they handed out, and may have seen temporary passwords
      if (!(await write(env.SDB.prepare('DELETE FROM reg_admin WHERE id=? AND perms=?').bind(id, t.perms), 'deleted'))) return changed();
      return json({ ok: true, check: had === 'deputy' && !t.disabled_at, mail_cleared: had === 'chief' ? await dropChiefMail(env, ev, who.name) : undefined });
    }
    return json({ error: 'not_found' }, 404);
  }
  if (p === '/asset' && req.method === 'POST') {
    if (!can(who, 'asset')) return deny();
    const name = str(b.name, 40), mime = str(b.mime, 40), data = String(b.b64 || '').replace(/^data:[^,]+,/, '');
    if (!/^[a-z0-9-]{2,40}$/.test(name) || !/^image\/(png|jpeg|webp|gif)$/.test(mime) || !data || data.length > 1.4e6) return json({ error: 'bad_asset' }, 400);
    await env.SDB.prepare('INSERT INTO reg_asset(name,mime,data,updated_at) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET mime=excluded.mime,data=excluded.data,updated_at=excluded.updated_at').bind(name, mime, data, nowIso()).run();
    return json({ ok: true, name });
  }
  if (p === '/act' && req.method === 'POST') {
    const a = String(b.action || '');
    if (can(who, 'list')) {
      if (!Object.hasOwn(ACT_NEEDS, a)) return json({ error: 'bad_action' }, 400);
      if (!can(who, ACT_NEEDS[a])) return deny();
      if (a === 'refund' || a === 'adjust') { const no = await stepUp(); if (no) return no; }   // 调整金额 like a refund: the password again
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
    return f(env, ev, b, json);
  }
  return json({ error: 'not_found' }, 404);
}
async function regsCsv(env, ev) {
  const rows = ((await env.SDB.prepare('SELECT * FROM reg WHERE event=? ORDER BY id').bind(ev.id).all()).results || []).map(r => ({ ...r, data: JSON.parse(r.data) }));
  // 调整金额: the sum (total already includes it) and the reasons, on the registration's first line
  const adj = {};
  for (const l of ((await env.SDB.prepare("SELECT l.reg_id,l.detail FROM reg_log l JOIN reg r ON r.id=l.reg_id WHERE r.event=? AND l.action='adjust' ORDER BY l.id").bind(ev.id).all()).results) || []) {
    try { const x = JSON.parse(JSON.parse(l.detail).text), a = adj[l.reg_id] = adj[l.reg_id] || { sum: 0, why: [] }; a.sum += Number(x.d) || 0; a.why.push((x.d > 0 ? '加收 ' : '减收 ') + Math.abs(Number(x.d) || 0) + ' ' + (x.why || '')); } catch { /* unreadable: left out */ }
  }
  const lines = [CSV_COLS.join(',')];
  for (const r of rows) r.data.people.forEach((pp, i) => {
    const ri = r.data.rooms.findIndex(x => x.guests.includes(i)), room = ri >= 0 ? r.data.rooms[ri] : null, pass = r.data.passports[i] || {}, a = adj[r.id];
    lines.push([r.code, r.status, bjTime(r.created_at), r.email, r.lang, i + 1, pp.name, pp.nick, pp.role, pp.country, pp.city, pp.country === 'CN' ? 1 : 0, pp.wechat, pp.facebook, pp.pkg, pp.items.join(' '), pp.amount,
      room ? ri + 1 : '', room ? room.type : '', room ? room.ci : '', room ? room.co : '', room ? room.nights : '', pass.s, pass.g, r.promo, r.promo_dj, i ? '' : r.amount, i ? '' : r.fee, i ? '' : r.refund, i ? '' : bjTime(r.due_at), i ? '' : bjTime(r.paid_at), i ? '' : r.note,
      i || !a ? '' : a.sum, i || !a ? '' : a.why.join('; ')].map(csvCell).join(','));
  });
  return lines.join('\n');
}
async function paymentsCsv(env, ev) {
  const rows = ((await env.SDB.prepare('SELECT p.*,r.code,r.email FROM reg_payment p JOIN reg r ON r.id=p.reg_id WHERE r.event=? ORDER BY p.id').bind(ev.id).all()).results) || [];
  return [['at', 'code', 'email', 'amount', 'method', 'collector', 'recorded_by', 'note'].join(',')].concat(rows.map(x => [bjTime(x.at), x.code, x.email, x.amount, x.method, x.collector, x.by_admin, x.note].map(csvCell).join(','))).join('\n');
}
const NEXT = { confirm: ['pending', 'waitlist'], waitlist: ['pending'], decline: ['pending', 'waitlist'], pay: ['confirmed', 'cash', 'paid'], refund: ['cancelled', 'paid'], cash: ['confirmed'], cancel: ['pending', 'confirmed', 'waitlist', 'paid', 'cash'], modify: ['pending', 'confirmed', 'waitlist', 'paid', 'cash'], adjust: ['pending', 'waitlist', 'confirmed', 'cash', 'paid'], note: null };
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
    // all refunds together never exceed what is due, nor what is still held.
    // A paid one (调整金额 took its total below what was paid, 2026-11-26): only what was paid above that total, while it stands.
    const pay = b.pay || {}, got = await moneyOf(env, reg.id), over = reg.status === 'paid';
    const due = over ? Math.max(0, got.sum - reg.amount) : Math.max(0, (reg.refund == null ? 0 : reg.refund) - got.out);
    const already = async () => json({ error: 'already_refunded', due, last: await lastPayment(env, reg.id, who, -1) }, 409);
    if ((over || got.out > 0) && (!due || (pay.seen != null && Number(pay.seen) !== due))) return already();
    const amount = pay.amount == null || pay.amount === '' ? due : Math.round(Number(pay.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > due || amount > got.sum) return json({ error: 'bad_amount', due: Math.min(due, Math.max(0, got.sum)) }, 400);
    const method = METHODS.includes(pay.method) ? pay.method : 'wechat', collector = str(pay.collector, 40) || who.name;
    const ok = await done(
      db.prepare('INSERT INTO reg_payment(reg_id,at,amount,method,collector,note,by_admin) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM reg_payment WHERE reg_id=?)=?' + (over ? " AND EXISTS (SELECT 1 FROM reg WHERE id=? AND status='paid' AND amount=?)" : ''))
        .bind(reg.id, ts, -amount, method, collector, str(pay.note, 300) || 'refund', who.name, reg.id, got.n, ...(over ? [reg.id, reg.amount] : [])),
      `${amount} ${method} by ${collector}`);
    if (!ok) return already();
    return json({ ok: true, refunded: got.out + amount, due: Math.max(0, due - amount) });
  }
  if (a === 'adjust') {
    // 调整金额 (Shiao, 2026-11-26): the 总管 adds to or takes off this one registration's total. Money only: what they
    // registered for stays (that is 修改报名), the price list stays locked, no handling fee. The reason (why) is told to
    // the registrant, the note stays inside. A part (registration or hotel) never goes below ¥0. Afterwards:
    //   paid, owing again        → 到场付款: the entry codes stay; the rest is paid before or at the door, as usual
    //   待付款 / 到场付款 covered → paid (the first time: the letter with the entry codes)
    //   paid above the new total → stays paid; the 总管 refunds the difference (refund, without cancelling)
    // Written only if nothing moved since it was read (status, total, payments): otherwise who did, and nothing changes.
    const x = b.adjust || {}, n = Math.round(Math.abs(Number(x.d))), delta = Number(x.d) < 0 ? -n : n;
    const part = x.part === 'hotel' ? 'hotel' : 'reg', why = str(x.why, 200), note = str(x.note, 200);
    if (!Number.isFinite(n) || n <= 0 || n > 1e6) return json({ error: 'bad_amount' }, 400);
    if (!why) return json({ error: 'need_why' }, 400);
    if (part === 'hotel' && !d.hotel) return json({ error: 'no_hotel' }, 400);
    if (b.seen != null && Number(b.seen) !== reg.amount) return late();   // the screen showed another total
    const base = part === 'hotel' ? reg.hotel_amount : reg.amount - reg.hotel_amount;
    if (base + delta < 0) return json({ error: 'bad_amount', max: base }, 400);
    const got = await moneyOf(env, reg.id);
    if (reg.status === 'paid' && !got.n) return json({ error: 'no_payments' }, 409);   // marked paid before the ledger: record the money first
    const amount = reg.amount + delta, hotel = reg.hotel_amount + (part === 'hotel' ? delta : 0);
    const status = reg.status === 'paid' && got.sum < amount ? 'cash' : (reg.status === 'confirmed' || reg.status === 'cash') && got.sum >= amount ? 'paid' : reg.status;
    const nowPaid = status === 'paid' && reg.status !== 'paid';
    let text = JSON.stringify({ d: delta, part, why, note, was: reg.amount });
    if (text.length > 700) text = JSON.stringify({ d: delta, part, why: why.slice(0, 120), note: '', was: reg.amount });   // the log keeps 700
    const ok = await done(
      db.prepare(`UPDATE reg SET amount=?,hotel_amount=?,status=?,paid_at=${nowPaid ? 'COALESCE(paid_at,?)' : 'paid_at'},updated_at=? WHERE id=? AND status=? AND amount=? AND (SELECT COUNT(*) FROM reg_payment WHERE reg_id=?)=?`)
        .bind(amount, hotel, status, ...(nowPaid ? [ts] : []), ts, reg.id, reg.status, reg.amount, reg.id, got.n),
      text);
    if (!ok) return late();
    const after = await db.prepare('SELECT * FROM reg WHERE id=?').bind(reg.id).first();
    const info = { d: delta, why, was: reg.amount, paid: got.sum, over: Math.max(0, got.sum - after.amount) };
    let mail;
    if (b.silent !== 1) {
      mail = await send(env, kit, after, 'adjust', { adj: info });
      if (nowPaid && !reg.paid_at && (await send(env, kit, after, 'paid')) === 'failed') mail = 'failed';   // covered the first time: the entry codes
    }
    return json({ ok: true, status: after.status, amount: after.amount, paid: got.sum, rest: Math.max(0, after.amount - got.sum), over: info.over, mail });
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
    // Refund only what was paid: everything minus the ¥50 fee (once). After the refund date (Beijing) nothing at all, hotel
    // included: one date for every part (Shiao, 2026-11-26; before that, only the hotel stopped on 6/11).
    let refund = null;
    const got = await moneyOf(env, reg.id), paid = got.sum, took = reg.status === 'paid' ? Math.max(paid, paid ? 0 : reg.amount) : paid;
    if (took > 0) refund = bjDate(ts) > ev.refundBy ? 0 : Math.max(0, took - ev.fee);   // the ¥50 fee is kept once, whether or not a change already charged it
    // the refund is worked out from the payments read just now; if one is recorded before this lands, the cancel is refused (S09)
    change = db.prepare("UPDATE reg SET status='cancelled',cancelled_at=?,refund=?,fee=CASE WHEN fee>0 THEN fee ELSE ? END,updated_at=? WHERE id=? AND status=? AND (SELECT COUNT(*) FROM reg_payment WHERE reg_id=?)=?")
      .bind(ts, refund, took > 0 ? ev.fee : 0, ts, reg.id, reg.status, reg.id, got.n);
  } else if (a === 'modify') {
    const r = evaluate({ ...b.data, event: ev.id, lang: reg.lang }, env, Date.parse(reg.created_at));   // promo judged at the original submit time
    if (r.error) return json(r, 400);
    // ¥50 only once money was received (Shiao, 2026-11-26): before payment (待审核, 候补, 已确认 or 到场付款 not yet paid) a
    // change is free; after it (paid, or paid in part) the first change carries the fee, once per registration.
    const got = await moneyOf(env, reg.id), took = reg.status === 'paid' ? Math.max(got.sum, got.sum ? 0 : reg.amount) : got.sum;
    const fee = reg.fee > 0 ? reg.fee : took > 0 ? ev.fee : 0;
    const seated = SEATED.includes(reg.status);
    if (seated) { const no = await full(env, ev, r.data, reg.id, json); if (no) return no; seats = r.data; }
    const m = withAdj(r.total + fee, r.hotel, await adjOf(env, reg.id));   // a 调整金额 made before stays
    // a paid one raised above what it paid: 到场付款, so the page and the door show the rest (the entry codes stay)
    const st = reg.status === 'paid' && got.n && got.sum < m.amount ? 'cash' : reg.status;
    change = db.prepare('UPDATE reg SET data=?,people=?,domestic=?,amount=?,hotel_amount=?,fee=?,promo=?,promo_dj=?,status=?,updated_at=? WHERE id=? AND status=? AND data=? AND (SELECT COUNT(*) FROM reg_payment WHERE reg_id=?)=?' + (seated ? ROOM_SQL : ''))
      .bind(JSON.stringify(r.data), r.data.people.length, r.domestic, m.amount, m.hotel, fee, r.promo.code || null, r.promo.dj || null, st, ts, reg.id, reg.status, reg.data, reg.id, got.n, ...(seated ? roomArgs(ev, r.data, reg.id) : []));
  }
  if (!(await done(change, b.note ? str(b.note, 500) : ''))) {   // and no letter from the one who was late
    // still as read: then what stopped it was the seats, taken a moment ago by someone else
    const now = await db.prepare('SELECT status,data FROM reg WHERE id=?').bind(reg.id).first();
    if (seats && now && now.status === reg.status && now.data === reg.data) { const no = await full(env, ev, seats, reg.id, json); if (no) return no; }
    return late();
  }
  let after = await db.prepare('SELECT * FROM reg WHERE id=?').bind(reg.id).first(), kind = a;
  // nothing to pay (调整金额 took the total to ¥0 while it waited): confirmed is paid at once, with the entry codes
  if (a === 'confirm' && after.status === 'confirmed' && after.amount <= 0) {
    await db.prepare("UPDATE reg SET status='paid',paid_at=COALESCE(paid_at,?),updated_at=? WHERE id=? AND status='confirmed' AND amount<=0").bind(ts, ts, reg.id).run();
    after = await db.prepare('SELECT * FROM reg WHERE id=?').bind(reg.id).first(); if (after.status === 'paid') kind = 'paid';
  }
  const mail = b.silent !== 1 ? await send(env, kit, after, kind) : undefined;
  return json({ ok: true, status: after.status, amount: after.amount, refund: after.refund, due: after.due_at, mail });
}

// Day-10 reminder for confirmed registrations that are still unpaid. Called from the 10-minute cron.
export async function regRemind(env, kit) {
  const out = { sent: 0 };
  for (const ev of Object.values(EVENTS)) {
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
const personLink = (env, key, m) => String(env.REG_SITE || 'https://tangoweekend.org').replace(/\/$/, '') + '/event/beijing-2027-tango-weekend/register/in/' + (m ? '?m=' + m : '') + '#' + key;
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
async function deviceWho(req, env, { again = false } = {}) {
  const m = /^dev:([0-9a-f]{64})$/.exec(bearer(req)); if (!m) return {};
  let d;
  try { d = await env.SDB.prepare('SELECT * FROM reg_device WHERE token_hash=?').bind(await sha256(m[1])).first(); }
  catch (e) { if (/no such table/i.test(String(e && e.message))) return {}; throw e; }
  if (!d) return {};
  if (d.ended_at) return { err: { error: 'signed_out', why: d.why, at: d.ended_at } };
  const row = await env.SDB.prepare(`SELECT * FROM ${TABLE[d.kind]} WHERE id=?`).bind(d.person).first();
  if (!row || row.disabled_at) return { err: { error: 'signed_out', why: 'deleted' } };
  if (row.stopped_at) return { err: { error: 'signed_out', why: 'stopped', at: row.stopped_at } };
  const role = roleOfRow(d.kind, row), ev = own(EVENTS, row.event);
  if (over(role, ev)) return { err: { error: 'signed_out', why: 'ended', at: ev.deskEnds } };
  const who = { kind: d.kind, id: row.id, event: row.event, name: row.name, since: row.created_at, role, dev: d.id, auth_at: d.auth_at };
  if (!again && due(role, d.auth_at)) return { err: { error: 'reauth', role, at: d.auth_at }, who };
  return { who };
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
    if (row) return { kind, row };
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
  const ev = found && own(EVENTS, found.row.event);
  if (!found || !ev) return json({ error: 'not_found' }, 404);   // reset, deleted, or never was
  const { kind, row } = found, role = roleOfRow(kind, row);
  const base = { name: row.name, role, event: ev.id, event_name: ev.name.zh, devices: DEVICES[role] || 1 };
  if (p === '/hello') {   // opening the link shows whose it is (Shiao, 2026-11-23); nothing else without the password
    const now = nowIso(), state = over(role, ev) ? 'ended' : row.stopped_at ? 'stopped' : row.locked_until && row.locked_until > now ? 'locked' : !row.pin_hash ? 'none' : row.pin_temp ? 'new' : 'ok';
    const mail_ok = b.m ? await mailOk(env, kind, row, b.m) : undefined;
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
      .bind(kind, cur.id, cur.event, await sha256(tok), now, now, cur.id, cur.link_hash),
    env.SDB.prepare("UPDATE reg_device SET ended_at=?,why='replaced' WHERE kind=? AND person=? AND ended_at IS NULL AND changes()>0 AND id NOT IN (SELECT id FROM reg_device WHERE kind=? AND person=? AND ended_at IS NULL ORDER BY id DESC LIMIT ?)")
      .bind(now, kind, cur.id, kind, cur.id, base.devices)]);
  if (!out[0].meta.changes) return json({ error: 'changed' }, 409);
  return json({ ok: true, ...base, token: 'dev:' + tok, home: role === 'desk' ? 'checkin' : 'admin', until: role === 'desk' ? ev.deskEnds : undefined, replaced: out[1].meta.changes || 0 });
}

// ---------- door check-in ----------
// Who may scan: a signed-in phone of this event (前台 included), or the platform admin.
async function doorWho(req, env) {
  const c = await callerOf(req, env);
  return c.who && !c.err ? { who: c.who } : c;
}
async function staffAdd(env, ev, b, json) {
  const name = str(b && b.name, 40); if (!name) return json({ error: 'need_name' }, 400);
  if (reserved(env, name)) return json({ error: 'name_reserved' }, 409);
  const c = await freshCredentials(env);
  const r = await env.SDB.prepare('INSERT INTO reg_staff(event,name,created_at,link_hash,pin_hash,pin_salt,pin_temp) SELECT ?,?,?,?,?,?,1 WHERE ' + NAME_FREE)
    .bind(ev.id, name, nowIso(), c.link_hash, c.pin_hash, c.pin_salt, ev.id, name, ev.id, name).run();
  if (!r.meta.changes) return json({ error: 'name_taken' }, 409);
  return json({ ok: true, id: r.meta.last_row_id, name, link: personLink(env, c.key), pin: c.pin });
}
// 「重设」: a new link and a new temporary password; the old ones and the phone stop at once. Of two resets at once, one wins.
async function staffReset(env, ev, b, json) {
  const st = await env.SDB.prepare('SELECT id,name,link_hash FROM reg_staff WHERE id=? AND event=? AND disabled_at IS NULL').bind(Number(b && b.id) || 0, ev.id).first(); if (!st) return json({ error: 'not_found' }, 404);
  if (b.v != null && b.v !== verOf(st.link_hash)) return json({ error: 'changed' }, 409);
  const c = await freshCredentials(env);
  const out = await env.SDB.batch([
    env.SDB.prepare("UPDATE reg_staff SET link_hash=?,pin_hash=?,pin_salt=?,pin_temp=1,fails=0,locked_until=NULL,stopped_at=NULL WHERE id=? AND COALESCE(link_hash,'')=? AND disabled_at IS NULL")
      .bind(c.link_hash, c.pin_hash, c.pin_salt, st.id, st.link_hash || ''),
    endDevices(env, 'staff', st.id, 'reset')]);
  if (!out[0].meta.changes) return json({ error: 'changed' }, 409);
  return json({ ok: true, id: st.id, name: st.name, link: personLink(env, c.key), pin: c.pin });
}
// Deleting is final: no history and no undo. What they checked in stays, under their name.
async function staffDelete(env, ev, b, json) {
  const id = Number(b && b.id) || 0;
  const out = await env.SDB.batch([env.SDB.prepare('DELETE FROM reg_staff WHERE id=? AND event=?').bind(id, ev.id), endDevices(env, 'staff', id, 'deleted')]);
  return out[0].meta.changes ? json({ ok: true }) : json({ error: 'not_found' }, 404);
}
export async function regDoor(req, env, url, b, json) {
  const p = url.pathname.slice('/social/reg/door'.length);
  if (p === '/activate') return json({ error: 'gone' }, 410);   // the one-time front-desk links ended 2026-11-23: personal link + password now
  const c = await doorWho(req, env);
  if (c.err) return json(c.err, 401);
  const who = c.who; if (!who) return json({ error: 'auth' }, 401);
  const ev = who.event ? own(EVENTS, who.event) : null;
  if (p === '/me' && req.method === 'GET') return json({ ok: true, name: who.name, role: who.role, admin: who.role !== 'desk', collect: can(who, 'collect'), until: who.role === 'desk' && ev ? ev.deskEnds : undefined });
  if (p === '/pass' && req.method === 'GET') return regPassInfo(env, url.searchParams.get('p'), json, who);
  if (p === '/checkin' && req.method === 'POST') return regCheckin(env, b, json, who);
  return json({ error: 'not_found' }, 404);
}

async function passContext(env, raw) {
  const p = await readPass(env, raw); if (!p) return { error: 'bad_pass' };
  const reg = await env.SDB.prepare('SELECT * FROM reg WHERE code=?').bind(p.code).first();
  if (!reg) return { error: 'bad_pass' };
  const d = JSON.parse(reg.data), person = d.people[p.idx]; if (!person) return { error: 'bad_pass' };
  return { p, reg, d, person };
}
export async function regPassInfo(env, raw, json, who) {
  const x = await passContext(env, raw); if (x.error) return json(x, 404);
  if (who && who.event && who.event !== x.reg.event) return json({ error: 'bad_pass' }, 404);
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
export async function regCheckin(env, b, json, who) {
  const x = await passContext(env, b && b.p); if (x.error) return json(x, 404);
  if (who && who.event && who.event !== x.reg.event) return json({ error: 'bad_pass' }, 404);
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
