// Favorites list title + unfavorite persistence. Local pages and mocked APIs only.
// Run: node social-worker/test/fav-unfav-ui.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/tmp/node_modules/puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const shotDir = process.env.ATM_SHOT_DIR || '/workspace/atm-11913-unfav/preview';
fs.mkdirSync(shotDir, { recursive: true });

const FAVS = ['jtzZIdAx', 'E167', 'E093'];
const DROP = 'jtzZIdAx';
const fail = [];
const check = (n, ok) => { if (!ok) { fail.push(n); console.error('FAIL', n); } };

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
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const origin = 'http://127.0.0.1:' + port;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars'],
});

function cors() {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

async function arm(page, { token, mine, seed, unfavOk } = {}) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    const h = cors();
    if (req.method() === 'OPTIONS' && u.includes('/social/')) { req.respond({ status: 204, headers: h }); return; }
    if (u.includes('/social/going/unfav') && req.method() === 'POST') {
      if (unfavOk === false) {
        req.respond({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify({ error: 'fail' }) });
      } else {
        req.respond({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify({ ok: true, removed: true }) });
      }
      return;
    }
    if (u.includes('/social/going/mine')) {
      if (mine === '401') {
        req.respond({ status: 401, contentType: 'application/json', headers: h, body: JSON.stringify({ error: 'auth' }) });
      } else if (mine) {
        req.respond({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify(mine) });
      } else {
        req.continue();
      }
      return;
    }
    if (u.includes('/social/going/reach')) {
      req.respond({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify({ reach: {} }) });
      return;
    }
    req.continue();
  });
  await page.evaluateOnNewDocument((opts) => {
    try { sessionStorage.setItem('atmNoticeAck', '1'); } catch (e) {}
    if (opts.seed) {
      try {
        if (!sessionStorage.getItem('atmFavSeeded')) {
          localStorage.setItem('atm_fav_v1', JSON.stringify(opts.seed));
          localStorage.removeItem('atm_fav_removed_v1');
          sessionStorage.setItem('atmFavSeeded', '1');
        }
      } catch (e) {}
    }
    if (opts.token) {
      try { localStorage.setItem('atm_session', opts.token); } catch (e) {}
    } else if (opts.clearToken) {
      try { localStorage.removeItem('atm_session'); } catch (e) {}
    }
  }, { seed, token, clearToken: !token && !!seed });
}

async function dismiss(page) {
  await page.evaluate(() => { const n = document.getElementById('atm-notice'); if (n) n.hidden = true; });
}

async function openList(page) {
  await page.waitForSelector('[data-fav]', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 800));
  await dismiss(page);
  await page.evaluate(() => { const b = document.querySelector('[data-fav]'); if (b) b.click(); });
  await page.waitForSelector('.ah-ly', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 300));
}

async function state(page) {
  return page.evaluate(() => ({
    title: (document.querySelector('.ah-lyh b') || {}).innerText || '',
    aria: (document.querySelector('.ah-ly') || {}).getAttribute('aria-label') || '',
    unfav: [...document.querySelectorAll('.ah-ly .atm-unfav')].map((el) => ({
      id: el.getAttribute('data-unfav'),
      text: el.textContent,
      h: el.getBoundingClientRect().height,
      w: el.getBoundingClientRect().width,
      visible: !!(el.offsetParent || el.getClientRects().length),
    })),
    hearts: document.querySelectorAll('.ah-ly .ah-heart').length,
    starOpen: !!(document.querySelector('#atm-star:not([hidden]) .asg-opt, #atm-star:not([hidden]) [data-intent]')),
    favs: JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'),
    removed: JSON.parse(localStorage.getItem('atm_fav_removed_v1') || '[]'),
    toast: (document.body.innerText || '').includes('暂不支持在线登记'),
  }));
}

// --- ZH no-session: title + visible cancel, drop one, persists after reload ---
const page = await browser.newPage();
await arm(page, { seed: FAVS });
await page.goto(origin + '/zh/asia/', { waitUntil: 'networkidle0', timeout: 40000 });
await openList(page);
let st = await state(page);
check('zh title', st.title.includes('我的收藏') && st.title.includes('3') && !st.title.includes('意向'));
check('zh unfav visible x3', st.unfav.length === 3 && st.unfav.every((u) => u.text === '取消收藏' && u.h >= 44 && u.w >= 44 && u.visible));
check('zh seeded favs', st.favs.slice().sort().join() === FAVS.slice().sort().join());
await page.screenshot({ path: path.join(shotDir, 'zh-list-before.png'), fullPage: false });

