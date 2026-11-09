// Star intent. Profile verify is separate from organizer mail.
// A menu profile confirm never emails an organizer. An explicit Going/Interested confirm
// from a verified address only queues a digest. It does not send one email per intent.
// Featured cards: at most one summary per week, and only when there is something new.
// Regular cards: one summary for that occurrence, three hours before its start.
// GOING_DIGEST_SEND stays off and no live cron calls the digest, so this does not send.
// Stats drafts are written for review. This module never sends them.
const PROFILE_MS = 7 * 24 * 3600e3;
const DAY = 24 * 3600e3;
const CC_DEFAULT = 'selecttango@gmail.com';
const ROLES = ['leader', 'follower', 'both'];
const INTENTS = ['going', 'interested'];
const EXPIRED = '链接已过期。请重新请求验证邮件。 / This link has expired. Request a new verification email.';
const INVALID = '链接无效。请重新请求验证邮件。 / This link is invalid. Request a new verification email.';
let cardCache = null;

function pickEmail(raw, EMAIL_RE) {
  const parts = String(raw || '').toLowerCase().split(/[\s,;<>]+/);
  for (const p of parts) if (EMAIL_RE.test(p)) return p;
  return '';
}
function orgDirectory(env) {
  const raw = env && env.GOING_ORG_DIR;
  const empty = { cards: {}, orgs: {}, links: {} };
  if (!raw) return empty;
  const d = typeof raw === 'object' ? raw : (() => { try { return JSON.parse(String(raw)); } catch { return empty; } })();
  return { cards: d.cards || {}, orgs: d.orgs || {}, links: d.links || {} };
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
  await env.SDB.prepare(`INSERT INTO profile_verify(email,token_hash,sent_at,tries,lang,name,city,role,alert_opt_in,ret) VALUES(?,?,?,0,?,?,?,?,?,?)
    ON CONFLICT(email) DO UPDATE SET token_hash=excluded.token_hash,sent_at=excluded.sent_at,tries=0,lang=excluded.lang,name=excluded.name,city=excluded.city,role=excluded.role,alert_opt_in=excluded.alert_opt_in,ret=excluded.ret`)
    .bind(row.email, hash, kit.now(), row.lang, row.name, row.city, row.role, row.alert, row.ret).run();
  const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
  return base + '/social/going/confirm?e=' + encodeURIComponent(row.email) + '&t=' + mag + '&next=' + encodeURIComponent(row.ret);
}
async function sendVerify(env, kit, row, link, pending) {
  const zh = row.lang === 'zh';
  const subject = zh ? '请确认邮箱｜亚洲探戈地图' : 'Please confirm your email | Asia Tango Map';
  const extra = pending
    ? (zh ? `\n\n你已确认「${pending.title}」的意向（${pending.intent === 'going' ? '要参加' : '感兴趣'}）。点下面的确认之后，意向才会进入发给主办的汇总，不会立刻逐封发送。只打开这封信不会发信。\n` : `\n\nYou already confirmed intent for "${pending.title}" (${pending.intent === 'going' ? 'Going' : 'Interested'}). After you tap Confirm, it joins the organizer summary. It is not emailed one by one. Opening this email does not send it.\n`)
    : (zh ? '\n\n这只保存你的资料。确认邮箱不会通知组织者，也不会标记任何活动。\n' : '\n\nThis only saves your profile. Confirming does not email an organizer or mark an event.\n');
  const text = (zh ? `${row.name}，你好！\n\n请在 7 天内打开下面的链接，再点「确认」。\n\n${link}\n` : `Hi ${row.name},\n\nOpen the link below within 7 days, then tap Confirm.\n\n${link}\n`) + extra + (zh ? '\n如果不是你本人操作，忽略即可。\n\n探戈助理\nhttps://tangoweekend.org' : '\nIf this wasn\'t you, you can ignore this email.\n\n探戈助理\nhttps://tangoweekend.org');
  const html = `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><body style="margin:0;padding:24px;background:#f6efe4;font-family:Georgia,serif;color:#2a1a14"><div style="max-width:480px;margin:0 auto;background:#fffdf8;border:1px solid #e7d3b0;border-radius:16px;padding:24px"><p>${kit.he(zh ? row.name + '，你好！' : 'Hi ' + row.name + ',')}</p><p>${zh ? '请在 7 天内点下面的按钮确认邮箱。' : 'Tap the button below within 7 days to confirm your email.'}</p><p style="margin:22px 0"><a href="${kit.he(link)}" style="display:inline-block;background:#0e6e78;color:#f6e3b4;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${zh ? '确认' : 'Confirm'}</a></p><p>${kit.he(extra.trim())}</p><p>探戈助理<br><a href="https://tangoweekend.org">https://tangoweekend.org</a></p></div></body></html>`;
  return kit.deliver(env, row.email, subject, text, html, undefined, { fromName: '探戈助理' });
}
function intentLabel(intent) {
  return intent === 'going' ? 'Going / 要参加' : 'Interested / 感兴趣';
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
    const date = !featured && r.occurrence_date ? `Date / 场次: ${r.occurrence_date} (Beijing time UTC+8, Asia/Shanghai)\n` : '';
    const transport = r.transport ? 'Directions / 交通指引: please send directions to the venue. The organizer replies directly. Delivery and timing are not guaranteed.\n请寄送前往场地的交通指引。组织者自行回复，不保证送达或回复时间。\n' : '';
    return `${r.name} <${r.email}>\nIntent / 意向: ${intentLabel(r.intent)}\n${date}${transport}`.trim();
  }).join('\n\n');
  const when = featured
    ? `Week / 本周汇总: ${period} (Asia/Shanghai). One summary for new intents on this event.\n`
    : `Occurrence / 场次: ${period} (Asia/Shanghai). One summary, three hours before the listed start.\n`;
  let text = `探戈助理\n\nNew event intent on Asia Tango Map.\n亚洲探戈地图有新的活动意向。\n\nEvent / 活动: ${title}\n${titleEn && titleEn !== title ? titleEn + '\n' : ''}Card: ${card.id}\n${when}\n${lines}\n\nThis is not a ticket purchase or a formal registration.\n这不是购票或正式报名。\nCity and role are not included.\n城市与角色未附在本信。\nThe “receive updates” choice does not decide whether this summary is sent.\n「接收主办方讯息」不影响这封汇总是否发出。\n`;
  if (dest.intended) text = `[test] Intended organizer: ${dest.intended}\n【测试】原收件主办方：${dest.intended}\n\n` + text;
  const subject = (featured ? `Intent summary: ${titleEn || title}` : `Intent summary ${period}: ${titleEn || title}`).slice(0, 180);
  const replyTo = rows.length === 1 ? rows[0].email : '';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6efe4;font-family:Georgia,serif;color:#2a1a14"><div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e7d3b0;border-radius:16px;padding:24px"><p><b>探戈助理</b></p><p>${kit.he(title)}<br>${kit.he(period)}</p><ul>${rows.map(r => `<li>${kit.he(r.name)} &lt;${kit.he(r.email)}&gt; — ${kit.he(intentLabel(r.intent))}${r.occurrence_date && !featured ? ' · ' + kit.he(r.occurrence_date) : ''}${r.transport ? ' · directions' : ''}</li>`).join('')}</ul><p>This is not a ticket or a formal registration. City and role are not included.<br>这不是购票或正式报名。城市与角色未附在本信。</p>${dest.intended ? `<p>[test] Intended organizer: ${kit.he(dest.intended)}</p>` : ''}</div></body></html>`;
  await kit.deliver(env, dest.to, subject, text, html, undefined, { cc, replyTo, fromName: '探戈助理' });
  return { ok: true };
}
async function rateOk(env, email, cardId, iph) {
  const since = new Date(Date.now() - DAY).toISOString();
  const byEmail = await env.SDB.prepare('SELECT COUNT(*) n FROM going_sends WHERE email=? AND card_id=? AND created_at>?').bind(email, cardId, since).first('n');
  const byIp = await env.SDB.prepare('SELECT COUNT(*) n FROM going_sends WHERE ip_hash=? AND created_at>?').bind(iph, since).first('n');
  return (byEmail || 0) < 3 && (byIp || 0) < 12;
}
async function materialize(env, kit, row, iph) {
  const card = await goingCard(env, row.card_id, kit);
  if (!card || !card.email) {
    await env.SDB.prepare(`INSERT INTO going_intents(email,card_id,intent,occurrence_date,transport,notify,status,mail_status,created_at,updated_at) VALUES(?,?,?,?,?,?,'active','failed',?,?)
      ON CONFLICT(email,card_id) DO UPDATE SET intent=excluded.intent,occurrence_date=excluded.occurrence_date,transport=excluded.transport,notify=excluded.notify,status='active',mail_status='failed',updated_at=excluded.updated_at`)
      .bind(row.email, row.card_id, row.intent, row.occurrence_date || null, row.transport ? 1 : 0, row.notify ? 1 : 0, kit.now(), kit.now()).run();
    return { ok: true, mailed: false, mail: 'no_organizer' };
  }
  const today = shYmd(clock(env));
  let date = row.occurrence_date || '';
  if (card.kind === 'event' || card.kind === 'featured') date = '';
  else {
    const dates = occurrenceDates(card, today, 16);
    if (!dates.length) return { error: 'bad_date' };
    if (!date) date = dates[0];
    if (dates.indexOf(date) < 0) return { error: 'bad_date' };
  }
  const transport = (card.kind === 'event' || card.kind === 'featured') ? 0 : (row.transport ? 1 : 0);
  const fp = fpOf(row.intent, date, transport);
  const prev = await env.SDB.prepare('SELECT intent,occurrence_date,transport,mail_status,mail_fp,status FROM going_intents WHERE email=? AND card_id=?').bind(row.email, row.card_id).first();
  const ts = kit.now();
  const prevFp = prev ? fpOf(prev.intent, prev.occurrence_date || '', prev.transport) : '';
  const sameFacts = !!(prev && prev.status === 'active' && prevFp === fp && (prev.mail_status === 'sent' || prev.mail_status === 'queued'));
  if (sameFacts) {
    await env.SDB.prepare('UPDATE going_intents SET notify=?,updated_at=? WHERE email=? AND card_id=?').bind(row.notify ? 1 : 0, ts, row.email, row.card_id).run();
    return { ok: true, mailed: false, mail: 'unchanged', date };
  }
  const alreadySent = !!(prev && prev.mail_fp === fp && prev.mail_status === 'sent');
  const mailStatus = alreadySent ? 'sent' : 'queued';
  if (!alreadySent && !(await rateOk(env, row.email, row.card_id, iph || ''))) {
    await saveIntent(env, row, date, transport, 'failed', prev && prev.mail_fp || null, ts);
    return { ok: true, mailed: false, mail: 'rate_limited', date };
  }
  await saveIntent(env, row, date, transport, mailStatus, prev && prev.mail_fp || null, ts);
  return { ok: true, mailed: false, mail: alreadySent ? 'unchanged' : 'queued', date };
}
async function saveIntent(env, row, date, transport, mailStatus, mailFp, ts) {
  await env.SDB.prepare(`INSERT INTO going_intents(email,card_id,intent,occurrence_date,transport,notify,status,mail_status,mail_fp,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(email,card_id) DO UPDATE SET intent=excluded.intent,occurrence_date=excluded.occurrence_date,transport=excluded.transport,notify=excluded.notify,status='active',mail_status=excluded.mail_status,mail_fp=excluded.mail_fp,updated_at=excluded.updated_at`)
    .bind(row.email, row.card_id, row.intent, date || null, transport, row.notify ? 1 : 0, 'active', mailStatus, mailFp, ts, ts).run();
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
  if (!kit.EMAIL_RE.test(email) || !/^[0-9a-f]{64}$/.test(tok) || !next) return page(kit, false, 'en', INVALID, '');
  const hash = await kit.sha(email + ':' + tok);
  const row = await env.SDB.prepare('SELECT * FROM profile_verify WHERE email=?').bind(email).first();
  const sent = Date.parse(row && row.sent_at || '');
  if (!row || row.token_hash !== hash || (row.tries || 0) >= 5 || !Number.isFinite(sent) || sent + PROFILE_MS < Date.now()) {
    if (req.method === 'POST' && go && row && row.token_hash !== hash) await env.SDB.prepare('UPDATE profile_verify SET tries=tries+1 WHERE email=?').bind(email).run();
    return page(kit, false, row && row.lang === 'zh' ? 'zh' : 'en', !row || sent + PROFILE_MS < Date.now() ? EXPIRED : INVALID, '');
  }
  const lang = row.lang === 'zh' ? 'zh' : 'en';
  if (req.method !== 'POST' || !go) return confirmForm(kit, lang, email, tok, next);
  const user = await upsertUser(env, kit, email, { name: row.name, city: row.city, role: row.role, lang, iph: '' });
  await env.SDB.prepare('UPDATE users SET verified_at=COALESCE(verified_at,?),name=?,city=?,role=?,lang=? WHERE id=?').bind(kit.now(), row.name, row.city, row.role, lang, user.id).run();
  const token = await kit.issueSession(env, { ...user, lang }, { keepCode: true });
  if (row.alert_opt_in) { try { await kit.applyList(env, { email, name: row.name, lang }, true); } catch (e) { console.log('going list', String(e && e.message || e).slice(0, 120)); } }
  const pend = (await env.SDB.prepare('SELECT * FROM going_pending WHERE email=? AND consumed_at IS NULL').bind(email).all()).results || [];
  let saw = false, didQueue = false, failed = false;
  for (const p of pend) {
    saw = true;
    const r = await materialize(env, kit, p, '');
    await env.SDB.prepare('UPDATE going_pending SET consumed_at=? WHERE id=?').bind(kit.now(), p.id).run();
    if (r.mail === 'queued') didQueue = true;
    else if (r.mail === 'failed' || r.mail === 'rate_limited') failed = true;
  }
  const mail = failed ? 'fail' : (didQueue ? 'queued' : (saw ? 'unchanged' : 'none'));
  await env.SDB.prepare('DELETE FROM profile_verify WHERE email=?').bind(email).run();
  const dest = new URL(next);
  dest.hash = 'atm=' + token + '&going=' + mail;
  const msg = mail === 'queued'
    ? (lang === 'zh' ? '已记录你的意向。会在汇总时通知主办（含抄送）。' : 'Your intent is saved. The organizer is notified in the next summary (with CC).')
    : mail === 'fail'
      ? (lang === 'zh' ? '意向已保存；通知邮件发送失败，请稍后重试。' : 'Intent saved; the notification failed to send. Please try again later.')
      : mail === 'unchanged'
        ? (lang === 'zh' ? '意向已保存。没有新的内容需要汇总。' : 'Intent saved. Nothing new is waiting for the summary.')
        : (lang === 'zh' ? '邮箱已验证，资料已保存。可到活动五角星选择要参加或感兴趣。' : 'Email verified. Profile saved. Use the star on an event to choose Going or Interested.');
  return page(kit, true, lang, msg, dest.toString());
}

