/* atm-addr.js — 2026-11-15
 * 1. ATM_ADDR.href(e, q): map link that opens the phone's own map app where the browser allows it
 *    (iPhone -> Apple Maps, Android -> geo: chooser / default map app). WeChat and other in-app
 *    browsers block app links, so they keep the web map (Amap in China, Google elsewhere).
 * 2. ATM_ADDR.html(e, lines, q): address block = address (tap to enlarge) + directions + map link.
 * 3. Tapping the address opens a full-screen card in the local language, large enough to show a
 *    taxi driver or a passer-by. Close with ×, the back button or Esc.
 * 4. Route pictures from the organizer: e.directions_images = ["/images/asia/directions/x.jpg", ...]
 *    or [{src, caption, caption_en, caption_ko, caption_es}]. Shown as small thumbnails; tap to view full screen.
 *    Text in the page language (directions_xx / caption_xx), else English, else the Chinese base field.
 * 5. 2026-11-17 mobile route lightbox only: on a tall phone a wide photo used to sit in the middle
 *    while 「路线图 n / n」 stayed at the top edge and the caption at the bottom edge. Narrow portrait
 *    screens now keep the step, the whole photo (original ratio) and the caption together.
 *    Desktop and short landscape windows keep the previous full-bleed layout.
 */
