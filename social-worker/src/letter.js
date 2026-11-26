// 2026-11-26 (Shiao): letters from me@tangoweekend.org — the hand-written notes to organizers (huodong@ intros
// and the like) go out from the site's own address instead of a personal Gmail.
//
// POST /social/admin/letter   Authorization: Bearer LETTER_TOKEN (or ADMIN_TOKEN), both at least 24 characters
//   {to, subject, text, html?, cc?: [..], reply_to?, from_name?}
//   -> {ok:true, from, to}
//
// - From: env.LETTER_FROM or me@tangoweekend.org. The SUB_MAIL send_email binding must list that address in
//   allowed_sender_addresses (subscribe-worker/wrangler.toml); Cloudflare refuses any other sender.
// - Reply-To: reply_to, else the From address. Replies to me@ follow its Cloudflare Email Routing rule.
// - One recipient per call; cc at most 5. Lengths are capped. No address, subject or body is logged or stored.
// - LETTER_SEND=off (dashboard var) stops sending (503) without a deploy.
// - LETTER_COPY (dashboard var, "a@x,b@y"): each gets a separate "[副本]" copy, so there is a record outside the worker.

const EMAIL = /^[^@\s<>,;"'()]+@[^@\s<>,;"'()]+\.[^@\s<>,;"'()]+$/;
const cleanAddr = s => String(s || '').trim().toLowerCase();
const okAddr = s => s.length <= 254 && EMAIL.test(s) && !/[\r\n]/.test(s);
const oneLine = (s, n) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);

export function letterAuth(req, env) {
  const a = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (a.length < 24) return false;
  return (!!env.LETTER_TOKEN && env.LETTER_TOKEN.length >= 24 && a === env.LETTER_TOKEN) || (!!env.ADMIN_TOKEN && env.ADMIN_TOKEN.length >= 24 && a === env.ADMIN_TOKEN);
}

export function letterInput(b, env) {
  b = b || {};
  const to = cleanAddr(b.to);
  if (!okAddr(to)) return { error: 'bad_to' };
  const subject = oneLine(b.subject, 200);
  if (!subject) return { error: 'no_subject' };
  const text = String(b.text || '').slice(0, 20000);
  if (!text.trim()) return { error: 'no_text' };
  const html = b.html ? String(b.html).slice(0, 60000) : '';
  const ccIn = Array.isArray(b.cc) ? b.cc : (b.cc ? String(b.cc).split(',') : []);
  const cc = [];
  for (const x of ccIn) { const e = cleanAddr(x); if (!e) continue; if (!okAddr(e)) return { error: 'bad_cc' }; if (e !== to && !cc.includes(e)) cc.push(e); }
  if (cc.length > 5) return { error: 'too_many_cc' };
  const from = cleanAddr(env.LETTER_FROM) || 'me@tangoweekend.org';
  const replyTo = b.reply_to ? cleanAddr(b.reply_to) : from;
  if (!okAddr(replyTo)) return { error: 'bad_reply_to' };
  const fromName = oneLine(b.from_name, 60) || 'Asia Tango Map';
  return { to, subject, text, html, cc, from, replyTo, fromName };
}

export async function letterAdmin(req, env, b, json) {
  if (!letterAuth(req, env)) return json({ error: 'auth' }, 401);
  if (String(env.LETTER_SEND || '').toLowerCase() === 'off') return json({ error: 'off' }, 503);
  const m = letterInput(b, env);
  if (m.error) return json({ error: m.error }, 400);
  const binding = env.SUB_MAIL;
  if (!binding || typeof binding.send !== 'function') return json({ error: 'no_mail_binding' }, 500);
  const msg = { from: { email: m.from, name: m.fromName }, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), ...(m.cc.length ? { cc: m.cc } : {}) };
  try { await binding.send(msg); }
  catch (e) { console.log('[letter] send failed:', String(e && e.message || e).slice(0, 200)); return json({ error: 'send_failed', detail: String(e && e.message || e).slice(0, 200) }, 502); }
  let copies = 0;
  for (const c of String(env.LETTER_COPY || '').split(',').map(cleanAddr).filter(okAddr)) {
    if (c === m.to || m.cc.includes(c)) continue;
    const note = `（副本）这封信寄给 ${m.to}${m.cc.length ? '，副本 ' + m.cc.join('、') : ''}。\n\n`;
    try { await binding.send({ from: { email: m.from, name: m.fromName }, to: c, replyTo: m.replyTo, subject: '[副本] ' + m.subject, text: note + m.text }); copies++; }
    catch (e) { console.log('[letter] copy failed'); }
  }
  console.log('[letter] sent', copies ? '(+' + copies + ' copy)' : '');
  return json({ ok: true, from: m.from, to: m.to, copies });
}
