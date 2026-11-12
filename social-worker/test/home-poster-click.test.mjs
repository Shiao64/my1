// Homepage poster clicks (candidate 11.9.23).
// Source contract always runs. Browser checks run when Chrome is installed.
// Run: node social-worker/test/home-poster-click.test.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = [];
const check = (name, ok) => { if (!ok) { fail.push(name); console.error('FAIL', name); } };

const home = read('asia/atm-home.js');
const map = read('asia/asia-map.js');
const card = read('asia/cardB.js');
const zh = read('zh/asia/index.html');
const en = read('asia/index.html');

const thumb = home.slice(home.indexOf('function evThumb'), home.indexOf('function favBlock'));
check('favorite and featured thumbs are same-tab card links', thumb.includes("'<a class=\"ah-pt\" href=\"' + esc(cardPageHref(e))") && thumb.includes('data-card') && thumb.includes("img(e, '', eager)") && !thumb.includes('target=') && !thumb.includes('_blank') && home.includes("function cardPageHref(e) { return location.pathname + '?card=' + encodeURIComponent(e.id); }"));
check('both home strips use that thumb', home.includes("list.slice(0, 6).map(function (e, i) { return evThumb(e, i < 2); })") && home.includes("FEAT.filter(function (e) { return e.poster; }).slice(0, 6).map(function (e, i) { return evThumb(e, i < 2); })"));
check('poster click is not handled as the section button', home.indexOf("e.target.closest('a.ah-pt')") < home.indexOf("e.target.closest('button')") && home.includes('a.ah-pt')) ;
check('favorite title and chevron still open the saved list', home.includes('data-fav="1"') && home.includes("if (b.hasAttribute('data-fav')) { openFav(); return; }"));
check('featured title and chevron still open the featured list', home.includes('data-go="#h-feat"'));
check('city tiles stay buttons into the city list', home.includes('class="ah-ct" data-city="') && home.includes("go('#h-city-' + encodeURIComponent(b.getAttribute('data-city')))"));
check('list cards still use openHref', home.includes('function openHref(e)') && home.includes("'<a class=\"ah-card'"));
check('home cache is h146 only', zh.includes('atm-home.js?v=h146') && en.includes('atm-home.js?v=h146') && !zh.includes('atm-home.js?v=h145') && !en.includes('atm-home.js?v=h145'));
check('other caches stay put', zh.includes('atm-i18n.js?v=i1') && zh.includes('asia-map.js?v=r14') && zh.includes('cardB.js?v=cb146') && zh.includes('atm-critical.css?v=ac7') && zh.includes('atm-star.js?v=st31') && en.includes('atm-star.js?v=st31') && zh.includes('asia-subscribe.js?v=sub72') && en.includes('asia-subscribe.js?v=sub72'));
check('candidate label is 11.9.28 and unpublished', zh.includes('data-site-release="11.9.28"') && en.includes('data-site-release="11.9.28"') && zh.includes('data-site-release-date=""') && en.includes('data-site-release-date=""'));
check('featured P10 poster stays inert', map.includes("cv.closest('#atm-single') && c0.getAttribute('data-kind') === 'event' && c0.getAttribute('data-oneoff') !== '1'") && map.includes('poster tap does nothing'));
check('regular P10 still builds the poster viewer path', card.includes("if(li.dataset.kind==='event'&&li.dataset.oneoff!=='1') return false;") && card.includes("id='p10-pv'") && card.includes('pv.hidden=false'));

const chrome = process.env.CHROME || '/usr/bin/google-chrome';
const require = createRequire(import.meta.url);
let puppeteer = null;
try { puppeteer = require('/tmp/node_modules/puppeteer-core'); } catch (e) { puppeteer = null; }
if (!fs.existsSync(chrome) || !puppeteer) {
  if (fail.length) { console.error(fail.join(' | ')); process.exit(1); }
  console.log('home poster click source ok (browser skipped)');
  process.exit(0);
}
const FAV = 'vhYvwRzo';
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
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars'],
});
const popups = [];
browser.on('targetcreated', (target) => { if (target.type() === 'page') popups.push(target.url()); });

