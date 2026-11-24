// LIVE: tango-subscribe Worker (api.tangoweekend.org). Subscribe/confirm/push from subscribe-worker, plus /social/* (likes, email confirm, WeChat flow v3). The WeChat tab stays disabled.
import SUB from '../../subscribe-worker/src/index.js';
import { social, wxExpireSweep, generateGoingStats, runGoingNotices, regInboundMail } from './social.js';
import { unsubscribe as unsub2 } from './unsub.js';
import { monthlyRoster } from './roster.js';
import { inboundMail } from './inmail.js';
// Ack for huodong@ mail: SUB_MAIL (send_email binding, sender subscribe@) only. Never Resend.
async function ackMail(env, to, subject, text) {
  if (!env.SUB_MAIL || typeof env.SUB_MAIL.send !== 'function') { console.log('[mail:log] ack to list member: ' + subject); return; }
  await env.SUB_MAIL.send({ from: { email: env.SENDER || 'subscribe@tangoweekend.org', name: 'Asia Tango Map' }, to, subject, text });
}
function previewOrigins(env) {
  if (!env || env.PREVIEW !== '1') return [];
  return String(env.PREVIEW_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
}
const hostOK = (o, env) => /^https:\/\/(www\.)?tangoweekend\.org$/.test(o) || /^https:\/\/api\.tangoweekend\.org$/.test(o) || /^https:\/\/[a-z0-9-]+\.my1-7p3\.pages\.dev$/.test(o) || (env && env.ALLOW_LOCAL === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) || previewOrigins(env).includes(o);
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), og = req.headers.get('Origin') || '', allow = hostOK(og, env) ? og : 'https://tangoweekend.org';
    const h = { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', Vary: 'Origin' };
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
    if (url.pathname.startsWith('/social/')) {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
      // The confirm form is served on this host and checked by the magic token. Mail and WeChat clients may send Origin: null.
      const postedForm = url.pathname === '/social/confirm' || url.pathname === '/social/going/confirm' || url.pathname === '/social/going/unsub' || url.pathname === '/social/going/enter';
      if (req.method === 'POST' && og && !hostOK(og, env) && !url.pathname.startsWith('/social/admin/') && !postedForm) return json({ error: 'forbidden_origin' }, 403);
      const res = await social(req, env, url, json);
      // json() carries the CORS headers; a file built by hand (CSV export) does not, and the admin page could not read it.
      if (url.pathname.startsWith('/social/admin/reg') && !res.headers.get('Access-Control-Allow-Origin')) for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
      return res;
    }
    if (url.pathname === '/unsubscribe' && (req.method === 'GET' || req.method === 'POST') && (url.searchParams.get('t') || '').includes('.')) return unsub2(url, env);   // signed update-mail link; POST is List-Unsubscribe one-click
    if (url.pathname === '/subscribe' && req.method === 'POST') {
      const raw = await req.text(); let b = {}; try { b = JSON.parse(raw); } catch {}
      const wx0 = b.lang === 'zh' ? String(b.wechat || '').trim().slice(0, 64) : '';
      const hh = hostOK(og, env) ? { 'Access-Control-Allow-Origin': og, Vary: 'Origin' } : {};
      const j2 = (d, s) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...hh } });
      if (wx0 && await env.DB.prepare("SELECT 1 FROM subs WHERE wechat=? AND wx_status='banned' LIMIT 1").bind(wx0).first()) return j2({ error: 'wx_banned' }, 403);   // rejected fake ID: never again
      if (wx0 && hostOK(og, env)) { const ex = await env.DB.prepare("SELECT wx_code,wx_status FROM subs WHERE wechat=? AND wx_status IN ('pending','verified') AND wx_code IS NOT NULL ORDER BY (wx_status='verified') DESC, id DESC LIMIT 1").bind(wx0).first();
        if (ex && !b.email) return j2({ ok: true, wechat_only: true, wx_status: ex.wx_status, existing: true, ...(ex.wx_status === 'pending' ? { wechat_code: ex.wx_code } : {}) }, 200); }   // same ID: same code back, no new row or alert
      const e2 = /^atm_test/i.test(wx0) || /^atm\.smoke\+/i.test(String(b.email || '')) ? { ...env, NOTIFY_TO: '' } : env;   // smoke tests never alert the owner list
      return SUB.fetch(new Request(req.url, { method: 'POST', headers: req.headers, body: raw }), e2, ctx);
    }
    return SUB.fetch(req, env, ctx);
  },
  // Cloudflare Email Routing -> this Worker: a TP 活动专属邮箱 (register.js regInbound), else huodong@tangoweekend.org (inmail.js)
  async email(message, env, ctx) {
    const to = String(message.to || '').trim().toLowerCase();
    if (to !== 'huodong@tangoweekend.org') {
      try { if (await regInboundMail(message, env)) return; } catch (e) { console.log('tp inbound', String(e && e.message || e).slice(0, 160)); return; }
    }
    try { await inboundMail(message, env, ctx, ackMail); } catch (e) { console.log('inmail', String(e && e.message || e).slice(0, 160)); }
  },
  async scheduled(event, env, ctx) {
    if (event.cron === '17 3 * * *') return SUB.scheduled(event, env, ctx);
    // Stats drafts and per-event user notices stay off until the matching flag is on AND that cron is added at deploy time.
    // Organizer digests are not hooked to either live cron. GOING_DIGEST_SEND stays unset.
    const statsCron = env.GOING_STATS_CRON || '30 16 * * *';
    const noticeCron = env.GOING_NOTICE_CRON || '30 16 * * *';
    const jobs = [];
    if (env.GOING_STATS === 'on' && event.cron === statsCron) jobs.push(generateGoingStats(env, null).catch(e => console.log('going stats', String(e && e.message || e).slice(0, 160))));
    if (env.GOING_NOTICE_SEND === 'on' && event.cron === noticeCron) jobs.push(runGoingNotices(env, null).catch(e => console.log('going notices', String(e && e.message || e).slice(0, 160))));
    if (jobs.length) { ctx.waitUntil(Promise.all(jobs)); return; }
    ctx.waitUntil(wxExpireSweep(env).then(r => console.log('wx sweep', JSON.stringify(r))));
    // Registration: day-10 payment reminder for confirmed, unpaid forms. register.js
    ctx.waitUntil(import('./social.js').then(m => m.regCron(env)).then(r => { if (r.sent) console.log('reg remind', JSON.stringify(r)); }).catch(e => console.log('reg remind', String(e && e.message || e).slice(0, 160))));
    // Monthly subscriber roster to the owner (first 10-minute run of each Beijing month). roster.js
    ctx.waitUntil(monthlyRoster(env).then(r => { if (r !== 'already') console.log('roster', r); }).catch(e => console.log('roster', String(e && e.message || e).slice(0, 160))));
  }
};
