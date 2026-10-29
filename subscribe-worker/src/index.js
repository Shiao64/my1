// Asia Tango Map "event alerts" API — double opt-in (draft, NOT deployed).
// POST /subscribe {email (required), wechat?, types, cities, lang, website(honeypot)}
//   -> row in email_subs with status 'pending' + confirmation email with a one-time link (token, valid 7 days).
// GET  /confirm?t=TOKEN   -> status 'active' (on the mailing list) + welcome email + owner notification.
// GET  /unsubscribe?t=TOKEN (and POST for List-Unsubscribe one-click) -> status 'unsubscribed'.
// Cron (daily): delete pending rows not confirmed within 7 days.
// The old collect-only table `subs` is kept as-is; still written for backward-compatible owner records.
import { EmailMessage } from 'cloudflare:email';

const ORIGINS = ['https://tangoweekend.org', 'https://www.tangoweekend.org'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_MAX = 5, RATE_WIN_MIN = 60, PENDING_DAYS = 7, DAY = 86400000;

const T = {
  zh: {
    cSubj: '请确认订阅：亚洲探戈地图新活动通知',
    cBody: l => `您好！\n\n请点击下面的链接确认订阅亚洲探戈地图的新活动通知：\n${l}\n\n链接7天内有效。7天内没有确认，您的邮箱会被自动删除。\n如果不是您本人操作，请忽略这封邮件，我们不会再发邮件给您。`,
    wSubj: '订阅成功：亚洲探戈地图新活动通知',
    wBody: '谢谢订阅！以后有新活动，我们会发邮件通知您。',
    okPage: '订阅成功！欢迎邮件已发到您的邮箱。', already: '您已经订阅过了，不需要再确认。',
    bad: '链接无效或已过期（7天），请重新订阅。', unsub: '已退订，您不会再收到新活动通知。',
    unsubLine: '退订', foot: '随时可退订，不会把您的信息给别人。', back: '返回亚洲探戈地图', home: 'https://tangoweekend.org/zh/asia/'
  },
  en: {
    cSubj: 'Please confirm: Asia Tango Map event alerts',
    cBody: l => `Hi!\n\nPlease click the link below to confirm your subscription to Asia Tango Map event alerts:\n${l}\n\nThe link is valid for 7 days. If you don't confirm within 7 days, your email address is deleted automatically.\nIf this wasn't you, just ignore this email and you won't hear from us again.`,
    wSubj: "You're subscribed: Asia Tango Map event alerts",
    wBody: "Thanks for subscribing! We'll email you when new events are added.",
    okPage: "You're subscribed! A welcome email is on its way.", already: "You're already subscribed. Nothing more to do.",
    bad: 'This link is invalid or has expired (7 days). Please subscribe again.', unsub: "You're unsubscribed. You won't get any more event alerts.",
    unsubLine: 'Unsubscribe', foot: 'Unsubscribe anytime. We never share your info.', back: 'Back to the Asia Tango Map', home: 'https://tangoweekend.org/asia/'
  }
};

const cors = (o, env) => (ORIGINS.includes(o) || (env.ALLOW_LOCAL === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)))
  ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
const json = (d, s, h) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
const nowIso = () => new Date().toISOString();
const tok = () => [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
async function sha(s, n = 32) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].slice(0, n).map(b => b.toString(16).padStart(2, '0')).join(''); }
const shTime = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）';

