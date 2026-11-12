// Saved toasts and the Confirm button. Local mock only. No network and no mail.
// Run: node social-worker/test/going-toast-ui.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/tmp/node_modules/puppeteer-core');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const star = fs.readFileSync(path.join(root, 'asia/atm-star.js'));
const mailSent = fs.readFileSync(path.join(root, 'asia/atm-mail-sent.js'));
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const events = JSON.stringify([
  { id: 'R', kind: 'weekly', name: 'Friday', name_zh: '周五', contacts: { email: 'org@example.com' }, weekdays: [0, 1, 2, 3, 4, 5, 6], time: '20:30–24:00' }
]);
function page(lang) {
  const zh = lang !== 'en';
  return `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}" data-asia-lang="${zh ? 'zh' : 'en'}"><body>
<script>
window.ATM_SOCIAL_API='https://api.example.test';
window.__mode={ok:true,mail:'queued',notice:'off'};
window.fetch=function(url,opt){
  var u=String(url);
  var json=function(d,status){return Promise.resolve({ok:!status||status<400,status:status||200,json:async function(){return d;}})};
  if(u.indexOf('events.json')>=0)return json(${events});
  if(u.indexOf('/mine')>=0)return json({email:'shiao@example.com',name:'Shiao',city:'Shanghai',role:'leader',items:[],favs:[],drafts:[],sitewide:false});
  if(u.indexOf('/reach')>=0)return json({reach:{R:true}});
  if(opt&&String(opt.method).toUpperCase()==='POST')return json(window.__mode, window.__mode._s||200);
  return json({});
};
</script><script src="/atm-mail-sent.js"></script><script src="/atm-star.js"></script>
<button class="atm-heart" data-fid="R"><svg viewBox="0 0 24 24"><path/></svg></button>
</body></html>`;
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/atm-mail-sent.js')) { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(mailSent); return; }
  if (req.url.startsWith('/atm-star.js')) { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(star); return; }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(page(req.url.includes('/en') ? 'en' : 'zh'));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/local/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
async function open(lang) {
  const p = await browser.newPage();
  await p.goto('http://127.0.0.1:' + port + '/' + lang, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.setItem('atm_session', 'ab'.repeat(32)); sessionStorage.clear(); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.ATM_STAR);
  return p;
}
async function confirm(p, mode) {
  await p.evaluate((m) => { window.__mode = m; }, mode);
  await p.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
  await p.waitForSelector('#asg-go');
  const before = await p.evaluate(() => document.querySelector('#asg-go').disabled);
  await p.click('#asg-go');
  await p.waitForFunction(() => document.querySelector('#atm-star').hidden && document.getElementById('atm-savebar'));
  const toast = await p.evaluate(() => document.getElementById('atm-savebar').textContent);
  await p.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
  await p.waitForSelector('#asg-go');
  const again = await p.evaluate(() => ({ disabled: document.querySelector('#asg-go').disabled, busy: document.querySelector('#asg-go').getAttribute('aria-busy') }));
  return { before, toast, again };
}
const zh = await open('zh');
const saved = await confirm(zh, { ok: true, mail: 'queued', notice: 'off' });
check('send off says only saved and Confirm opens again', saved.before === false && saved.toast === '已保存' && saved.again.disabled === false && saved.again.busy === 'false' && !saved.toast.includes('通知') && !saved.toast.includes('主办'));
const sent = await confirm(zh, { ok: true, mail: 'sent', notice: 'sent', mailed: true });
check('a letter that will go out says the organizer will be notified', sent.toast === '已保存，主办方会收到通知' && sent.again.disabled === false);
const missing = await confirm(zh, { ok: true, mail: 'no_organizer', notice: 'missing' });
check('a missing organizer email is not called a send failure', missing.toast === '已保存，未找到主办方邮箱' && !missing.toast.includes('失败') && missing.again.disabled === false);
const failed = await confirm(zh, { ok: true, mail: 'failed', notice: 'failed', wait: 7200 });
check('a real send failure tells how long and does not lock Confirm', failed.toast === '已保存，通知邮件未能发出。请 2 小时后再试。' && failed.again.disabled === false && failed.again.busy === 'false');
await zh.close();

const en = await open('en');
const enSaved = await confirm(en, { ok: true, mail: 'rate_limited', notice: 'off' });
check('english send off stays Saved even if an old rate limit is echoed', enSaved.toast === 'Saved' && !enSaved.toast.includes('fail') && enSaved.again.disabled === false);
const enSent = await confirm(en, { ok: true, mail: 'sent', notice: 'sent' });
check('english notify toast', enSent.toast === 'Saved. The organizer will be notified.');
const enMissing = await confirm(en, { ok: true, mail: 'no_organizer', notice: 'missing' });
check('english missing email toast', enMissing.toast === 'Saved. The organizer email was not found.');
const enFail = await confirm(en, { ok: true, mail: 'failed', notice: 'failed' });
check('english send failure without a wait', enFail.toast === 'Saved. The notification failed to send.' && enFail.again.disabled === false);
await en.close();
await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going toast ui ok');
