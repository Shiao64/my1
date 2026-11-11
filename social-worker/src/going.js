// Star intent. Profile verify is separate from organizer mail.
// A menu profile confirm never emails an organizer.
// Everyone else only saves. A single Going/Interested letter is sent only when
// GOING_TEST_SEND=on and GOING_TEST_DANCER is this visitor. Both unset means no letter.
// That letter is not the digest and does not turn on GOING_DIGEST_SEND or GOING_NOTICE_SEND.
// GOING_DIGEST_SEND stays off and no live cron calls the digest, so the summary does not send.
// Stats drafts are written for review. This module never sends them.
const PROFILE_MS = 30 * 60e3;
const DAY = 24 * 3600e3;
const CC_DEFAULT = 'selecttango@gmail.com';
const LETTER_CC = 'guazong@mail.grokbot.com';
const IP_LETTER_CAP = 12;
const ROLES = ['leader', 'follower', 'both'];
const INTENTS = ['going', 'interested', 'absent'];
const DELETE_NOTE = '\n要删除资料，请回信到 selecttango@gmail.com\nTo delete your information, reply to selecttango@gmail.com\n';
const EXPIRED = '链接已过期。请回到页面，再次点五角星，即可收到一封新邮件。 / This link has expired. Go back and tap the star again to get a new email.';
const INVALID = '链接无效。请重新请求验证邮件。 / This link is invalid. Request a new verification email.';
let cardCache = null;

