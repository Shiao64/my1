// huodong@ mail intake: list check, auth check, MIME parse, privacy, GitHub PR, ack.
import assert from 'node:assert/strict';
import { inboundMail, parseMime, decodeWords, parseSenders, hideEmails, cardOrganizers, whoIs, _resetCardCache } from '../src/inmail.js';

let fails = 0;
async function t(name, fn) { try { await fn(); console.log('ok', name); } catch (e) { fails++; console.log('FAIL', name, e.message); } }

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
const raw = (from, auth, extra = '') => [
  `From: Liu <${from}>`, 'To: huodong@tangoweekend.org',
  'Subject: =?UTF-8?B?' + Buffer.from('新活动：周六 Milonga').toString('base64') + '?=',
  `Authentication-Results: mx.cloudflare.net; dkim=${auth}; spf=${auth}; dmarc=${auth}`, extra || null,
  'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="b1"', '', '--b1',
  'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: quoted-printable', '',
  '11/29 =E5=91=A8=E5=85=AD 20:00 =E4=B8=8A=E6=B5=B7 =E8=81=94=E7=B3=BB someone@example.com', '', '--b1',
  'Content-Type: image/png; name="=?UTF-8?B?' + Buffer.from('海报.png').toString('base64') + '?="', 'Content-Disposition: attachment; filename*=UTF-8\'\'%E6%B5%B7%E6%8A%A5.png', 'Content-Transfer-Encoding: base64', '',
  png, '--b1--', ''
].filter(x => x !== null).join('\r\n');

