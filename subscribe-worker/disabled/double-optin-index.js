// Asia Tango Map subscription API (draft 2026-10-27)
// POST /subscribe {email?, wechat?, lang}  GET /verify?t=  GET /unsubscribe?t=
const T = {
  zh: {
    subj: '请确认订阅亚洲探戈地图活动汇总',
    body: l => `请在24小时内点击下面的链接确认订阅：\n${l}\n\n如果不是您本人操作，请忽略这封邮件。`,
    ok: '订阅成功！每月初您会收到活动汇总。',
    bad: '链接无效或已过期，请重新订阅。',
    unsub: '已退订，您不会再收到活动汇总。',
    unsubLine: '退订', foot: '随时可退订，不会把您的信息给别人。',
    back: '返回亚洲探戈地图', home: 'https://tangoweekend.org/zh/asia/'
  },
  en: {
    subj: 'Confirm your Asia Tango Map subscription',
    body: l => `Click this link within 24 hours to confirm:\n${l}\n\nIf this wasn't you, just ignore this email.`,
    ok: "You're subscribed! Expect your first summary early next month.",
    bad: 'This link is invalid or has expired. Please subscribe again.',
    unsub: "You're unsubscribed. You won't get any more summaries.",
    unsubLine: 'Unsubscribe', foot: 'Unsubscribe anytime. We never share your info.',
    back: 'Back to the Asia Tango Map', home: 'https://tangoweekend.org/asia/'
  }
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DAY = 86400000;
const tok = () => [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
const now = () => new Date().toISOString();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const ok = env.ALLOWED_ORIGINS.split(',').includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return ok ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
}
const json = (d, s, h) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
function page(lang, msg) {
  const t = T[lang] || T.en;
  return new Response(`<!doctype html><html lang="${lang === 'zh' ? 'zh-CN' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(msg)}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.1rem;color:#0a4f57;font-weight:700">${esc(msg)}</p><p><a href="${t.home}" style="color:#0e6e78">${t.back}</a></p><p style="font-size:.8rem;color:#7a6255">${t.foot}</p></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function sendVerify(env, email, lang, vtok, utok) {
  const t = T[lang];
  if (env.TEST_ONLY_RECIPIENT && email !== env.TEST_ONLY_RECIPIENT) throw new Error('recipient not allowed in test mode');
  const v = `${env.API_BASE}/verify?t=${vtok}`, u = `${env.API_BASE}/unsubscribe?t=${utok}`;
  return env.EMAIL.send({
    from: { email: env.SENDER, name: env.SENDER_NAME }, to: email, subject: t.subj,
    text: `${t.body(v)}\n\n${t.foot}\n${t.unsubLine}: ${u}`,
    html: `<p>${esc(t.body('')).replace(/\n/g, '<br>')}</p><p><a href="${v}">${v}</a></p><hr><p style="font-size:12px;color:#777">${t.foot} <a href="${u}">${t.unsubLine}</a></p>`,
    headers: { 'List-Unsubscribe': `<${u}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
  });
}

async function subscribe(req, env, h) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400, h); }
  const lang = b.lang === 'zh' ? 'zh' : 'en';
  const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
  const wechat = String(b.wechat || '').trim().slice(0, 64);
  if (!email && !wechat) return json({ error: 'need_one' }, 400, h);
  if (email && !EMAIL_RE.test(email)) return json({ error: 'bad_email' }, 400, h);
  const res = {};
  if (wechat) {
    await env.DB.prepare('INSERT INTO wechat_ids(wechat,lang,created_at) VALUES(?,?,?)').bind(wechat, lang, now()).run();
    res.wechat = 'stored';
  }
  if (email) {
    const row = await env.DB.prepare('SELECT status,unsub_token FROM email_subs WHERE email=?').bind(email).first();
    if (row && row.status === 'active') res.email = 'sent'; // don't reveal membership; no new mail
    else {
      const vt = tok(), ut = row?.unsub_token || tok();
      await env.DB.prepare(`INSERT INTO email_subs(email,lang,status,verify_token,verify_expires,unsub_token,created_at) VALUES(?,?,'pending',?,?,?,?)
        ON CONFLICT(email) DO UPDATE SET lang=excluded.lang,status='pending',verify_token=excluded.verify_token,verify_expires=excluded.verify_expires`)
        .bind(email, lang, vt, Date.now() + DAY, ut, now()).run();
      try { await sendVerify(env, email, lang, vt, ut); res.email = 'sent'; }
      catch (e) { console.log('send fail', e.message); return json({ ...res, error: 'send_failed' }, 502, h); }
    }
  }
  return json({ ok: true, ...res }, 200, h);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname === '/subscribe' && req.method === 'POST') return subscribe(req, env, h);
    const t = url.searchParams.get('t') || '';
    if (url.pathname === '/verify') {
      const r = await env.DB.prepare('SELECT email,lang,verify_expires FROM email_subs WHERE verify_token=?').bind(t).first();
      if (!t || !r || r.verify_expires < Date.now()) return page(r?.lang || 'en', T[r?.lang || 'en'].bad);
      await env.DB.prepare("UPDATE email_subs SET status='active',verify_token=NULL,verified_at=? WHERE email=?").bind(now(), r.email).run();
      return page(r.lang, T[r.lang].ok);
    }
    if (url.pathname === '/unsubscribe') {
      const r = await env.DB.prepare('SELECT email,lang FROM email_subs WHERE unsub_token=?').bind(t).first();
      if (!t || !r) return page('en', T.en.bad);
      await env.DB.prepare("UPDATE email_subs SET status='unsubscribed',unsubscribed_at=? WHERE email=?").bind(now(), r.email).run();
      return page(r.lang, T[r.lang].unsub);
    }
    return json({ error: 'not_found' }, 404, h);
  }
};
