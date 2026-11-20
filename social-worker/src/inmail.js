// 2026-11-20 (Shiao): huodong@tangoweekend.org — mail in activity info, the site updates itself.
// Cloudflare Email Routing sends mail for that address to this Worker (export `email` in live.js).
// 1. Only senders on the list in var ATM_MAIL_SENDERS ("addr=label,addr=label"; kept in the dashboard,
//    never in the public repo), and only when SPF/DKIM/DMARC passed. Anything else is dropped silently.
// 2. The mail is turned into data/inbox/<date>-mail-<id>.md (+ images / PDF), with every e-mail address
//    in the text hidden, and sent to GitHub as a PR from branch answer/mail-<id> (secret ATM_GITHUB_TOKEN).
//    inbox-guard.yml merges it and starts inbox.yml, the same path the answers always took.
// 3. A short "received" reply goes back to the sender (deliver(), SUB_MAIL).
// The raw mail (headers, addresses) is never stored.

const REPO = 'Shiao64/my1';
const MAX_RAW = 25 * 1024 * 1024, MAX_FILE = 10 * 1024 * 1024, MAX_FILES = 8;

export function parseSenders(s) {
  const out = {};
  for (const part of String(s || '').split(/[,;\n]/)) {
    const [a, ...rest] = part.split('='); const addr = (a || '').trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+$/.test(addr)) out[addr] = rest.join('=').trim() || addr.split('@')[0];
  }
  return out;
}

