/* china332: events-core/more first-paint; china331: +3 ATM_TH thumbs (E097, manual-cd-*) */
/* Asia Tango Map — shared logic. Requires window.CHINA_UI before load. */
(function(){
  /* v10.6: cards show small WebP thumbnails (480px, ~10x lighter); the full poster loads only in the viewer (cover href). Falls back to the original if a thumb is missing. */
  var ATM_TH = {"/images/asia/posters/AymclBjD.jpg":[379,683],"/images/asia/posters/E004.jpg":[480,640],"/images/asia/posters/E005.jpg":[480,720],"/images/asia/posters/E006.jpg":[480,835],"/images/asia/posters/E007.jpg":[480,679],"/images/asia/posters/E012.jpg":[480,716],"/images/asia/posters/E016.jpg":[480,598],"/images/asia/posters/E042.jpg":[472,590],"/images/asia/posters/E093.jpg":[480,640],"/images/asia/posters/R001.jpg":[480,1033],"/images/asia/posters/R006.jpg":[480,720],"/images/asia/posters/R008.jpg":[480,641],"/images/asia/posters/R009.jpg":[480,640],"/images/asia/posters/R010.jpg":[480,719],"/images/asia/posters/R015.jpg":[480,673],"/images/asia/posters/R015_wed.jpg":[480,672],"/images/asia/posters/R017.jpg":[480,854],"/images/asia/posters/R018.jpg":[480,674],"/images/asia/posters/R020.jpg":[480,766],"/images/asia/posters/R021.jpg":[480,480],"/images/asia/posters/R027.jpg":[480,791],"/images/asia/posters/R034.jpg":[480,640],"/images/asia/posters/R036.jpg":[480,854],"/images/asia/posters/R037.jpg":[480,270],"/images/asia/posters/R041.jpg":[480,854],"/images/asia/posters/R044.jpg":[480,854],"/images/asia/posters/R045.jpg":[480,600],"/images/asia/posters/R059.jpg":[480,642],"/images/asia/posters/R073.jpg":[480,720],"/images/asia/posters/U06.jpg":[480,640],"/images/asia/posters/U11.jpg":[480,624],"/images/asia/posters/aanirocB.jpg":[480,449],"/images/asia/posters/generated/R007.png":[480,600],"/images/asia/posters/generated/R011.png":[480,600],"/images/asia/posters/generated/R019.png":[480,600],"/images/asia/posters/generated/R022.png":[480,600],"/images/asia/posters/generated/R023.png":[480,600],"/images/asia/posters/generated/R026.png":[480,600],"/images/asia/posters/generated/R029.png":[480,600],"/images/asia/posters/generated/R038.png":[480,600],"/images/asia/posters/generated/R040.png":[480,600],"/images/asia/posters/generated/R042.png":[480,600],"/images/asia/posters/generated/R043.png":[480,600],"/images/asia/posters/generated/R048.png":[480,600],"/images/asia/posters/generated/R051.png":[480,600],"/images/asia/posters/generated/R053.png":[480,600],"/images/asia/posters/generated/R054.png":[480,600],"/images/asia/posters/generated/R061.png":[480,600],"/images/asia/posters/generated/R064.png":[480,600],"/images/asia/posters/generated/R068.png":[480,600],"/images/asia/posters/jtzZIdAx.jpg":[480,853],"/images/asia/posters/rSFJaHtm.jpg":[480,720],"/images/asia/posters/tango_union_wed.jpg":[480,469],"/images/asia/posters/tbxuzmah.jpg":[480,720],"/images/asia/posters/wSeFVkSa.jpg":[480,891],"/images/korea/ktnow/E047_pista_halloween.jpg":[480,480],"/images/korea/ktnow/abrazos.jpg":[346,342],"/images/korea/ktnow/amigo_milonga.jpeg":[480,398],"/images/korea/ktnow/amigo_practica.png":[320,328],"/images/korea/ktnow/andante.jpeg":[480,480],"/images/korea/ktnow/andante_la_melodia_poster.jpg":[480,311],"/images/korea/ktnow/andante_orange_poster.webp":[480,506],"/images/korea/ktnow/azucar.png":[404,256],"/images/korea/ktnow/bailamos_tango.jpeg":[480,480],"/images/korea/ktnow/bonita.jpg":[400,400],"/images/korea/ktnow/cheongju_tango_urquiza.jpg":[151,151],"/images/korea/ktnow/club_troilo.jpg":[480,480],"/images/korea/ktnow/club_troilo_eg.jpg":[400,99],"/images/korea/ktnow/con_tango.webp":[286,294],"/images/korea/ktnow/daejeon_tango_academy_caminito.jpg":[400,403],"/images/korea/ktnow/daejeon_tango_onada.png":[480,319],"/images/korea/ktnow/detango.png":[332,182],"/images/korea/ktnow/el_tango.jpeg":[400,289],"/images/korea/ktnow/en_paz_studio.png":[480,395],"/images/korea/ktnow/hengyat_hwai_guide_practica.webp":[480,721],"/images/korea/ktnow/ideal_tango_cafe.png":[276,276],"/images/korea/ktnow/jinju_tango_people.jpg":[400,400],"/images/korea/ktnow/la_ventana_sueno_dulce.jpg":[469,469],"/images/korea/ktnow/la_ventana_tango_fire.webp":[480,367],"/images/korea/ktnow/la_vida_studio.jpg":[400,400],"/images/korea/ktnow/laboom.webp":[480,339],"/images/korea/ktnow/laboom_lavista.png":[480,480],"/images/korea/ktnow/luminoso_logo.jpg":[400,396],"/images/korea/ktnow/marine_tango.jpeg":[480,466],"/images/korea/ktnow/mariposa.jpg":[400,400],"/images/korea/ktnow/mi_vida_tango_studio.jpeg":[480,480],"/images/korea/ktnow/ocho_logo.jpeg":[480,469],"/images/korea/ktnow/otra.jpeg":[480,270],"/images/korea/ktnow/park_mi_tango.jpg":[400,404],"/images/korea/ktnow/postango.jpg":[358,364],"/images/korea/ktnow/solo_tango.png":[480,337],"/images/korea/ktnow/studio_242.jpg":[400,267],"/images/korea/ktnow/studio_ocho.jpg":[455,455],"/images/korea/ktnow/studio_ocho_ab_practica.webp":[480,481],"/images/korea/ktnow/studio_ocho_moonlight.webp":[480,480],"/images/korea/ktnow/studioaura.png":[480,480],"/images/korea/ktnow/tango_cafe_dia.jpeg":[400,270],"/images/korea/ktnow/tango_cafe_dia_viento.jpeg":[400,225],"/images/korea/ktnow/tango_club_mi_noche.jpeg":[480,720],"/images/korea/ktnow/tango_mio.jpeg":[400,401],"/images/korea/ktnow/todotango.jpg":[344,298],"/images/korea/ktnow/ulsan_tango_sociedad.jpg":[400,266],"/images/korea/tango_o_nada_20261029.png":[480,411],"/images/tianjin/aocheng_practica_poster.jpg":[400,560],"/images/hangzhou/poster.jpg":[480,679],"/images/chongqing/poster.jpg":[480,1005],"/images/chongqing/poster_en.jpg":[480,1005],"/images/miaoli/poster.jpg":[480,853],"/images/suzhou/poster.jpg":[480,716],"/images/changwon/schedule2027_zh.jpg":[480,340],"/images/changwon/schedule2027_en.jpg":[480,340],"/images/poster4_top.jpg":[480,720],"/images/stw-feat.jpg":[480,300],"/images/asia/posters/E097_gz2027.jpg":[480,270],"/images/asia/posters/manual-cd-ezequiel-2026.jpg":[480,932],"/images/asia/posters/manual-cd-spitel-2027.jpg":[480,720]};
  function thImg(p){ var t, q = String(p).split('?')[0]; t = ATM_TH[q]; if (!t) return ' src="' + esc(p) + '"'; p = q; return ' src="' + esc('/images/thumb' + p.replace(/\.[a-z]+$/i, '.webp')) + '" data-full="' + esc(p) + '" width="' + t[0] + '" height="' + t[1] + '" onerror="if(this.dataset.full&&this.src.indexOf(this.dataset.full)<0)this.src=this.dataset.full"'; }
  var UI = window.CHINA_UI || {};
  var isZh = UI.lang === 'zh';
  var citySel = document.getElementById('china-city');
  var PH_TXT = /^zh/.test(document.documentElement.lang || '') ? '请选城市' : 'Select a city';
  if (citySel && !citySel.querySelector('option[value=""]')) { var phO = document.createElement('option'); phO.value = ''; phO.textContent = isZh || /^zh/.test(document.documentElement.lang || '') ? '城市' : 'City'; citySel.insertBefore(phO, citySel.firstChild); }
  function cityHint(on){ if (!citySel) return; var w = citySel.parentNode, h = w.querySelector('.atm-city-hint');
    citySel.classList.toggle('atm-city-err', !!on);
    if (on && !h) { h = document.createElement('span'); h.className = 'atm-city-hint'; h.setAttribute('role', 'alert'); h.textContent = PH_TXT; w.appendChild(h); }
    if (h) h.hidden = !on; }
  if (citySel) citySel.addEventListener('change', function(){ if (citySel.value && citySel.value !== 'all') { var rg = document.querySelector('input[name="etype"][value="regular"]'); if (rg && !rg.checked) { var pick = citySel.value; rg.checked = true; citySel._lastCity = pick; applyFilters(); if (citySel.value !== pick) citySel.value = pick; } } /* v8d: picking a city in 特色 switches to 常规 */ if (citySel.value) { citySel._lastCity = citySel.value; cityHint(false); if (!citySel.disabled && citySel.value !== 'all' && typeof onSearch === 'function') setTimeout(onSearch, 0); } var sb = document.getElementById('china-search'); if (sb) sb.classList.toggle('atm-nocity', !citySel.disabled && citySel.value === ''); });
  var hint = document.getElementById('china-date-hint');
  var fromEl = document.getElementById('china-from');
  var toEl = document.getElementById('china-to');
  var searchBtn = document.getElementById('china-search');
  var root = document.getElementById('china-listings');
  var showAllEl = document.getElementById('china-showall');
  function showAll(){ return !!(showAllEl && showAllEl.checked); }
  function pastISO(days, months){ var n = new Date(); n = new Date(n.getFullYear(), n.getMonth() - (months||0), n.getDate() - (days||0)); var m = n.getMonth()+1, d = n.getDate(); return n.getFullYear() + '-' + (m<10?'0':'') + m + '-' + (d<10?'0':'') + d; }
  function todayISO(){ var n = new Date(), m = n.getMonth()+1, d = n.getDate(); return n.getFullYear() + '-' + (m<10?'0':'') + m + '-' + (d<10?'0':'') + d; }
  (function(){
    if (!fromEl || fromEl.value) return;
    var n = new Date(), y = n.getFullYear(), m = n.getMonth()+1, d = n.getDate();
    fromEl.value = y + '-' + (m<10?'0':'') + m + '-' + (d<10?'0':'') + d;
  })();
  (function(){ var s = document.querySelector('.atm-date-default'); if (!s || !fromEl) return; function pos(){ s.style.left = (fromEl.offsetLeft + fromEl.offsetWidth + 8) + 'px'; } pos(); window.addEventListener('resize', pos); window.addEventListener('load', pos); })();
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
  var CITY_ORDER = ['Beijing','Shanghai','Chongqing','Tianjin','Hong Kong','Guangzhou','Shenzhen','Xiamen','Zhongshan','Zhuhai','Haikou','Zhengzhou','Wuhan','Nanjing','Suzhou','Shenyang','Dalian','Jinan','Qingdao','Xi-an','Chengdu','Hangzhou','Ningbo','Taipei','Taichung','Miaoli','Seoul','Busan','Daejeon','Daegu','Gwangju','Ulsan','Changwon','Cheongju','Jinju','Pohang','Kuala Lumpur','Da Nang','Tokyo'];
  var CITY_ID = {'Beijing':'bj','Shanghai':'sh','Hong Kong':'hk','Shenzhen':'sz','Guangzhou':'gz','Suzhou':'su',
    'Taipei':'tp','Miaoli':'dv','Taichung':'tc','Chengdu':'cd','Chongqing':'cq','Hangzhou':'hz','Nanjing':'nj','Shenyang':'sy','Tianjin':'tj','Changwon':'cw','Kuala Lumpur':'kl','Da Nang':'dn','Tokyo':'tk','Seoul':'se','Busan':'bs','Daejeon':'dj','Gwangju':'gj','Daegu':'dg','Cheongju':'cj','Jinju':'jj','Pohang':'ph','Ulsan':'us'};
  function formatTime12(t){
    if (!t) return '';
    function one(x){
      var m = String(x).trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return x;
      var h = (+m[1]) % 24, mi = m[2], ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (!h) h = 12;
      return h + ':' + mi + ' ' + ap;
    }
    var parts = String(t).split(/[–-]/);
    if (parts.length === 2) return one(parts[0]) + '–' + one(parts[1]);
    return one(t);
  }
  function nthLabel(n, d){
    if (isZh) return '每月' + (n === -1 ? '最后一个' : '第' + ['','一','二','三','四','五'][n] + '个') + '周' + ['日','一','二','三','四','五','六'][d];
    var dn = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d];
    return (n === -1 ? 'Last' : ['','1st','2nd','3rd','4th','5th'][n]) + ' ' + dn + ' monthly';
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
      var s0 = String(o || '').replace(/\s+/g, ' ').trim(); if (/^[A-Za-z][A-Za-z .'-]* [\u4e00-\u9fff]{2,3}$/.test(s0)) { if (out.indexOf(s0) === -1) out.push(s0); return; } /* cardB: "Rose 常歌" = one person's English + Chinese name, keep whole on en */
      var s = String(o || '').replace(/[\u4e00-\u9fff]+/g, ' ').replace(/[（(]\s*[）)]/g, ' ').replace(/\s+/g, ' ').trim(); /* v8g: drop emptied brackets */
      if (/[A-Za-z]/.test(s) && out.indexOf(s) === -1) out.push(s);
    });
    if (!out.length) list.forEach(function(o){ var s = String(o || '').replace(/\s+/g, ' ').trim(); if (s && out.indexOf(s) === -1) out.push(s); }); /* cardB: Chinese-only organizer names still shown on en (Chinese mixed ok) */
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
  function cardDate(a, b){ /* v9.9: one card date format on zh+en, e.g. "June 18–22, 2027" */
    if (!a) return ''; b = b || a;
    if (isZh) { /* v10.6: zh pages show 2026/10/31 (YYYY/MM/DD); ranges 2026/11/05–09, 2026/10/28–11/02, 2026/12/30–2027/01/02 */
      var p2 = function(n){ return (n < 10 ? '0' : '') + n; }, X = a.split('-').map(Number), Y = b.split('-').map(Number), s0 = X[0] + '/' + p2(X[1]) + '/' + p2(X[2]);
      if (a === b) return s0; return s0 + '–' + Y[0] + '/' + p2(Y[1]) + '/' + p2(Y[2]); } /* cardB: full YYYY/MM/DD on both ends, same as cards */
    var M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var A = a.split('-').map(Number), B = b.split('-').map(Number), ma = M[A[1]-1], mb = M[B[1]-1];
    if (a === b) return ma + ' ' + A[2] + ', ' + A[0];
    if (A[0] !== B[0]) return ma + ' ' + A[2] + ', ' + A[0] + ' – ' + mb + ' ' + B[2] + ', ' + B[0];
    if (A[1] !== B[1]) return ma + ' ' + A[2] + ' – ' + mb + ' ' + B[2] + ', ' + B[0];
    return ma + ' ' + A[2] + '–' + B[2] + ', ' + A[0];
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
    var L = r.links || {}, out = [], FB_ZH_OFF = {'China':1,'Hong Kong':1,'Taiwan':1,'Macao':1,'Japan':1,'Malaysia':1};
    var zhReg = isZh && r.kind === 'weekly', isFb = function(u){ return /^https?:\/\/([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.me)(\/|$)/i.test(u || ''); };
    if (L.facebook && (!isZh || !FB_ZH_OFF[r.country])) /* v9.9: zh hides FB only for these existing countries; new countries (e.g. Vietnam) show FB */ out.push('<a class="china-linkbtn" href="' + esc(L.facebook) + '" target="_blank" rel="noopener">' + (UI.facebook || 'Facebook') + '</a>');
    if (L.register) out.push('<a class="china-linkbtn china-linkbtn-reg" href="' + esc(L.register) + '" target="_blank" rel="noopener">' + (isZh ? '报名' : 'Register') + '</a>');
    if (L.other && r.id !== 'nTUlADFZ' /* v10.8: Suzhou TangoBlast - poster/dot already open the event page; no 网站 row */ && !(isZh && isFb(L.other) && FB_ZH_OFF[r.country])) { var wh = /^https?:\/\/(www\.)?tangoweekend\.org(\/event(\/beijing-2027-tango-weekend)?)?\/?$/.test(L.other) ? 'https://tangoweekend.org/event/beijing-2027-tango-weekend/' + (isZh ? 'zh/' : '') : (isZh && /^https?:\/\/(www\.)?tangoweekend\.org\/event\/[^\/]+\/$/.test(L.other) ? L.other + 'zh/' : L.other);
      var wOwn = wh.match(/^https?:\/\/(www\.)?tangoweekend\.org(\/event\/.*)$/); /* v9.7: on-site page opens in the same tab so Back / 「← 亚洲探戈地图」 return to the same results */
      out.push('<a class="china-linkbtn" href="' + esc(wOwn ? wOwn[2] : wh) + '"' + (wOwn ? '' : ' target="_blank" rel="noopener"') + '>' + (wOwn && /^(cwCbtm27|manual-hz-jinsha|manual-cq-spicy-2026)$/.test(r.id) ? (isZh ? '详情' : 'Details') : (UI.website || 'Website')) + '</a>'); } /* v9.7: Changwon / Hangzhou Jinsha / Chongqing -> 详情 / Details */
    if (L.wechat) out.push('<a class="china-linkbtn" href="' + esc(L.wechat) + '" target="_blank" rel="noopener">' + (isZh ? '微信文章' : 'WeChat Article') /* v11.1: one label for all WeChat article links */ + '</a>');
    if (L.video && !isZh) out.push('<a class="china-linkbtn" href="' + esc(L.video) + '" target="_blank" rel="noopener">' + (UI.video || 'Video') + '</a>');
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
  var OWN_IMG = { 'hangzhou-2026-tango-festival': ['/images/hangzhou/poster.jpg','center 12%'],
    'chongqing-2026-tango-festival': [isZh ? '/images/chongqing/poster.jpg' : '/images/chongqing/poster_en.jpg','center 6%'],
    'miaoli-2026-tango-marathon': ['/images/miaoli/poster.jpg','center 10%'],
    'suzhou-2026-tango-blast-festival': ['/images/suzhou/poster.jpg','center 8%'],
    'changwon-2027-tango-marathon': [isZh ? '/images/changwon/schedule2027_zh.jpg?v=8' : '/images/changwon/schedule2027_en.jpg?v=7','center 40%'] };
  var BJ_IMG = ['/images/poster4_top.jpg','center 14%'];
  function ownCover(r){
    var u = (r.links && r.links.other) || '', m = u.match(/^https?:\/\/(www\.)?tangoweekend\.org\/event\/([^\/]+)\//);
    if (!m) return null;
    return OWN_IMG[m[2]] || (/^beijing-/.test(m[2]) ? BJ_IMG : null);
  }
  function ownAttr(r){
    var u = (r.links && r.links.other) || '', m = u.match(/^https?:\/\/(www\.)?tangoweekend\.org\/event\/([^\/]+)\/$/);
    return m ? ' data-own="/event/' + esc(m[2]) + '/' + (isZh ? 'zh/' : '') + '"' : '';
  }
  function card(r){
    var rid = cityId(r.city), attrs, when, body = [];
    var hl = /Select Tango Weekend/.test(r.name) || r.featured === true;
    if (r.kind === 'event' && r.start) {
      var dates = [], d = parseISO(r.start), e = parseISO(r.end || r.start);
      while (d <= e) { dates.push(isoOf(d)); d.setDate(d.getDate()+1); }
      attrs = ' data-dates="' + dates.join(',') + '" data-sort="' + dates[0] + '"' + ((r.end || r.start) < todayISO() ? ' data-past="1"' : '');
      when = cardDate(r.start, r.end || r.start);
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
        if (r.every === 2 && ds.length === 1) when = (isZh ? '隔周周' + ['日','一','二','三','四','五','六'][ds[0]] : 'Every other ' + ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][ds[0]]) + (r.time ? ' · ' + formatTime12(r.time) : ''); /* v10.2: biweekly */
        else if (r.nth && ds.length === 1) when = nthLabel(r.nth, ds[0]) + (r.time ? ' · ' + formatTime12(r.time) : ''); /* v8g: monthly nth weekday */
        else when = every + (ds.length > 1 ? DAYS[ds[0]] + '–' + DAYS[ds[ds.length-1]] : DAYS[ds[0]]) + (r.time ? ' · ' + formatTime12(r.time) : '');
      } else { when = UI.dayTba || 'Day TBA'; attrs += ' data-tba="1"'; }
      var unconf = r.confirmed_until && r.weekday != null && occISO(r.weekday) > r.confirmed_until; /* v9.4: no poster for this week */
      if (unconf) { when = when.replace(/ · .*$/, '') + ' · No'; body.push(line(UI.time || 'Time', '<span class="atm-unconfirmed" style="color:#9b1c1c;font-weight:700">' + (isZh ? 'No · 未确定，请联络组织者' : 'No · Not confirmed, please contact the organizer') + '</span>')); }
      else if (r.time) body.push(line(UI.time || 'Time', esc(formatTime12(r.time))));
    }
    if (r.venue) {
      var vName = r.venue; /* v10.9 address rule: en always English addr; zh mainland Chinese; zh overseas Chinese + English */
      var aEn = (r.venue_address_en && !/^\s*Address not found\s*$/i.test(r.venue_address_en)) ? r.venue_address_en : '';
      var mainland = r.country === 'China' && (r.region || 'China') === 'China';
      if (!isZh && /[\u4e00-\u9fff]/.test(r.venue) && r.venue_en) vName = r.venue_en;
      var addr = '', addrEn = '';
      if (!isZh) { var aShow = aEn || r.venue_address; if (aShow) addr = ' <span class="china-addr">· ' + esc(aShow) + '</span>'; }
      else {
        if (r.venue_address) addr = ' <span class="china-addr">· ' + esc(r.venue_address) + '</span>';
        if (aEn && aEn !== r.venue_address && (!mainland || r.addr_en_zh || !r.venue_address)) addrEn = '<div class="china-addr-en">' + esc(aEn) + '</div>';
      }
      body.push(line(UI.venue || 'Venue', esc(vName) + addr + addrEn));
    }
    if (r.kind === 'event') body.push(line(UI.city || 'City', cityLabel(r)));
    if (r.organizers && r.organizers.length) { var oe = organizersText(r.organizers); if (oe) body.push(line(UI.organizer || 'Organizer', esc(oe))); }
    if (r.note) body.push('<div class="ev-line china-announce atm-note-c' + (r.status === 'paused' ? ' china-announce-paused' : '') + '"><span class="ev-k">' + (UI.note || 'Note') + '</span> <span class="atm-note-t">' + esc((isZh && r.note_zh) || r.note) + '</span><button type="button" class="atm-note-tg" hidden>' + (isZh ? '更多' : 'More') + '</button></div>');
    var cb = contactBlock(r); if (cb) body.push(cb);
    var badges = '';
    if (hl) { var ou = (r.links && r.links.other) || '', own = /^https?:\/\/(www\.)?tangoweekend\.org\/event\/[^\/]+\/$/.test(ou);
      /* v10.8: 本站网页 / All Webs badge removed from cards */ }
    if (r.status === 'paused') badges += '<span class="china-badge china-badge-paused">' + (UI.paused || 'Paused') + '</span>';
    else if (r.status === 'venue_change') badges += '<span class="china-badge china-badge-venue">' + (UI.venueChange || 'Venue change') + '</span>';
    var cx = r.status === 'cancelled';
    if (!cx && r.cancelled_dates && r.weekday != null) { var t0 = baseDate(); var nx = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + ((r.weekday - t0.getDay() + 7) % 7)); cx = r.cancelled_dates.indexOf(nx.getFullYear() + '-' + pad(nx.getMonth()+1) + '-' + pad(nx.getDate())) !== -1; }
    var cxBar = cx ? '<div class="china-cancelled-bar">' + (r.status !== 'cancelled' ? (UI.cancelledWeek || 'Cancelled · this week') : (UI.cancelled || 'Cancelled')) + '</div>' : '';
    return '<li class="ev-card' + ((r.poster || r.poster_zh || r.poster_en) ? ' ev-has-poster' : '') + (cx ? ' china-cancelled' : '') + (hl ? ' china-stw-highlight' : '') + (r.status === 'paused' ? ' china-paused' : '') + '" data-id="' + esc(r.id) + '"' + ownAttr(r) + ' data-type="' + esc(r.type) + '" data-kind="' + esc(r.kind) + '" data-region="' + rid + '"' + ((r.region === 'Taiwan' || r.region === 'Hong Kong' || r.country === 'Taiwan' || r.country === 'Hong Kong') ? ' data-hant="1"' : '') + (r.also_regular ? ' data-also-regular="1"' : '') + (r.regular_oneoff ? ' data-oneoff="1"' : '') + (r.kind === 'weekly' && r.weekday != null ? ' data-occ="' + occISO(r.weekday) + '"' : '') + attrs + '>' + cxBar + (function(){ var pp = (isZh ? r.poster_zh : r.poster_en) || r.poster; if (pp) return '<a class="ev-cover" href="' + esc(pp) + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><img' + thImg(pp) + ' alt="" loading="lazy" decoding="async" style="object-position:' + esc(r.poster_pos || 'center top') + '"></a>'; var c = r.kind === 'event' && ownCover(r); return c ? '<a class="ev-cover" href="' + esc(r.links.other + (isZh ? 'zh/' : '')) + '" tabindex="-1" aria-hidden="true"><img' + thImg(c[0]) + ' decoding="async" alt="" loading="lazy" style="object-position:' + c[1] + '"></a>' : ''; })() +
      '<div class="ev-top"><span class="ev-type">' + esc(typeDisplay(r.type)) + '</span><span class="ev-when">' + esc(when) + '</span>' + badges + '</div>' +
      '<h3 class="ev-name">' + esc((isZh && r.name_zh) || r.name) + '</h3>' + body.join('') + linkBtns(r) + '</li>';
  }
  function group(title, items, cls){
    if (!items.length) return '';
    return '<div class="china-group' + (cls ? ' ' + cls : '') + '"><h3 class="china-sub-head">' + title + '</h3><ul class="china-list ev-list">' + items.map(card).join('') + '</ul></div>';
  }
  function renderFeatList(data){
    var box = document.querySelector('.tw-m-feat .wrap'); if (!box) return;
    
    var tdy = todayISO();
    var PICK = { 'cwCbtm27': 1, 'manual-hz-jinsha': 1 };
    var REC = {}; // Recommended section: exactly the event ids listed here (awaiting user)
    var ev = data.filter(function(r){ return r.kind === 'event' && !r.hidden && r.status !== 'cancelled' && (PICK[r.id] || (REC[r.id] && (r.end || r.start || '') >= tdy)) && !/Select Tango Weekend/.test(r.name); })
      .sort(function(a,b){ return (a.start || '').localeCompare(b.start || ''); });
    if (!ev.length) return;
    function fd(r){ return cardDate(r.start, r.end); }
    function href(r){ var L = r.links || {}, u = L.other || L.register || L.facebook || ''; return isZh && /^https?:\/\/(www\.)?tangoweekend\.org\/event\/[^\/]+\/$/.test(u) ? u + 'zh/' : u; }
    var IMG = OWN_IMG;
    var ZHN = { 'hangzhou-2026-tango-festival': '杭州金沙国际探戈节', 'chongqing-2026-tango-festival': '2026火辣探戈周末·第九届重庆探戈节', 'miaoli-2026-tango-marathon': '台湾探戈马拉松', 'suzhou-2026-tango-blast-festival': '2026苏州探戈节', 'changwon-2027-tango-marathon': '2027韩国昌原樱花探戈马拉松' };
    function card(u, img, pos, name, meta, tag){
      return '<a class="tw-fc" href="' + esc(u) + '">' + (img ? '<span class="tw-fc-img"><img' + thImg(img) + ' decoding="async" alt="" loading="lazy" style="object-position:' + pos + '"></span>' : '') +
        '<span class="tw-fc-body"><span class="tw-m-feat-k">' + (tag || (isZh ? '收藏' : 'FAVORITES')) + '</span><strong>' + esc(name) + '</strong><span class="tw-fc-meta">' + esc(meta) + '</span></span></a>'; }
    var bj = box.querySelector('a.tw-feat-photo'), bjHtml = '';
    if (bj) { bjHtml = card(bj.getAttribute('href'), '/images/poster4_top.jpg', 'center 14%', bj.querySelector('strong').textContent, (bj.querySelector('.tw-m-feat-meta') || {}).textContent || ''); bj.style.display = 'none'; }
    var grid = box.querySelector('.tw-m-feat-grid');
    if (!grid) { grid = document.createElement('div'); grid.className = 'tw-m-feat-grid'; box.appendChild(grid); }
    var items = [];
    ev.forEach(function(r){ var u = href(r); if (!u) return;
      var m = u.match(/\/event\/([^\/]+)\//), im = m && IMG[m[1]] || [];
      items.push([(PICK[r.id] ? 'P' : '') + (r.start || ''), card(u, im[0], im[1] || 'center', (isZh && m && ZHN[m[1]]) || r.name, fd(r) + ' · ' + cityDisplay(r.city), PICK[r.id] ? '' : (isZh ? '推荐' : 'RECOMMENDED'))]); });
    if (bjHtml) { var br = data.filter(function(r){ return r.kind === 'event' && /Select Tango Weekend/.test(r.name) && (r.end || r.start || '') >= tdy; })
        .sort(function(a,b){ return (a.start || '').localeCompare(b.start || ''); })[0];
      items.push(['P' + (br && br.start || '9999'), bjHtml]); }
    items.sort(function(a,b){ return a[0].localeCompare(b[0]); });
    var pin = items.filter(function(x){ return x[0].charAt(0) === 'P'; }), rest = items.filter(function(x){ return x[0].charAt(0) !== 'P'; });
    grid.classList.add('tw-feat-ad');
    grid.innerHTML = pin.map(function(x){ return x[1]; }).join('');
    var head = box.querySelector('.tw-feat-head'), grid2 = box.querySelector('.tw-feat-more');
    if (!grid2) { head = document.createElement('h2'); head.className = 'tw-feat-head'; head.textContent = isZh ? '推荐' : 'Recommended'; box.appendChild(head);
      grid2 = document.createElement('div'); grid2.className = 'tw-m-feat-grid tw-feat-more'; box.appendChild(grid2); }
    grid2.innerHTML = rest.map(function(x){ return x[1]; }).join('');
    head.hidden = grid2.hidden = !rest.length;
    box.classList.add('has-feat-grid');
    [grid, grid2].forEach(function(grid){ if (grid._drag) return; grid._drag = 1; var dx = null, sl = 0, moved = 0;
      grid.addEventListener('mousedown', function(e){ if (grid.scrollWidth <= grid.clientWidth + 1 || e.button) return; dx = e.pageX; sl = grid.scrollLeft; moved = 0; e.preventDefault(); });
      addEventListener('mousemove', function(e){ if (dx === null) return; var d = e.pageX - dx; if (Math.abs(d) > 4) { moved = 1; grid.classList.add('tw-drag'); } grid.scrollLeft = sl - d; });
      addEventListener('mouseup', function(){ dx = null; grid.classList.remove('tw-drag'); });
      grid.addEventListener('click', function(e){ if (moved) { e.preventDefault(); moved = 0; } }, true); });
  }
  function render(data){
    var cities = CITY_ORDER.slice();
    data.forEach(function(r){ if (cities.indexOf(r.city) === -1) cities.push(r.city); });
    var wkCount = {}; data.forEach(function(r){ if (r.kind === 'weekly' && !r.hidden) wkCount[r.city] = (wkCount[r.city] || 0) + 1; });
    var wkSess = {}; data.forEach(function(r){ if (r.kind !== 'weekly' || r.hidden) return; var n = (r.weekdays && r.weekdays.length) || (r.weekday != null ? 1 : 0); wkSess[r.city] = (wkSess[r.city] || 0) + n; });
    function sessLabel(c){ var n = wkSess[c] || 0; if (!n || c === 'Others') return cityDisplay(c); return UI.countWord ? cityDisplay(c) + n + '场' : cityDisplay(c) + ' (' + n + ')'; }
    window._chinaCitySessions = wkSess;
    var baseIdx = cities.slice();
    var cCountry = {}; data.forEach(function(r){ if (r.city && !cCountry[r.city]) cCountry[r.city] = r.country; });
    function regRank(c){ var k = (c === 'Hong Kong' || c === 'Macao' || c === 'Macau') ? 'Hong Kong' : (cCountry[c] || ''); return k === 'China' ? 0 : (k === 'Hong Kong' || k === 'Taiwan' || k === 'Macao' || k === 'Macau') ? 1 : (k === 'South Korea' || k === 'Korea') ? 2 : k === 'Japan' ? 4 : 3; }
    /* v9.9: region first (China > HK/Taiwan/Macao > Korea > others > Japan), then regular sessions desc, then name */
    cities.sort(function(a,b){ return (regRank(a) - regRank(b)) || ((wkSess[b]||0) - (wkSess[a]||0)) || cityDisplay(a).localeCompare(cityDisplay(b), isZh ? 'zh' : 'en'); });
    var OTHERS = cities.filter(function(c){ return (wkCount[c] || 0) < 1; });
    cities = cities.filter(function(c){ return OTHERS.indexOf(c) === -1; }).concat(OTHERS.length ? ['Others'] : []);
    window._chinaCityOrder = cities.slice();
    var cs = document.getElementById('china-city');
    if (cs) {
      var opts = Array.prototype.slice.call(cs.options).filter(function(o){ return o.value !== 'all' && o.value !== ''; });
      opts.forEach(function(o){ if (OTHERS.indexOf(optionCityEn(o)) !== -1) o.remove(); });
      opts = opts.filter(function(o){ return o.parentNode === cs && OTHERS.indexOf(optionCityEn(o)) === -1; });
      if (OTHERS.length && !cs.querySelector('option[value="others"]')) {
        var oo = document.createElement('option'); oo.value = 'others'; oo.setAttribute('data-en','Others'); oo.textContent = cityDisplay('Others'); opts.push(oo);
      }
      opts.sort(function(a,b){
        var ia = cities.indexOf(optionCityEn(a)), ib = cities.indexOf(optionCityEn(b));
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });
      opts.forEach(function(o){ var ce = optionCityEn(o); if (wkSess[ce]) o.textContent = sessLabel(ce); });
      var cur = cs.value; opts.forEach(function(o){ cs.appendChild(o); }); cs.value = cur;
    }
    var html = [];
    cities.forEach(function(c){
      var rs = data.filter(function(r){ return c === 'Others' ? OTHERS.indexOf(r.city) !== -1 : r.city === c; });
      if (!rs.length) return;
      var oneoff = rs.filter(function(r){ return r.regular_oneoff && r.start && !r.hidden; });
      var dated = rs.filter(function(r){ return r.kind === 'event' && r.start && !r.regular_oneoff; }).sort(function(a,b){ return a.start < b.start ? -1 : 1; });
      var tba = rs.filter(function(r){ return r.kind === 'event' && !r.start && !r.regular_oneoff; });
      var wk = rs.filter(function(r){ return r.kind === 'weekly'; });
      var tw = c !== 'Others' && rs[0].region === 'Taiwan';
      var h = ['<div class="china-city-block" id="region-' + cityId(c) + '" data-region="' + cityId(c) + '"><h2 class="china-city-head" data-cn="' + esc(cityDisplay(c)) + '">' + esc(sessLabel(c)) + (tw ? ' <span class="china-tw">' + (UI.taiwanLabel || 'Taiwan') + '</span>' : '') + (wk.length ? '<span class="china-title-sub"> — ' + (UI.weeklyHead || 'Weekly milongas &amp; practicas') + '</span>' : '') + '</h2>'];
      h.push(group(UI.events || 'Events', dated.concat(tba)));
      var sched = wk.filter(function(r){ return r.weekday != null; }) /* v9: monthly nth-weekday events always listed (labelled e.g. 2nd Sat monthly), not only in the week they fall in */, nos = wk.filter(function(r){ return r.weekday == null; });
      function owd(r){ return parseISO(r.start).getDay(); }
      if (sched.length || oneoff.length) {
        h.push('<h3 class="china-sub-head china-weekly-head">' + (UI.weeklyHead || 'Weekly milongas &amp; practicas') + '</h3>');
        [0,1,2,3,4,5,6].map(function(i){ return (baseDate().getDay() + i) % 7; }).forEach(function(d){
          h.push(group(weekdayHead(d), sched.filter(function(r){ return r.weekday === d; }).concat(oneoff.filter(function(r){ return owd(r) === d; })).sort(function(a,b){ return (a.time||'') < (b.time||'') ? -1 : 1; }), 'china-day'));
        });
        h.push(group(UI.dayTba || 'Day TBA', nos, 'china-day'));
      } else h.push(group((UI.weeklyHead || 'Weekly milongas &amp; practicas') + ' · ' + (UI.dayTba || 'Day TBA'), nos));
      h.push('</div>');
      html.push(h.join(''));
    });
    var allDated = data.filter(function(r){ return r.kind === 'event' && r.start && !r.regular_oneoff; }).sort(function(a,b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
    var allTba = data.filter(function(r){ return r.kind === 'event' && !r.start && !r.regular_oneoff; });
    html.push('<div class="china-chrono" hidden><h2 class="china-city-head">' + (UI.allCitiesChrono || 'All cities · Featured events by start date') + ' <span class="china-count"></span></h2><ul class="china-list ev-list">' + allDated.concat(allTba).map(function(r){ return card(r); }).join('') + '</ul></div>');
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
    if (li.getAttribute('data-oneoff') === '1') { var od = (li.getAttribute('data-dates') || '').split(',').filter(Boolean), rq = activeRange(), t0 = todayISO(), lo0 = rq ? (rq[0] > t0 ? rq[0] : t0) : t0, hi0 = (toEl && toEl.value) ? rq[1] : (function(){ var x = baseDate(); x.setDate(x.getDate() + 6); return x.getFullYear() + '-' + pad(x.getMonth()+1) + '-' + pad(x.getDate()); })(); return od.some(function(d){ return d >= lo0 && d <= hi0; }); } /* v10.8: one-off in 常规 = shown on its date's weekday within the 7-day / chosen window, hidden once past */
    if (!all && (li.getAttribute('data-tba') === '1' || li.getAttribute('data-past') === '1')) return false;
    if (li.getAttribute('data-always') === '1') return true;
    var dates = (li.getAttribute('data-dates') || '').split(',').filter(Boolean);
    if (all && li.getAttribute('data-tba') === '1') return true; /* v9: 日期未定 unchanged — shown when ticked */
    var r = activeRange(), tdy = todayISO(); if (!all) dates = dates.filter(function(d){ return d >= tdy; });
    if (!r) return all || dates.length > 0; if (!dates.length) return false;
    var lo = r[0]; if (all) { var p3 = pastISO(0, 3); if (p3 < lo) lo = p3; dates = dates.filter(function(d){ return d >= p3; }); } /* v9: 包含已结束 = featured ended within past 3 months */
    return dates.some(function(d){ return d >= lo && d <= r[1]; });
  }
  function typeMatches(li, types){
    var isEvent = li.getAttribute('data-kind') === 'event' && li.getAttribute('data-oneoff') !== '1'; /* v10.8: dated one-off milongas/practicas belong to 常规 */
    /* v8: 常规 and 特色 fully separate — also_regular events no longer appear in 常规 */
    return isEvent ? types.indexOf('event') !== -1 : types.indexOf('regular') !== -1;
  }
  window.updateCityOptions = updateCityOptions; /* v8e: used by asia-reglist.js */
  function updateCityOptions(){
    if (!citySel) return;
    var types = checkedTypes(), has = {};
    document.querySelectorAll('.china-city-block').forEach(function(block){
      var id = block.getAttribute('data-region'), n = 0;
      block.querySelectorAll('.china-list > li').forEach(function(li){ if (typeMatches(li, ['regular']) && itemMatchesDate(li)) n++; }); /* v8d: city list always shows 常规 counts (also in 特色) */
      if (n) has[id] = n;
    });
    Array.prototype.forEach.call(citySel.options, function(o){
      if (o.value === 'all' || o.value === '') return;
      var off = !has[o.value]; o.hidden = off; o.disabled = off;
      var base = o.getAttribute('data-en') ? cityDisplay(o.getAttribute('data-en')) : o.textContent.replace(/\d+场$|\s*[（(]\d+[）)]$/, '');
      o.textContent = has[o.value] ? base + (isZh ? '（' + has[o.value] + '）' : ' (' + has[o.value] + ')') : base;
    });
    var ev = types.length === 1 && types[0] === 'event';
    var allOpt = citySel._allOpt || (citySel._allOpt = citySel.querySelector('option[value="all"]'));
    var phOpt = citySel.querySelector('option[value=""]');
    if (ev) { /* v8d: 特色 — enabled city box, placeholder 城市/City, 常规 list; picking a city switches to 常规 */
      cityHint(false);
      if (citySel.value && citySel.value !== 'all') citySel._lastCity = citySel.value;
      citySel._fromEv = true;
      if (allOpt && allOpt.parentNode) allOpt.parentNode.removeChild(allOpt);
      if (phOpt) { phOpt.hidden = true; phOpt.disabled = true; if (citySel.options[0] !== phOpt) citySel.insertBefore(phOpt, citySel.options[0]); citySel.selectedIndex = phOpt.index; }
    } else {
      var cur = citySel.value;
      if (allOpt && allOpt.parentNode) allOpt.parentNode.removeChild(allOpt); /* v8: 常规 has no 所有城市 */
      var keep = cur && cur !== 'all' && has[cur] ? cur : ((citySel._lastCity && has[citySel._lastCity]) ? citySel._lastCity : '');
      if (phOpt) { phOpt.hidden = true; phOpt.disabled = true; if (citySel.options[0] !== phOpt) citySel.insertBefore(phOpt, citySel.options[0]); } /* placeholder shows in closed box only, not selectable */
      if (keep) citySel.value = keep; else if (phOpt) citySel.selectedIndex = phOpt.index;
    }
    if (!ev) citySel._fromEv = false;
    citySel.disabled = false; /* v8d: never locked */
    var evNote = document.querySelector('.atm-ev-note'); if (evNote) { if (evNote.dataset.evTxt == null) evNote.dataset.evTxt = evNote.textContent; evNote.textContent = evNote.dataset.evTxt; /* v8e: notes are static (no city box) */ }
    var sbtn = document.getElementById('china-search'); if (sbtn) sbtn.classList.toggle('atm-nocity', !ev && citySel.value === '');
  }
  function applyFilters(){
    updateCityOptions();
    var types = checkedTypes(), evM = types.length === 1 && types[0] === 'event';
    if (!evM && citySel && citySel.value === '') { document.body.classList.add('china-presearch'); return; } /* v8: 常规 without a city shows nothing (no stale 特色 results) */
    var city = evM ? 'all' : (citySel ? citySel.value : 'all'), totalVisible = 0; /* v8d: 特色 is always all cities */
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
      if (wh) { var any = false; block.querySelectorAll('.china-group.china-day').forEach(function(g){ if (!g.hidden) any = true; }); wh.hidden = !any; } var ts = block.querySelector('.china-title-sub'); if (ts) ts.hidden = !(wh && !wh.hidden);
      var dyn = block.querySelector('.china-date-empty');
      if (regionOk && shown === 0) {
        if (!dyn) { dyn = document.createElement('p'); dyn.className = 'china-empty note china-date-empty'; dyn.textContent = UI.noMatchCity || 'No events match these filters in this city.'; block.appendChild(dyn); }
        dyn.hidden = false;
      } else if (dyn) dyn.hidden = true;
      block.hidden = !regionOk || chrono || (city === 'all' && shown === 0);
      var chh = block.querySelector('.china-city-head[data-cn]'); if (chh && regionOk && shown && chh.firstChild && chh.firstChild.nodeType === 3 && block.getAttribute('data-region') !== 'others') { var cn = chh.getAttribute('data-cn'); chh.firstChild.textContent = UI.countWord ? cn + shown + '场' : cn + ' (' + shown + ')'; } /* v8f: heading count = results shown */
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
        /* v8d: no total on 所有城市 (city box shows 常规 list) */
        var cc = cd.querySelector('.china-count'); if (cc) cc.textContent = '(' + cv + ')';
      } else cd.hidden = true;
    }
    var ge = document.querySelector('.china-global-empty'); if (ge) ge.hidden = totalVisible > 0;
    var fv = fromEl && fromEl.value ? fromEl.value : todayISO(), tv = toEl && toEl.value ? toEl.value : '';
    function addD(iso, k){ var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + k); return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
    var w0 = fv, w1 = tv && tv >= fv ? tv : addD(fv, 6);
    var MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    function zhD(iso, yr){ var p = iso.split('-'); return (yr ? (+p[0]) + '年' : '') + (+p[1]) + '月' + (+p[2]) + '日'; }
    function enD(iso){ var p = iso.split('-'); return MN[+p[1]-1] + ' ' + (+p[2]) + ', ' + p[0]; }
    document.querySelectorAll('.china-city-head').forEach(function(h2){
      var fl = h2.nextElementSibling;
      if (!fl || !fl.classList.contains('china-from-line')) { fl = document.createElement('p'); fl.className = 'china-from-line'; h2.parentNode.insertBefore(fl, h2.nextSibling); }
      fl.hidden = !!h2.parentNode.querySelector('.china-list > li[data-kind="weekly"]'); /* v9: no from-line in 常规 weekly view */
      var vis = h2.parentNode.querySelectorAll('.china-list > li:not([hidden])'), n = 0;
      vis.forEach(function(li){
        if (li.getAttribute('data-kind') === 'weekly') {
          var oc = li.getAttribute('data-occ'); if (!oc || li.getAttribute('data-tba')) return;
          var wdy = new Date(oc + 'T00:00:00').getDay(), s0 = new Date(w0 + 'T00:00:00');
          var first = addD(w0, (wdy - s0.getDay() + 7) % 7);
          for (var d = first; d <= w1; d = addD(d, 7)) n++;
          return;
        }
        var ds = (li.getAttribute('data-dates') || '').split(',').filter(Boolean);
        if (ds.some(function(d){ return d >= w0 && d <= w1; })) n++;
      });
      var cname = (h2.firstChild && h2.firstChild.nodeType === 3 ? h2.firstChild.textContent : h2.textContent).trim().split(' · ')[0];
      var zh = !!UI.countWord, txt, reg = vis.length > 0;
      vis.forEach(function(li){ if (li.getAttribute('data-kind') !== 'weekly' && li.getAttribute('data-oneoff') !== '1') reg = false; });
      var zw = reg ? '项常规活动' : '项特色活动', ew = reg ? ' regular events' : ' featured events';
      if (!reg && !tv) { n = vis.length; txt = zh ? '从' + zhD(w0, true) + '起，共' + n + zw : 'from ' + enD(w0) + ' onward, ' + n + ew; }
      else if (tv) txt = zh ? zhD(w0, true) + '到' + zhD(w1, w1.slice(0,4) !== w0.slice(0,4)) + '，共' + n + zw
                       : 'from ' + enD(w0) + ' to ' + enD(w1) + ', ' + n + ew;
      else txt = zh ? '从' + zhD(w0, true) + '起，后七日，共' + n + zw
                    : 'from ' + enD(w0) + ', next 7 days, ' + n + ew;
      fl.textContent = txt; fl.hidden = vis.length === 0 || reg;
    });
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
    ['.site-header', '.china-region-nav', '.china-sticky-top'].forEach(function(sel){ var el = document.querySelector(sel); if (el && getComputedStyle(el).position === 'sticky') off = Math.max(off, el.getBoundingClientRect().bottom); });
    var y = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - off - 8;
    y = Math.max(0, y);
    try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch(e) { window.scrollTo(0, y); }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  /* v9.6: back from an on-site event page (banner / 「← 亚洲探戈地图」 link, no params) -> same mode+city results and scroll */
  var _atmRestoreY = null;
  (function(){ var L = null; try { L = JSON.parse(sessionStorage.getItem('atmLast') || 'null'); sessionStorage.removeItem('atmLast'); } catch(e){}
    if (!L || Date.now() - L.t > 3600000 || L.p !== location.pathname || !/^\?mode=/.test(L.q || '')) return;
    var r = document.referrer || '', fromEv = r.indexOf(location.origin + '/event/') === 0;
    if (!location.search && !location.hash && fromEv && window.history && history.replaceState) history.replaceState(null, '', location.pathname + L.q);
    if (location.search === L.q) { _atmRestoreY = L.y; try { history.scrollRestoration = 'manual'; } catch(e){} } })();
  (function(){ var q = location.search, deep = !!location.hash || /[?&](city|type|id|event|q|from|to|mode)=/.test(q);
    if (!deep) document.body.classList.add('china-presearch'); })();
  function onSearch(){ if (citySel && !citySel.disabled && citySel.value === '' && !(checkedTypes().length === 1 && checkedTypes()[0] === 'event')) { cityHint(true); try { citySel.focus(); } catch(e){} return; } document.body.classList.remove('china-presearch'); flashSearch(); if (window._chinaData) render(window._chinaData); applyFilters(); setTimeout(scrollToResults, 120); urlPush(); }
  /* v9.1: URL follows the selection (?mode=regular&city=gz / ?mode=featured); Back/refresh/shared links restore it */
  var _urlMute = false;
  function urlQS(){
    if (document.body.classList.contains('china-presearch')) return '';
    var t = checkedTypes(), ev = t.length === 1 && t[0] === 'event', c = citySel ? citySel.value : '';
    var qs = ev ? '?mode=featured' + (c && c !== 'all' ? '&city=' + encodeURIComponent(c) : '') : (c && c !== 'all' ? '?mode=regular&city=' + encodeURIComponent(c) : '');
    if (qs) { /* v9.9: date filter in shareable links */
      var fv = fromEl && fromEl.value, tv = toEl && toEl.value;
      if (fv && fv !== _dateDef.f) qs += '&date=' + fv;
      if (tv && tv !== _dateDef.t) qs += '&to=' + tv;
    }
    return qs;
  }
  var _dateDef = { f: fromEl ? fromEl.value : '', t: toEl ? toEl.value : '' };
  function urlDates(q){ var re = /^\d{4}-\d{2}-\d{2}$/;
    [[fromEl, q.get('date') || q.get('from')], [toEl, q.get('to')]].forEach(function(x){ var el = x[0], v = x[1]; if (!el) return;
      var want = v && re.test(v) ? v : (el === fromEl ? _dateDef.f : _dateDef.t);
      if (el.value !== want) { el.value = want; el.dispatchEvent(new Event('change', { bubbles: true })); } }); }
  ['china-from','china-to'].forEach(function(id){ var el = document.getElementById(id); if (el) el.addEventListener('change', function(){ setTimeout(urlPush, 0); }); });
  function langLinks(qs){ document.querySelectorAll('[data-asia-lang-set]').forEach(function(a){ var h = a.getAttribute('href') || ''; a.setAttribute('href', h.split('?')[0].split('#')[0] + qs); }); }
  function urlPush(){
    if (_urlMute || !window.history || !history.pushState) return;
    var qs = urlQS(); langLinks(qs);
    if (qs !== location.search) history.pushState({atm: qs}, '', location.pathname + qs);
  }
  function atmRestoreScroll(){ if (_atmRestoreY == null) return; var y = _atmRestoreY, n = 0; _atmRestoreY = null; setTimeout(function(){
    (function go(){ window.scrollTo(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight)); if (++n < 12 && Math.abs(window.pageYOffset - y) > 2) setTimeout(go, 150); })(); }, 500); }
  function urlApply(){
    var q = new URLSearchParams(location.search), m = q.get('mode'), c = q.get('city') || '';
    _urlMute = true;
    try {
      urlDates(q);
      if (m === 'featured' || m === 'regular') {
        var r = document.querySelector('input[name="etype"][value="' + (m === 'featured' ? 'event' : 'regular') + '"]');
        if (r) { r.checked = true; applyFilters(); }
        if (m === 'regular' && citySel && c && citySel.querySelector('option[value="' + c.replace(/"/g, '') + '"]')) { citySel.value = c; citySel._lastCity = c; }
        onSearch();
      } else {
        document.body.classList.add('china-presearch'); langLinks('');
        try { window.scrollTo(0, 0); } catch(e){}
      }
    } finally { _urlMute = false; }
    langLinks(urlQS());
  }
  window.addEventListener('popstate', function(){ if (pvClose()) return; if (window._chinaData) urlApply(); });
  /* v9.1: in-page poster viewer (no new tab); sticky bar = collapsed header; Back / Esc / outside click close */
  var pv = null, pvHome = false, pvY = 0;
  function pvBuild(){
    if (pv) return pv;
    var st = document.createElement('style');
    st.textContent = '.atm-pv{position:fixed;inset:0;z-index:10050;background:rgba(6,20,24,.92);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.atm-pv[hidden]{display:none}' +
      '.atm-pv-bar{position:sticky;top:0;z-index:2;height:44px;display:flex;align-items:center;box-sizing:border-box;border-bottom:1px solid #5fb3bb}' +
      '.atm-pv-bar .wrap{width:100%;display:flex;align-items:center;height:44px}' +
      '.atm-pv-t{display:inline-flex;align-items:center;gap:.35em;min-height:44px;margin:0;padding:0;border:0;background:none;cursor:pointer;font-weight:700;font-size:19px;line-height:44px;color:#F6D58E;text-shadow:0 1px 2px rgba(0,0,0,.35);white-space:nowrap}' +
      '.atm-pv-t::before{content:"";flex:0 0 auto;width:.95em;height:.95em;background-color:#F6D58E;-webkit-mask:var(--atm-mag) center/contain no-repeat;mask:var(--atm-mag) center/contain no-repeat;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}' +
      '.atm-pv-img{display:block;margin:0 auto;max-width:100%;height:auto;cursor:default}' +
      'body.china-page .ev-card>.ev-cover{cursor:pointer!important}' +
      '.atm-pv-x{position:fixed;top:52px;right:10px;z-index:3;width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:rgba(0,0,0,.55);color:#fff;font:400 30px/1 system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
      '.atm-pv-back{display:block;margin:18px auto 40px;min-width:180px;min-height:52px;padding:12px 28px;border-radius:999px;border:0;background:#F6D58E;color:#06333a;font:700 17px/1.2 inherit;cursor:pointer}' +
      '.ev-card.atm-ring{outline:3px solid #F6B93B!important;outline-offset:3px;transition:outline-color .9s ease}.ev-card.atm-ring-off{outline-color:rgba(246,185,59,0)!important}';
    st.textContent = st.textContent.replace(/var\(--atm-mag\)/g, 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2.6\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'10.5\' cy=\'10.5\' r=\'6.5\'/%3E%3Cpath d=\'M15.5 15.5L21 21\'/%3E%3C/svg%3E")');
    document.head.appendChild(st);
    pv = document.createElement('div'); pv.className = 'atm-pv'; pv.hidden = true; pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-modal', 'true');
    var h1 = document.querySelector('.china-map-hero h1'), hero = document.querySelector('.china-map-hero'), bar0 = document.querySelector('.china-hero-bar');
    var bar = document.createElement('div'); bar.className = 'atm-pv-bar';
    if (hero) { var cs = getComputedStyle(hero); bar.style.backgroundColor = cs.backgroundColor; bar.style.backgroundImage = cs.backgroundImage; }
    if (!bar.style.backgroundImage || bar.style.backgroundImage === 'none') bar.style.background = 'linear-gradient(160deg,#0e6e78 0%,#0a4f57 60%,#06333a 100%)';
    var w = document.createElement('div'); w.className = 'wrap';
    if (bar0) { var bs = getComputedStyle(bar0); w.style.paddingLeft = bs.paddingLeft; w.style.paddingRight = bs.paddingRight; w.style.maxWidth = bs.maxWidth; w.style.margin = '0 auto'; }
    var t = document.createElement('button'); t.type = 'button'; t.className = 'atm-pv-t'; t.innerHTML = h1 ? h1.innerHTML : 'Asia Tango Map';
    if (h1) t.style.fontFamily = getComputedStyle(h1).fontFamily;
    w.appendChild(t); bar.appendChild(w); pv.appendChild(bar);
    var img = document.createElement('img'); img.className = 'atm-pv-img'; img.alt = ''; pv.appendChild(img);
    /* v10.6 option A: way back to the card — big ✕, bottom 返回卡片/Back, swipe down; all go through history.back() so the phone back gesture works the same */
    var x = document.createElement('button'); x.type = 'button'; x.className = 'atm-pv-x'; x.setAttribute('aria-label', isZh ? '关闭' : 'Close'); x.textContent = '\u2715'; pv.appendChild(x);
    var bk = document.createElement('button'); bk.type = 'button'; bk.className = 'atm-pv-back'; bk.textContent = isZh ? '返回卡片' : 'Back'; pv.appendChild(bk);
    [x, bk].forEach(function(n){ n.addEventListener('click', function(e){ e.stopPropagation(); history.back(); }); });
    var ty = null; pv.addEventListener('touchstart', function(e){ ty = pv.scrollTop <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null; }, {passive: true});
    pv.addEventListener('touchend', function(e){ if (ty == null) return; var dy = e.changedTouches[0].clientY - ty; ty = null; if (dy > 90 && pv.scrollTop <= 0) history.back(); }, {passive: true});
    document.body.appendChild(pv);
    t.addEventListener('click', function(e){ e.stopPropagation(); history.back(); }); /* v9.6: title in viewer = back to the same results + scroll (was: home/clear search) */
    pv.addEventListener('click', function(e){ if (e.target === img) return; history.back(); });
    return pv;
  }
  var pvCard = null, pvTop = 0;
  function pvOpen(src){
    pvBuild(); var img = pv.querySelector('.atm-pv-img'); img.src = src; pv.scrollTop = 0; pvY = window.scrollY; pv.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    history.pushState({atmPv: 1}, '', location.href);
  }
  function pvClose(){
    if (!pv || pv.hidden) return false;
    pv.hidden = true; document.documentElement.style.overflow = ''; if (!pvHome) window.scrollTo(0, pvY);
    var rc = pvCard; pvCard = null; if (rc && !rc.isConnected) { var q = rc.getAttribute('data-id'), o = rc.getAttribute('data-occ'); rc = [].filter.call(document.querySelectorAll('.ev-card[data-id="' + q + '"]'), function(n){ return n.offsetParent && (!o || n.getAttribute('data-occ') === o) && !n.closest('.atm-recent'); })[0] || null; } if (rc && !pvHome) { var fixY = function(){ var d = rc.getBoundingClientRect().top - pvTop; if (Math.abs(d) > 1) window.scrollBy(0, d); }; fixY(); requestAnimationFrame(fixY); setTimeout(fixY, 250); rc.classList.remove('atm-ring-off'); rc.classList.add('atm-ring'); setTimeout(function(){ rc.classList.add('atm-ring-off'); }, 700); setTimeout(function(){ rc.classList.remove('atm-ring', 'atm-ring-off'); }, 1700); }
    if (pvHome) { pvHome = false; var compact = document.documentElement.classList.contains('atm-compact'), h = document.querySelector('.china-map-hero h1');
      if (!compact) document.documentElement.classList.add('atm-compact'); if (h) h.click(); }
    return true;
  }
  document.addEventListener('click', function(e){
    var cv = e.target.closest && e.target.closest('.ev-card .ev-cover'); if (!cv) return;
    var own = cv.closest('.ev-card') && cv.closest('.ev-card').getAttribute('data-own');
    if (own) { e.preventDefault(); e.stopPropagation(); try { if (location.search) sessionStorage.setItem('atmLast', JSON.stringify({p: location.pathname, q: location.search, y: window.pageYOffset || 0, t: Date.now()})); } catch(err){} location.assign(own); return; }
    var im = cv.querySelector('img'); if (!im) return;
    e.preventDefault(); e.stopPropagation(); pvCard = cv.closest('.ev-card'); pvTop = pvCard.getBoundingClientRect().top; pvOpen(im.getAttribute('data-full') || cv.getAttribute('href') && /\.(jpe?g|png|webp)(\?|$)/i.test(cv.getAttribute('href')) && cv.getAttribute('href') || im.currentSrc || im.src);
  }, true);
  /* v10.5: card links that open a new tab (公众号 / poster / website) failed in browsers that block or swallow target=_blank (favorites-strip links are same-tab and worked).
     On-site poster images open in the in-page viewer like the cover; other new-tab links fall back to the same tab if no window opened. */
  document.addEventListener('click', function(e){
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('.ev-card a[href]'); if (!a) return;
    var h = a.getAttribute('href') || ''; if (/^(tel|mailto|sms|javascript):/i.test(h)) return;
    var u; try { u = new URL(a.href, location.href); } catch(err){ return; }
    var own = u.origin === location.origin || /^(www\.)?tangoweekend\.org$/.test(u.hostname);
    if (own && /\.(jpe?g|png|webp|gif)$/i.test(u.pathname)) { e.preventDefault(); pvOpen(u.href); return; }
    if (a.target !== '_blank') return;
    e.preventDefault(); var w = null;
    try { w = window.open(u.href, '_blank'); } catch(err){}
    if (w) { try { w.opener = null; } catch(err){} } else { location.href = u.href; }
  }, false);
  /* v10.5: click/tap on a list card body (not a link/button/poster) lifts it like the favorites cards; click again or elsewhere to drop. Transform only = neighbours never move. */
  document.addEventListener('click', function(e){
    var t = e.target; if (!t.closest) return;
    var c = t.closest('.ev-card'); var cur = document.querySelectorAll('.ev-card.atm-lift');
    if (c && t.closest('a,button,input,label,select,.ev-cover,.atm-pv')) { return; }
    for (var i = 0; i < cur.length; i++) if (cur[i] !== c) cur[i].classList.remove('atm-lift');
    if (c) c.classList.toggle('atm-lift');
  }, false);
  window.addEventListener('scroll', function(){ var cur = document.querySelectorAll('.ev-card.atm-lift'); if (!cur.length) return; var vh = innerHeight;
    for (var i = 0; i < cur.length; i++) { var r = cur[i].getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) cur[i].classList.remove('atm-lift'); } }, {passive:true});
  /* v9.7: any link from the results to an on-site page (网站 / poster / title links) remembers mode+city+scroll for the way back */
  document.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('a[href]'); if (!a || !location.search) return;
    try { var u = new URL(a.href, location.href); if ((u.origin !== location.origin && !/^(www\.)?tangoweekend\.org$/.test(u.hostname)) || u.pathname.indexOf('/event/') !== 0) return;
      sessionStorage.setItem('atmLast', JSON.stringify({p: location.pathname, q: location.search, y: window.pageYOffset || 0, t: Date.now()})); } catch(err){} }, true);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && pv && !pv.hidden) history.back(); });
  (function(){ var h = document.querySelector('.china-sticky-top h1') || document.querySelector('h1'); if (!h) return;
    h.addEventListener('click', function(){ if (location.search && window.history && history.pushState) { history.pushState({atm: ''}, '', location.pathname); document.body.classList.add('china-presearch'); langLinks(''); } }); })(); /* v9.1: home (title) clears params */
  function syncDateShow(){
    document.querySelectorAll('.china-date-show').forEach(function(sp){
      var el = document.getElementById(sp.getAttribute('data-for'));
      if (!el) return;
      var v = el.value; sp.textContent = v ? formatDay(v) : (UI.anyDate || 'Any date');
      el.classList.toggle('has-en', true);
    });
  }
  ['china-from','china-to'].forEach(function(id){ var el = document.getElementById(id); if (el) { el.addEventListener('input', syncDateShow); el.addEventListener('change', syncDateShow);
    el.addEventListener('change', function(){ if (window._chinaData) { render(window._chinaData); applyFilters(); } }); /* v8g: nth events depend on the week — recount cities */
    el.addEventListener('click', function(){ try { el.showPicker(); } catch(e){} }); } });
  var _af = applyFilters; applyFilters = function(){ syncDateShow(); _af(); };
  if (searchBtn) searchBtn.addEventListener('click', onSearch);
  function onShowMode(){
    if (!fromEl) { applyFilters(); return; }
    if (showAll()) { fromEl.removeAttribute('min'); fromEl.value = pastISO(7); } /* v9: 常规 range starts today-7 */
    else { fromEl.min = CUTOFF; if (!fromEl.value || fromEl.value < CUTOFF || fromEl.value === pastISO(7)) fromEl.value = todayISO(); } /* v9: untick restores today */
    applyFilters();
  }
  if (showAllEl) showAllEl.addEventListener('change', onShowMode);
  Array.prototype.forEach.call(document.querySelectorAll('input[name="etype"]'), function(el){ el.addEventListener('change', function(){
    if (!el.checked && !document.querySelector('input[name="etype"]:checked')) el.checked = true;
    applyFilters();
  });
  if (el.value === 'event') el.addEventListener('click', function(){ setTimeout(function(){ if (el.checked) onSearch(); }, 0); }); /* v8: tapping 特色 (even if already selected) searches immediately */
  });
  [fromEl, toEl].forEach(function(el){ if (el) el.addEventListener('change', updateCityOptions); });
  [fromEl, toEl].forEach(function(el){ if (el) el.addEventListener('keydown', function(e){ if (e.key === 'Enter') onSearch(); }); });
  var sug=document.getElementById('china-suggest'), sugUrl=document.getElementById('suggest-url'), sugBtn=document.getElementById('suggest-submit'), sugThanks=document.getElementById('suggest-thanks');
  var sugModal=document.getElementById('china-suggest-modal'), sugOpen=document.getElementById('china-suggest-open');
  function sugReqOk(){ if (!sug) return true; var ok=true; Array.prototype.forEach.call(sug.querySelectorAll('[required]'), function(el){ if (!el.value.trim()) ok=false; }); return ok; }
  function sugReady(){ if (sugBtn) sugBtn.disabled = !sugReqOk(); }
  if (sug) { var sugInputs=Array.prototype.slice.call(sug.querySelectorAll('input.m-input'));
    sugInputs.forEach(function(el,i){ el.addEventListener('input', sugReady); el.addEventListener('change', sugReady);
      el.addEventListener('keydown', function(e){ if (e.key==='Enter' && !e.isComposing && e.keyCode!==229 && i<sugInputs.length-1) { e.preventDefault(); sugInputs[i+1].focus(); } }); }); }
  function sugShow(on){ if (!sugModal) return; sugModal.hidden=!on; document.body.style.overflow=on?'hidden':''; if (on && sug) setTimeout(function(){ var f=sug.querySelector('.m-input'); if (f) f.focus(); }, 50); }
  if (sugOpen) sugOpen.addEventListener('click', function(){ sugShow(true); });
  document.querySelectorAll('[data-suggest-close]').forEach(function(el){ el.addEventListener('click', function(){ sugShow(false); }); });
  document.addEventListener('keydown', function(e){ if (e.key==='Escape' && sugModal && !sugModal.hidden) sugShow(false); });
  if (sug) sug.addEventListener('submit', function(e){
    e.preventDefault();
    if (!sugReqOk()) return;
    var lines=[], data={};
    Array.prototype.forEach.call(sug.querySelectorAll('.sf-field'), function(el){ var v=el.value.trim(), l=el.getAttribute('data-label'); lines.push(l+(/[\u4e00-\u9fff]/.test(l)?'：':': ')+v); data[l]=v; });
    var email=((document.getElementById('suggest-email')||{}).value||'').trim();
    var wx=((document.getElementById('suggest-wechat')||{}).value||'').trim();
    var url=(sugUrl&&sugUrl.value.trim())||'';
    var body=lines.join('\n')+'\n\n'+(UI.suggestReplyTo||'Your email: ')+email+'\n'+(UI.suggestWechat||'Your WeChat ID: ')+wx+'\n'+(UI.suggestBodyUrl||'Event website: ')+url;
    var subj=UI.suggestSubject||'Asia Tango Map listing';
    var href='mailto:info@tangoweekend.org?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
    data._subject=subj; data._template='box'; data._captcha='false';
    data[UI.fsEmail||'Your email']=email;
    if (email) { data.email=email; data._replyto=email; data._autoresponse=UI.suggestAutoReply||'Thanks! We received your Asia Tango Map listing and will reply when it is published. — tangoweekend.org'; }
    data[UI.fsWechat||'Your WeChat ID']=wx; data[UI.fsUrl||'Event website']=url;
    if (sugBtn) { sugBtn.disabled=true; sugBtn.dataset.t=sugBtn.textContent; sugBtn.textContent=UI.suggestSending||'Sending…'; }
    fetch('https://formsubmit.co/ajax/0edcdf53a60c228d2d0dcabeee65286e',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || String(j.success)==='false') throw new Error(j.message||'fail'); }); })
      .then(function(){ if (sugThanks) sugThanks.hidden=false; sug.reset(); if (sugBtn) { sugBtn.textContent=sugBtn.dataset.t; } sugReady(); })
      .catch(function(){ if (sugBtn) { sugBtn.textContent=sugBtn.dataset.t; sugBtn.disabled=false; } window.location.href=href; });
  });
  var eventsUrl = UI.eventsUrl || 'events-core.json?v=china332';
  var unlockKr = /[?&]k=Seoul(&|$)/.test(location.search);
  var moreUrl = eventsUrl.replace('events-core.json', 'events-more.json');
  function atmJson(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
  /* china332: first-paint loads events-core (~CN/TW/HK regular + all featured); ?k=Seoul also loads events-more (KR/JP/… regular). Full asia/events.json kept for detail pages/tools. */
  (unlockKr ? Promise.all([fetch(eventsUrl).then(atmJson), fetch(moreUrl).then(function(r){ return r.ok ? r.json() : []; })]).then(function(a){ return a[0].concat(a[1] || []); })
            : fetch(eventsUrl).then(atmJson))
    .then(function(data){
      var up = data.reduce(function(a, r){ return r.updated && r.updated > a ? r.updated : a; }, '');
      if (up) { var p = up.split('-'), lbl = p[0] + '/' + p[1] + '/' + p[2];
        Array.prototype.forEach.call(document.querySelectorAll('.china-updated'), function(el){ el.textContent = lbl; }); }
      data = data.filter(function(r){ return !r.hidden; });
      /* display-only safety net (core already excludes overseas regular; still apply when someone points eventsUrl at full file) */
      if (!unlockKr) data = data.filter(function(r){ if (!(r.kind === 'weekly' || r.regular_oneoff)) return true; return /^(China|Taiwan|Hong Kong)$/.test(r.country || r.region || ''); });
      if (citySel) { var have = {}; Array.prototype.forEach.call(citySel.options, function(o){ have[o.value] = 1; });
        data.forEach(function(r){ var id = cityId(r.city); if (!have[id]) { have[id] = 1; var o = document.createElement('option'); o.value = id; o.setAttribute('data-en', r.city); o.textContent = cityDisplay(r.city); citySel.appendChild(o); } }); }
      window._chinaData = data; render(data); renderFeatList(data); applyFilters(); if (/[?&]mode=(featured|regular)/.test(location.search)) urlApply(); atmRestoreScroll(); })
    .catch(function(err){ root.innerHTML = '<p class="china-empty note">' + (UI.loadError || 'Could not load listings') + ' (' + esc(err.message) + '). ' + (UI.refresh || 'Please refresh.') + '</p>'; });
  /* v8f: collapsible note (one line + More/Less) */
  (function(){
    var st = document.createElement('style');
    st.textContent = '.atm-note-c:not(.open){display:flex;align-items:baseline;gap:4px}.atm-note-c:not(.open) .ev-k{flex:0 0 auto}.atm-note-c:not(.open) .atm-note-t{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atm-note-tg{flex:0 0 auto;background:none;border:0;padding:0 0 0 4px;margin:0;font:inherit;font-size:.9em;color:#0f5c63;text-decoration:underline;cursor:pointer;white-space:nowrap}.atm-note-tg[hidden]{display:none}';
    document.head.appendChild(st);
    function chk(t){ var box = t.parentNode, b = box.querySelector('.atm-note-tg'); if (!b || box.classList.contains('open') || !t.clientWidth) return; b.hidden = t.scrollWidth <= t.clientWidth + 1; }
    var ro = window.ResizeObserver ? new ResizeObserver(function(es){ es.forEach(function(e){ chk(e.target); }); }) : null;
    function scan(){ Array.prototype.forEach.call(document.querySelectorAll('.atm-note-t'), function(t){ if (ro && !t._ro) { t._ro = 1; ro.observe(t); } chk(t); }); }
    new MutationObserver(scan).observe(document.body, {childList:true, subtree:true});
    window.addEventListener('resize', scan); scan();
    document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.atm-note-tg'); if (!b) return;
      e.preventDefault(); e.stopPropagation(); var box = b.parentNode, o = box.classList.toggle('open');
      b.textContent = o ? (isZh ? '收起' : 'Less') : (isZh ? '更多' : 'More'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); }, true);
  })();
})();
