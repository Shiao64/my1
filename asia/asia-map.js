/* Asia Tango Map — shared logic. Requires window.CHINA_UI before load. */
(function(){
  var UI = window.CHINA_UI || {};
  var isZh = UI.lang === 'zh';
  var citySel = document.getElementById('china-city');
  var hint = document.getElementById('china-date-hint');
  var fromEl = document.getElementById('china-from');
  var toEl = document.getElementById('china-to');
  var searchBtn = document.getElementById('china-search');
  var root = document.getElementById('china-listings');
  var showAllEl = document.getElementById('china-showall');
  function showAll(){ return !!(showAllEl && showAllEl.checked); }
  function todayISO(){ var n = new Date(), m = n.getMonth()+1, d = n.getDate(); return n.getFullYear() + '-' + (m<10?'0':'') + m + '-' + (d<10?'0':'') + d; }
  (function(){
    if (!fromEl || fromEl.value) return;
    var n = new Date(), y = n.getFullYear(), m = n.getMonth()+1, d = n.getDate();
    fromEl.value = y + '-' + (m<10?'0':'') + m + '-' + (d<10?'0':'') + d;
  })();
  var CUTOFF = (function(){
    var t = new Date(), n = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    n.setDate(Math.min(t.getDate(), new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()));
    var m = n.getMonth()+1, d = n.getDate();
    return n.getFullYear() + '-' + (m<10?'0':'') + m + '-' + (d<10?'0':'') + d;
  })();
  if (fromEl) {
    fromEl.min = CUTOFF;
    fromEl.addEventListener('change', function(){ if (!showAll() && fromEl.value && fromEl.value < CUTOFF) fromEl.value = CUTOFF; });
  }
  var DAYS = UI.daysShort || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DAYF = UI.daysFull || ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var CITY_NAMES = UI.cityNames || {};
  var TYPE_NAMES = UI.typeNames || {};
  function cityDisplay(c){
    if (c === 'Others') return UI.others || 'Others';
    return CITY_NAMES[c] || c;
  }
  function typeDisplay(t){ return TYPE_NAMES[t] || t; }
  function baseDate(){
    var f = document.getElementById('china-from'), v = f && f.value;
    var t = v ? new Date(+v.slice(0,4), +v.slice(5,7)-1, +v.slice(8,10)) : new Date(); t.setHours(12,0,0,0); return t;
  }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function occISO(wd){ var t = baseDate(), n = new Date(t.getFullYear(), t.getMonth(), t.getDate() + ((wd - t.getDay() + 7) % 7)); return n.getFullYear() + '-' + pad(n.getMonth()+1) + '-' + pad(n.getDate()); }
  function nthOk(r){
    if (!r.nth) return true;
    var t = baseDate();
    var n = new Date(t.getFullYear(), t.getMonth(), t.getDate() + ((r.weekday - t.getDay() + 7) % 7));
    var k = Math.floor((n.getDate() - 1) / 7) + 1;
    if (r.nth === -1) return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 7).getMonth() !== n.getMonth();
    return k === r.nth;
  }
  function weekdayHead(d){
    var t = baseDate();
    var add = (d - t.getDay() + 7) % 7;
    var n = new Date(t.getFullYear(), t.getMonth(), t.getDate() + add);
    return DAYF[d] + ' ' + (n.getMonth()+1) + '/' + n.getDate();
  }
  var CITY_ORDER = ['Beijing','Shanghai','Chongqing','Tianjin','Hong Kong','Guangzhou','Shenzhen','Xiamen','Zhongshan','Zhuhai','Haikou','Zhengzhou','Wuhan','Nanjing','Suzhou','Shenyang','Dalian','Jinan','Qingdao','Xi-an','Chengdu','Hangzhou','Ningbo','Taipei','Doulan Village'];
  var CITY_ID = {'Beijing':'bj','Shanghai':'sh','Hong Kong':'hk','Shenzhen':'sz','Guangzhou':'gz','Suzhou':'su',
    'Taipei':'tp','Doulan Village':'dv','Taichung':'tc','Chengdu':'cd','Chongqing':'cq','Hangzhou':'hz','Nanjing':'nj','Shenyang':'sy','Tianjin':'tj'};
  function formatTime12(t){
    if (!t) return '';
    function one(x){
      var m = String(x).trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return x;
      var h = +m[1], mi = m[2], ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (!h) h = 12;
      return h + ':' + mi + ' ' + ap;
    }
    var parts = String(t).split(/[–-]/);
    if (parts.length === 2) return one(parts[0]) + '–' + one(parts[1]);
    return one(t);
  }
  function organizersText(list){
    if (!list || !list.length) return '';
    if (UI.keepOrganizerZh) {
      var out = [];
      list.forEach(function(o){
        var s = String(o || '').replace(/\s+/g, ' ').trim();
        if (s && out.indexOf(s) === -1) out.push(s);
      });
      return out.join('、');
    }
    var out = [];
    list.forEach(function(o){
      var s = String(o || '').replace(/[\u4e00-\u9fff]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]/.test(s) && out.indexOf(s) === -1) out.push(s);
    });
    return out.join(', ');
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function parseISO(s){ var p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  function isoOf(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function formatDay(s){ return s ? s.replace(/-/g, '/') : ''; }
  function formatRange(a, b){
    if (!a && !b) return UI.allDates || 'all dates';
    if (a && !b) return (UI.fromPrefix || 'from ') + formatDay(a);
    if (!a && b) return (UI.throughPrefix || 'through ') + formatDay(b);
    if (a === b) return formatDay(a);
    return formatDay(a) + ' – ' + formatDay(b);
  }
  function cityId(c){ return CITY_ID[c] || c.toLowerCase().replace(/[^a-z]/g,'').slice(0,6); }
  function line(k, v){ return '<div class="ev-line"><span class="ev-k">' + k + '</span> ' + v + '</div>'; }
  function contactBlock(r){
    var C = r.contacts || {};
    if (!C.wechat_id && !C.phone && !C.email) return '';
    var parts = [];
    if (C.wechat_id) {
      var wx = esc(C.wechat_id);
      if (C.wechat_label) wx += ' <span class="china-contact-note">(' + esc(C.wechat_label) + ')</span>';
      parts.push(line(UI.wechat || 'WeChat', wx));
    }
    if (C.phone) parts.push(line(UI.phone || 'Phone', '<a href="tel:' + esc(C.phone) + '">' + esc(C.phone) + '</a>'));
    if (C.email) parts.push(line(UI.email || 'Email', '<a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a>'));
    return '<div class="china-contact-block">' + parts.join('') + '</div>';
  }
  function linkBtns(r){
    var L = r.links || {}, out = [];
    if (L.facebook) out.push('<a class="china-linkbtn" href="' + esc(L.facebook) + '" target="_blank" rel="noopener">' + (UI.facebook || 'Facebook') + '</a>');
    if (L.other) out.push('<a class="china-linkbtn" href="' + esc(L.other) + '" target="_blank" rel="noopener">' + (UI.website || 'Website') + '</a>');
    if (L.wechat) out.push('<a class="china-linkbtn" href="' + esc(L.wechat) + '" target="_blank" rel="noopener">' + (UI.wechat || 'WeChat') + '</a>');
    if (L.video) out.push('<a class="china-linkbtn" href="' + esc(L.video) + '" target="_blank" rel="noopener">' + (UI.video || 'Video') + '</a>');
    return out.length ? '<div class="ev-line china-links">' + out.join('') + '</div>' : '';
  }
  function cityLabel(r){
    var name = cityDisplay(r.city);
    var suf = '';
    if (r.region === 'Taiwan') suf = UI.taiwanSuffix || ' · Taiwan';
    else if (r.region === 'Hong Kong' && r.city !== 'Hong Kong') suf = UI.hkSuffix || ' · Hong Kong';
    return esc(name) + suf;
  }
  function optionCityEn(o){ return (o.getAttribute('data-en') || o.textContent).trim(); }
  function card(r){
    var rid = cityId(r.city), attrs, when, body = [];
    var hl = /Select Tango Weekend/.test(r.name);
    if (r.kind === 'event' && r.start) {
      var dates = [], d = parseISO(r.start), e = parseISO(r.end || r.start);
      while (d <= e) { dates.push(isoOf(d)); d.setDate(d.getDate()+1); }
      attrs = ' data-dates="' + dates.join(',') + '" data-sort="' + dates[0] + '"' + ((r.end || r.start) < CUTOFF ? ' data-past="1"' : '');
      when = formatRange(r.start, r.end || r.start);
      body.push(line(UI.dates || 'Dates', when));
      if (r.time) body.push(line(UI.time || 'Time', esc(formatTime12(r.time))));
    } else if (r.kind === 'event') {
      attrs = ' data-always="1" data-tba="1"'; when = UI.datesTba || 'Dates TBA'; body.push(line(UI.dates || 'Dates', UI.tba || 'TBA'));
      if (r.time) body.push(line(UI.time || 'Time', esc(formatTime12(r.time))));
    } else {
      attrs = ' data-always="1"';
      var ds = r.weekdays || (r.weekday != null ? [r.weekday] : null);
      if (ds) {
        var every = UI.every || 'Every ';
        when = every + (ds.length > 1 ? DAYS[ds[0]] + '–' + DAYS[ds[ds.length-1]] : DAYS[ds[0]]) + (r.time ? ' · ' + formatTime12(r.time) : '');
      } else { when = UI.dayTba || 'Day TBA'; attrs += ' data-tba="1"'; }
      if (r.time) body.push(line(UI.time || 'Time', esc(formatTime12(r.time))));
    }
    if (r.venue) {
      var addr = r.venue_address ? ' <span class="china-addr">· ' + esc(r.venue_address) + '</span>' : '';
      var addrEn = (!UI.hideAddrEn && r.venue_address_en) ? '<div class="china-addr-en">' + esc(r.venue_address_en) + '</div>' : '';
      body.push(line(UI.venue || 'Venue', esc(r.venue) + addr + addrEn));
    }
    if (r.kind === 'event') body.push(line(UI.city || 'City', cityLabel(r)));
    if (r.organizers && r.organizers.length) { var oe = organizersText(r.organizers); if (oe) body.push(line(UI.organizer || 'Organizer', esc(oe))); }
    if (r.note) body.push('<div class="ev-line china-announce' + (r.status === 'paused' ? ' china-announce-paused' : '') + '"><span class="ev-k">' + (UI.note || 'Note') + '</span> ' + esc(r.note) + '</div>');
    var cb = contactBlock(r); if (cb) body.push(cb);
    var badges = '';
    if (hl) badges += '<span class="china-badge">' + (UI.ourEvent || 'Our event') + '</span>';
    if (r.status === 'paused') badges += '<span class="china-badge china-badge-paused">' + (UI.paused || 'Paused') + '</span>';
    else if (r.status === 'venue_change') badges += '<span class="china-badge china-badge-venue">' + (UI.venueChange || 'Venue change') + '</span>';
    var cx = r.status === 'cancelled';
    if (!cx && r.cancelled_dates && r.weekday != null) { var t0 = baseDate(); var nx = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + ((r.weekday - t0.getDay() + 7) % 7)); cx = r.cancelled_dates.indexOf(nx.getFullYear() + '-' + pad(nx.getMonth()+1) + '-' + pad(nx.getDate())) !== -1; }
    var cxBar = cx ? '<div class="china-cancelled-bar">' + (r.status !== 'cancelled' ? (UI.cancelledWeek || 'Cancelled 已取消 · this week') : (UI.cancelled || 'Cancelled 已取消')) + '</div>' : '';
    return '<li class="ev-card' + (cx ? ' china-cancelled' : '') + (hl ? ' china-stw-highlight' : '') + (r.status === 'paused' ? ' china-paused' : '') + '" data-id="' + esc(r.id) + '" data-type="' + esc(r.type) + '" data-kind="' + esc(r.kind) + '" data-region="' + rid + '"' + (r.kind === 'weekly' && r.weekday != null ? ' data-occ="' + occISO(r.weekday) + '"' : '') + attrs + '>' + cxBar +
      '<div class="ev-top"><span class="ev-type">' + esc(typeDisplay(r.type)) + '</span><span class="ev-when">' + esc(when) + '</span>' + badges + '</div>' +
      '<h3 class="ev-name">' + esc(r.name) + '</h3>' + body.join('') + linkBtns(r) + '</li>';
  }
  function group(title, items, cls){
    if (!items.length) return '';
    return '<div class="china-group' + (cls ? ' ' + cls : '') + '"><h3 class="china-sub-head">' + title + '</h3><ul class="china-list ev-list">' + items.map(card).join('') + '</ul></div>';
  }
  function render(data){
    var cities = CITY_ORDER.slice();
    data.forEach(function(r){ if (cities.indexOf(r.city) === -1) cities.push(r.city); });
    var wkCount = {}; data.forEach(function(r){ if (r.kind === 'weekly' && !r.hidden) wkCount[r.city] = (wkCount[r.city] || 0) + 1; });
    var baseIdx = cities.slice();
    cities.sort(function(a,b){ return ((wkCount[b]||0) - (wkCount[a]||0)) || (baseIdx.indexOf(a) - baseIdx.indexOf(b)); });
    var OTHERS = cities.filter(function(c){ return (wkCount[c] || 0) < 4; });
    cities = cities.filter(function(c){ return OTHERS.indexOf(c) === -1; }).concat(OTHERS.length ? ['Others'] : []);
    window._chinaCityOrder = cities.slice();
    var cs = document.getElementById('china-city');
    if (cs) {
      var opts = Array.prototype.slice.call(cs.options).filter(function(o){ return o.value !== 'all'; });
      opts.forEach(function(o){ if (OTHERS.indexOf(optionCityEn(o)) !== -1) o.remove(); });
      opts = opts.filter(function(o){ return o.parentNode === cs && OTHERS.indexOf(optionCityEn(o)) === -1; });
      if (OTHERS.length && !cs.querySelector('option[value="others"]')) {
        var oo = document.createElement('option'); oo.value = 'others'; oo.setAttribute('data-en','Others'); oo.textContent = cityDisplay('Others'); opts.push(oo);
      }
      opts.sort(function(a,b){
        var ia = cities.indexOf(optionCityEn(a)), ib = cities.indexOf(optionCityEn(b));
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      var cur = cs.value; opts.forEach(function(o){ cs.appendChild(o); }); cs.value = cur;
    }
    var html = [];
    cities.forEach(function(c){
      var rs = data.filter(function(r){ return c === 'Others' ? OTHERS.indexOf(r.city) !== -1 : r.city === c; });
      if (!rs.length) return;
      var dated = rs.filter(function(r){ return r.kind === 'event' && r.start; }).sort(function(a,b){ return a.start < b.start ? -1 : 1; });
      var tba = rs.filter(function(r){ return r.kind === 'event' && !r.start; });
      var wk = rs.filter(function(r){ return r.kind === 'weekly'; });
      var tw = rs[0].region === 'Taiwan';
      var h = ['<div class="china-city-block" id="region-' + cityId(c) + '" data-region="' + cityId(c) + '"><h2 class="china-city-head">' + esc(cityDisplay(c)) + (tw ? ' <span class="china-tw">' + (UI.taiwanLabel || 'Taiwan') + '</span>' : '') + ' <span class="china-count"></span></h2>'];
      h.push(group(UI.events || 'Events', dated.concat(tba)));
      var sched = wk.filter(function(r){ return r.weekday != null && nthOk(r); }), nos = wk.filter(function(r){ return r.weekday == null; });
      if (sched.length) {
        h.push('<h3 class="china-sub-head china-weekly-head">' + (UI.weeklyHead || 'Weekly milongas &amp; practicas') + '</h3>');
        [0,1,2,3,4,5,6].map(function(i){ return (baseDate().getDay() + i) % 7; }).forEach(function(d){
          h.push(group(weekdayHead(d), sched.filter(function(r){ return r.weekday === d; }).sort(function(a,b){ return (a.time||'') < (b.time||'') ? -1 : 1; }), 'china-day'));
        });
        h.push(group(UI.dayTba || 'Day TBA', nos, 'china-day'));
      } else h.push(group((UI.weeklyHead || 'Weekly milongas &amp; practicas') + ' · ' + (UI.dayTba || 'Day TBA'), nos));
      h.push('</div>');
      html.push(h.join(''));
    });
    var allDated = data.filter(function(r){ return r.kind === 'event' && r.start; }).sort(function(a,b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
    var allTba = data.filter(function(r){ return r.kind === 'event' && !r.start; });
    html.push('<div class="china-chrono" hidden><h2 class="china-city-head">' + (UI.allCitiesChrono || 'All cities · Events by start date') + ' <span class="china-count"></span></h2><ul class="china-list ev-list">' + allDated.concat(allTba).map(function(r){ return card(r); }).join('') + '</ul></div>');
    root.innerHTML = html.join('');
  }
  function activeRange(){
    var a = fromEl && fromEl.value ? fromEl.value : '', b = toEl && toEl.value ? toEl.value : '';
    if (!a && !b) return null;
    if (a && b && b < a) { var t = a; a = b; b = t; }
    return [a || '0000-01-01', b || '9999-12-31'];
  }
  function checkedTypes(){ return Array.prototype.map.call(document.querySelectorAll('input[name="etype"]:checked'), function(el){ return el.value; }); }
  function itemMatchesDate(li){
    var all = showAll();
    if (li.getAttribute('data-kind') === 'weekly') { var oc = li.getAttribute('data-occ'), rr = activeRange(); return !(oc && rr && oc > rr[1]); }
    if (!all && (li.getAttribute('data-tba') === '1' || li.getAttribute('data-past') === '1')) return false;
    if (li.getAttribute('data-always') === '1') return true;
    var dates = (li.getAttribute('data-dates') || '').split(',').filter(Boolean);
    var r = activeRange(); if (!r) return true; if (!dates.length) return false;
    return dates.some(function(d){ return d >= r[0] && d <= r[1]; });
  }
  function typeMatches(li, types){
    var isEvent = li.getAttribute('data-kind') === 'event';
    return isEvent ? types.indexOf('event') !== -1 : types.indexOf('regular') !== -1;
  }
  function updateCityOptions(){
    if (!citySel) return;
    var types = checkedTypes(), has = {};
    document.querySelectorAll('.china-city-block').forEach(function(block){
      var id = block.getAttribute('data-region'), n = 0;
      block.querySelectorAll('.china-list > li').forEach(function(li){ if (typeMatches(li, types) && itemMatchesDate(li)) n++; });
      if (n) has[id] = 1;
    });
    Array.prototype.forEach.call(citySel.options, function(o){
      if (o.value === 'all') return;
      var off = !has[o.value]; o.hidden = off; o.disabled = off;
    });
    var ev = types.length === 1 && types[0] === 'event';
    var allOpt = citySel.querySelector('option[value="all"]');
    if (ev) { if (citySel.value !== 'all') citySel._lastCity = citySel.value; citySel.value = 'all'; if (allOpt) { allOpt.hidden = false; allOpt.disabled = false; } }
    else {
      if (allOpt) { allOpt.hidden = true; allOpt.disabled = true; }
      if (citySel.value === 'all' || !has[citySel.value]) citySel.value = (citySel._lastCity && has[citySel._lastCity]) ? citySel._lastCity : (has.bj ? 'bj' : (Object.keys(has)[0] || 'bj'));
    }
    citySel.disabled = ev;
  }
  function applyFilters(){
    updateCityOptions();
    var city = citySel ? citySel.value : 'all', types = checkedTypes(), totalVisible = 0;
    var chrono = city === 'all' && types.length === 1 && types[0] === 'event';
    document.querySelectorAll('.china-city-block').forEach(function(block){
      var regionOk = (city === 'all' || city === block.getAttribute('data-region'));
      var items = block.querySelectorAll('.china-list > li'), shown = 0;
      items.forEach(function(li){
        var typeOk = typeMatches(li, types);
        var ok = regionOk && typeOk && itemMatchesDate(li);
        li.hidden = !ok; if (ok) shown++;
      });
      block.querySelectorAll('.china-group').forEach(function(g){ g.hidden = !g.querySelector('.china-list > li:not([hidden])'); });
      var wh = block.querySelector('.china-weekly-head');
      if (wh) { var any = false; block.querySelectorAll('.china-group.china-day').forEach(function(g){ if (!g.hidden) any = true; }); wh.hidden = !any; }
      var dyn = block.querySelector('.china-date-empty');
      if (regionOk && shown === 0) {
        if (!dyn) { dyn = document.createElement('p'); dyn.className = 'china-empty note china-date-empty'; dyn.textContent = UI.noMatchCity || 'No events match these filters in this city.'; block.appendChild(dyn); }
        dyn.hidden = false;
      } else if (dyn) dyn.hidden = true;
      block.hidden = !regionOk || chrono || (city === 'all' && shown === 0);
      var countEl = block.querySelector('.china-count');
      if (countEl) countEl.textContent = regionOk ? '(' + shown + ')' : '';
      if (regionOk) totalVisible += shown;
    });
    var cd = document.querySelector('.china-chrono');
    if (cd) {
      if (chrono) {
        var cv = 0;
        cd.querySelectorAll('.china-list > li').forEach(function(li){ var ok = itemMatchesDate(li); li.hidden = !ok; if (ok) cv++; });
        cd.hidden = false; totalVisible = cv;
        var cc = cd.querySelector('.china-count'); if (cc) cc.textContent = '(' + cv + ')';
      } else cd.hidden = true;
    }
    var ge = document.querySelector('.china-global-empty'); if (ge) ge.hidden = totalVisible > 0;
    if (hint) {
      var tail = showAll() ? (UI.hintShowAll || ' (Show all: incl. past & TBA).') : (UI.hintWeekly || ' (weekly always shown).');
      hint.textContent = (UI.dateRangeLabel || 'Date range: ') + formatRange(fromEl && fromEl.value, toEl && toEl.value) + (UI.showingSep || ' · Showing ') + totalVisible + (UI.listingsWord || ' listings') + tail;
    }
  }
  function flashSearch(){
    if (!searchBtn) return;
    searchBtn.classList.remove('is-flash'); void searchBtn.offsetWidth; searchBtn.classList.add('is-flash');
    setTimeout(function(){ searchBtn.classList.remove('is-flash'); }, 450);
  }
  function scrollToResults(){
    var cd = document.querySelector('.china-chrono');
    var target = (cd && !cd.hidden) ? cd : (document.querySelector('.china-city-block:not([hidden])') || document.querySelector('.china-global-empty:not([hidden])') || document.getElementById('china-listings'));
    if (!target) return;
    var off = 0;
    ['.site-header', '.china-region-nav'].forEach(function(sel){ var el = document.querySelector(sel); if (el && getComputedStyle(el).position === 'sticky') off = Math.max(off, el.getBoundingClientRect().bottom); });
    var y = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - off - 8;
    y = Math.max(0, y);
    try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch(e) { window.scrollTo(0, y); }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function onSearch(){ flashSearch(); if (window._chinaData) render(window._chinaData); applyFilters(); setTimeout(scrollToResults, 120); }
  function syncDateShow(){
    document.querySelectorAll('.china-date-show').forEach(function(sp){
      var el = document.getElementById(sp.getAttribute('data-for'));
      if (!el) return;
      var v = el.value; sp.textContent = v ? formatDay(v) : (UI.anyDate || 'Any date');
      el.classList.toggle('has-en', true);
    });
  }
  ['china-from','china-to'].forEach(function(id){ var el = document.getElementById(id); if (el) { el.addEventListener('input', syncDateShow); el.addEventListener('change', syncDateShow);
    el.addEventListener('click', function(){ try { el.showPicker(); } catch(e){} }); } });
  var _af = applyFilters; applyFilters = function(){ syncDateShow(); _af(); };
  if (searchBtn) searchBtn.addEventListener('click', onSearch);
  function onShowMode(){
    if (!fromEl) { applyFilters(); return; }
    if (showAll()) { fromEl.removeAttribute('min'); fromEl.value = ''; }
    else { fromEl.min = CUTOFF; if (!fromEl.value || fromEl.value < CUTOFF) fromEl.value = todayISO(); }
    applyFilters();
  }
  if (showAllEl) showAllEl.addEventListener('change', onShowMode);
  Array.prototype.forEach.call(document.querySelectorAll('input[name="etype"]'), function(el){ el.addEventListener('change', function(){
    if (!el.checked && !document.querySelector('input[name="etype"]:checked')) el.checked = true;
    applyFilters();
  }); });
  [fromEl, toEl].forEach(function(el){ if (el) el.addEventListener('change', updateCityOptions); });
  [fromEl, toEl].forEach(function(el){ if (el) el.addEventListener('keydown', function(e){ if (e.key === 'Enter') onSearch(); }); });
  var sug=document.getElementById('china-suggest'), sugUrl=document.getElementById('suggest-url'), sugBtn=document.getElementById('suggest-submit'), sugThanks=document.getElementById('suggest-thanks');
  var sugModal=document.getElementById('china-suggest-modal'), sugOpen=document.getElementById('china-suggest-open');
  function sugReady(){ if (sugBtn) sugBtn.disabled = !(sugUrl && sugUrl.value.trim()); }
  function sugShow(on){ if (!sugModal) return; sugModal.hidden=!on; document.body.style.overflow=on?'hidden':''; if (on && sugUrl) setTimeout(function(){ sugUrl.focus(); }, 50); }
  if (sugOpen) sugOpen.addEventListener('click', function(){ sugShow(true); });
  document.querySelectorAll('[data-suggest-close]').forEach(function(el){ el.addEventListener('click', function(){ sugShow(false); }); });
  document.addEventListener('keydown', function(e){ if (e.key==='Escape' && sugModal && !sugModal.hidden) sugShow(false); });
  if (sugUrl) { sugUrl.addEventListener('input', sugReady); sugUrl.addEventListener('change', sugReady); }
  if (sug) sug.addEventListener('submit', function(e){
    e.preventDefault();
    if (!sugUrl || !sugUrl.value.trim()) return;
    var details=(document.getElementById('suggest-details')||{}).value||'';
    var email=(document.getElementById('suggest-email')||{}).value||'';
    var body=(UI.suggestBodyUrl||'Event website: ')+sugUrl.value.trim()+'\n\n'+details.trim()+(email?'\n\n'+(UI.suggestReplyTo||'Reply-to: ')+email:'');
    var href='mailto:info@tangoweekend.org?subject='+encodeURIComponent(UI.suggestSubject||'Asia Tango Map listing')+'&body='+encodeURIComponent(body);
    window.location.href=href;
    if (sugThanks) sugThanks.hidden=false;
  });
  var eventsUrl = UI.eventsUrl || 'events.json?v=china137';
  fetch(eventsUrl, {cache: 'no-cache'})
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data){
      var up = data.reduce(function(a, r){ return r.updated && r.updated > a ? r.updated : a; }, '');
      if (up) { var p = up.split('-'), lbl = p[0] + '/' + p[1] + '/' + p[2];
        Array.prototype.forEach.call(document.querySelectorAll('.china-updated'), function(el){ el.textContent = lbl; }); }
      data = data.filter(function(r){ return !r.hidden; });
      if (citySel) { var have = {}; Array.prototype.forEach.call(citySel.options, function(o){ have[o.value] = 1; });
        data.forEach(function(r){ var id = cityId(r.city); if (!have[id]) { have[id] = 1; var o = document.createElement('option'); o.value = id; o.setAttribute('data-en', r.city); o.textContent = cityDisplay(r.city); citySel.appendChild(o); } }); }
      window._chinaData = data; render(data); applyFilters(); })
    .catch(function(err){ root.innerHTML = '<p class="china-empty note">' + (UI.loadError || 'Could not load listings') + ' (' + esc(err.message) + '). ' + (UI.refresh || 'Please refresh.') + '</p>'; });
})();
