// Minimal Gmail SMTP client (implicit TLS on 465) over Workers TCP sockets. AUTH LOGIN with an app password.
import { connect } from 'cloudflare:sockets';
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const hdr = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
export async function gmailSend({ user, pass, fromName, to, subject, text, html, headers }) {
  const sock = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on' });
  const w = sock.writable.getWriter(), r = sock.readable.getReader(), enc = new TextEncoder(), dec = new TextDecoder();
  let buf = '';
  async function reply() {   // read one full (possibly multi-line) reply
    for (;;) { const m = buf.match(/(^|\r\n)(\d{3}) [^\r\n]*\r\n/); if (m) { const end = m.index + m[0].length, out = buf.slice(0, end); buf = buf.slice(end); return [+m[2], out]; }
      const { value, done } = await r.read(); if (done) throw new Error('smtp closed'); buf += dec.decode(value, { stream: true }); }
  }
  async function cmd(line, want) { if (line != null) await w.write(enc.encode(line + '\r\n')); const [c, t] = await reply(); if (!want.includes(c)) throw new Error('smtp ' + c + ' ' + t.slice(0, 120)); return c; }
  try {
    await cmd(null, [220]); await cmd('EHLO tangoweekend.org', [250]);
    await cmd('AUTH LOGIN', [334]); await cmd(btoa(user), [334]); await cmd(btoa(pass), [235]);
    await cmd(`MAIL FROM:<${user}>`, [250]); await cmd(`RCPT TO:<${to}>`, [250, 251]); await cmd('DATA', [354]);
    const plain = b64(text).replace(/.{76}/g, '$&\r\n');
    const bound = 'atm_' + crypto.randomUUID().replace(/-/g, '');
    const htmlPart = html ? [`--${bound}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(html).replace(/.{76}/g, '$&\r\n')].join('\r\n') + '\r\n' : '';
    const extra = headers ? Object.entries(headers).filter(([, v]) => v).map(([k, v]) => k + ': ' + v) : [];
    const msg = [`From: ${hdr(fromName)} <${user}>`, `To: <${to}>`, `Subject: ${hdr(subject)}`, `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@tangoweekend.org>`, ...extra, 'MIME-Version: 1.0',
      html ? `Content-Type: multipart/alternative; boundary="${bound}"` : 'Content-Type: text/plain; charset=UTF-8',
      html ? '' : 'Content-Transfer-Encoding: base64', '',
      html ? [`--${bound}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', plain, htmlPart + `--${bound}--`].join('\r\n') : plain,
      '.'].join('\r\n');
    await cmd(msg, [250]); await cmd('QUIT', [221]).catch(() => {});
  } finally { try { await sock.close(); } catch (e) {} }
}
