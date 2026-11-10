// Entry notice replaces the Beijing weekend ad. Run: node social-worker/test/beta-notice.test.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const zh = read('zh/asia/index.html');
const en = read('asia/index.html');
const zhCopy = '参加活动前，请直接向组织者确认日期、时间、地点及行程、报名安排，再决定出行或付款。请以组织者最新确认为准；本站信息仅供参考，收藏或选择「要参加／感兴趣」不代表正式报名。';
const enCopy = 'Before attending, please confirm the date, time, venue, itinerary and registration arrangements directly with the organizer before making travel plans or payments. The organizer\u2019s latest confirmation takes precedence. This site provides information for reference only; saving an event or selecting Going / Interested is not a formal registration.';
check('chinese notice', zh.includes('测试版提醒与免责声明') && zh.includes('Asia Tango Map（ATM）目前仍在测试中，活动信息可能有误或未及时更新。') && zh.includes(zhCopy) && zh.includes('我已了解，进入网站'));
check('english notice', en.includes('Beta Notice & Disclaimer') && en.includes('Asia Tango Map (ATM) is still in beta. Event information may be inaccurate or out of date.') && en.includes(enCopy) && en.includes('I understand, enter the site'));
for (const html of [zh, en]) {
  check('entry ad is gone', !html.includes('id="atm-pop"') && !html.includes('atm_stw_popup_dismissed_until_v2') && !html.includes('class="ap-x"'));
  check('notice is not skipped for a card link and is not stored', html.includes('id="atm-notice"') && !html.includes("localStorage.setItem(K") && html.includes('__atmNoticeAck'));
  check('escape does not dismiss', html.includes("e.key==='Escape'") && html.includes('preventDefault()'));
  check('star script is the candidate st13', html.includes('/asia/atm-star.js?v=st13'));
}
check('candidate label is 11.9.4', zh.includes('data-site-release="11.9.4"') && en.includes('data-site-release="11.9.4"') && zh.includes('测试版 11.9.4') && en.includes('beta 11.9.4'));
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('beta notice ok');
