import { gmailSend } from './smtp.js';
import { updateFooter } from './unsub.js';
// Asia Tango Map likes + comments API. Mounted under /social/* .
// GET  /social/likes?ids=A,B&dev=D        -> {counts:{A:n}, mine:[A]}
// POST /social/like {id, dev}              -> toggle; {id, n, liked}
// GET  /social/comments?id=A               -> {items:[{name,body,at}]}
// POST /social/signup {name,email,lang,ts,magic?,ret?} -> 6-digit code, or a magic link when magic=1
// GET  /social/confirm?e=&t=&next=         -> one-time link: verify, set session, redirect to the card
// POST /social/verify {email, code}        -> {token, name}  (email verified; still works alongside magic links)
// GET  /social/me  (Authorization: Bearer)  -> {name}
// POST /social/comment {id, body} (Bearer)  -> posts one comment per confirmed user per card
const ID_RE = /^(?:(?:org|dj):)?[A-Za-z0-9_-]{1,64}$/, DEV_RE = /^[A-Za-z0-9-]{16,64}$/, EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const now = () => new Date().toISOString();
// 00:00 Asia/Shanghai today, as a UTC ISO string. Shanghai is UTC+8 with no DST, so created_at (toISOString) compares in order.
function shanghaiDayStart(at = Date.now()) {
  const sh = new Date(at + 8 * 3600e3);
  return new Date(Date.UTC(sh.getUTCFullYear(), sh.getUTCMonth(), sh.getUTCDate()) - 8 * 3600e3).toISOString();
}
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const clean = (s, n) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);

