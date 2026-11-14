/* v11.22 (2026-11-14): review fixes (overflow, applied-type label, header handoff, a11y). v11.21 (2026-11-14): v2 frozen bar — tabs lay over the scrolled header. v11.20 (2026-11-14): v2 「筛选 ▾」 button instead of long-press / tap-again; tabs + menu stick under the header. v11.15 (2026-11-14): v2 layout test page behind ?v2=1. v11.14 (2026-11-14): CAT_FIX per-event overrides (E123 → workshop). v11.13 (2026-11-14): nth may be a list (twice a month: [1,3] / [2,4]); every:2 without nth labelled 隔周. v11.12 (2026-11-14): city date rail (7 days, ‹ › weeks, month grid, tap a day to jump). v11.11 (2026-11-14): 日常/大型 categories (catOf), 大型 type chips, city 日常 type chips + 近期大型 strip. v11.10 (2026-11-06): LCP eager+preload for first featured thumbs. v11.6 (2026-11-01): list homepage = 特色活动 entry + 常规活动 city grid; featured list / city list / single-select
   search page / favorites layer. Hash routes: '' home, #h-feat, #h-city-<City>, #h-search. Query-string views
   (?card, ?mode, ?city, ?via ...) keep the old list untouched. Cards open the single-card layer (?card=ID). */