await page.evaluate((id) => {
  const b = document.querySelector('.ah-ly .atm-unfav[data-unfav="' + id + '"]');
  if (b) b.click();
}, DROP);
await new Promise((r) => setTimeout(r, 500));
st = await state(page);
check('zh after cancel count 2', st.favs.length === 2 && !st.favs.includes(DROP) && st.removed.includes(DROP));
check('zh panel updates', st.title.includes('我的收藏') && st.title.includes('2') && st.unfav.length === 2 && !st.unfav.some((u) => u.id === DROP));
check('zh no intent toast', !st.toast && !st.starOpen);
await page.screenshot({ path: path.join(shotDir, 'zh-list-after.png'), fullPage: false });

await page.reload({ waitUntil: 'networkidle0', timeout: 40000 });
await openList(page);
st = await state(page);
check('zh persists after reload', st.favs.length === 2 && !st.favs.includes(DROP) && st.unfav.length === 2 && st.title.includes('2'));
await page.close();

// --- EN no-session, independent seed then cancel (title check); reuse remaining 2 from shared origin storage? 
// Previous page already left 2 favs + tombstone on this origin. Start fresh context via clear + seed for EN title with 3, then we would overwrite.
// Use a new incognito-like... puppeteer pages share the default profile. Re-seed would reset. Do EN title+cancel in a separate browser context.
const ctxEn = await browser.createBrowserContext();
const en = await ctxEn.newPage();
await arm(en, { seed: FAVS });
await en.goto(origin + '/asia/', { waitUntil: 'networkidle0', timeout: 40000 });
await openList(en);
st = await state(en);
check('en title', st.title.includes('My saved events') && st.title.includes('3') && !/intent/i.test(st.title));
check('en unfav visible x3', st.unfav.length === 3 && st.unfav.every((u) => u.text === 'Remove from favorites' && u.h >= 44 && u.visible));
await en.screenshot({ path: path.join(shotDir, 'en-list-before.png'), fullPage: false });
await en.evaluate((id) => { const b = document.querySelector('.ah-ly .atm-unfav[data-unfav="' + id + '"]'); if (b) b.click(); }, DROP);
await new Promise((r) => setTimeout(r, 500));
st = await state(en);
check('en after cancel count 2', st.favs.length === 2 && !st.favs.includes(DROP) && st.removed.includes(DROP) && st.title.includes('2') && st.unfav.length === 2);
await en.screenshot({ path: path.join(shotDir, 'en-list-after.png'), fullPage: false });

// persist after 401 in this context (storage already has 2 + tombstone)
const p401 = await ctxEn.newPage();
await arm(p401, { token: 'fake-token-401', mine: '401' });
await p401.goto(origin + '/asia/', { waitUntil: 'networkidle0', timeout: 40000 });
await openList(p401);
st = await state(p401);
check('en 401 does not resurrect', st.favs.length === 2 && !st.favs.includes(DROP) && st.unfav.length === 2);
await p401.close();

// persist after mocked /mine union that still lists all 3
const pMine = await ctxEn.newPage();
await arm(pMine, { token: 'fake-token-ok', mine: { email: 'a@b.c', name: 'A', city: 'Beijing', role: 'dancer', items: [], drafts: [], favs: FAVS } });
await pMine.goto(origin + '/asia/', { waitUntil: 'networkidle0', timeout: 40000 });
await openList(pMine);
st = await state(pMine);
check('en /mine union does not resurrect', st.favs.length === 2 && !st.favs.includes(DROP) && st.removed.includes(DROP) && st.unfav.length === 2 && st.title.includes('2'));
await pMine.close();
await ctxEn.close();

await browser.close();
server.close();
if (fail.length) { console.error(fail.length + ' failed: ' + fail.join(' | ')); process.exit(1); }
console.log('fav unfav ui ok');