function cors() {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

async function arm(page) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    const h = cors();
    if (req.method() === 'OPTIONS') { req.respond({ status: 204, headers: h }); return; }
    if (u.includes('/social/')) {
      req.respond({ status: 401, contentType: 'application/json', headers: h, body: '{}' });
      return;
    }
    if (u.includes('data.tangoweekend.org') && /\.json(?:$|\?)/.test(u)) {
      const name = u.split('/').pop().split('?')[0];
      const full = path.join(root, 'asia', name);
      if (fs.existsSync(full)) {
        req.respond({ status: 200, contentType: 'application/json; charset=utf-8', headers: h, body: fs.readFileSync(full) });
        return;
      }
    }
    if (u.includes('data.tangoweekend.org')) { req.respond({ status: 404, headers: h, body: '' }); return; }
    req.continue();
  });
  await page.evaluateOnNewDocument((id) => {
    try { sessionStorage.setItem('atmNoticeAck', '1'); } catch (e) {}
    try { localStorage.setItem('atm_fav_v1', JSON.stringify([id])); } catch (e) {}
  }, FAV);
}

async function settle(page, lang) {
  const pathName = lang === 'zh' ? '/zh/asia/' : '/asia/';
  await page.waitForFunction((id, pathName) => {
    const a = document.querySelector('.ah-fb a.ah-pt[data-card="' + id + '"]');
    const b = document.querySelector('.ah-ban a.ah-pt[data-card]');
    const c = document.querySelector('.ah-rb .ah-ct[data-city]');
    if (!a || !b || !c) return false;
    if (a.getAttribute('href') !== pathName + '?card=' + id) return false;
    if ((b.getAttribute('href') || '').indexOf(pathName + '?card=') !== 0) return false;
    const sig = a.getAttribute('href') + '|' + b.getAttribute('href') + '|' + c.getAttribute('data-city');
    if (window.__atmSig !== sig) { window.__atmSig = sig; window.__atmN = 0; return false; }
    window.__atmN += 1;
    return window.__atmN >= 3;
  }, { timeout: 20000, polling: 200 }, FAV, pathName);
}

async function domClick(page, sel) {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  if (!ok) throw new Error('missing ' + sel);
}