(function () {
  var D = document, R = D.documentElement;
  /* 2026-11-12 张孝: P7 ‹ reads the opener saved at the click (sessionStorage atm_p7_from).
     The shareable URL stays ?card=id. document.referrer has no hash, and #v- is not a route. */
  var P7K = 'atm_p7_from';
  function p7read() { try { return JSON.parse(sessionStorage.getItem(P7K) || 'null'); } catch (e) { return null; } }
  window.atmP7Back = function (id) {
    var rec = p7read();
    if (rec && rec.t && performance.timeOrigin && performance.timeOrigin - rec.t > 60000) rec = null;
    if (!rec || rec.id !== id) rec = null;
    var path = location.pathname;
    var rf = null;
    try { rf = new URL(document.referrer); } catch (e) {}
    var sameList = !!(rf && rf.origin === location.origin && rf.pathname === path && !/[?&]card=/.test(rf.search) && !/\/(organizer|dj)\//.test(rf.pathname));
    if (rec && rec.back && rec.to && sameList && history.length > 1) {
      try { sessionStorage.setItem(P7K, JSON.stringify({ id: rec.id, to: rec.to, y: rec.y || 0, restore: 1 })); } catch (e) {}
      history.back();
      return;
    }
    if (rec && rec.to) {
      if (rec.back) { try { sessionStorage.setItem(P7K, JSON.stringify({ id: rec.id, to: rec.to, y: rec.y || 0, restore: 1 })); } catch (e) {} }
      else { try { sessionStorage.removeItem(P7K); } catch (e) {} }
      location.replace(path + rec.to);
      return;
    }
    try { sessionStorage.removeItem(P7K); } catch (e) {}
    if (!rec && sameList && history.length > 1) { history.back(); return; }
    location.replace(path);
  };
  /* v11.7: single card page (?card=) gets the same red heart toggle (asia-fav.js toggles via .ev-card[data-id]) */
  if (/[?&]card=/.test(location.search)) (function () { var z = /^zh/i.test(R.getAttribute('data-asia-lang') || R.lang || '');
    var k = 0, t = setInterval(function () { var c = D.querySelector('#atm-single .ev-card[data-id]'); if (c && !c.querySelector('.atm-heart')) { if (getComputedStyle(c).position === 'static') c.style.position = 'relative'; var lab = z ? '活动意向' : 'Event intent'; c.insertAdjacentHTML('beforeend', '<span class="atm-heart ah-sheart" role="button" tabindex="0" data-sid="' + c.getAttribute('data-id').replace(/"/g, '') + '" aria-label="' + lab + '" title="' + lab + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1 6.8 18.6l1-5.8L3.6 8.7l5.8-.8z"/></svg></span>'); } if (++k > 40) clearInterval(t); }, 250);
    D.addEventListener('keydown', function (e) { var h = e.target.closest && e.target.closest('.ah-sheart'); if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); h.click(); } }); })();
  if (/[?&](card|mode|city|via|date|q|type)=/.test(location.search)) return;
  try { if (sessionStorage.getItem('atm_legacy_list') === '1') return; } catch (e) {} /* regression hook: old full list for the pre-v11.6 test suite */
  var zh = /^zh/i.test(R.getAttribute('data-asia-lang') || R.lang || '');
  var T = zh ? { feat: '大型活动', reg: '日常活动', items: '项', from: '从今天起', sort: '按日期排序', regsub: '中国大陆 · 每周固定 · 选城市', weekly: '日常活动', fav: '我的收藏', close: '关闭', search: '选择要看的活动', allA: '全部活动', allC: '全部城市', act: '活动', city: '城市', fold: '收起', exp: '展开', none: '暂无活动', favnone: '还没有收藏。点活动上的星星即可收藏。', favnote: '验证邮箱后可在其他设备恢复', back: '返回', theme: '每周舞会 · 本周专题', cats: ['探戈节', '马拉松', '探戈周末', '周年庆', '工作坊', '日常活动'], cat1: ['探戈节', '马拉松', '探戈周末', '周年庆', '工作坊'], allBig: '全部大型', allReg: '全部日常', tc: { milonga: '舞会', practilonga: '练习舞会', practica: '练习场' }, up: '近期大型', seeall: '全部大型 ›', allCity: '全部城市', today: '今天', mview: '月历', wview: '周视图', noev: '没有活动', proj: '较远的日期按每周固定时间推算，可能有变动，请向主办方确认。', WD: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], every: '每' }
    : { feat: 'Special events', reg: 'Regular events', items: '', from: 'From today', sort: 'by date', regsub: 'Mainland China · weekly · pick a city', weekly: 'regular event', fav: 'My saved events', close: 'Close', search: 'Choose events', allA: 'All events', allC: 'All cities', act: 'Events', city: 'City', fold: 'Collapse', exp: 'Expand', none: 'No events', favnone: 'No saved events yet. Tap the star on an event to save it.', favnote: 'After you verify your email, this list restores on your other devices', back: 'Back', theme: 'Weekly milonga · This week\'s theme', cats: ['Festivals', 'Marathons', 'Encuentros / Weekends', 'Anniversaries', 'Workshops', 'Regular events'], cat1: ['Festival', 'Marathon', 'Encuentro / Weekend', 'Anniversary', 'Workshop'], allBig: 'All special', allReg: 'All regular', tc: { milonga: 'Milonga', practilonga: 'Práctilonga', practica: 'Práctica' }, up: 'Upcoming special', seeall: 'See all ›', allCity: 'All cities', today: 'Today', mview: 'Month', wview: 'Week', noev: 'No events', proj: 'Later dates are projected from the weekly schedule and may change. Please confirm with the organizer.', WD: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], every: 'Every ' };
  /* v2 layout test page (2026-11-14): city chips + ★收藏 | 日常 | 大型 tabs.
     Turn on with ?v2=1 (remembered on this device), off with ?v2=0. Without the flag nothing changes. */
  var V2 = false;
  try { if (/[?&]v2=1/.test(location.search)) localStorage.setItem('atm_v2', '1'); if (/[?&]v2=0/.test(location.search)) localStorage.removeItem('atm_v2'); V2 = localStorage.getItem('atm_v2') === '1'; } catch (e) {}
  var T2 = zh ? { fav: '收藏', reg: '日常', big: '大型', other: '其他城市', hint: '点活动上的 ☆ 收藏，会显示在这里', filt: '筛选' }
    : { fav: 'Saved', reg: 'Regular', big: 'Special', other: 'Other cities', hint: 'Tap ☆ on an event to save it here', filt: 'Filter' };
  var CZ = { 'Seoul': '首尔', 'Busan': '釜山', 'Daejeon': '大田', 'Kuala Lumpur': '吉隆坡', 'Beijing': '北京', 'Hong Kong': '香港', 'Changwon': '昌原', 'Daegu': '大邱', 'Shanghai': '上海', 'Taipei': '台北', 'New Taipei': '新北', 'Zhubei': '竹北', 'Chengdu': '成都', 'Hangzhou': '杭州', 'Chongqing': '重庆', 'Tokyo': '东京', 'Osaka': '大阪', 'Guangzhou': '广州', 'Tianjin': '天津', 'Taichung': '台中', 'Tainan': '台南', 'Nanjing': '南京', 'Suzhou': '苏州', 'Bandar Seri Begawan': '斯里巴加湾', 'Penang': '槟城', 'Da Nang': '岘港', 'Miaoli': '苗栗', 'Wuhan': '武汉', 'Gunsan': '群山', 'Shenzhen': '深圳', 'Qingdao': '青岛', 'Haikou': '海口', 'Zhengzhou': '郑州', "Xi'an": '西安', 'Singapore': '新加坡', 'Bangkok': '曼谷', 'Hanoi': '河内', 'Ho Chi Minh City': '胡志明市', 'Manila': '马尼拉', 'Jakarta': '雅加达', 'Bali': '巴厘岛', 'Macau': '澳门', 'Incheon': '仁川', 'Gwangju': '光州', 'Jeju': '济州', 'Ulsan': '蔚山', 'Suwon': '水原', 'Ilsan': '一山', 'Goyang': '高阳', 'Seongnam': '城南', 'Cheongju': '清州', 'Jeonju': '全州', 'Pohang': '浦项', 'Gyeongju': '庆州', 'Kaohsiung': '高雄', 'Hsinchu': '新竹', 'Taoyuan': '桃园', 'Ulaanbaatar': '乌兰巴托', 'Phnom Penh': '金边', 'Yokohama': '横滨', 'Kyoto': '京都', 'Nagoya': '名古屋', 'Fukuoka': '福冈', 'Sapporo': '札幌', 'Kobe': '神户' };
  function fl(c) { return (zh && c === 'Taiwan') ? '台湾地区' : cn(c); }
  function cn(c) { if (c === 'Taiwan') return zh ? '台湾' : 'Taiwan'; return zh ? (CZ[c] || c) : c; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var now = new Date(), TODAY = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()), TWD = now.getDay();
  var WEEK_END = (function () { var d = new Date(now.getTime() + 6 * 864e5); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })();
  /* Regular list: one-off and monthly (regular_oneoff) stay under their weekday for the next 5 weeks, not only today+6. */
  var HORIZON = (function () { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 34); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })();
  var DATA = null, FEAT = [], REG = {}, CITIES = [];
  /* v11.7 city dropdown: mainland cities (count desc, MRU after picks), then fixed tail entries, one per region (all its cities merged).
     Add Korea/Japan later the same way, e.g. { k: 'Korea', zh: '韩国', en: 'Korea', region: 'South Korea' }. */
  var TAIL = [{ k: 'Hong Kong', zh: '香港', en: 'Hong Kong', region: 'Hong Kong' }, { k: 'Taiwan', zh: '台湾', en: 'Taiwan', region: 'Taiwan' }], MRUK = 'atm_city_mru_v1', TAILS = [];
  function tailOf(reg) { for (var i = 0; i < TAIL.length; i++) if (TAIL[i].region === reg) return TAIL[i]; return null; }
  /* 2026-11-14 ATM categories (see claude/ATM-活动分类规则.md in the ATM project):
     日常 regular = milonga | practilonga | practica; 大型 special = festival | marathon | weekend | anniversary | workshop.
     An explicit e.cat in the data wins; otherwise catOf() derives it from type + name keywords.
     Workshops: only multi-day visiting-teacher workshops are listed (local single classes are not collected).
     Anniversary: one record, shown under 大型 (tag 周年庆) AND in its city's 日常 list as a milonga with a 周年庆 badge. */
  var BIG = ['festival', 'marathon', 'weekend', 'anniversary', 'workshop'], REGK = ['milonga', 'practilonga', 'practica'];
  function nmAll(e) { return ((e.name || '') + ' ' + (e.name_zh || '') + ' ' + (e.name_en || '')).toLowerCase(); }
  function regCat(e, s) { if (/practilonga|pr[aá]ctica[ -]milonga|练习舞会|練習舞會/.test(s)) return 'practilonga'; return e.type === 'practica' ? 'practica' : 'milonga'; }
  /* Per-event decisions made in code (no R2 upload needed). Prefer e.cat in the data when the data is next published. */
  var CAT_FIX = { E123: 'workshop' }; /* Lorena & Gianpiero 台北新年探戈活动 (user, 2026-11-14) */
  function catOf(e) {
    if (e.cat && (BIG.indexOf(e.cat) >= 0 || REGK.indexOf(e.cat) >= 0)) return e.cat;
    if (CAT_FIX[e.id]) return CAT_FIX[e.id];
    var s = nmAll(e);
    if (e.kind === 'weekly') return regCat(e, s);
    if (/周年|週年|aniversario|anniversary/.test(s)) return 'anniversary';
    if (e.regular_oneoff) return regCat(e, s);
    /* Organizer's own name decides marathon vs weekend; a name with both Marathon and Festival counts as a festival (user, 2026-11-14). */
    if (/marathon|马拉松|馬拉松/.test(s) && /festival|探戈节|探戈節/.test(s)) return 'festival';
    if (/marathon|马拉松|馬拉松/.test(s)) return 'marathon';
    /* Workshop before weekend: "X Workshop & Tango Weekend" is a workshop (user, 2026-11-14). */
    if (/workshop|intensivo|masterclass|seminar|工作坊|大师课|大師課/.test(s)) return 'workshop';
    if (/weekend|encuentro|周末|週末/.test(s)) return 'weekend';
    if (/festival|探戈节|探戈節|嘉年华|嘉年華/.test(s)) return 'festival';
    if (e.type === 'marathon' || e.type === 'festival') return e.type;
    if (e.type === 'event') return 'workshop';
    return regCat(e, s);
  }
  function isBig(e) { return BIG.indexOf(catOf(e)) >= 0; }
  function regKey(e) { var k = catOf(e); return REGK.indexOf(k) >= 0 ? k : 'milonga'; }
  function isFeat(e) { return e.kind === 'event' && !e.hidden && isBig(e) && (!e.regular_oneoff || catOf(e) === 'anniversary') && (e.end || e.start || '9') >= TODAY; }
  function cat(e) { var b = BIG.indexOf(catOf(e)); return b >= 0 ? b : 5; }
  function prep(d) {
    DATA = d.filter(function (e) { return !e.hidden; });
    FEAT = DATA.filter(isFeat).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : (a.start || '9') > (b.start || '9') ? 1 : 0; });
    REG = {};
    DATA.forEach(function (e) {
      var tl = tailOf(e.region); if (e.region !== 'China' && !tl) return;
      var w = e.kind === 'weekly', o = e.kind === 'event' && (e.regular_oneoff || !isBig(e) || catOf(e) === 'anniversary') && e.start >= TODAY && e.start <= HORIZON;
      var key = tl ? tl.k : e.city; if (w || o) (REG[key] = REG[key] || []).push(e);
    });
    /* v11.7 theme merge: a regular_oneoff with theme_of=<weekly id> on that weekly's date this week replaces the weekly card for that date only */
    Object.keys(REG).forEach(function (c) { var th = {}; REG[c].forEach(function (e) { if (e.kind === 'event' && e.theme_of) th[e.theme_of + '|' + e.start] = 1; }); REG[c] = REG[c].filter(function (e) { return !(e.kind === 'weekly' && th[e.id + '|' + occOf(e)]); }); });
    var byCnt = function (a, b) { return REG[b].length - REG[a].length || (a < b ? -1 : 1); };
    TAILS = TAIL.filter(function (t) { return REG[t.k] && REG[t.k].length; });
    CITIES = Object.keys(REG).filter(function (c) { return !tailOf(REG[c][0].region); }).sort(function (a, b) { return REG[b].length - REG[a].length || (a < b ? -1 : 1); });
  }
  /* v11.8: monthly nth weekday (e.nth, -1 = last). v11.13: e.nth may be a list, e.g. [1,3] or [2,4] = twice a month; a 5th week is skipped. */ function nthHit(nth, k, last) { var a = Array.isArray(nth) ? nth : [nth]; for (var i = 0; i < a.length; i++) if (a[i] === -1 ? last : k === a[i]) return true; return false; }
  function nthAdj(e, n) { if (!e.nth) return n; for (var g = 0; g < 8; g++) { var k = Math.floor((n.getDate() - 1) / 7) + 1, last = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 7).getMonth() !== n.getMonth(); if (nthHit(e.nth, k, last)) break; n = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 7); } return n; }
  function occOf(e) { var d = nthAdj(e, new Date(now.getFullYear(), now.getMonth(), now.getDate() + rel(wdOf(e)))); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function wdOf(e) { if (e.kind === 'weekly') return (e.weekdays && e.weekdays.length ? e.weekdays[0] : e.weekday) % 7; return new Date(e.start + 'T12:00:00').getDay(); }
  function rel(w) { return (w - TWD + 7) % 7; }
  function occDate(e) { return e.kind === 'weekly' ? occOf(e) : (e.start || ''); }
  function regSorted(c) { return (REG[c] || []).slice().sort(function (a, b) { var da = occDate(a), db = occDate(b); if (da !== db) return da < db ? -1 : 1; return (a.time || '') < (b.time || '') ? -1 : 1; }); }
  function oneTag(e) { if (!(e.kind === 'event' && e.regular_oneoff)) return ''; return e.oneoff_kind === 'monthly' ? (zh ? '月度活动' : 'Monthly') : (zh ? '单次' : 'One-off'); }
  function fd(s) { return s ? s.slice(5).replace('-', '/') + (s.slice(0, 4) !== TODAY.slice(0, 4) ? '' : '') : ''; }
  function dt(e) {
    if (e.kind === 'weekly' && !e.nth && e.every === 2) return (zh ? '隔周' : 'Every other ') + T.WD[wdOf(e)] + (e.time ? ' ' + e.time : '');
    if (e.kind === 'weekly' && e.nth) return (zh ? '每月' + (e.nth === -1 ? '最后一个' : '第' + [].concat(e.nth).join('、') + '个') : (e.nth === -1 ? 'Last ' : [].concat(e.nth).map(function (x) { return x === -1 ? 'last' : ['', '1st', '2nd', '3rd', '4th', '5th'][x]; }).join(' & ') + ' ')) + T.WD[wdOf(e)] + (zh ? '' : ' monthly') + (e.time ? ' ' + e.time : '');
    if (e.kind === 'weekly') return T.every + (e.weekdays || [e.weekday]).map(function (i) { return T.WD[i % 7]; }).join('/') + (e.time ? ' ' + e.time : '');
    var s = fd(e.start) + (e.end && e.end !== e.start ? '–' + fd(e.end) : ''); if (e.start && e.start.slice(0, 4) !== TODAY.slice(0, 4)) s = e.start.slice(0, 4) + '/' + s; if (e.theme_of) s += ' ' + T.WD[new Date(e.start + 'T12:00:00').getDay()] + (e.time ? ' ' + e.time : ''); return s;
  }
  function posterUrls(p) { if (window.atmPosterUrls) return window.atmPosterUrls(p, false); var raw = String(p || ''), qi = raw.indexOf('?'), q = qi >= 0 ? raw.slice(0, qi) : raw, extra = qi >= 0 ? raw.slice(qi) : ''; var base = '/images/thumb' + q.replace(/\.(jpe?g|png|webp)$/i, ''), v = extra || '?v=t360'; var host = ''; try { host = (location && location.hostname) || ''; } catch (e) {} var abs = /\.pages\.dev$/i.test(host) ? 'https://data.tangoweekend.org' : ''; return { webp: abs + base + '.webp' + v, jpg: abs + base + '.jpg' + v, full: abs + q + (extra || '') }; }
  var SHT = (function () { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (x) { return TODAY; } })();
  /* v11.10: honor eager — first strip / LCP thumbs set src immediately (was void eager, so hydrate waited). */
  function img(e, cls, eager) {
    if (!e.poster) return '<span class="' + cls + ' ah-noimg">' + esc(cn(e.city)) + '</span>';
    var u = posterUrls(e.poster), pv = e.kind === 'weekly' && e.poster_date && e.poster_date < SHT;
    var srcset = eager ? ' srcset="' + esc(u.webp) + '"' : '';
    var src = eager ? ' src="' + esc(u.jpg) + '" data-atm-on="1"' : '';
    var pri = eager ? ' fetchpriority="high"' : '';
    return (pv ? '<span class="ah-pw">' : '') + '<picture><source type="image/webp" data-atm-srcset="' + esc(u.webp) + '"' + srcset + '><img class="' + cls + '" data-atm-src="' + esc(u.jpg) + '"' + src + ' data-full="' + esc(u.full) + '"' + pri + ' onerror="if(this.dataset.fell)return;this.dataset.fell=\'1\';var s=this.parentNode&&this.parentNode.querySelector(\'source\');if(s)s.removeAttribute(\'srcset\');if(this.dataset.full)this.src=this.dataset.full" alt="" decoding="async"></picture>' + (pv ? '<i class="ah-prev">' + (zh ? '上期海报' : 'Previous poster') + '</i></span>' : '');
  }
  /* v11.9: DJ line under time, above venue (events.dj, else poster_djs for the current poster) */
  function i18nLang() { return (window.atmI18n && window.atmI18n.langOf({ zhHint: zh })) || (zh ? 'zh' : 'en'); }
  function evName(e) { return (window.atmI18n && window.atmI18n.fieldText(e, 'name', i18nLang())) || ((zh && e.name_zh) || e.name || ''); }
  function evVenue(e) { return (window.atmI18n && window.atmI18n.fieldText(e, 'venue', i18nLang())) || (e.venue || ''); }
  function djOf(e) { var d = (window.atmI18n && window.atmI18n.pick(e, 'dj', i18nLang())) || ((!zh && e.dj_en) ? e.dj_en : e.dj); if (Array.isArray(d)) d = d.join(' / '); if (!d && e.poster && e.poster_djs) { var q = String(e.poster).split('?')[0], pd = e.poster_dates && e.poster_dates[q]; if (!pd || pd >= TODAY) d = e.poster_djs[q]; } return d ? String(d).trim() : ''; }
  /* A detail URL with a hash (edition landing) opens that anchor. Other cards stay on ?card=. */
  function openHref(e) {
    var raw = typeof e.detail === 'string' ? e.detail : '';
    var m = raw.match(/\/event\/([^\/?#]+)\/(?:[^#]*)#([A-Za-z0-9_-]+)\s*$/);
    if (!m) return location.pathname + '?card=' + encodeURIComponent(e.id);
    return '/event/' + m[1] + '/' + (zh ? 'zh/' : '') + '?from=' + encodeURIComponent(e.id) + '#' + m[2];
  }
  function normISO(s) { var m = String(s || '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); return m ? m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]) : ''; }
  /* Cancelled day is `date` when set. start/end is the show-until window (date 11/08, start 11/06 does not cancel 11/07).
     No date: start===iso, or a start–end range that is itself the cancelled dates. Hide once Shanghai today is past end/date. */
  function noticeHits(o, iso) {
    if (!o || o.status !== 'cancelled' || !iso) return false;
    var date = normISO(o.date), start = normISO(o.start), end = normISO(o.end), hit = false;
    if (date) hit = date === iso;
    else if (start && end && start !== end) { var a = start, b = end; if (b < a) { var t = a; a = b; b = t; } hit = iso >= a && iso <= b; }
    else hit = (start || end) === iso;
    if (!hit) return false;
    var until = end || date || start;
    return !until || SHT <= until;
  }
  /* Red list bar: permanent status, cancelled_dates for this occurrence, or a cancelled notice for that same date. */
  var CX_ISO = null; /* city date rail: the day being drawn, so cancelled_dates/notices match that day */
  function weekCx(e) {
    if (e.status === 'cancelled') return 'perm';
    var iso = CX_ISO || (e.kind === 'weekly' ? occOf(e) : (e.start || ''));
    if (!iso) return '';
    if (e.cancelled_dates && e.cancelled_dates.indexOf(iso) !== -1) return 'week';
    var list = e.temp_notices;
    if (Array.isArray(list)) for (var i = 0; i < list.length; i++) { if (noticeHits(list[i], iso)) return 'week'; }
    return '';
  }
  function cxBar(e) {
    var k = weekCx(e); if (!k) return '';
    var ui = window.CHINA_UI || {};
    var t = k === 'perm' ? (ui.cancelled || (zh ? '已取消' : 'Cancelled')) : (ui.cancelledWeek || (zh ? '本周暂停' : 'Paused this week'));
    return '<em class="china-cancelled-bar">' + esc(t) + '</em>';
  }
  function card(e, sub, tag, eager, big) {
    var v = (e.kind === 'weekly' || e.theme_of) ? (evVenue(e) || '') : '';
    var kt = oneTag(e), bar = cxBar(e), ck = catOf(e);
    var ct = big && isBig(e) ? '<em class="ah-ctag">' + esc(T.cat1[cat(e)]) + '</em>' : (!big && ck === 'anniversary' ? '<em class="ah-kind ah-anniv">' + esc(T.cat1[3]) + '</em>' : (!big && ck !== 'milonga' && REGK.indexOf(ck) >= 0 ? '<em class="ah-ctag ah-rtag">' + esc(T.tc[ck]) + '</em>' : ''));
    return '<a class="ah-card' + (bar ? ' ah-cx' : '') + '" data-id="' + esc(e.id) + '" href="' + openHref(e) + '">' + bar + img(e, 'ah-th', eager) + '<span class="ah-tx">' + (tag ? '<em class="ah-sugt">' + tag + '</em>' : '') + ct + (kt ? '<em class="ah-kind">' + kt + '</em>' : '') + (e.theme_of ? '<em class="ah-theme">' + T.theme + '</em>' : '') + '<b>' + esc(evName(e)) + '</b><span>' + esc(sub || dt(e)) + ' · ' + esc(cn(e.city)) + '</span>' + (djOf(e) ? '<span class="ah-dj">DJ: ' + esc(djOf(e)) + '</span>' : '') + (v ? '<span>' + esc(v) + '</span>' : '') + '</span>' + (tag ? '' : heart(e.id)) + '</a>';
  }
  /* v11.7: red heart toggle on every home card (hollow = not favorited, solid = favorited); data-fid -> asia-fav.js toggles */
  function isFav(id) { try { return JSON.parse(localStorage.getItem('atm_fav_v1') || '[]').indexOf(id) >= 0; } catch (x) { return false; } }
  function heart(id) { var on = isFav(id); var l = on ? (zh ? '取消收藏' : 'Remove from favorites') : (zh ? '收藏' : 'Add to favorites'); return '<span class="atm-heart ah-heart" role="button" tabindex="0" data-fid="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + l + '" title="' + l + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1 6.8 18.6l1-5.8L3.6 8.7l5.8-.8z"/></svg></span>'; }
  function n(x) { return zh ? x + ' ' + T.items : String(x); }
  function enUnit(n, unit) { return '<i>' + n + '</i> ' + unit + (n === 1 ? '' : 's'); }
  var root = D.createElement('div'); root.id = 'atm-home'; root.className = 'wrap';
  var css = D.createElement('style'); css.id = 'atm-home-css';
  css.textContent = 'html.atm-h-on #filters,html.atm-h-on .atm-favbar,html.atm-h-on .atm-favgrid,html.atm-h-on .atm-featstrip,html.atm-h-on #china-listings,html.atm-h-on .tw-m-feat-grid,html.atm-h-on .atm-dots,html.atm-h-on .china-results,html.atm-h-on .atm-recent,html.atm-h-on .china-global-empty,html.atm-h-on .china-date-empty{display:none!important}' +
    /* v11.8: the legacy cream square (.atm-form) is not in the HTML. #h-search chips live in #atm-home. The entry ad (#atm-pop.on) must stay visible. */
    'html.atm-h-on #atm-pop.on{display:flex!important}' +
    'html.atm-h-on body.china-page #filters .china-filters-row1.atm-form,html.atm-h-search body.china-page #filters .china-filters-row1.atm-form,html.atm-h-on body.china-page.china-presearch #filters .china-filters-row1.atm-form,html.atm-h-search body.china-page.china-presearch #filters .china-filters-row1.atm-form,html.atm-h-on body.china-page.atm-1l #filters .china-filters-row1.atm-form,html.atm-h-search body.china-page.atm-1l #filters .china-filters-row1.atm-form{display:none!important;visibility:hidden!important;pointer-events:none!important}' +
    '#atm-home{display:none;box-sizing:border-box;padding:4px 12px 40px;max-width:952px;margin:0 auto;font-family:system-ui,-apple-system,"PingFang SC","Noto Sans SC",sans-serif}html.atm-h-on #atm-home{display:block}#atm-home picture{display:contents}img[data-atm-src]:not([src]){background:#f3e6cc}' +
    '.ah-ban{display:block;width:100%;text-align:left;margin:8px 0;padding:14px;border:0;border-radius:16px;background:linear-gradient(160deg,#0E6E78,#06333A);box-shadow:0 4px 14px rgba(6,51,58,.25);cursor:pointer;color:#F6D58E}' +
    '.ah-ban-h{display:flex;justify-content:space-between;align-items:center;gap:8px}.ah-ban-copy{flex:1;min-width:0}.ah-ban-t{display:block;font:700 19px/1.3 "Noto Serif SC",serif;white-space:normal;overflow-wrap:break-word}.ah-ban-t i{font-style:normal;color:#fff}.ah-ban-s{display:block;font:600 13px system-ui;color:#cfe3e3;margin-top:2px}.ah-ban-a{font:700 30px system-ui;flex:0 0 auto;line-height:1}' +
    '.ah-strip{display:flex;gap:8px;margin-top:12px;overflow:hidden}.ah-strip img,.ah-strip .ah-noimg{width:64px;height:86px;object-fit:cover;border-radius:8px;flex:0 0 auto;border:2px solid rgba(246,213,142,.6)}@media(min-width:700px){.ah-strip img,.ah-strip .ah-noimg{width:90px;height:120px}.ah-ban-t{font-size:22px}}' +
    '.ah-div{margin:18px 0 0;height:0;border-top:2px solid #EAD7A4}.ah-h{margin:16px 0 8px;padding-bottom:6px;border-bottom:2px solid #F6D58E;display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.ah-h b{font:700 18px "Noto Serif SC",serif;color:#0A4F57}.ah-h span{font:600 12px system-ui;color:#5f6f66}' +
    '.ah-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}@media(min-width:700px){.ah-grid{grid-template-columns:repeat(5,1fr)}}' +
    '.ah-city{height:58px;border-radius:12px;background:#fff;border:1.5px solid #0E6E78;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0E6E78;cursor:pointer;font:inherit;padding:0}.ah-city b{font:700 16px system-ui}.ah-city span{font:600 12px system-ui;color:#5f6f66}' +
    'html.atm-h-inner .ah-top{display:none!important}.ah-top{display:flex;align-items:center;gap:4px;margin:6px 0 2px -8px;position:sticky;top:var(--ah-hh,72px);z-index:40;background:#FBF5E9;box-shadow:0 0 0 100vmax #FBF5E9;clip-path:inset(0 -100vmax)}.ah-back{width:44px;height:44px;border:0;background:none;font:700 28px system-ui;color:#0E6E78;cursor:pointer;padding:0}.ah-title{font:700 19px "Noto Serif SC",serif;color:#0A4F57}.ah-title i{font-style:normal;color:#C0392B}.ah-note{margin:0 0 10px 44px;color:#5f6f66;font:600 13px system-ui}' +
    '.ah-list{display:grid;grid-template-columns:1fr;gap:8px}@media(min-width:900px){#atm-home .ah-list.ah-2{grid-template-columns:1fr 1fr}}' +
    '.ah-card{display:flex;gap:10px;background:#fff;border-radius:12px;padding:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);text-decoration:none!important;color:#5b7f84;min-height:84px;align-items:flex-start}.ah-th{width:64px;height:84px;object-fit:cover;border-radius:8px;flex:0 0 auto}.ah-noimg{display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#0E6E78,#06333A);color:#F6D58E;font:700 13px serif;text-align:center}' +
    '.ah-tx{min-width:0;display:flex;flex-direction:column;gap:3px;font:13px system-ui;color:#5b7f84}.ah-tx b{font:700 15px system-ui;color:#06333A;margin-bottom:1px}' +
    '.ah-theme{align-self:flex-start;font:700 11px system-ui;font-style:normal;color:#fff;background:#C0392B;border-radius:6px;padding:2px 7px}.ah-kind{align-self:flex-start;font:700 11px system-ui;font-style:normal;color:#fff;background:#9E1020;border-radius:6px;padding:2px 7px}#atm-home .ah-fav{margin:4px 0 0;padding:0}html.atm-h-home .tw-m-feat{display:none!important}.ah-favs{flex:1;margin-left:8px;font:600 12px system-ui;color:#5f6f66}.ah-car{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.ah-car::-webkit-scrollbar{display:none}.ah-fit{position:relative;flex:0 0 78%;max-width:320px;scroll-snap-align:start}.ah-fit>.ah-card{height:100%;box-sizing:border-box}.ah-unsug{position:absolute;top:6px;right:6px;z-index:4;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer;display:flex;align-items:center;justify-content:center}.ah-unsug svg{width:20px;height:20px;display:block}.ah-unsug path{fill:none;stroke:#C8102E;stroke-width:2;stroke-linejoin:round}.ah-unsug[aria-pressed="true"] path{fill:#C8102E}.ah-sugt{align-self:flex-start;font:700 11px system-ui;font-style:normal;color:#8a6500;background:#FBEFC9;border-radius:6px;padding:1px 7px}.ah-rows{display:flex;flex-direction:column;gap:12px;margin-top:12px}.ah-rows .ah-ban{margin:0}.ah-rb{border-radius:16px;padding:14px;background:linear-gradient(160deg,#2A9AA3,#137780);box-shadow:0 4px 14px rgba(6,51,58,.25);color:#F6D58E}.ah-rb-h{display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;border:0;background:none;color:inherit;padding:0;text-align:left;font:inherit}button.ah-rb-h{cursor:pointer}.ah-rb-t{display:block;font:700 21px/1.3 "Noto Serif SC",serif;white-space:normal;overflow-wrap:break-word}.ah-rb-t i{font-style:normal}.ah-rb-s{display:block;font:600 13px system-ui;color:#F3E3D3;margin-top:3px}.ah-rb-h button.ah-ban-a{border:0;background:none;color:inherit;cursor:pointer;padding:0}.ah-rb-strip{display:flex;gap:8px;overflow-x:auto;margin-top:12px;scrollbar-width:none}.ah-rb-strip::-webkit-scrollbar{display:none}.ah-cts{display:flex;gap:8px;margin-top:12px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.ah-cts::-webkit-scrollbar{display:none}.ah-ct{position:relative;flex:0 0 auto;width:90px;height:120px;padding:0;border:0;background:none;cursor:pointer}.ah-ct img,.ah-ct-n{display:block;width:90px;height:120px;object-fit:cover;border-radius:8px;border:2px solid rgba(246,213,142,.6);box-sizing:border-box;background:#0E6E78}.ah-ct b{position:absolute;left:2px;right:2px;bottom:2px;padding:16px 4px 5px;border-radius:0 0 6px 6px;background:linear-gradient(transparent,rgba(0,0,0,.8));color:#fff;font:700 13px system-ui;text-align:center}.ah-ct-n+b{top:2px;display:flex;align-items:center;justify-content:center;background:none;padding:4px}.ah-dd{margin-top:12px}.ah-dd-b{width:100%;min-height:46px;border-radius:12px;border:1.5px solid rgba(246,213,142,.7);background:rgba(255,255,255,.14);color:#fff;font:700 16px system-ui;cursor:pointer;text-align:left;padding:0 14px}.ah-dd-l{margin-top:10px;border-top:1px solid rgba(246,213,142,.5)}.ah-dd-o{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:46px;border:0;border-bottom:1px solid rgba(255,255,255,.15);background:none;color:#fff;font:600 16px system-ui;text-align:left;padding:0 4px;cursor:pointer}.ah-dd-o::after{content:"›";color:#F6D58E;font-size:20px}.ah-dd-hr{border:0;border-top:2px solid rgba(246,213,142,.8);margin:6px 0}.ah-rb-c{flex:0 0 auto;width:72px;height:72px;border-radius:12px;border:1.5px solid rgba(246,213,142,.55);background:rgba(255,255,255,.1);color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.ah-rb-c b{font:700 16px system-ui}.ah-rb-c span{font:600 12px system-ui;color:#F6D58E}.ah-row{display:flex;align-items:center;gap:14px;min-height:80px;padding:0 18px;border:0;border-radius:18px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.08);cursor:pointer;text-align:left;font:inherit}.ah-ic{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex:0 0 auto}.ah-row-f .ah-ic{background:#06333A;color:#F6D58E}.ah-row-r .ah-ic{background:#E9F2F2}.ah-row b{flex:1;font:700 19px "Noto Serif SC",serif;color:#0A4F57}.ah-row b small{display:block;font:600 13px system-ui;color:#5f6f66;margin-top:2px}.ah-n{font:700 22px system-ui;color:#C0392B;white-space:nowrap}.ah-n small{font-size:13px}.ah-a{font:700 26px system-ui;color:#0E6E78}.ah-favh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.ah-favh b{font:700 17px "Noto Serif SC",serif;color:#0A4F57}.ah-favall{border:0;background:none;color:#0E6E78;font:700 14px system-ui;cursor:pointer;min-height:36px;padding:0 4px}.ah-fcities{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:2px 0 10px}.ah-fcities span{font:600 12px system-ui;color:#5f6f66}.ah-fcity{height:36px;padding:0 16px;border-radius:18px;border:1.5px solid #0E6E78;background:#E9F2F2;color:#0E6E78;font:700 14px system-ui;cursor:pointer}.ah-fav .ah-card{box-shadow:0 1px 5px rgba(0,0,0,.09)}.ah-wd{margin:12px 2px 6px;font:700 14px system-ui;color:#0E6E78}' +
    '.ah-sels{display:flex;gap:10px;margin-top:8px;flex-wrap:wrap}.ah-sel{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:22px;background:#0E6E78;color:#fff;font:700 15px system-ui;border:0;cursor:pointer}.ah-sel i{font-style:normal;color:#F6D58E}' +
    '.ah-rowl{font:700 15px "Noto Serif SC",serif;color:#0A4F57;margin:12px 0 8px}.ah-chips{display:flex;flex-wrap:wrap;gap:8px}.ah-chip{display:inline-flex;align-items:center;gap:5px;height:40px;padding:0 15px;border-radius:20px;border:1.5px solid transparent;background:#E9F2F2;color:#0E6E78;font:700 15px system-ui;cursor:pointer}.ah-chip small{font-weight:600;opacity:.7}.ah-chip[aria-pressed=true]{background:#F6D58E;color:#06333A;border-color:#C9A24E}' +
    '.ah-fold{margin-top:12px;border:0;background:none;color:#0E6E78;font:700 14px system-ui;cursor:pointer;padding:6px 0}' +
    '.ah-hbtn{display:inline-flex!important;align-items:center;justify-content:center;position:relative;width:40px;height:40px;margin-right:4px;border:0;background:none;color:#F6D58E;cursor:pointer;padding:0;flex:0 0 auto}.ah-hbtn svg{width:22px;height:22px}.ah-hbtn .ah-hrt{color:#ff8a80;font-size:21px;line-height:1}.ah-badge{position:absolute;top:0;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#C0392B;color:#fff;font:700 11px system-ui;display:flex;align-items:center;justify-content:center;padding:0 4px;box-sizing:border-box}.ah-badge[hidden]{display:none}' +
    'html:not(.atm-h-home) .ah-hbtn{display:none!important}' +
    '.ah-ly{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.45);display:flex;justify-content:center;align-items:flex-end}.ah-box{background:#FBF5E9;width:100%;max-height:78vh;border-radius:20px 20px 0 0;overflow:auto;padding:12px 14px 20px;box-sizing:border-box}@media(min-width:700px){.ah-ly{align-items:center}.ah-box{width:560px;max-height:80vh;border-radius:20px}}' +
    '.ah-lyh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.ah-lyh b{display:inline-flex;align-items:center;gap:6px;font:700 19px "Noto Serif SC",serif;color:#C0392B}.ah-lyh .ah-star,.ah-hfav .ah-star{width:18px;height:18px;flex:none;fill:#B3261E;stroke:none}.ah-lyh b i{font-style:normal;color:#0A4F57}.ah-x{width:44px;height:44px;border-radius:50%;background:#E9F2F2;border:0;font:700 24px system-ui;color:#0A4F57;cursor:pointer}.ah-lyn{margin-top:12px;color:#5f6f66;font:600 12px system-ui;text-align:center}' +
    '.ah-pw{position:relative;display:block;flex:0 0 auto;line-height:0}.ah-prev{position:absolute;left:2px;right:2px;bottom:4px;text-align:center;font:700 9px/1.2 system-ui,sans-serif;font-style:normal;color:#fff;background:rgba(0,0,0,.6);border-radius:6px;padding:2px 3px;white-space:nowrap;overflow:hidden;pointer-events:none}' +
    '#atm-home .ah-favhint{margin:0;padding:14px;border-radius:16px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.08);font:700 18px/1.3 "Noto Serif SC",serif;color:#0A4F57}' +
    '.ah-card{position:relative}.ah-card>.ah-tx{padding-right:34px}.ah-card>.ah-heart{top:6px;right:6px}' +
    'html.atm-h-on #china-listings .ev-card>.atm-heart{display:none!important}' +
    '#atm-home a.ah-card.ah-cx{flex-wrap:wrap;padding-top:0}#atm-home a.ah-card>.china-cancelled-bar{flex:1 0 100%;box-sizing:border-box;margin:0 -8px 0;padding:5px 28px;border-radius:12px 12px 0 0;background:#b3261e;color:#fff;font:800 13px/1.35 system-ui,-apple-system,"PingFang SC","Noto Sans SC",sans-serif;font-style:normal;letter-spacing:.03em;text-align:center}#atm-home a.ah-card.ah-cx>.ah-heart{top:34px}#atm-home .ah-rows{gap:12px;margin-top:0}#atm-home .ah-ban,#atm-home .ah-rb,#atm-home .ah-fb{display:block;box-sizing:border-box;margin:0;padding:14px 8px 16px 16px;border:0;border-radius:16px;background:linear-gradient(160deg,#0E6E78,#06333A);box-shadow:0 2px 8px rgba(6,51,58,.18);color:#F2CF7F;width:100%;text-align:left;cursor:default}#atm-home .ah-ban-h,#atm-home .ah-rb-h{display:flex;align-items:center;min-height:32px;gap:4px;padding-right:0}#atm-home .ah-ban-copy{flex:1;min-width:0;display:flex;align-items:center;gap:6px;border:0;background:none;padding:0;margin:0;color:inherit;font:inherit;text-align:left;cursor:pointer;min-height:44px}#atm-home .ah-ban-t,#atm-home .ah-rb-t{display:flex;align-items:center;flex-wrap:wrap;gap:0 6px;font-family:var(--serif);font-size:18px;line-height:24px;font-weight:700;color:#F2CF7F;white-space:normal;overflow-wrap:break-word}#atm-home .ah-ban-t i,#atm-home .ah-rb-t i{font-style:normal;color:#fff;font-variant-numeric:tabular-nums lining-nums}#atm-home .ah-suf{font-family:var(--sans);font-size:13px;line-height:18px;font-weight:500;color:#D6E6E4;margin-left:2px}#atm-home .ah-star{width:18px;height:18px;flex:none;fill:#B3261E;stroke:none}#atm-home .ah-chev{width:44px;height:44px;flex:0 0 44px;border:0;background:none;padding:0;color:#F2CF7F;cursor:pointer;display:grid;place-items:center}#atm-home .ah-chev-i{width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.12);display:grid;place-items:center}#atm-home .ah-chev-i svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}#atm-home .ah-strip,#atm-home .ah-cts{display:flex;gap:10px;margin-top:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-right:16px;scrollbar-width:none}#atm-home .ah-strip::-webkit-scrollbar,#atm-home .ah-cts::-webkit-scrollbar{display:none}@media(min-width:700px){#atm-home .ah-strip.ah-rowfit{overflow-x:hidden;padding-right:0;width:100%;max-width:none}}#atm-home .ah-pt,#atm-home button.ah-ct{flex:0 0 auto;width:84px;padding:0;border:0;background:none;cursor:pointer;color:inherit;font:inherit;text-align:left}#atm-home a.ah-pt{text-decoration:none;color:inherit;touch-action:manipulation}#atm-home .ah-pt img,#atm-home .ah-ct img,#atm-home .ah-pt-n,#atm-home .ah-ct-n,#atm-home .ah-noimg{width:84px!important;height:112px!important;object-fit:cover;border-radius:8px;border:1px solid rgba(242,207,127,.45)!important;display:block;background:#0B5C64;box-sizing:border-box}#atm-home .ah-pt-cap,#atm-home .ah-ct-cap{display:block;margin-top:6px;font-size:12.5px;line-height:16px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#atm-home .ah-pt-cap .num,#atm-home .ah-ct-cap .num{color:#F2CF7F;margin-left:4px;font-weight:600;font-variant-numeric:tabular-nums}#atm-home .ah-pt-cap2{display:block;font-size:12px;line-height:16px;color:#D6E6E4;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#atm-home .ah-prev{font-size:11px!important;line-height:14px!important;font-weight:600;background:rgba(6,51,58,.8);padding:2px 6px;border-radius:4px}#atm-home .ah-note{margin:10px 0 8px;color:#4A6B70;font:500 13px/18px var(--sans)}#atm-home .ah-title{font-family:var(--serif);font-size:19px;line-height:26px;font-weight:700;color:#0A4F57}#atm-home .ah-title i{color:#B3261E;font-style:normal;font-variant-numeric:tabular-nums}#atm-home .ah-wd{font:700 13px/18px var(--sans);color:#0E6E78;letter-spacing:.02em;margin:14px 0 6px;font-variant-numeric:tabular-nums}#atm-home .ah-list{gap:10px}#atm-home .ah-card{gap:12px;border:1px solid #EFE6D3;border-radius:12px;padding:10px;box-shadow:0 1px 2px rgba(6,51,58,.06)}#atm-home .ah-th,#atm-home .ah-card>.ah-noimg{width:64px;height:85px;border-radius:6px}#atm-home .ah-tx b{font:600 15px/22px var(--sans);color:#06333A}#atm-home .ah-tx,#atm-home .ah-tx span,#atm-home .ah-dj{font:400 13px/19px var(--sans);color:#4A6B70}#atm-home .ah-heart{width:44px;height:44px;top:6px;right:6px;display:grid;place-items:center}#atm-home .ah-heart[aria-pressed="true"] path{fill:#B3261E;stroke:#B3261E}#atm-home .ah-heart path{fill:none;stroke:#0E6E78}#atm-home .ah-heart[aria-pressed="true"] path{fill:#B3261E!important;stroke:#B3261E!important}#atm-home button.ah-ct,.ah-ct{height:auto!important;overflow:visible}#atm-home .ah-hint{margin:8px 0 0;padding:0;font:500 13px/18px var(--sans);color:#D6E6E4}.ah-favrow{display:flex;flex-direction:column;margin:0 0 12px}.ah-ly .ah-favrow>.ah-card{margin:0}.ah-ly .atm-unfav{display:block;box-sizing:border-box;width:100%;min-height:44px;margin:8px 0 0;padding:0 12px;border:1px solid #ead9b8;border-radius:12px;background:#fff;color:#0A4F57;font:700 14px/44px var(--sans);cursor:pointer}.ah-ly .ah-heart path{fill:none;stroke:#0E6E78}.ah-ly .ah-heart[aria-pressed="true"] path{fill:#B3261E!important;stroke:#B3261E!important}';
  css.textContent += '#atm-home .ah-fchips,#atm-home .ah-tchips{margin:8px 0 4px}#atm-home .ah-tchips .ah-chip{border-radius:10px;height:36px;font-size:14px}#atm-home .ah-tchips .ah-chip[aria-pressed=true]{background:#0E6E78;color:#fff;border-color:#0E6E78}' +
    '#atm-home .ah-ctag{align-self:flex-start;font:700 11px system-ui;font-style:normal;color:#8a6500;background:#FBEFC9;border-radius:6px;padding:1px 7px}#atm-home .ah-rtag{color:#0E6E78;background:#E9F2F2}#atm-home .ah-anniv{background:#8a6500}' +
    '#atm-home .ah-up{margin:10px 0 4px;padding:10px 12px;border-radius:14px;background:#FBEFC9;border:1px solid #EAD7A4}#atm-home .ah-uph{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}#atm-home .ah-uph b{font:700 15px "Noto Serif SC",serif;color:#8a6500}#atm-home .ah-upall{border:0;background:none;color:#0E6E78;font:700 13px system-ui;cursor:pointer;min-height:36px;padding:0 4px}' +
    '#atm-home .ah-upl{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}#atm-home .ah-upl::-webkit-scrollbar{display:none}#atm-home .ah-uc{flex:0 0 auto;width:210px;box-sizing:border-box;background:#fff;border-radius:10px;padding:8px 10px;text-decoration:none!important;box-shadow:0 1px 3px rgba(0,0,0,.08)}#atm-home .ah-ucd{display:block;font:600 12px system-ui;color:#8a6500}#atm-home .ah-uc b{font:700 14px/1.3 system-ui;color:#06333A;margin-top:2px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}';
  css.textContent += '#atm-home .ah-rh,#atm-home .ah-mh{display:flex;align-items:center;gap:6px;margin:12px 0 6px}#atm-home .ah-rh b,#atm-home .ah-mh b{flex:1;text-align:center;font:700 15px system-ui;color:#0A4F57}#atm-home .ah-rn{width:40px;height:36px;border:1px solid #EAD7A4;border-radius:18px;background:#fff;color:#0E6E78;font:700 20px system-ui;cursor:pointer}#atm-home .ah-rn[disabled]{opacity:.3;cursor:default}#atm-home .ah-mv{height:36px;padding:0 12px;border:1px solid #0E6E78;border-radius:18px;background:#fff;color:#0E6E78;font:700 13px system-ui;cursor:pointer}' +
    '#atm-home .ah-rail{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:4px 0 6px}#atm-home .ah-day{border:1px solid #EAD7A4;border-radius:10px;background:#fff;padding:5px 0 4px;cursor:pointer;line-height:1.2;color:#0A4F57}#atm-home .ah-day span{display:block;font:600 11px system-ui;color:#5f6f66}#atm-home .ah-day b{display:block;font:700 18px Georgia,serif}#atm-home .ah-day i{display:block;font:600 11px system-ui;font-style:normal;color:#C0392B;min-height:14px}#atm-home .ah-day[aria-pressed=true]{background:#0E6E78;border-color:#0E6E78;color:#fff}#atm-home .ah-day[aria-pressed=true] span,#atm-home .ah-day[aria-pressed=true] i{color:#F6D58E}' +
    '#atm-home .ah-mg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px}#atm-home .ah-mw{text-align:center;font:600 11px system-ui;color:#5f6f66}#atm-home .ah-md{border:1px solid #EAD7A4;border-radius:8px;background:#fff;padding:3px 0;cursor:pointer;line-height:1.15;color:#0A4F57;text-align:center}#atm-home .ah-md b{display:block;font:700 15px Georgia,serif}#atm-home .ah-md i{display:block;font:600 10px system-ui;font-style:normal;color:#C0392B;min-height:12px}#atm-home .ah-md[aria-pressed=true]{background:#E9F2F2;border-color:#0E6E78}#atm-home .ah-off{opacity:.3;border-style:dashed}' +
    '#atm-home .ah-wd{scroll-margin-top:calc(var(--ah-hh,72px) + 60px)}#atm-home .ah-wd-on{color:#fff;background:#0E6E78;border-radius:8px;padding:3px 8px;width:fit-content}#atm-home .ah-noev{font:500 13px system-ui;color:#9aa7a2;margin:0 0 4px 2px}#atm-home .ah-proj{margin:6px 0}';
  css.textContent += '#atm-home .v2-cities{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:8px 2px 4px}#atm-home .v2-cities::-webkit-scrollbar{display:none}#atm-home .v2-c{flex:0 0 auto;height:36px;font-size:14px}#atm-home .v2-c[aria-pressed=true]{background:#0E6E78;color:#fff;border-color:#0E6E78}' +
    '#atm-home .v2-tabs{display:flex;margin:8px 0 6px;border-bottom:1px solid #EAD7A4}#atm-home .v2-tabs button{flex:1;min-height:44px;border:0;background:none;font:700 16px system-ui;color:#5f6f66;border-bottom:3px solid transparent;margin-bottom:-1px;cursor:pointer}#atm-home .v2-tabs button[aria-selected=true]{color:#0A4F57;border-bottom-color:#C0392B}#atm-home .v2-oth{margin-top:18px}';
  /* v11.16 v2 compact filters: header 72→52, city chips 32px, tabs 40px, type chips one scrolling row (was 2–3 wrapped rows of 40px). */
  if (V2) { D.documentElement.classList.add('atm-v2');
    css.textContent += '@media(max-width:600px){html.atm-v2 body.china-page section.china-map-hero{padding-top:0!important;padding-bottom:0!important}html.atm-v2 body.china-page .china-map-hero .china-hero-bar{min-height:52px!important;height:52px!important;padding-top:4px!important;padding-bottom:4px!important}html.atm-v2 body.china-page .china-map-hero h1,html.atm-v2 body.china-page .china-map-hero h1 a{font-size:18px!important}html.atm-v2 .china-hero-bar .atm-burger,html.atm-v2 .china-hero-bar .atm-langbtn,html.atm-v2 .china-hero-bar .top-lang a{min-height:38px!important;height:38px!important;min-width:38px!important}}' +
      '#atm-home .v2-cities{padding:6px 2px 2px;gap:6px}#atm-home .v2-c{height:32px;padding:0 13px;font-size:14px}' +
      '#atm-home .v2-tabs{margin:4px 0 6px}#atm-home .v2-tabs button{min-height:40px;font-size:15px}' +
      '#atm-home .v2-bar{position:sticky;top:0;z-index:40}#atm-home .v2-cpill,#atm-home .v2-menub{display:none}#atm-home .v2-tl{display:flex;flex:1 1 auto;min-width:0}#atm-home .v2-tl button{flex:1 1 0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}html.v2-stuck body.china-page .china-sticky-top{visibility:hidden}html.v2-stuck #atm-home .v2-bar{background:#fff;box-shadow:0 0 0 100vmax #fff;clip-path:inset(0 -100vmax -1px);border-bottom:1px solid #e5e5e5}html.v2-stuck #atm-home .v2-tabs{height:52px;margin:0;border-bottom:0;box-sizing:border-box;overflow:hidden}html.v2-stuck #atm-home .v2-tl button{min-height:44px;font-size:14px;padding:0 2px}html.v2-stuck #atm-home .v2-fl{display:none}html.v2-stuck #atm-home .v2-cpill{display:inline-flex;align-items:center;flex:0 1 auto;max-width:76px;min-height:36px;margin-right:4px;padding:0 10px;border:0;border-radius:18px;background:#0E6E78;color:#fff;font:700 13px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}html.v2-stuck #atm-home .v2-menub{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:44px;height:44px;margin-left:2px;border:0;background:none;color:#191919;cursor:pointer}html.v2-stuck #atm-home .v2-menub svg{width:22px;height:22px}html.v2-stuck #atm-home .v2-menu{margin-top:6px}html.v2-stuck #atm-home .v2-filt{max-width:88px}html.v2-stuck #atm-home .v2-tl button{font-size:13px}@media(max-width:379px){html.v2-stuck #atm-home .v2-cpill{display:none!important}}@media(max-width:429px){html.v2-stuck #atm-home .v2-en .v2-cpill{display:none!important}}#atm-home .v2-tabs{align-items:center}#atm-home .v2-tabs button[data-v2t]{flex:1 1 0}#atm-home .v2-filt{flex:0 1 auto!important;max-width:96px;min-width:0;min-height:36px!important;height:36px;display:inline-flex;align-items:center;gap:2px;overflow:hidden;margin:0 0 0 6px;padding:0 10px;border:1px solid #EAD7A4!important;border-radius:15px;background:#fff!important;color:#5f6f66!important;font:600 13px system-ui!important;white-space:nowrap}#atm-home .v2-ft{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}#atm-home .v2-filt.v2-on{background:#9E1B32!important;border-color:#9E1B32!important;color:#fff!important}#atm-home .v2-menu{background:#fff;border:1px solid #EAD7A4;border-radius:12px;padding:10px;margin:2px 0 10px;box-shadow:0 4px 14px rgba(6,51,58,.10)}#atm-home .v2-menu .ah-chips{margin:0;gap:6px}#atm-home .v2-menu .ah-chip{height:34px;padding:0 12px;font-size:14px;font-weight:600;border-radius:8px}#atm-home .v2-menu .ah-chip small{font-size:12px}';
  }
  D.head.appendChild(css);
  var S = { a: -1, c: '', open: false };
  function route() { var h = location.hash; if (/^#v-/.test(h)) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} h = ''; } /* old #v-<id> card anchors (shared links, back from detail) -> new home, not the old list */ if (!h || h === '#') return 'home'; if (h === '#h-feat') return 'feat'; if (h === '#h-fav') return V2 ? 'fav' : 'home'; if (h === '#h-search') return 'search'; if (h === '#h-reg') return 'reg'; if (h.indexOf('#h-city-') === 0) return 'city'; return null; }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  /* v11.7 home ♥ 我的收藏 block: favorites (max 5, past one-offs hidden) + top-3 common cities (visits + favorites), hidden when empty */
  var VK = 'atm_city_visits_v1';
  function visits() { try { return JSON.parse(localStorage.getItem(VK) || '{}') || {}; } catch (e) { return {}; } }
  function visit(c) { if (!c || !REG[c]) return; var v = visits(); v[c] = (v[c] || 0) + 1; try { localStorage.setItem(VK, JSON.stringify(v)); } catch (e) {} }
  function nextOcc(e) { var w = wdOf(e), d = nthAdj(e, new Date(now.getFullYear(), now.getMonth(), now.getDate() + rel(w))); return (zh ? '下次 ' : 'Next ') + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + T.WD[w] + (e.time ? ' ' + e.time : ''); }
  /* v11.7 homepage C: favorites carousel (own, else 系统建议 from /data/suggested_favs.json, ✕ remembered) + two entry rows; city grid moved to #h-reg */
  var SUG = [], HK = 'atm_sug_hidden_v1';
  function live(e) { return e && !(e.kind === 'event' && (e.end || e.start || '9') < TODAY); } /* weekly favorites never expire; past one-offs drop out */
  function sugHidden() { try { return JSON.parse(localStorage.getItem(HK) || '[]') || []; } catch (e) { return []; } }
  function byId() { var m = {}; DATA.forEach(function (e) { m[e.id] = e; }); return m; }
  function favLive() { var m = byId(); return favIds().map(function (i) { return m[i]; }).filter(live); }
  function sugLive() { var m = byId(), h = sugHidden(); return SUG.map(function (i) { return m[i]; }).filter(function (e) { return live(e) && h.indexOf(e.id) < 0; }).sort(function (a, b) { var x = a.kind === 'weekly' ? occOf(a) : a.start || '9', y = b.kind === 'weekly' ? occOf(b) : b.start || '9'; return x < y ? -1 : 1; }); } /* by next occurrence */
  function themed(e) { if (e.kind !== 'weekly') return null; var o = occOf(e), t = null; DATA.forEach(function (x) { if (x.theme_of === e.id && x.start === o) t = x; }); return t; }
  /* v11.8b: home 我的收藏 block is off unless intentionally enabled (window.ATM_HOME_FAV = true, or localStorage atm_home_fav_on = '1') */
  function favOn() { try { return JSON.parse(localStorage.getItem('atm_fav_v1') || '[]').length > 0; } catch (e) { return false; } } /* RULE (user, 2026-11-04 — keep in future redesigns): home 我的收藏 row shows only when the user has ≥1 favorite (localStorage atm_fav_v1); never show 系统建议/suggested cards; ignore atm_home_fav_on. With 0 favorites, show one small hint line instead: zh「点 ❤️ 收藏活动，会显示在这里」/ en "Tap ❤️ to save events here"; the hint disappears once a favorite exists. Fav posters follow the 上期海报/Previous poster badge rule (poster_date < today, Asia/Shanghai). */
  function listedSaved() {
    var n = -1, f = 0;
    if (window.ATM_STAR && typeof window.ATM_STAR.listed === 'function') {
      n = window.ATM_STAR.listed();
      if (typeof n !== 'number' || n < 0) n = -1;
    }
    try { f = favIds().length; } catch (e) { f = 0; }
    if (n > 0) return n;
    if (f > 0) return f;
    return n >= 0 ? n : 0;
  }
  function favLine(n) { return zh ? ('☆ 已收藏 ' + n + ' 个活动') : ('☆ ' + n + ' saved event' + (n === 1 ? '' : 's')); }
  function favTitle(n) { return zh ? ('已收藏 <i>' + n + '</i> 个活动') : ('<i>' + n + '</i> saved event' + (n === 1 ? '' : 's')); }
  function chev(attr, label) {
    return '<button type="button" class="ah-chev" ' + attr + ' aria-label="' + label + '"><span class="ah-chev-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span></button>';
  }
  function starIc() { return '<svg class="ah-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1 6.8 18.6l1-5.8L3.6 8.7l5.8-.8z"/></svg>'; }
  function capWhen(e) {
    var s = e.kind === 'weekly' ? occOf(e) : (e.start || '');
    if (!s) return '';
    if (s.slice(0, 4) !== TODAY.slice(0, 4)) return s.slice(0, 4);
    return fd(s);
  }
  /* 11.9.23: homepage poster/thumbnail opens this event's P10 card on the current language path.
     Same image markup as before (no extra request). Same tab. Titles and › stay on their own buttons. */
  function cardPageHref(e) { return location.pathname + '?card=' + encodeURIComponent(e.id); }
  function evThumb(e, eager) {
    var name = evName(e) || e.id;
    return '<a class="ah-pt" href="' + esc(cardPageHref(e)) + '" data-card="' + esc(e.id) + '" aria-label="' + esc(name) + '">' + img(e, '', eager) + (capWhen(e) ? '<span class="ah-pt-cap num">' + esc(capWhen(e)) + '</span>' : '') + (e.city ? '<span class="ah-pt-cap2">' + esc(cn(e.city)) + '</span>' : '') + '</a>';
  }
  function favBlock() {
    var list = favLive();
    var n = Math.max(listedSaved(), list.length);
    var strip = list.length ? '<div class="ah-strip">' + list.map(function (e, i) { return evThumb(e, i < 2); }).join('') + '</div>' : '';
    var hint = list.length ? '' : '<div class="ah-hint">' + (zh ? '点活动上的星星即可收藏' : 'Tap the star on an event to save it.') + '</div>';
    var lab = zh ? '我的收藏' : 'Saved events';
    return '<div class="ah-fb"><div class="ah-rb-h"><button type="button" class="ah-ban-copy" data-fav="1" aria-label="' + lab + '">' + starIc() + '<span class="ah-rb-t">' + favTitle(n) + '</span></button>' + chev('data-fav="1"', lab) + '</div>' + hint + strip + '</div>';
  }
  function home() {
    var tileN = CITIES.length + TAILS.length;
    var featHd = zh
      ? '大型活动 <i>' + FEAT.length + '</i> 个<span class="ah-suf">· 按日期</span>'
      : enUnit(FEAT.length, 'special event') + '<span class="ah-suf">· by date</span>';
    var regHd = zh
      ? '<i>' + tileN + '</i> 个城市日常活动'
      : 'Regular events in <i>' + tileN + '</i> ' + (tileN === 1 ? 'city' : 'cities');
    var tiles = '<div class="ah-cts">' + ordered(CITIES).concat(TAILS.map(function (t) { return t.k; })).map(function (c, i) { return cthumb(c, i < 4); }).join('') + '</div>';
    var featStrip = '<div class="ah-strip">' + FEAT.filter(function (e) { return e.poster; }).map(function (e, i) { return evThumb(e, i < 2); }).join('') + '</div>';
    return '<div class="ah-rows">' +
      favBlock() +
      '<div class="ah-ban"><div class="ah-ban-h"><button type="button" class="ah-ban-copy" data-go="#h-feat"><span class="ah-ban-t">' + featHd + '</span></button>' + chev('data-go="#h-feat"', T.feat) + '</div>' + featStrip + '</div>' +
      '<div class="ah-rb"><div class="ah-rb-h"><span class="ah-ban-copy" style="cursor:default"><span class="ah-rb-t">' + regHd + '</span></span>' + chev('data-go="#h-reg"', T.allC) + '</div>' + tiles + '</div></div>';
  }
  function mru() { try { var a = JSON.parse(localStorage.getItem(MRUK) || '[]'); return Array.isArray(a) ? a.filter(function (c) { return REG[c]; }) : []; } catch (e) { return []; } }
  function pick(c) { if (!REG[c] || tailOf(REG[c][0].region)) return; /* tail entries stay last, no MRU */ var a = mru().filter(function (x) { return x !== c; }); a.unshift(c); try { localStorage.setItem(MRUK, JSON.stringify(a.slice(0, 20))); } catch (e) {} }
  function ordered(list) { var m = mru(); return list.filter(function (c) { return m.indexOf(c) >= 0; }).sort(function (a, b) { return m.indexOf(a) - m.indexOf(b); }).concat(list.filter(function (c) { return m.indexOf(c) < 0; })); }
  /* v11.7 city thumbs: small pre-resized webp (180px, q70) made from an existing poster of one of the city's weekly events; no poster -> teal tile */
  var CTH = { Shanghai: 'shanghai', Beijing: 'beijing', Guangzhou: 'guangzhou', Tianjin: 'tianjin', Qingdao: 'qingdao', Shenzhen: 'shenzhen', Haikou: 'haikou', 'Hong Kong': 'hongkong' };
  function cthumb(c, eager) {
    var im = '';
    if (CTH[c]) {
      var cu = '/images/citythumb/' + CTH[c] + '.webp';
      im = eager
        ? '<img src="' + cu + '" data-atm-src="' + cu + '" data-atm-on="1" alt="" decoding="async" width="84" height="112" fetchpriority="low">'
        : '<img data-atm-src="' + cu + '" alt="" decoding="async" width="84" height="112">';
    } else im = '<span class="ah-ct-n"></span>';
    return '<button type="button" class="ah-ct" data-city="' + esc(c) + '" data-pick="1" aria-label="' + esc(fl(c)) + (zh ? '（' + REG[c].length + '）' : ' (' + REG[c].length + ')') + '">' + im + '<span class="ah-ct-cap">' + esc(fl(c)) + '<span class="num">' + REG[c].length + '</span></span></button>';
  }
  function opt(c) { return '<button type="button" class="ah-dd-o" role="option" data-city="' + esc(c) + '" data-pick="1">' + esc(fl(c)) + (zh ? '（' + REG[c].length + '）' : ' (' + REG[c].length + ')') + '</button>'; }
  function ddHtml() {
    var o = S.dd ? '<div class="ah-dd-l" role="listbox">' + ordered(CITIES).map(opt).join('') + (TAILS.length ? '<hr class="ah-dd-hr">' : '') + TAILS.map(function (t) { return opt(t.k); }).join('') + '</div>' : '';
    return '<button type="button" class="ah-dd-b" data-dd="1" aria-haspopup="listbox" aria-expanded="' + !!S.dd + '">' + (zh ? '选城市' : 'Choose city') + ' ' + (S.dd ? '▴' : '▾') + '</button>' + o;
  }
  function regView() {
    var g = CITIES.map(function (c) { return '<button type="button" class="ah-city" data-city="' + esc(c) + '"><b>' + esc(fl(c)) + '</b><span>' + n(REG[c].length) + '</span></button>'; }).join('');
    return top(T.reg + ' <i>' + CITIES.length + '</i>' + (zh ? ' 城' : (CITIES.length === 1 ? ' city' : ' cities'))) + '<div class="ah-note">' + T.regsub + '</div><div class="ah-grid">' + g + '</div>';
  }
  function top(t) { return '<div class="ah-top"><button type="button" class="ah-back" data-go="" aria-label="' + T.back + '">‹</button><span class="ah-title">' + t + '</span></div>'; }
  function inCity(e, c) { var tl = null; for (var i = 0; i < TAIL.length; i++) if (TAIL[i].k === c) tl = TAIL[i]; return tl ? e.region === tl.region : e.city === c; }
  function fch(on, attr, val, t, k) { return '<button type="button" class="ah-chip" ' + attr + '="' + esc(val) + '" aria-pressed="' + on + '">' + (on && !V2 ? '✓ ' : '') + esc(t) + '<small>' + k + '</small></button>'; } /* v2: no ✓, the filled chip already shows the pick */
  function feat() {
    var fc = S.fc == null ? -1 : S.fc, base = S.fcity ? FEAT.filter(function (e) { return inCity(e, S.fcity); }) : FEAT;
    var L = base.filter(function (e) { return fc < 0 || cat(e) === fc; });
    var chips = '<div class="ah-chips ah-fchips">' + fch(fc < 0, 'data-fc', -1, T.allBig, base.length) + BIG.map(function (k, i) { return fch(fc === i, 'data-fc', i, T.cat1[i], base.filter(function (e) { return cat(e) === i; }).length); }).join('') + '</div>';
    var cityRow = S.fcity ? '<div class="ah-sels"><button type="button" class="ah-sel" data-fcity="1">' + esc(cn(S.fcity)) + ' <i>✕</i></button></div>' : '';
    var ttl = (S.fcity ? esc(cn(S.fcity)) + ' · ' : '') + (zh ? T.feat + ' <i>' + L.length + '</i> ' + T.items : enUnit(L.length, 'special event'));
    SHELL_T = ttl;
    return top(ttl) + cityRow + chips + '<div class="ah-note">' + T.from + '</div><div class="ah-list ah-2">' + (L.map(function (e, i) { return card(e, null, null, i < 2, true); }).join('') || '<p>' + T.none + '</p>') + '</div>';
  }
  function upBlock(c) {
    var ups = FEAT.filter(function (e) { return inCity(e, c); }).slice(0, 3);
    if (!ups.length) return '';
    return '<div class="ah-up"><div class="ah-uph"><b>' + T.up + ' · ' + esc(cn(c)) + '</b><button type="button" class="ah-upall" data-upall="' + esc(c) + '">' + T.seeall + '</button></div><div class="ah-upl">' +
      ups.map(function (e) { return '<a class="ah-uc" href="' + esc(openHref(e)) + '" data-card="' + esc(e.id) + '"><span class="ah-ucd">' + esc(dt(e)) + ' · ' + esc(T.cat1[cat(e)]) + '</span><b>' + esc(evName(e)) + '</b></a>'; }).join('') + '</div></div>';
  }
  /* v11.12 city date rail: 7 days from S.st (days after today, 0..MAXD), ‹ › = ±7, month grid picks a start day,
     tapping a day in the rail scrolls to it. Weekly events are projected (weekdays, nth); one-offs by start..end. */
  var MAXD = 90, SHELL_T = '';
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayAt(off) { return new Date(now.getFullYear(), now.getMonth(), now.getDate() + off); }
  function nthOk(e, d) { if (!e.nth) return true; var k = Math.floor((d.getDate() - 1) / 7) + 1, last = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getMonth() !== d.getMonth(); return nthHit(e.nth, k, last); }
  function cityPool(c) { return DATA.filter(function (e) { if (!inCity(e, c) || (e.region !== 'China' && !tailOf(e.region))) return false; return e.kind === 'weekly' || (e.kind === 'event' && (e.regular_oneoff || !isBig(e) || catOf(e) === 'anniversary')); }); }
  function onDay(e, d, iso, th) {
    if (e.kind === 'weekly') { var w = (e.weekdays && e.weekdays.length ? e.weekdays : [e.weekday]).map(function (x) { return x % 7; }); return w.indexOf(d.getDay()) >= 0 && nthOk(e, d) && !th[e.id + '|' + iso]; }
    return !!e.start && e.start <= iso && iso <= (e.end || e.start);
  }
  function dayList(pool, th, d, tc) { var iso = isoOf(d); return pool.filter(function (e) { return onDay(e, d, iso, th) && (!tc || regKey(e) === tc); }).sort(function (a, b) { return (a.time || '') < (b.time || '') ? -1 : 1; }); }
  function monthLabel(d) { return zh ? d.getFullYear() + '年' + (d.getMonth() + 1) + '月' : (d.getMonth() + 1) + '/' + d.getFullYear(); }
  function cityView(c, bodyOnly) {
    var st = Math.max(0, Math.min(MAXD - 6, S.st || 0)), pool = cityPool(c), th = {}, tc = S.tc || '', days = [];
    pool.forEach(function (e) { if (e.kind === 'event' && e.theme_of) th[e.theme_of + '|' + e.start] = 1; });
    for (var i = 0; i < 7; i++) days.push(dayAt(st + i));
    var cnt = { milonga: 0, practilonga: 0, practica: 0 }, allN = 0;
    days.forEach(function (d) { dayList(pool, th, d, '').forEach(function (e) { cnt[regKey(e)]++; allN++; }); });
    if (tc && !cnt[tc]) tc = '';
    var per = days.map(function (d) { return dayList(pool, th, d, tc); }), total = 0, out = '';
    per.forEach(function (L, i) {
      var d = days[i], iso = isoOf(d); total += L.length;
      out += '<div class="ah-wd' + (S.jd === iso ? ' ah-wd-on' : '') + '" id="ahd-' + iso + '">' + (iso === TODAY ? T.today + ' · ' : '') + T.WD[d.getDay()] + ' ' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '</div>';
      if (!L.length) out += '<div class="ah-noev">' + T.noev + '</div>';
      L.forEach(function (e) { CX_ISO = iso; out += card(e); CX_ISO = null; });
    });
    var nav = S.mv ? '' : '<div class="ah-rh"><button type="button" class="ah-rn" data-wk="-1" aria-label="prev"' + (st <= 0 ? ' disabled' : '') + '>‹</button><b>' + monthLabel(days[0]) + '</b><button type="button" class="ah-rn" data-wk="1" aria-label="next"' + (st >= MAXD - 6 ? ' disabled' : '') + '>›</button><button type="button" class="ah-mv" data-mv="1">' + (S.mv ? T.wview : T.mview) + '</button></div>';
    var rail;
    if (S.mv) {
      var base = new Date(now.getFullYear(), now.getMonth() + (S.mo || 0), 1), y = base.getFullYear(), m = base.getMonth(), dim = new Date(y, m + 1, 0).getDate(), t0 = dayAt(0);
      rail = '<div class="ah-mh"><button type="button" class="ah-rn" data-mo="-1"' + ((S.mo || 0) <= 0 ? ' disabled' : '') + '>‹</button><b>' + monthLabel(base) + '</b><button type="button" class="ah-rn" data-mo="1"' + ((S.mo || 0) >= 3 ? ' disabled' : '') + '>›</button><button type="button" class="ah-mv" data-mv="1">' + T.wview + '</button></div><div class="ah-mg">';
      for (var w = 0; w < 7; w++) rail += '<span class="ah-mw">' + (zh ? T.WD[w].slice(-1) : T.WD[w].slice(0, 2)) + '</span>';
      for (var q = 0; q < base.getDay(); q++) rail += '<span></span>';
      for (var dd = 1; dd <= dim; dd++) {
        var dt0 = new Date(y, m, dd), off = Math.round((dt0 - t0) / 864e5);
        if (off < 0 || off > MAXD) { rail += '<span class="ah-md ah-off"><b>' + dd + '</b></span>'; continue; }
        var k = dayList(pool, th, dt0, tc).length;
        rail += '<button type="button" class="ah-md" data-st="' + off + '" aria-pressed="' + (off >= st && off < st + 7) + '"><b>' + dd + '</b><i>' + (k || '') + '</i></button>';
      }
      rail += '</div>';
    } else {
      rail = '<div class="ah-rail">' + days.map(function (d, i) { var iso = isoOf(d); return '<button type="button" class="ah-day" data-jump="' + iso + '" aria-pressed="' + (S.jd === iso) + '"><span>' + (iso === TODAY ? T.today : T.WD[d.getDay()].replace('周', '')) + '</span><b>' + d.getDate() + '</b><i>' + (per[i].length || '') + '</i></button>'; }).join('') + '</div>';
    }
    var chips = S.open ? '<div class="ah-chips" style="margin-top:10px">' + CITIES.map(function (x) { return '<button type="button" class="ah-chip" data-city="' + esc(x) + '" aria-pressed="' + (x === c) + '">' + (x === c ? '✓ ' : '') + esc(fl(x)) + '<small>' + REG[x].length + '</small></button>'; }).join('') + '</div><button type="button" class="ah-fold" data-tog="1">' + T.fold + ' ▴</button>' : '';
    var tchips = '<div class="ah-chips ah-tchips">' + fch(!tc, 'data-tc', '', T.allReg, allN) + REGK.map(function (k) { return cnt[k] ? fch(tc === k, 'data-tc', k, T.tc[k], cnt[k]) : ''; }).join('') + '</div>';
    SHELL_T = esc(cn(c)) + ' · ' + (zh ? T.weekly + ' <i>' + total + '</i> ' + T.items : enUnit(total, T.weekly));
    var proj = st + 6 >= 14 ? '<div class="ah-note ah-proj">' + T.proj + '</div>' : '';
    if (bodyOnly) { V2MENU = tchips; V2TC = tc; return upBlock(c) + nav + rail + proj + '<div class="ah-list" style="margin-top:6px">' + out + '</div>'; }
    return top(esc(cn(c)) + ' · ' + (zh ? T.weekly + ' <i>' + total + '</i> ' + T.items : enUnit(total, T.weekly))) + '<div class="ah-sels"><button type="button" class="ah-sel" data-tog="1" aria-expanded="' + S.open + '">' + esc(cn(c)) + ' <i>' + (S.open ? '▴' : '▾') + '</i></button></div>' + chips + upBlock(c) + nav + rail + tchips + proj + '<div class="ah-list" style="margin-top:6px">' + out + '</div>';
  }
  function srchSet(a) { if (a === 5) { var r = []; CITIES.forEach(function (c) { r = r.concat(REG[c].filter(function (e) { return e.kind === 'weekly'; })); }); return r; } return FEAT.filter(function (e) { return a < 0 || cat(e) === a; }); }
  function search() {
    var base = srchSet(S.a), cc = {}, cl = [];
    base.forEach(function (e) { if (!cc[e.city]) { cc[e.city] = 0; cl.push(e.city); } cc[e.city]++; });
    cl.sort(function (a, b) { return cc[b] - cc[a] || (a < b ? -1 : 1); });
    if (S.c && !cc[S.c]) S.c = '';
    var res = base.filter(function (e) { return !S.c || e.city === S.c; });
    if (S.a === 5) res.sort(function (a, b) { return rel(wdOf(a)) - rel(wdOf(b)); });
    var an = S.a < 0 ? T.allA : T.cats[S.a], ctn = S.c ? cn(S.c) : T.allC;
    var h = top(T.search) + '<div class="ah-sels"><button type="button" class="ah-sel" data-tog="1" aria-expanded="' + S.open + '">' + esc(an) + ' <i>' + (S.open ? '▴' : '▾') + '</i></button><button type="button" class="ah-sel" data-tog="1" aria-expanded="' + S.open + '">' + esc(ctn) + ' <i>' + (S.open ? '▴' : '▾') + '</i></button></div>';
    if (S.open) {
      var ch = function (on, attr, val, t, k) { return '<button type="button" class="ah-chip" ' + attr + '="' + esc(val) + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + esc(t) + '<small>' + k + '</small></button>'; };
      h += '<div class="ah-rowl">' + T.act + '</div><div class="ah-chips">' + ch(S.a < 0, 'data-a', -1, T.allA, FEAT.length) + T.cats.map(function (t, i) { return ch(S.a === i, 'data-a', i, t, srchSet(i).length); }).join('') + '</div>' +
        '<div class="ah-div" style="margin-top:14px"></div><div class="ah-rowl">' + T.city + '</div><div class="ah-chips">' + ch(!S.c, 'data-c', '', T.allC, base.length) + cl.map(function (c) { return ch(S.c === c, 'data-c', c, fl(c), cc[c]); }).join('') + '</div><button type="button" class="ah-fold" data-tog="1">' + T.fold + ' ▴</button>';
    }
    h += '<div class="ah-h" style="margin-top:20px"><b>' + esc(an) + ' · ' + esc(ctn) + ' <i style="font-style:normal;color:#C0392B">' + res.length + '</i>' + (zh ? ' ' + T.items : ' ' + (res.length === 1 ? 'event' : 'events')) + '</b><span>' + T.from + ' · ' + T.sort + '</span></div><div class="ah-list ah-2">' + (res.map(function (e) { return card(e); }).join('') || '<p>' + T.none + '</p>') + '</div>';
    return h;
  }
  /* ---- v2 layout ---- */
  function v2Guess() { var v = visits(), best = '', n = 0; Object.keys(v).forEach(function (c) { if (REG[c] && v[c] > n) { n = v[c]; best = c; } }); return best || (REG.Beijing ? 'Beijing' : CITIES[0]); }
  function v2Chips(cur) { return '<div class="v2-cities">' + ordered(CITIES).concat(TAILS.map(function (t) { return t.k; })).map(function (c) { return '<button type="button" class="ah-chip v2-c" data-v2c="' + esc(c) + '" aria-pressed="' + (c === cur) + '">' + esc(fl(c)) + '</button>'; }).join('') + '</div>'; }
  function v2Tabs(t) { /* v11.22: plain tabs in their own tablist; 「筛选 ▾」 (日常 / 大型) toggles the type menu; in the frozen bar a city pill and ≡ join the row */
    var tabs = ['fav', 'reg', 'big'].map(function (k) { var lb = k === 'fav' ? '★<span class="v2-fl"> ' + esc(T2.fav) + '</span>' : esc(k === 'reg' ? T2.reg : T2.big); return '<button type="button" role="tab" data-v2t="' + k + '" aria-selected="' + (k === t) + '"' + (k === 'fav' ? ' aria-label="' + esc(T2.fav) + '"' : '') + '>' + lb + '</button>'; }).join('');
    var pick = t === 'big' && S.fc != null && S.fc >= 0 ? T.cat1[S.fc] : t === 'reg' && V2TC ? T.tc[V2TC] : '';
    var f = t === 'fav' ? '' : '<button type="button" class="v2-filt' + (pick ? ' v2-on' : '') + '" data-v2f="1" aria-controls="v2-menu" aria-expanded="' + (S.v2m === t) + '"><span class="v2-ft">' + esc(pick || T2.filt) + '</span> ' + (S.v2m === t ? '▴' : '▾') + '</button>';
    var cn0 = fl(S.v2c || ''), cp = '<button type="button" class="v2-cpill" data-v2top="1" aria-label="' + esc(cn0 + (zh ? '：回到顶部换城市' : ': back to top to change city')) + '">' + esc(cn0) + ' ▾</button>';
    var mb = '<button type="button" class="v2-menub" data-v2burger="1" aria-haspopup="menu" aria-label="' + (zh ? '菜单' : 'Menu') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
    return '<div class="v2-tabs' + (zh ? '' : ' v2-en') + '">' + cp + '<div class="v2-tl" role="tablist">' + tabs + '</div>' + f + mb + '</div>'; }
  var V2TC = '';
  function v2Top() { if (!R.classList.contains('v2-stuck')) return; var c = root.querySelector('.v2-cities'); if (c) window.scrollTo(0, c.getBoundingClientRect().bottom + (scrollY || 0) + 1); }
  var V2MENU = '';
  function v2Group(list, c, dateOf, big) {
    var away = function (e) { return inCity(e, c) ? 0 : 1; };
    list = list.slice().sort(function (a, b) { var x = dateOf(a), y = dateOf(b); return away(a) - away(b) || (x < y ? -1 : x > y ? 1 : 0); });
    var h = '', shown = !list.some(function (e) { return !away(e); }); /* no 其他城市 header when nothing is in this city */
    list.forEach(function (e) { if (away(e) && !shown) { shown = true; h += '<div class="ah-wd v2-oth">' + T2.other + '</div>'; } h += card(e, null, null, false, big); });
    return h;
  }
  function v2Fav(c) { var L = favLive(); if (!L.length) return '<div class="ah-favhint">' + T2.hint + '</div>'; return '<div class="ah-list">' + v2Group(L, c, occDate, false) + '</div>'; }
  function v2Big(c) {
    var fc = S.fc == null ? -1 : S.fc, L = FEAT.filter(function (e) { return fc < 0 || cat(e) === fc; });
    var chips = '<div class="ah-chips ah-fchips">' + fch(fc < 0, 'data-fc', -1, T.allBig, FEAT.length) + BIG.map(function (k, i) { var n0 = FEAT.filter(function (e) { return cat(e) === i; }).length; return n0 || fc === i ? fch(fc === i, 'data-fc', i, T.cat1[i], n0) : ''; }).join('') + '</div>';
    V2MENU = chips;
    return '<div class="ah-note">' + T.from + '</div><div class="ah-list ah-2">' + (v2Group(L, c, function (e) { return e.start || '9'; }, true) || '<p>' + T.none + '</p>') + '</div>';
  }
  function v2View(r, c) {
    if (r === 'city' && c) S.v2c = c;
    if (!S.v2c || !REG[S.v2c]) S.v2c = v2Guess();
    var t = r === 'fav' ? 'fav' : r === 'feat' ? 'big' : 'reg', cur = S.v2c;
    V2TC = ''; var body = t === 'fav' ? v2Fav(cur) : t === 'big' ? v2Big(cur) : cityView(cur, true);
    S.v2t = t; if (S.v2m !== t) S.v2m = null;
    var menu = S.v2m && V2MENU ? '<div class="v2-menu" id="v2-menu">' + V2MENU + '</div>' : ''; V2MENU = '';
    return v2Chips(cur) + '<div class="v2-bar">' + v2Tabs(t) + menu + '</div>' + body;
  }
  var lastR = null, lastC = '';
  function hh() { var h = D.querySelector('.china-sticky-top'); if (h) R.style.setProperty('--ah-hh', Math.max(0, Math.round(h.getBoundingClientRect().bottom)) + 'px'); } /* T row pinned under H */
  var hhq = 0; function hhLater() { if (!hhq) { hhq = 1; requestAnimationFrame(function () { hhq = 0; hh(); }); } }
  addEventListener('resize', hhLater); addEventListener('scroll', hhLater, { passive: true });
  /* First featured thumb is often LCP on mobile home; ask the browser early. */
  function preloadLcpPoster() {
    var e = null, i;
    for (i = 0; i < FEAT.length; i++) if (FEAT[i] && FEAT[i].poster) { e = FEAT[i]; break; }
    if (!e) return;
    var u = posterUrls(e.poster), href = u.webp;
    var existing = D.querySelector('link[data-atm-lcp]');
    if (existing) {
      if (existing.getAttribute('href') === href) return;
      existing.setAttribute('href', href);
      return;
    }
    var l = D.createElement('link');
    l.rel = 'preload'; l.as = 'image'; l.href = href; l.type = 'image/webp';
    l.setAttribute('data-atm-lcp', '1');
    try { l.setAttribute('fetchpriority', 'high'); } catch (x) {}
    D.head.appendChild(l);
  }
  function paintShell(r, c) {
    var bar = D.querySelector('.china-hero-bar'); if (!bar) return;
    var back = D.getElementById('atm-p2-back');
    var title = D.getElementById('atm-p2-title');
    if (!back) {
      back = D.createElement('button');
      back.id = 'atm-p2-back'; back.type = 'button'; back.className = 'atm-p2-back';
      back.setAttribute('aria-label', T.back);
      back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      bar.insertBefore(back, bar.firstChild);
      back.addEventListener('click', function () {
        if ((location.hash === '#h-feat' || /^#h-city-/.test(location.hash)) && !((prevHash === '' || prevHash === '#') && history.length > 1)) { history.pushState(null, '', location.pathname); render(); }
        else if (history.length > 1 && lastFromHome) history.back();
        else { history.pushState(null, '', location.pathname); render(); }
      });
    }
    if (!title) { title = D.createElement('span'); title.id = 'atm-p2-title'; title.className = 'atm-p2-title'; back.insertAdjacentElement('afterend', title); }
    var html = '';
    if ((r === 'feat' || r === 'city') && SHELL_T) html = SHELL_T;
    else if (r === 'feat') html = zh ? T.feat + ' <i>' + FEAT.length + '</i> ' + T.items : enUnit(FEAT.length, 'featured event');
    else if (r === 'reg') html = T.reg + ' <i>' + CITIES.length + '</i>' + (zh ? ' 城' : (CITIES.length === 1 ? ' city' : ' cities'));
    else if (r === 'city' && c) { var L = REG[c] ? regSorted(c) : []; html = esc(cn(c)) + ' · ' + (zh ? T.weekly + ' <i>' + L.length + '</i> ' + T.items : enUnit(L.length, T.weekly)); }
    title.innerHTML = html;
  }
  function narrowStrip() { return window.matchMedia('(max-width:699px)').matches; }
  /* Desktop shows a full row of whole cards. Mobile keeps the horizontal scroll and every card. */
  function fitStrips() {
    var mobile = narrowStrip();
    D.querySelectorAll('#atm-home .ah-strip').forEach(function (strip) {
      var kids = [].slice.call(strip.children);
      if (!kids.length) return;
      strip.classList.toggle('ah-rowfit', !mobile);
      kids.forEach(function (el) { el.hidden = false; });
      if (mobile) return;
      var gap = parseFloat(getComputedStyle(strip).columnGap || getComputedStyle(strip).gap) || 10;
      var avail = strip.clientWidth, used = 0, n = 0, i;
      if (!avail) return;
      for (i = 0; i < kids.length; i++) {
        var w = kids[i].offsetWidth || 84;
        var next = n ? used + gap + w : w;
        if (n && next > avail + 0.5) break;
        used = next;
        n++;
      }
      if (!n) n = 1;
      for (i = n; i < kids.length; i++) kids[i].hidden = true;
    });
  }
  addEventListener('resize', function () { if (route() === 'home') fitStrips(); });
  var rendering = false;
  function render() { if (rendering) return; rendering = true; try { hh();
    var r = route(); R.classList.toggle('atm-h-on', !!r && !!DATA); R.classList.toggle('atm-h-home', !!r && r !== 'search'); R.classList.toggle('atm-h-search', r === 'search' && !!DATA); R.classList.toggle('atm-h-inner', r === 'feat' || r === 'reg' || r === 'city'); hhLater(); /* P2: cream 56px bar keeps menu */
    if (!r || !DATA) return;
    if (r !== lastR) { S.open = false; S.st = 0; S.mv = false; S.jd = ''; S.mo = 0; }
    var c = r === 'city' ? decodeURIComponent(location.hash.slice(8)) : '';
    var v2on = V2 && (r === 'home' || r === 'city' || r === 'feat' || r === 'fav');
    if (v2on) { R.classList.remove('atm-h-inner'); R.classList.add('atm-h-home'); } else { R.classList.remove('v2-stuck'); S.v2m = null; }
    root.innerHTML = v2on ? v2View(r, c) : r === 'home' ? home() : r === 'feat' ? feat() : r === 'search' ? search() : r === 'reg' ? regView() : cityView(c);
    if (r === 'home' || r === 'feat') preloadLcpPoster();
    if (window.atmArmImages) window.atmArmImages(root);
    if (r === 'home') { fitStrips(); requestAnimationFrame(fitStrips); }
    paintShell(v2on ? 'home' : r, c);
    root.setAttribute('data-view', r);
    if (r === 'city' && (r !== lastR || c !== lastC)) visit(c); lastC = c;
    if (r !== lastR) window.scrollTo(0, 0);
    lastR = r;
    p7consume();
    if (ly) refreshFavPanel();
  } finally { rendering = false; }
  }
  /* v11.21: when the tab row reaches the top it lays over the white scrolled header: one 52px frozen bar
     ([城市 ▾] ★收藏 | 日常 | 大型 [筛选 ▾] ≡) instead of header + tabs. */
  if (V2) { var stuckF = 0; addEventListener('scroll', function () { if (stuckF) return; stuckF = requestAnimationFrame(function () { stuckF = 0; v2Stuck(); }); }, { passive: true }); }
  function v2Stuck() { var bar = root.querySelector('.v2-bar'), on = false;
    if (bar && bar.offsetParent && R.classList.contains('atm-h-on') && (scrollY || 0) > 4) { var hd = D.querySelector('.china-sticky-top'), hb = hd && !R.classList.contains('v2-stuck') ? hd.getBoundingClientRect().bottom : 0; on = bar.getBoundingClientRect().top <= Math.max(1, hb) + 1; }
    R.classList.toggle('v2-stuck', on); }
  root.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a.ah-pt')) return; /* poster link opens P10; do not treat it as the section button */
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-v2burger')) { var hb = D.querySelector('.china-hero-bar .atm-burger'); if (hb) hb.click(); return; }
    if (b.hasAttribute('data-v2top')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (b.hasAttribute('data-v2f')) { S.v2m = S.v2m === S.v2t ? null : S.v2t; render(); return; }
    if (b.hasAttribute('data-v2t')) { var t2 = b.getAttribute('data-v2t'); if (t2 === S.v2t) return; S.v2m = null; if (t2 === 'big') S.fc = -1; if (t2 === 'reg') S.tc = ''; go(t2 === 'fav' ? '#h-fav' : t2 === 'big' ? '#h-feat' : '#h-city-' + encodeURIComponent(S.v2c || v2Guess())); return; }
    if (b.hasAttribute('data-v2c')) { var c2 = b.getAttribute('data-v2c'); S.v2c = c2; pick(c2); if (/^#h-(fav|feat)$/.test(location.hash)) { visit(c2); render(); } else go('#h-city-' + encodeURIComponent(c2)); return; }
    if (b.hasAttribute('data-upall')) { S.fcity = b.getAttribute('data-upall'); S.fc = -1; go('#h-feat'); return; }
    if (b.hasAttribute('data-fcity')) { S.fcity = ''; render(); return; }
    if (b.hasAttribute('data-fc')) { S.fc = +b.getAttribute('data-fc'); S.v2m = null; render(); v2Top(); return; }
    if (b.hasAttribute('data-tc')) { S.tc = b.getAttribute('data-tc'); S.v2m = null; render(); v2Top(); return; }
    if (b.hasAttribute('data-wk')) { S.st = Math.max(0, Math.min(MAXD - 6, (S.st || 0) + 7 * +b.getAttribute('data-wk'))); S.jd = ''; render(); return; }
    if (b.hasAttribute('data-mv')) { S.mv = !S.mv; if (S.mv) { var d0 = dayAt(S.st || 0); S.mo = (d0.getFullYear() - now.getFullYear()) * 12 + d0.getMonth() - now.getMonth(); } render(); return; }
    if (b.hasAttribute('data-mo')) { S.mo = Math.max(0, Math.min(3, (S.mo || 0) + +b.getAttribute('data-mo'))); render(); return; }
    if (b.hasAttribute('data-st')) { S.st = +b.getAttribute('data-st'); S.mv = false; S.jd = isoOf(dayAt(S.st)); render(); return; }
    if (b.hasAttribute('data-jump')) { S.jd = b.getAttribute('data-jump'); render(); var el = D.getElementById('ahd-' + S.jd); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (b.hasAttribute('data-go')) { var g = b.getAttribute('data-go'); if (g === '#h-feat') { S.fcity = ''; S.fc = -1; } if (g) go(g); else if ((location.hash === '#h-feat' || /^#h-city-/.test(location.hash)) && !((prevHash === '' || prevHash === '#') && history.length > 1)) { history.pushState(null, '', location.pathname); render(); } /* P2/P4 ‹ always home */ else if (history.length > 1 && lastFromHome) history.back(); else { history.pushState(null, '', location.pathname); render(); } return; }
    if (b.hasAttribute('data-dd')) { S.dd = !S.dd; render(); return; }
    if (b.hasAttribute('data-city')) { if (b.hasAttribute('data-pick')) { pick(b.getAttribute('data-city')); S.dd = false; } S.open = false; go('#h-city-' + encodeURIComponent(b.getAttribute('data-city'))); return; }
    if (b.hasAttribute('data-fav')) { openFav(); return; }
    if (b.hasAttribute('data-unsug')) { /* solid heart -> hollow, then remove (remembered) */ b.setAttribute('aria-pressed', 'false'); var hs = sugHidden(); hs.push(b.getAttribute('data-unsug')); try { localStorage.setItem(HK, JSON.stringify(hs)); } catch (er) {} setTimeout(render, 200); return; }
    if (b.hasAttribute('data-tog')) { S.open = !S.open; render(); return; }
    if (b.hasAttribute('data-a')) { S.a = +b.getAttribute('data-a'); render(); return; }
    if (b.hasAttribute('data-c')) { S.c = b.getAttribute('data-c'); render(); return; }
  });
  function p7cityKey(e) { if (!e) return ''; var tl = tailOf(e.region); return tl ? tl.k : (e.city || ''); }
  function p7favTo(id) {
    var e = null, i;
    if (DATA) for (i = 0; i < DATA.length; i++) if (DATA[i] && DATA[i].id === id) { e = DATA[i]; break; }
    if (e && e.kind === 'event' && !e.regular_oneoff) return '#h-feat';
    var key = p7cityKey(e);
    return key ? ('#h-city-' + encodeURIComponent(key)) : '';
  }
  function p7consume() {
    var rec = p7read();
    if (!rec || !rec.restore) return;
    var h = location.hash || '';
    try { sessionStorage.removeItem(P7K); } catch (e) {}
    if (h !== rec.to) return;
    var y = +rec.y || 0;
    window.scrollTo(0, y);
    requestAnimationFrame(function () { if ((location.hash || '') === h) window.scrollTo(0, y); });
  }
  /* Record the opener before the card document loads. A new tab has no record, so a mail or share link returns to this language's map. */
  D.addEventListener('click', function (e) {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.atm-heart, .ah-heart, .atm-unfav, button')) return;
    var a = t.closest('a.ah-pt, a.ah-card, a.ah-uc');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('card=') < 0) return;
    var id = a.getAttribute('data-card') || a.getAttribute('data-id') || '';
    if (!id) { try { id = new URL(href, location.href).searchParams.get('card') || ''; } catch (err) { id = ''; } }
    if (!id) return;
    var rec = { id: id, y: window.scrollY || D.documentElement.scrollTop || 0, t: Date.now() };
    var hash = location.hash || '';
    if (a.closest('.ah-ly') || a.closest('.ah-fb')) rec.to = p7favTo(id);
    else if (a.closest('.ah-ban') && a.classList.contains('ah-pt')) rec.to = '#h-feat';
    else if (hash === '#h-feat' || hash === '#h-fav' || hash.indexOf('#h-city-') === 0 || hash === '#h-search' || hash === '#h-reg') { rec.back = 1; rec.to = hash; }
    else return;
    if (!rec.to) return;
    try { sessionStorage.setItem(P7K, JSON.stringify(rec)); } catch (err) {}
  }, true);
  D.addEventListener('click', function (e) { var h = e.target.closest && e.target.closest('.ah-heart'); if (!h) return; e.preventDefault(); var id = h.getAttribute('data-fid'), inCar = !!h.closest('.ah-fav');
    setTimeout(function () { var f = isFav(id), l = f ? (zh ? '取消收藏' : 'Remove from favorites') : (zh ? '收藏' : 'Add to favorites'); D.querySelectorAll('.ah-heart[data-fid="' + id + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(f)); x.setAttribute('aria-label', l); x.title = l; }); if (inCar || (!!D.querySelector('#atm-home .ah-fav')) !== (favLive().length > 0)) setTimeout(render, 200); }, 30); }, true);
  D.addEventListener('keydown', function (e) { var h = e.target.closest && e.target.closest('.ah-heart'); if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); h.click(); } });
  var lastFromHome = false, prevHash = null;
  addEventListener('hashchange', function (e) { lastFromHome = true; try { prevHash = new URL(e.oldURL).hash; } catch (er) { prevHash = null; } render(); });
  /* title bar: magnifier + ♥ (with count) */
  var MG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><line x1="15" y1="15" x2="20.5" y2="20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var bS = D.createElement('button'); bS.type = 'button'; bS.className = 'ah-hbtn ah-hsearch'; bS.innerHTML = MG; bS.setAttribute('aria-label', T.search);
  var bF = D.createElement('button'); bF.type = 'button'; bF.className = 'ah-hbtn ah-hfav'; bF.innerHTML = starIc() + '<span class="ah-badge" hidden></span>'; bF.setAttribute('aria-label', T.fav);
  bS.addEventListener('click', function () { S.open = false; S.a = -1; S.c = ''; go('#h-search'); });
  bF.addEventListener('click', openFav);
  function favIds() { var a = []; try { a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); } catch (e) {} if (window.ATM_FAV && window.ATM_FAV.get && !a.length) a = window.ATM_FAV.get(); if (!DATA) return a; var m = {}; DATA.forEach(function (e) { m[e.id] = e; }); return a.filter(function (id) { return live(m[id]); }); }
  function badge() { var k = favIds().length, s = bF.querySelector('.ah-badge'); s.textContent = k; s.hidden = !k; }
  var ly = null;
  function rmFav() { if (ly) { ly.remove(); ly = null; D.body.style.overflow = ''; } }
  /* draft 11/01: P5 favorites panel owns one history entry: browser Back closes it; ‹/✕/Esc/backdrop close pops that entry (no extra entry left) */
  function closeFav() { if (!ly) return; if (history.state && history.state.ahFav) history.back(); else rmFav(); }
  addEventListener('popstate', function () { if (ly && !(history.state && history.state.ahFav)) rmFav(); });
  function favRow(e) {
    if (!e) return '';
    return '<div class="ah-favrow">' + card(e) + '<button type="button" class="atm-unfav" data-unfav="' + esc(e.id) + '">' + (zh ? '取消收藏' : 'Remove from favorites') + '</button></div>';
  }
  function favListHtml() {
    var m = {}; DATA.forEach(function (e) { m[e.id] = e; }); var ids = favIds();
    return ids.map(function (i) { return favRow(m[i]); }).join('') || '<p style="color:#5b7f84">' + T.favnone + '</p>';
  }
  function refreshFavPanel() {
    if (!ly) return;
    var ids = favIds();
    var title = ly.querySelector('.ah-lyh b');
    if (title) title.innerHTML = starIc() + T.fav + ' <i>' + ids.length + '</i>';
    ly.setAttribute('aria-label', T.fav);
    var listEl = ly.querySelector('.ah-list');
    if (listEl) listEl.innerHTML = favListHtml();
  }
  function openFav() {
    rmFav(); var ids = favIds();
    ly = D.createElement('div'); ly.className = 'ah-ly'; ly.setAttribute('role', 'dialog'); ly.setAttribute('aria-modal', 'true'); ly.setAttribute('aria-label', T.fav);
    ly.innerHTML = '<div class="ah-box"><div class="ah-lyh"><b>' + starIc() + T.fav + ' <i>' + ids.length + '</i></b><button type="button" class="ah-x" aria-label="' + T.close + '">×</button></div><div class="ah-list">' + favListHtml() + '</div><div class="ah-lyn">' + T.favnote + '</div></div>';
    ly.addEventListener('click', function (e) { if (e.target === ly || e.target.closest('.ah-x')) closeFav(); });
    D.body.appendChild(ly); D.body.style.overflow = 'hidden';
    try { if (!(history.state && history.state.ahFav)) history.pushState({ ahFav: 1 }, '', location.href); } catch (e) {}
  }
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFav(); });
  addEventListener('storage', function (e) { if (e.key === 'atm_fav_v1' || e.key === 'atm_fav_removed_v1') { badge(); if (ly) refreshFavPanel(); } });
  addEventListener('pageshow', function () { if (DATA) { badge(); render(); } });
  function mount() {
    var nav = D.querySelector('.china-hero-bar .top-lang'); if (nav && !bS.parentNode) { /* v11.7 H3: header 🔍 removed (route #h-search kept) */ void bS; /* v11.7: header ♥ removed (favorites via home 「全部 N 项 ›」) */ }
    var st = D.querySelector('.china-sticky-top'); if (st && !root.parentNode) st.parentNode.insertBefore(root, st.nextSibling);
  }
  var FULL = '/asia/events.json?v=e216'; /* kept versioned; fetched only when a favorite id is in neither core nor events-more */
  function asList(d) { return Array.isArray(d) ? d : (d && d.events) || []; }
  function favMissing(list) {
    var m = {}, ids = [];
    list.forEach(function (e) { if (e && e.id) m[e.id] = 1; });
    try { ids = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); } catch (e) { ids = []; }
    return ids.filter(function (id) { return id && !m[id]; });
  }
  function start() {
    mount();
    /* Hide the legacy list and its posters before events-core arrives, so that
       grid is not on screen long enough to download every featured thumb. */
    var early = route();
    if (early) {
      R.classList.add('atm-h-on');
      if (early !== 'search') R.classList.add('atm-h-home');
    }
    var coreUrl = '/asia/events-core.json?v=china466';
    var loadEv = window.atmDataJson || function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }); };
    var coreWait = window._chinaData ? Promise.resolve(window._chinaData) : new Promise(function (resolve) {
      var n = 0, t = setInterval(function () {
        if (window._chinaData) { clearInterval(t); resolve(window._chinaData); }
        else if (++n > 40) { clearInterval(t); resolve(null); }
      }, 50);
    });
    function listSig(list) {
      return asList(list).filter(function (e) { return e && !e.hidden; }).map(function (e) {
        return [e.id, e.city || '', e.start || '', e.end || '', e.kind || '', e.regular_oneoff ? 1 : 0, e.status || '', e.updated || '', e.venue || '', e.poster || ''].join('\t');
      }).join('\n');
    }
    function paintCore(list) {
      list = asList(list);
      prep(list); badge(); render();
      return list;
    }
    function fillFav(list) {
      var miss = favMissing(list);
      if (!miss.length) return Promise.resolve();
      var more = window.atmLoadMore ? window.atmLoadMore() : loadEv(coreUrl.replace('events-core.json', 'events-more.json')).then(asList);
      return Promise.resolve(more).then(function (extra) {
        var merged = list.concat(extra || []);
        if (!favMissing(merged).length) { prep(merged); badge(); render(); return; }
        return loadEv(FULL).then(function (d) { prep(asList(d)); badge(); render(); });
      });
    }
    coreWait.then(function (ready) {
      if (ready) return ready;
      return loadEv(coreUrl).then(asList);
    }).then(function (list) {
      list = paintCore(list);
      var seen = listSig(list);
      return fillFav(list).then(function () {
        /* Same quiet retry as the map list: a timeout paints git, then one fresh R2 read redraws Chongqing and the other city lists. */
        if (!window.atmRetryAfterFallback) return;
        return window.atmRetryAfterFallback(coreUrl).then(function (fresh) {
          if (!fresh || listSig(fresh) === seen) return;
          return fillFav(paintCore(fresh));
        }).catch(function () {});
      });
    }).catch(function () { R.classList.remove('atm-h-on', 'atm-h-home'); });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
  window.ATM_HOME = { feat: function () { return FEAT; }, cities: function () { return CITIES.map(function (c) { return [c, REG[c].length]; }); }, render: render, openFav: openFav, refreshFavPanel: refreshFavPanel };
})();