function readProfile(b, kit) {
  const name = oneLine(kit.clean, b.name, 80);
  const email = kit.clean(b.email, 254).toLowerCase();
  const city = oneLine(kit.clean, b.city, 40);
  const role = roleOf(b.role);
  return { name, email, city, role };
}

export async function goingProfile(req, env, b, ip, iph, json, kit) {
  if (b.website) return json({ ok: true, confirm: true });
  const { name, email, city, role } = readProfile(b, kit);
  if (!name) return json({ error: 'need_name' }, 400);
  if (!kit.EMAIL_RE.test(email)) return json({ error: 'need_email' }, 400);
  if (!city) return json({ error: 'need_city' }, 400);
  if (!role) return json({ error: 'need_role' }, 400);
  const ret = kit.safeNext(b.ret);
  if (!ret) return json({ error: 'bad_return' }, 400);
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const alert = flag(b.alert, 0);
  if (!(await kit.turnstile(env, b.ts, ip))) return json({ error: 'turnstile' }, 403);
  const session = await sessionUser(req, env);
  if (session && session.email === email) {
    await env.SDB.prepare('UPDATE users SET name=?,city=?,role=?,lang=? WHERE id=?').bind(name, city, role, lang, session.id).run();
    if (alert) { try { await kit.applyList(env, { email, name, lang }, true); } catch (e) { console.log('going list', String(e && e.message || e).slice(0, 120)); } }
    return json({ ok: true, verified: true, session: true, mailed: false });
  }
  const recent = await env.SDB.prepare('SELECT sent_at FROM profile_verify WHERE email=?').bind(email).first();
  if (recent && Date.now() - Date.parse(recent.sent_at) < 60e3) return json({ error: 'rate_limited' }, 429);
  const ipCount = await env.SDB.prepare('SELECT COUNT(*) n FROM users WHERE ip_hash=? AND created_at>?').bind(iph, new Date(Date.now() - 3600e3).toISOString()).first('n');
  if ((ipCount || 0) >= 8) return json({ error: 'rate_limited' }, 429);
  await upsertUser(env, kit, email, { name, city, role, lang, iph });
  const link = await saveVerify(env, kit, { email, name, city, role, lang, alert, ret });
  let via;
  try { via = await sendVerify(env, kit, { email, name, lang }, link, null); }
  catch (e) { return json({ error: 'send_failed' }, 502); }
  return json({ ok: true, confirm: true, mailed: false, ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_link: link } : {}) });
}

