// Intent dialog no longer mounts a human check. Local mock only.
// Run: node social-worker/test/star-turnstile-ui.test.mjs
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
const events = JSON.stringify([
  { id: 'R', kind: 'weekly', name: "Kai's Milonga", name_zh: "Kai's Milonga", contacts: { email: 'k@example.com' }, weekdays: [0, 1, 2, 3, 4, 5, 6], time: '20:30–24:00' }
]);
function page(lang) {
  const zh = lang !== 'en';
  return `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}" data-asia-lang="${zh ? 'zh' : 'en'}"><body>
<script>
window.ATM_SOCIAL_API='https://api.example.test';
window.__posts=[];
window.__renders=0;
window.__mode='ok';
window.turnstile={render:function(){window.__renders++;return 'w';},reset:function(){window.__renders++;},remove:function(){}};
window.fetch=function(url,opt){
  var u=String(url);
  var json=function(d,status){return Promise.resolve({ok:!status||status<400,status:status||200,json:async function(){return d;}})};
  if(u.indexOf('events.json')>=0)return json(${events});
  if(u.indexOf('/mine')>=0)return json({items:[],favs:[],drafts:[]});
  if(u.indexOf('/reach')>=0)return json({reach:{}});
  if(u.indexOf('/config')>=0)return json({sitekey:'0xTEST'});
  if(opt&&String(opt.method).toUpperCase()==='POST'){
    var body=JSON.parse(opt.body);
    window.__posts.push(body);
    if(window.__mode==='limited')return json({error:'rate_limited'},429);
    if(body.intent==='absent')return json({ok:true,mail:'withheld'});
    return json({ok:true,confirm:true});
  }
  return Promise.reject(new Error(u));
};
</script><script src="/atm-star.js"></script>
<button class="atm-heart" data-fid="R"><svg viewBox="0 0 24 24"><path/></svg></button>
</body></html>`;
}
const server = http.createServer((req, res) => {
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
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.ATM_STAR);
  await p.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
  await p.waitForSelector('#asg-go');
  return p;
}
function fields() {
  const note = document.querySelector('#asg-notify');
  const email = document.querySelector('#asg-email');
  const date = document.querySelector('#asg-date');
  return {
    pressed: document.querySelector('[data-intent][aria-pressed="true"]').textContent,
    widget: document.querySelectorAll('.asg-ts').length,
    renders: window.__renders,
    note: note.checked,
    noteOff: note.disabled,
    emailOff: email.disabled,
    dateOff: date.disabled,
    hidden: document.querySelector('#atm-star').hidden
  };
}
const zh = await open('zh');
const opened = await zh.evaluate(fields);
check('chinese going opens without a human check', opened.pressed === '要参加' && opened.widget === 0 && opened.renders === 0 && opened.note === true && opened.dateOff === false && opened.hidden === false);
await zh.evaluate(() => { document.querySelector('[data-intent="absent"]').click(); });
const away = await zh.evaluate(fields);
check('not going stays open with mail fields locked', away.pressed === '去不了' && away.note === false && away.noteOff === true && away.emailOff === true && away.dateOff === true && away.hidden === false && away.widget === 0);
await zh.click('#asg-go');
await zh.waitForFunction(() => document.querySelector('#atm-star').hidden);
check('unverified not going closes locally and does not post', await zh.evaluate(() => window.__posts.length === 0 && document.querySelector('#atm-star').hidden === true));
await zh.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
await zh.waitForSelector('#asg-go');
await zh.evaluate(() => {
  document.querySelector('[data-intent="going"]').click();
  document.querySelector('#asg-email').value = 'guest@example.com';
  document.querySelector('#asg-name').value = 'Guest';
  document.querySelector('#asg-city').value = 'Osaka';
  document.querySelector('#asg-phone').value = ['138', '0000', '1111'].join('');
  document.querySelector('#asg-role').value = 'leader';
  document.querySelector('#asg-go').click();
});
await zh.waitForFunction(() => window.__posts.length === 1);
const posted = await zh.evaluate(() => ({ body: window.__posts[0], go: document.querySelector('#asg-go').textContent, off: document.querySelector('#asg-go').disabled, hidden: document.querySelector('#atm-star').hidden, promo: document.querySelector('#asg-promo').checked }));
check('confirm posts once and keeps the button disabled', posted.body.intent === 'going' && posted.body.email === 'guest@example.com' && posted.body.name === 'Guest' && posted.body.city === 'Osaka' && posted.body.role === 'leader' && posted.body.alert === 1 && posted.promo === true && posted.go === '已发送邮件，请到邮箱确认' && posted.off === true && posted.hidden === false);
await zh.evaluate(() => document.querySelector('#asg-go').click());
check('a second tap in the same dialog does not send', await zh.evaluate(() => window.__posts.length === 1));
await zh.click('[data-x]');
await zh.waitForFunction(() => document.querySelector('#atm-star').hidden);
await zh.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
await zh.waitForSelector('#asg-go');
await zh.evaluate(() => document.querySelector('[data-intent="going"]').click());
await zh.waitForSelector('#asg-resend');
check('reopen within a minute stays grey and shows the spam reminder', await zh.evaluate(() => document.querySelector('#asg-go').disabled === true && document.querySelector('#asg-go').textContent.indexOf('秒后可重发') >= 0 && document.querySelector('#asg-resend').textContent === '请先检查垃圾邮件；1 分钟后可重发一次' && window.__posts.length === 1));
await zh.evaluate(() => document.querySelector('#asg-go').click());
check('the waiting button does not post', await zh.evaluate(() => window.__posts.length === 1));
await zh.evaluate(() => {
  var raw = JSON.parse(sessionStorage.getItem('atm_mail_hold_v1'));
  Object.keys(raw).forEach(function (k) { raw[k].at = Date.now() - 61000; });
  sessionStorage.setItem('atm_mail_hold_v1', JSON.stringify(raw));
});
await zh.click('[data-x]');
await zh.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
await zh.waitForSelector('#asg-go');
await zh.evaluate(() => document.querySelector('[data-intent="going"]').click());
await zh.waitForFunction(() => document.querySelector('#asg-go').disabled === false && document.querySelector('#asg-go').textContent === '确认');
check('after one minute the same show can be resent once', await zh.evaluate(() => document.querySelector('#asg-resend').textContent === '请先检查垃圾邮件；1 分钟后可重发一次' && document.querySelector('#asg-go').textContent === '确认'));
await zh.evaluate(() => {
  document.querySelector('#asg-name').value = 'Guest';
  document.querySelector('#asg-city').value = 'Osaka';
  document.querySelector('#asg-phone').value = ['138', '0000', '1111'].join('');
  document.querySelector('#asg-role').value = 'leader';
});
await zh.click('#asg-go');
await zh.waitForFunction(() => window.__posts.length === 2);
check('the resend locks the button again', await zh.evaluate(() => document.querySelector('#asg-go').disabled === true && document.querySelector('#asg-go').textContent === '已发送邮件，请到邮箱确认'));
await zh.click('[data-x]');
await zh.evaluate(() => window.ATM_STAR.take(document.querySelector('[data-fid="R"]')));
await zh.waitForSelector('#asg-go');
await zh.evaluate(() => document.querySelector('[data-intent="going"]').click());
await zh.waitForFunction(() => document.querySelector('#asg-go').textContent.indexOf('已重发过') === 0);
check('a third open says the resend was used', await zh.evaluate(() => document.querySelector('#asg-go').disabled === true && window.__posts.length === 2));
await zh.close();

