// Reach must not paint "no organizer email" while the answer is unknown.
// Local page only. No network. Run: node social-worker/test/star-reach-ui.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/tmp/node_modules/puppeteer-core');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const star = fs.readFileSync(path.join(root, 'asia/atm-star.js'));
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const events = [
  { id: 'PUB', kind: 'event', name: 'Public', name_zh: '公开', contacts: { email: 'public@example.com' } },
  { id: 'WAIT', kind: 'event', name: 'Wait', name_zh: '等待', contacts: {} },
  { id: 'NO', kind: 'event', name: 'None', name_zh: '没有', contacts: {} },
  { id: 'MISS', kind: 'event', name: 'Miss', name_zh: '缺失', contacts: {} },
  { id: 'B1', kind: 'event', name: 'B1', contacts: {} },
  { id: 'B2', kind: 'event', name: 'B2', contacts: {} },
  { id: 'B3', kind: 'event', name: 'B3', contacts: {} }
];
function page() {
  return `<!doctype html><html lang="zh-CN" data-asia-lang="zh"><body>
<script>
window.ATM_SOCIAL_API = 'https://api.example.test';
window.__reach = { mode: 'hold', n: 0, urls: [] };
window.fetch = (url, opt) => {
  const u = String(url);
  const json = (d, status) => Promise.resolve({ ok: !status || status < 400, status: status || 200, json: async () => d });
  if (u.includes('events.json')) return json(${JSON.stringify(events)});
  if (u.includes('/social/going/config')) return json({ sitekey: '' });
  if (u.includes('/social/going/reach')) {
    window.__reach.n++;
    window.__reach.urls.push(u);
    const mode = window.__reach.mode;
    if (mode === 'hold') return new Promise(() => {});
    if (mode === 'fail') return Promise.reject(new Error('net'));
    if (mode === 'http') return json({ error: 'lookup_failed' }, 503);
    if (mode === 'miss') return json({ reach: {} });
    if (mode === 'false') return json({ reach: { NO: false, WAIT: false } });
    if (mode === 'delay') return new Promise(res => setTimeout(() => res(json({ reach: { WAIT: true, NO: false } })), 400));
    if (mode === 'batch') return json({ reach: { B1: true, B2: false, B3: true } });
    if (mode === 'then-true') {
      window.__reach.mode = 'true';
      return Promise.reject(new Error('net'));
    }
    return json({ reach: { WAIT: true, NO: false, MISS: true, B1: true, B2: true, B3: true } });
  }
  if (opt && String(opt.method || '').toUpperCase() === 'POST') return json({ ok: true, mail: 'queued' });
  return Promise.reject(new Error('blocked ' + u));
};
</script><script src="/atm-star.js"></script></body></html>`;
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/atm-star.js')) { res.setHeader('content-type', 'text/javascript'); res.end(star); return; }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(page());
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
async function boot(mode) {
  const p = await browser.newPage();
  await p.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'networkidle0' });
  await p.waitForFunction(() => window.ATM_STAR && window._atmStarEvents);
  await p.evaluate(m => { window.__reach.mode = m; window.__reach.n = 0; window.__reach.urls = []; }, mode);
  return p;
}
function add(p, ids) {
  return p.evaluate(list => {
    list.forEach(id => {
      const b = document.createElement('button');
      b.className = 'atm-heart';
      b.setAttribute('data-fid', id);
      b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>';
      document.body.appendChild(b);
    });
    window.ATM_STAR.paint();
  }, ids);
}
function snap(p, id) {
  return p.$eval('[data-fid="' + id + '"]', b => ({
    off: b.classList.contains('atm-star-off'),
    wait: b.classList.contains('atm-star-wait'),
    label: b.getAttribute('aria-label'),
    disabled: b.getAttribute('aria-disabled')
  }));
}

const pending = await boot('delay');
await add(pending, ['PUB', 'WAIT']);
const during = await snap(pending, 'WAIT');
check('delayed true is not painted as no-email', !during.off && during.wait && during.label === '正在确认组织者邮箱' && during.disabled !== 'true');
const pub = await snap(pending, 'PUB');
check('public email stays a normal star and is not waiting', !pub.off && !pub.wait && pub.label === '活动意向');
await pending.waitForFunction(() => !document.querySelector('[data-fid="WAIT"]').classList.contains('atm-star-wait'));
const after = await snap(pending, 'WAIT');
check('true removes the waiting state and stays enabled', !after.off && !after.wait && after.label === '活动意向');
await pending.close();

const recovered = await boot('then-true');
await add(recovered, ['WAIT']);
await recovered.waitForFunction(() => window.__reach.n >= 2, { timeout: 5000 });
await recovered.waitForFunction(() => !document.querySelector('[data-fid="WAIT"]').classList.contains('atm-star-wait'));
const back = await snap(recovered, 'WAIT');
check('a network failure retries and then enables', !back.off && !back.wait && (await recovered.evaluate(() => window.__reach.n)) === 2);
await recovered.close();

const dead = await boot('fail');
await add(dead, ['WAIT']);
await dead.waitForFunction(() => window.__reach.n >= 3, { timeout: 8000 });
await new Promise(r => setTimeout(r, 400));
const stuck = await snap(dead, 'WAIT');
const deadN = await dead.evaluate(() => { window.ATM_STAR.paint(); window.ATM_STAR.paint(); return window.__reach.n; });
check('repeated failure is not stored as no-email and stops', !stuck.off && stuck.wait && stuck.label !== '组织者尚未提供邮箱' && deadN === 3);
await dead.close();

const httpFail = await boot('http');
await add(httpFail, ['WAIT']);
await httpFail.waitForFunction(() => window.__reach.n >= 1);
await new Promise(r => setTimeout(r, 200));
const httpSnap = await snap(httpFail, 'WAIT');
check('a failed response body is not stored as false', !httpSnap.off && httpSnap.label !== '组织者尚未提供邮箱');
await httpFail.close();

const missing = await boot('miss');
await add(missing, ['MISS']);
await missing.waitForFunction(() => window.__reach.n >= 2, { timeout: 5000 });
const missSnap = await snap(missing, 'MISS');
check('a missing id is not stored as false', !missSnap.off && missSnap.label !== '组织者尚未提供邮箱');
await missing.close();

const no = await boot('false');
await add(no, ['NO']);
await no.waitForFunction(() => document.querySelector('[data-fid="NO"]').classList.contains('atm-star-off'));
const noSnap = await snap(no, 'NO');
const opened = await no.evaluate(() => {
  const b = document.querySelector('[data-fid="NO"]');
  window.ATM_STAR.take(b);
  return !document.querySelector('#atm-star').hidden;
});
check('explicit false disables and does not open', noSnap.off && noSnap.label === '组织者尚未提供邮箱' && opened === false);
await no.close();

const batch = await boot('batch');
await add(batch, ['B1', 'B2', 'B3']);
await batch.waitForFunction(() => window.__reach.n === 1);
for (let i = 0; i < 8; i++) await batch.evaluate(() => window.ATM_STAR.paint());
const info = await batch.evaluate(() => ({ n: window.__reach.n, url: window.__reach.urls[0] }));
const b2 = await snap(batch, 'B2');
check('one batch request covers every id and extra paints do not repeat it', info.n === 1 && info.url.includes('B1') && info.url.includes('B2') && info.url.includes('B3') && b2.off);
await batch.close();

await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('star reach ui ok');
