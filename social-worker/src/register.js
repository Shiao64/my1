// Event registration: Beijing Select Tango Weekend 2027 (bj2027). Mounted under /social/* by social.js.
//
// Public
//   GET  /social/reg/left?event=bj2027        -> {left:{M1:280,...}}  seats left; events without a cap are left out
//   GET  /social/reg/me?event=bj2027 (Bearer) -> {email, reg:{code,status}|null}
//   POST /social/reg (Bearer subscriber)      -> {ok, code, total}   new form, or update of a still-pending one
//   GET  /social/reg/qr/<name>?k=KEY          -> payment QR image used inside the confirmation letter
// Organizer (Bearer ADMIN_TOKEN)
//   GET  /social/admin/reg?event=bj2027[&format=csv] -> list + summary
//   POST /social/admin/reg/act {id, action, note?, data?}  confirm|waitlist|decline|paid|cash|cancel|modify|note
//   POST /social/admin/reg/asset {name, mime, b64}         upload a payment QR
//   Organizer page: /event/beijing-2027-tango-weekend/register/admin/ (static, asks for the token)
//
// Safety: until REG_LIVE=1, every registration letter goes to REG_TEST_INBOX (default selecttango@gmail.com).

export const EVENTS = {
  bj2027: {
    id: 'bj2027', prefix: 'BJ27', name: { en: 'Beijing Select Tango Weekend 2027', zh: '北京精选探戈周末 2027' },
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
    hotelRefundBy: '2027-06-11', fee: 50, payDays: 14, remindDay: 10, maxPeople: 6
  }
};
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
function nights(ci, co) { const n = Math.round((Date.parse(co + 'T00:00:00Z') - Date.parse(ci + 'T00:00:00Z')) / 864e5); return n > 0 ? n : 0; }