const en = await open('en');
await en.evaluate(() => {
  window.__mode = 'limited';
  document.querySelector('#asg-email').value = 'guest@example.com';
  document.querySelector('#asg-name').value = 'Guest';
  document.querySelector('#asg-city').value = 'Osaka';
  document.querySelector('#asg-phone').value = ['138', '0000', '1111'].join('');
  document.querySelector('#asg-role').value = 'leader';
  document.querySelector('#asg-go').click();
});
await en.waitForFunction(() => (document.querySelector('#asg-err') || {}).textContent);
check('english limit copy is explicit and the widget stays absent', await en.evaluate(() => document.querySelector('#asg-err').textContent === 'Too many confirmation emails. Please try again later.' && document.querySelector('#asg-go').disabled === false && document.querySelector('#asg-go').textContent === 'Confirm' && document.querySelectorAll('.asg-ts').length === 0 && window.__renders === 0 && document.querySelector('#atm-star').hidden === false && !('ts' in window.__posts[0])));
await en.close();
const enSent = await open('en');
await enSent.evaluate(() => {
  document.querySelector('#asg-email').value = 'guest@example.com';
  document.querySelector('#asg-name').value = 'Guest';
  document.querySelector('#asg-city').value = 'Osaka';
  document.querySelector('#asg-phone').value = ['138', '0000', '1111'].join('');
  document.querySelector('#asg-role').value = 'leader';
  document.querySelector('#asg-go').click();
});
await enSent.waitForFunction(() => window.__posts.length === 1);
check('english sent label stays disabled', await enSent.evaluate(() => document.querySelector('#asg-go').textContent === 'Email sent — please confirm in your inbox' && document.querySelector('#asg-go').disabled === true && window.__posts.length === 1));
await enSent.evaluate(() => document.querySelector('#asg-go').click());
check('english second tap does not send', await enSent.evaluate(() => window.__posts.length === 1));
await enSent.close();
await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('star turnstile ui ok');
