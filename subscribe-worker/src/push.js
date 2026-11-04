// Web Push (RFC 8030/8291/8292) for Cloudflare Workers, WebCrypto only.
// Secrets: VAPID_PUBLIC (base64url, 65-byte uncompressed P-256), VAPID_PRIVATE (base64url, 32-byte d), PUSH_ADMIN_TOKEN.
// Var: VAPID_SUBJECT (mailto:...). Table push_subs (migrations/0003_push.sql).
const te = new TextEncoder();
export const b64u = {
  enc: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0))
};
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
async function vapidKey(env) {
  const pub = b64u.dec(env.VAPID_PUBLIC);
  const jwk = { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE, x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), ext: true };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}
export async function vapidAuth(env, endpoint) {
  const aud = new URL(endpoint).origin;
  const h = b64u.enc(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const p = b64u.enc(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:selecttango@gmail.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidKey(env), te.encode(h + '.' + p));
  return `vapid t=${h}.${p}.${b64u.enc(sig)}, k=${env.VAPID_PUBLIC}`;
}
// aes128gcm content encoding (RFC 8188 + 8291)
export async function encrypt(p256dh, auth, payload) {
  const uaPub = b64u.dec(p256dh), authS = b64u.dec(auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authS, shared, cat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(te.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
export async function sendOne(env, sub, payload, ttl = 86400, fetcher = fetch) {
  const body = await encrypt(sub.p256dh, sub.auth, payload);
  return fetcher(sub.endpoint, { method: 'POST', body, headers: {
    Authorization: await vapidAuth(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'normal' } });
}

// ---- HTTP handlers ----
const ALLOWED_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|mozaws\.net|push\.apple\.com|notify\.windows\.com|windows\.com)\//i;
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const okUrl = u => { u = String(u || ''); return /^https:\/\/(www\.)?tangoweekend\.org(\/|$)/.test(u) ? u.slice(0, 300) : ''; };

export async function pushSubscribe(req, env, json, h) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400, h); }
  const s = b.subscription || b, k = s.keys || {};
  if (!ALLOWED_HOSTS.test(String(s.endpoint || '')) || !k.p256dh || !k.auth || String(s.endpoint).length > 800) return json({ error: 'bad_subscription' }, 400, h);
  const lang = b.lang === 'zh' ? 'zh' : 'en', now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO push_subs(endpoint,p256dh,auth,lang,created_at,last_ok_at,fails) VALUES(?,?,?,?,?,NULL,0)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,lang=excluded.lang,fails=0`)
    .bind(s.endpoint, clean(k.p256dh, 200), clean(k.auth, 64), lang, now).run();
  return json({ ok: true }, 200, h);
}
export async function pushUnsubscribe(req, env, json, h) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400, h); }
  await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(String((b.subscription || b).endpoint || '')).run();
  return json({ ok: true }, 200, h);
}
// POST /push/send  Authorization: Bearer PUSH_ADMIN_TOKEN
// {kind:'event'|'notice'|'ad', messages:[{title_zh,title_en,body_zh,body_en,url_zh,url_en,tag}], test_endpoint?}
// or a single message at top level (ad-hoc 临时通知 / 不定期广告).
export async function pushSend(req, env, json, fetcher = fetch) {
  const tokenOk = env.PUSH_ADMIN_TOKEN && env.PUSH_ADMIN_TOKEN.length >= 24 && req.headers.get('Authorization') === 'Bearer ' + env.PUSH_ADMIN_TOKEN;
  if (!tokenOk) return json({ error: 'unauthorized' }, 401);
  if (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return json({ error: 'vapid_not_configured' }, 503);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const kind = ['event', 'notice', 'ad'].includes(b.kind) ? b.kind : 'event';
  const msgs = (Array.isArray(b.messages) ? b.messages : [b]).slice(0, 5).map(m => ({
    title_zh: clean(m.title_zh || m.title_en, 80), title_en: clean(m.title_en || m.title_zh, 80),
    body_zh: clean(m.body_zh || m.body_en, 200), body_en: clean(m.body_en || m.body_zh, 200),
    url_zh: okUrl(m.url_zh) || 'https://tangoweekend.org/zh/asia/', url_en: okUrl(m.url_en || m.url_zh) || 'https://tangoweekend.org/asia/',
    tag: clean(m.tag || kind, 60) })).filter(m => m.title_zh);
  if (!msgs.length) return json({ error: 'need_title' }, 400);
  // Rate limits: ad-hoc notices/ads max PUSH_ADHOC_PER_DAY (default 2) per 24h; all sends max 20 per 24h. A test send skips the limit.
  const since = new Date(Date.now() - 86400000).toISOString();
  if (!b.test_endpoint) {
    const all = await env.DB.prepare('SELECT COUNT(*) n FROM push_log WHERE sent_at>?').bind(since).first('n');
    const adhoc = await env.DB.prepare("SELECT COUNT(*) n FROM push_log WHERE sent_at>? AND kind IN ('notice','ad')").bind(since).first('n');
    if (all >= 20 || (kind !== 'event' && adhoc >= Number(env.PUSH_ADHOC_PER_DAY || 2))) return json({ error: 'rate_limited' }, 429);
  }
  const subs = b.test_endpoint
    ? (await env.DB.prepare('SELECT * FROM push_subs WHERE endpoint=?').bind(b.test_endpoint).all()).results
    : (await env.DB.prepare('SELECT * FROM push_subs WHERE fails<5').all()).results;
  let sent = 0, gone = 0, failed = 0;
  for (const s of subs) {
    for (const m of msgs) {
      const zh = s.lang === 'zh';
      const payload = JSON.stringify({ title: zh ? m.title_zh : m.title_en, body: zh ? m.body_zh : m.body_en, url: zh ? m.url_zh : m.url_en, tag: m.tag });
      try {
        const r = await sendOne(env, s, payload, kind === 'event' ? 86400 : 43200, fetcher);
        if (r.status === 404 || r.status === 410) { gone++; await env.DB.prepare('DELETE FROM push_subs WHERE id=?').bind(s.id).run(); break; }
        if (r.ok) { sent++; await env.DB.prepare('UPDATE push_subs SET last_ok_at=?,fails=0 WHERE id=?').bind(new Date().toISOString(), s.id).run(); }
        else { failed++; await env.DB.prepare('UPDATE push_subs SET fails=fails+1 WHERE id=?').bind(s.id).run(); }
      } catch { failed++; }
    }
  }
  await env.DB.prepare('INSERT INTO push_log(sent_at,kind,title,n_subs,sent,failed,gone,is_test) VALUES(?,?,?,?,?,?,?,?)')
    .bind(new Date().toISOString(), kind, msgs[0].title_zh, subs.length, sent, failed, gone, b.test_endpoint ? 1 : 0).run();
  return json({ ok: true, kind, messages: msgs.length, subscribers: subs.length, sent, failed, gone });
}
