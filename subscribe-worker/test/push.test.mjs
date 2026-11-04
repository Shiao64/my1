// node --experimental-sqlite test/push.test.mjs   (Node 22+). Local test VAPID key pair is generated per run; nothing real.
import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs'; import assert from 'node:assert'; import nc from 'node:crypto';
import { encrypt, b64u, pushSubscribe, pushSend } from '../src/push.js';
const S = crypto.subtle;
const vk = await S.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const vj = await S.exportKey('jwk', vk.privateKey), vpub = new Uint8Array(await S.exportKey('raw', vk.publicKey));
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../migrations/0003_push.sql', import.meta.url), 'utf8'));
const D1 = { prepare(sql) { let a = []; const st = db.prepare(sql); return { bind(...x) { a = x; return this; }, first(c) { const r = st.get(...a); return c ? r?.[c] : r ?? null; }, run() { st.run(...a); return {}; }, all() { return { results: st.all(...a) }; } }; } };
const env = { DB: D1, VAPID_PUBLIC: b64u.enc(vpub), VAPID_PRIVATE: vj.d, PUSH_ADMIN_TOKEN: 'x'.repeat(32), VAPID_SUBJECT: 'mailto:t@example.com' };
const json = (d, s) => new Response(JSON.stringify(d), { status: s });
// fake browser subscription
const ua = nc.createECDH('prime256v1'); ua.generateKeys(); const authS = nc.randomBytes(16);
const mk = ep => ({ endpoint: ep, keys: { p256dh: b64u.enc(ua.getPublicKey()), auth: b64u.enc(authS) } });
function decrypt(buf) { // RFC 8291 receiver side
  const salt = buf.subarray(0, 16), idl = buf[20], asPub = buf.subarray(21, 21 + idl), ct = buf.subarray(21 + idl);
  const shared = ua.computeSecret(asPub);
  const hk = (s, k, i, n) => Buffer.from(nc.hkdfSync('sha256', k, s, i, n));
  const ikm = hk(authS, shared, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32);
  const cek = hk(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16), nonce = hk(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const d = nc.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(-16));
  const pt = Buffer.concat([d.update(ct.subarray(0, -16)), d.final()]); assert.equal(pt.at(-1), 2); return pt.subarray(0, -1).toString();
}
const ok = []; const t = (n, f) => f().then(() => ok.push('PASS ' + n)).catch(e => { ok.push('FAIL ' + n + ' ' + e.message); });
await t('encrypt roundtrip', async () => { const s = mk('x'); assert.equal(decrypt(Buffer.from(await encrypt(s.keys.p256dh, s.keys.auth, '{"a":"临时变更"}'))), '{"a":"临时变更"}'); });
const req = (b, h = {}) => new Request('https://api.x/', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(b) });
await t('subscribe rejects foreign endpoint', async () => assert.equal((await pushSubscribe(req(mk('https://evil.example/p')), env, json, {})).status, 400));
await t('subscribe zh + en', async () => { await pushSubscribe(req({ subscription: mk('https://fcm.googleapis.com/fcm/send/AAA'), lang: 'zh' }), env, json, {}); await pushSubscribe(req({ subscription: mk('https://updates.push.services.mozilla.com/wpush/v2/BBB'), lang: 'en' }), env, json, {}); assert.equal(db.prepare('select count(*) n from push_subs').get().n, 2); });
await t('send needs token', async () => assert.equal((await pushSend(req({ title_zh: 'a' }), env, json)).status, 401));
await t('send wrong token', async () => assert.equal((await pushSend(req({ title_zh: 'a' }, { Authorization: 'Bearer nope' }), env, json)).status, 401));
const seen = []; const fetcher = async (ep, o) => { seen.push({ ep, o, pt: JSON.parse(decrypt(Buffer.from(o.body))) }); return new Response('', { status: ep.includes('BBB') && seen.length > 2 ? 410 : 201 }); };
const A = { Authorization: 'Bearer ' + env.PUSH_ADMIN_TOKEN };
await t('event send bilingual + VAPID JWT valid', async () => {
  const r = await (await pushSend(req({ kind: 'event', messages: [{ title_zh: '临时变更 11/5：Milonga Nuevo', title_en: 'Temporarily changed 11/5: Milonga Nuevo', body_zh: '20:30–00:30', body_en: '8:30 PM', url_zh: 'https://tangoweekend.org/zh/asia/?card=yhBU2qgt', url_en: 'https://tangoweekend.org/asia/?card=yhBU2qgt' }] }, A), env, json, fetcher)).json();
  assert.equal(r.sent, 2);
  const zh = seen.find(s => s.ep.includes('AAA')), en = seen.find(s => s.ep.includes('BBB'));
  assert.match(zh.pt.title, /临时变更/); assert.match(zh.pt.url, /\/zh\//); assert.match(en.pt.title, /Temporarily/);
  const m = zh.o.headers.Authorization.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/); const p = JSON.parse(Buffer.from(m[2], 'base64url'));
  assert.equal(p.aud, 'https://fcm.googleapis.com');
  assert.ok(await S.verify({ name: 'ECDSA', hash: 'SHA-256' }, vk.publicKey, b64u.dec(m[3]), new TextEncoder().encode(m[1] + '.' + m[2])));
  assert.equal(zh.o.headers['Content-Encoding'], 'aes128gcm'); });
await t('410 removes subscription', async () => { await pushSend(req({ kind: 'event', title_zh: '新活动', title_en: 'New' }, A), env, json, fetcher); assert.equal(db.prepare('select count(*) n from push_subs').get().n, 1); });
await t('ad-hoc notice ok, url off-site replaced', async () => { seen.length = 0; const r = await (await pushSend(req({ kind: 'notice', title_zh: '临时通知', title_en: 'Notice', url_en: 'https://evil.example/' }, A), env, json, fetcher)).json(); assert.equal(r.sent, 1); assert.equal(seen[0].pt.url, 'https://tangoweekend.org/zh/asia/'); });
await t('ad-hoc limit 2/day', async () => { await pushSend(req({ kind: 'ad', title_zh: '广告', title_en: 'Ad' }, A), env, json, fetcher); assert.equal((await pushSend(req({ kind: 'ad', title_zh: '广告2', title_en: 'Ad2' }, A), env, json, fetcher)).status, 429); });
await t('event pushes still allowed after ad-hoc limit', async () => assert.equal((await pushSend(req({ kind: 'event', title_zh: '新活动', title_en: 'New' }, A), env, json, fetcher)).status, 200));
await t('no VAPID -> 503', async () => assert.equal((await pushSend(req({ title_zh: 'a' }, A), { ...env, VAPID_PUBLIC: '' }, json, fetcher)).status, 503));
console.log(ok.join('\n')); if (ok.some(x => x.startsWith('FAIL'))) process.exit(1);
