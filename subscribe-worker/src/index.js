// Asia Tango Map "event alerts" collector (Workers Free).
// POST /subscribe {types:['featured','regular'], cities:[], email?, wechat?, lang, website(honeypot), test?}
// Stores in D1 and notifies the owner through Email Routing (send_email binding with destination_address).
// The double opt-in / unsubscribe flow is kept in ../disabled/ and is NOT active.
import { EmailMessage } from 'cloudflare:email';

const ORIGINS = ['https://tangoweekend.org', 'https://www.tangoweekend.org'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_MAX = 5, RATE_WIN_MIN = 60;

const cors = o => ORIGINS.includes(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
const json = (d, s, h) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const shTime = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）';
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join(''); }

function mime(from, to, subject, text) {
  const id = `<${crypto.randomUUID()}@tangoweekend.org>`;
  return [`From: Asia Tango Map <${from}>`, `To: ${to}`, `Subject: =?UTF-8?B?${b64(subject)}?=`, `Message-ID: ${id}`,
    `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64', '', b64(text).replace(/.{76}/g, '$&\r\n')].join('\r\n');
}

async function subscribe(req, env, h) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400, h); }
  if (b.website) return json({ ok: true }, 200, h); // honeypot: pretend success, store nothing
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const types = (Array.isArray(b.types) ? b.types : []).filter(t => t === 'featured' || t === 'regular');
  const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
  const wechat = String(b.wechat || '').trim().slice(0, 64);
  const cities = types.includes('regular') ? (Array.isArray(b.cities) ? b.cities : []).map(c => String(c).trim().slice(0, 40)).filter(Boolean).slice(0, 40) : [];
  if (!types.length) return json({ error: 'need_type' }, 400, h);
  if (!email && !wechat) return json({ error: 'need_contact' }, 400, h);
  if (email && !EMAIL_RE.test(email)) return json({ error: 'bad_email' }, 400, h);
  const isTest = b.test ? 1 : 0;

  const ip = await sha((req.headers.get('CF-Connecting-IP') || '') + (env.IP_SALT || 'tw'));
  const since = new Date(Date.now() - RATE_WIN_MIN * 60000).toISOString();
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM subs WHERE ip_hash=? AND created_at>?').bind(ip, since).first('n');
  if (n >= RATE_MAX) return json({ error: 'rate_limited' }, 429, h);

  const now = new Date().toISOString();
  const ins = await env.DB.prepare('INSERT INTO subs(created_at,email,wechat,types,cities,lang,ip_hash,is_test) VALUES(?,?,?,?,?,?,?,?)')
    .bind(now, email || null, wechat || null, types.join(','), cities.join(',') || 'all', lang, ip, isTest).run();
  const id = ins.meta.last_row_id;

  const typeZh = types.map(t => t === 'featured' ? '特色活动' : '常规活动').join('、');
  const text = [`${isTest ? '【测试】' : ''}亚洲探戈地图 新订阅 #${id}`, '',
    `邮箱：${email || '（未填）'}`, `微信名：${wechat || '（未填）'}`, `活动类型：${typeZh}`,
    `城市：${types.includes('regular') ? (cities.join('、') || '全部城市') : '—（特色活动不分城市）'}`,
    `时间：${shTime()}`, `页面语言：${lang === 'zh' ? '中文' : 'English'}`].join('\n');
  let status = 'sent';
  try { await env.EMAIL.send(new EmailMessage(env.SENDER, env.NOTIFY_TO, mime(env.SENDER, env.NOTIFY_TO, `${isTest ? '[测试] ' : ''}新订阅 #${id} ${wechat || email}`, text))); }
  catch (e) { status = 'fail: ' + String(e.message || e).slice(0, 200); console.log('notify failed', status); }
  await env.DB.prepare('UPDATE subs SET mail_status=? WHERE id=?').bind(status, id).run();
  return json({ ok: true, id }, 200, h);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req.headers.get('Origin') || '');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname === '/subscribe' && req.method === 'POST') {
      if (!h['Access-Control-Allow-Origin']) return json({ error: 'forbidden_origin' }, 403);
      return subscribe(req, env, h);
    }
    if (url.pathname === '/health') return json({ ok: true }, 200, h);
    return json({ error: 'not_found' }, 404, h);
  }
};
