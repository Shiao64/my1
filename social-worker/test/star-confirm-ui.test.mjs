// After the confirm poll, the star button shows the recorded intent.
// Run: node social-worker/test/star-confirm-ui.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/tmp/node_modules/puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const star = fs.readFileSync(path.join(root, 'asia/atm-star.js'));
const sub = fs.readFileSync(path.join(root, 'asia/asia-subscribe.js'));
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const nonce = 'ab'.repeat(32);
const session = 'cd'.repeat(32);
const events = JSON.stringify([
  { id: 'R', kind: 'weekly', name: "Kai's Milonga", name_zh: "Kai's Milonga", contacts: { email: 'k@example.com' }, weekdays: [0, 1, 2, 3, 4, 5, 6], time: '20:30–24:00' }
]);
function page(lang) {
  const zh = lang !== 'en';
  return `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}" data-asia-lang="${zh ? 'zh' : 'en'}"><body>
<div id="filters"><div class="wrap"></div></div><div id="contact"></div>
<script>
window.TANGO_SUB_API = 'https://api.example.test';
window.ATM_SOCIAL_API = 'https://api.example.test';
window.__posts = [];
window.fetch = function (url, opt) {
  var u = String(url);
  var json = function (d, status) { return Promise.resolve({ ok: !status || status < 400, status: status || 200, json: async function () { return d; } }); };
  if (u.indexOf('events.json') >= 0) return json(${events});
  if (u.indexOf('/social/going/phone') >= 0) return json({ ok: true, register: true, mailed: false });
  if (u.indexOf('/social/going/await') >= 0) { window.__posts.push('await'); return json({ ok: true, confirmed: true, session: ${JSON.stringify(session)} }); }
  if (u.indexOf('/social/going/mine') >= 0) return json({ email: 'guest@example.com', name: 'Guest', city: 'Osaka', role: 'leader', items: [{ id: 'R', anchor: '', intent: 'going' }], favs: ['R'], drafts: [] });
  if (u.indexOf('/social/going/pass') >= 0) return json({ active: false });
  if (u.indexOf('/reach') >= 0) return json({ reach: {} });
  if (u.indexOf('/config') >= 0) return json({});
  if (opt && String(opt.method).toUpperCase() === 'POST' && u.indexOf('/social/going') >= 0) {
    window.__posts.push(JSON.parse(opt.body));
    return json({ ok: true, confirm: true, mailed: false, nonce: ${JSON.stringify(nonce)} });
  }
  return json({});
};
</script>
<script src="/asia-subscribe.js"></script>
<script src="/atm-star.js"></script>
<button class="atm-heart" data-fid="R"><svg viewBox="0 0 24 24"><path/></svg></button>
</body></html>`;
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/atm-star.js')) { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(star); return; }
  if (req.url.startsWith('/asia-subscribe.js')) { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(sub); return; }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(page(req.url.includes('/en') ? 'en' : 'zh'));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
async function run(lang, label) {
  const p = await browser.newPage();
  await p.goto('http://127.0.0.1:' + port + '/' + lang, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.ATM_STAR && window.ATM_CLAIM);
  await p.evaluate(() => window.ATM_STAR.openIntent('R', 'going'));
  await p.waitForSelector('#asg-go');
  await p.evaluate(() => {
    document.querySelector('#asg-email').value = 'guest@example.com';
    document.querySelector('#asg-last4').value = '1111';
    document.querySelector('#asg-go').click();
  });
  await p.waitForSelector('#asg-name');
  await p.evaluate(() => {
    document.querySelector('#asg-name').value = 'Guest';
    document.querySelector('#asg-city').value = 'Osaka';
    document.querySelector('#asg-role').value = 'leader';
    document.querySelector('#asg-go').click();
  });
  await p.waitForFunction((text) => {
    const go = document.querySelector('#asg-go');
    return go && go.textContent === text && go.disabled === true;
  }, {}, label);
  const state = await p.evaluate(() => ({
    go: document.querySelector('#asg-go').textContent,
    note: (document.querySelector('#asg-mailnote') || {}).textContent || '',
    spam: (document.querySelector('#asg-spam') || {}).textContent || '',
    body: document.body.innerText,
    intent: (window.__posts.find(function (x) { return x && x.intent; }) || {}).intent,
    awaited: window.__posts.indexOf('await') >= 0,
    session: localStorage.getItem('atm_session')
  }));
  check(lang + ' star button shows the recorded intent', state.go === label && state.note === label && state.spam === label && state.intent === 'going' && state.awaited && state.session === session && state.body.indexOf('回到本页') < 0 && state.body.indexOf('come back and tap Confirm') < 0 && state.body.indexOf('Tap Confirm to save') < 0);
  await p.close();
}
await run('zh', '已确认 · 我要去');
await run('en', 'Confirmed · I\u2019m going');
await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('star confirm ui ok');