async function turnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return env.ALLOW_NO_TURNSTILE === '1';
  const f = new FormData(); f.append('secret', env.TURNSTILE_SECRET); f.append('response', token || ''); if (ip) f.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: f });
  return !!(await r.json()).success;
}
const he = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function safeNext(raw) {
  let u; try { u = new URL(String(raw || '')); } catch { return ''; }
  const host = u.hostname.toLowerCase();
  const local = host === 'localhost' || host === '127.0.0.1';
  const ok = host === 'tangoweekend.org' || host === 'www.tangoweekend.org' || host.endsWith('.my1-7p3.pages.dev') || local;
  if (!ok) return '';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return '';
  if ((u.pathname + u.search).length > 800) return '';
  u.hash = '';
  return u.toString();
}
async function deliver(env, to, subject, text, html, headers) {
  const p = env.SOCIAL_MAIL || 'log';
  if (env.TEST_ONLY_RECIPIENT && to !== env.TEST_ONLY_RECIPIENT && p !== 'log') throw new Error('recipient not allowed in test mode');
  const hdrs = headers && Object.keys(headers).length ? headers : undefined;
  if (p === 'resend') { const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.RESEND_FROM || 'Asia Tango Map <onboarding@resend.dev>', to: [to], subject, text, ...(html ? { html } : {}), ...(hdrs ? { headers: hdrs } : {}) }) });
    if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 150)); }
  else if (p === 'gmail') await gmailSend({ user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD, fromName: 'Asia Tango Map', to, subject, text, html, headers: hdrs });
  else if (p === 'cloudflare') await env.SOCIAL_MAIL_BINDING.send({ from: { email: env.SENDER, name: 'Asia Tango Map' }, to, subject, text, ...(html ? { html } : {}), ...(hdrs ? { headers: hdrs } : {}) });
  else console.log(`[mail:log] to=${to} subject=${subject}${hdrs ? ' ' + JSON.stringify(hdrs) : ''}\n${text}${html ? '\n' + html : ''}`);
  return p;
}
async function sendCode(env, to, name, code, lang) {
  const zh = lang === 'zh';
  const subject = zh ? `亚洲探戈地图｜你的验证码 ${code}` : `Asia Tango Map | Your verification code ${code}`;
  const text = zh ? `${name}，你好！\n\n你的亚洲探戈地图验证码是：${code}\n\n15 分钟内有效。把它填回网页，就能在活动卡片下留言了。\n如果不是你本人操作，忽略这封邮件即可。\n\n亚洲探戈地图 Asia Tango Map\nhttps://tangoweekend.org`
    : `Hi ${name},\n\nYour Asia Tango Map verification code is: ${code}\n\nIt's valid for 15 minutes. Enter it on the page and you can comment on event cards.\nIf this wasn't you, just ignore this email.\n\nAsia Tango Map\nhttps://tangoweekend.org`;
  return deliver(env, to, subject, text);
}
async function sendMagic(env, to, name, url, lang) {
  const zh = lang === 'zh';
  const origin = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
  const foot = await updateFooter(env, origin, to, lang);
  const cta = zh ? '确认订阅并开通留言' : 'Confirm subscription and turn on comments';
  const subject = zh ? '请确认订阅亚洲探戈地图' : 'Please confirm your Asia Tango Map subscription';
  const text = zh
    ? `你好 ${name}，\n\n请在 15 分钟内点击下面的链接，确认邮箱并完成订阅：\n\n${url}\n\n确认后你可以：\n· 在活动卡片下留言\n· 不定时收到亚洲探戈地图的活动更新（你若选择了接收更新）\n\n若你并未申请订阅，忽略即可。\n\n随时可退订，我们不会把你的信息给别人。\n退订：${foot.url}\n\n亚洲探戈地图 Asia Tango Map\nhttps://tangoweekend.org`
    : `Hello ${name},\n\nPlease click the link below within 15 minutes to confirm your email and finish subscribing:\n\n${url}\n\nAfter you confirm, you can:\n· Comment on event cards\n· Get occasional Asia Tango Map event updates (if you chose to receive them)\n\nIf you didn't ask to subscribe, you can ignore this email.\n\nUnsubscribe anytime. We never share your information.\nUnsubscribe: ${foot.url}\n\nAsia Tango Map\nhttps://tangoweekend.org`;
  const html = `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><body style="margin:0;padding:24px;background:#f6efe4;font-family:Georgia,serif;color:#2a1a14"><div style="max-width:480px;margin:0 auto;background:#fffdf8;border:1px solid #e7d3b0;border-radius:16px;padding:24px"><p>${he(zh ? '你好 ' + name + '，' : 'Hello ' + name + ',')}</p><p>${zh ? '请在 15 分钟内点击下面的链接，确认邮箱并完成订阅：' : 'Please click the link below within 15 minutes to confirm your email and finish subscribing:'}</p><p style="margin:22px 0"><a href="${he(url)}" style="display:inline-block;background:#0e6e78;color:#f6e3b4;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${cta}</a></p><p>${zh ? '确认后你可以：' : 'After you confirm, you can:'}</p><ul><li>${zh ? '在活动卡片下留言' : 'Comment on event cards'}</li><li>${zh ? '不定时收到亚洲探戈地图的活动更新（你若选择了接收更新）' : 'Get occasional Asia Tango Map event updates (if you chose to receive them)'}</li></ul><p>${zh ? '若你并未申请订阅，忽略即可。' : 'If you didn\'t ask to subscribe, you can ignore this email.'}</p><p>${zh ? '随时可退订，我们不会把你的信息给别人。' : 'Unsubscribe anytime. We never share your information.'}<br><a href="${he(foot.url)}">${zh ? '退订' : 'Unsubscribe'}</a></p><p>亚洲探戈地图 Asia Tango Map<br><a href="https://tangoweekend.org">https://tangoweekend.org</a></p></div></body></html>`;
  if (/ATM互动|探戈雷达/.test(subject + text + html)) throw new Error('internal name in mail');
  return deliver(env, to, subject, text, html, foot.headers);
}
async function user(req, env) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  return env.SDB.prepare('SELECT u.id,u.name,u.city,u.email,u.wx_used FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.verified_at IS NOT NULL').bind(await sha(t)).first();
}

