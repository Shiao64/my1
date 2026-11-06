// Event-update mail unsubscribe (preview). One flag per email in mail_unsub covers both social users and subscribers.
// Footer: updateFooter(env, origin, email, lang) -> {url,text,html}. Sending: updateRecipients(env) already skips unsubscribed.
// Verification-code mail never checks this flag.
const enc = new TextEncoder();
const b64u = s => btoa(String.fromCharCode(...enc.encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
async function sig(env, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode('unsub:' + (env.UNSUB_SECRET || env.ADMIN_TOKEN || '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function unsubToken(env, email) { const e = b64u(String(email).toLowerCase()); return e + '.' + await sig(env, e); }
export async function updateFooter(env, origin, email, lang) {
  const url = `${origin}/unsubscribe?t=${await unsubToken(env, email)}`, zh = lang === 'zh', w = zh ? '退订' : 'Unsubscribe';
  return { url, text: `\n\n${zh ? '不想再收到活动更新？' : "Don't want event updates?"} ${w}: ${url}`,
    html: `<hr style="border:0;border-top:1px dashed #ead9b8"><p style="font-size:12px;color:#777">${zh ? '不想再收到活动更新？' : "Don't want event updates?"} <a href="${url}">${w}</a></p>`,
    headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}
export async function updateRecipients(env) {   // who may get an event-update mail
  return (await env.DB.prepare(`SELECT email,lang FROM (SELECT lower(email) email,lang FROM email_subs WHERE status='active'
    UNION SELECT lower(CASE WHEN email LIKE 'wx:%' THEN contact_email ELSE email END),lang FROM users WHERE verified_at IS NOT NULL)
    WHERE email IS NOT NULL AND email NOT IN (SELECT email FROM mail_unsub) GROUP BY email`).all()).results;
}
const page = (ok) => new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${ok ? '已退订 Unsubscribed' : '链接无效 Invalid link'}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
${ok ? '<p style="font-size:1.1rem;color:#0a4f57;font-weight:700">已退订，你不会再收到亚洲探戈地图的活动更新邮件。</p><p style="font-size:1.05rem;color:#0a4f57;font-weight:700">You\'re unsubscribed. You won\'t get any more event updates from Asia Tango Map.</p><p style="font-size:.85rem;color:#7a6255">点赞不受影响。 Likes are not affected.</p>'
  : '<p style="font-size:1.1rem;color:#b5654a;font-weight:700">退订链接无效。</p><p style="font-size:1.05rem;color:#b5654a;font-weight:700">This unsubscribe link is invalid.</p>'}
<p><a href="https://tangoweekend.org/zh/asia/" style="color:#0e6e78">返回亚洲探戈地图</a> · <a href="https://tangoweekend.org/asia/" style="color:#0e6e78">Back to the Asia Tango Map</a></p></div></body></html>`,
  { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
export async function unsubscribe(url, env) {
  const t = url.searchParams.get('t') || '', i = t.indexOf('.');
  if (i < 1) return page(false);
  const e = t.slice(0, i); let email; try { email = unb64u(e); } catch { return page(false); }
  if (t.slice(i + 1) !== await sig(env, e)) return page(false);
  const at = new Date().toISOString();
  await env.DB.prepare('INSERT INTO mail_unsub(email,at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET at=excluded.at').bind(email, at).run();
  await env.DB.prepare("UPDATE email_subs SET status='unsubscribed',unsubscribed_at=? WHERE lower(email)=? AND status='active'").bind(at, email).run();
  return page(true);
}