(function () {
  'use strict';
  if (window.ATM_ADDR) return;
  var LOCAL = /[぀-ヿ㐀-鿿豈-﫿가-힯]/;
  function zh() { return /^zh/i.test(document.documentElement.lang || '') || /\/zh\//.test(location.pathname); }
  function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function good(x) { return x && typeof x === 'string' && !/not found|没找到|未找到|unknown|未知|^tba$|待定/i.test(x) ? x.trim() : ''; }
  var T = zh()
    ? { dirLabel: '交通', pics: '路线图', map: '地图', big: '放大', title: '给司机或路人看', open: '打开地图', copy: '复制地址', copied: '已复制', close: '关闭', dir: '交通', prev: '上一张', next: '下一张' }
    : { dirLabel: 'Directions', pics: 'Route pictures', map: 'Map', big: 'Enlarge', title: 'Show this to a driver', open: 'Open map', copy: 'Copy address', copied: 'Copied', close: 'Close', dir: 'Getting there', prev: 'Previous', next: 'Next' };

  function inApp(ua) { return /MicroMessenger|QQ\/|MQQBrowser.*QQ|Weibo|AlipayClient|DingTalk|Lark|baiduboxapp|Instagram|FBAN|FBAV|Line\//i.test(ua); }
  function ios(ua) { return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); }
  function href(e, q) {
    var ua = navigator.userAgent || '', enc = encodeURIComponent(q || '');
    if (!inApp(ua)) {
      if (ios(ua)) return 'https://maps.apple.com/?q=' + enc;
      if (/Android/i.test(ua)) return 'geo:0,0?q=' + enc;
    }
    return (e && e.country === 'China' ? 'https://uri.amap.com/search?keyword=' : 'https://www.google.com/maps/search/?api=1&query=') + enc;
  }
  function target(u) { return /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''; }

  function phrase(e) {
    var c = (e && (e.region || e.country)) || '';
    if (/Taiwan|Hong Kong|Macao|Macau/i.test(c)) return '請帶我到這個地址';
    if (/China/i.test(c)) return '请带我去这个地址';
    if (/Korea/i.test(c)) return '이 주소로 가 주세요';
    if (/Japan/i.test(c)) return 'この住所までお願いします';
    return 'Please take me to this address';
  }
  function localOf(e) {
    var a = good(e && e.venue_address), en = good(e && e.venue_address_en);
    return { addr: a || en, en: a && en && en !== a ? en : '',
      venue: [e && e.venue, e && e.venue_zh, e && e.venue_ko].map(good).filter(function (v) { return v && LOCAL.test(v); })[0] || '',
      dir: good(e && e.directions) && LOCAL.test(e.directions) ? good(e.directions) : (good(e && e.directions_en) || good(e && e.directions)) };
  }
  /* Page language: zh, en, ko now; es and others later. Text fields fall back to English, then the base (Chinese) field. */
  function lang() {
    if (zh()) return 'zh';
    var l = ''; try { l = window.atmI18n && window.atmI18n.langOf ? window.atmI18n.langOf({ zhHint: false }) : ''; } catch (x) {}
    return /^[a-z]{2}$/.test(l || '') ? l : 'en';
  }
  function pickLang(o, base) {
    var l = lang();
    if (l === 'zh') return good(o[base]) || good(o[base + '_en']);
    return (l !== 'en' && good(o[base + '_' + l])) || good(o[base + '_en']) || good(o[base]);
  }
  function dirOf(e) { return e ? pickLang(e, 'directions') : ''; }

  function picsOf(e) {
    var a = e && e.directions_images; if (!Array.isArray(a)) return [];
    return a.map(function (x) {
      var o = typeof x === 'string' ? { src: x } : (x || {});
      var src = String(o.src || '');
      if (!/^(\/images\/|https:\/\/)/.test(src)) return null;
      return { src: src, cap: pickLang(o, 'caption') };
    }).filter(Boolean).slice(0, 8);
  }
  /* 2026-11-20: webp copies next to each route photo (tools/make_direction_thumbs.py):
     thumb/ for the card buttons, w800/ for the viewer. The original is only a fallback. */
  function thumbOf(src, kind) {
    var m = /^\/images\/asia\/directions\/([^\/?#]+)\.(?:jpe?g|png|webp)$/i.exec(src);
    return m ? '/images/asia/directions/' + (kind || 'thumb') + '/' + m[1] + '.webp' : src;
  }
  function thumbs(id, pics, cls) {
    if (!pics.length) return '';
    return '<span class="' + cls + '" aria-label="' + esc(T.pics) + '">' + pics.map(function (p, i) {
      return '<button type="button" class="atm-adr-pic" data-adrimg="' + id + ':' + i + '" aria-label="' + esc(T.pics + ' ' + (i + 1)) + '"><img src="' + esc(thumbOf(p.src)) + '" data-full="' + esc(p.src) + '" alt="" loading="lazy" onerror="if(this.src.indexOf(\'/thumb/\')>0){this.onerror=null;this.src=this.getAttribute(\'data-full\')}"></button>';
    }).join('') + '</span>';
  }
  var store = {}, seq = 0;
  /* lines: the address lines already chosen for this page (user language first, local second). */
  /* 2026-11-15 (3): the row label "地址 ↗" is the map link; the address text opens the enlarged card. */
  function label(e, q, text) {
    var u = href(e, q);
    return '<a class="atm-adr-lbl" href="' + esc(u) + '"' + target(u) + ' aria-label="' + esc(text + ' · ' + T.open) + '">' + esc(text) + ' <span aria-hidden="true">↗</span></a>';
  }
  function html(e, lines, q, noMap) {
    if (!lines || !lines.length) return '';
    var id = 'a' + (++seq); store[id] = e;
    var u = href(e, q);
    return '<span class="atm-adr"><button type="button" class="atm-adr-t" data-adr="' + id + '" aria-label="' + esc(T.big) + '">' + lines.map(esc).join('<br>') + '<span class="atm-adr-zoom" aria-hidden="true">⤢</span></button>' +
      (noMap ? '</span>' : '') + (noMap ? '' : '<a class="atm-adr-map" href="' + esc(u) + '"' + target(u) + '>' + esc(T.map) + ' ↗</a></span>');
  }

  /* 2026-11-15 (2): directions and route pictures get their own row under the address. */
  function dirHtml(e) {
    var d = dirOf(e), pics = picsOf(e);
    if (!d && !pics.length) return '';
    var id = 'a' + (++seq); store[id] = e;
    return '<span class="atm-dirrow">' + (d ? '<span class="atm-adr-dir">' + esc(d) + '</span>' : '') + thumbs(id, pics, 'atm-adr-pics') + '</span>';
  }
  var css = '.atm-adr-lbl{color:#2A6FA8!important;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}.atm-adr-lbl span{font-size:.9em}.atm-adr{display:block}.atm-dirrow{display:block}.p10-row.atm-row-top,.b-row.atm-row-top{align-items:start!important}.atm-row-top>b{padding-top:2px}.atm-adr-t{all:unset;cursor:pointer;display:inline;color:inherit;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;-webkit-tap-highlight-color:transparent}' +
    '.atm-adr-t:focus-visible{outline:2px solid #2A6FA8;outline-offset:2px}.atm-adr-zoom{display:inline-block;margin-left:6px;font-size:.85em;opacity:.65;text-decoration:none}' +
    '.atm-adr-dir{display:block;color:inherit}.atm-adr-dir:before{content:"\\1F687  "}' +
    '.atm-adr-map{display:inline-block;margin-top:4px;font-size:.9em;font-weight:600}' +
    '.atm-adr-pics,.ab-pics{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}.atm-adr-pic{all:unset;cursor:pointer;width:88px;height:66px;border-radius:8px;overflow:hidden;border:1px solid #BCD8EF;background:#EAF3FB}.atm-adr-pic img{width:100%;height:100%;object-fit:cover;display:block}' +
    '#atm-adr-big .ab-pics .atm-adr-pic{width:128px;height:96px}' +
    '#atm-adr-pv{position:fixed;inset:0;z-index:2147483001;background:#0B2440;display:flex;flex-direction:column;color:#fff}#atm-adr-pv .pv-top{display:flex;justify-content:space-between;align-items:center;padding:max(8px,env(safe-area-inset-top)) 10px 4px 16px;font:600 15px/1.3 system-ui,sans-serif}' +
    '#atm-adr-pv .pv-x,#atm-adr-pv .pv-nav{all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff}#atm-adr-pv .pv-main{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;position:relative}' +
    '#atm-adr-pv img{max-width:100%;max-height:100%;object-fit:contain}#atm-adr-pv img.pv-lo{filter:blur(1.5px)}#atm-adr-pv .pv-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.35);border-radius:50%}#atm-adr-pv .pv-prev{left:8px}#atm-adr-pv .pv-next{right:8px}' +
    '#atm-adr-pv .pv-cap{padding:10px 18px max(14px,env(safe-area-inset-bottom));font:15px/1.45 system-ui,sans-serif;text-align:center;min-height:1em}' +
    '#atm-adr-pv .pv-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    '#atm-adr-pv .pv-nav[hidden]{display:none}' +
    '#atm-adr-pv:focus{outline:none}' +
    '@media (orientation:landscape) and (max-height:520px) and (min-width:541px) and (max-width:1000px){' +
      '#atm-adr-pv{box-sizing:border-box;padding-top:max(6px,env(safe-area-inset-top));padding-right:max(8px,env(safe-area-inset-right));padding-bottom:0;padding-left:max(12px,env(safe-area-inset-left));height:100vh;height:100dvh;max-height:100dvh}' +
      '#atm-adr-pv .pv-top{padding:0 max(4px,env(safe-area-inset-right)) 6px 4px;font:600 16px/1.35 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Noto Sans SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif}' +
      '#atm-adr-pv .pv-cap{box-sizing:border-box;max-height:calc(16px + 3 * 1.55em);overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px max(16px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));font:500 16px/1.55 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Noto Sans SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif;overflow-wrap:break-word}' +
      '#atm-adr-pv .pv-cap.pv-more{-webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 14px),transparent);mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 14px),transparent)}' +
      '#atm-adr-pv img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}' +
    '}' +
    '@media (max-width:540px) and (min-height:480px){' +
      '#atm-adr-pv{box-sizing:border-box;top:0;left:0;right:auto;bottom:auto;width:100%;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;overflow:hidden;overscroll-behavior:contain;' +
        'padding:max(10px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}' +
      '#atm-adr-pv::before,#atm-adr-pv::after{content:"";flex:1 1 0px;min-height:0;pointer-events:none}' +
      '#atm-adr-pv .pv-x{position:absolute;top:max(4px,env(safe-area-inset-top));right:max(4px,env(safe-area-inset-right));z-index:3}' +
      '#atm-adr-pv .pv-top{flex:0 0 auto;justify-content:center;width:100%;box-sizing:border-box;padding:0 52px 8px;text-align:center;' +
        'font:600 17px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Noto Sans SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif;letter-spacing:.04em}' +
      '#atm-adr-pv .pv-main{flex:0 1 auto;width:100%;min-height:0;max-height:min(72dvh,calc(100dvh - 15rem))}' +
      '#atm-adr-pv img{display:block;max-width:100%;max-height:min(72dvh,calc(100dvh - 15rem));width:auto;height:auto;object-fit:contain}' +
      '#atm-adr-pv .pv-cap{flex:0 1 auto;width:100%;box-sizing:border-box;margin:0;min-height:0;max-height:calc(12px + 4 * 1.65em);overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
        'padding:12px 4px 0;font:500 18px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Noto Sans SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif;' +
        'text-align:center;text-wrap:pretty;line-break:strict;overflow-wrap:break-word}' +
      '#atm-adr-pv .pv-cap.pv-more{-webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 16px),transparent);mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 16px),transparent)}' +
    '}' +
    '#atm-adr-big{position:fixed;inset:0;z-index:2147483000;background:#fff;color:#0B2440;display:flex;flex-direction:column;overflow:auto;-webkit-overflow-scrolling:touch}' +
    '#atm-adr-big .ab-top{display:flex;align-items:center;justify-content:space-between;padding:max(10px,env(safe-area-inset-top)) 12px 6px 18px;color:#4A5D73;font:600 15px/1.3 -apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif}' +
    '#atm-adr-big .ab-x{all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#0B2440;border-radius:50%}' +
    '#atm-adr-big .ab-body{flex:1;padding:8px 22px 18px;font-family:-apple-system,"PingFang SC","Hiragino Sans","Apple SD Gothic Neo","Noto Sans CJK SC","Noto Sans SC","Malgun Gothic","Microsoft YaHei",system-ui,sans-serif}' +
    '#atm-adr-big .ab-say{font-size:clamp(20px,5.6vw,30px);font-weight:600;margin:10px 0 18px;color:#2A6FA8}' +
    '#atm-adr-big .ab-venue{font-size:clamp(20px,5.6vw,30px);font-weight:600;margin:0 0 8px}' +
    '#atm-adr-big .ab-addr{font-size:clamp(28px,8.4vw,46px);font-weight:800;line-height:1.3;word-break:break-word;margin:0 0 16px}' +
    '#atm-adr-big .ab-dir{font-size:clamp(18px,5vw,26px);line-height:1.45;margin:0 0 16px;color:#0B2440}#atm-adr-big .ab-dir:before{content:"\\1F687  "}' +
    '#atm-adr-big .ab-en{font-size:15px;line-height:1.45;color:#4A5D73;margin:18px 0 0;padding-top:12px;border-top:1px solid #BCD8EF}' +
    '#atm-adr-big .ab-btns{display:flex;gap:10px;padding:12px 18px max(16px,env(safe-area-inset-bottom));border-top:1px solid #BCD8EF;background:#FAFCFF}' +
    '#atm-adr-big .ab-btns a,#atm-adr-big .ab-btns button{all:unset;cursor:pointer;flex:1;text-align:center;min-height:48px;display:flex;align-items:center;justify-content:center;border-radius:12px;font:700 16px/1.2 -apple-system,"PingFang SC","Noto Sans SC",system-ui,sans-serif}' +
    '#atm-adr-big .ab-btns .ab-open{background:#2A6FA8;color:#fff}#atm-adr-big .ab-btns .ab-copy{background:#EAF3FB;color:#0B2440;border:1px solid #BCD8EF;box-sizing:border-box}';
  var st = document.createElement('style'); st.id = 'atm-adr-css'; st.textContent = css; document.head.appendChild(st);

  var lock = null, pushed = false, lastFocus = null, skipPop = false;
  function close(fromPop) {
    var b = document.getElementById('atm-adr-big'); if (!b) return;
    b.remove(); document.documentElement.style.overflow = '';
    try { if (lock) lock.release(); } catch (x) {} lock = null;
    if (pushed && !fromPop) { pushed = false; skipPop = true; try { history.back(); } catch (x) { skipPop = false; } } else pushed = false;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (x) {}
  }
  function open(e) {
    close(true);
    var L = localOf(e), q = good(e.venue_address) || good(e.venue_address_en), u = href(e, q);
    var b = document.createElement('div');
    b.id = 'atm-adr-big'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); b.setAttribute('aria-label', T.title);
    b.innerHTML = '<div class="ab-top"><span>' + esc(T.title) + '</span><button type="button" class="ab-x" aria-label="' + esc(T.close) + '">×</button></div>' +
      '<div class="ab-body"><p class="ab-say">' + esc(phrase(e)) + '</p>' +
      (L.venue ? '<p class="ab-venue">' + esc(L.venue) + '</p>' : '') +
      '<p class="ab-addr">' + esc(L.addr) + '</p>' +
      (L.dir ? '<p class="ab-dir">' + esc(L.dir) + '</p>' : '') +
      (function () { var id = 'a' + (++seq); store[id] = e; return thumbs(id, picsOf(e), 'ab-pics'); })() +
      (L.en ? '<p class="ab-en">' + esc(L.en) + '</p>' : '') + '</div>' +
      '<div class="ab-btns"><a class="ab-open" href="' + esc(u) + '"' + target(u) + '>' + esc(T.open) + '</a><button type="button" class="ab-copy">' + esc(T.copy) + '</button></div>';
    document.body.appendChild(b);
    document.documentElement.style.overflow = 'hidden';
    b.querySelector('.ab-x').addEventListener('click', function () { close(); });
    var cp = b.querySelector('.ab-copy');
    cp.addEventListener('click', function () {
      var text = [L.venue, L.addr].filter(Boolean).join(' ');
      var done = function () { cp.textContent = T.copied; setTimeout(function () { cp.textContent = T.copy; }, 1600); };
      try { navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); }); } catch (x) { fallback(text); done(); }
    });
    try { history.pushState({ atmAdr: 1 }, ''); pushed = true; } catch (x) {}
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }, function () {}); } catch (x) {}
    b.querySelector('.ab-x').focus();
  }
  function fallback(text) {
    var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:-100px;opacity:0';
    document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove();
  }
  /* Same breakpoints as the mobile CSS. Inline geometry is applied only when the
     visible viewport is smaller than the layout viewport (WeChat / iOS toolbar). */
  var PV_MQ = '(max-width:540px) and (min-height:480px), (orientation:landscape) and (max-height:520px) and (min-width:541px) and (max-width:1000px)';
  var pvFitOn = false;
  function pvMobile() { try { return !!(window.matchMedia && window.matchMedia(PV_MQ).matches); } catch (x) { return false; } }
  function fitPv() {
    var v = document.getElementById('atm-adr-pv'); if (!v) return;
    var vv = window.visualViewport;
    var shrink = pvMobile() && vv && (vv.offsetTop > 1 || vv.offsetLeft > 1 || vv.height < window.innerHeight - 2 || vv.width < window.innerWidth - 2);
    if (!shrink) { v.style.top = v.style.left = v.style.right = v.style.bottom = v.style.width = v.style.height = ''; return; }
    v.style.top = vv.offsetTop + 'px';
    v.style.left = vv.offsetLeft + 'px';
    v.style.width = vv.width + 'px';
    v.style.height = vv.height + 'px';
    v.style.right = 'auto';
    v.style.bottom = 'auto';
  }
  function armPvFit() {
    if (pvFitOn) return;
    pvFitOn = true;
    fitPv();
    window.addEventListener('resize', fitPv);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitPv);
      window.visualViewport.addEventListener('scroll', fitPv);
    }
  }
  function disarmPvFit() {
    if (!pvFitOn) return;
    pvFitOn = false;
    window.removeEventListener('resize', fitPv);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', fitPv);
      window.visualViewport.removeEventListener('scroll', fitPv);
    }
  }
  function viewer(e, i) {
    var pics = picsOf(e); if (!pics.length) return;
    var old = document.getElementById('atm-adr-pv'); if (old) old.remove();
    var v = document.createElement('div'); v.id = 'atm-adr-pv'; v.tabIndex = -1; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-labelledby', 'atm-adr-pv-n');
    v.innerHTML = '<div class="pv-top"><span class="pv-n" id="atm-adr-pv-n"></span><button type="button" class="pv-x" aria-label="' + esc(T.close) + '">×</button></div>' +
      '<div class="pv-main"><img alt=""><button type="button" class="pv-nav pv-prev" aria-label="' + esc(T.prev) + '">‹</button><button type="button" class="pv-nav pv-next" aria-label="' + esc(T.next) + '">›</button></div><div class="pv-cap" id="atm-adr-pv-cap"></div><div class="pv-live" aria-live="polite" aria-atomic="true"></div>';
    document.body.appendChild(v);
    var img = v.querySelector('img'), n = v.querySelector('.pv-n'), cap = v.querySelector('.pv-cap'), live = v.querySelector('.pv-live'), pv = v.querySelector('.pv-prev'), nx = v.querySelector('.pv-next');
    function syncCap() {
      var more = cap.scrollHeight > cap.clientHeight + 2 && cap.scrollTop + cap.clientHeight < cap.scrollHeight - 2;
      cap.classList.toggle('pv-more', more);
    }
    /* Like posters: the card's thumb is already cached, so show it at once (sized as the
       800 copy so nothing jumps), swap in the 800 copy when it arrives, then fetch the rest. */
    var tok = 0, warmed = false;
    function warm() {
      if (warmed) return; warmed = true;
      pics.forEach(function (p) { var w = thumbOf(p.src, 'w800'); if (w !== p.src) { var t = new Image(); t.decoding = 'async'; t.src = w; } });
    }
    function plain() { img.classList.remove('pv-lo'); img.style.width = img.style.height = ''; img.onload = img.onerror = null; }
    function sizeLo() {
      var w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return;
      var s = 800 / Math.max(w, h);
      img.style.width = Math.round(w * s) + 'px'; img.style.height = Math.round(h * s) + 'px';
    }
    function load(p) {
      var my = ++tok, hi = thumbOf(p.src, 'w800'), lo = thumbOf(p.src, 'thumb');
      plain();
      if (hi === p.src) { img.src = p.src; return; }
      img.classList.add('pv-lo');
      img.onload = function () { if (my === tok && img.classList.contains('pv-lo')) sizeLo(); };
      img.onerror = function () { if (my !== tok) return; plain(); img.src = p.src; };
      img.src = lo; if (img.complete) sizeLo();
      var t = new Image(); t.decoding = 'async';
      t.onload = function () { if (my !== tok) return; plain(); img.src = hi; warm(); };
      t.onerror = function () { if (my !== tok) return; plain(); img.src = p.src; warm(); };
      t.src = hi;
    }
    function show(k) {
      i = (k + pics.length) % pics.length;
      var capText = pics[i].cap || '';
      var label = T.pics + (pics.length > 1 ? ' ' + (i + 1) + ' / ' + pics.length : '');
      load(pics[i]);
      img.alt = '';
      cap.scrollTop = 0;
      cap.textContent = capText;
      n.textContent = label;
      if (capText) v.setAttribute('aria-describedby', 'atm-adr-pv-cap'); else v.removeAttribute('aria-describedby');
      live.textContent = capText ? (label + '。' + capText) : label;
      pv.hidden = nx.hidden = pics.length < 2;
      requestAnimationFrame(syncCap);
    }
    cap.addEventListener('scroll', syncCap, { passive: true });
    pv.addEventListener('click', function () { show(i - 1); }); nx.addEventListener('click', function () { show(i + 1); });
    var x0 = null, y0 = null;
    v.addEventListener('touchstart', function (ev) { if (!ev.touches || !ev.touches[0]) return; x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
    v.addEventListener('touchend', function (ev) {
      if (x0 == null || !ev.changedTouches || !ev.changedTouches[0]) return;
      var dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - (y0 || 0);
      x0 = null; y0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(i + (dx < 0 ? 1 : -1));
    }, { passive: true });
    v.querySelector('.pv-x').addEventListener('click', function () { closePv(); });
    try { history.pushState({ atmAdrPv: 1 }, ''); v.dataset.pushed = '1'; } catch (x) {}
    show(i || 0); armPvFit(); try { v.focus(); } catch (x) {}
  }
  function closePv(fromPop) { var v = document.getElementById('atm-adr-pv'); if (!v) return false; var p = v.dataset.pushed; disarmPvFit(); v.remove(); if (p && !fromPop) { skipPop = true; try { history.back(); } catch (x) { skipPop = false; } } return true; }
  window.addEventListener('popstate', function () { if (skipPop) { skipPop = false; return; } if (closePv(true)) return; if (document.getElementById('atm-adr-big')) close(true); });
  document.addEventListener('keydown', function (ev) {
    var v = document.getElementById('atm-adr-pv');
    if (v && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
      var b = v.querySelector(ev.key === 'ArrowLeft' ? '.pv-prev' : '.pv-next');
      if (b && !b.hidden) { ev.preventDefault(); b.click(); }
      return;
    }
    if (ev.key === 'Escape') { if (!closePv()) close(); }
  });
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest('[data-adrimg]');
    if (!t) return;
    var k = t.getAttribute('data-adrimg').split(':'), e = store[k[0]]; if (!e) return;
    ev.preventDefault(); ev.stopPropagation(); viewer(e, +k[1] || 0);
  }, true);
  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest('[data-adr]');
    if (!t) return;
    var e = store[t.getAttribute('data-adr')]; if (!e) return;
    ev.preventDefault(); ev.stopPropagation(); lastFocus = t; open(e);
  }, true);

  window.ATM_ADDR = { href: href, html: html, label: label, dirHtml: dirHtml, dirLabel: T.dirLabel, open: open, dir: dirOf };
})();