function page(lang, msg, status = 200) {
  const t = T[lang] || T.en;
  return new Response(`<!doctype html><html lang="${lang === 'zh' ? 'zh-CN' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(msg)}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.1rem;color:#0a4f57;font-weight:700">${esc(msg)}</p><p><a href="${t.home}" style="color:#0e6e78">${t.back}</a></p><p style="font-size:.8rem;color:#7a6255">${t.foot}</p></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// Subscriber mail. Provider chosen by env.MAIL_PROVIDER: 'cloudflare' (Email Sending binding SUB_MAIL, Workers Paid),
// 'resend' (RESEND_API_KEY secret), or 'log' (default: print only, nothing is sent).
async function sendToSubscriber(env, to, subject, text, html, unsubUrl) {
  if (env.TEST_ONLY_RECIPIENT && to !== env.TEST_ONLY_RECIPIENT) throw new Error('recipient not allowed in test mode');
  const headers = unsubUrl ? { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : {};
  const p = env.MAIL_PROVIDER || 'log';
  if (p === 'cloudflare') {
    await env.SUB_MAIL.send({ from: { email: env.SENDER, name: env.SENDER_NAME || 'Asia Tango Map' }, to, subject, text, html, headers });
  } else if (p === 'resend') {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${env.SENDER_NAME || 'Asia Tango Map'} <${env.SENDER}>`, to: [to], subject, text, html, headers }) });
    if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 150));
  } else {
    console.log(`[mail:log] to=${to} subject=${subject}\n${text}`);
  }
  return 'sent:' + p;
}
function mailHtml(lines, link, t, unsub) {
  return `<div style="font-family:system-ui,sans-serif;color:#2a1a14;max-width:520px">${lines.map(l => `<p>${esc(l)}</p>`).join('')}` +
    (link ? `<p><a href="${link}" style="display:inline-block;background:#0e6e78;color:#f6e3b4;padding:10px 18px;border-radius:999px;text-decoration:none">${esc(link.includes('/confirm') ? (t === T.zh ? '确认订阅' : 'Confirm subscription') : link)}</a></p><p style="font-size:12px;color:#777">${esc(link)}</p>` : '') +
    `<hr style="border:0;border-top:1px dashed #ead9b8"><p style="font-size:12px;color:#777">${esc(t.foot)}${unsub ? ` <a href="${unsub}">${esc(t.unsubLine)}</a>` : ''}</p></div>`;
}
// Owner notification via the existing Email Routing binding (fixed destination, works on Workers Free).
async function notifyOwner(env, subject, text) {
  if (!env.EMAIL || !env.NOTIFY_TO) { console.log('[owner:log]', subject, text); return 'log'; }
  const raw = [`From: Asia Tango Map <${env.SENDER}>`, `To: ${env.NOTIFY_TO}`, `Subject: =?UTF-8?B?${b64(subject)}?=`, `Message-ID: <${crypto.randomUUID()}@tangoweekend.org>`,
    `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(text).replace(/.{76}/g, '$&\r\n')].join('\r\n');
  try { await env.EMAIL.send(new EmailMessage(env.SENDER, env.NOTIFY_TO, raw)); return 'sent'; } catch (e) { return 'fail: ' + String(e.message || e).slice(0, 150); }
}

async function subscribe(req, env, h) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400, h); }
  if (b.website) return json({ ok: true, pending: true }, 200, h); // honeypot
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
  const wechat = String(b.wechat || '').trim().slice(0, 64);
  const types = (Array.isArray(b.types) ? b.types : ['featured', 'regular']).filter(t => t === 'featured' || t === 'regular');
  const cities = types.includes('regular') ? (Array.isArray(b.cities) ? b.cities : []).map(c => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 40) : [];
  if (!email) return json({ error: 'need_email' }, 400, h);          // email is required (WeChat can't receive alerts)
  if (!EMAIL_RE.test(email)) return json({ error: 'bad_email' }, 400, h);
  if (!types.length) return json({ error: 'need_type' }, 400, h);
  const isTest = b.test ? 1 : 0;

  const ip = await sha((req.headers.get('CF-Connecting-IP') || '') + (env.IP_SALT || 'tw'), 12);
  const since = new Date(Date.now() - RATE_WIN_MIN * 60000).toISOString();
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM email_subs WHERE ip_hash=? AND (created_at>? OR pending_since>?)').bind(ip, since, since).first('n');
  if (n >= RATE_MAX) return json({ error: 'rate_limited' }, 429, h);

  const row = await env.DB.prepare('SELECT id,status,unsub_token FROM email_subs WHERE email=?').bind(email).first();
  // Same neutral answer whether or not the address is already on the list (no membership leak, no extra mail to active members).
  if (row && row.status === 'active') return json({ ok: true, pending: true }, 200, h);

  const token = tok(), hash = await sha(token), unsub = row?.unsub_token || tok(), now = nowIso();
  await env.DB.prepare(`INSERT INTO email_subs(email,wechat,types,cities,lang,status,confirm_hash,pending_since,unsub_token,created_at,ip_hash,is_test)
      VALUES(?,?,?,?,?,'pending',?,?,?,?,?,?)
      ON CONFLICT(email) DO UPDATE SET wechat=COALESCE(excluded.wechat,wechat),types=excluded.types,cities=excluded.cities,lang=excluded.lang,
        status='pending',confirm_hash=excluded.confirm_hash,pending_since=excluded.pending_since,ip_hash=excluded.ip_hash,unsubscribed_at=NULL`)
    .bind(email, wechat || null, types.join(','), cities.join(',') || 'all', lang, hash, now, unsub, now, ip, isTest).run();

  const t = T[lang], link = `${env.API_BASE}/confirm?t=${token}`;
  let st;
  try { st = await sendToSubscriber(env, email, t.cSubj, `${t.cBody(link)}\n\n${t.foot}`, mailHtml(t.cBody('').split('\n').filter(Boolean), link, t)); }
  catch (e) { st = 'fail: ' + String(e.message || e).slice(0, 150); }
  await env.DB.prepare('UPDATE email_subs SET confirm_mail_status=? WHERE email=?').bind(st, email).run();
  if (st.startsWith('fail')) return json({ error: 'send_failed' }, 502, h);
  return json({ ok: true, pending: true }, 200, h);
}

async function confirm(url, env) {
  const t0 = url.searchParams.get('t') || '';
  if (!/^[0-9a-f]{48}$/.test(t0)) return page('en', T.en.bad, 400);
  const r = await env.DB.prepare('SELECT * FROM email_subs WHERE confirm_hash=?').bind(await sha(t0)).first();
  if (!r) return page('en', T.en.bad, 400);
  const lang = r.lang === 'zh' ? 'zh' : 'en', t = T[lang];
  if (r.status !== 'pending' || Date.parse(r.pending_since) + PENDING_DAYS * DAY < Date.now()) return page(lang, t.bad, 400);
  await env.DB.prepare("UPDATE email_subs SET status='active',confirm_hash=NULL,pending_since=NULL,confirmed_at=? WHERE id=?").bind(nowIso(), r.id).run();
  const unsub = `${env.API_BASE}/unsubscribe?t=${r.unsub_token}`;
  let ws; try { ws = await sendToSubscriber(env, r.email, t.wSubj, `${t.wBody}\n\n${t.foot}\n${t.unsubLine}: ${unsub}`, mailHtml([t.wBody], null, t, unsub), unsub); }
  catch (e) { ws = 'fail: ' + String(e.message || e).slice(0, 150); }
  await env.DB.prepare('UPDATE email_subs SET welcome_mail_status=? WHERE id=?').bind(ws, r.id).run();
  const typeZh = r.types.split(',').map(x => x === 'featured' ? '特色活动' : '常规活动').join('、');
  await notifyOwner(env, `${r.is_test ? '[测试] ' : ''}新订阅已确认 #${r.id} ${r.email}`,
    [`亚洲探戈地图 新订阅（已确认）#${r.id}`, '', `邮箱：${r.email}`, `微信号：${r.wechat || '（未填）'}`, `活动类型：${typeZh}`, `城市：${r.cities === 'all' ? '全部城市' : r.cities}`, `确认时间：${shTime()}`, `页面语言：${lang === 'zh' ? '中文' : 'English'}`].join('\n'));
  return page(lang, t.okPage);
}