// Validate a submitted form and compute every amount. Returns {error} or {data, total, hotel, domestic, promo}.
export function evaluate(b, env, at = Date.now()) {
  const ev = EVENTS[str(b && b.event, 20)];
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
    const pkg = ev.pkgs[p.pkg] ? p.pkg : '';
    const picked = (Array.isArray(p.items) ? p.items : []).map(k => k2c[k] || (ev.items[k] ? k : '')).filter(Boolean);
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
      const type = ev.rooms[r && r.type] ? r.type : '';
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

async function log(env, id, action, detail) { await env.SDB.prepare('INSERT INTO reg_log(reg_id,at,action,detail) VALUES(?,?,?,?)').bind(id, nowIso(), action, detail ? String(detail).slice(0, 1000) : null).run(); }
async function nextCode(env, ev) {
  const r = await env.SDB.prepare('SELECT COUNT(*) n FROM reg WHERE event=?').bind(ev.id).first();
  for (let n = (r && r.n || 0) + 1; ; n++) { const c = ev.prefix + '-' + String(n).padStart(4, '0');
    if (!(await env.SDB.prepare('SELECT 1 FROM reg WHERE code=?').bind(c).first())) return c; }
}

// ---------- letters ----------
const T = {
  en: { hi: 'Hi {n},', sign: 'Shiao Chang & Liu Zheng\nBeijing Select Tango Weekend', total: 'Total', hotel: 'Hotel', nights: 'nights', details: 'Your registration',
    recvS: 'Registration received · {c}', recv: 'We have received your registration {c}. We will review it and reply within 10 days.',
    confS: 'Registration confirmed · {c}', conf: 'Your registration {c} is confirmed.',
    pay: 'Please pay {t} by {d} (within 2 weeks of this email) by WeChat Pay or Alipay, using the QR code below. Write your registration number {c} in the transfer note, then reply to this email with a screenshot of the payment.',
    noApp: 'If you cannot use WeChat Pay or Alipay, reply to this email with a screenshot of your flight ticket instead; you can then pay in cash at the event.',
    rules: 'Changes, additions and cancellations: ¥50 handling fee, charged once per registration. If you cannot attend, we refund your payment minus ¥50. Hotel charges are refunded only for cancellations on or before June 11, 2027. Places cannot be passed to another person.',
    waitS: 'Waiting list · {c}', wait: 'Your registration {c} is on the waiting list. We will email you as soon as a place opens.',
    declS: 'Registration · {c}', decl: 'We are sorry, we cannot accept your registration {c} this time. Thank you for your interest.',
    remS: 'Payment reminder · {c}', rem: 'A friendly reminder: payment for {c} ({t}) is due by {d}.',
    paidS: 'Payment received · {c}', paid: 'We have received your payment for {c}. Your registration is complete. See you in Beijing!',
    cashS: 'Pay at the event · {c}', cash: 'We have received your flight ticket for {c}. Please pay {t} in cash at the event.',
    cancS: 'Registration cancelled · {c}', canc: 'Your registration {c} has been cancelled.', refund: 'Refund: {r}.',
    updS: 'Registration updated · {c}', upd: 'Your registration {c} has been updated. The ¥50 handling fee is included in the total.' },
  zh: { hi: '{n}，你好：', sign: '张孝、刘峥\n北京精选探戈周末', total: '合计', hotel: '住宿', nights: '晚', details: '你的报名',
    recvS: '已收到报名 · {c}', recv: '我们已收到你的报名 {c}，审核后会在 10 天内回复。',
    confS: '报名确认 · {c}', conf: '你的报名 {c} 已确认。',
    pay: '请在 {d} 前（收到本信后 2 周内）用微信或支付宝扫下方收款码支付 {t}，转账备注请写报名编号 {c}，付款后回复本邮件并附上付款截图。',
    noApp: '如无法使用微信、支付宝，请回复本邮件并附上机票截图，即可到场付现金。',
    rules: '报名后改动、增加、取消，每份报名收一次手续费 ¥50。如无法出席，可退费，扣除手续费 ¥50。房费在 2027年6月11日（含）前取消可退，之后不退。参加资格仅限报名者本人，不能换人。',
    waitS: '候补名单 · {c}', wait: '你的报名 {c} 目前在候补名单上，有名额时我们会立即通知你。',
    declS: '报名结果 · {c}', decl: '很抱歉，这次无法接受你的报名 {c}。谢谢你的关注。',
    remS: '付款提醒 · {c}', rem: '提醒你：报名 {c} 的款项 {t} 请在 {d} 前支付。',
    paidS: '已收到付款 · {c}', paid: '已收到报名 {c} 的付款，报名完成。北京见！',
    cashS: '到场付现 · {c}', cash: '已收到报名 {c} 的机票截图，请到场以现金支付 {t}。',
    cancS: '报名已取消 · {c}', canc: '你的报名 {c} 已取消。', refund: '退款：{r}。',
    updS: '报名已更新 · {c}', upd: '你的报名 {c} 已更新，合计已含手续费 ¥50。' },
  ko: { hi: '{n} 님, 안녕하세요.', sign: 'Shiao Chang & Liu Zheng\nBeijing Select Tango Weekend', total: '합계', hotel: '호텔', nights: '박', details: '신청 내역',
    recvS: '신청 접수 · {c}', recv: '신청 {c}이(가) 접수되었습니다. 검토 후 10일 이내에 답장드리겠습니다.',
    confS: '신청 확정 · {c}', conf: '신청 {c}이(가) 확정되었습니다.',
    pay: '{d}까지(이 메일을 받은 후 2주 이내) 아래 QR 코드로 위챗페이 또는 알리페이로 {t}을(를) 결제해 주세요. 송금 메모에 신청 번호 {c}를 적고, 결제 후 이 메일에 결제 캡처를 첨부해 회신해 주세요.',
    noApp: '위챗페이/알리페이를 사용할 수 없다면 항공권 캡처를 회신해 주세요. 현장에서 현금으로 결제할 수 있습니다.',
    rules: '신청 후 변경·추가·취소 시 신청 건당 ¥50 수수료가 한 번 부과됩니다. 참가할 수 없게 되면 ¥50을 제외하고 환불합니다. 호텔 요금은 2027년 6월 11일(포함)까지 취소 시에만 환불됩니다. 다른 사람으로 바꿀 수 없습니다.',
    waitS: '대기자 명단 · {c}', wait: '신청 {c}은(는) 대기자 명단에 있습니다. 자리가 나면 바로 알려드리겠습니다.',
    declS: '신청 결과 · {c}', decl: '죄송하지만 이번에는 신청 {c}을(를) 받을 수 없습니다. 관심 가져 주셔서 감사합니다.',
    remS: '결제 안내 · {c}', rem: '신청 {c}의 결제({t}) 기한은 {d}입니다.',
    paidS: '결제 확인 · {c}', paid: '신청 {c}의 결제를 확인했습니다. 신청이 완료되었습니다. 베이징에서 만나요!',
    cashS: '현장 결제 · {c}', cash: '신청 {c}의 항공권을 확인했습니다. 현장에서 현금으로 {t}을(를) 결제해 주세요.',
    cancS: '신청 취소 · {c}', canc: '신청 {c}이(가) 취소되었습니다.', refund: '환불: {r}.',
    updS: '신청 변경 · {c}', upd: '신청 {c}이(가) 변경되었습니다. 합계에 수수료 ¥50이 포함되어 있습니다.' },
  es: { hi: 'Hola, {n}:', sign: 'Shiao Chang y Liu Zheng\nBeijing Select Tango Weekend', total: 'Total', hotel: 'Hotel', nights: 'noches', details: 'Tu inscripción',
    recvS: 'Inscripción recibida · {c}', recv: 'Hemos recibido tu inscripción {c}. La revisaremos y te responderemos en 10 días.',
    confS: 'Inscripción confirmada · {c}', conf: 'Tu inscripción {c} está confirmada.',
    pay: 'Paga {t} antes del {d} (2 semanas desde este email) con WeChat Pay o Alipay usando el código QR de abajo. Escribe tu número {c} en la nota de la transferencia y responde a este email con una captura del pago.',
    noApp: 'Si no puedes usar WeChat Pay ni Alipay, responde con una captura de tu billete de avión; así podrás pagar en efectivo en el evento.',
    rules: 'Cambios, añadidos y cancelaciones: cargo de ¥50, una sola vez por inscripción. Si no puedes asistir, devolvemos lo pagado menos ¥50. El hotel solo se reembolsa si cancelas hasta el 11 de junio de 2027. La plaza no se puede ceder a otra persona.',
    waitS: 'Lista de espera · {c}', wait: 'Tu inscripción {c} está en lista de espera. Te escribiremos en cuanto haya plaza.',
    declS: 'Inscripción · {c}', decl: 'Lo sentimos, esta vez no podemos aceptar tu inscripción {c}. Gracias por tu interés.',
    remS: 'Recordatorio de pago · {c}', rem: 'Recordatorio: el pago de {c} ({t}) vence el {d}.',
    paidS: 'Pago recibido · {c}', paid: 'Hemos recibido el pago de {c}. Tu inscripción está completa. ¡Nos vemos en Pekín!',
    cashS: 'Pago en el evento · {c}', cash: 'Hemos recibido tu billete de avión para {c}. Paga {t} en efectivo en el evento.',
    cancS: 'Inscripción cancelada · {c}', canc: 'Tu inscripción {c} ha sido cancelada.', refund: 'Reembolso: {r}.',
    updS: 'Inscripción actualizada · {c}', upd: 'Tu inscripción {c} ha sido actualizada. El total incluye el cargo de ¥50.' },
  ru: { hi: 'Здравствуйте, {n}!', sign: 'Shiao Chang и Liu Zheng\nBeijing Select Tango Weekend', total: 'Итого', hotel: 'Отель', nights: 'ноч.', details: 'Ваша регистрация',
    recvS: 'Регистрация получена · {c}', recv: 'Мы получили вашу регистрацию {c}. Проверим её и ответим в течение 10 дней.',
    confS: 'Регистрация подтверждена · {c}', conf: 'Ваша регистрация {c} подтверждена.',
    pay: 'Оплатите {t} до {d} (в течение 2 недель после этого письма) через WeChat Pay или Alipay по QR-коду ниже. Укажите номер {c} в комментарии к переводу и ответьте на это письмо со скриншотом оплаты.',
    noApp: 'Если не можете пользоваться WeChat Pay или Alipay, пришлите в ответ скриншот авиабилета — тогда оплата наличными на месте.',
    rules: 'Изменения, добавления и отмена: сбор ¥50, один раз за регистрацию. Если вы не сможете приехать, вернём оплату за вычетом ¥50. Отель возвращается только при отмене до 11 июня 2027 включительно. Место нельзя передать другому человеку.',
    waitS: 'Лист ожидания · {c}', wait: 'Ваша регистрация {c} в листе ожидания. Напишем, как только освободится место.',
    declS: 'Регистрация · {c}', decl: 'К сожалению, в этот раз мы не можем принять регистрацию {c}. Спасибо за интерес.',
    remS: 'Напоминание об оплате · {c}', rem: 'Напоминаем: оплата {c} ({t}) до {d}.',
    paidS: 'Оплата получена · {c}', paid: 'Мы получили оплату {c}. Регистрация завершена. До встречи в Пекине!',
    cashS: 'Оплата на месте · {c}', cash: 'Мы получили авиабилет для {c}. Оплатите {t} наличными на месте.',
    cancS: 'Регистрация отменена · {c}', canc: 'Ваша регистрация {c} отменена.', refund: 'Возврат: {r}.',
    updS: 'Регистрация изменена · {c}', upd: 'Ваша регистрация {c} изменена. В итог включён сбор ¥50.' }
};
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
export function letter(kind, reg, env) {
  const d = typeof reg.data === 'string' ? JSON.parse(reg.data) : reg.data;
  const lang = T[reg.lang] ? reg.lang : 'en', L = T[lang];
  const v = { n: d.people[0] && d.people[0].name, c: reg.code, t: fmt(reg.amount), d: reg.due_at ? reg.due_at.slice(0, 10) : '', r: fmt(reg.refund || 0) };
  const body = [fill(L.hi, v), '', fill(L[kind], v)];
  if (kind === 'canc' && reg.refund != null) body.push(fill(L.refund, v));
  if (['recv', 'conf', 'upd'].includes(kind)) { const colon = lang === 'zh' ? '：' : ': ';
    body.push('', L.details + colon.trim(), ...detailLines(d, lang).map(s => '· ' + s));
    if (reg.fee) body.push('· ' + (lang === 'zh' ? '手续费' : 'Fee') + ' — ' + fmt(reg.fee)); body.push(L.total + colon + fmt(reg.amount)); }
  if (kind === 'conf' || kind === 'upd' || kind === 'rem') body.push('', fill(L.pay, v), L.noApp);
  if (kind === 'conf' || kind === 'upd') body.push('', L.rules);
  body.push('', L.sign);
  const text = body.join('\n');
  let html = '';
  if (kind === 'conf' || kind === 'upd' || kind === 'rem') {
    const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
    const names = (reg.domestic ? env.REG_QR_CN : env.REG_QR_INTL) || (reg.domestic ? 'cn-wechat,cn-alipay' : 'intl-wechat,intl-alipay');
    const imgs = String(names).split(',').map(s => s.trim()).filter(Boolean)
      .map(n => `<img src="${he(base)}/social/reg/qr/${encodeURIComponent(n)}?k=${encodeURIComponent(env.REG_QR_KEY || '')}" alt="${he(n)}" width="220" style="margin:6px;border:1px solid #e7d3b0;border-radius:8px">`).join('');
    html = `<!doctype html><html><body style="font-family:Georgia,serif;color:#2a1a14;background:#fbf5e9;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7d3b0;border-radius:12px;padding:20px">` +
      he(text).replace(/\n/g, '<br>') + `<div style="margin-top:14px">${imgs}</div></div></body></html>`;
  }
  return { subject: fill(L[kind + 'S'], v), text, html };
}
const KIND = { recv: 'recv', confirm: 'conf', waitlist: 'wait', decline: 'decl', remind: 'rem', paid: 'paid', cash: 'cash', cancel: 'canc', modify: 'upd' };

async function send(env, kit, reg, action) {
  const kind = KIND[action]; if (!kind) return;
  const m = letter(kind === 'canc' ? 'canc' : kind, reg, env);
  // Test stage: every registration letter goes to the test inbox until REG_LIVE=1.
  const live = env.REG_LIVE === '1', to = live ? reg.email : (env.REG_TEST_INBOX || 'selecttango@gmail.com');
  const subject = (live ? '' : '[TEST → ' + reg.email + '] ') + m.subject;
  try { await kit.deliver(env, to, subject, m.text, m.html || undefined, undefined, { fromName: 'Beijing Select Tango Weekend', replyTo: env.REG_REPLY_TO || 'info@tangoweekend.org' }); await log(env, reg.id, 'mail:' + action, to); }
  catch (e) { await log(env, reg.id, 'mail_failed:' + action, String(e && e.message || e)); }
}
async function notifyOwner(env, kit, reg) {
  const to = env.REG_NOTIFY || 'selecttango@gmail.com', d = JSON.parse(reg.data);
  const text = [`New registration ${reg.code} (${reg.people} people${reg.domestic ? ', domestic' : ''})`, `${reg.email} · ${reg.lang}`, ...detailLines(d, 'zh'), `合计 ${fmt(reg.amount)}`, d.promo && d.promo.code ? `码 ${d.promo.code}${d.promo.dj ? ' (' + d.promo.dj + ')' : ''}` : '', d.msg ? '留言：' + d.msg : ''].filter(Boolean).join('\n');
  try { await kit.deliver(env, to, '新报名 ' + reg.code, text, undefined, undefined, { fromName: 'Registration' }); } catch (e) { console.log('reg owner mail', String(e && e.message || e).slice(0, 120)); }
}

// ---------- public handlers ----------
export async function regLeft(url, env, json) {
  const ev = EVENTS[url.searchParams.get('event') || 'bj2027'];
  if (!ev) return json({ error: 'bad_event' }, 400);
  return json({ left: await seatsLeft(env, ev) });
}
export async function regMe(req, env, url, json, kit) {
  const u = await kit.user(req, env); if (!u) return json({ error: 'auth' }, 401);
  const ev = EVENTS[url.searchParams.get('event') || 'bj2027']; if (!ev) return json({ error: 'bad_event' }, 400);
  const r = await env.SDB.prepare('SELECT code,status FROM reg WHERE event=? AND email=? AND status<>\'cancelled\' ORDER BY id DESC LIMIT 1').bind(ev.id, String(u.email).toLowerCase()).first();
  return json({ email: u.email, name: u.name, reg: r || null });
}
export async function regSubmit(req, env, b, json, kit) {
  const u = await kit.user(req, env);
  if (!u) return json({ error: 'need_subscribe' }, 401);
  const email = String(u.email || '').toLowerCase();
  if (!EMAIL_STRICT.test(email)) return json({ error: 'need_email_subscribe' }, 403);
  if (b && b.website) return json({ ok: true });   // honeypot
  const r = evaluate(b, env);
  if (r.error) return json(r, 400);
  const ex = await env.SDB.prepare("SELECT * FROM reg WHERE event=? AND email=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1").bind(r.ev.id, email).first();
  if (ex && ex.status !== 'pending') return json({ error: 'exists', code: ex.code, status: ex.status }, 409);
  const ts = nowIso(), data = JSON.stringify(r.data);
  let reg;
  if (ex) {
    await env.SDB.prepare('UPDATE reg SET lang=?,domestic=?,people=?,data=?,amount=?,hotel_amount=?,promo=?,promo_dj=?,updated_at=? WHERE id=?')
      .bind(r.lang, r.domestic, r.data.people.length, data, r.total, r.hotel, r.promo.code || null, r.promo.dj || null, ts, ex.id).run();
    reg = await env.SDB.prepare('SELECT * FROM reg WHERE id=?').bind(ex.id).first();
    await log(env, reg.id, 'resubmit');
  } else {
    const code = await nextCode(env, r.ev);
    const ins = await env.SDB.prepare('INSERT INTO reg(event,code,user_id,email,lang,status,domestic,people,data,amount,hotel_amount,promo,promo_dj,created_at,updated_at) VALUES(?,?,?,?,?,\'pending\',?,?,?,?,?,?,?,?,?)')
      .bind(r.ev.id, code, u.id, email, r.lang, r.domestic, r.data.people.length, data, r.total, r.hotel, r.promo.code || null, r.promo.dj || null, ts, ts).run();
    reg = await env.SDB.prepare('SELECT * FROM reg WHERE id=?').bind(ins.meta.last_row_id).first();
    await log(env, reg.id, 'submit');
  }
  await send(env, kit, reg, 'recv');
  await notifyOwner(env, kit, reg);
  return json({ ok: true, code: reg.code, total: reg.amount, updated: !!ex, promo: r.promo.kind });
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
function adminOK(req, env) { const a = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''); return !!env.ADMIN_TOKEN && a.length >= 24 && a === env.ADMIN_TOKEN; }
const CSV_COLS = ['code', 'status', 'created', 'email', 'lang', 'person', 'name', 'nick', 'role', 'country', 'city', 'domestic', 'wechat', 'facebook', 'package', 'items', 'person_amount', 'room', 'room_type', 'check_in', 'check_out', 'nights', 'passport_surname', 'passport_given', 'promo', 'promo_dj', 'total', 'fee', 'refund', 'due', 'paid_at', 'note'];
const csvCell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export async function regAdmin(req, env, url, b, json, kit) {
  if (!adminOK(req, env)) return json({ error: 'auth' }, 401);
  const p = url.pathname.slice('/social/admin/reg'.length);
  const ev = EVENTS[(b && b.event) || url.searchParams.get('event') || 'bj2027'];
  if (!ev) return json({ error: 'bad_event' }, 400);
  if (p === '' && req.method === 'GET') {
    const rows = ((await env.SDB.prepare('SELECT * FROM reg WHERE event=? ORDER BY id').bind(ev.id).all()).results || []).map(r => ({ ...r, data: JSON.parse(r.data) }));
    if (url.searchParams.get('format') === 'csv') {
      const lines = [CSV_COLS.join(',')];
      for (const r of rows) r.data.people.forEach((pp, i) => {
        const ri = r.data.rooms.findIndex(x => x.guests.includes(i)), room = ri >= 0 ? r.data.rooms[ri] : null, pass = r.data.passports[i] || {};
        lines.push([r.code, r.status, r.created_at.slice(0, 16), r.email, r.lang, i + 1, pp.name, pp.nick, pp.role, pp.country, pp.city, pp.country === 'CN' ? 1 : 0, pp.wechat, pp.facebook, pp.pkg, pp.items.join(' '), pp.amount,
          room ? ri + 1 : '', room ? room.type : '', room ? room.ci : '', room ? room.co : '', room ? room.nights : '', pass.s, pass.g, r.promo, r.promo_dj, i ? '' : r.amount, i ? '' : r.fee, i ? '' : r.refund, i ? '' : r.due_at, i ? '' : r.paid_at, i ? '' : r.note].map(csvCell).join(','));
      });
      return new Response('﻿' + lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${ev.id}-registrations.csv"`, 'Cache-Control': 'no-store' } });
    }
    const left = await seatsLeft(env, ev), roles = { leader: 0, follower: 0, both: 0 }, counts = {};
    let overdue = 0; const t = Date.now();
    for (const r of rows) { counts[r.status] = (counts[r.status] || 0) + 1;
      if (SEATED.includes(r.status)) r.data.people.forEach(pp => roles[pp.role]++);
      if (r.status === 'confirmed' && r.due_at && Date.parse(r.due_at) < t) { r.overdue = true; overdue++; } }
    const caps = Object.fromEntries(Object.entries(ev.items).filter(([, it]) => it.cap).map(([c, it]) => [c, it.cap]));
    return json({ event: ev.id, left, caps, roles, counts, overdue, rows });
  }
  if (p === '/asset' && req.method === 'POST') {
    const name = str(b.name, 40), mime = str(b.mime, 40), data = String(b.b64 || '').replace(/^data:[^,]+,/, '');
    if (!/^[a-z0-9-]{2,40}$/.test(name) || !/^image\/(png|jpeg|webp|gif)$/.test(mime) || !data || data.length > 1.4e6) return json({ error: 'bad_asset' }, 400);
    await env.SDB.prepare('INSERT INTO reg_asset(name,mime,data,updated_at) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET mime=excluded.mime,data=excluded.data,updated_at=excluded.updated_at').bind(name, mime, data, nowIso()).run();
    return json({ ok: true, name });
  }
  if (p === '/act' && req.method === 'POST') return regAct(env, b, json, kit, ev);
  return json({ error: 'not_found' }, 404);
}
const NEXT = { confirm: ['pending', 'waitlist'], waitlist: ['pending'], decline: ['pending', 'waitlist'], paid: ['confirmed', 'cash'], cash: ['confirmed'], cancel: ['pending', 'confirmed', 'waitlist', 'paid', 'cash'], modify: ['pending', 'confirmed', 'waitlist', 'paid', 'cash'], note: null };
export async function regAct(env, b, json, kit, ev) {
  const reg = await env.SDB.prepare('SELECT * FROM reg WHERE id=? AND event=?').bind(Number(b.id) || 0, ev.id).first();
  if (!reg) return json({ error: 'not_found' }, 404);
  const a = String(b.action || '');
  if (!(a in NEXT)) return json({ error: 'bad_action' }, 400);
  if (NEXT[a] && !NEXT[a].includes(reg.status)) return json({ error: 'bad_state', status: reg.status }, 409);
  const ts = nowIso(), d = JSON.parse(reg.data);
  if (a === 'note') { await env.SDB.prepare('UPDATE reg SET note=?,updated_at=? WHERE id=?').bind(str(b.note, 2000), ts, reg.id).run(); return json({ ok: true }); }
  if (a === 'confirm') {
    const left = await seatsLeft(env, ev, reg.id), n = need(d);
    for (const [c, k] of Object.entries(n)) if (left[c] != null && k > left[c]) return json({ error: 'full', item: c, left: left[c], need: k }, 409);
    const due = new Date(Date.now() + ev.payDays * 864e5).toISOString();
    await env.SDB.prepare("UPDATE reg SET status='confirmed',confirmed_at=?,due_at=?,reminded_at=NULL,updated_at=? WHERE id=?").bind(ts, due, ts, reg.id).run();
  } else if (a === 'waitlist' || a === 'decline') {
    await env.SDB.prepare('UPDATE reg SET status=?,updated_at=? WHERE id=?').bind(a === 'waitlist' ? 'waitlist' : 'declined', ts, reg.id).run();
  } else if (a === 'paid' || a === 'cash') {
    await env.SDB.prepare('UPDATE reg SET status=?,paid_at=?,updated_at=? WHERE id=?').bind(a, a === 'paid' ? ts : reg.paid_at, ts, reg.id).run();
  } else if (a === 'cancel') {
    // Refund only what was paid: everything minus the ¥50 fee (once), minus hotel after the hotel refund date.
    let refund = null;
    if (reg.status === 'paid') {
      const late = ts.slice(0, 10) > ev.hotelRefundBy;
      refund = Math.max(0, reg.amount - ev.fee - (late ? reg.hotel_amount : 0));   // the ¥50 fee is kept once, whether or not a change already charged it
    }
    await env.SDB.prepare("UPDATE reg SET status='cancelled',cancelled_at=?,refund=?,fee=CASE WHEN fee>0 THEN fee ELSE ? END,updated_at=? WHERE id=?").bind(ts, refund, reg.status === 'paid' ? ev.fee : 0, ts, reg.id).run();
  } else if (a === 'modify') {
    const r = evaluate({ ...b.data, event: ev.id, lang: reg.lang }, env, Date.parse(reg.created_at));   // promo judged at the original submit time
    if (r.error) return json(r, 400);
    const fee = reg.status === 'pending' ? reg.fee : ev.fee;   // changes after review carry the ¥50 fee, once
    if (SEATED.includes(reg.status)) {
      const left = await seatsLeft(env, ev, reg.id), n = need(r.data);
      for (const [c, k] of Object.entries(n)) if (left[c] != null && k > left[c]) return json({ error: 'full', item: c, left: left[c], need: k }, 409);
    }
    await env.SDB.prepare('UPDATE reg SET data=?,people=?,domestic=?,amount=?,hotel_amount=?,fee=?,promo=?,promo_dj=?,updated_at=? WHERE id=?')
      .bind(JSON.stringify(r.data), r.data.people.length, r.domestic, r.total + fee, r.hotel, fee, r.promo.code || null, r.promo.dj || null, ts, reg.id).run();
  }
  await log(env, reg.id, a, b.note ? str(b.note, 500) : '');
  const after = await env.SDB.prepare('SELECT * FROM reg WHERE id=?').bind(reg.id).first();
  if (b.silent !== 1) await send(env, kit, after, a);
  return json({ ok: true, status: after.status, amount: after.amount, refund: after.refund, due: after.due_at });
}

// Day-10 reminder for confirmed registrations that are still unpaid. Called from the 10-minute cron.
export async function regRemind(env, kit) {
  const out = { sent: 0 };
  for (const ev of Object.values(EVENTS)) {
    const cutoff = new Date(Date.now() - ev.remindDay * 864e5).toISOString();
    const rows = (await env.SDB.prepare("SELECT * FROM reg WHERE event=? AND status='confirmed' AND reminded_at IS NULL AND confirmed_at<=? LIMIT 20").bind(ev.id, cutoff).all()).results || [];
    for (const r of rows) { await env.SDB.prepare('UPDATE reg SET reminded_at=? WHERE id=? AND reminded_at IS NULL').bind(nowIso(), r.id).run(); await send(env, kit, r, 'remind'); out.sent++; }
  }
  return out;
}