function msg(from, auth, extra) {
  const s = raw(from, auth, extra); const bytes = new TextEncoder().encode(s);
  const hs = s.split('\r\n\r\n')[0].split('\r\n');
  const h = new Map(); for (const l of hs) { const i = l.indexOf(':'); if (i > 0) h.set(l.slice(0, i).toLowerCase(), l.slice(i + 1).trim()); }
  return { from, rawSize: bytes.length, raw: new Blob([bytes]).stream(), headers: { get: k => h.get(k.toLowerCase()) || null } };
}
const CARDS = [
  { id: 'R1', country: 'China', organizers: ['阿明'], contacts: { email: 'org@qq.com' } },
  { id: 'R2', country: 'China', organizers: ['阿明'], contacts: { email: 'ORG@qq.com' } },
  { id: 'R3', country: 'Hong Kong', organizers: ['Eli'], contacts: { email: 'eli@x.dance' } },
  { id: 'R4', country: 'Japan', organizers: ['Taro'], contacts: { email: 'taro@x.jp' } },
  { id: 'R5', country: 'China', hidden: true, organizers: ['隐'], contacts: { email: 'hid@qq.com' } },
  { id: 'R6', country: 'China', organizers: ['坏'], contacts: { email: 'bad@qq.com' } }
];
function fakeGitHub() {
  const calls = []; _resetCardCache();
  globalThis.fetch = async (url, o) => {
    o = o || {};
    if (/events-core\.json/.test(url)) return new Response(JSON.stringify(CARDS), { status: 200 });
    calls.push({ url, method: o.method, body: o.body ? JSON.parse(o.body) : null });
    const body = url.endsWith('/git/ref/heads/main') ? { object: { sha: 'abc' } } : { number: 7 };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return calls;
}
const env = { ATM_MAIL_SENDERS: '792352533@qq.com=刘峥, x@y.com', ATM_GITHUB_TOKEN: 't' };

await t('parseSenders', () => { assert.deepEqual(parseSenders(env.ATM_MAIL_SENDERS), { '792352533@qq.com': '刘峥', 'x@y.com': 'x' }); });
await t('decodeWords gb2312', () => { assert.equal(decodeWords('=?GB2312?B?u+62rw==?='), '活动'); });
await t('hideEmails', () => { assert.equal(hideEmails('a b.c@d.com z'), 'a （邮箱已隐藏） z'); });

await t('allowed sender -> branch, files, PR, ack', async () => {
  const calls = fakeGitHub(); const acks = [];
  await inboundMail(msg('792352533@qq.com', 'pass'), env, {}, async (e, to, s, x) => acks.push({ to, s, x }));
  const puts = calls.filter(c => c.method === 'PUT');
  assert.equal(calls.filter(c => c.method === 'POST' && c.url.endsWith('/git/refs')).length, 1);
  assert.match(calls.find(c => c.url.endsWith('/git/refs')).body.ref, /^refs\/heads\/answer\/mail-/);
  assert.equal(puts.length, 2);
  assert.match(puts[0].url, /data\/inbox\/\d{4}-\d\d-\d\d-mail-.*-1\.png$/);
  const md = Buffer.from(puts[1].body.content, 'base64').toString('utf8');
  assert.match(md, /新活动：周六 Milonga/); assert.match(md, /11\/29 周六 20:00 上海/); assert.match(md, /刘峥/);
  assert.match(md, /海报\.png/);
  assert.ok(!/@/.test(md.replace('huodong@tangoweekend.org', '')), 'no address left in md');
  assert.ok(!/792352533/.test(md));
  assert.ok(calls.some(c => c.url.endsWith('/pulls')));
  assert.equal(acks.length, 1); assert.equal(acks[0].to, '792352533@qq.com'); assert.match(acks[0].s, /^ATM 收到/);
});
await t('not on list -> nothing', async () => {
  const calls = fakeGitHub(); const acks = [];
  await inboundMail(msg('stranger@qq.com', 'pass'), env, {}, async () => acks.push(1));
  assert.equal(calls.length, 0); assert.equal(acks.length, 0);
});
await t('forged (auth fail) -> nothing', async () => {
  const calls = fakeGitHub(); const acks = [];
  await inboundMail(msg('792352533@qq.com', 'fail'), env, {}, async () => acks.push(1));
  assert.equal(calls.length, 0); assert.equal(acks.length, 0);
});
await t('auto reply -> nothing', async () => {
  const calls = fakeGitHub();
  await inboundMail(msg('792352533@qq.com', 'pass', 'Auto-Submitted: auto-replied'), env, {}, async () => {});
  assert.equal(calls.length, 0);
});
await t('github fails -> "没收进去" ack', async () => {
  _resetCardCache(); globalThis.fetch = async (u) => /events-core/.test(u) ? new Response('[]') : new Response('no', { status: 401 }); const acks = [];
  await inboundMail(msg('792352533@qq.com', 'pass'), env, {}, async (e, to, s) => acks.push(s));
  assert.match(acks[0], /^ATM 没收进去/);
});
await t('parseMime html only', () => {
  const p = parseMime('Content-Type: text/html; charset=utf-8\r\n\r\n<p>你好<br>世界</p>');
  assert.equal(p.texts[0].type, 'text/html');
});

await t('cardOrganizers: zh regions only, hidden skipped, cards grouped', () => {
  const m = cardOrganizers(CARDS);
  assert.deepEqual(m['org@qq.com'], { label: '阿明', cards: ['R1', 'R2'] });
  assert.ok(m['eli@x.dance']); assert.ok(!m['taro@x.jp']); assert.ok(!m['hid@qq.com']);
});
await t('card organizer may mail, counts as confirmation for own cards', async () => {
  const calls = fakeGitHub(); const acks = [];
  await inboundMail(msg('org@qq.com', 'pass'), { ATM_GITHUB_TOKEN: 't' }, {}, async (e, to, s, x) => acks.push(x));
  const md = Buffer.from(calls.filter(c => c.method === 'PUT').pop().body.content, 'base64').toString('utf8');
  assert.match(md, /阿明/); assert.match(md, /主办本人/); assert.match(md, /R1、R2/);
  assert.match(acks[0], /^阿明，你好/);
});
await t('extra list (not on cards) may mail, not a confirmation', async () => {
  fakeGitHub();
  const w = await whoIs({ ATM_MAIL_SENDERS: 'me@x.com=Shiao' }, 'me@x.com');
  assert.deepEqual(w, { label: 'Shiao', organizer: false, cards: [] });
});
await t('block list wins; japan card not allowed', async () => {
  fakeGitHub();
  assert.equal(await whoIs({ ATM_MAIL_BLOCK: 'bad@qq.com' }, 'bad@qq.com'), null);
  assert.equal(await whoIs({}, 'taro@x.jp'), null);
  assert.ok(await whoIs({}, 'eli@x.dance'));
  assert.equal(await whoIs({ ATM_MAIL_NAMES: 'nobody@x.com=N' }, 'nobody@x.com'), null);
  assert.equal((await whoIs({ ATM_MAIL_NAMES: 'org@qq.com=明哥' }, 'org@qq.com')).label, '明哥');
});
await t('data site down -> github copy used', async () => {
  _resetCardCache(); const seen = [];
  globalThis.fetch = async (u) => { seen.push(u.split('/')[2]); return /data\.tangoweekend/.test(u) ? new Response('x', { status: 503 }) : new Response(JSON.stringify(CARDS)); };
  assert.ok(await whoIs({}, 'org@qq.com')); assert.deepEqual(seen, ['data.tangoweekend.org', 'raw.githubusercontent.com']);
});

console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0);