async function unsubscribe(url, env) {
  const t0 = url.searchParams.get('t') || '';
  const r = /^[0-9a-f]{48}$/.test(t0) ? await env.DB.prepare('SELECT id,lang FROM email_subs WHERE unsub_token=?').bind(t0).first() : null;
  if (!r) return page('en', T.en.bad, 400);
  await env.DB.prepare("UPDATE email_subs SET status='unsubscribed',unsubscribed_at=?,confirm_hash=NULL,pending_since=NULL WHERE id=?").bind(nowIso(), r.id).run();
  return page(r.lang === 'zh' ? 'zh' : 'en', T[r.lang === 'zh' ? 'zh' : 'en'].unsub);
}

export async function cleanup(env) {
  const cutoff = new Date(Date.now() - PENDING_DAYS * DAY).toISOString();
  const r = await env.DB.prepare("DELETE FROM email_subs WHERE status='pending' AND pending_since<?").bind(cutoff).run();
  console.log('cleanup: deleted pending rows', r.meta?.changes ?? 0);
  return r.meta?.changes ?? 0;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname === '/subscribe' && req.method === 'POST') {
      if (!h['Access-Control-Allow-Origin']) return json({ error: 'forbidden_origin' }, 403);
      return subscribe(req, env, h);
    }
    if (url.pathname === '/confirm' && req.method === 'GET') return confirm(url, env);
    if (url.pathname === '/unsubscribe' && (req.method === 'GET' || req.method === 'POST')) return unsubscribe(url, env);
    if (url.pathname === '/health') return json({ ok: true }, 200, h);
    return json({ error: 'not_found' }, 404, h);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(cleanup(env)); }
};
