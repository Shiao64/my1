// Pure MIME builder for subscriber mail (UTF-8, base64 bodies, RFC 2047 encoded subject/name). No runtime deps.
const enc = new TextEncoder();
export function b64utf8(s) {
  const bytes = enc.encode(s); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const wrap = s => s.replace(/.{1,76}/g, '$&\r\n').replace(/\r\n$/, '');
const needsEnc = s => /[^\x20-\x7e]/.test(s);
export function encWord(s) {
  if (!needsEnc(s)) return s;
  // split into chunks so each encoded-word stays short; never split inside a UTF-16 surrogate pair
  const chars = Array.from(s), out = []; let cur = '';
  for (const c of chars) { if (enc.encode(cur + c).length > 42) { out.push(cur); cur = ''; } cur += c; }
  if (cur) out.push(cur);
  return out.map(p => `=?UTF-8?B?${b64utf8(p)}?=`).join('\r\n ');
}
const clean = s => String(s).replace(/[\r\n]+/g, ' ');
export function buildMime({ fromName, fromEmail, to, subject, text, html, headers = {}, msgDomain = 'gmail.com', date = new Date(), boundary }) {
  for (const a of [fromEmail, to]) if (/[\r\n<>\s]/.test(a)) throw new Error('bad address');
  const b = boundary || 'atm_' + crypto.randomUUID().replace(/-/g, '');
  const h = [
    `From: ${encWord(clean(fromName))} <${fromEmail}>`, `To: <${to}>`, `Subject: ${encWord(clean(subject))}`,
    `Date: ${date.toUTCString().replace('GMT', '+0000')}`, `Message-ID: <${crypto.randomUUID()}@${msgDomain}>`, 'MIME-Version: 1.0',
    ...Object.entries(headers).map(([k, v]) => `${clean(k)}: ${clean(v)}`),
  ];
  const part = (type, body) => [`--${b}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '', wrap(b64utf8(body))].join('\r\n');
  if (!html) return [...h, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap(b64utf8(text))].join('\r\n') + '\r\n';
  return [...h, `Content-Type: multipart/alternative; boundary="${b}"`, '', part('text/plain', text), part('text/html', html), `--${b}--`, ''].join('\r\n');
}