// ---------- MIME ----------
const td = (bytes, cs) => {
  cs = String(cs || 'utf-8').toLowerCase().replace(/^gb2312$|^gbk$/, 'gb18030');
  try { return new TextDecoder(cs).decode(bytes); } catch (e) { return new TextDecoder('utf-8').decode(bytes); }
};
const latin1 = s => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
function b64bytes(s) { const bin = atob(String(s).replace(/[^A-Za-z0-9+/=]/g, '')); return latin1(bin); }
function qpbytes(s, header) {
  if (header) s = s.replace(/_/g, ' ');
  s = s.replace(/=\r?\n/g, '');
  const out = []; for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else out.push(s.charCodeAt(i) & 255);
  }
  return new Uint8Array(out);
}
export function decodeWords(v) {
  return String(v || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (m, cs, e, t) => {
    try { return td(e.toUpperCase() === 'B' ? b64bytes(t) : qpbytes(t, true), cs); } catch (x) { return m; }
  });
}
function splitHead(s) {
  const i = s.search(/\r?\n\r?\n/); if (i < 0) return [s, ''];
  const m = s.slice(i).match(/^\r?\n\r?\n/); return [s.slice(0, i), s.slice(i + m[0].length)];
}
function headers(h) {
  const o = {}; for (const line of h.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const k = line.indexOf(':'); if (k < 1) continue; const n = line.slice(0, k).trim().toLowerCase();
    o[n] = o[n] ? o[n] + '\n' + line.slice(k + 1).trim() : line.slice(k + 1).trim();
  }
  return o;
}
function param(v, name) {
  const m = String(v || '').match(new RegExp('(?:^|;)\\s*' + name + '\\*?=\\s*("([^"]*)"|[^;\\s]+)', 'i'));
  if (!m) return '';
  let x = m[2] != null ? m[2] : m[1];
  const r = x.match(/^([^']*)'[^']*'(.*)$/); // RFC 2231: charset''%XX
  if (r) { try { return td(latin1(unescape(r[2])), r[1] || 'utf-8'); } catch (e) {} }
  return decodeWords(x);
}
// Walks a MIME message held as a latin1 "binary string" (one char per byte). Returns { texts:[{type,text}], files:[{name,type,bytes}] }.
export function parseMime(bin, out, depth) {
  out = out || { texts: [], files: [] }; depth = depth || 0;
  if (depth > 6) return out;
  const [hs, body] = splitHead(bin), h = headers(hs);
  const ct = h['content-type'] || 'text/plain', type = ct.split(';')[0].trim().toLowerCase();
  const cte = (h['content-transfer-encoding'] || '').trim().toLowerCase();
  if (type.startsWith('multipart/')) {
    const b = param(ct, 'boundary'); if (!b) return out;
    const parts = body.split(new RegExp('(?:^|\\r?\\n)--' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:--)?[ \\t]*(?=\\r?\\n|$)'));
    for (let i = 1; i < parts.length; i++) { const p = parts[i].replace(/^\r?\n/, ''); if (p.trim()) parseMime(p, out, depth + 1); }
    return out;
  }
  if (type === 'message/rfc822') return parseMime(body, out, depth + 1);
  const bytes = cte === 'base64' ? b64bytes(body) : cte === 'quoted-printable' ? qpbytes(body) : latin1(body);
  const disp = h['content-disposition'] || '', name = param(disp, 'filename') || param(ct, 'name');
  if ((type === 'text/plain' || type === 'text/html') && !/attachment/i.test(disp)) { out.texts.push({ type, text: td(bytes, param(ct, 'charset') || 'utf-8') }); return out; }
  if (/^image\/(jpe?g|png|webp|gif|heic)$/.test(type) || type === 'application/pdf' || /\.(jpe?g|png|webp|pdf)$/i.test(name)) out.files.push({ name: name || 'file', type, bytes });
  return out;
}
function htmlText(s) {
  return s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n));
}
export const hideEmails = s => String(s).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '（邮箱已隐藏）');

export function buildInbox(parsed, meta) {
  const t = parsed.texts.find(x => x.type === 'text/plain') || parsed.texts[0];
  let text = t ? (t.type === 'text/html' ? htmlText(t.text) : t.text) : '';
  text = hideEmails(text).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 20000);
  const files = parsed.files.filter(f => f.bytes.length <= MAX_FILE).slice(0, MAX_FILES).map((f, i) => {
    const ext = (/\.(jpe?g|png|webp|gif|heic|pdf)$/i.exec(f.name) || [])[1] || ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' }[f.type] || 'bin');
    return { path: `data/inbox/${meta.base}-${i + 1}.${ext.toLowerCase().replace('jpeg', 'jpg')}`, bytes: f.bytes, orig: hideEmails(f.name) };
  });
  const md = [
    `# 邮件：${hideEmails(meta.subject) || '（无主题）'}`, '',
    `- 来源：邮件，寄件人 ${meta.label}（活动来信名单）`,
    `- 收到时间：${meta.when}（北京时间）`,
    `- 主题：${hideEmails(meta.subject) || '（无主题）'}`,
    `- 附件：${files.length ? files.map(f => '`' + f.path.split('/').pop() + '`（原名 ' + f.orig + '）').join('、') : '无'}`,
    meta.organizer ? `- 寄件人是主办本人：这封信可以算「主办确认」（卡片 \`confirmed\` 写收到日期）` : `- 寄件人是 ATM 这边的人（转寄或整理的资料），不算主办确认`,
    '', '## 内容', '', text || (files.length ? '（没有文字，只有附件）' : '（信里没有文字）'), '',
    '---', '邮件里的邮箱地址都已隐藏。原始邮件没有存下来。', ''
  ].join('\n');
  return { md, files };
}