async function openHome(lang) {
  const page = await browser.newPage();
  await arm(page);
  const pathName = lang === 'zh' ? '/zh/asia/' : '/asia/';
  await page.goto(origin + pathName, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(page, lang);
  return page;
}

function posterInfo(sel) {
  const a = document.querySelector(sel);
  const img = a && a.querySelector('img');
  return {
    href: a ? a.getAttribute('href') : '',
    target: a ? a.getAttribute('target') : 'missing',
    download: a ? a.hasAttribute('download') : true,
    inButton: !!(a && a.closest('button')),
    imgs: a ? a.querySelectorAll('img').length : 0,
    src: img ? (img.getAttribute('data-atm-src') || img.getAttribute('src') || '') : '',
  };
}

function thumbOk(info, prefix) {
  return info.href.indexOf(prefix) === 0 && info.target == null && !info.download && !info.inButton && info.imgs === 1 && info.src.indexOf('/images/thumb') !== -1;
}

async function run() {
  const zhPage = await openHome('zh');
  const fav = await zhPage.evaluate(posterInfo, '.ah-fb a.ah-pt[data-card="' + FAV + '"]');
  const feat = await zhPage.evaluate(posterInfo, '.ah-ban a.ah-pt[data-card]');
  check('zh favorite poster points at the Chinese card', fav.href === '/zh/asia/?card=' + FAV && thumbOk(fav, '/zh/asia/?card='));
  check('zh featured poster points at a Chinese card', thumbOk(feat, '/zh/asia/?card='));

  const scrolled = await zhPage.evaluate(() => {
    const strip = document.querySelector('.ah-ban .ah-strip');
    const before = location.href;
    const overflow = getComputedStyle(strip).overflowX;
    strip.scrollLeft = 80;
    return { overflow: overflow, left: strip.scrollLeft, same: location.href === before };
  });
  check('featured row still scrolls without navigating', (scrolled.overflow === 'auto' || scrolled.overflow === 'scroll') && scrolled.left > 0 && scrolled.same);

  const city = await zhPage.evaluate(() => document.querySelector('.ah-rb .ah-ct[data-city]').getAttribute('data-city'));
  await domClick(zhPage, '.ah-rb .ah-ct[data-city]');
  await zhPage.waitForFunction((name) => {
    const home = document.getElementById('atm-home');
    return location.hash === '#h-city-' + encodeURIComponent(name) && !/[?&]card=/.test(location.search) && home && home.getAttribute('data-view') === 'city';
  }, { timeout: 8000 }, city);
  check('city tile opens that city list', true);

  await zhPage.goto(origin + '/zh/asia/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(zhPage, 'zh');
  await domClick(zhPage, '.ah-fb button[data-fav]');
  await zhPage.waitForSelector('.ah-ly', { timeout: 8000 });
  const favList = await zhPage.evaluate(() => ({ card: /[?&]card=/.test(location.search), dialog: !!document.querySelector('.ah-ly') }));
  check('favorite title opens the saved list', favList.dialog && !favList.card);

  await zhPage.goto(origin + '/zh/asia/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(zhPage, 'zh');
  await domClick(zhPage, '.ah-ban button[data-go="#h-feat"]');
  await zhPage.waitForFunction(() => {
    const home = document.getElementById('atm-home');
    return location.hash === '#h-feat' && !/[?&]card=/.test(location.search) && home && home.getAttribute('data-view') === 'feat';
  }, { timeout: 8000 });
  check('featured title opens the featured list', true);

  await zhPage.goto(origin + '/zh/asia/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(zhPage, 'zh');
  await Promise.all([
    zhPage.waitForFunction((id) => location.pathname === '/zh/asia/' && location.search === '?card=' + id, { timeout: 20000 }, FAV),
    domClick(zhPage, '.ah-fb a.ah-pt[data-card="' + FAV + '"]'),
  ]);
  await zhPage.waitForSelector('#atm-single .p10-frame img', { timeout: 20000 });
  const beforeRegular = zhPage.url();
  await zhPage.click('#atm-single .p10-frame img');
  await zhPage.waitForFunction(() => {
    const pv = document.getElementById('p10-pv');
    return pv && !pv.hidden;
  }, { timeout: 8000 });
  check('regular card poster still opens the lightbox', zhPage.url() === beforeRegular);

  await zhPage.goto(origin + '/zh/asia/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(zhPage, 'zh');
  const featId = await zhPage.evaluate(() => document.querySelector('.ah-ban a.ah-pt[data-card]').getAttribute('data-card'));
  await Promise.all([
    zhPage.waitForFunction((id) => location.pathname === '/zh/asia/' && location.search === '?card=' + id, { timeout: 20000 }, featId),
    domClick(zhPage, '.ah-ban a.ah-pt[data-card="' + featId + '"]'),
  ]);
  await zhPage.waitForSelector('#atm-single .ev-cover', { timeout: 20000 });
  const beforeFeat = zhPage.url();
  const popupsBefore = popups.length;
  await zhPage.click('#atm-single .ev-cover');
  await new Promise((resolve) => setTimeout(resolve, 500));
  const featCard = await zhPage.evaluate(() => {
    const pv = document.getElementById('p10-pv');
    const atm = document.querySelector('.atm-pv');
    const det = document.querySelector('a.atm-det');
    return {
      p10: !pv || pv.hidden,
      atm: !atm || atm.hidden,
      det: det ? det.textContent : '',
    };
  });
  check('featured card poster stays inert', zhPage.url() === beforeFeat && featCard.p10 && featCard.atm && featCard.det.indexOf('活动详情') !== -1 && popups.length === popupsBefore);
  await zhPage.close();

  const enPage = await openHome('en');
  const enFav = await enPage.evaluate(posterInfo, '.ah-fb a.ah-pt[data-card="' + FAV + '"]');
  const enFeat = await enPage.evaluate(posterInfo, '.ah-ban a.ah-pt[data-card]');
  check('en posters stay on the English card', enFav.href === '/asia/?card=' + FAV && thumbOk(enFeat, '/asia/?card=') && enFav.target == null);
  await domClick(enPage, '.ah-ban button[data-go="#h-feat"]');
  await enPage.waitForFunction(() => location.hash === '#h-feat' && document.getElementById('atm-home').getAttribute('data-view') === 'feat', { timeout: 8000 });
  await enPage.goto(origin + '/asia/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(enPage, 'en');
  const enCity = await enPage.evaluate(() => document.querySelector('.ah-rb .ah-ct[data-city]').getAttribute('data-city'));
  await domClick(enPage, '.ah-rb .ah-ct[data-city]');
  await enPage.waitForFunction((name) => location.hash === '#h-city-' + encodeURIComponent(name) && document.getElementById('atm-home').getAttribute('data-view') === 'city', { timeout: 8000 }, enCity);
  check('english city tile still opens the city list', true);
  await enPage.close();
}

try {
  await run();
} catch (err) {
  fail.push('browser: ' + (err && err.stack ? err.stack : err));
  console.error(err);
} finally {
  await browser.close();
  server.close();
}

if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('home poster click ok');