function pickEmail(raw, EMAIL_RE) {
  const found = String(raw || '').toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [];
  for (const p of found) if (EMAIL_RE.test(p)) return p;
  return '';
}
function normCode(code) {
  const m = String(code || '').toUpperCase().match(/O\d+/);
  return m ? m[0] : '';
}
function codesOf(value) {
  const text = Array.isArray(value) ? value.map(v => String(v || '')).join(' ') : String(value || '');
  const out = [];
  for (const code of text.match(/O\d+/gi) || []) {
    const id = code.toUpperCase();
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
function readDirPart(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw)); }
  catch { return null; }
}
function orgDirectory(env) {
  const cards = {}, orgs = {}, links = {}, names = {};
  const keys = ['GOING_ORG_DIR'];
  for (let i = 2; i <= 8; i++) keys.push('GOING_ORG_DIR_' + i);
  for (const key of keys) {
    const d = readDirPart(env && env[key]);
    if (!d || typeof d !== 'object' || Array.isArray(d)) continue;
    for (const [id, value] of Object.entries(d.cards || {})) if (id && cards[id] == null) cards[id] = value;
    for (const [code, value] of Object.entries(d.orgs || {})) {
      const id = normCode(code);
      if (id && orgs[id] == null) orgs[id] = value;
    }
    for (const [code, value] of Object.entries(d.names || {})) {
      const id = normCode(code);
      if (id && names[id] == null) names[id] = value;
    }
    for (const [id, value] of Object.entries(d.links || {})) if (id) links[id] = (links[id] || []).concat(codesOf(value));
  }
  for (const id of Object.keys(links)) {
    const out = [];
    for (const code of links[id]) if (!out.includes(code)) out.push(code);
    links[id] = out;
  }
  return { cards, orgs, links, names };
}
function usableEmail(raw, kit) {
  const email = pickEmail(raw, kit.EMAIL_RE);
  if (!email || email === CC_DEFAULT) return '';
  return email;
}
export function organizerAddress(card, env, kit) {
  const pub = usableEmail(card && card.email, kit);
  if (pub) return pub;
  const dir = orgDirectory(env);
  const id = card && card.id;
  const direct = usableEmail(dir.cards[id], kit);
  if (direct) return direct;
  const codes = Array.isArray(dir.links[id]) ? dir.links[id] : [];
  for (const code of codes) {
    if (!/^O\d+$/.test(String(code || ''))) continue;
    const email = usableEmail(dir.orgs[code], kit);
    if (email) return email;
  }
  return '';
}
function oneLine(clean, s, n) { return clean(s, n).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function roleOf(v) { return ROLES.includes(v) ? v : ''; }
function intentOf(v) { return INTENTS.includes(v) ? v : ''; }
function flag(v, dflt) { if (v === 0 || v === false || v === '0') return 0; if (v === 1 || v === true || v === '1') return 1; return dflt; }
function goingCc(env, to) {
  const cc = String(env.GOING_CC == null ? CC_DEFAULT : env.GOING_CC).trim().toLowerCase();
  if (!cc || cc === to || /[\r\n]/.test(cc)) return '';
  return cc;
}
function sameText(a, b) {
  const aa = new TextEncoder().encode(String(a || ''));
  const bb = new TextEncoder().encode(String(b || ''));
  const n = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < n; i++) diff |= (aa[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}
// Single-letter organizer mail. Off unless both env values are set. The dancer
// address is a Worker secret, not a value in this file. Any organizer with a
// resolved address can receive it. There is no organizer allowlist.
export function testLetterOn(env, email, kit) {
  if (!env || env.GOING_TEST_SEND !== 'on') return false;
  const allow = pickEmail(env.GOING_TEST_DANCER, kit.EMAIL_RE);
  const who = pickEmail(email, kit.EMAIL_RE);
  if (!allow || !who) return false;
  return sameText(allow, who);
}
function letterCc(to, dancer) {
  const out = [];
  for (const raw of [dancer, CC_DEFAULT, LETTER_CC]) {
    const email = String(raw || '').trim().toLowerCase();
    if (!email || email === to || /[\r\n]/.test(email) || out.includes(email)) continue;
    out.push(email);
  }
  return out.join(', ');
}
function rewriteTo(env, to) {
  const test = String(env.TEST_ONLY_RECIPIENT || '').trim().toLowerCase();
  if (test && to !== test) return { to: test, intended: to };
  return { to, intended: '' };
}
export function shYmd(ms = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
function clock(env) { const raw = env.GOING_NOW; if (!raw) return Date.now(); const t = Date.parse(raw); return Number.isFinite(t) ? t : Date.now(); }
function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function weekday(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function pad(n) { return String(n).padStart(2, '0'); }
function quarterOf(ymd) {
  const [y, m] = ymd.split('-').map(Number);
  const q = Math.floor((m - 1) / 3) + 1;
  const startM = (q - 1) * 3 + 1, endM = startM + 2;
  const endDay = new Date(Date.UTC(y, endM, 0)).getUTCDate();
  return { key: y + 'Q' + q, start: y + '-' + pad(startM) + '-01', end: y + '-' + pad(endM) + '-' + pad(endDay), endExclusive: addDays(y + '-' + pad(endM) + '-' + pad(endDay), 1) };
}
export function occurrenceDates(card, today, n = 8) {
  if (!card || card.kind === 'event' || card.kind === 'featured') return [];
  const wds = (Array.isArray(card.weekdays) && card.weekdays.length ? card.weekdays : (card.weekday != null ? [card.weekday] : [])).map(x => ((x % 7) + 7) % 7);
  if (!wds.length) return [];
  const out = [];
  for (let i = 0; i < 200 && out.length < n; i++) {
    const day = addDays(today, i);
    if (wds.indexOf(weekday(day)) < 0) continue;
    if (card.nth) {
      const dom = +day.slice(8, 10);
      const nth = Math.floor((dom - 1) / 7) + 1;
      const last = addDays(day, 7).slice(0, 7) !== day.slice(0, 7);
      if (card.nth === -1 ? !last : nth !== card.nth) continue;
    }
    if (card.every === 2 && out.length && (Date.parse(day) - Date.parse(out[out.length - 1])) < 10 * DAY) continue;
    out.push(day);
  }
  return out;
}
function cardTitle(card, lang) {
  const en = card.title || card.name || card.id;
  const zh = card.title_zh || card.name_zh || en;
  return lang === 'zh' ? zh : en;
}
async function goingIndex(env, kit) {
  if (env.GOING_CARDS) return env.GOING_CARDS;
  kit = kit || { ID_RE: /^(?:(?:org|dj):)?[A-Za-z0-9_-]{1,64}$/, EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, clean: (s, n) => String(s || '').trim().slice(0, n) };
  if (cardCache && Date.now() - cardCache.at < 10 * 60e3) return cardCache.map;
  const base = String(env.EVENTS_ORIGIN || 'https://data.tangoweekend.org').replace(/\/$/, '');
  const r = await fetch(base + '/asia/events.json');
  if (!r.ok) throw new Error('events ' + r.status);
  const data = await r.json();
  const list = Array.isArray(data) ? data : (data.events || []);
  const map = {};
  for (const e of list) {
    if (!e || !kit.ID_RE.test(String(e.id || ''))) continue;
    const email = pickEmail(e.contacts && !Array.isArray(e.contacts) ? e.contacts.email : '', kit.EMAIL_RE);
    map[e.id] = {
      email, kind: e.kind || '', title: oneLine(kit.clean, e.name || e.id, 120), title_zh: oneLine(kit.clean, e.name_zh || e.name || e.id, 120),
      region: oneLine(kit.clean, e.region || '', 40), country: oneLine(kit.clean, e.country || '', 40),
      organizers: nameList(e.organizers), organizers_en: nameList(e.organizers_en),
      weekday: e.weekday, weekdays: e.weekdays, every: e.every, nth: e.nth, start: e.start || '', end: e.end || e.start || '', time: e.time || '',
      temp_notices: Array.isArray(e.temp_notices) ? e.temp_notices : [],
      alerts: Array.isArray(e.alerts) ? e.alerts : []
    };
  }
  cardCache = { at: Date.now(), map };
  return map;
}
async function goingCard(env, id, kit) {
  const row = (await goingIndex(env, kit))[id];
  if (!row) return null;
  const card = { ...row, id };
  return { ...card, email: organizerAddress(card, env, kit) };
}
export async function goingReach(url, env, json, kit) {
  const ids = (url.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(s => kit.ID_RE.test(s)).slice(0, 100);
  const reach = {};
  for (const id of ids) {
    let card = null;
    try { card = await goingCard(env, id, kit); }
    catch (e) { return json({ error: 'lookup_failed' }, 503); }
    reach[id] = !!(card && card.email);
  }
  return json({ reach });
}
function fpOf(intent, date, transport) { return intent + '|' + (date || '') + '|' + (transport ? '1' : '0'); }
async function sessionUser(req, env) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  return env.SDB.prepare('SELECT u.id,u.email,u.name,u.city,u.role,u.lang,u.verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.verified_at IS NOT NULL').bind(await cryptoSha(t)).first();
}
async function cryptoSha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function profileComplete(u) { return !!(u && oneLine((s, n) => String(s || '').trim().slice(0, n), u.name, 80) && String(u.city || '').trim() && roleOf(u.role) && u.verified_at); }
async function upsertUser(env, kit, email, fields) {
  const ts = kit.now();
  await env.SDB.prepare(`INSERT INTO users(email,name,lang,created_at,ip_hash,city,role) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(email) DO UPDATE SET name=CASE WHEN excluded.name!='' THEN excluded.name ELSE users.name END,
      city=CASE WHEN excluded.city IS NOT NULL AND excluded.city!='' THEN excluded.city ELSE users.city END,
      role=CASE WHEN excluded.role IS NOT NULL AND excluded.role!='' THEN excluded.role ELSE users.role END,
      lang=excluded.lang`).bind(email, fields.name || '', fields.lang, ts, fields.iph || '', fields.city || null, fields.role || null).run();
  return env.SDB.prepare('SELECT id,email,name,city,role,lang,verified_at FROM users WHERE email=?').bind(email).first();
}
async function saveVerify(env, kit, row) {
  const mag = kit.rnd(32);
  const hash = await kit.sha(row.email + ':' + mag);
  const site = row.alert ? 1 : 0;
  const intent = intentOf(row.intent);
  const card = kit.ID_RE.test(String(row.card || '')) ? String(row.card) : '';
  await env.SDB.prepare(`INSERT INTO profile_verify(email,token_hash,sent_at,tries,lang,name,city,role,alert_opt_in,ret,pending_intent,card_id,wants_sitewide) VALUES(?,?,?,0,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(email) DO UPDATE SET token_hash=excluded.token_hash,sent_at=excluded.sent_at,tries=0,lang=excluded.lang,name=excluded.name,city=excluded.city,role=excluded.role,alert_opt_in=excluded.alert_opt_in,ret=excluded.ret,pending_intent=excluded.pending_intent,card_id=excluded.card_id,wants_sitewide=excluded.wants_sitewide`)
    .bind(row.email, hash, kit.now(), row.lang, row.name || '', row.city || '', row.role || '', site, row.ret, intent || '', card, site).run();
  const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
  return base + '/social/going/confirm?e=' + encodeURIComponent(row.email) + '&t=' + mag;
}
function allowOrigin(req) {
  const og = req.headers.get('Origin') || '';
  if (/^https:\/\/(www\.)?tangoweekend\.org$/.test(og) || /^https:\/\/api\.tangoweekend\.org$/.test(og) || /^https:\/\/[a-z0-9-]+\.my1-7p3\.pages\.dev$/.test(og)) return og;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(og)) return og;
  return '';
}
const VERIFY_COOKIE = 'atm_verify=1; Path=/; Max-Age=1800; SameSite=None; Secure';
function confirmJson(req, body, status = 200) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const og = allowOrigin(req);
  if (og) {
    headers['Access-Control-Allow-Origin'] = og;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers.Vary = 'Origin';
  }
  if (body && body.confirm) headers['Set-Cookie'] = VERIFY_COOKIE;
  return new Response(JSON.stringify(body), { status, headers });
}
function sessionCookie(token) {
  return `atm_session=${token}; Path=/; Max-Age=34560000; Domain=.tangoweekend.org; Secure; SameSite=Lax`;
}
const PHONE_EMAIL_MAX = 5;
const PHONE_IP_MAX = 20;
const PHONE_LOCK_MS = 15 * 60e3;
function missingTable(e) { return /no such table/i.test(String(e && e.message || e)); }
export function phoneDigits(raw) { return String(raw == null ? '' : raw).replace(/\D/g, ''); }
export function phoneLast4(raw) {
  const digits = phoneDigits(raw);
  return digits.length >= 4 ? digits.slice(-4) : '';
}
export function normalizePhone(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s || s.length > 40) return '';
  if (!/^\+?[\d(][\d\s().-]{6,38}$/.test(s)) return '';
  const digits = phoneDigits(s);
  if (digits.length < 8 || digits.length > 15) return '';
  return (s.startsWith('+') ? '+' : '') + digits;
}
function readPhone(b) {
  if (b == null || b.phone == null || String(b.phone).trim() === '') return { phone: '' };
  const phone = normalizePhone(b.phone);
  if (!phone) return { error: 'bad_phone', status: 400 };
  return { phone };
}
async function sameTail(kit, stored, given) {
  const a = phoneLast4(stored);
  const b = phoneLast4(given);
  const ha = await kit.sha('atm-tail:' + a);
  const hb = await kit.sha('atm-tail:' + b);
  return sameText(ha, hb) && a.length === 4 && b.length === 4;
}
async function phoneTailOf(env, userId) {
  try {
    const row = await env.SDB.prepare('SELECT phone FROM user_phone WHERE user_id=?').bind(userId).first();
    return phoneLast4(row && row.phone);
  } catch (e) {
    if (missingTable(e)) return '';
    throw e;
  }
}
async function saveUserPhone(env, kit, userId, phone) {
  await env.SDB.prepare(`INSERT INTO user_phone(user_id,phone,updated_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone, updated_at=excluded.updated_at`)
    .bind(userId, phone, kit.now()).run();
}
async function stagePhone(env, kit, email, phone) {
  await env.SDB.prepare(`INSERT INTO profile_phone(email,phone,updated_at) VALUES(?,?,?)
    ON CONFLICT(email) DO UPDATE SET phone=excluded.phone, updated_at=excluded.updated_at`)
    .bind(email, phone, kit.now()).run();
}
async function bindStagedPhone(env, kit, email, userId) {
  let staged;
  try { staged = await env.SDB.prepare('SELECT phone FROM profile_phone WHERE email=?').bind(email).first(); }
  catch (e) { if (missingTable(e)) return; throw e; }
  if (!staged || !staged.phone) return;
  const cur = await env.SDB.prepare('SELECT phone FROM user_phone WHERE user_id=?').bind(userId).first();
  if (!cur || !String(cur.phone || '').trim()) await saveUserPhone(env, kit, userId, staged.phone);
  await env.SDB.prepare('DELETE FROM profile_phone WHERE email=?').bind(email).run();
}
function sessionJson(req, body, token, status = 200) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const og = allowOrigin(req);
  if (og) {
    headers['Access-Control-Allow-Origin'] = og;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers.Vary = 'Origin';
  }
  if (token) headers['Set-Cookie'] = sessionCookie(token);
  return new Response(JSON.stringify(body), { status, headers });
}
async function phoneLockRow(env, subject) {
  return env.SDB.prepare('SELECT fails, locked_until FROM phone_login_lock WHERE subject=?').bind(subject).first();
}
function lockOpen(row, now) {
  const until = Date.parse(row && row.locked_until || '');
  return !(Number.isFinite(until) && until > now);
}
async function notePhoneFail(env, kit, subject, max) {
  const now = Date.now();
  const row = await phoneLockRow(env, subject);
  let fails = Number(row && row.fails) || 0;
  const until = Date.parse(row && row.locked_until || '');
  if (Number.isFinite(until) && until <= now) fails = 0;
  fails += 1;
  const locked = fails >= max ? new Date(now + PHONE_LOCK_MS).toISOString() : null;
  await env.SDB.prepare(`INSERT INTO phone_login_lock(subject,fails,locked_until,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(subject) DO UPDATE SET fails=excluded.fails, locked_until=excluded.locked_until, updated_at=excluded.updated_at`)
    .bind(subject, fails, locked, kit.now()).run();
}
async function phoneLoginOpen(env, email, iph) {
  const now = Date.now();
  for (const subject of ['e:' + email, 'i:' + iph]) {
    const row = await phoneLockRow(env, subject);
    if (!lockOpen(row, now)) return false;
  }
  return true;
}
const PASS_RE = /^[0-9a-f]{64}$/;
const ENTER_BAD = '链接无效。请在「我的资料」里生成新的订阅链接。 / This link does not work. Make a new subscription link from My profile.';
function passLink(env, token) {
  const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
  return base + '/social/going/enter/' + token;
}
async function passHash(kit, token) { return kit.sha('atm-pass:' + token); }
async function issuePass(env, kit, userId) {
  const token = kit.rnd(32);
  await env.SDB.prepare(`INSERT INTO going_pass(user_id,token_hash,created_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash, created_at=excluded.created_at`)
    .bind(userId, await passHash(kit, token), kit.now()).run();
  return token;
}
async function ensurePass(env, kit, userId) {
  const row = await env.SDB.prepare('SELECT 1 ok FROM going_pass WHERE user_id=?').bind(userId).first();
  if (row) return '';
  return issuePass(env, kit, userId);
}
function withPass(dest, token) {
  if (!dest || !PASS_RE.test(token || '')) return dest || '';
  try { const u = new URL(dest); u.hash = 'p=' + token; return u.toString(); }
  catch { return dest; }
}
function secureRequest(url) {
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}
function passBox(kit, lang, url, wechat) {
  if (!url) return '';
  const zh = lang === 'zh';
  const title = zh ? '我的订阅链接' : 'Your subscription link';
  const hint = wechat
    ? (zh ? '在微信里打开即可登录，不必再收确认邮件。' : 'Open it in WeChat to sign in. No new confirmation email.')
    : (zh ? '用其他手机浏览器打开即可登录，不必再收确认邮件。' : 'Open it in another phone browser to sign in. No new confirmation email.');
  const copy = zh ? '复制' : 'Copy';
  const copied = zh ? '已复制' : 'Copied';
  return `<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ead9b8"><p style="margin:0 0 6px;font-size:.95rem;font-weight:700;color:#0a4f57">${kit.he(title)}</p><p style="margin:0 0 8px;font-size:.85rem;line-height:1.45;color:#7a6255">${kit.he(hint)}</p><input id="atm-pass" readonly value="${kit.he(url)}" autocomplete="off" spellcheck="false" style="width:100%;box-sizing:border-box;font-size:16px;padding:10px;border:1px solid #ead9b8;border-radius:8px;color:#2a1a14" onclick="this.select()"><button type="button" id="atm-pass-copy" style="margin-top:8px;min-height:44px;background:#0e6e78;color:#f6e3b4;border:0;border-radius:999px;padding:10px 18px;font-weight:700">${copy}</button><p id="atm-pass-note" style="min-height:1.2em;font-size:.85rem;color:#0a4f57"></p><script>(function(){var b=document.getElementById("atm-pass-copy"),i=document.getElementById("atm-pass"),n=document.getElementById("atm-pass-note");if(!b||!i)return;function ok(){if(n)n.textContent=${JSON.stringify(copied)};}function fb(){i.focus();i.select();try{document.execCommand("copy");ok();}catch(e){}}b.addEventListener("click",function(){var t=i.value;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb();});})();</script></div>`;
}
function sameBrowser(req) {
  return /(?:^|;\s*)atm_verify=1(?:;|$)/.test(req.headers.get('Cookie') || '');
}
function wechatUa(req) {
  return /MicroMessenger/i.test(req.headers.get('User-Agent') || '');
}
function resumeDest(row, card, token) {
  let origin = 'https://tangoweekend.org';
  try { origin = new URL(row.ret).origin; } catch { /* keep production */ }
  const u = new URL(row.lang === 'zh' ? '/zh/asia/' : '/asia/', origin);
  u.search = '';
  u.hash = '';
  u.searchParams.set('card', card);
  u.searchParams.set('intent', 'resume');
  u.searchParams.set('s', token);
  return u.toString();
}
function menuDest(kit, ret, token) {
  const back = kit.safeNext(ret);
  if (!back) return '';
  const u = new URL(back);
  if (u.searchParams.get('intent') === 'resume') u.searchParams.delete('intent');
  u.hash = '';
  u.searchParams.set('s', token);
  return u.toString();
}
const ZH_SIGN = '探戈助理 · 亚洲探戈地图';
const EN_SIGN = 'Tango Assistant · Asia Tango Map';
const CONFIRM_BODY = {
  zh: '谢谢你订阅亚洲探戈地图（Asia Tango Map）。请在 30 分钟内点击下方按钮，确认你的邮箱。',
  en: 'Thanks for subscribing to Asia Tango Map. Please confirm your email within 30 minutes by tapping the button below.'
};
const CONFIRM_NEXT = {
  zh: '确认后，若要在微信或其他浏览器使用，请输入你的邮箱和电话末 4 码，不必再等确认信。',
  en: 'After you confirm, to use WeChat or another browser, enter your email and the last 4 digits of your phone. You don\u2019t need another confirmation email.'
};
const CONFIRM_IGNORE = {
  zh: '如果不是你本人操作，忽略这封信即可。',
  en: 'If this wasn\'t you, you can simply ignore this email.'
};
function mailName(name) {
  return String(name || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function confirmHello(name, zh) {
  const n = mailName(name);
  if (zh) return n ? n + '，你好！' : '你好！';
  return n ? 'Hi ' + n + ',' : 'Hi,';
}
// Star submit, menu profile, and restore all send this letter.
// social.js sendMagic and subscribe-worker /confirm are different letters.
export function buildConfirmLetter(row, link, _pending, he) {
  const zh = row.lang === 'zh';
  const esc = typeof he === 'function' ? he : (s => String(s == null ? '' : s));
  const hello = confirmHello(row.name, zh);
  const body = zh ? CONFIRM_BODY.zh : CONFIRM_BODY.en;
  const next = zh ? CONFIRM_NEXT.zh : CONFIRM_NEXT.en;
  const ignore = zh ? CONFIRM_IGNORE.zh : CONFIRM_IGNORE.en;
  const sign = zh ? ZH_SIGN : EN_SIGN;
  const button = zh ? '确认订阅' : 'Confirm subscription';
  const subject = zh ? '请确认订阅亚洲探戈地图' : 'Please confirm your Asia Tango Map subscription';
  const text = `${hello}\n\n${body}\n\n${next}\n\n${link}\n\n${ignore}\n\n${sign}`;
  const html = `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><body style="margin:0;padding:24px;background:#f6efe4;font-family:Georgia,serif;color:#2a1a14"><div style="max-width:480px;margin:0 auto;background:#fffdf8;border:1px solid #e7d3b0;border-radius:16px;padding:28px 24px"><p style="margin:0 0 14px">${esc(hello)}</p><p style="margin:0 0 6px;line-height:1.55">${esc(body)}</p><p style="margin:0 0 6px;line-height:1.55">${esc(next)}</p><p style="margin:22px 0"><a href="${esc(link)}" style="display:inline-block;background:#0e6e78;color:#f6e3b4;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${button}</a></p><p style="margin:0;font-size:13px;line-height:1.5;color:#7a6255">${esc(ignore)}</p><p style="margin:26px 0 0">${esc(sign)}</p></div></body></html>`;
  return { subject, text, html, fromName: sign };
}
async function sendVerify(env, kit, row, link, pending) {
  const letter = buildConfirmLetter(row, link, pending, kit.he);
  return kit.deliver(env, row.email, letter.subject, letter.text, letter.html, undefined, { fromName: letter.fromName });
}
function intentLabel(intent) {
  return intent === 'going' ? 'Going / 要参加' : 'Interested / 感兴趣';
}
const ROLE_WORD = { leader: ['领舞', 'leader'], follower: ['跟舞', 'follower'], both: ['都可', 'both'] };
// 「姓名，跟舞，来自北京」 / "Name, follower, from Beijing". A missing city or role is left out.
export function dancerLine(name, role, city) {
  const who = oneLine((s, n) => String(s || '').trim().slice(0, n), name, 80);
  const words = ROLE_WORD[roleOf(role)] || null;
  const place = oneLine((s, n) => String(s || '').trim().slice(0, n), city, 40);
  const zhTail = [words ? words[0] : '', place ? '来自' + place : ''].filter(Boolean);
  const enTail = [words ? words[1] : '', place ? 'from ' + place : ''].filter(Boolean);
  return {
    name: who,
    zh: who + (zhTail.length ? '，' + zhTail.join('，') : ''),
    en: who + (enTail.length ? ', ' + enTail.join(', ') : '')
  };
}
const LETTER_DIVIDER = '————';
const ZH_WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const EN_WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZH_PLACES = new Set(['china', 'hong kong', 'hongkong', 'macau', 'macao', 'taiwan', '中国', '香港', '澳门', '台湾', '台灣']);
function clipName(s) {
  const name = oneLine((x, n) => String(x || '').trim().slice(0, n), s, 80);
  return name.includes('@') ? '' : name;
}
function nameList(value) {
  const arr = Array.isArray(value) ? value : (value ? [value] : []);
  const out = [];
  for (const item of arr) {
    const name = clipName(item);
    if (name && !out.includes(name)) out.push(name);
    if (out.length >= 8) break;
  }
  return out;
}
function joinZh(list) { return list.filter(Boolean).join('、'); }
function joinEn(list) {
  const names = list.filter(Boolean);
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return names[0] + ' and ' + names[1];
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}
function placeKey(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function chinesePlace(card) {
  for (const raw of [card && card.region, card && card.country]) {
    if (ZH_PLACES.has(placeKey(raw))) return true;
  }
  return false;
}
function dirLang(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  if (raw.lang === 'zh') return 'zh';
  if (raw.lang === 'en') return 'en';
  return '';
}
function dirNames(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { name: '', nameEn: '' };
  return {
    name: clipName(raw.name || raw.name_zh || ''),
    nameEn: clipName(raw.name_en || raw.nameEn || '')
  };
}
function letterProfile(card, env, kit) {
  const dir = orgDirectory(env);
  const id = card && card.id;
  const addressed = organizerAddress(card, env, kit);
  const profiles = [];
  const push = (raw, extra) => {
    const a = dirNames(raw), b = dirNames(extra);
    const email = usableEmail(raw, kit) || (raw && typeof raw === 'object' ? usableEmail(raw.email || raw.mail, kit) : '');
    profiles.push({
      email,
      name: a.name || b.name,
      nameEn: a.nameEn || b.nameEn,
      lang: dirLang(raw) || dirLang(extra)
    });
  };
  if (dir.cards[id] && typeof dir.cards[id] === 'object') push(dir.cards[id], null);
  for (const code of (Array.isArray(dir.links[id]) ? dir.links[id] : [])) {
    if (!/^O\d+$/.test(code)) continue;
    push(dir.orgs[code], dir.names && dir.names[code]);
  }
  const hit = addressed ? profiles.find(p => p.email && p.email === addressed) : null;
  const zhMark = hit ? hit.lang === 'zh' : profiles.some(p => p.lang === 'zh');
  let zhName = '', enName = '';
  if (hit && (hit.name || hit.nameEn)) {
    zhName = hit.name || hit.nameEn;
    enName = hit.nameEn || hit.name;
  }
  if (!zhName && !enName) {
    const zhList = nameList(card && card.organizers);
    const enList = nameList(card && card.organizers_en);
    if (zhList.length || enList.length) {
      zhName = joinZh(zhList) || joinEn(enList);
      enName = joinEn(enList) || joinZh(zhList);
    } else if (!hit) {
      const named = profiles.filter(p => p.name || p.nameEn);
      zhName = joinZh(named.map(p => p.name).filter(Boolean)) || joinEn(named.map(p => p.nameEn).filter(Boolean));
      enName = joinEn(named.map(p => p.nameEn).filter(Boolean)) || joinZh(named.map(p => p.name).filter(Boolean));
    }
  }
  return { zhName, enName, zhMark };
}
function ymdParts(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d, wd: weekday(ymd) };
}
function zhDate(p, nowYear) {
  return (p.y !== nowYear ? p.y + '年' : '') + p.m + '月' + p.d + '日（' + ZH_WD[p.wd] + '）';
}
function enDate(p, nowYear) {
  return EN_WD[p.wd] + ', ' + p.d + ' ' + EN_MON[p.m - 1] + (p.y !== nowYear ? ' ' + p.y : '');
}
function clockSpans(time) {
  const s = String(time || '');
  const out = [];
  const re = /(\d{1,2}):(\d{2})\s*[–—-]\s*(?:(\d{1,2}):(\d{2})|(late))/gi;
  let m;
  while ((m = re.exec(s))) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a > 30 || b > 59) continue;
    if (m[5]) out.push(pad(a) + ':' + pad(b) + '–late');
    else {
      const c = Number(m[3]), d = Number(m[4]);
      if (c > 30 || d > 59) continue;
      out.push(pad(a) + ':' + pad(b) + '–' + pad(c) + ':' + pad(d));
    }
  }
  if (!out.length) return '';
  return out.join(s.includes('、') ? '、' : ', ');
}
function whenText(card, show, nowYear) {
  const days = [];
  const shown = ymdParts(show);
  if (shown) days.push(shown);
  else {
    const start = ymdParts(card && card.start);
    const end = ymdParts(card && card.end);
    if (start) days.push(start);
    if (end && card.end !== card.start) days.push(end);
  }
  if (!days.length) return null;
  const clock = clockSpans(card && card.time);
  const zh = days.map(p => zhDate(p, nowYear)).join('至') + (clock || '') + '（北京时间）';
  const enCore = days.map(p => enDate(p, nowYear)).join(' – ');
  const en = enCore + (clock ? ', ' + clock : '') + ' (Beijing time)';
  return { zh, en };
}
function dancerBits(role, city, zh) {
  const words = ROLE_WORD[roleOf(role)];
  const place = oneLine((s, n) => String(s || '').trim().slice(0, n), city, 40);
  const bits = zh ? [words ? words[0] : '', place].filter(Boolean) : [words ? words[1] : '', place].filter(Boolean);
  if (!bits.length) return '';
  return zh ? '（' + bits.join('，') + '）' : ' (' + bits.join(', ') + ')';
}
function dancerPhrase(who, role, city, zh) {
  const name = who || '';
  const tail = dancerBits(role, city, zh);
  if (zh) return '探友' + name + tail;
  return 'Dancer' + (name ? ' ' + name : '') + tail;
}
function letterTitle(card, lang) {
  const en = cardTitle(card, 'en');
  const zh = cardTitle(card, 'zh');
  const id = String(card && card.id || '');
  const real = s => s && s !== id;
  if (lang === 'zh') return (real(zh) ? zh : '') || (real(en) ? en : '') || '这场活动';
  return (real(en) ? en : '') || (real(zh) ? zh : '') || 'this event';
}
function zhHello(name) { return name ? name + '你好，' : '你好！'; }
function enHello(name) { return name ? 'Hello ' + name + ',' : 'Hi,'; }
function zhBlocks(orgName, dancer, title, when, going, transport) {
  const lead = dancer + (going ? '勾选了要参加你的以下活动：' : '勾选了对你的以下活动感兴趣：');
  const event = when ? '「' + title + '」，时间是 ' + when + '。' : '「' + title + '」。';
  const reply = transport
    ? '探友希望收到交通指引，对方已在抄送里，请「回复全部」。'
    : '对方已在抄送里，请「回复全部」。';
  return [
    zhHello(orgName),
    lead + '\n' + event,
    reply,
    '请注意，这不是购票或正式报名。',
    '探戈助理\n亚洲探戈地图（简称 ATM）',
    '附言：若要停止 ATM 往后的活动参加通知，或删除这封信里的资料，请不要「回复全部」，另寄信到 selecttango@gmail.com，正文写「退订」即可。'
  ];
}
function enBlocks(orgName, dancer, title, when, going, transport) {
  const lead = dancer + (going
    ? ' has selected that they are going to the following event of yours:'
    : ' has selected that they are interested in the following event of yours:');
  const event = when ? '“' + title + '”, ' + when + '.' : '“' + title + '”.';
  const reply = transport
    ? 'They have asked for directions and are copied on this message; please “Reply all”.'
    : 'They are copied on this message; please “Reply all”.';
  return [
    enHello(orgName),
    lead + '\n' + event,
    reply,
    'Please note: this is not a ticket or a formal registration.',
    'Tango Assistant\nAsia Tango Map (ATM)',
    'P.S. To stop future ATM attendance notices, or to delete the information in this message, do not “Reply all”; send a separate email to selecttango@gmail.com with the word “UNSUBSCRIBE”.'
  ];
}
function blocksHtml(blocks, esc) {
  return blocks.map(block => '<p style="margin:0 0 16px;line-height:1.55">' + String(block).split('\n').map(line => esc(line)).join('<br>') + '</p>').join('');
}
// Two complete letters. Chinese is first for mainland China, Hong Kong, Macau,
// and Taiwan, and when the organizer directory marks that organizer lang "zh".
export function buildIntentLetter(env, kit, card, person, dest) {
  const profile = letterProfile(card, env || {}, kit);
  const zhFirst = chinesePlace(card) || profile.zhMark;
  const going = person.intent !== 'interested';
  const transport = flag(person.transport, 0) === 1;
  const who = clipName(person.name) || pickEmail(person.email, kit.EMAIL_RE) || oneLine((s, n) => String(s || '').trim().slice(0, n), person.email, 80);
  const nowYear = shParts(clock(env || {})).y;
  const when = whenText(card, person.show || '', nowYear);
  const zh = zhBlocks(profile.zhName, dancerPhrase(who, person.role, person.city, true), letterTitle(card, 'zh'), when && when.zh, going, transport);
  const en = enBlocks(profile.enName, dancerPhrase(who, person.role, person.city, false), letterTitle(card, 'en'), when && when.en, going, transport);
  const blocks = zhFirst ? zh.concat([LETTER_DIVIDER], en) : en.concat([LETTER_DIVIDER], zh);
  const esc = typeof kit.he === 'function' ? kit.he : (s => String(s == null ? '' : s));
  let text = blocks.join('\n\n');
  let html = `<!doctype html><html lang="${zhFirst ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;background:#f6efe4;font-family:Georgia,serif;color:#2a1a14"><div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e7d3b0;border-radius:16px;padding:24px">${blocksHtml(blocks, esc)}</div></body></html>`;
  const subject = (zhFirst
    ? (going ? 'ATM 网站 · 活动参加通知' : 'ATM 网站 · 活动兴趣通知')
    : (going ? 'ATM Website · Event Attendance Notice' : 'ATM Website · Event Interest Notice')).slice(0, 180);
  if (dest && dest.intended) {
    const note = `[test] Intended organizer: ${dest.intended}\n【测试】原收件主办方：${dest.intended}`;
    text = note + '\n\n' + text;
    html = html.replace(blocksHtml(blocks, esc), blocksHtml([note].concat(blocks), esc));
  }
  return { subject, text, html, zhFirst };
}
async function sendDigest(env, kit, card, rows, period) {
  const org = pickEmail(card.email, kit.EMAIL_RE);
  if (!org) return { error: 'no_organizer' };
  const dest = rewriteTo(env, org);
  const cc = dest.intended ? '' : goingCc(env, dest.to);
  const title = cardTitle(card, 'zh');
  const titleEn = cardTitle(card, 'en');
  const featured = card.kind === 'event' || card.kind === 'featured';
  const lines = rows.map(r => {
    const show = r.anchor || r.occurrence_date || '';
    const date = !featured && show ? `Date / 场次: ${show} (Beijing time UTC+8, Asia/Shanghai)\n` : '';
    const city = r.city ? `City / 城市: ${r.city}\n` : '';
    const role = r.role ? `Role / 角色: ${r.role}\n` : '';
    const transport = r.transport ? 'Directions / 交通指引: please send directions to the venue. The organizer replies directly. Delivery and timing are not guaranteed.\n请寄送前往场地的交通指引。组织者自行回复，不保证送达或回复时间。\n' : '';
    return `${r.name} <${r.email}>\nIntent / 意向: ${intentLabel(r.intent)}\n${city}${role}${date}${transport}`.trim();
  }).join('\n\n');
  const when = featured
    ? `Week / 本周汇总: ${period} (Asia/Shanghai). One summary for new intents on this event.\n`
    : `Occurrence / 场次: ${period} (Asia/Shanghai). One summary, three hours before the listed start.\n`;
  let text = `探戈助理\n\nNew event intent on Asia Tango Map.\n亚洲探戈地图有新的活动意向。\n\nEvent / 活动: ${title}\n${titleEn && titleEn !== title ? titleEn + '\n' : ''}Card: ${card.id}\n${when}\n${lines}\n\nThis is not a ticket purchase or a formal registration.\n这不是购票或正式报名。\nThe “receive updates” choice does not decide whether this summary is sent.\n「接收主办方信息」不影响这封汇总是否发出。\n${DELETE_NOTE}`;
  if (dest.intended) text = `[test] Intended organizer: ${dest.intended}\n【测试】原收件主办方：${dest.intended}\n\n` + text;
  const subject = (featured ? `Intent summary: ${titleEn || title}` : `Intent summary ${period}: ${titleEn || title}`).slice(0, 180);
  const replyTo = rows.length === 1 ? rows[0].email : '';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6efe4;font-family:Georgia,serif;color:#2a1a14"><div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e7d3b0;border-radius:16px;padding:24px"><p><b>探戈助理</b></p><p>${kit.he(title)}<br>${kit.he(period)}</p><ul>${rows.map(r => `<li>${kit.he(r.name)} &lt;${kit.he(r.email)}&gt; — ${kit.he(intentLabel(r.intent))}${r.city ? ' · ' + kit.he(r.city) : ''}${r.role ? ' · ' + kit.he(r.role) : ''}${!featured && (r.anchor || r.occurrence_date) ? ' · ' + kit.he(r.anchor || r.occurrence_date) : ''}${r.transport ? ' · directions' : ''}</li>`).join('')}</ul><p>This is not a ticket or a formal registration.<br>这不是购票或正式报名。</p><p>要删除资料，请回信到 selecttango@gmail.com<br>To delete your information, reply to selecttango@gmail.com</p>${dest.intended ? `<p>[test] Intended organizer: ${kit.he(dest.intended)}</p>` : ''}</div></body></html>`;
  await kit.deliver(env, dest.to, subject, text, html, undefined, { cc, replyTo, fromName: '探戈助理' });
  return { ok: true };
}
async function sendIntentLetter(env, kit, card, person) {
  const org = pickEmail(card.email, kit.EMAIL_RE);
  if (!org) return { error: 'no_organizer' };
  const dancer = pickEmail(person.email, kit.EMAIL_RE);
  const dest = rewriteTo(env, org);
  const cc = dest.intended ? '' : letterCc(dest.to, dancer);
  const replyTo = dancer && dancer !== dest.to ? dancer : '';
  const letter = buildIntentLetter(env, kit, card, { ...person, email: dancer || person.email }, dest);
  await kit.deliver(env, dest.to, letter.subject, letter.text, letter.html, undefined, { cc, replyTo, fromName: '探戈助理' });
  return { ok: true };
}
async function confirmBlocked(env, email, dev, iph) {
  const hour = new Date(Date.now() - 3600e3).toISOString();
  const day = new Date(Date.now() - DAY).toISOString();
  const eh = await env.SDB.prepare('SELECT COUNT(*) n FROM going_confirm_log WHERE email=? AND created_at>?').bind(email, hour).first('n');
  const ed = await env.SDB.prepare('SELECT COUNT(*) n FROM going_confirm_log WHERE email=? AND created_at>?').bind(email, day).first('n');
  const ih = await env.SDB.prepare('SELECT COUNT(*) n FROM going_confirm_log WHERE ip_hash=? AND created_at>?').bind(iph || '', hour).first('n');
  const dh = dev ? await env.SDB.prepare('SELECT COUNT(*) n FROM going_confirm_log WHERE dev=? AND created_at>?').bind(dev, hour).first('n') : 0;
  return (eh || 0) >= 3 || (ed || 0) >= 10 || (ih || 0) >= 10 || (dh || 0) >= 10;
}
const RESEND_GAP_MS = 60e3;
const RESEND_WINDOW_MS = 24 * 3600e3;
async function noteConfirm(env, kit, email, dev, iph, cardId, anchor) {
  await env.SDB.prepare('INSERT INTO going_confirm_log(email,dev,ip_hash,created_at,card_id,anchor) VALUES(?,?,?,?,?,?)').bind(email, dev || '', iph || '', kit.now(), cardId || '', anchor || '').run();
}
async function resendGate(env, email, cardId, anchor) {
  const since = new Date(Date.now() - RESEND_WINDOW_MS).toISOString();
  const rows = (await env.SDB.prepare('SELECT created_at FROM going_confirm_log WHERE email=? AND card_id=? AND anchor=? AND created_at>? ORDER BY created_at DESC').bind(email, cardId, anchor || '', since).all()).results || [];
  if (rows.length >= 2) return { error: 'resend_used' };
  if (rows[0]) {
    const left = RESEND_GAP_MS - (Date.now() - Date.parse(rows[0].created_at));
    if (left > 0) return { error: 'resend_wait', wait: Math.max(1, Math.ceil(left / 1000)) };
  }
  return null;
}
async function ipLetterWait(env, iph) {
  if (!iph) return 0;
  const since = new Date(Date.now() - DAY).toISOString();
  const rows = (await env.SDB.prepare('SELECT created_at FROM going_sends WHERE ip_hash=? AND created_at>? ORDER BY created_at ASC').bind(iph, since).all()).results || [];
  if (rows.length < IP_LETTER_CAP) return 0;
  const oldest = Date.parse(rows[0].created_at);
  if (!Number.isFinite(oldest)) return Math.ceil(DAY / 1000);
  return Math.max(1, Math.ceil((oldest + DAY - Date.now()) / 1000));
}
async function rememberFav(env, email, cardId, ts) {
  await env.SDB.prepare('INSERT INTO going_favs(email,card_id,created_at) VALUES(?,?,?) ON CONFLICT(email,card_id) DO NOTHING').bind(email, cardId, ts).run();
}
async function materialize(env, kit, row, iph) {
  const card = await goingCard(env, row.card_id, kit);
  const featured = !!(card && (card.kind === 'event' || card.kind === 'featured'));
  const anchor = featured ? '' : String(row.anchor || row.occurrence_date || '');
  let attend = '';
  if (!featured && row.intent === 'going') attend = String(row.attend || row.occurrence_date || anchor || '');
  const show = featured ? '' : anchor || attend;
  if (card && card.email && !featured) {
    const dates = occurrenceDates(card, shYmd(clock(env)), 16);
    if (!show || !dates.length || dates.indexOf(show) < 0) return { error: 'bad_date' };
    if (attend && dates.indexOf(attend) < 0) return { error: 'bad_date' };
  }
  const transport = featured || row.intent !== 'going' ? 0 : (row.transport ? 1 : 0);
  const fp = fpOf(row.intent, show, transport);
  const ts = kit.now();
  const on = testLetterOn(env, row.email, kit);
  if (!card || !card.email) {
    await saveIntent(env, row, show, attend, transport, 'none', null, ts);
    await rememberFav(env, row.email, row.card_id, ts);
    return { ok: true, mailed: false, mail: 'no_organizer', notice: on ? 'missing' : 'off', date: attend };
  }
  const prev = await env.SDB.prepare('SELECT intent,anchor,occurrence_date,transport,mail_status,mail_fp,status FROM going_intents WHERE email=? AND card_id=? AND anchor=?').bind(row.email, row.card_id, show).first();
  const prevShow = prev ? (prev.anchor || prev.occurrence_date || '') : '';
  const prevFp = prev ? fpOf(prev.intent, prevShow, prev.transport) : '';
  if (row.intent === 'absent') {
    await saveIntent(env, row, show, '', 0, 'none', null, ts);
    await rememberFav(env, row.email, row.card_id, ts);
    return { ok: true, mailed: false, mail: 'withheld', notice: 'off', date: '' };
  }
  if (!on) {
    const sameFacts = !!(prev && prev.status === 'active' && prevFp === fp && (prev.mail_status === 'sent' || prev.mail_status === 'queued'));
    if (sameFacts) {
      await env.SDB.prepare('UPDATE going_intents SET notify=?,updated_at=? WHERE email=? AND card_id=? AND anchor=?').bind(row.notify ? 1 : 0, ts, row.email, row.card_id, show).run();
      await rememberFav(env, row.email, row.card_id, ts);
      return { ok: true, mailed: false, mail: 'unchanged', notice: 'off', date: attend };
    }
    const alreadySent = !!(prev && prev.mail_fp === fp && prev.mail_status === 'sent');
    await saveIntent(env, row, show, attend, transport, alreadySent ? 'sent' : 'queued', alreadySent ? fp : (prev && prev.mail_fp || null), ts);
    await rememberFav(env, row.email, row.card_id, ts);
    return { ok: true, mailed: false, mail: alreadySent ? 'unchanged' : 'queued', notice: 'off', date: attend };
  }
  if (prev && prev.status === 'active' && prev.mail_status === 'sent' && prev.mail_fp === fp) {
    await env.SDB.prepare('UPDATE going_intents SET notify=?,updated_at=? WHERE email=? AND card_id=? AND anchor=?').bind(row.notify ? 1 : 0, ts, row.email, row.card_id, show).run();
    await rememberFav(env, row.email, row.card_id, ts);
    return { ok: true, mailed: false, mail: 'unchanged', notice: 'unchanged', date: attend };
  }
  const keptFp = prev && prev.mail_status === 'sent' ? prev.mail_fp : null;
  await saveIntent(env, row, show, attend, transport, 'pending', keptFp, ts);
  await rememberFav(env, row.email, row.card_id, ts);
  const wait = await ipLetterWait(env, iph || '');
  if (wait > 0) {
    await saveIntent(env, row, show, attend, transport, 'failed', keptFp, ts);
    return { ok: true, mailed: false, mail: 'failed', notice: 'failed', wait, date: attend };
  }
  const currentFp = async () => {
    const cur = await env.SDB.prepare('SELECT intent,anchor,occurrence_date,transport,status FROM going_intents WHERE email=? AND card_id=? AND anchor=?').bind(row.email, row.card_id, show).first();
    if (!cur || cur.status !== 'active' || (cur.intent !== 'going' && cur.intent !== 'interested')) return '';
    return fpOf(cur.intent, cur.anchor || cur.occurrence_date || '', cur.transport);
  };
  if (await currentFp() !== fp) return { ok: true, mailed: false, mail: 'saved', notice: 'off', date: attend };
  try {
    const sent = await sendIntentLetter(env, kit, card, { email: row.email, name: row.name, city: row.city, role: row.role, intent: row.intent, show, transport });
    if (sent && sent.error === 'no_organizer') {
      await saveIntent(env, row, show, attend, transport, 'none', keptFp, ts);
      return { ok: true, mailed: false, mail: 'no_organizer', notice: 'missing', date: attend };
    }
  } catch (e) {
    await saveIntent(env, row, show, attend, transport, 'failed', keptFp, ts);
    return { ok: true, mailed: false, mail: 'failed', notice: 'failed', date: attend };
  }
  if (await currentFp() !== fp) return { ok: true, mailed: true, mail: 'sent', notice: 'sent', date: attend };
  await env.SDB.prepare("UPDATE going_intents SET mail_status='sent',mail_fp=?,sent_at=?,updated_at=? WHERE email=? AND card_id=? AND anchor=?").bind(fp, ts, ts, row.email, row.card_id, show).run();
  await env.SDB.prepare('INSERT INTO going_sends(email,card_id,ip_hash,created_at) VALUES(?,?,?,?)').bind(row.email, row.card_id, iph || '', ts).run();
  return { ok: true, mailed: true, mail: 'sent', notice: 'sent', date: attend };
}
async function saveIntent(env, row, anchor, attend, transport, mailStatus, mailFp, ts) {
  await env.SDB.prepare(`INSERT INTO going_intents(email,card_id,anchor,intent,occurrence_date,attend_date,transport,notify,status,mail_status,mail_fp,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?, 'active',?,?,?,?)
    ON CONFLICT(email,card_id,anchor) DO UPDATE SET intent=excluded.intent,occurrence_date=excluded.occurrence_date,attend_date=excluded.attend_date,transport=excluded.transport,notify=excluded.notify,status='active',mail_status=excluded.mail_status,mail_fp=excluded.mail_fp,updated_at=excluded.updated_at`)
    .bind(row.email, row.card_id, anchor || '', row.intent, attend || null, attend || null, transport, row.notify ? 1 : 0, mailStatus, mailFp, ts, ts).run();
}
function page(kit, ok, lang, msg, dest) {
  const zh = lang === 'zh';
  const href = dest ? kit.he(dest) : '';
  const back = href ? `<p><a href="${href}" style="color:#0e6e78">${zh ? '返回' : 'Back'}</a></p>` : '';
  const refresh = dest && ok ? `<meta http-equiv="refresh" content="2;url=${href}">` : '';
  return new Response(`<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${refresh}<title>${kit.he(msg)}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.05rem;line-height:1.5;color:#0a4f57;font-weight:700">${kit.he(msg)}</p>${back}</div></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
function resultPage(kit, lang, msg, dest, opt) {
  const zh = lang === 'zh';
  const href = dest ? kit.he(dest) : '';
  const backWord = opt.event ? (zh ? '返回活动' : 'Back to event') : (zh ? '返回' : 'Back');
  const refresh = opt.redirect && href ? `<meta http-equiv="refresh" content="0;url=${href}">` : '';
  const hint = opt.wechat ? `<p style="font-size:.85rem;line-height:1.45;color:#7a6255">${zh
    ? '你正在微信内置浏览器中。请点下面的按钮返回。如果页面没有打开，请点右上角「···」，选择在浏览器中打开。'
    : 'You are in WeChat’s built-in browser. Tap the button below to go back. If the page does not open, use the ··· menu and choose Open in Browser.'}</p>` : '';
  const back = href ? `<p><a href="${href}" style="display:inline-block;margin-top:8px;background:#0e6e78;color:#f6e3b4;border-radius:999px;padding:12px 22px;font-weight:700;text-decoration:none">${backWord}</a></p>` : '';
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  if (opt.cookie) headers['Set-Cookie'] = opt.cookie;
  return new Response(`<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${refresh}<title>${kit.he(msg)}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.05rem;line-height:1.5;color:#0a4f57;font-weight:700">${kit.he(msg)}</p>${back}${hint}${passBox(kit, lang, opt.passUrl, opt.wechat)}</div></body></html>`,
    { status: 200, headers });
}
function confirmForm(kit, lang, email, tok, next) {
  const zh = lang === 'zh';
  const msg = zh ? '请点下面的按钮确认邮箱。打开链接本身不会通知组织者。' : 'Tap the button to confirm your email. Opening this page does not notify an organizer.';
  return new Response(`<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${zh ? '确认邮箱' : 'Confirm your email'}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.05rem;line-height:1.5">${kit.he(msg)}</p>
<form method="post" action="/social/going/confirm"><input type="hidden" name="e" value="${kit.he(email)}"><input type="hidden" name="t" value="${kit.he(tok)}"><input type="hidden" name="next" value="${kit.he(next)}"><input type="hidden" name="confirm" value="1">
<button type="submit" style="margin-top:8px;min-height:44px;background:#0e6e78;color:#f6e3b4;border:0;border-radius:999px;padding:12px 22px;font-weight:700">${zh ? '确认' : 'Confirm'}</button></form></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

export async function goingConfirm(req, env, url, kit) {
  const { email, tok, next, go } = await kit.confirmFields(req, url);
  if (!kit.EMAIL_RE.test(email) || !/^[0-9a-f]{64}$/.test(tok)) return page(kit, false, 'en', INVALID, '');
  const hash = await kit.sha(email + ':' + tok);
  const row = await env.SDB.prepare('SELECT * FROM profile_verify WHERE email=?').bind(email).first();
  const sent = Date.parse(row && row.sent_at || '');
  if (!row || row.token_hash !== hash || (row.tries || 0) >= 5 || !Number.isFinite(sent) || sent + PROFILE_MS < Date.now()) {
    if (req.method === 'POST' && go && row && row.token_hash !== hash) await env.SDB.prepare('UPDATE profile_verify SET tries=tries+1 WHERE email=?').bind(email).run();
    return page(kit, false, row && row.lang === 'zh' ? 'zh' : 'en', !row || sent + PROFILE_MS < Date.now() ? EXPIRED : INVALID, '');
  }
  const lang = row.lang === 'zh' ? 'zh' : 'en';
  if (req.method !== 'POST' || !go) return confirmForm(kit, lang, email, tok, next || row.ret || '');
  const user = await fillBlanks(env, kit, email, { name: row.name, city: row.city, role: row.role, lang, iph: '' });
  try { await bindStagedPhone(env, kit, email, user.id); }
  catch (e) { console.log('going phone', String(e && e.message || e).slice(0, 120)); }
  const token = await kit.issueSession(env, { ...user, lang }, { keepCode: true });
  const want = row.wants_sitewide === 1 || row.wants_sitewide === '1' || row.alert_opt_in === 1 || row.alert_opt_in === '1';
  if (want) { try { await kit.applyList(env, { email, name: user.name, lang }, true); } catch (e) { console.log('going list', String(e && e.message || e).slice(0, 120)); } }
  let card = '';
  if (row.card_id == null) {
    const latest = await env.SDB.prepare('SELECT card_id FROM going_pending WHERE email=? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1').bind(email).first();
    card = latest && kit.ID_RE.test(String(latest.card_id || '')) ? String(latest.card_id) : '';
  } else if (kit.ID_RE.test(String(row.card_id))) card = String(row.card_id);
  let pass = '';
  try { pass = await ensurePass(env, kit, user.id); }
  catch (e) { console.log('going pass', String(e && e.message || e).slice(0, 120)); }
  await env.SDB.prepare('DELETE FROM profile_verify WHERE email=?').bind(email).run();
  const star = !!card;
  const dest = withPass(star ? resumeDest({ ...row, lang }, card, token) : menuDest(kit, row.ret, token), pass);
  const msg = star
    ? (lang === 'zh' ? '邮箱已确认。回到活动后，再点「确认」才会记录意向。' : 'Email confirmed. Go back to the event and tap Confirm to save your intent.')
    : (lang === 'zh' ? '邮箱已验证，资料已保存。可到活动五角星选择要参加或感兴趣。' : 'Email verified. Profile saved. Use the star on an event to choose Going or Interested.');
  const wx = wechatUa(req);
  return resultPage(kit, lang, msg, dest, { event: star, redirect: sameBrowser(req) && !wx, wechat: wx, cookie: sessionCookie(token), passUrl: pass ? passLink(env, pass) : '' });
}
function enterHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  };
}
function enterForm(kit, lang, token) {
  const zh = lang === 'zh';
  const msg = zh ? '正在进入你的订阅。' : 'Opening your subscription.';
  const btn = zh ? '进入我的订阅' : 'Open my subscription';
  return new Response(`<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>${kit.he(msg)}</title></head>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.05rem;line-height:1.5;color:#0a4f57;font-weight:700">${kit.he(msg)}</p>
<form method="post" action="/social/going/enter" referrerpolicy="no-referrer"><input type="hidden" name="k" value="${kit.he(token)}"><button type="submit" style="margin-top:8px;min-height:44px;background:#0e6e78;color:#f6e3b4;border:0;border-radius:999px;padding:12px 22px;font-weight:700">${btn}</button></form>
<script>document.forms[0].submit()</script></div></body></html>`, { status: 200, headers: enterHeaders() });
}
export async function goingEnter(req, env, url, kit) {
  if (!secureRequest(url)) return page(kit, false, 'en', ENTER_BAD, '');
  let raw = '';
  if (req.method === 'POST') { try { raw = await req.text(); } catch { raw = ''; } }
  const pathTok = (url.pathname.match(/\/going\/enter\/([0-9a-f]{64})$/) || [])[1] || '';
  const bodyTok = req.method === 'POST' ? String(new URLSearchParams(raw).get('k') || '') : '';
  const tok = PASS_RE.test(bodyTok) ? bodyTok : pathTok;
  if (!PASS_RE.test(tok)) return page(kit, false, 'en', ENTER_BAD, '');
  const user = await env.SDB.prepare('SELECT u.id,u.lang,u.verified_at FROM going_pass p JOIN users u ON u.id=p.user_id WHERE p.token_hash=? AND u.verified_at IS NOT NULL').bind(await passHash(kit, tok)).first();
  if (!user) return page(kit, false, 'en', ENTER_BAD, '');
  const lang = user.lang === 'zh' ? 'zh' : 'en';
  if (req.method !== 'POST') return enterForm(kit, lang, tok);
  const session = await kit.issueSession(env, user, { keepCode: true });
  const dest = new URL(lang === 'zh' ? '/zh/asia/' : '/asia/', 'https://tangoweekend.org');
  dest.searchParams.set('s', session);
  dest.hash = 'p=' + tok;
  const msg = lang === 'zh' ? '已登录。这个浏览器已订阅，不必再收确认邮件。' : 'You\'re signed in. This browser is subscribed, and no new confirmation email was sent.';
  const res = resultPage(kit, lang, msg, dest.toString(), { event: false, redirect: true, wechat: false, cookie: sessionCookie(session) });
  for (const [key, value] of Object.entries(enterHeaders())) res.headers.set(key, value);
  return res;
}
export async function goingPass(req, env, b, json, kit) {
  const session = await sessionUser(req, env);
  if (!session) return json({ error: 'auth' }, 401);
  if (req.method === 'GET') {
    const row = await env.SDB.prepare('SELECT 1 ok FROM going_pass WHERE user_id=?').bind(session.id).first();
    return json({ active: !!row });
  }
  const prove = String(b && b.prove || '');
  if (prove) {
    if (!PASS_RE.test(prove)) return json({ match: false });
    const row = await env.SDB.prepare('SELECT 1 ok FROM going_pass WHERE user_id=? AND token_hash=?').bind(session.id, await passHash(kit, prove)).first();
    return json({ match: !!row });
  }
  const rotate = !!(b && (b.rotate === 1 || b.rotate === true || b.rotate === '1'));
  const issue = !!(b && (b.issue === 1 || b.issue === true || b.issue === '1'));
  if (!rotate && !issue) return json({ error: 'bad_input' }, 400);
  const existing = await env.SDB.prepare('SELECT 1 ok FROM going_pass WHERE user_id=?').bind(session.id).first();
  if (issue && !rotate && existing) return json({ active: true, error: 'exists' }, 409);
  const token = await issuePass(env, kit, session.id);
  return json({ ok: true, url: passLink(env, token) });
}
export async function goingPhone(req, env, b, iph, json, kit) {
  if (b && b.website) return json({ ok: true, mailed: false });
  const email = kit.clean(b && b.email, 254).toLowerCase();
  if (!kit.EMAIL_RE.test(email)) return json({ error: 'need_email', mailed: false }, 400);
  let ready = false;
  try {
    await env.SDB.prepare('SELECT 1 AS ok FROM user_phone LIMIT 1').first();
    await env.SDB.prepare('SELECT 1 AS ok FROM phone_login_lock LIMIT 1').first();
    ready = true;
  } catch (e) {
    if (missingTable(e)) return json({ error: 'phone_unavailable', mailed: false }, 503);
    throw e;
  }
  if (!ready) return json({ error: 'phone_unavailable', mailed: false }, 503);
  if (!(await phoneLoginOpen(env, email, iph || ''))) return json({ error: 'rate_limited', mailed: false }, 429);
  const given = phoneDigits(b && b.last4);
  const user = await env.SDB.prepare(`SELECT u.id,u.email,u.lang,u.verified_at,p.phone AS phone
    FROM users u LEFT JOIN user_phone p ON p.user_id=u.id WHERE u.email=?`).bind(email).first();
  const stored = user && user.verified_at ? (user.phone || '') : '';
  const match = given.length === 4 && await sameTail(kit, stored, given);
  if (!match) {
    await notePhoneFail(env, kit, 'e:' + email, PHONE_EMAIL_MAX);
    await notePhoneFail(env, kit, 'i:' + (iph || ''), PHONE_IP_MAX);
    return json({ error: 'phone_login', mailed: false }, 401);
  }
  await env.SDB.prepare('DELETE FROM phone_login_lock WHERE subject=?').bind('e:' + email).run();
  const token = await kit.issueSession(env, user, { keepCode: true });
  return sessionJson(req, { ok: true, session: token, verified: true, mailed: false }, token);
}
async function fillBlanks(env, kit, email, fields) {
  const cur = await env.SDB.prepare('SELECT id,name,city,role FROM users WHERE email=?').bind(email).first();
  if (!cur) return upsertUser(env, kit, email, fields);
  const name = String(cur.name || '').trim() ? cur.name : (fields.name || '');
  const city = String(cur.city || '').trim() ? cur.city : (fields.city || null);
  const role = roleOf(cur.role) ? cur.role : (roleOf(fields.role) || null);
  await env.SDB.prepare('UPDATE users SET verified_at=COALESCE(verified_at,?),name=?,city=?,role=?,lang=? WHERE id=?').bind(kit.now(), name, city, role, fields.lang, cur.id).run();
  return env.SDB.prepare('SELECT id,email,name,city,role,lang,verified_at FROM users WHERE email=?').bind(email).first();
}

function readProfile(b, kit) {
  const name = oneLine(kit.clean, b.name, 80);
  const email = kit.clean(b.email, 254).toLowerCase();
  const city = oneLine(kit.clean, b.city, 40);
  const role = roleOf(b.role);
  return { name, email, city, role };
}

async function setSitewide(env, kit, user, want) {
  if (want) {
    try { await kit.applyList(env, user, true); } catch (e) { console.log('going list', String(e && e.message || e).slice(0, 120)); }
    return;
  }
  const email = String(user.email || '').toLowerCase();
  const ts = kit.now();
  await env.DB.prepare('INSERT INTO mail_unsub(email,at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET at=excluded.at').bind(email, ts).run();
  await env.DB.prepare("UPDATE email_subs SET status='unsubscribed',unsubscribed_at=? WHERE lower(email)=? AND status='active'").bind(ts, email).run();
}
async function sitewideOn(env, email) {
  try {
    const addr = String(email || '').toLowerCase();
    const active = await env.DB.prepare("SELECT 1 ok FROM email_subs WHERE lower(email)=? AND status='active'").bind(addr).first();
    const blocked = await env.DB.prepare('SELECT 1 ok FROM mail_unsub WHERE email=?').bind(addr).first();
    return !!(active && !blocked);
  } catch (e) { return false; }
}
export async function goingProfile(req, env, b, ip, iph, json, kit) {
  if (b.website) return json({ ok: true, confirm: true });
  const { name, email, city, role } = readProfile(b, kit);
  if (!name) return json({ error: 'need_name' }, 400);
  if (!kit.EMAIL_RE.test(email)) return json({ error: 'need_email' }, 400);
  if (!city) return json({ error: 'need_city' }, 400);
  if (!role) return json({ error: 'need_role' }, 400);
  const phoneCheck = readPhone(b);
  if (phoneCheck.error) return json({ error: phoneCheck.error, mailed: false }, phoneCheck.status);
  const ret = kit.safeNext(b.ret);
  if (!ret) return json({ error: 'bad_return' }, 400);
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const alert = flag(b.alert, 0);
  const session = await sessionUser(req, env);
  const same = !!(session && session.email === email);
  if (!same && !(await kit.turnstile(env, b.ts, ip))) return json({ error: 'turnstile' }, 403);
  if (!same) {
    if (await confirmBlocked(env, email, String(b.dev || ''), iph)) return json({ error: 'rate_limited' }, 429);
  }
  if (same) {
    await env.SDB.prepare('UPDATE users SET name=?,city=?,role=?,lang=? WHERE id=?').bind(name, city, role, lang, session.id).run();
    if (phoneCheck.phone) {
      try { await saveUserPhone(env, kit, session.id, phoneCheck.phone); }
      catch (e) {
        if (missingTable(e)) return json({ error: 'phone_unavailable', mailed: false }, 503);
        throw e;
      }
    }
    await setSitewide(env, kit, { email, name, lang }, alert === 1);
    return json({ ok: true, verified: true, session: true, mailed: false, sitewide: alert === 1, phone_tail: await phoneTailOf(env, session.id) });
  }
  const recent = await env.SDB.prepare('SELECT sent_at FROM profile_verify WHERE email=?').bind(email).first();
  if (recent && Date.now() - Date.parse(recent.sent_at) < 60e3) return json({ error: 'rate_limited' }, 429);
  const ipCount = await env.SDB.prepare('SELECT COUNT(*) n FROM users WHERE ip_hash=? AND created_at>?').bind(iph, new Date(Date.now() - 3600e3).toISOString()).first('n');
  if ((ipCount || 0) >= 8) return json({ error: 'rate_limited' }, 429);
  await upsertUser(env, kit, email, { name, city, role, lang, iph });
  const link = await saveVerify(env, kit, { email, name, city, role, lang, alert, ret });
  if (phoneCheck.phone) {
    try { await stagePhone(env, kit, email, phoneCheck.phone); }
    catch (e) {
      if (missingTable(e)) return json({ error: 'phone_unavailable', mailed: false }, 503);
      throw e;
    }
  }
  let via;
  try { via = await sendVerify(env, kit, { email, name, lang, promo: alert === 1 }, link, null); }
  catch (e) { return json({ error: 'send_failed' }, 502); }
  await noteConfirm(env, kit, email, String(b.dev || ''), iph);
  return confirmJson(req, { ok: true, confirm: true, mailed: false, ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_link: link } : {}) });
}

export async function goingRestore(req, env, b, ip, json, kit) {
  const email = kit.clean(b.email, 254).toLowerCase();
  if (!kit.EMAIL_RE.test(email)) return json({ error: 'need_email' }, 400);
  const ret = kit.safeNext(b.ret);
  if (!ret) return json({ error: 'bad_return' }, 400);
  if (!(await kit.turnstile(env, b.ts, ip))) return json({ error: 'turnstile' }, 403);
  const iph = (await kit.sha((ip || '') + 'atm')).slice(0, 16);
  if (await confirmBlocked(env, email, String(b.dev || ''), iph)) return json({ error: 'rate_limited' }, 429);
  const u = await env.SDB.prepare('SELECT name,city,role,lang,verified_at FROM users WHERE email=?').bind(email).first();
  if (!u || !u.verified_at) return json({ ok: true, confirm: true, mailed: false });
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const link = await saveVerify(env, kit, { email, name: u.name || email, city: u.city || '', role: roleOf(u.role), lang, alert: 0, ret });
  let via;
  try { via = await sendVerify(env, kit, { email, name: u.name || email, lang, promo: false }, link, null); }
  catch (e) { return json({ error: 'send_failed' }, 502); }
  await noteConfirm(env, kit, email, String(b.dev || ''), iph);
  return confirmJson(req, { ok: true, confirm: true, mailed: false, ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_link: link } : {}) });
}

export async function goingSubmit(req, env, b, ip, iph, json, kit) {
  if (b.website) return json({ ok: true, confirm: true });
  if (!(b.explicit === 1 || b.explicit === true || b.explicit === '1')) return json({ error: 'need_explicit' }, 400);
  if (!(b.disclose === 1 || b.disclose === true || b.disclose === '1')) return json({ error: 'need_disclose' }, 400);
  const id = String(b.id || ''), intent = intentOf(b.intent);
  if (!kit.ID_RE.test(id) || !intent) return json({ error: 'bad_input' }, 400);
  const ret = kit.safeNext(b.ret);
  if (!ret) return json({ error: 'bad_return' }, 400);
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const notify = flag(b.notify, 1), transport = flag(b.transport, 0);
  const promo = flag(b.alert, 0);
  const sessionEarly = await sessionUser(req, env);
  if (!sessionEarly && intent === 'absent') return json({ ok: true, mail: 'withheld', stored: false });
  let card;
  try { card = await goingCard(env, id, kit); }
  catch (e) { console.log('going events', String(e && e.message || e).slice(0, 160)); return json({ error: 'lookup_failed' }, 503); }
  if (!card) return json({ error: 'not_found' }, 404);
  if (!card.email && !sessionEarly) return json({ error: 'no_organizer' }, 404);
  const featured = card.kind === 'event' || card.kind === 'featured';
  let anchor = featured ? '' : String(b.anchor || b.date || '');
  if (!featured) {
    const dates = occurrenceDates(card, shYmd(clock(env)), 16);
    if (!anchor) anchor = dates[0] || '';
    if (!anchor || dates.indexOf(anchor) < 0) return json({ error: 'bad_date' }, 400);
  }
  const attend = !featured && intent === 'going' ? String(b.date || anchor) : '';
  const session = await sessionUser(req, env);
  let name, email, city, role;
  if (session) {
    name = oneLine(kit.clean, b.name, 80) || session.name;
    email = session.email;
    city = oneLine(kit.clean, b.city, 40) || session.city || '';
    role = roleOf(b.role) || roleOf(session.role);
    if (!name) return json({ error: 'need_name', need_profile: true }, 400);
    await env.SDB.prepare('UPDATE users SET name=?,city=?,role=? WHERE id=?').bind(name, city || null, role || null, session.id).run();
    const result = await materialize(env, kit, { email, card_id: id, intent, anchor, occurrence_date: attend, attend, transport, notify, name, city, role, lang }, iph);
    if (result.error) return json({ error: result.error }, 400);
    await env.SDB.prepare('UPDATE going_pending SET consumed_at=? WHERE email=? AND card_id=? AND anchor=? AND consumed_at IS NULL').bind(kit.now(), email, id, anchor).run();
    return json({ ok: true, verified: true, mailed: !!result.mailed, mail: result.mail, notice: result.notice || 'off', ...(result.wait ? { wait: result.wait } : {}), date: result.date || '', anchor });
  }
  const prof = readProfile(b, kit);
  name = prof.name; email = prof.email; city = prof.city; role = prof.role;
  if (!kit.EMAIL_RE.test(email)) return json({ error: 'need_email' }, 400);
  const again = await resendGate(env, email, id, anchor);
  if (again) return json(again, 429);
  if (await confirmBlocked(env, email, String(b.dev || ''), iph)) return json({ error: 'rate_limited' }, 429);
  const useTransport = featured || intent !== 'going' ? 0 : transport;
  const existing = await env.SDB.prepare('SELECT id,name,city,role,verified_at FROM users WHERE email=?').bind(email).first();
  if (existing && existing.verified_at) {
    if (!name) name = existing.name || '';
    if (!city) city = existing.city || '';
    if (!role) role = roleOf(existing.role);
  }
  if (!name) return json({ error: 'need_name' }, 400);
  if (!city) return json({ error: 'need_city' }, 400);
  if (!role) return json({ error: 'need_role' }, 400);
  const phoneCheck = readPhone(b);
  if (phoneCheck.error) return json({ error: phoneCheck.error, mailed: false }, phoneCheck.status);
  if (!existing) await upsertUser(env, kit, email, { name, city, role, lang, iph });
  else if (!existing.verified_at) await fillBlanks(env, kit, email, { name, city, role, lang, iph });
  await env.SDB.prepare(`INSERT INTO going_pending(email,card_id,anchor,intent,occurrence_date,attend_date,transport,notify,name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(email,card_id,anchor) DO UPDATE SET intent=excluded.intent,occurrence_date=excluded.occurrence_date,attend_date=excluded.attend_date,transport=excluded.transport,notify=excluded.notify,name=excluded.name,created_at=excluded.created_at,consumed_at=NULL`)
    .bind(email, id, anchor, intent, attend || null, attend || null, useTransport, notify, name, kit.now()).run();
  const link = await saveVerify(env, kit, { email, name: name || (existing && existing.name) || '', city: city || (existing && existing.city) || '', role: role || (existing && existing.role) || '', lang, alert: promo, ret, intent, card: id });
  if (phoneCheck.phone) {
    try { await stagePhone(env, kit, email, phoneCheck.phone); }
    catch (e) {
      if (missingTable(e)) {
        await env.SDB.prepare('DELETE FROM going_pending WHERE email=? AND card_id=? AND anchor=? AND consumed_at IS NULL').bind(email, id, anchor).run();
        return json({ error: 'phone_unavailable', mailed: false }, 503);
      }
      throw e;
    }
  }
  let via;
  try { via = await sendVerify(env, kit, { email, name: name || (existing && existing.name) || '', lang, promo: promo === 1 }, link, { title: cardTitle(card, lang), intent }); }
  catch (e) {
    await env.SDB.prepare('DELETE FROM going_pending WHERE email=? AND card_id=? AND anchor=? AND consumed_at IS NULL').bind(email, id, anchor).run();
    return json({ error: 'send_failed' }, 502);
  }
  await noteConfirm(env, kit, email, String(b.dev || ''), iph, id, anchor);
  return confirmJson(req, { ok: true, confirm: true, mailed: false, ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_link: link } : {}) });
}

export async function goingCancel(req, env, b, json, kit) {
  const session = await sessionUser(req, env);
  if (!session) return json({ error: 'auth' }, 401);
  const id = String(b.id || '');
  if (!kit.ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
  if (!(b.explicit === 1 || b.explicit === true || b.explicit === '1')) return json({ error: 'need_explicit' }, 400);
  const cur = await env.SDB.prepare("SELECT id FROM going_intents WHERE email=? AND card_id=? AND status='active'").bind(session.email, id).first();
  if (!cur) return json({ ok: true, cancelled: false, mailed: false });
  await env.SDB.prepare("UPDATE going_intents SET status='cancelled',mail_status='none',updated_at=? WHERE email=? AND card_id=? AND status='active'").bind(kit.now(), session.email, id).run();
  return json({ ok: true, cancelled: true, mailed: false, notice: 'off' });
}
export async function goingUnfav(req, env, b, json, kit) {
  const session = await sessionUser(req, env);
  if (!session) return json({ error: 'auth' }, 401);
  const id = String(b.id || '');
  if (!kit.ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
  if (!(b.explicit === 1 || b.explicit === true || b.explicit === '1')) return json({ error: 'need_explicit' }, 400);
  await env.SDB.prepare('DELETE FROM going_favs WHERE email=? AND card_id=?').bind(session.email, id).run();
  await env.SDB.prepare("UPDATE going_intents SET status='cancelled',mail_status='none',updated_at=? WHERE email=? AND card_id=? AND status='active'").bind(kit.now(), session.email, id).run();
  return json({ ok: true, removed: true, mailed: false, notice: 'off' });
}

export async function goingCounts(url, env, json) {
  const ids = (url.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(s => /^[A-Za-z0-9_-]{1,64}$/.test(s)).slice(0, 100);
  const counts = {};
  ids.forEach(id => { counts[id] = 0; });
  if (!ids.length) return json({ counts });
  const q = ids.map(() => '?').join(',');
  (await env.SDB.prepare(`SELECT card_id,COUNT(DISTINCT email) n FROM going_intents WHERE status='active' AND intent IN ('going','interested') AND card_id IN (${q}) GROUP BY card_id`).bind(...ids).all()).results
    .forEach(r => { counts[r.card_id] = r.n; });
  return json({ counts });
}

export async function goingMine(req, env, json) {
  const session = await sessionUser(req, env);
  if (!session) return json({ error: 'auth' }, 401);
  const rows = (await env.SDB.prepare("SELECT card_id,anchor,intent,occurrence_date,attend_date,transport,notify,mail_status,status,updated_at FROM going_intents WHERE email=? AND status='active' ORDER BY updated_at DESC").bind(session.email).all()).results || [];
  const drafts = (await env.SDB.prepare("SELECT card_id,anchor,intent,occurrence_date,attend_date,transport,notify FROM going_pending WHERE email=? AND consumed_at IS NULL ORDER BY created_at DESC").bind(session.email).all()).results || [];
  const favs = (await env.SDB.prepare('SELECT card_id FROM going_favs WHERE email=? ORDER BY created_at DESC').bind(session.email).all()).results || [];
  const sitewide = await sitewideOn(env, session.email);
  const phone_tail = await phoneTailOf(env, session.id);
  return json({
    email: session.email, name: session.name, city: session.city || '', role: session.role || '', sitewide, phone_tail,
    favs: favs.map(r => r.card_id),
    items: rows.map(r => ({ id: r.card_id, anchor: r.anchor || '', intent: r.intent, date: r.attend_date || '', transport: !!r.transport, notify: !!r.notify, mail: r.mail_status })),
    drafts: drafts.map(r => ({ id: r.card_id, anchor: r.anchor || '', intent: r.intent, date: r.attend_date || '', transport: !!r.transport, notify: !!r.notify }))
  });
}

async function quarterReport(env, q) {
  const rows = (await env.SDB.prepare("SELECT card_id,email,intent,occurrence_date FROM going_intents WHERE status='active' AND occurrence_date>=? AND occurrence_date<=?").bind(q.start, q.end).all()).results || [];
  const emails = new Set(), going = new Set(), interested = new Set();
  const byCard = {}, byDate = {};
  for (const r of rows) {
    emails.add(r.email);
    if (r.intent === 'going') going.add(r.email + '\0' + r.card_id); else interested.add(r.email + '\0' + r.card_id);
    const c = byCard[r.card_id] || (byCard[r.card_id] = { card_id: r.card_id, going: 0, interested: 0, emails: new Set() });
    c.emails.add(r.email); if (r.intent === 'going') c.going++; else c.interested++;
    const d = byDate[r.occurrence_date] || (byDate[r.occurrence_date] = { date: r.occurrence_date, going: 0, interested: 0, emails: new Set() });
    d.emails.add(r.email); if (r.intent === 'going') d.going++; else d.interested++;
  }
  const pack = o => ({ ...o, unique: o.emails.size, emails: undefined });
  return {
    going: going.size, interested: interested.size, unique_emails: emails.size,
    by_card: Object.values(byCard).map(pack),
    by_date: Object.values(byDate).map(pack),
    note: 'unique_emails counts a person once in this quarter. Summing by_date or by_card counts participations, not unique people. Active intents only, as of generation. Cancelled intents are excluded. Timezone Asia/Shanghai (Beijing, UTC+8). Occurrence date assigns the quarter.'
  };
}
async function featuredReport(env, card) {
  const rows = (await env.SDB.prepare("SELECT email,intent FROM going_intents WHERE status='active' AND card_id=?").bind(card.id).all()).results || [];
  const emails = new Set(); let going = 0, interested = 0;
  for (const r of rows) { emails.add(r.email); if (r.intent === 'going') going++; else interested++; }
  return {
    card_id: card.id, title: card.title || card.id, going, interested, unique_emails: emails.size,
    note: 'One report per featured event after it ends. unique_emails is people on this event, not across events. Active intents at generation. Cancelled excluded. Timezone Asia/Shanghai (Beijing, UTC+8).'
  };
}
async function putReport(env, key, kind, start, end, body) {
  const hit = await env.SDB.prepare('SELECT report_key FROM going_reports WHERE report_key=?').bind(key).first();
  if (hit) return false;
  await env.SDB.prepare('INSERT INTO going_reports(report_key,kind,status,tz,range_start,range_end,generated_at,body) VALUES(?,?,\'review\',\'Asia/Shanghai\',?,?,?,?)')
    .bind(key, kind, start, end, new Date().toISOString(), JSON.stringify(body)).run();
  return true;
}
export async function generateGoingStats(env, kit) {
  if (env.GOING_STATS !== 'on' && !env.GOING_STATS_FORCE) return { enabled: false, created: [] };
  const today = shYmd(clock(env));
  const created = [];
  const due = new Map();
  const prev = quarterOf(addDays(quarterOf(today).start, -1));
  if (today > prev.end) due.set(prev.key, prev);
  const dated = (await env.SDB.prepare("SELECT DISTINCT occurrence_date d FROM going_intents WHERE occurrence_date IS NOT NULL AND occurrence_date!=''").all()).results || [];
  for (const r of dated) {
    const q = quarterOf(r.d);
    if (today > q.end) due.set(q.key, q);
  }
  for (const q of due.values()) {
    const key = 'regular:' + q.key;
    const body = await quarterReport(env, q);
    body.range_start = q.start; body.range_end = q.end; body.generated_at = new Date().toISOString(); body.tz = 'Asia/Shanghai'; body.kind = 'regular';
    if (await putReport(env, key, 'regular', q.start, q.end, body)) created.push(key);
  }
  let map = {};
  try { map = await goingIndex(env, kit); } catch (e) { console.log('going stats index', String(e && e.message || e).slice(0, 120)); }
  for (const [id, card] of Object.entries(map)) {
    if (card.kind !== 'event' && card.kind !== 'featured') continue;
    const end = card.end || card.start || '';
    if (!end || !(end < today)) continue;
    const key = 'featured:' + id;
    const body = await featuredReport(env, { ...card, id });
    body.range_start = card.start || end; body.range_end = end; body.generated_at = new Date().toISOString(); body.tz = 'Asia/Shanghai'; body.kind = 'featured';
    if (await putReport(env, key, 'featured', body.range_start, end, body)) created.push(key);
  }
  return { enabled: true, created };
}

export async function goingAdmin(req, env, url, b, json, kit) {
  const a = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || a.length < 24 || a !== env.ADMIN_TOKEN) return json({ error: 'auth' }, 401);
  if (req.method === 'POST' && url.pathname.endsWith('/run')) {
    const r = await generateGoingStats({ ...env, GOING_STATS_FORCE: '1' }, kit);
    return json({ ok: true, ...r, sent: false });
  }
  const key = url.searchParams.get('key') || '';
  if (key) {
    const row = await env.SDB.prepare('SELECT report_key,kind,status,tz,range_start,range_end,generated_at,body FROM going_reports WHERE report_key=?').bind(key).first();
    if (!row) return json({ error: 'not_found' }, 404);
    return json({ ...row, body: JSON.parse(row.body), sent: false });
  }
  const items = (await env.SDB.prepare('SELECT report_key,kind,status,tz,range_start,range_end,generated_at FROM going_reports ORDER BY generated_at DESC').all()).results || [];
  return json({ items, sent: false });
}

const SH_MS = 8 * 3600e3;
const DIGEST_CAP = 500;
export function digestSchedule(env) {
  const rawW = env.GOING_DIGEST_WEEKDAY, rawH = env.GOING_DIGEST_HOUR, rawM = env.GOING_DIGEST_MINUTE;
  const w = Number(rawW == null || rawW === '' ? 1 : rawW);
  const h = Number(rawH == null || rawH === '' ? 14 : rawH);
  const m = Number(rawM == null || rawM === '' ? 0 : rawM);
  return {
    weekday: Number.isInteger(w) && w >= 0 && w <= 6 ? w : 1,
    hour: Number.isInteger(h) && h >= 0 && h <= 23 ? h : 9,
    minute: Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0,
    tz: 'Asia/Shanghai',
    // Monday 14:00 Asia/Shanghai is only the prepared default. It is not turned on.
    pendingReview: rawW == null && rawH == null && rawM == null,
    approved: false
  };
}
export function shParts(ms) {
  const d = new Date(ms + SH_MS);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  return { y, m, day, h: d.getUTCHours(), min: d.getUTCMinutes(), wd: d.getUTCDay(), ymd: y + '-' + pad(m) + '-' + pad(day) };
}
export function shanghaiMs(y, m, d, h, min) { return Date.UTC(y, m - 1, d, h || 0, min || 0) - SH_MS; }
export function weekSlot(ms, schedule) {
  let cursor = ms + SH_MS;
  for (let i = 0; i < 8; i++) {
    const d = new Date(cursor);
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    const slot = shanghaiMs(y, m, day, schedule.hour, schedule.minute);
    if (shParts(slot).wd === schedule.weekday && slot <= ms) return { key: shParts(slot).ymd, slotMs: slot, prevMs: slot - 7 * DAY, nextMs: slot + 7 * DAY };
    cursor -= DAY;
  }
  return null;
}
export function startClock(time) {
  const s = String(time || '').trim();
  if (!s || /[ap]\.?m/i.test(s)) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?!\d)/);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h > 23 || min > 59) return null;
  return { h, min };
}
export function regularWindow(ymd, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return null;
  const clock = startClock(time);
  if (!clock) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const startMs = shanghaiMs(y, m, d, clock.h, clock.min);
  return { startMs, sendMs: startMs - 3 * 3600e3 };
}
function featuredCard(card) { return !!(card && (card.kind === 'event' || card.kind === 'featured')); }
function occurrenceHold(card, ymd) {
  for (const n of (Array.isArray(card.temp_notices) ? card.temp_notices : [])) {
    if (!n || (n.date || n.start) !== ymd) continue;
    if (n.status === 'cancelled') return 'cancelled';
    if (n.status === 'changed') return 'rescheduled';
  }
  return '';
}
function changesOf(r) { return r && r.meta && r.meta.changes || 0; }
async function markDigest(env, key, cardId, kind, period, status, reason, nowIso) {
  await env.SDB.prepare(`INSERT OR IGNORE INTO going_digests(digest_key,card_id,kind,period,status,reason,snapshot,created_at) VALUES(?,?,?,?,?,?,NULL,?)`)
    .bind(key, cardId, kind, period, status, reason, nowIso).run();
  await env.SDB.prepare(`UPDATE going_digests SET status=?,reason=? WHERE digest_key=? AND status NOT IN ('sent','sending','skipped')`).bind(status, reason, key).run();
}
async function claimDigest(env, key, cardId, kind, period, nowIso, staleIso) {
  await env.SDB.prepare(`INSERT OR IGNORE INTO going_digests(digest_key,card_id,kind,period,status,reason,snapshot,created_at) VALUES(?,?,?,?,'open',NULL,NULL,?)`)
    .bind(key, cardId, kind, period, nowIso).run();
  const r = await env.SDB.prepare(`UPDATE going_digests SET status='sending',reason=NULL,created_at=? WHERE digest_key=? AND (status IN ('open','failed','held') OR (status='sending' AND created_at < ?))`)
    .bind(nowIso, key, staleIso).run();
  return changesOf(r) === 1;
}
async function queuedRows(env, cardId) {
  return (await env.SDB.prepare(`SELECT i.email email,i.card_id card_id,i.intent intent,i.occurrence_date occurrence_date,i.anchor anchor,i.transport transport,i.mail_status mail_status,i.updated_at updated_at,u.name name,u.city city,u.role role,u.verified_at verified_at
    FROM going_intents i JOIN users u ON u.email=i.email
    WHERE i.card_id=? AND i.status='active' AND i.mail_status='queued' AND i.intent IN ('going','interested') AND u.verified_at IS NOT NULL
    ORDER BY i.email`).bind(cardId).all()).results || [];
}
function showOf(r) { return (r && (r.anchor || r.occurrence_date)) || ''; }
async function finishSent(env, rows, nowIso) {
  for (const row of rows) {
    const cur = await env.SDB.prepare('SELECT intent,occurrence_date,transport,status,mail_status FROM going_intents WHERE email=? AND card_id=?').bind(row.email, row.card_id).first();
    if (!cur || cur.status !== 'active' || cur.mail_status !== 'queued') continue;
    const fp = fpOf(cur.intent, cur.anchor || cur.occurrence_date || '', cur.transport);
    if (fp !== row.fp) continue;
    await env.SDB.prepare("UPDATE going_intents SET mail_status='sent',mail_fp=?,sent_at=?,updated_at=? WHERE email=? AND card_id=? AND mail_status='queued'").bind(fp, nowIso, nowIso, row.email, row.card_id).run();
  }
}
function packRow(r, date) {
  return { email: r.email, name: oneLine((s, n) => String(s || '').trim().slice(0, n), r.name, 80) || r.email, intent: r.intent, occurrence_date: date || '', anchor: r.anchor || date || '', city: r.city || '', role: r.role || '', transport: r.transport ? 1 : 0, card_id: r.card_id, fp: fpOf(r.intent, r.anchor || date || '', r.transport ? 1 : 0), updated_at: r.updated_at };
}
export async function runGoingDigests(env, kit) {
  const schedule = digestSchedule(env);
  const base = { pendingReview: schedule.pendingReview, approved: false, schedule: { weekday: schedule.weekday, hour: schedule.hour, minute: schedule.minute, tz: schedule.tz }, sent: 0, skipped: 0, held: 0, failed: 0 };
  if (env.GOING_DIGEST_SEND !== 'on') return { enabled: false, ...base };
  const nowMs = clock(env);
  const nowIso = new Date(nowMs).toISOString();
  const staleIso = new Date(nowMs - 15 * 60e3).toISOString();
  const slot = weekSlot(nowMs, schedule);
  const ids = (await env.SDB.prepare("SELECT DISTINCT card_id id FROM going_intents WHERE status='active' AND mail_status='queued'").all()).results || [];
  for (const item of ids) {
    let card;
    try { card = await goingCard(env, item.id, kit); }
    catch (e) { base.failed++; continue; }
    if (!card || !card.email) { base.held++; continue; }
    const rows = await queuedRows(env, card.id);
    if (!rows.length) continue;
    if (featuredCard(card)) {
      if (!slot) { base.held++; continue; }
      const due = rows.filter(r => { const t = Date.parse(r.updated_at || ''); return Number.isFinite(t) && t > slot.prevMs && t <= slot.slotMs; }).map(r => packRow(r, ''));
      if (!due.length) { base.skipped++; continue; }
      if (due.length > DIGEST_CAP) { await markDigest(env, 'featured:' + card.id + ':' + slot.key, card.id, 'featured', slot.key, 'held', 'too_many', nowIso); base.held++; continue; }
      const key = 'featured:' + card.id + ':' + slot.key;
      if (!(await claimDigest(env, key, card.id, 'featured', slot.key, nowIso, staleIso))) { base.skipped++; continue; }
      if (typeof env.GOING_DIGEST_AFTER_CLAIM === 'function') await env.GOING_DIGEST_AFTER_CLAIM(key);
      try {
        await sendDigest(env, kit, card, due, slot.key);
      } catch (e) {
        await env.SDB.prepare("UPDATE going_digests SET status='failed',reason='send_failed',snapshot=?,error=?,created_at=? WHERE digest_key=? AND status='sending'").bind(JSON.stringify(due), String(e && e.message || e).slice(0, 180), nowIso, key).run();
        base.failed++;
        continue;
      }
      await env.SDB.prepare("UPDATE going_digests SET status='sent',reason=NULL,snapshot=?,error=NULL,sent_at=? WHERE digest_key=? AND status='sending'").bind(JSON.stringify(due), nowIso, key).run();
      await finishSent(env, due, nowIso);
      base.sent++;
      continue;
    }
    const byDate = new Map();
    for (const r of rows) {
      const show = showOf(r);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(show)) { base.held++; continue; }
      const list = byDate.get(show) || [];
      list.push(r);
      byDate.set(show, list);
    }
    for (const [date, list] of byDate) {
      const key = 'regular:' + card.id + ':' + date;
      const hold = occurrenceHold(card, date);
      if (hold === 'cancelled') { await markDigest(env, key, card.id, 'regular', date, 'skipped', 'cancelled', nowIso); base.skipped++; continue; }
      if (hold === 'rescheduled') { await markDigest(env, key, card.id, 'regular', date, 'held', 'rescheduled', nowIso); base.held++; continue; }
      const window = regularWindow(date, card.time);
      if (!window) { await markDigest(env, key, card.id, 'regular', date, 'held', 'missing_time', nowIso); base.held++; continue; }
      if (nowMs >= window.startMs) { await markDigest(env, key, card.id, 'regular', date, 'skipped', 'past_start', nowIso); base.skipped++; continue; }
      if (nowMs < window.sendMs) continue;
      const due = list.map(r => packRow(r, showOf(r) || date));
      if (due.length > DIGEST_CAP) { await markDigest(env, key, card.id, 'regular', date, 'held', 'too_many', nowIso); base.held++; continue; }
      if (!(await claimDigest(env, key, card.id, 'regular', date, nowIso, staleIso))) { base.skipped++; continue; }
      if (typeof env.GOING_DIGEST_AFTER_CLAIM === 'function') await env.GOING_DIGEST_AFTER_CLAIM(key);
      try {
        await sendDigest(env, kit, card, due, date);
      } catch (e) {
        await env.SDB.prepare("UPDATE going_digests SET status='failed',reason='send_failed',snapshot=?,error=?,created_at=? WHERE digest_key=? AND status='sending'").bind(JSON.stringify(due), String(e && e.message || e).slice(0, 180), nowIso, key).run();
        base.failed++;
        continue;
      }
      await env.SDB.prepare("UPDATE going_digests SET status='sent',reason=NULL,snapshot=?,error=NULL,sent_at=? WHERE digest_key=? AND status='sending'").bind(JSON.stringify(due), nowIso, key).run();
      await finishSent(env, due, nowIso);
      base.sent++;
    }
  }
  return { enabled: true, ...base };
}

export async function goingDates(url, env, json, kit) {
  const id = url.searchParams.get('id') || '';
  if (!kit.ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
  let card;
  try { card = await goingCard(env, id, kit); }
  catch (e) { return json({ error: 'lookup_failed' }, 503); }
  if (!card) return json({ email: false, dates: [] });
  const today = shYmd(clock(env));
  const dates = occurrenceDates(card, today, 8);
  return json({ email: !!card.email, kind: card.kind || '', dates, today, tz: 'Asia/Shanghai' });
}

const DATE_KINDS = ['early_bird_start', 'early_bird_end', 'register_deadline', 'change', 'cancel'];
const ALERT_KINDS = ['early_bird_start', 'early_bird_end', 'register_deadline', 'host'];
const ymdOk = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
function reviewed(v) { return v === true || v === 1 || v === '1'; }
function clip(s, n) { return String(s || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n); }

export function noticesFromCard(card) {
  const out = [], id = card.id;
  for (const n of (Array.isArray(card.temp_notices) ? card.temp_notices : [])) {
    if (!n || (n.status !== 'changed' && n.status !== 'cancelled')) continue;
    const date = n.date || n.start;
    if (!ymdOk(date)) continue;
    const kind = n.status === 'cancelled' ? 'cancel' : 'change';
    const time = clip(n.time, 40);
    const text = clip(n.text, 400), textEn = clip(n.text_en, 400);
    const titleZh = kind === 'cancel' ? '本场取消' : '临时变更';
    const titleEn = kind === 'cancel' ? 'Cancelled' : 'Temporary change';
    const bodyZh = date + (time ? ' ' + time : '') + (text ? '。' + text : '');
    const bodyEn = date + (time ? ' ' + time : '') + (textEn ? '. ' + textEn : (text ? '. ' + text : ''));
    out.push({ card_id: id, kind, event_date: date, title_zh: titleZh, title_en: titleEn, body_zh: bodyZh, body_en: bodyEn, source: 'temp_notice' });
  }
  for (const a of (Array.isArray(card.alerts) ? card.alerts : [])) {
    if (!a || !reviewed(a.reviewed) || !ALERT_KINDS.includes(a.kind)) continue;
    if (a.kind !== 'host' && !ymdOk(a.date)) continue;
    const text = clip(a.text, 400), textEn = clip(a.text_en, 400);
    if (a.kind === 'host' && !text && !textEn) continue;
    const labels = { early_bird_start: ['早鸟开始', 'Early bird starts'], early_bird_end: ['早鸟截止', 'Early bird ends'], register_deadline: ['报名截止', 'Registration deadline'], host: ['主办消息', 'Organizer message'] };
    const [titleZh, titleEn] = labels[a.kind];
    const date = ymdOk(a.date) ? a.date : '';
    out.push({ card_id: id, kind: a.kind, event_date: date || null, title_zh: titleZh, title_en: titleEn, body_zh: (date ? date + '。' : '') + (text || textEn), body_en: (date ? date + '. ' : '') + (textEn || text), source: 'alert' });
  }
  return out;
}
function noticeKey(n) { return [n.card_id, n.kind, n.event_date || '', n.source, n.body_en.slice(0, 60)].join('|'); }
async function unsubSig(env, kit, email, card) {
  return kit.sha('going-unsub|' + email + '|' + card + '|' + (env.ADMIN_TOKEN || env.UNSUB_SECRET || 'going-unsub'));
}
export async function enqueueGoingNotices(env, kit) {
  const map = await goingIndex(env, kit);
  const created = [];
  const ts = new Date().toISOString();
  for (const [id, card] of Object.entries(map)) {
    for (const n of noticesFromCard({ ...card, id })) {
      if (DATE_KINDS.includes(n.kind) && !ymdOk(n.event_date)) continue;
      const key = noticeKey(n);
      const hit = await env.SDB.prepare('SELECT notice_key FROM going_notice_queue WHERE notice_key=?').bind(key).first();
      if (hit) continue;
      await env.SDB.prepare(`INSERT INTO going_notice_queue(notice_key,card_id,kind,event_date,title_zh,title_en,body_zh,body_en,source,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,'queued',?)`)
        .bind(key, n.card_id, n.kind, n.event_date, n.title_zh, n.title_en, n.body_zh, n.body_en, n.source, ts).run();
      created.push(key);
    }
  }
  return { created };
}
async function noticeMail(env, kit, notice, person) {
  const zh = person.lang === 'zh';
  const title = zh ? notice.title_zh : notice.title_en;
  const body = zh ? notice.body_zh : notice.body_en;
  const card = await goingCard(env, notice.card_id, kit);
  const name = card ? cardTitle(card, person.lang) : notice.card_id;
  const sig = await unsubSig(env, kit, person.email, notice.card_id);
  const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
  const unsub = base + '/social/going/unsub?e=' + encodeURIComponent(person.email) + '&c=' + encodeURIComponent(notice.card_id) + '&t=' + sig;
  const subject = (zh ? `本活动更新：${name}` : `Update for ${name}: ${title}`).slice(0, 180);
  const text = `探戈助理\n\n${name}\n${title}\n${body}\n\n` + (zh
    ? `这只发给打开了「收本活动更新」的人。退订本活动更新不会取消 Going／Interested：\n${unsub}\n\n没有写明的时间不会编造。`
    : `This goes only to people who opted in for this event. Unsubscribing does not cancel Going or Interested:\n${unsub}\n\nTimes that were not confirmed are not included.`);
  const foot = zh ? '退订本活动更新' : 'Unsubscribe from this event’s updates';
  const html = `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><body style="margin:0;padding:24px;background:#f6efe4;font-family:Georgia,serif;color:#2a1a14"><div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e7d3b0;border-radius:16px;padding:24px"><p>${kit.he(name)}</p><p><b>${kit.he(title)}</b></p><p>${kit.he(body)}</p><hr style="border:0;border-top:1px dashed #ead9b8"><p style="font-size:12px;color:#777"><a href="${kit.he(unsub)}">${foot}</a></p></div></body></html>`;
  await kit.deliver(env, person.email, subject, text, html, { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }, { fromName: '探戈助理' });
}
export async function sendGoingNotices(env, kit) {
  if (env.GOING_NOTICE_SEND !== 'on') return { enabled: false, sent: 0, failed: 0, skipped: 0 };
  const queued = (await env.SDB.prepare("SELECT * FROM going_notice_queue WHERE status='queued'").all()).results || [];
  let sent = 0, failed = 0, skipped = 0;
  for (const n of queued) {
    const people = (await env.SDB.prepare("SELECT i.email email, i.notify notify, COALESCE(u.lang,'en') lang FROM going_intents i LEFT JOIN users u ON u.email=i.email WHERE i.card_id=? AND i.status='active'").bind(n.card_id).all()).results || [];
    let anyFail = false;
    for (const p of people) {
      const done = await env.SDB.prepare('SELECT status FROM going_notice_sends WHERE notice_key=? AND email=?').bind(n.notice_key, p.email).first();
      if (done && done.status === 'sent') continue;
      const at = new Date().toISOString();
      if (!p.notify) {
        await env.SDB.prepare(`INSERT INTO going_notice_sends(notice_key,email,status,error,at) VALUES(?,?, 'skipped_unsub', NULL, ?)
          ON CONFLICT(notice_key,email) DO UPDATE SET status='skipped_unsub',at=excluded.at`).bind(n.notice_key, p.email, at).run();
        skipped++;
        continue;
      }
      try {
        await noticeMail(env, kit, n, p);
        await env.SDB.prepare(`INSERT INTO going_notice_sends(notice_key,email,status,error,at) VALUES(?,?, 'sent', NULL, ?)
          ON CONFLICT(notice_key,email) DO UPDATE SET status='sent',error=NULL,at=excluded.at`).bind(n.notice_key, p.email, at).run();
        sent++;
      } catch (e) {
        anyFail = true; failed++;
        await env.SDB.prepare(`INSERT INTO going_notice_sends(notice_key,email,status,error,at) VALUES(?,?, 'failed', ?, ?)
          ON CONFLICT(notice_key,email) DO UPDATE SET status='failed',error=excluded.error,at=excluded.at`).bind(n.notice_key, p.email, String(e && e.message || e).slice(0, 180), at).run();
      }
    }
    await env.SDB.prepare("UPDATE going_notice_queue SET status=?,sent_at=?,error=? WHERE notice_key=?").bind(anyFail ? 'failed' : 'sent', anyFail ? null : new Date().toISOString(), anyFail ? 'recipient_failed' : null, n.notice_key).run();
  }
  return { enabled: true, sent, failed, skipped };
}
export async function runGoingNotices(env, kit) {
  const enq = await enqueueGoingNotices(env, kit);
  const send = await sendGoingNotices(env, kit);
  return { ...enq, ...send, cc: false };
}
export async function goingUnsub(req, env, url, kit) {
  const sp = url.searchParams;
  let email = kit.emailParam(sp.get('e')), card = String(sp.get('c') || ''), tok = String(sp.get('t') || ''), go = false;
  if (req.method === 'POST') {
    let raw = ''; try { raw = await req.text(); } catch { raw = ''; }
    const form = new URLSearchParams(raw);
    email = kit.emailParam(form.get('e')); card = String(form.get('c') || ''); tok = String(form.get('t') || ''); go = form.get('confirm') === '1';
  }
  if (!kit.EMAIL_RE.test(email) || !kit.ID_RE.test(card) || tok !== await unsubSig(env, kit, email, card)) return kit.confirmPage(false, '链接无效。 / This link is invalid.');
  const row = await env.SDB.prepare('SELECT status,intent FROM going_intents WHERE email=? AND card_id=?').bind(email, card).first();
  if (req.method !== 'POST' || !go) {
    return new Response(`<!doctype html><meta charset="utf-8"><title>Unsubscribe</title><body style="font-family:system-ui;padding:24px"><p>退订本活动更新不会取消 Going／Interested。 / Unsubscribing does not cancel Going or Interested.</p><form method="post"><input type="hidden" name="e" value="${kit.he(email)}"><input type="hidden" name="c" value="${kit.he(card)}"><input type="hidden" name="t" value="${kit.he(tok)}"><input type="hidden" name="confirm" value="1"><button type="submit">退订本活动更新 / Unsubscribe from this event’s updates</button></form></body>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  if (row && row.status === 'active') await env.SDB.prepare('UPDATE going_intents SET notify=0,updated_at=? WHERE email=? AND card_id=?').bind(kit.now(), email, card).run();
  const still = await env.SDB.prepare('SELECT status,intent,notify FROM going_intents WHERE email=? AND card_id=?').bind(email, card).first();
  const kept = still && still.status === 'active';
  return kit.confirmPage(true, kept ? '已退订本活动更新。Going／Interested 还在。 / Unsubscribed from this event’s updates. Going / Interested is unchanged.' : '已退订。 / Unsubscribed.');
}
export async function goingNoticeAdmin(req, env, url, b, json, kit) {
  const a = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || a.length < 24 || a !== env.ADMIN_TOKEN) return json({ error: 'auth' }, 401);
  if (req.method === 'POST' && url.pathname.endsWith('/run')) {
    const r = await runGoingNotices(env, kit);
    return json({ ok: true, ...r });
  }
  if (req.method === 'POST') {
    if (!reviewed(b.reviewed)) return json({ error: 'need_review' }, 400);
    const id = String(b.card_id || '');
    if (!kit.ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
    const kind = b.kind === 'host' ? 'host' : '';
    const text = clip(b.text, 400), textEn = clip(b.text_en, 400);
    if (kind !== 'host' || (!text && !textEn)) return json({ error: 'need_text' }, 400);
    if (b.date && !ymdOk(b.date)) return json({ error: 'bad_date' }, 400);
    const n = { card_id: id, kind, event_date: ymdOk(b.date) ? b.date : null, title_zh: '主办消息', title_en: 'Organizer message', body_zh: (b.date && ymdOk(b.date) ? b.date + '。' : '') + (text || textEn), body_en: (b.date && ymdOk(b.date) ? b.date + '. ' : '') + (textEn || text), source: 'admin' };
    const key = noticeKey(n);
    const hit = await env.SDB.prepare('SELECT notice_key FROM going_notice_queue WHERE notice_key=?').bind(key).first();
    if (!hit) await env.SDB.prepare(`INSERT INTO going_notice_queue(notice_key,card_id,kind,event_date,title_zh,title_en,body_zh,body_en,source,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,'queued',?)`)
      .bind(key, n.card_id, n.kind, n.event_date, n.title_zh, n.title_en, n.body_zh, n.body_en, n.source, kit.now()).run();
    return json({ ok: true, queued: !hit, key, sent: false });
  }
  const items = (await env.SDB.prepare('SELECT notice_key,card_id,kind,event_date,status,source,created_at,sent_at,error FROM going_notice_queue ORDER BY created_at DESC LIMIT 100').all()).results || [];
  return json({ items, send_enabled: env.GOING_NOTICE_SEND === 'on' });
}
