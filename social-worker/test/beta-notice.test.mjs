// Entry notice replaces the Beijing weekend ad. Run: node social-worker/test/beta-notice.test.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fail = [];
const check = (n, ok) => { if (!ok) fail.push(n); };
const zh = read('zh/asia/index.html');
const en = read('asia/index.html');
const home = read('asia/atm-home.js');
const zhCopy = '参加活动前，请直接向组织者确认日期、时间、地点及行程、报名安排，再决定出行或付款。请以组织者最新确认为准；本站信息仅供参考，收藏或选择「我要去」不代表正式报名。';
const enCopy = 'Before attending, please confirm the date, time, venue, itinerary and registration arrangements directly with the organizer before making travel plans or payments. The organizer\u2019s latest confirmation takes precedence. This site provides information for reference only; saving an event or selecting I\u2019m going is not a formal registration.';
check('chinese notice', zh.includes('测试版提醒与免责声明') && zh.includes('Asia Tango Map（ATM）目前仍在测试中，活动信息可能有误或未及时更新。') && zh.includes(zhCopy) && zh.includes('我已了解，进入网站'));
check('english notice', en.includes('Beta Notice & Disclaimer') && en.includes('Asia Tango Map (ATM) is still in beta. Event information may be inaccurate or out of date.') && en.includes(enCopy) && en.includes('I understand, enter the site'));

function gateSource(html) {
  const a = html.indexOf('window.atmNoticeGate=function(storage,perf){');
  const b = html.indexOf('/* /atm-notice-gate */');
  return a >= 0 && b > a ? html.slice(a, b) : '';
}
function noticeScript(html) {
  const a = html.indexOf('id="atm-notice"');
  const b = html.indexOf('id="draft-favtall-js"');
  return a >= 0 && b > a ? html.slice(a, b) : '';
}
check('both pages share one gate', gateSource(zh) && gateSource(zh) === gateSource(en));
const gate = new Function('storage', 'perf', gateSource(en).replace(/^window\.atmNoticeGate=function\(storage,perf\)\{/, '').replace(/\}\s*;\s*$/, ''));

function mem(seed) {
  const data = Object.assign({}, seed);
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; },
    data
  };
}
function nav(type) {
  return { getEntriesByType(kind) { return kind === 'navigation' ? [{ type }] : []; } };
}
const ack = mem({ atmNoticeAck: '1' });
check('same tab card or language navigation does not show', gate(ack, nav('navigate')) === false && ack.data.atmNoticeAck === '1');
const back = mem({ atmNoticeAck: '1' });
check('back or forward does not show', gate(back, nav('back_forward')) === false && back.data.atmNoticeAck === '1');
const re = mem({ atmNoticeAck: '1' });
check('reload clears the ack and shows', gate(re, nav('reload')) === true && !Object.prototype.hasOwnProperty.call(re.data, 'atmNoticeAck'));
const fresh = mem({});
check('new session shows', gate(fresh, nav('navigate')) === true);
const cardTab = mem({});
check('a new tab opened on a card link shows', gate(cardTab, nav('navigate')) === true);
const legacy = mem({ atmNoticeAck: '1' });
check('reload falls back to performance.navigation.type === 1', gate(legacy, { navigation: { type: 1 } }) === true && !('atmNoticeAck' in legacy.data));
const emptyEntries = mem({ atmNoticeAck: '1' });
check('empty navigation entries use the reload fallback', gate(emptyEntries, { getEntriesByType() { return []; }, navigation: { type: 1 } }) === true && !('atmNoticeAck' in emptyEntries.data));
const kept = mem({ atmNoticeAck: '1' });
check('a navigate entry wins over a stale navigation.type', gate(kept, { getEntriesByType() { return [{ type: 'navigate' }]; }, navigation: { type: 1 } }) === false && kept.data.atmNoticeAck === '1');
const thrown = mem({ atmNoticeAck: '1' });
check('getEntriesByType failure uses the reload fallback', gate(thrown, { getEntriesByType() { throw new Error('blocked'); }, navigation: { type: 1 } }) === true);
check('missing storage shows and does not throw', gate(null, nav('navigate')) === true && gate(undefined, undefined) === true);
let threw = false;
try {
  gate({
    getItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); }
  }, nav('navigate'));
} catch (e) { threw = true; }
check('unusable storage falls back to showing', !threw && gate({
  getItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); }
}, nav('navigate')) === true);
const stuck = mem({ atmNoticeAck: '1' });
stuck.removeItem = () => { throw new Error('blocked'); };
check('a reload still shows when removeItem throws', gate(stuck, nav('reload')) === true);

for (const html of [zh, en]) {
  const notice = noticeScript(html);
  check('entry ad is gone', !html.includes('id="atm-pop"') && !html.includes('atm_stw_popup_dismissed_until_v2') && !html.includes('class="ap-x"'));
  check('one confirm button and card links are not rewritten', (html.match(/id="atm-notice-go"/g) || []).length === 1 && notice.includes("sessionStorage.setItem('atmNoticeAck','1')") && !notice.includes('localStorage') && !notice.includes('?card') && !notice.includes('location.href'));
  check('escape overlay and tab do not dismiss', notice.includes("e.key==='Escape'") && notice.includes('preventDefault()') && notice.includes('if(e.target===n)e.stopPropagation()') && notice.includes("e.key==='Tab'"));
  check('bfcache return does not re-arm', !notice.includes('pageshow') && !notice.includes('persisted') && !notice.includes('__atmNoticeAck=false'));
  check('storage access cannot freeze the page', notice.includes('catch(e){show=true;}') && html.includes('try{store=window.sessionStorage;}catch(e){}') && html.includes("html.atm-notice-ack #atm-notice{display:none!important}"));
  check('star script is the candidate st32', html.includes('/asia/atm-star.js?v=st32') && !html.includes('/asia/atm-star.js?v=st31'));
}
check('home cards stay full page links', home.includes("location.pathname + '?card=' + encodeURIComponent(e.id)"));
check('release label is 11.9.28', zh.includes('data-site-release="11.9.28"') && en.includes('data-site-release="11.9.28"') && zh.includes('测试版 11.9.28') && en.includes('beta 11.9.28'));
if (fail.length) { console.error('FAIL', fail.join(' | ')); process.exit(1); }
console.log('beta notice ok');
