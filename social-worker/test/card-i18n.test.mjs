// Regular-card i18n fallback. Run: node social-worker/test/card-i18n.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const require = createRequire(import.meta.url);
const I = require(path.join(root, 'asia/atm-i18n.js'));
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };

const ev = {
  name: '红舞房 Practica',
  name_zh: '红舞房 练习场',
  name_en: 'Hongwufang Practica',
  venue: '紫金山百货大楼三楼',
  venue_en: 'Zijinshan Department Store 3F',
  venue_address: '台中市西屯區重慶路99號五樓之二',
  venue_address_en: '5F-2, No. 99 Chongqing Road, Xitun District, Taichung',
  dj: '大酒 Jensen',
  dj_en: 'Jensen',
  country: 'China',
  region: 'Taiwan'
};
const missingEn = {
  name: '红舞馨晚间探戈舞会（新场地）',
  name_zh: '红舞馨晚间探戈舞会（新场地）',
  venue: '風 Live house',
  venue_address: '台南市中西區衛民街67號',
  venue_address_en: 'Address not found',
  dj: '艺侨',
  country: 'China',
  region: 'Taiwan'
};
const zhFirst = {
  name: 'Milonga V',
  name_zh: '探戈会',
  venue: 'Tango by Ala House',
  venue_address: '北京市朝阳区光熙家园',
  venue_address_en: 'Guangxi Jiayuan, Chaoyang District, Beijing',
  country: 'China',
  region: 'China'
};

check('en uses name_en', I.fieldText(ev, 'name', 'en') === 'Hongwufang Practica');
check('zh uses name_zh, not name_en', I.fieldText(ev, 'name', 'zh') === '红舞房 练习场');
check('es falls back to name_en then name', I.fieldText(ev, 'name', 'es') === 'Hongwufang Practica');
check('es falls back to original when no en', I.fieldText(missingEn, 'name', 'es') === '红舞馨晚间探戈舞会（新场地）');
check('en venue uses venue_en', I.fieldText(ev, 'venue', 'en') === 'Zijinshan Department Store 3F');
check('zh venue keeps Chinese original', I.fieldText(ev, 'venue', 'zh') === '紫金山百货大楼三楼');
check('en dj uses dj_en', I.fieldText(ev, 'dj', 'en') === 'Jensen');
check('zh dj keeps original', I.fieldText(ev, 'dj', 'zh') === '大酒 Jensen');
check('en skips Address not found and uses original', I.fieldText(missingEn, 'venue_address', 'en') === '台南市中西區衛民街67號');

const enAddr = I.addressLines(ev, 'en');
check('en address shows English first', enAddr.lines[0] === ev.venue_address_en && enAddr.display === ev.venue_address_en);
check('en address keeps Chinese original under it', enAddr.original === ev.venue_address && enAddr.lines[1] === ev.venue_address);
check('map query stays Chinese', enAddr.mapQuery === ev.venue_address);

const zhAddr = I.addressLines(zhFirst, 'zh');
check('zh mainland address is Chinese only', zhAddr.lines.join('|') === zhFirst.venue_address && !zhAddr.original);

const zhOver = I.addressLines({ ...ev, addr_en_zh: true }, 'zh');
check('zh can still append English when addr_en_zh is set', zhOver.lines[0] === ev.venue_address && zhOver.lines[1] === ev.venue_address_en);

const same = I.addressLines({ venue_address: 'K-97', venue_address_en: 'K-97', country: 'China', region: 'Hong Kong' }, 'en');
check('no duplicate line when addresses match', same.lines.length === 1 && !same.original);

check('langOf reads data-asia-lang', I.langOf({ document: { documentElement: { getAttribute: (k) => k === 'data-asia-lang' ? 'es' : '', lang: 'en' } } }) === 'es');
check('langOf zh from path', I.langOf({ document: { documentElement: { getAttribute: () => '', lang: '' } }, pathname: '/zh/asia/' }) === 'zh');

const home = read('asia/atm-home.js');
const map = read('asia/asia-map.js');
const card = read('asia/cardB.js');
const en = read('asia/index.html');
const zh = read('zh/asia/index.html');
check('list uses evName/evVenue/dj pick', home.includes('evName(e)') && home.includes('evVenue(e)') && home.includes("pick(e, 'dj'"));
check('opened map card uses evName and addressLines', map.includes('esc(evName(r))') && map.includes('addressLines(r, i18nLang())') && map.includes('china-addr-orig'));
check('cardB uses helper for name venue address dj and map', card.includes('evName(e)') && card.includes('evVenue(e)') && card.includes('addrLines(e)') && card.includes("pick(e, 'dj'") && card.includes('al.mapQuery'));
check('i18n script precedes map on both pages', en.includes('atm-i18n.js?v=i1') && en.includes('asia-map.js?v=r14') && en.indexOf('atm-i18n.js?v=i1') < en.indexOf('asia-map.js?v=r14') && zh.includes('atm-i18n.js?v=i1') && zh.indexOf('atm-i18n.js?v=i1') < zh.indexOf('asia-map.js?v=r14'));
check('home and card cache bumped', en.includes('atm-home.js?v=h147') && en.includes('cardB.js?v=cb146') && en.includes('atm-critical.css?v=ac7') && zh.includes('atm-home.js?v=h147') && zh.includes('cardB.js?v=cb146') && zh.includes('atm-critical.css?v=ac7'));

if (fail.length) {
  console.error('FAIL', fail.length);
  fail.forEach((n) => console.error(' -', n));
  process.exit(1);
}
console.log('ok', 22);
