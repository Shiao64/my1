// Mobile screens of the subscribe-once flow. Local pages and mocked APIs only.
// Run: node social-worker/test/going-resume-ui.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/tmp/node_modules/puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const shotDir = '/tmp/atm-1199';
const outDir = '/opt/cursor/artifacts';
fs.mkdirSync(shotDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
const resume = spawnSync(process.execPath, ['social-worker/test/going-resume.test.mjs'], { cwd: root, env: { ...process.env, ATM_SHOT_DIR: shotDir }, encoding: 'utf8' });
if (resume.status !== 0) {
  console.error(resume.stdout, resume.stderr);
  process.exit(resume.status || 1);
}

const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const TOKEN = 'ab'.repeat(32);
const CARD = 'DFBKYdPX';
const mine = {
  email: 'wei@example.com', name: '魏', city: '上海', role: 'leader', sitewide: true,
  favs: [], items: [],
  drafts: [{ id: CARD, anchor: '', intent: 'interested', date: '', transport: false, notify: true }]
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };
function fileFor(urlPath) {
  let clean = decodeURIComponent(urlPath.split('?')[0]);
  if (clean.endsWith('/')) clean += 'index.html';
  const rel = clean === '/' ? '/index.html' : clean;
  const full = path.join(root, rel);
  if (!full.startsWith(root)) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  return null;
}
const server = http.createServer((req, res) => {
  const full = fileFor(req.url || '/');
  if (!full) { res.writeHead(404); res.end('missing'); return; }
  const ext = path.extname(full).toLowerCase();
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(full).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function arm(page) {
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    const origin = req.headers()['origin'] || ('http://127.0.0.1:' + port);
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };
    if (req.method() === 'OPTIONS' && u.includes('/social/')) { req.respond({ status: 204, headers: cors }); return; }
    if (u.includes('/social/going/mine')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(mine) });
      return;
    }
    if (u.includes('/social/going/reach')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ reach: { [CARD]: true } }) });
      return;
    }
    if (u.includes('/social/going') && req.method() === 'POST') {
      page.__posts = page.__posts || [];
      page.__posts.push(JSON.parse(req.postData() || '{}'));
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ ok: true, verified: true, mailed: false, mail: 'queued' }) });
      return;
    }
    if (u.includes('/social/profile') && req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      page.__profile = body;
      req.respond({ status: 200, contentType: 'application/json', headers: { ...cors, 'Set-Cookie': 'atm_verify=1; Path=/; Secure; SameSite=None' }, body: JSON.stringify({ ok: true, verified: true, session: true, mailed: false, sitewide: body.alert === 1 }) });
      return;
    }
    if (u.startsWith('https://data.tangoweekend.org/')) {
      const local = fileFor(new URL(u).pathname);
      if (!local) { req.respond({ status: 404, body: '{}' }); return; }
      req.respond({ status: 200, contentType: 'application/json', body: fs.readFileSync(local) });
      return;
    }
    if (u.startsWith('http://127.0.0.1:' + port) || u.startsWith('http://localhost:' + port)) { req.continue(); return; }
    req.respond({ status: 204, body: '' });
  });
}
async function shot(page, name) {
  const file = path.join(outDir, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

const page = await browser.newPage();
await arm(page);
await page.goto('http://127.0.0.1:' + port + '/zh/asia/?card=' + CARD + '&intent=resume&s=' + TOKEN, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForSelector('#atm-notice-go', { timeout: 10000 });
const before = await page.evaluate(() => ({
  notice: !document.getElementById('atm-notice').hidden,
  dialog: !!(document.getElementById('atm-star') && document.getElementById('atm-star').hidden === false),
  card: location.search.includes('card=' + 'DFBKYdPX'),
  intent: location.search.includes('intent=resume'),
  session: /^[0-9a-f]{64}$/.test(localStorage.getItem('atm_session') || ''),
  stripped: !location.search.includes('s=')
}));
check('disclaimer shows on a new entry and the card query stays', before.notice && !before.dialog && before.card && before.intent && before.session && before.stripped);
await shot(page, '11-9-9-disclaimer-zh');
page.on('pageerror', err => console.error('PAGE', err.message));
await page.click('#atm-notice-go');
await page.waitForSelector('#atm-single', { timeout: 15000 });
try {
  await page.waitForFunction(() => {
    const box = document.getElementById('atm-star');
    return box && box.hidden === false && document.querySelector('#asg-name') && document.querySelector('[data-intent="interested"][aria-pressed="true"]');
  }, { timeout: 15000 });
} catch (e) {
  console.error('STATE', await page.evaluate(() => ({
    ack: !!window.__atmNoticeAck,
    star: !!document.getElementById('atm-star'),
    hidden: document.getElementById('atm-star') && document.getElementById('atm-star').hidden,
    name: document.querySelector('#asg-name') && document.querySelector('#asg-name').value,
    pressed: (document.querySelector('[data-intent][aria-pressed="true"]') || {}).textContent,
    session: localStorage.getItem('atm_session'),
    search: location.search
  })));
  throw e;
}
const resumed = await page.evaluate(() => ({
  card: !!document.getElementById('atm-single'),
  query: location.search.includes('card=DFBKYdPX') && location.search.includes('intent=resume'),
  name: document.querySelector('#asg-name').value,
  city: document.querySelector('#asg-city').value,
  role: document.querySelector('#asg-role').value,
  locked: document.querySelector('#asg-name').disabled && document.querySelector('#asg-role').disabled,
  pressed: document.querySelector('[data-intent][aria-pressed="true"]').textContent,
  asked: !document.querySelector('#asg-email')
}));
check('after the disclaimer the card and the filled intent dialog open', resumed.card && resumed.query && resumed.name === '魏' && resumed.city === '上海' && resumed.role === 'leader' && resumed.locked && resumed.pressed === '感兴趣' && resumed.asked);
await page.evaluate(() => document.querySelectorAll('.atm-toast').forEach(t => t.remove()));
await shot(page, '11-9-9-resume-dialog-zh');
await page.evaluate(() => document.querySelector('#asg-go').click());
await page.waitForFunction(() => document.getElementById('atm-star').hidden, { timeout: 8000 });
check('confirm records the preselected intent without asking for the profile again', Array.isArray(page.__posts) && page.__posts.length === 1 && page.__posts[0].intent === 'interested' && !page.__posts[0].email);

await page.evaluate(() => document.querySelector('.atm-burger').click());
await page.waitForSelector('#atm-menu:not([hidden]) [data-a="sub"]');
const menuLabel = await page.$eval('[data-a="sub"]', el => el.textContent.trim());
check('a confirmed session renames the menu item', menuLabel === '我的资料');
await page.evaluate(() => document.querySelectorAll('.atm-toast').forEach(t => t.remove()));
await shot(page, '11-9-9-menu-profile-zh');
await page.click('[data-a="sub"]');
await page.waitForFunction(() => document.getElementById('tsub-t') && document.getElementById('tsub-t').textContent === '我的资料' && document.getElementById('tsub-e') && document.getElementById('tsub-e').value === 'wei@example.com');
const profile = await page.evaluate(() => ({
  title: document.getElementById('tsub-t').textContent,
  email: document.getElementById('tsub-e').value,
  name: document.getElementById('tsub-n').value,
  city: document.getElementById('tsub-c').value,
  role: document.getElementById('tsub-r').value,
  site: document.getElementById('tsub-site').checked,
  locked: document.getElementById('tsub-e').disabled,
  unsub: !document.getElementById('tsub-unsub').hidden
}));
check('my profile shows the shared fields and the site-wide checkbox', profile.title === '我的资料' && profile.email === 'wei@example.com' && profile.name === '魏' && profile.city === '上海' && profile.role === 'leader' && profile.site === true && profile.locked && profile.unsub);
await shot(page, '11-9-9-my-profile-zh');
await page.evaluate(() => { document.getElementById('tsub-site').click(); document.getElementById('tsub-site').click(); document.getElementById('tsub-go').click(); });
await page.waitForFunction(() => document.getElementById('tsub-ok') && !document.getElementById('tsub-ok').hidden);
check('re-checking site-wide posts immediately and does not ask for a new email', page.__profile && page.__profile.alert === 1 && page.__profile.name === '魏' && !page.__profile.ts);

const freshCtx = await browser.createBrowserContext();
const fresh = await freshCtx.newPage();
await arm(fresh);
await fresh.goto('http://127.0.0.1:' + port + '/zh/asia/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await fresh.waitForSelector('#atm-notice-go');
await fresh.click('#atm-notice-go');
await fresh.waitForSelector('.atm-burger');
await fresh.evaluate(() => document.querySelector('.atm-burger').click());
await fresh.waitForSelector('[data-a="sub"]');
check('a new visitor sees 订阅', await fresh.$eval('[data-a="sub"]', el => el.textContent.trim()) === '订阅');
await fresh.click('[data-a="sub"]');
await fresh.waitForSelector('#tsub-site');
const form = await fresh.evaluate(() => ({
  title: document.getElementById('tsub-t').textContent,
  email: !!document.getElementById('tsub-e'),
  name: !!document.getElementById('tsub-n'),
  role: !!document.getElementById('tsub-r'),
  city: !!document.getElementById('tsub-c'),
  site: document.getElementById('tsub-site').checked,
  label: document.querySelector('label.tsub-check').textContent
}));
check('the menu form is the shared profile form and the box starts checked', form.title === '订阅' && form.email && form.name && form.role && form.city && form.site && form.label.includes('加入 ATM 全站订阅'));
await shot(fresh, '11-9-9-subscribe-form-zh');

const starPage = await freshCtx.newPage();
await arm(starPage);
await starPage.goto('http://127.0.0.1:' + port + '/zh/asia/?card=' + CARD, { waitUntil: 'domcontentloaded', timeout: 20000 });
await starPage.waitForSelector('#atm-notice-go');
await starPage.click('#atm-notice-go');
await starPage.waitForSelector('#atm-single .atm-heart', { timeout: 15000 });
await starPage.evaluate(() => document.querySelector('#atm-single .atm-heart').click());
await starPage.waitForSelector('#asg-promo');
const starForm = await starPage.evaluate(() => ({
  pressed: document.querySelector('[data-intent][aria-pressed="true"]').textContent,
  absent: document.querySelector('[data-intent="absent"]').textContent,
  email: !!document.querySelector('#asg-email'),
  name: !!document.querySelector('#asg-name'),
  role: !!document.querySelector('#asg-role'),
  city: !!document.querySelector('#asg-city'),
  site: document.querySelector('#asg-promo').checked,
  label: document.querySelector('#asg-promolab').textContent,
  widget: document.querySelectorAll('.asg-ts').length
}));
check('the star form matches the menu form and defaults to 要参加', starForm.pressed === '要参加' && starForm.absent === '去不了' && starForm.email && starForm.name && starForm.role && starForm.city && starForm.site && starForm.label.includes('加入 ATM 全站订阅') && starForm.widget === 0);
await shot(starPage, '11-9-9-star-form-zh');

async function htmlShot(file, name) {
  const p = await browser.newPage();
  await p.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  const html = fs.readFileSync(path.join(shotDir, file), 'utf8').replace(/<meta http-equiv="refresh"[^>]*>/i, '');
  await p.setContent(html, { waitUntil: 'domcontentloaded', timeout: 8000 });
  await shot(p, name);
  await p.close();
}
await htmlShot('same.html', '11-9-9-confirm-same-browser');
await htmlShot('other.html', '11-9-9-confirm-other-browser');
await htmlShot('wechat.html', '11-9-9-confirm-wechat');
await htmlShot('expired.html', '11-9-9-confirm-expired');
await htmlShot('menu.html', '11-9-9-confirm-menu');

await browser.close();
server.close();
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('going resume ui ok');
