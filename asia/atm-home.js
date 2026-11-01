/* v11.6 (2026-11-01): list homepage = 特色活动 entry + 常规活动 city grid; featured list / city list / single-select
   search page / favorites layer. Hash routes: '' home, #h-feat, #h-city-<City>, #h-search. Query-string views
   (?card, ?mode, ?city, ?via ...) keep the old list untouched. Cards open the single-card layer (?card=ID). */
(function () {
  var D = document, R = D.documentElement;
  if (/[?&](card|mode|city|via|date|q|type)=/.test(location.search)) return;
  try { if (sessionStorage.getItem('atm_legacy_list') === '1') return; } catch (e) {} /* regression hook: old full list for the pre-v11.6 test suite */
  var zh = /^zh/i.test(R.getAttribute('data-asia-lang') || R.lang || '');
  var T = zh ? { feat: '特色活动', reg: '常规活动', items: '项', from: '从今天起', sort: '按日期排序', regsub: '中国大陆 · 每周固定 · 选城市', weekly: '每周常规活动', fav: '我的收藏', close: '关闭', search: '选择要看的活动', allA: '全部活动', allC: '全部城市', act: '活动', city: '城市', fold: '收起', exp: '展开', none: '暂无活动', favnone: '还没有收藏。打开活动卡片，点 ♥ 收藏。', favnote: '收藏只保存在本机', back: '返回', theme: '每周舞会 · 本周专题', cats: ['大师课/工作坊', '马拉松', '探戈节', '特色舞会', '常规活动'], WD: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], every: '每' }
    : { feat: 'Featured events', reg: 'Regular events', items: '', from: 'From today', sort: 'by date', regsub: 'Mainland China · weekly · pick a city', weekly: 'weekly regular events', fav: 'My favorites', close: 'Close', search: 'Choose events', allA: 'All events', allC: 'All cities', act: 'Events', city: 'City', fold: 'Collapse', exp: 'Expand', none: 'No events', favnone: 'No favorites yet. Open an event card and tap ♥ to save it.', favnote: 'Favorites are saved on this device only', back: 'Back', theme: 'Weekly milonga · This week\'s theme', cats: ['Classes / workshops', 'Marathons', 'Festivals', 'Special milongas', 'Regular events'], WD: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], every: 'Every ' };
  var CZ = { 'Seoul': '首尔', 'Busan': '釜山', 'Daejeon': '大田', 'Kuala Lumpur': '吉隆坡', 'Beijing': '北京', 'Hong Kong': '香港', 'Changwon': '昌原', 'Daegu': '大邱', 'Shanghai': '上海', 'Taipei': '台北', 'New Taipei': '新北', 'Zhubei': '竹北', 'Chengdu': '成都', 'Hangzhou': '杭州', 'Chongqing': '重庆', 'Tokyo': '东京', 'Osaka': '大阪', 'Guangzhou': '广州', 'Tianjin': '天津', 'Taichung': '台中', 'Tainan': '台南', 'Nanjing': '南京', 'Suzhou': '苏州', 'Bandar Seri Begawan': '斯里巴加湾', 'Penang': '槟城', 'Da Nang': '岘港', 'Miaoli': '苗栗', 'Wuhan': '武汉', 'Gunsan': '群山', 'Shenzhen': '深圳', 'Qingdao': '青岛', 'Haikou': '海口', 'Zhengzhou': '郑州', "Xi'an": '西安', 'Singapore': '新加坡', 'Bangkok': '曼谷', 'Hanoi': '河内', 'Ho Chi Minh City': '胡志明市', 'Manila': '马尼拉', 'Jakarta': '雅加达', 'Bali': '巴厘岛', 'Macau': '澳门', 'Incheon': '仁川', 'Gwangju': '光州', 'Jeju': '济州', 'Ulsan': '蔚山', 'Suwon': '水原', 'Ilsan': '一山', 'Goyang': '高阳', 'Seongnam': '城南', 'Cheongju': '清州', 'Jeonju': '全州', 'Pohang': '浦项', 'Gyeongju': '庆州', 'Kaohsiung': '高雄', 'Hsinchu': '新竹', 'Taoyuan': '桃园', 'Ulaanbaatar': '乌兰巴托', 'Phnom Penh': '金边', 'Yokohama': '横滨', 'Kyoto': '京都', 'Nagoya': '名古屋', 'Fukuoka': '福冈', 'Sapporo': '札幌', 'Kobe': '神户' };
  function cn(c) { return zh ? (CZ[c] || c) : c; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var now = new Date(), TODAY = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()), TWD = now.getDay();
  var WEEK_END = (function () { var d = new Date(now.getTime() + 6 * 864e5); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })();
  var DATA = null, FEAT = [], REG = {}, CITIES = [];
  function isFeat(e) { return e.kind === 'event' && !e.hidden && !e.regular_oneoff && (e.end || e.start || '9') >= TODAY; }
  function cat(e) { return e.kind === 'weekly' ? 4 : e.type === 'event' ? 0 : e.type === 'marathon' ? 1 : e.type === 'festival' ? 2 : 3; }
  function prep(d) {
    DATA = d.filter(function (e) { return !e.hidden; });
    FEAT = DATA.filter(isFeat).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : (a.start || '9') > (b.start || '9') ? 1 : 0; });
    REG = {};
    DATA.forEach(function (e) {
      if (e.region !== 'China') return;
      var w = e.kind === 'weekly', o = e.kind === 'event' && e.regular_oneoff && e.start >= TODAY && e.start <= WEEK_END;
      if (w || o) (REG[e.city] = REG[e.city] || []).push(e);
    });
    /* v11.7 theme merge: a regular_oneoff with theme_of=<weekly id> on that weekly's date this week replaces the weekly card for that date only */
    Object.keys(REG).forEach(function (c) { var th = {}; REG[c].forEach(function (e) { if (e.kind === 'event' && e.theme_of) th[e.theme_of + '|' + e.start] = 1; }); REG[c] = REG[c].filter(function (e) { return !(e.kind === 'weekly' && th[e.id + '|' + occOf(e)]); }); });
    CITIES = Object.keys(REG).sort(function (a, b) { return REG[b].length - REG[a].length || (a < b ? -1 : 1); });
  }
  function occOf(e) { var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + rel(wdOf(e))); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function wdOf(e) { if (e.kind === 'weekly') return (e.weekdays && e.weekdays.length ? e.weekdays[0] : e.weekday) % 7; return new Date(e.start + 'T12:00:00').getDay(); }
  function rel(w) { return (w - TWD + 7) % 7; }
  function regSorted(c) { return (REG[c] || []).slice().sort(function (a, b) { return rel(wdOf(a)) - rel(wdOf(b)) || ((a.time || '') < (b.time || '') ? -1 : 1); }); }
  function fd(s) { return s ? s.slice(5).replace('-', '/') + (s.slice(0, 4) !== TODAY.slice(0, 4) ? '' : '') : ''; }
  function dt(e) {
    if (e.kind === 'weekly') return T.every + (e.weekdays || [e.weekday]).map(function (i) { return T.WD[i % 7]; }).join('/') + (e.time ? ' ' + e.time : '');
    var s = fd(e.start) + (e.end && e.end !== e.start ? '–' + fd(e.end) : ''); if (e.start && e.start.slice(0, 4) !== TODAY.slice(0, 4)) s = e.start.slice(0, 4) + '/' + s; if (e.theme_of) s += ' ' + T.WD[new Date(e.start + 'T12:00:00').getDay()] + (e.time ? ' ' + e.time : ''); return s;
  }
  function th(p) { return '/images/thumb' + p.replace(/\.(jpe?g|png)$/i, '.webp'); }
  function img(e, cls) { return e.poster ? '<img class="' + cls + '" src="' + esc(th(e.poster)) + '" data-full="' + esc(e.poster) + '" onerror="if(this.dataset.full&&this.src.indexOf(this.dataset.full)<0)this.src=this.dataset.full" alt="" loading="lazy" decoding="async">' : '<span class="' + cls + ' ah-noimg">' + esc(cn(e.city)) + '</span>'; }
  function card(e, sub, tag) {
    var v = (e.kind === 'weekly' || e.theme_of) ? (e.venue || '') : '';
    return '<a class="ah-card" data-id="' + esc(e.id) + '" href="' + location.pathname + '?card=' + encodeURIComponent(e.id) + '">' + img(e, 'ah-th') + '<span class="ah-tx">' + (tag ? '<em class="ah-sugt">' + tag + '</em>' : '') + (e.theme_of ? '<em class="ah-theme">' + T.theme + '</em>' : '') + '<b>' + esc((zh && e.name_zh) || e.name) + '</b><span>' + esc(sub || dt(e)) + ' · ' + esc(cn(e.city)) + '</span>' + (v ? '<span>' + esc(v) + '</span>' : '') + '</span></a>';
  }
  function n(x) { return zh ? x + ' ' + T.items : String(x); }
  var root = D.createElement('div'); root.id = 'atm-home'; root.className = 'wrap';
  var css = D.createElement('style'); css.id = 'atm-home-css';
  css.textContent = 'html.atm-h-on #filters,html.atm-h-on .atm-favbar,html.atm-h-on .atm-favgrid,html.atm-h-on .atm-featstrip,html.atm-h-on #china-listings,html.atm-h-on .tw-m-feat-grid,html.atm-h-on .atm-dots,html.atm-h-on .china-results,html.atm-h-on .atm-recent,html.atm-h-on #atm-pop{display:none!important}' +
    '#atm-home{display:none;box-sizing:border-box;padding:4px 12px 40px;max-width:952px;margin:0 auto;font-family:system-ui,-apple-system,"PingFang SC","Noto Sans SC",sans-serif}html.atm-h-on #atm-home{display:block}' +
    '.ah-ban{display:block;width:100%;text-align:left;margin:8px 0;padding:14px;border:0;border-radius:16px;background:linear-gradient(160deg,#0E6E78,#06333A);box-shadow:0 4px 14px rgba(6,51,58,.25);cursor:pointer;color:#F6D58E}' +
    '.ah-ban-h{display:flex;justify-content:space-between;align-items:center}.ah-ban-t{font:700 19px "Noto Serif SC",serif}.ah-ban-t i{font-style:normal;color:#fff}.ah-ban-s{font:600 13px system-ui;color:#cfe3e3;margin-top:2px}.ah-ban-a{font:700 30px system-ui}' +
    '.ah-strip{display:flex;gap:8px;margin-top:12px;overflow:hidden}.ah-strip img,.ah-strip .ah-noimg{width:64px;height:86px;object-fit:cover;border-radius:8px;flex:0 0 auto;border:2px solid rgba(246,213,142,.6)}@media(min-width:700px){.ah-strip img,.ah-strip .ah-noimg{width:90px;height:120px}.ah-ban-t{font-size:22px}}' +
    '.ah-div{margin:18px 0 0;height:0;border-top:2px solid #EAD7A4}.ah-h{margin:16px 0 8px;padding-bottom:6px;border-bottom:2px solid #F6D58E;display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.ah-h b{font:700 18px "Noto Serif SC",serif;color:#0A4F57}.ah-h span{font:600 12px system-ui;color:#8aa3a6}' +
    '.ah-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}@media(min-width:700px){.ah-grid{grid-template-columns:repeat(5,1fr)}}' +
    '.ah-city{height:58px;border-radius:12px;background:#fff;border:1.5px solid #0E6E78;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#0E6E78;cursor:pointer;font:inherit;padding:0}.ah-city b{font:700 16px system-ui}.ah-city span{font:600 12px system-ui;color:#8aa3a6}' +
    '.ah-top{display:flex;align-items:center;gap:4px;margin:6px 0 2px -8px}.ah-back{width:44px;height:44px;border:0;background:none;font:700 28px system-ui;color:#0E6E78;cursor:pointer;padding:0}.ah-title{font:700 19px "Noto Serif SC",serif;color:#0A4F57}.ah-title i{font-style:normal;color:#C0392B}.ah-note{margin:0 0 10px 44px;color:#8aa3a6;font:600 13px system-ui}' +
    '.ah-list{display:grid;grid-template-columns:1fr;gap:8px}@media(min-width:900px){#atm-home .ah-list.ah-2{grid-template-columns:1fr 1fr}}' +
    '.ah-card{display:flex;gap:10px;background:#fff;border-radius:12px;padding:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);text-decoration:none!important;color:#5b7f84;min-height:84px;align-items:flex-start}.ah-th{width:64px;height:84px;object-fit:cover;border-radius:8px;flex:0 0 auto}.ah-noimg{display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#0E6E78,#06333A);color:#F6D58E;font:700 13px serif;text-align:center}' +
    '.ah-tx{min-width:0;display:flex;flex-direction:column;gap:3px;font:13px system-ui;color:#5b7f84}.ah-tx b{font:700 15px system-ui;color:#06333A;margin-bottom:1px}' +
    '.ah-theme{align-self:flex-start;font:700 11px system-ui;font-style:normal;color:#fff;background:#C0392B;border-radius:6px;padding:2px 7px}#atm-home .ah-fav{margin:4px 0 0;padding:0}html.atm-h-home .tw-m-feat{display:none!important}.ah-favs{flex:1;margin-left:8px;font:600 12px system-ui;color:#8aa3a6}.ah-car{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 8px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.ah-car::-webkit-scrollbar{display:none}.ah-fit{position:relative;flex:0 0 78%;max-width:320px;scroll-snap-align:start}.ah-fit>.ah-card{height:100%;box-sizing:border-box}.ah-unsug{position:absolute;top:2px;right:2px;width:36px;height:36px;border:0;background:none;color:#9aa;font:16px system-ui;cursor:pointer}.ah-sugt{align-self:flex-start;font:700 11px system-ui;font-style:normal;color:#8a6500;background:#FBEFC9;border-radius:6px;padding:1px 7px}.ah-rows{display:flex;flex-direction:column;gap:12px;margin-top:12px}.ah-rows .ah-ban{margin:0}.ah-rb{border-radius:16px;padding:14px;background:linear-gradient(160deg,#8E3B46,#4A1C26);box-shadow:0 4px 14px rgba(74,28,38,.25);color:#F6D58E}.ah-rb-h{display:flex;width:100%;align-items:center;justify-content:space-between;border:0;background:none;color:inherit;padding:0;text-align:left;cursor:pointer;font:inherit}.ah-rb-t{display:block;font:700 21px "Noto Serif SC",serif}.ah-rb-t i{font-style:normal}.ah-rb-s{display:block;font:600 13px system-ui;color:#F3E3D3;margin-top:3px}.ah-rb-strip{display:flex;gap:8px;overflow-x:auto;margin-top:12px;scrollbar-width:none}.ah-rb-strip::-webkit-scrollbar{display:none}.ah-rb-c{flex:0 0 auto;width:72px;height:72px;border-radius:12px;border:1.5px solid rgba(246,213,142,.55);background:rgba(255,255,255,.1);color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.ah-rb-c b{font:700 16px system-ui}.ah-rb-c span{font:600 12px system-ui;color:#F6D58E}.ah-row{display:flex;align-items:center;gap:14px;min-height:80px;padding:0 18px;border:0;border-radius:18px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.08);cursor:pointer;text-align:left;font:inherit}.ah-ic{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex:0 0 auto}.ah-row-f .ah-ic{background:#06333A;color:#F6D58E}.ah-row-r .ah-ic{background:#E9F2F2}.ah-row b{flex:1;font:700 19px "Noto Serif SC",serif;color:#0A4F57}.ah-row b small{display:block;font:600 13px system-ui;color:#8aa3a6;margin-top:2px}.ah-n{font:700 22px system-ui;color:#C0392B;white-space:nowrap}.ah-n small{font-size:13px}.ah-a{font:700 26px system-ui;color:#0E6E78}.ah-favh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.ah-favh b{font:700 17px "Noto Serif SC",serif;color:#0A4F57}.ah-favall{border:0;background:none;color:#0E6E78;font:700 14px system-ui;cursor:pointer;min-height:36px;padding:0 4px}.ah-fcities{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:2px 0 10px}.ah-fcities span{font:600 12px system-ui;color:#8aa3a6}.ah-fcity{height:36px;padding:0 16px;border-radius:18px;border:1.5px solid #0E6E78;background:#E9F2F2;color:#0E6E78;font:700 14px system-ui;cursor:pointer}.ah-fav .ah-card{box-shadow:0 1px 5px rgba(0,0,0,.09)}.ah-wd{margin:12px 2px 6px;font:700 14px system-ui;color:#0E6E78}' +
    '.ah-sels{display:flex;gap:10px;margin-top:8px;flex-wrap:wrap}.ah-sel{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:22px;background:#0E6E78;color:#fff;font:700 15px system-ui;border:0;cursor:pointer}.ah-sel i{font-style:normal;color:#F6D58E}' +
    '.ah-rowl{font:700 15px "Noto Serif SC",serif;color:#0A4F57;margin:12px 0 8px}.ah-chips{display:flex;flex-wrap:wrap;gap:8px}.ah-chip{display:inline-flex;align-items:center;gap:5px;height:40px;padding:0 15px;border-radius:20px;border:1.5px solid transparent;background:#E9F2F2;color:#0E6E78;font:700 15px system-ui;cursor:pointer}.ah-chip small{font-weight:600;opacity:.7}.ah-chip[aria-pressed=true]{background:#F6D58E;color:#06333A;border-color:#C9A24E}' +
    '.ah-fold{margin-top:12px;border:0;background:none;color:#0E6E78;font:700 14px system-ui;cursor:pointer;padding:6px 0}' +
    '.ah-hbtn{display:inline-flex!important;align-items:center;justify-content:center;position:relative;width:40px;height:40px;margin-right:4px;border:0;background:none;color:#F6D58E;cursor:pointer;padding:0;flex:0 0 auto}.ah-hbtn svg{width:22px;height:22px}.ah-hbtn .ah-hrt{color:#ff8a80;font-size:21px;line-height:1}.ah-badge{position:absolute;top:0;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#C0392B;color:#fff;font:700 11px system-ui;display:flex;align-items:center;justify-content:center;padding:0 4px;box-sizing:border-box}.ah-badge[hidden]{display:none}' +
    'html:not(.atm-h-home) .ah-hbtn{display:none!important}' +
    '.ah-ly{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.45);display:flex;justify-content:center;align-items:flex-end}.ah-box{background:#FBF5E9;width:100%;max-height:78vh;border-radius:20px 20px 0 0;overflow:auto;padding:12px 14px 20px;box-sizing:border-box}@media(min-width:700px){.ah-ly{align-items:center}.ah-box{width:560px;max-height:80vh;border-radius:20px}}' +
    '.ah-lyh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.ah-lyh b{font:700 19px "Noto Serif SC",serif;color:#C0392B}.ah-lyh b i{font-style:normal;color:#0A4F57}.ah-x{width:44px;height:44px;border-radius:50%;background:#E9F2F2;border:0;font:700 24px system-ui;color:#0A4F57;cursor:pointer}.ah-lyn{margin-top:12px;color:#8aa3a6;font:600 12px system-ui;text-align:center}' +
    'html.atm-h-on #china-listings .ev-card>.atm-heart{display:none!important}';
  D.head.appendChild(css);
  var S = { a: -1, c: '', open: false };
  function route() { var h = location.hash; if (/^#v-/.test(h)) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} h = ''; } /* old #v-<id> card anchors (shared links, back from detail) -> new home, not the old list */ if (!h || h === '#') return 'home'; if (h === '#h-feat') return 'feat'; if (h === '#h-search') return 'search'; if (h === '#h-reg') return 'reg'; if (h.indexOf('#h-city-') === 0) return 'city'; return null; }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  /* v11.7 home ♥ 我的收藏 block: favorites (max 5, past one-offs hidden) + top-3 common cities (visits + favorites), hidden when empty */
  var VK = 'atm_city_visits_v1';
  function visits() { try { return JSON.parse(localStorage.getItem(VK) || '{}') || {}; } catch (e) { return {}; } }
  function visit(c) { if (!c || !REG[c]) return; var v = visits(); v[c] = (v[c] || 0) + 1; try { localStorage.setItem(VK, JSON.stringify(v)); } catch (e) {} }
  function nextOcc(e) { var w = wdOf(e), d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + rel(w)); return (zh ? '下次 ' : 'Next ') + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + T.WD[w] + (e.time ? ' ' + e.time : ''); }
  /* v11.7 homepage C: favorites carousel (own, else 系统建议 from /data/suggested_favs.json, ✕ remembered) + two entry rows; city grid moved to #h-reg */
  var SUG = [], HK = 'atm_sug_hidden_v1';
  function live(e) { return e && !(e.kind === 'event' && (e.end || e.start || '9') < TODAY); } /* weekly favorites never expire; past one-offs drop out */
  function sugHidden() { try { return JSON.parse(localStorage.getItem(HK) || '[]') || []; } catch (e) { return []; } }
  function byId() { var m = {}; DATA.forEach(function (e) { m[e.id] = e; }); return m; }
  function favLive() { var m = byId(); return favIds().map(function (i) { return m[i]; }).filter(live); }
  function sugLive() { var m = byId(), h = sugHidden(); return SUG.map(function (i) { return m[i]; }).filter(function (e) { return live(e) && h.indexOf(e.id) < 0; }).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : 1; }); }
  function themed(e) { if (e.kind !== 'weekly') return null; var o = occOf(e), t = null; DATA.forEach(function (x) { if (x.theme_of === e.id && x.start === o) t = x; }); return t; }
  function favBlock() {
    var own = favLive(), sg = own.length ? [] : sugLive(), L = own.length ? own : sg; if (!L.length) return '';
    var items = L.map(function (e) { var t = themed(e) || e; return '<div class="ah-fit">' + card(t, t.kind === 'weekly' ? nextOcc(t) : '', own.length ? '' : (zh ? '系统建议' : 'Suggested')) + (own.length ? '' : '<button type="button" class="ah-unsug" data-unsug="' + esc(e.id) + '" aria-label="' + T.close + '">✕</button>') + '</div>'; }).join('');
    var sub = own.length ? (zh ? '左右滑动' : 'swipe') : (zh ? '系统建议，可换成你自己的' : 'Suggested, swap in your own');
    return '<section class="ah-fav" aria-label="' + T.fav + '"><div class="ah-favh"><b><span style="color:#C0392B">♥</span> ' + T.fav + '</b><span class="ah-favs">' + sub + '</span>' + (own.length ? '<button type="button" class="ah-favall" data-fav="1">' + (zh ? '全部 ' + own.length + ' 项' : 'All ' + own.length) + ' ›</button>' : '') + '</div><div class="ah-car">' + items + '</div></section>';
  }
  function home() {
    return favBlock() + '<div class="ah-rows">' +
      '<button type="button" class="ah-ban" data-go="#h-feat"><span class="ah-ban-h"><span><span class="ah-ban-t" style="display:block">' + (zh ? T.feat + ' <i>' + FEAT.length + '</i> ' + T.items : T.feat + ' <i>' + FEAT.length + '</i>') + '</span><span class="ah-ban-s" style="display:block">' + T.from + ' · ' + T.sort + '</span></span><span class="ah-ban-a">›</span></span><span class="ah-strip">' + FEAT.filter(function (e) { return e.poster; }).slice(0, 6).map(function (e) { return img(e, ''); }).join('') + '</span></button>' +
      '<div class="ah-rb"><button type="button" class="ah-rb-h" data-go="#h-reg"><span><span class="ah-rb-t">' + T.reg + ' <i>' + CITIES.length + '</i>' + (zh ? ' 城' : ' cities') + '</span><span class="ah-rb-s">' + (zh ? '中国大陆 · 每周固定舞会' : 'Mainland China · weekly milongas') + '</span></span><span class="ah-ban-a">›</span></button><div class="ah-rb-strip">' +
      CITIES.slice().sort(function (a, b) { return REG[b].length - REG[a].length; }).map(function (c) { return '<button type="button" class="ah-rb-c" data-city="' + esc(c) + '"><b>' + esc(cn(c)) + '</b><span>' + n(REG[c].length) + '</span></button>'; }).join('') + '</div></div></div>';
  }
  function regView() {
    var g = CITIES.map(function (c) { return '<button type="button" class="ah-city" data-city="' + esc(c) + '"><b>' + esc(cn(c)) + '</b><span>' + n(REG[c].length) + '</span></button>'; }).join('');
    return top(T.reg + ' <i>' + CITIES.length + '</i>' + (zh ? ' 城' : ' cities')) + '<div class="ah-note">' + T.regsub + '</div><div class="ah-grid">' + g + '</div>';
  }
  function top(t) { return '<div class="ah-top"><button type="button" class="ah-back" data-go="" aria-label="' + T.back + '">‹</button><span class="ah-title">' + t + '</span></div>'; }
  function feat() { return top(T.feat + ' <i>' + FEAT.length + '</i>' + (zh ? ' ' + T.items : '')) + '<div class="ah-note">' + T.from + '</div><div class="ah-list ah-2">' + FEAT.map(function (e) { return card(e); }).join('') + '</div>'; }
  function cityView(c) {
    var L = regSorted(c), out = '', last = -1;
    L.forEach(function (e) { var w = wdOf(e); if (w !== last) { out += '<div class="ah-wd">' + T.WD[w] + '</div>'; last = w; } out += card(e); });
    var chips = S.open ? '<div class="ah-chips" style="margin-top:10px">' + CITIES.map(function (x) { return '<button type="button" class="ah-chip" data-city="' + esc(x) + '" aria-pressed="' + (x === c) + '">' + (x === c ? '✓ ' : '') + esc(cn(x)) + '<small>' + REG[x].length + '</small></button>'; }).join('') + '</div><button type="button" class="ah-fold" data-tog="1">' + T.fold + ' ▴</button>' : '';
    return top(esc(cn(c)) + ' · ' + T.weekly + ' <i>' + L.length + '</i>' + (zh ? ' ' + T.items : '')) + '<div class="ah-sels"><button type="button" class="ah-sel" data-tog="1" aria-expanded="' + S.open + '">' + esc(cn(c)) + ' <i>' + (S.open ? '▴' : '▾') + '</i></button></div>' + chips + '<div class="ah-list" style="margin-top:6px">' + (out || '<p>' + T.none + '</p>') + '</div>';
  }
  function srchSet(a) { if (a === 4) { var r = []; CITIES.forEach(function (c) { r = r.concat(REG[c].filter(function (e) { return e.kind === 'weekly'; })); }); return r; } return FEAT.filter(function (e) { return a < 0 || cat(e) === a; }); }
  function search() {
    var base = srchSet(S.a), cc = {}, cl = [];
    base.forEach(function (e) { if (!cc[e.city]) { cc[e.city] = 0; cl.push(e.city); } cc[e.city]++; });
    cl.sort(function (a, b) { return cc[b] - cc[a] || (a < b ? -1 : 1); });
    if (S.c && !cc[S.c]) S.c = '';
    var res = base.filter(function (e) { return !S.c || e.city === S.c; });
    if (S.a === 4) res.sort(function (a, b) { return rel(wdOf(a)) - rel(wdOf(b)); });
    var an = S.a < 0 ? T.allA : T.cats[S.a], ctn = S.c ? cn(S.c) : T.allC;
    var h = top(T.search) + '<div class="ah-sels"><button type="button" class="ah-sel" data-tog="1" aria-expanded="' + S.open + '">' + esc(an) + ' <i>' + (S.open ? '▴' : '▾') + '</i></button><button type="button" class="ah-sel" data-tog="1" aria-expanded="' + S.open + '">' + esc(ctn) + ' <i>' + (S.open ? '▴' : '▾') + '</i></button></div>';
    if (S.open) {
      var ch = function (on, attr, val, t, k) { return '<button type="button" class="ah-chip" ' + attr + '="' + esc(val) + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + esc(t) + '<small>' + k + '</small></button>'; };
      h += '<div class="ah-rowl">' + T.act + '</div><div class="ah-chips">' + ch(S.a < 0, 'data-a', -1, T.allA, FEAT.length) + T.cats.map(function (t, i) { return ch(S.a === i, 'data-a', i, t, srchSet(i).length); }).join('') + '</div>' +
        '<div class="ah-div" style="margin-top:14px"></div><div class="ah-rowl">' + T.city + '</div><div class="ah-chips">' + ch(!S.c, 'data-c', '', T.allC, base.length) + cl.map(function (c) { return ch(S.c === c, 'data-c', c, cn(c), cc[c]); }).join('') + '</div><button type="button" class="ah-fold" data-tog="1">' + T.fold + ' ▴</button>';
    }
    h += '<div class="ah-h" style="margin-top:20px"><b>' + esc(an) + ' · ' + esc(ctn) + ' <i style="font-style:normal;color:#C0392B">' + res.length + '</i>' + (zh ? ' ' + T.items : '') + '</b><span>' + T.from + ' · ' + T.sort + '</span></div><div class="ah-list ah-2">' + (res.map(function (e) { return card(e); }).join('') || '<p>' + T.none + '</p>') + '</div>';
    return h;
  }
  var lastR = null, lastC = '';
  function render() {
    var r = route(); R.classList.toggle('atm-h-on', !!r && !!DATA); R.classList.toggle('atm-h-home', !!r && r !== 'search');
    if (!r || !DATA) return;
    if (r !== lastR) S.open = false;
    var c = r === 'city' ? decodeURIComponent(location.hash.slice(8)) : '';
    root.innerHTML = r === 'home' ? home() : r === 'feat' ? feat() : r === 'search' ? search() : r === 'reg' ? regView() : cityView(c);
    root.setAttribute('data-view', r);
    if (r === 'city' && (r !== lastR || c !== lastC)) visit(c); lastC = c;
    if (r !== lastR) window.scrollTo(0, 0);
    lastR = r;
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-go')) { var g = b.getAttribute('data-go'); if (g) go(g); else if (history.length > 1 && lastFromHome) history.back(); else { history.pushState(null, '', location.pathname); render(); } return; }
    if (b.hasAttribute('data-city')) { S.open = false; go('#h-city-' + encodeURIComponent(b.getAttribute('data-city'))); return; }
    if (b.hasAttribute('data-fav')) { openFav(); return; }
    if (b.hasAttribute('data-unsug')) { var hs = sugHidden(); hs.push(b.getAttribute('data-unsug')); try { localStorage.setItem(HK, JSON.stringify(hs)); } catch (er) {} render(); return; }
    if (b.hasAttribute('data-tog')) { S.open = !S.open; render(); return; }
    if (b.hasAttribute('data-a')) { S.a = +b.getAttribute('data-a'); render(); return; }
    if (b.hasAttribute('data-c')) { S.c = b.getAttribute('data-c'); render(); return; }
  });
  var lastFromHome = false;
  addEventListener('hashchange', function () { lastFromHome = true; render(); });
  /* title bar: magnifier + ♥ (with count) */
  var MG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><line x1="15" y1="15" x2="20.5" y2="20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var bS = D.createElement('button'); bS.type = 'button'; bS.className = 'ah-hbtn ah-hsearch'; bS.innerHTML = MG; bS.setAttribute('aria-label', T.search);
  var bF = D.createElement('button'); bF.type = 'button'; bF.className = 'ah-hbtn ah-hfav'; bF.innerHTML = '<span class="ah-hrt" aria-hidden="true">♥</span><span class="ah-badge" hidden></span>'; bF.setAttribute('aria-label', T.fav);
  bS.addEventListener('click', function () { S.open = false; S.a = -1; S.c = ''; go('#h-search'); });
  bF.addEventListener('click', openFav);
  function favIds() { var a = []; try { a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); } catch (e) {} if (window.ATM_FAV && window.ATM_FAV.get && !a.length) a = window.ATM_FAV.get(); if (!DATA) return a; var m = {}; DATA.forEach(function (e) { m[e.id] = e; }); return a.filter(function (id) { return live(m[id]); }); }
  function badge() { var k = favIds().length, s = bF.querySelector('.ah-badge'); s.textContent = k; s.hidden = !k; }
  var ly = null;
  function closeFav() { if (ly) { ly.remove(); ly = null; D.body.style.overflow = ''; } }
  function openFav() {
    closeFav(); var m = {}; DATA.forEach(function (e) { m[e.id] = e; }); var ids = favIds();
    ly = D.createElement('div'); ly.className = 'ah-ly'; ly.setAttribute('role', 'dialog'); ly.setAttribute('aria-modal', 'true'); ly.setAttribute('aria-label', T.fav);
    ly.innerHTML = '<div class="ah-box"><div class="ah-lyh"><b>♥ ' + T.fav + ' <i>' + ids.length + '</i></b><button type="button" class="ah-x" aria-label="' + T.close + '">×</button></div><div class="ah-list">' + (ids.map(function (i) { return card(m[i]); }).join('') || '<p style="color:#5b7f84">' + T.favnone + '</p>') + '</div><div class="ah-lyn">' + T.favnote + '</div></div>';
    ly.addEventListener('click', function (e) { if (e.target === ly || e.target.closest('.ah-x')) closeFav(); });
    D.body.appendChild(ly); D.body.style.overflow = 'hidden';
  }
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFav(); });
  addEventListener('storage', function (e) { if (e.key === 'atm_fav_v1') badge(); });
  addEventListener('pageshow', function () { if (DATA) { badge(); render(); } });
  function mount() {
    var nav = D.querySelector('.china-hero-bar .top-lang'); if (nav && !bS.parentNode) { nav.parentNode.insertBefore(bS, nav); /* v11.7: header ♥ removed (favorites via home 「全部 N 项 ›」) */ }
    var st = D.querySelector('.china-sticky-top'); if (st && !root.parentNode) st.parentNode.insertBefore(root, st.nextSibling);
  }
  function start() {
    mount();
    var sp = fetch('/data/suggested_favs.json?v=s1', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { SUG = j.ids || []; }).catch(function () {});
    fetch('/asia/events.json?v=h6', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) { return sp.then(function () { return d; }); }).then(function (d) { prep(Array.isArray(d) ? d : d.events || []); badge(); render(); }).catch(function () { R.classList.remove('atm-h-on', 'atm-h-home'); });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
  window.ATM_HOME = { feat: function () { return FEAT; }, cities: function () { return CITIES.map(function (c) { return [c, REG[c].length]; }); }, render: render, openFav: openFav };
})();
