// PREVIEW ONLY: atm-social-preview Worker. Proxies tangoweekend.org, swaps in the draft JS, and serves the APIs from a staging D1.
import SUB from '../../subscribe-worker/src/index.js';
import { social } from './social.js';
import { FILES } from './overrides.js';
const LIVE = 'https://tangoweekend.org';
export default {
  async fetch(req, env) {
    const url = new URL(req.url), o = url.origin;
    const h = { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname.startsWith('/social/')) return social(req, env, url, json);
    if (['/subscribe', '/confirm', '/unsubscribe'].includes(url.pathname)) return SUB.fetch(req, { ...env, EXTRA_ORIGINS: o, API_BASE: o });
    const f = FILES[url.pathname];
    if (f) return new Response(f, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
    const r = await fetch(LIVE + url.pathname + url.search, { headers: { 'User-Agent': req.headers.get('User-Agent') || 'atm-preview' } });
    const ct = r.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return r;
    const boot = `<script>window.TANGO_SUB_API=${JSON.stringify(o)};window.ATM_SOCIAL_API=${JSON.stringify(o)};window.ATM_TS_KEY=${JSON.stringify(env.TURNSTILE_SITEKEY || '')};</script>`;
    const res = new HTMLRewriter()
      .on('head', { element(e) { e.prepend(boot + '<meta name="robots" content="noindex">', { html: true }); } })
      .on('script[src]', { element(e) { const s = e.getAttribute('src') || ''; if (/^\/asia\/asia-subscribe\.js/.test(s)) e.setAttribute('src', '/asia/asia-subscribe.js?pv=1'); } })
      .on('body', { element(e) { e.append('<script src="/asia/atm-social.js?pv=1"></script><div style="position:fixed;left:8px;bottom:8px;z-index:2000;background:#C8102E;color:#fff;font:700 11px/1 system-ui;padding:5px 8px;border-radius:6px;opacity:.85;pointer-events:none">PREVIEW 预览</div>', { html: true }); } })
      .transform(r);
    const out = new Response(res.body, res); out.headers.set('Cache-Control', 'no-store'); out.headers.delete('content-security-policy'); return out;
  }
};
