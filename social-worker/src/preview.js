// PREVIEW ONLY: atm-social-preview Worker. Proxies tangoweekend.org, swaps in the draft JS, and serves the APIs from a staging D1.
import SUB from '../../subscribe-worker/src/index.js';
import { social } from './social.js';
import { FILES } from './overrides.js';
import { unsubscribe as unsub2 } from './unsub.js';
const LIVE = 'https://tangoweekend.org';
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), o = url.origin;
    const h = { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname.startsWith('/social/')) return social(req, env, url, json);
    if (url.pathname === '/unsubscribe' && (url.searchParams.get('t') || '').includes('.')) return unsub2(url, env);   // signed update-mail link
    if (url.pathname === '/subscribe' && req.method === 'POST') {   // same backend as live; preview adds an owner alert for new WeChat sign-ups
      const raw = await req.text(); let b = {}; try { b = JSON.parse(raw); } catch {}
      const r = await SUB.fetch(new Request(req.url, { method: 'POST', headers: req.headers, body: raw }), { ...env, EXTRA_ORIGINS: o, API_BASE: o });
      if (b.wechat) { try { const d = await r.clone().json(); if (d.wechat_code && d.wx_status === 'pending') ctx.waitUntil(wxNotify(env, b, d.wechat_code, o).catch(e => console.log('wx notify', e.message))); } catch {} }
      return r;
    }
    if (['/subscribe', '/confirm', '/unsubscribe'].includes(url.pathname)) return SUB.fetch(req, { ...env, EXTRA_ORIGINS: o, API_BASE: o });
    const f = FILES[url.pathname];
    if (f) return new Response(f, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
    const r = await fetch(LIVE + url.pathname + url.search, { headers: { 'User-Agent': req.headers.get('User-Agent') || 'atm-preview' } });
    const ct = r.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return r;
    const boot = `<script>window.TANGO_SUB_API=${JSON.stringify(o)};window.ATM_SOCIAL_API=${JSON.stringify(o)};window.ATM_TS_KEY=${JSON.stringify(env.TURNSTILE_SITEKEY || '')};</script>`;
    const res = new HTMLRewriter()
      .on('head', { element(e) { e.prepend(boot + '<meta name="robots" content="noindex">', { html: true }); } })
      .on('script[src]', { element(e) { const s = e.getAttribute('src') || ''; if (/^\/asia\/asia-subscribe\.js/.test(s)) e.setAttribute('src', '/asia/asia-subscribe.js?pv=4'); } })
      .on('body', { element(e) { e.append('<script src="/asia/atm-social.js?pv=4"></script><div style="position:fixed;left:8px;bottom:8px;z-index:2000;background:#C8102E;color:#fff;font:700 11px/1 system-ui;padding:5px 8px;border-radius:6px;opacity:.85;pointer-events:none">PREVIEW 预览</div>', { html: true }); } })
      .transform(r);
    const out = new Response(res.body, res); out.headers.set('Cache-Control', 'no-store'); out.headers.delete('content-security-policy'); return out;
  }
};

async function wxNotify(env, b, code, origin) {
  const wx = String(b.wechat).trim().slice(0, 64), to = 'shiao.li.chang@gmail.com', t = Date.now();
  const last = await env.DB.prepare('SELECT at FROM wx_notify WHERE wechat=?').bind(wx).first('at');
  if (last && t - last < 3600e3) return;   // 1 alert per WeChat ID per hour
  await env.DB.prepare('INSERT INTO wx_notify(wechat,at) VALUES(?,?) ON CONFLICT(wechat) DO UPDATE SET at=excluded.at').bind(wx, t).run();
  const role = { leader: '领舞', follower: '跟舞', both: '双角色' }[b.role] || '';
  const when = new Date(t).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）';
  const text = `有人提交了微信验证，待核对：\n\n微信号：${wx}\n验证码：${code}\n名字：${b.name || ''}\n城市：${b.city || ''}\n角色：${role}\n邮箱：${b.email || '（未填）'}\n时间：${when}\n\n核对方法：在「探戈助理」里找到这位好友申请，确认验证消息里写的是「订阅亚洲探戈地图，验证码 ${code}」。\n通过后在后台标记：\nPOST ${origin}/social/admin/wx-verify\nAuthorization: Bearer <管理员 token>\n{"wechat":"${wx}"}\n（待核对列表：GET ${origin}/social/admin/wx-pending）`;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM || 'Asia Tango Map <noreply@tangoweekend.org>', to: [to], subject: `ATM 微信验证待核对：${wx} · ${code}`, text }) });
  if (!r.ok) throw new Error('resend ' + r.status);
}