export async function goingRestore(req, env, b, ip, json, kit) {
  const email = kit.clean(b.email, 254).toLowerCase();
  if (!kit.EMAIL_RE.test(email)) return json({ error: 'need_email' }, 400);
  const ret = kit.safeNext(b.ret);
  if (!ret) return json({ error: 'bad_return' }, 400);
  if (!(await kit.turnstile(env, b.ts, ip))) return json({ error: 'turnstile' }, 403);
  const u = await env.SDB.prepare('SELECT name,city,role,lang,verified_at FROM users WHERE email=?').bind(email).first();
  if (!u || !u.verified_at) return json({ ok: true, confirm: true, mailed: false });
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const link = await saveVerify(env, kit, { email, name: u.name || email, city: u.city || '', role: roleOf(u.role), lang, alert: 0, ret });
  let via;
  try { via = await sendVerify(env, kit, { email, name: u.name || email, lang }, link, null); }
  catch (e) { return json({ error: 'send_failed' }, 502); }
  return json({ ok: true, confirm: true, mailed: false, ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_link: link } : {}) });
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
  if (!(await kit.turnstile(env, b.ts, ip))) return json({ error: 'turnstile' }, 403);
  let card;
  try { card = await goingCard(env, id, kit); }
  catch (e) { console.log('going events', String(e && e.message || e).slice(0, 160)); return json({ error: 'lookup_failed' }, 503); }
  if (!card || !card.email) return json({ error: 'no_organizer' }, 404);
  const session = await sessionUser(req, env);
  let name, email, city, role;
  if (session) {
    name = oneLine(kit.clean, b.name, 80) || session.name;
    email = session.email;
    city = oneLine(kit.clean, b.city, 40) || session.city || '';
    role = roleOf(b.role) || roleOf(session.role);
    if (!name || !city || !role) return json({ error: !city ? 'need_city' : (!role ? 'need_role' : 'need_name'), need_profile: true }, 400);
    await env.SDB.prepare('UPDATE users SET name=?,city=?,role=? WHERE id=?').bind(name, city, role, session.id).run();
    const result = await materialize(env, kit, { email, card_id: id, intent, occurrence_date: b.date || '', transport, notify, name, lang }, iph);
    if (result.error) return json({ error: result.error }, 400);
    return json({ ok: true, verified: true, mailed: !!result.mailed, mail: result.mail, date: result.date || '' });
  }
  const prof = readProfile(b, kit);
  name = prof.name; email = prof.email; city = prof.city; role = prof.role;
  if (!name) return json({ error: 'need_name' }, 400);
  if (!kit.EMAIL_RE.test(email)) return json({ error: 'need_email' }, 400);
  if (!city) return json({ error: 'need_city' }, 400);
  if (!role) return json({ error: 'need_role' }, 400);
  let date = String(b.date || '');
  if (card.kind === 'event' || card.kind === 'featured') { date = ''; }
  else {
    const dates = occurrenceDates(card, shYmd(clock(env)), 16);
    if (!date) date = dates[0] || '';
    if (!date || dates.indexOf(date) < 0) return json({ error: 'bad_date' }, 400);
  }
  const useTransport = (card.kind === 'event' || card.kind === 'featured') ? 0 : transport;
  await upsertUser(env, kit, email, { name, city, role, lang, iph });
  await env.SDB.prepare(`INSERT INTO going_pending(email,card_id,intent,occurrence_date,transport,notify,name,created_at) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(email,card_id) DO UPDATE SET intent=excluded.intent,occurrence_date=excluded.occurrence_date,transport=excluded.transport,notify=excluded.notify,name=excluded.name,created_at=excluded.created_at,consumed_at=NULL`)
    .bind(email, id, intent, date || null, useTransport, notify, name, kit.now()).run();
  const link = await saveVerify(env, kit, { email, name, city, role, lang, alert: 0, ret });
  let via;
  try { via = await sendVerify(env, kit, { email, name, lang }, link, { title: cardTitle(card, lang), intent }); }
  catch (e) {
    await env.SDB.prepare('DELETE FROM going_pending WHERE email=? AND card_id=? AND consumed_at IS NULL').bind(email, id).run();
    return json({ error: 'send_failed' }, 502);
  }
  return json({ ok: true, confirm: true, mailed: false, ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_link: link } : {}) });
}