// ---------- GitHub ----------
async function gh(env, method, path, body) {
  const r = await fetch('https://api.github.com/repos/' + REPO + path, { method, headers: { Authorization: 'Bearer ' + env.ATM_GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'atm-inmail', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('github ' + method + ' ' + path + ' ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
async function pushPR(env, branch, md, mdPath, files, title, body) {
  const main = await gh(env, 'GET', '/git/ref/heads/main');
  await gh(env, 'POST', '/git/refs', { ref: 'refs/heads/' + branch, sha: main.object.sha });
  for (const f of files) await gh(env, 'PUT', '/contents/' + encodeURI(f.path), { message: 'mail attachment ' + f.path.split('/').pop(), content: b64(f.bytes), branch });
  await gh(env, 'PUT', '/contents/' + encodeURI(mdPath), { message: title, content: b64(new TextEncoder().encode(md)), branch });
  return gh(env, 'POST', '/pulls', { title, head: branch, base: 'main', body });
}

// ---------- entry ----------
export function authPassed(h) {
  const a = [h.get('authentication-results') || '', h.get('arc-authentication-results') || ''].join(' ').toLowerCase();
  return /dmarc=pass|dkim=pass|spf=pass/.test(a);
}
export function isAuto(h, subject) {
  const as = (h.get('auto-submitted') || '').toLowerCase();
  return (as && as !== 'no') || !!h.get('x-autoreply') || !!h.get('x-autorespond') || /^(自动回复|auto(matic)?[ -]?reply|out of office)/i.test(subject || '');
}
export async function inboundMail(message, env, ctx, deliverFn) {
  const senders = parseSenders(env.ATM_MAIL_SENDERS), from = String(message.from || '').toLowerCase();
  const label = senders[from];
  if (!label) { console.log('inmail: not on list, dropped'); return; }
  if (!authPassed(message.headers)) { console.log('inmail: auth not passed, dropped'); return; }
  if (message.rawSize > MAX_RAW) { console.log('inmail: too big'); return; }
  const subject = decodeWords(message.headers.get('subject') || '').trim();
  if (isAuto(message.headers, subject)) { console.log('inmail: auto reply, skipped'); return; }
  if (!env.ATM_GITHUB_TOKEN) { console.log('inmail: ATM_GITHUB_TOKEN missing'); return; }
  const buf = new Uint8Array(await new Response(message.raw).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const parsed = parseMime(bin);
  const now = new Date(Date.now() + 8 * 3600e3), iso = now.toISOString();
  const id = iso.slice(5, 10).replace('-', '') + '-' + iso.slice(11, 16).replace(':', '') + '-' + crypto.randomUUID().slice(0, 4);
  const base = iso.slice(0, 10) + '-mail-' + id;
  const organizer = !!(env.ATM_MAIL_ORGANIZERS && parseSenders(env.ATM_MAIL_ORGANIZERS)[from]);
  const { md, files } = buildInbox(parsed, { base, subject, label, when: iso.slice(0, 16).replace('T', ' '), organizer });
  const title = '邮件答复：' + (hideEmails(subject) || '（无主题）').slice(0, 60) + '（' + label + '）';
  let ok = true, err = '';
  try { await pushPR(env, 'answer/mail-' + iso.slice(0, 10) + '-' + id, md, 'data/inbox/' + base + '.md', files, title, label + ' 寄到 huodong@tangoweekend.org 的活动资料。自动处理中。'); }
  catch (e) { ok = false; err = String(e && e.message || e).slice(0, 200); console.log('inmail: github failed', err); }
  if (deliverFn) {
    const subj = (ok ? 'ATM 收到：' : 'ATM 没收进去：') + (subject || '（无主题）');
    const text = ok
      ? `${label}，你好！\n\n亚洲探戈地图收到你寄来的活动资料「${subject || '（无主题）'}」${files.length ? '，附件 ' + files.length + ' 个' : ''}。\n\n大约 10–20 分钟后会处理完。能直接上线的会自动更新网站；资料不全或有疑问的，会等 Shiao 确认。\n\n信里的邮箱地址不会公开。\n\n亚洲探戈地图 Asia Tango Map\nhttps://tangoweekend.org/zh/asia/`
      : `${label}，你好！\n\n你寄来的「${subject || '（无主题）'}」这次没能收进去，请稍后再寄一次，或直接告诉 Shiao。\n\n亚洲探戈地图`;
    try { await deliverFn(env, from, subj, text); } catch (e) { console.log('inmail: ack failed', String(e && e.message || e).slice(0, 160)); }
  }
}
