// After the confirm poll, 「已确认」 stays visible. open() used to hide it.
// Run: node social-worker/test/confirm-hint-ui.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/tmp/node_modules/puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const sub = fs.readFileSync(path.join(root, 'asia/asia-subscribe.js'));
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const nonce = 'ab'.repeat(32);
const session = 'cd'.repeat(32);
function page(lang) {
  const zh = lang !== 'en';
  return `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}" data-asia-lang="${zh ? 'zh' : 'en'}"><body>
<div id="filters"><div class="wrap"></div></div>
<div id="contact"></div>
<script>
window.__posts = [];
window.fetch = function (url, opt) {
  var u = String(url);
  var json = function (d) { return Promise.resolve({ ok: true, status: 200, json: async function () { return d; } }); };
  if (u.indexOf('/social/profile') >= 0) { window.__posts.push('profile'); return json({ ok: true, confirm: true, nonce: ${JSON.stringify(nonce)} }); }
  if (u.indexOf('/social/going/await') >= 0) { window.__posts.push('await'); return json({ ok: true, confirmed: true, session: ${JSON.stringify(session)} }); }
  if (u.indexOf('/social/going/mine') >= 0) return json({ email: 'ada@example.com', name: ${JSON.stringify(zh ? '安' : 'Ada')}, city: ${JSON.stringify(zh ? '上海' : 'Shanghai')}, role: 'leader', phone_tail: '1234', sitewide: false });
  if (u.indexOf('/social/going/pass') >= 0) return json({ active: false });
  return json({});
};
</script>
<script src="/asia-subscribe.js"></script>
</body></html>`;
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/asia-subscribe.js')) { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(sub); return; }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(page(req.url.includes('/en') ? 'en' : 'zh'));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
async function run(lang, word) {
  const p = await browser.newPage();
  await p.goto('http://127.0.0.1:' + port + '/' + lang, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#tsub-open');
  await p.evaluate(() => {
    document.getElementById('tsub-open').click();
    document.getElementById('tsub-reg').hidden = false;
    document.getElementById('tsub-phone-go').hidden = true;
    var ts = document.querySelector('#tsub-f .tsub-ts');
    ts.hidden = false;
    ts.innerHTML = '<input name="cf-turnstile-response" value="ok">';
    document.getElementById('tsub-e').value = 'ada@example.com';
    document.getElementById('tsub-last4').value = '1234';
    document.getElementById('tsub-n').value = document.documentElement.getAttribute('data-asia-lang') === 'zh' ? '安' : 'Ada';
    document.getElementById('tsub-c').value = document.documentElement.getAttribute('data-asia-lang') === 'zh' ? '上海' : 'Shanghai';
    document.getElementById('tsub-r').value = 'leader';
    document.getElementById('tsub-f').requestSubmit();
  });
  await p.waitForFunction((text) => {
    const ok = document.getElementById('tsub-ok');
    const email = document.getElementById('tsub-e');
    return ok && ok.hidden === false && ok.textContent === text && email && email.value === 'ada@example.com' && document.getElementById('tsub-modal').hidden === false;
  }, {}, word);
  const state = await p.evaluate(() => ({
    text: document.getElementById('tsub-ok').textContent,
    hidden: document.getElementById('tsub-ok').hidden,
    modal: document.getElementById('tsub-modal').hidden,
    session: localStorage.getItem('atm_session'),
    posts: window.__posts.slice()
  }));
  check(lang + ' confirmed hint stays visible after open()', state.text === word && state.hidden === false && state.modal === false && state.session === session && state.posts.indexOf('await') >= 0 && state.posts.indexOf('profile') >= 0);
  await p.close();
}
await run('zh', '已确认');
await run('en', 'Confirmed');
await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('confirm hint ui ok');