export async function goingCancel(req, env, b, json, kit) {
  const session = await sessionUser(req, env);
  if (!session) return json({ error: 'auth' }, 401);
  const id = String(b.id || '');
  if (!kit.ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
  if (!(b.explicit === 1 || b.explicit === true || b.explicit === '1')) return json({ error: 'need_explicit' }, 400);
  const cur = await env.SDB.prepare('SELECT id,status FROM going_intents WHERE email=? AND card_id=?').bind(session.email, id).first();
  if (!cur || cur.status !== 'active') return json({ ok: true, cancelled: false, mailed: false });
  await env.SDB.prepare("UPDATE going_intents SET status='cancelled',updated_at=? WHERE id=?").bind(kit.now(), cur.id).run();
  return json({ ok: true, cancelled: true, mailed: false });
}

export async function goingCounts(url, env, json) {
  const ids = (url.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(s => /^[A-Za-z0-9_-]{1,64}$/.test(s)).slice(0, 100);
  const counts = {};
  ids.forEach(id => { counts[id] = 0; });
  if (!ids.length) return json({ counts });
  const q = ids.map(() => '?').join(',');
  (await env.SDB.prepare(`SELECT card_id,COUNT(DISTINCT email) n FROM going_intents WHERE status='active' AND card_id IN (${q}) GROUP BY card_id`).bind(...ids).all()).results
    .forEach(r => { counts[r.card_id] = r.n; });
  return json({ counts });
}

export async function goingMine(req, env, json) {
  const session = await sessionUser(req, env);
  if (!session) return json({ error: 'auth' }, 401);
  const rows = (await env.SDB.prepare("SELECT card_id,intent,occurrence_date,transport,notify,mail_status,status,updated_at FROM going_intents WHERE email=? AND status='active' ORDER BY updated_at DESC").bind(session.email).all()).results || [];
  return json({
    email: session.email, name: session.name, city: session.city || '', role: session.role || '',
    items: rows.map(r => ({ id: r.card_id, intent: r.intent, date: r.occurrence_date || '', transport: !!r.transport, notify: !!r.notify, mail: r.mail_status }))
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
  const h = Number(rawH == null || rawH === '' ? 9 : rawH);
  const m = Number(rawM == null || rawM === '' ? 0 : rawM);
  return {
    weekday: Number.isInteger(w) && w >= 0 && w <= 6 ? w : 1,
    hour: Number.isInteger(h) && h >= 0 && h <= 23 ? h : 9,
    minute: Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0,
    tz: 'Asia/Shanghai',
    // Monday 09:00 is only the pending-review default. It is not a user decision.
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
  return (await env.SDB.prepare(`SELECT i.email email,i.card_id card_id,i.intent intent,i.occurrence_date occurrence_date,i.transport transport,i.mail_status mail_status,i.updated_at updated_at,u.name name,u.verified_at verified_at
    FROM going_intents i JOIN users u ON u.email=i.email
    WHERE i.card_id=? AND i.status='active' AND i.mail_status='queued' AND u.verified_at IS NOT NULL
    ORDER BY i.email`).bind(cardId).all()).results || [];
}
async function finishSent(env, rows, nowIso) {
  for (const row of rows) {
    const cur = await env.SDB.prepare('SELECT intent,occurrence_date,transport,status,mail_status FROM going_intents WHERE email=? AND card_id=?').bind(row.email, row.card_id).first();
    if (!cur || cur.status !== 'active' || cur.mail_status !== 'queued') continue;
    const fp = fpOf(cur.intent, cur.occurrence_date || '', cur.transport);
    if (fp !== row.fp) continue;
    await env.SDB.prepare("UPDATE going_intents SET mail_status='sent',mail_fp=?,sent_at=?,updated_at=? WHERE email=? AND card_id=? AND mail_status='queued'").bind(fp, nowIso, nowIso, row.email, row.card_id).run();
  }
}
function packRow(r, date) {
  return { email: r.email, name: oneLine((s, n) => String(s || '').trim().slice(0, n), r.name, 80) || r.email, intent: r.intent, occurrence_date: date || '', transport: r.transport ? 1 : 0, card_id: r.card_id, fp: fpOf(r.intent, date || '', r.transport ? 1 : 0), updated_at: r.updated_at };
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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.occurrence_date || '')) { base.held++; continue; }
      const list = byDate.get(r.occurrence_date) || [];
      list.push(r);
      byDate.set(r.occurrence_date, list);
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
      const due = list.map(r => packRow(r, date));
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
  await kit.deliver(env, person.email, subject, text, undefined, undefined, { fromName: '探戈助理' });
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
