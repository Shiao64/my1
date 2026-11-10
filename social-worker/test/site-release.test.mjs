// Visible site release label. Run: node social-worker/test/site-release.test.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const zh = read('zh/asia/index.html');
const en = read('asia/index.html');
const sub = read('asia/asia-subscribe.js');
function attr(html, name) {
  const m = html.match(new RegExp('data-' + name + '="([^"]*)"'));
  return m ? m[1] : null;
}
check('both pages continue the menu v11.9 as 11.9.1', attr(zh, 'site-release') === '11.9.1' && attr(en, 'site-release') === '11.9.1');
check('publish date stays empty until a real publish', attr(zh, 'site-release-date') === '' && attr(en, 'site-release-date') === '');
check('beta label stays and shows the same number', zh.includes('<span class="atm-beta">测试版 11.9.1</span>') && en.includes('<span class="atm-beta">beta 11.9.1</span>'));
check('menu keeps the v prefix on the same number', sub.includes("getAttribute('data-site-release')") && sub.includes("'· v' + rel") && !sub.includes("SITE_VERSION = 'v11.9'"));
check('menu script cache moves with the label', zh.includes('asia-subscribe.js?v=sub61') && en.includes('asia-subscribe.js?v=sub61') && !zh.includes('asia-subscribe.js?v=sub60') && !en.includes('asia-subscribe.js?v=sub60'));
check('header css cache moves with the longer badge', zh.includes('atm-critical.css?v=ac4') && en.includes('atm-critical.css?v=ac4') && !zh.includes('atm-critical.css?v=ac3') && !en.includes('atm-critical.css?v=ac3'));
check('release comment does not claim this number is already live', zh.includes('does not mean other unreleased work is live') && en.includes('does not mean other unreleased work is live'));
const going = read('social-worker/src/going.js');
const star = read('asia/atm-star.js');
check('intent and mail code stay untouched by the label', going.includes('INSERT INTO going_pending') && star.includes("verifyBtn: '确认邮箱并继续'") && !going.includes('data-site-release'));
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('site release ok');
