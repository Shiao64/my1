// Asia Tango Map likes + comments API. Mounted under /social/* .
// GET  /social/likes?ids=A,B&dev=D        -> {counts:{A:n}, mine:[A]}
// POST /social/like {id, dev}              -> toggle; {id, n, liked}
// GET  /social/comments?id=A               -> {items:[{name,body,at}]}
// POST /social/signup {name,email,lang,ts} -> 6-digit code by email (Turnstile checked)
// POST /social/verify {email, code}        -> {token, name}  (email verified)
// GET  /social/me  (Authorization: Bearer)  -> {name}
// POST /social/comment {id, body} (Bearer)  -> posts a comment
const ID_RE = /^(?:(?:org|dj):)?[A-Za-z0-9_-]{1,64}$/, DEV_RE = /^[A-Za-z0-9-]{16,64}$/, EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const now = () => new Date().toISOString();
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const clean = (s, n) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);

async function turnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return env.ALLOW_NO_TURNSTILE === '1';
  const f = new FormData(); f.append('secret', env.TURNSTILE_SECRET); f.append('response', token || ''); if (ip) f.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: f });
  return !!(await r.json()).success;
}
async function sendCode(env, to, name, code, lang) {
  const zh = lang === 'zh';
  const subject = zh ? `亚洲探戈地图 验证码：${code}` : `Asia Tango Map verification code: ${code}`;
  const text = zh ? `${name}，您好！\n\n您的验证码是：${code}\n15 分钟内有效。验证邮箱后就可以在亚洲探戈地图留言。\n如果不是您本人操作，请忽略这封邮件。`
    : `Hi ${name},\n\nYour verification code is: ${code}\nIt is valid for 15 minutes. Once your email is verified you can comment on Asia Tango Map.\nIf this wasn't you, just ignore this email.`;
  const p = env.SOCIAL_MAIL || 'log';
  if (env.TEST_ONLY_RECIPIENT && to !== env.TEST_ONLY_RECIPIENT && p !== 'log') throw new Error('recipient not allowed in test mode');
  if (p === 'cloudflare') await env.SOCIAL_MAIL_BINDING.send({ from: { email: env.SENDER, name: 'Asia Tango Map' }, to, subject, text });
  else console.log(`[mail:log] to=${to} subject=${subject}`);
  return p;
}
async function user(req, env) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  return env.SDB.prepare('SELECT u.id,u.name,u.city FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.verified_at IS NOT NULL').bind(await sha(t)).first();
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
    const id = String(b.id || ''), dev = String(b.dev || ''); if (!ID_RE.test(id) || !DEV_RE.test(dev)) return json({ error: 'bad_input' }, 400);
    const had = await env.SDB.prepare('SELECT 1 FROM likes WHERE card_id=? AND device=?').bind(id, dev).first();
    if (had) await env.SDB.prepare('DELETE FROM likes WHERE card_id=? AND device=?').bind(id, dev).run();
    else await env.SDB.prepare('INSERT OR IGNORE INTO likes(card_id,device,created_at) VALUES(?,?,?)').bind(id, dev, now()).run();
    const n = await env.SDB.prepare('SELECT COUNT(*) n FROM likes WHERE card_id=?').bind(id).first('n');
    return json({ id, n, liked: !had });
  }
  if (p === '/comments' && req.method === 'GET') {
    const id = url.searchParams.get('id') || ''; if (!ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
    const r = await env.SDB.prepare("SELECT u.name,u.city,c.body,c.lang,c.tr,c.created_at at FROM comments c JOIN users u ON u.id=c.user_id WHERE c.card_id=? AND c.status='visible' ORDER BY c.created_at DESC, c.id DESC LIMIT 200").bind(id).all();
    return json({ items: r.results });
  }
  if (p === '/signup' && req.method === 'POST') {
    const name = clean(b.name, 40).replace(/\s+/g, ' '), email = clean(b.email, 254).toLowerCase(), lang = b.lang === 'zh' ? 'zh' : 'en';
    const city = clean(b.city, 40).replace(/\s+/g, ' '); if (!city) return json({ error: 'need_city' }, 400);
    const role = ROLES.includes(b.role) ? b.role : ''; if (!role) return json({ error: 'need_role' }, 400);
    if (!name) return json({ error: 'need_name' }, 400); if (!EMAIL_RE.test(email)) return json({ error: 'bad_email' }, 400);
    if (!(await turnstile(env, b.ts, ip))) return json({ error: 'turnstile' }, 403);
    const recent = await env.SDB.prepare('SELECT COUNT(*) n FROM users WHERE ip_hash=? AND code_sent_at>?').bind(iph, new Date(Date.now() - 3600e3).toISOString()).first('n');
    if (recent >= 6) return json({ error: 'rate_limited' }, 429);
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    await env.SDB.prepare(`INSERT INTO users(email,name,lang,code_hash,code_sent_at,code_tries,created_at,ip_hash,city,role) VALUES(?,?,?,?,?,0,?,?,?,?)
      ON CONFLICT(email) DO UPDATE SET name=excluded.name,lang=excluded.lang,code_hash=excluded.code_hash,code_sent_at=excluded.code_sent_at,code_tries=0,ip_hash=excluded.ip_hash,city=excluded.city,role=excluded.role`)
      .bind(email, name, lang, await sha(email + ':' + code), now(), now(), iph, city, role).run();
    let via; try { via = await sendCode(env, email, name, code, lang); } catch (e) { return json({ error: 'send_failed' }, 502); }
    return json({ ok: true, via, ...(env.PREVIEW_SHOW_CODE === '1' && via === 'log' ? { preview_code: code } : {}) });
  }
  if (p === '/verify' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase(), code = clean(b.code, 6);
    const u = await env.SDB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
    if (!u || !u.code_hash || u.code_tries >= 5 || Date.parse(u.code_sent_at) + 15 * 60e3 < Date.now()) return json({ error: 'expired' }, 400);
    if ((await sha(email + ':' + code)) !== u.code_hash) { await env.SDB.prepare('UPDATE users SET code_tries=code_tries+1 WHERE id=?').bind(u.id).run(); return json({ error: 'bad_code' }, 400); }
    const t = rnd(32);
    await env.SDB.prepare('UPDATE users SET verified_at=COALESCE(verified_at,?),code_hash=NULL WHERE id=?').bind(now(), u.id).run();
    await env.SDB.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').bind(await sha(t), u.id, now()).run();
    return json({ ok: true, token: t, name: u.name });
  }
  if (p === '/me' && req.method === 'GET') { const u = await user(req, env); return u ? json({ name: u.name }) : json({ error: 'auth' }, 401); }
  if (p === '/comment' && req.method === 'POST') {
    const u = await user(req, env); if (!u) return json({ error: 'auth' }, 401);
    const id = String(b.id || ''), body = clean(b.body, 1000); if (!ID_RE.test(id) || !body) return json({ error: 'bad_input' }, 400);
    const n = await env.SDB.prepare('SELECT COUNT(*) n FROM comments WHERE user_id=? AND created_at>?').bind(u.id, new Date(Date.now() - 600e3).toISOString()).first('n');
    if (n >= 5) return json({ error: 'rate_limited' }, 429);
    const lang = /[\u3400-\u9fff]/.test(body) ? 'zh' : 'en', tr = await translate(env, body, lang);
    await env.SDB.prepare('INSERT INTO comments(card_id,user_id,body,created_at,ip_hash,lang,tr) VALUES(?,?,?,?,?,?,?)').bind(id, u.id, body, now(), iph, lang, tr).run();
    return json({ ok: true, item: { name: u.name, body, lang, tr, at: now() } });
  }
  if (p === '/wx-login' && req.method === 'POST') {   // zh alternative to email: WeChat subscriber verified by admin, proves it with the 4-digit code
    if (b.lang !== 'zh') return json({ error: 'zh_only' }, 403);   // WeChat verification is for zh readers only
    const wx = clean(b.wechat, 64), code = clean(b.code, 4);
    const r = await env.DB.prepare("SELECT name,wechat FROM subs WHERE wechat=? AND wx_code=? AND wx_status='verified' LIMIT 1").bind(wx, code).first();
    if (!r) { const pend = await env.DB.prepare("SELECT 1 FROM subs WHERE wechat=? AND wx_code=? AND wx_status='pending'").bind(wx, code).first(); return json({ error: pend ? 'wx_pending' : 'bad_code' }, 400); }
    const key = 'wx:' + wx, nm = clean(r.name, 40) || wx;
    await env.SDB.prepare(`INSERT INTO users(email,name,lang,verified_at,created_at,ip_hash,city,role) VALUES(?,?,'zh',?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,city=COALESCE(excluded.city,users.city),role=COALESCE(excluded.role,users.role),verified_at=COALESCE(users.verified_at,excluded.verified_at)`).bind(key, nm, now(), now(), iph, clean(b.city, 40) || null, ROLES.includes(b.role) ? b.role : null).run();
    const u = await env.SDB.prepare('SELECT id,name FROM users WHERE email=?').bind(key).first(), t = rnd(32);
    await env.SDB.prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES(?,?,?)').bind(await sha(t), u.id, now()).run();
    return json({ ok: true, token: t, name: u.name });
  }
  if (p.startsWith('/admin/') ) {   // Bearer ADMIN_TOKEN. GET /admin/wx-pending ; POST /admin/wx-verify {wechat}
    const a = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.ADMIN_TOKEN || a.length < 24 || a !== env.ADMIN_TOKEN) return json({ error: 'auth' }, 401);
    if (p === '/admin/archive' && req.method === 'POST') { const id = String(b.id || ''); if (!ID_RE.test(id)) return json({ error: 'bad_input' }, 400);
      const st = b.restore ? 'visible' : 'archived', from = b.restore ? 'archived' : 'visible';
      const r = await env.SDB.prepare('UPDATE comments SET status=? WHERE card_id=? AND status=?').bind(st, id, from).run(); return json({ ok: true, changed: r.meta.changes }); }
    if (p === '/admin/wx-pending' && req.method === 'GET') return json({ items: (await env.DB.prepare("SELECT id,created_at,name,wechat,wx_code,email FROM subs WHERE wx_status='pending' ORDER BY id").all()).results });
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
