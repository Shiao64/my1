// Gmail SMTP sender over Cloudflare Workers TCP sockets (smtp.gmail.com:465, implicit TLS, AUTH PLAIN).
// Secret: GMAIL_APP_PASSWORD (wrangler secret put GMAIL_APP_PASSWORD). User: env.GMAIL_USER || selecttango@gmail.com.
import { connect } from 'cloudflare:sockets';
import { buildMime, b64utf8 } from './mime.js';

export async function sendGmail(env, { to, subject, text, html, headers }) {
  const user = env.GMAIL_USER || 'selecttango@gmail.com';
  if (!env.GMAIL_APP_PASSWORD) throw new Error('GMAIL_APP_PASSWORD secret not set');
  const raw = buildMime({ fromName: env.SENDER_NAME || 'Asia Tango Map', fromEmail: user, to, subject, text, html, headers });
  const sock = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on', allowHalfOpen: false });
  const w = sock.writable.getWriter(), r = sock.readable.getReader(), dec = new TextDecoder(), te = new TextEncoder();
  let buf = '';
  const reply = async () => { // read one full (possibly multi-line) SMTP reply
    for (;;) {
      const m = buf.match(/^(?:\d{3}-[^\n]*\n)*(\d{3}) [^\n]*\n/);
      if (m) { buf = buf.slice(m[0].length); return { code: +m[1], text: m[0] }; }
      const { value, done } = await r.read(); if (done) throw new Error('smtp closed');
      buf += dec.decode(value, { stream: true });
    }
  };
  const cmd = async (line, want) => {
    if (line != null) await w.write(te.encode(line + '\r\n'));
    const x = await reply();
    if (x.code !== want) throw new Error(`smtp ${x.code} after ${line ? line.split(' ')[0] : 'greeting'}`);
    return x;
  };
  try {
    await cmd(null, 220);
    await cmd('EHLO tangoweekend.org', 250);
    await cmd('AUTH PLAIN ' + b64utf8(`\0${user}\0${env.GMAIL_APP_PASSWORD}`), 235);
    await cmd(`MAIL FROM:<${user}>`, 250);
    await cmd(`RCPT TO:<${to}>`, 250);
    await cmd('DATA', 354);
    const body = raw.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..'); // dot-stuffing
    await cmd(body + '\r\n.', 250);
    await w.write(te.encode('QUIT\r\n')).catch(() => {});
  } finally { try { await sock.close(); } catch {} }
}
