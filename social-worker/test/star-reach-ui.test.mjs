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
const reachN = await pending.evaluate(() => window.__reach.n);
check('painting a star does not ask the network and uses the save label', reachN === 0 && !during.off && !during.wait && during.label === '收藏' && during.disabled !== 'true');
const pub = await snap(pending, 'PUB');
check('a card with an organizer email uses the same save label', !pub.off && !pub.wait && pub.label === '收藏');
const toggled = await pending.evaluate(() => {
  const b = document.querySelector('[data-fid="WAIT"]');
  const before = window.__reach.n;
  window.ATM_STAR.take(b);
  const bar = document.getElementById('atm-savebar');
  return {
    dialog: !document.querySelector('#atm-star').hidden,
    pressed: b.getAttribute('aria-pressed'),
    label: b.getAttribute('aria-label'),
    text: bar ? bar.textContent : '',
    n: window.__reach.n - before,
    saved: JSON.parse(localStorage.getItem('atm_fav_v1') || '[]').indexOf('WAIT') >= 0
  };
});
check('an anonymous star asks for email and does not save yet', toggled.dialog === true && toggled.pressed !== 'true' && toggled.saved === false && toggled.n === 0);
await pending.close();

const no = await boot('false');
await add(no, ['NO', 'PUB']);
const blocked = await no.evaluate(async () => {
  window.ATM_STAR.openIntent('NO', 'going');
  await new Promise(r => setTimeout(r, 300));
  const bar = document.getElementById('atm-savebar');
  return { dialog: !document.querySelector('#atm-star').hidden, text: bar ? bar.textContent : '' };
});
check('Going stays closed when the organizer cannot be reached', blocked.dialog === false);
const opened = await no.evaluate(async () => {
  window.ATM_STAR.openIntent('PUB');
  await new Promise(r => setTimeout(r, 50));
  const pressed = document.querySelector('[data-intent][aria-pressed="true"]');
  return { dialog: !document.querySelector('#atm-star').hidden, pressed: pressed ? pressed.textContent : '', absent: !!document.querySelector('[data-intent="absent"]'), interested: !!document.querySelector('[data-intent="interested"]') };
});
check('the sheet offers only I am going', opened.dialog === true && opened.pressed === '我要去' && opened.absent === false && opened.interested === false);
await no.close();

await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('star reach ui ok');