// WeChat users (users.email = 'wx:<id>'): status lives on subs.wx_status in DB. banned wins, then verified, then pending.
async function wxStatus(env, wx) {
  const r = await env.DB.prepare("SELECT wx_status FROM subs WHERE wechat=? AND wx_status IN ('pending','verified','banned') ORDER BY (wx_status='banned') DESC, (wx_status='verified') DESC LIMIT 1").bind(wx).first();
  return r ? r.wx_status : null;
}
const wxOf = u => u && typeof u.email === 'string' && u.email.startsWith('wx:') ? u.email.slice(3) : null;
const wxDev = id => 'wxuser-' + String(id).padStart(10, '0');   // likes.device for a WeChat user's like
async function wxGate(env, u) {   // pending gets exactly one action (comment OR like) after 「我已添加」, claimed atomically.
  const wx = wxOf(u); if (!wx) return { ok: true };
  const st = await wxStatus(env, wx);
  if (st === 'banned' || !st) return { err: 'wx_banned' };
  if (st === 'verified') return { ok: true, st };
  if (!(await wxRow(env, wx))?.wx_added_at) return { err: 'wx_not_added' };
  return { ok: true, st, claim: true };
}
const wxRow = (env, wx) => env.DB.prepare("SELECT wx_code,wx_added_at,name FROM subs WHERE wechat=? AND wx_status IN ('pending','verified') ORDER BY (wx_status='verified') DESC, id DESC LIMIT 1").bind(wx).first();
// 3 hours after 「我已添加」, counting only 09:00–23:00 Asia/Shanghai (the clock pauses overnight).
export function wxDeadline(startIso, hours = 3) {
  let t = Date.parse(startIso), left = hours * 3600e3; if (isNaN(t)) return null;
  for (let i = 0; i < 20 && left > 0; i++) {
    const sh = new Date(t + 8 * 3600e3), day0 = Date.UTC(sh.getUTCFullYear(), sh.getUTCMonth(), sh.getUTCDate()) - 8 * 3600e3;
    const open = day0 + 9 * 3600e3, close = day0 + 23 * 3600e3;
    if (t < open) t = open; else if (t >= close) { t = open + 24 * 3600e3; continue; }
    const run = Math.min(left, close - t); t += run; left -= run;
  }
  return new Date(t).toISOString();
}
async function wxReject(env, wx) {   // fake ID: delete its comments + likes, end its sessions, ban the ID for good
  const r = await env.DB.prepare("UPDATE subs SET wx_status='banned' WHERE wechat=? AND wx_status IN ('pending','verified')").bind(wx).run();
  if (!(r.meta?.changes ?? 0)) await env.DB.prepare("INSERT INTO subs(created_at,wechat,types,cities,lang,mail_status,wx_status) VALUES(?,?,'featured,regular','all','zh','wechat','banned')").bind(now(), wx).run();
  const u = await env.SDB.prepare('SELECT id FROM users WHERE email=?').bind('wx:' + wx).first(); let dc = 0, dl = 0;
  if (u) { dc = (await env.SDB.prepare('DELETE FROM comments WHERE user_id=?').bind(u.id).run()).meta?.changes ?? 0;
    dl = (await env.SDB.prepare('DELETE FROM likes WHERE device=?').bind(wxDev(u.id)).run()).meta?.changes ?? 0;
    await env.SDB.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id).run(); }
  return { ok: true, banned: wx, comments_deleted: dc, likes_deleted: dl };
}
async function wxPendingList(env) {
  const rows = (await env.DB.prepare("SELECT id,created_at,name,wechat,email,wx_code,wx_added_at FROM subs WHERE wx_status='pending' ORDER BY id").all()).results, t = Date.now();
  for (const r of rows) { r.deadline = r.wx_added_at ? wxDeadline(r.wx_added_at) : null; r.expired = !!(r.deadline && Date.parse(r.deadline) <= t); }
  return rows;
}
// Cron: expired unverified IDs. AUTO_EXPIRE='on' deletes + bans; otherwise only listed as expired in /social/admin/wx-pending.
export async function wxExpireSweep(env) {
  const ex = (await wxPendingList(env)).filter(r => r.expired);
  if (env.AUTO_EXPIRE !== 'on') { if (ex.length) console.log('wx expired (AUTO_EXPIRE off):', ex.map(r => r.wechat).join(',')); return { auto: false, expired: ex.length }; }
  for (const r of ex) await wxReject(env, r.wechat);
  return { auto: true, rejected: ex.length };
}
async function wxAddedNotify(env, u, wx, row) {   // 「我已添加」 pressed: email the owner. At most once per ID per 10 minutes.
  const t = Date.now(), last = await env.DB.prepare('SELECT at FROM wx_notify WHERE wechat=?').bind(wx).first('at');
  if (last && t - last < 600e3) return 'throttled';
  await env.DB.prepare('INSERT INTO wx_notify(wechat,at) VALUES(?,?) ON CONFLICT(wechat) DO UPDATE SET at=excluded.at').bind(wx, t).run();
  if (/^atm_test/i.test(wx) && env.TEST_NOTIFY !== '1') return 'test_skip';
  const full = await env.SDB.prepare('SELECT city,role FROM users WHERE id=?').bind(u.id).first() || {};
  const nc = await env.SDB.prepare("SELECT COUNT(*) n FROM comments WHERE user_id=? AND status='visible'").bind(u.id).first('n');
  const nl = await env.SDB.prepare('SELECT COUNT(*) n FROM likes WHERE device=?').bind(wxDev(u.id)).first('n');
  const role = { leader: '领舞', follower: '跟舞', both: '双角色' }[full.role] || '（未填）';
  const when = new Date(t).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）';
  const dl = wxDeadline(row.wx_added_at || now()), dls = new Date(dl).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const text = `有人在亚洲探戈地图按了「我已添加」，请在探戈助理的「新的朋友」里核对验证码：\n\n微信号：${wx}\n验证码：${row.wx_code || ''}\n城市：${full.city || '（未填）'}\n身份：${role}\n时间：${when}\n留过言：${nc ? '是（' + nc + ' 条）' : '否'}${nl ? '，点过赞' : ''}\n\n核对通过后标记已验证（之后不限次数）：POST /social/admin/wx-verify {"wechat":"${wx}"}\n加不上：POST /social/admin/wx-reject {"wechat":"${wx}"}（删除留言并禁用）\n期限：${dls}（三小时，夜里 23:00–09:00 不计；AUTO_EXPIRE=${env.AUTO_EXPIRE === 'on' ? 'on' : 'off'}）`;
  const to = env.WX_NOTIFY_TO || 'shiao.li.chang@gmail.com';
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM || 'Asia Tango Map <noreply@tangoweekend.org>', to: [to], subject: `ATM 待核对：${wx}，${row.wx_code || ''}`, text }) });
  if (!r.ok) throw new Error('resend ' + r.status);
  return 'sent';
}
async function wxClaim(env, u) { const r = await env.SDB.prepare('UPDATE users SET wx_used=1 WHERE id=? AND wx_used=0').bind(u.id).run(); return (r.meta?.changes ?? 0) > 0; }
async function issueSession(env, u) {
  const t = rnd(32);
  await env.SDB.prepare('UPDATE users SET verified_at=COALESCE(verified_at,?),code_hash=NULL WHERE id=?').bind(now(), u.id).run();
  await env.SDB.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').bind(await sha(t), u.id, now()).run();
  return t;
}
function confirmPage(ok, text) {
  return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ok ? '已确认' : '链接无效'}</title><body style="font-family:sans-serif;padding:32px;color:#2a1a14"><p>${text}</p></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function donePage(lang, dest, unsub) {
  const zh = lang === 'zh';
  const msg = zh ? '订阅成功！你已可在活动卡片下留言。不想再收消息可随时退订。' : 'You\'re subscribed. You can comment on event cards now. Unsubscribe anytime if you don\'t want messages.';
  const back = zh ? '回到活动卡片' : 'Back to the event card';
  const uword = zh ? '退订' : 'Unsubscribe';
  const href = he(dest), uh = he(unsub);
  return new Response(`<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="2;url=${href}"><title>${he(msg)}</title>
<body style="margin:0;background:#fbf5e9;font-family:system-ui,sans-serif;color:#2a1a14"><div style="max-width:480px;margin:12vh auto;padding:24px;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px">
<p style="font-size:1.1rem;color:#0a4f57;font-weight:700">${he(msg)}</p><p><a href="${href}" style="color:#0e6e78">${back}</a></p><p style="font-size:.85rem"><a href="${uh}" style="color:#7a6255">${uword}</a></p></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
// Opt-in joins the update list. Opt-out only blocks future update mail; an existing comment session stays.
async function applyList(env, u, want) {
  const email = String(u.email || '').toLowerCase(), ts = now();
  if (!want) {
    const active = await env.DB.prepare("SELECT 1 FROM email_subs WHERE lower(email)=? AND status='active'").bind(email).first();
    if (!active) await env.DB.prepare('INSERT INTO mail_unsub(email,at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET at=excluded.at').bind(email, ts).run();
    return;
  }
  await env.DB.prepare('DELETE FROM mail_unsub WHERE email=?').bind(email).run();
  const row = await env.DB.prepare('SELECT id,unsub_token FROM email_subs WHERE email=?').bind(email).first();
  if (!row) await env.DB.prepare(`INSERT INTO email_subs(email,name,types,cities,lang,status,unsub_token,created_at,confirmed_at) VALUES(?,?,'featured,regular','all',?,'active',?,?,?)`)
    .bind(email, u.name || null, u.lang === 'zh' ? 'zh' : 'en', rnd(24), ts, ts).run();
  else await env.DB.prepare("UPDATE email_subs SET status='active',name=COALESCE(name,?),lang=?,confirmed_at=COALESCE(confirmed_at,?),pending_since=NULL,confirm_hash=NULL,unsubscribed_at=NULL WHERE id=?").bind(u.name || null, u.lang === 'zh' ? 'zh' : 'en', ts, row.id).run();
}
async function confirmLink(env, url) {
  const email = clean(url.searchParams.get('e') || '', 254).toLowerCase(), tok = String(url.searchParams.get('t') || '');
  const next = safeNext(url.searchParams.get('next') || '');
  if (!EMAIL_RE.test(email) || !/^[0-9a-f]{64}$/.test(tok) || !next) return confirmPage(false, '链接无效。请回到页面重新发送确认邮件。 / This link is invalid. Send a new confirmation email.');
  const u = await env.SDB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  const parts = String(u && u.code_hash || '').split('.');
  if (!u || parts.length < 2 || u.code_tries >= 5 || Date.parse(u.code_sent_at) + 15 * 60e3 < Date.now()) return confirmPage(false, '链接已过期。请回到页面重新发送确认邮件。 / This link has expired. Send a new confirmation email.');
  if (await sha(email + ':' + tok) !== parts[1]) { await env.SDB.prepare('UPDATE users SET code_tries=code_tries+1 WHERE id=?').bind(u.id).run(); return confirmPage(false, '链接无效。请回到页面重新发送确认邮件。 / This link is invalid. Send a new confirmation email.'); }
  const want = parts[2] !== '0';
  const t = await issueSession(env, u);
  try { await applyList(env, u, want); } catch (e) { console.log('list', String(e && e.message || e).slice(0, 180)); }
  const dest = new URL(next); dest.hash = 'atm=' + t;
  const origin = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
  let unsub = origin + '/';
  try { unsub = (await updateFooter(env, origin, email, u.lang === 'zh' ? 'zh' : 'en')).url; } catch (e) { console.log('unsub link', String(e && e.message || e).slice(0, 120)); }
  return donePage(u.lang === 'zh' ? 'zh' : 'en', dest.toString(), unsub);
}

export async function social(req, env, url, json) {
  const p = url.pathname.slice('/social'.length), ip = req.headers.get('CF-Connecting-IP') || '', iph = (await sha(ip + 'atm')).slice(0, 16);
  let b = {}; if (req.method === 'POST') { try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); } }
  if (p === '/likes' && req.method === 'GET') {
    const ids = (url.searchParams.get('ids') || '').split(',').filter(x => ID_RE.test(x)).slice(0, 100), dev = url.searchParams.get('dev') || '';
    const counts = {}, mine = []; if (!ids.length) return json({ counts, mine });
    const q = ids.map(() => '?').join(',');
    (await env.SDB.prepare(`SELECT card_id,COUNT(*) n FROM likes WHERE card_id IN (${q}) GROUP BY card_id`).bind(...ids).all()).results.forEach(r => counts[r.card_id] = r.n);
    if (DEV_RE.test(dev)) (await env.SDB.prepare(`SELECT card_id FROM likes WHERE device=? AND card_id IN (${q})`).bind(dev, ...ids).all()).results.forEach(r => mine.push(r.card_id));
    const cc = {}; (await env.SDB.prepare(`SELECT card_id,COUNT(*) n FROM comments WHERE status='visible' AND card_id IN (${q}) GROUP BY card_id`).bind(...ids).all()).results.forEach(r => cc[r.card_id] = r.n);
    return json({ counts, mine, comments: cc });
  }
  if (p === '/like' && req.method === 'POST') {
    let id = String(b.id || ''), dev = String(b.dev || ''); if (!ID_RE.test(id) || !DEV_RE.test(dev)) return json({ error: 'bad_input' }, 400);
    const lu = await user(req, env), lwx = wxOf(lu); let claim = false;
    if (lwx) { const g = await wxGate(env, lu); if (g.err) return json({ error: g.err }, 403); dev = wxDev(lu.id); claim = !!g.claim; }
    const had = await env.SDB.prepare('SELECT 1 FROM likes WHERE card_id=? AND device=?').bind(id, dev).first();
    if (had) await env.SDB.prepare('DELETE FROM likes WHERE card_id=? AND device=?').bind(id, dev).run();
    else { if (claim && !(await wxClaim(env, lu))) return json({ error: 'wx_used' }, 403);
      await env.SDB.prepare('INSERT OR IGNORE INTO likes(card_id,device,created_at) VALUES(?,?,?)').bind(id, dev, now()).run(); }
    const n = await env.SDB.prepare('SELECT COUNT(*) n FROM likes WHERE card_id=?').bind(id).first('n');
    return json({ id, n, liked: !had });
  }
  if (p === '/comments' && req.method === 'GET') {
    const id = url.searchParams.get('id') || ''; if (!ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
    const r = await env.SDB.prepare("SELECT u.name,u.city,c.body,c.lang,c.tr,c.created_at at FROM comments c JOIN users u ON u.id=c.user_id WHERE c.card_id=? AND c.status='visible' ORDER BY c.created_at DESC, c.id DESC LIMIT 200").bind(id).all();
    const u = await user(req, env);
    const mine = !!(u && await env.SDB.prepare('SELECT 1 FROM comments WHERE card_id=? AND user_id=? LIMIT 1').bind(id, u.id).first());
    return json({ items: r.results, mine });
  }
  if (p === '/confirm' && req.method === 'GET') return confirmLink(env, url);
  if (p === '/signup' && req.method === 'POST') {
    const name = clean(b.name, 40).replace(/\s+/g, ' '), email = clean(b.email, 254).toLowerCase(), lang = b.lang === 'zh' ? 'zh' : 'en';
    const city = clean(b.city, 40).replace(/\s+/g, ' '); if (!city) return json({ error: 'need_city' }, 400);
    const role = ROLES.includes(b.role) ? b.role : ''; if (!role) return json({ error: 'need_role' }, 400);
    if (!name) return json({ error: 'need_name' }, 400); if (!EMAIL_RE.test(email)) return json({ error: 'bad_email' }, 400);
    const magic = b.magic === 1 || b.magic === true || b.magic === '1';
    const ret = magic ? safeNext(b.ret) : '';
    if (magic && !ret) return json({ error: 'bad_return' }, 400);
    if (!(await turnstile(env, b.ts, ip))) return json({ error: 'turnstile' }, 403);
    const recent = await env.SDB.prepare('SELECT COUNT(*) n FROM users WHERE ip_hash=? AND code_sent_at>?').bind(iph, new Date(Date.now() - 3600e3).toISOString()).first('n');
    if (recent >= 6) return json({ error: 'rate_limited' }, 429);
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    const mag = magic ? rnd(32) : '';
    const updates = !(b.updates === 0 || b.updates === false || b.updates === '0');
    const stored = await sha(email + ':' + code) + (mag ? '.' + await sha(email + ':' + mag) + (updates ? '' : '.0') : '');
    await env.SDB.prepare(`INSERT INTO users(email,name,lang,code_hash,code_sent_at,code_tries,created_at,ip_hash,city,role) VALUES(?,?,?,?,?,0,?,?,?,?)
      ON CONFLICT(email) DO UPDATE SET name=excluded.name,lang=excluded.lang,code_hash=excluded.code_hash,code_sent_at=excluded.code_sent_at,code_tries=0,ip_hash=excluded.ip_hash,city=excluded.city,role=excluded.role`)
      .bind(email, name, lang, stored, now(), now(), iph, city, role).run();
    const base = String(env.API_BASE || 'https://api.tangoweekend.org').replace(/\/$/, '');
    const link = mag ? base + '/social/confirm?e=' + encodeURIComponent(email) + '&t=' + mag + '&next=' + encodeURIComponent(ret) : '';
    let via; try { via = magic ? await sendMagic(env, email, name, link, lang) : await sendCode(env, email, name, code, lang); } catch (e) { return json({ error: 'send_failed', ...(env.PREVIEW_SHOW_CODE === '1' ? { detail: String(e && e.message || e).slice(0, 200) } : {}) }, 502); }
    return json({ ok: true, via, ...(magic ? { magic: true } : {}), ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_code: code, ...(link ? { preview_link: link } : {}) } : {}) });
  }
  if (p === '/verify' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase(), code = clean(b.code, 6);
    const u = await env.SDB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
    if (!u || !u.code_hash || u.code_tries >= 5 || Date.parse(u.code_sent_at) + 15 * 60e3 < Date.now()) return json({ error: 'expired' }, 400);
    if ((await sha(email + ':' + code)) !== String(u.code_hash).split('.')[0]) { await env.SDB.prepare('UPDATE users SET code_tries=code_tries+1 WHERE id=?').bind(u.id).run(); return json({ error: 'bad_code' }, 400); }
    const t = await issueSession(env, u);
    return json({ ok: true, token: t, name: u.name });
  }
  if (p === '/me' && req.method === 'GET') { const u = await user(req, env); if (!u) return json({ error: 'auth' }, 401);
    const wx = wxOf(u); if (!wx) return json({ name: u.name });
    const st = await wxStatus(env, wx); if (st === 'banned' || !st) return json({ error: 'wx_banned' }, 403);
    const row = await wxRow(env, wx) || {};
    return json({ name: u.name, wx: st, used: !!u.wx_used, wxdev: wxDev(u.id), added: !!row.wx_added_at, code: st === 'pending' ? row.wx_code : null }); }
  if (p === '/wx-added' && req.method === 'POST') {   // 「我已添加」: unlock one action, start the clock, alert the owner
    const u = await user(req, env), wx = wxOf(u); if (!wx) return json({ error: 'auth' }, 401);
    const st = await wxStatus(env, wx); if (st === 'banned' || !st) return json({ error: 'wx_banned' }, 403);
    if (st === 'verified') return json({ ok: true, wx: st, added: true });
    await env.DB.prepare("UPDATE subs SET wx_added_at=COALESCE(wx_added_at,?) WHERE wechat=? AND wx_status='pending'").bind(now(), wx).run();
    const row = await wxRow(env, wx) || {}; let note = 'skip';
    try { note = await wxAddedNotify(env, u, wx, row); } catch (e) { console.log('wx notify', e.message); note = 'fail'; }
    return json({ ok: true, wx: st, added: true, used: !!u.wx_used, notify: note, deadline: wxDeadline(row.wx_added_at) }); }
  if (p === '/comment' && req.method === 'POST') {
    const u = await user(req, env); if (!u) return json({ error: 'auth' }, 401);
    const id = String(b.id || ''), body = clean(b.body, 1000); if (!ID_RE.test(id) || !body) return json({ error: 'bad_input' }, 400);
    if (await env.SDB.prepare('SELECT 1 FROM comments WHERE card_id=? AND user_id=? LIMIT 1').bind(id, u.id).first()) return json({ error: 'already_commented' }, 409);
    const n = await env.SDB.prepare('SELECT COUNT(*) n FROM comments WHERE user_id=? AND created_at>?').bind(u.id, new Date(Date.now() - 600e3).toISOString()).first('n');
    if (n >= 5) return json({ error: 'rate_limited' }, 429);
    const day0 = shanghaiDayStart();
    const dayN = await env.SDB.prepare('SELECT COUNT(*) n FROM comments WHERE user_id=? AND created_at>=?').bind(u.id, day0).first('n');
    if (dayN >= 15) return json({ error: 'rate_limited' }, 429);
    const g = await wxGate(env, u); if (g.err) return json({ error: g.err }, 403);
    if (g.claim && !(await wxClaim(env, u))) return json({ error: 'wx_used' }, 403);
    const lang = /[\u3400-\u9fff]/.test(body) ? 'zh' : 'en', tr = await translate(env, body, lang);
    await env.SDB.prepare('INSERT INTO comments(card_id,user_id,body,created_at,ip_hash,lang,tr) VALUES(?,?,?,?,?,?,?)').bind(id, u.id, body, now(), iph, lang, tr).run();
    return json({ ok: true, item: { name: u.name, body, lang, tr, at: now() } });
  }
  if (p === '/wx-login' && req.method === 'POST') {   // zh: WeChat ID only (no code). Pending = one comment or one like; verified (探戈助理 added them) = unlimited; banned = none.
    if (b.lang !== 'zh') return json({ error: 'zh_only' }, 403);
    const wx = clean(b.wechat, 64); if (!wx) return json({ error: 'need_wechat' }, 400);
    const st = await wxStatus(env, wx);
    if (st === 'banned') return json({ error: 'wx_banned' }, 403);
    if (!st) return json({ error: 'not_found' }, 404);
    const r = await env.DB.prepare("SELECT name FROM subs WHERE wechat=? AND wx_status=? ORDER BY id DESC LIMIT 1").bind(wx, st).first();
    const key = 'wx:' + wx, nm = clean(r && r.name, 40) || wx;
    await env.SDB.prepare(`INSERT INTO users(email,name,lang,verified_at,created_at,ip_hash,city,role) VALUES(?,?,'zh',?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,city=COALESCE(excluded.city,users.city),role=COALESCE(excluded.role,users.role),verified_at=COALESCE(users.verified_at,excluded.verified_at)`).bind(key, nm, now(), now(), iph, clean(b.city, 40) || null, ROLES.includes(b.role) ? b.role : null).run();
    const u = await env.SDB.prepare('SELECT id,name,wx_used FROM users WHERE email=?').bind(key).first(), t = rnd(32);
    await env.SDB.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').bind(await sha(t), u.id, now()).run();
    const row2 = await wxRow(env, wx) || {};
    return json({ ok: true, token: t, name: u.name, wx: st, used: !!u.wx_used, wxdev: wxDev(u.id), added: !!row2.wx_added_at, code: st === 'pending' ? row2.wx_code : null });
  }
  if (p.startsWith('/admin/') ) {   // Bearer ADMIN_TOKEN. GET /admin/wx-pending ; POST /admin/wx-verify {wechat}
    const a = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.ADMIN_TOKEN || a.length < 24 || a !== env.ADMIN_TOKEN) return json({ error: 'auth' }, 401);
    if (p === '/admin/archive' && req.method === 'POST') { const id = String(b.id || ''); if (!ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
      const st = b.restore ? 'visible' : 'archived', from = b.restore ? 'archived' : 'visible';
      const r = await env.SDB.prepare('UPDATE comments SET status=? WHERE card_id=? AND status=?').bind(st, id, from).run(); return json({ ok: true, changed: r.meta.changes }); }
    if (p === '/admin/wx-pending' && req.method === 'GET') return json({ auto_expire: env.AUTO_EXPIRE === 'on' ? 'on' : 'off', items: await wxPendingList(env) });
    if (p === '/admin/wx-expire' && req.method === 'POST') return json(await wxExpireSweep(env));
    if (p === '/admin/wx-reject' && req.method === 'POST') { const wx = clean(b.wechat, 64); if (!wx) return json({ error: 'bad_input' }, 400); return json(await wxReject(env, wx)); }
    if (p === '/admin/wx-verify' && req.method === 'POST') { const r = await env.DB.prepare("UPDATE subs SET wx_status='verified',wx_verified_at=? WHERE wechat=? AND wx_status='pending'").bind(now(), clean(b.wechat, 64)).run(); return json({ ok: true, changed: r.meta?.changes ?? 0 }); }
  }
  return json({ error: 'not_found' }, 404);
}

// zh<->en machine translation (Workers AI m2m100); null on failure so the original still posts.
async function translate(env, text, lang) {
  if (!env.AI) return null;
  try { const r = await env.AI.run('@cf/meta/m2m100-1.2b', { text, source_lang: lang === 'zh' ? 'chinese' : 'english', target_lang: lang === 'zh' ? 'english' : 'chinese' });
    const t = String(r && r.translated_text || '').trim().slice(0, 2000); return t && t !== text ? t : null; } catch (e) { return null; }
}
const ROLES = ['leader', 'follower', 'both'];
