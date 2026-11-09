// LIVE: tango-subscribe Worker (api.tangoweekend.org). Subscribe/confirm/push from subscribe-worker, plus /social/* (likes, email confirm, WeChat flow v3). The WeChat tab stays disabled.
import SUB from '../../subscribe-worker/src/index.js';
import { social, wxExpireSweep, generateGoingStats, runGoingNotices } from './social.js';
import { unsubscribe as unsub2 } from './unsub.js';
const hostOK = o => /^https:\/\/(www\.)?tangoweekend\.org$/.test(o) || /^https:\/\/api\.tangoweekend\.org$/.test(o) || /^https:\/\/[a-z0-9-]+\.my1-7p3\.pages\.dev$/.test(o);
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), og = req.headers.get('Origin') || '', allow = hostOK(og) ? og : 'https://tangoweekend.org';
    const h = { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', Vary: 'Origin' };
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
    if (url.pathname.startsWith('/social/')) {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
      // The confirm form is served on this host and checked by the magic token. Mail and WeChat clients may send Origin: null.
      const postedForm = url.pathname === '/social/confirm' || url.pathname === '/social/going/confirm' || url.pathname === '/social/going/unsub';
      if (req.method === 'POST' && og && !hostOK(og) && !url.pathname.startsWith('/social/admin/') && !postedForm) return json({ error: 'forbidden_origin' }, 403);
      return social(req, env, url, json);
    }
    if (url.pathname === '/unsubscribe' && (req.method === 'GET' || req.method === 'POST') && (url.searchParams.get('t') || '').includes('.')) return unsub2(url, env);   // signed update-mail link; POST is List-Unsubscribe one-click
    if (url.pathname === '/subscribe' && req.method === 'POST') {
      const raw = await req.text(); let b = {}; try { b = JSON.parse(raw); } catch {}
      const wx0 = b.lang === 'zh' ? String(b.wechat || '').trim().slice(0, 64) : '';
      const hh = hostOK(og) ? { 'Access-Control-Allow-Origin': og, Vary: 'Origin' } : {};
      const j2 = (d, s) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...hh } });
      if (wx0 && await env.DB.prepare("SELECT 1 FROM subs WHERE wechat=? AND wx_status='banned' LIMIT 1").bind(wx0).first()) return j2({ error: 'wx_banned' }, 403);   // rejected fake ID: never again
      if (wx0 && hostOK(og)) { const ex = await env.DB.prepare("SELECT wx_code,wx_status FROM subs WHERE wechat=? AND wx_status IN ('pending','verified') AND wx_code IS NOT NULL ORDER BY (wx_status='verified') DESC, id DESC LIMIT 1").bind(wx0).first();
        if (ex && !b.email) return j2({ ok: true, wechat_only: true, wx_status: ex.wx_status, existing: true, ...(ex.wx_status === 'pending' ? { wechat_code: ex.wx_code } : {}) }, 200); }   // same ID: same code back, no new row or alert
      const e2 = /^atm_test/i.test(wx0) || /^atm\.smoke\+/i.test(String(b.email || '')) ? { ...env, NOTIFY_TO: '' } : env;   // smoke tests never alert the owner list
      return SUB.fetch(new Request(req.url, { method: 'POST', headers: req.headers, body: raw }), e2, ctx);
    }
    return SUB.fetch(req, env, ctx);
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
  }
};
