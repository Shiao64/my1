/* atm-addr.js — 2026-11-15
 * 1. ATM_ADDR.href(e, q): map link that opens the phone's own map app where the browser allows it
 *    (iPhone -> Apple Maps, Android -> geo: chooser / default map app). WeChat and other in-app
 *    browsers block app links, so they keep the web map (Amap in China, Google elsewhere).
 * 2. ATM_ADDR.html(e, lines, q): address block = address (tap to enlarge) + directions + map link.
 * 3. Tapping the address opens a full-screen card in the local language, large enough to show a
 *    taxi driver or a passer-by. Close with ×, the back button or Esc.
 * 4. Route pictures from the organizer: e.directions_images = ["/images/asia/directions/x.jpg", ...]
 *    or [{src, caption, caption_en}]. Shown as small thumbnails; tap to view full screen.
 */
(function () {
  'use strict';
  if (window.ATM_ADDR) return;
  var LOCAL = /[぀-ヿ㐀-鿿豈-﫿가-힯]/;
  function zh() { return /^zh/i.test(document.documentElement.lang || '') || /\/zh\//.test(location.pathname); }
  function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function good(x) { return x && typeof x === 'string' && !/not found|没找到|未找到|unknown|未知|^tba$|待定/i.test(x) ? x.trim() : ''; }
  var T = zh()
    ? { pics: '路线图', map: '地图', big: '放大', title: '给司机或路人看', open: '打开地图', copy: '复制地址', copied: '已复制', close: '关闭', dir: '交通' }
    : { pics: 'Route pictures', map: 'Map', big: 'Enlarge', title: 'Show this to a driver', open: 'Open map', copy: 'Copy address', copied: 'Copied', close: 'Close', dir: 'Getting there' };

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
  function dirOf(e) {
    var ko = !zh() && !!(window.atmI18n && window.atmI18n.langOf && window.atmI18n.langOf({ zhHint: false }) === 'ko');
    return zh() ? (good(e.directions) || good(e.directions_en)) : ((ko && good(e.directions_ko)) || good(e.directions_en) || good(e.directions));
  }

  function picsOf(e) {
    var a = e && e.directions_images; if (!Array.isArray(a)) return [];
    return a.map(function (x) {
      var o = typeof x === 'string' ? { src: x } : (x || {});
      var src = String(o.src || '');
      if (!/^(\/images\/|https:\/\/)/.test(src)) return null;
      return { src: src, cap: zh() ? (o.caption || o.caption_en || '') : (o.caption_en || o.caption || '') };
    }).filter(Boolean).slice(0, 8);
  }
  function thumbs(id, pics, cls) {
    if (!pics.length) return '';
    return '<span class="' + cls + '" aria-label="' + esc(T.pics) + '">' + pics.map(function (p, i) {
      return '<button type="button" class="atm-adr-pic" data-adrimg="' + id + ':' + i + '" aria-label="' + esc(T.pics + ' ' + (i + 1)) + '"><img src="' + esc(p.src) + '" alt="" loading="lazy"></button>';
    }).join('') + '</span>';
  }
  var store = {}, seq = 0;
  /* lines: the address lines already chosen for this page (user language first, local second). */
  function html(e, lines, q) {
    if (!lines || !lines.length) return '';
    var id = 'a' + (++seq); store[id] = e;
    var u = href(e, q), d = dirOf(e);
    return '<span class="atm-adr"><button type="button" class="atm-adr-t" data-adr="' + id + '" aria-label="' + esc(T.big) + '">' + lines.map(esc).join('<br>') + '<span class="atm-adr-zoom" aria-hidden="true">⤢</span></button>' +
      (d ? '<span class="atm-adr-dir">' + esc(d) + '</span>' : '') +
      thumbs(id, picsOf(e), 'atm-adr-pics') +
      '<a class="atm-adr-map" href="' + esc(u) + '"' + target(u) + '>' + esc(T.map) + ' ↗</a></span>';
  }

  var css = '.atm-adr{display:block}.atm-adr-t{all:unset;cursor:pointer;display:inline;color:inherit;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;-webkit-tap-highlight-color:transparent}' +
    '.atm-adr-t:focus-visible{outline:2px solid #2A6FA8;outline-offset:2px}.atm-adr-zoom{display:inline-block;margin-left:6px;font-size:.85em;opacity:.65;text-decoration:none}' +
    '.atm-adr-dir{display:block;margin-top:4px;font-size:.92em;color:#4A5D73}.atm-adr-dir:before{content:"\\1F687  "}' +
    '.atm-adr-map{display:inline-block;margin-top:4px;font-size:.9em;font-weight:600}' +
    '.atm-adr-pics,.ab-pics{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}.atm-adr-pic{all:unset;cursor:pointer;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid #BCD8EF;background:#EAF3FB}.atm-adr-pic img{width:100%;height:100%;object-fit:cover;display:block}' +
    '#atm-adr-big .ab-pics .atm-adr-pic{width:96px;height:96px}' +
    '#atm-adr-pv{position:fixed;inset:0;z-index:2147483001;background:rgba(11,36,64,.94);display:flex;flex-direction:column;color:#fff}#atm-adr-pv .pv-top{display:flex;justify-content:space-between;align-items:center;padding:max(8px,env(safe-area-inset-top)) 10px 4px 16px;font:600 15px/1.3 system-ui,sans-serif}' +
    '#atm-adr-pv .pv-x,#atm-adr-pv .pv-nav{all:unset;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff}#atm-adr-pv .pv-main{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;position:relative}' +
    '#atm-adr-pv img{max-width:100%;max-height:100%;object-fit:contain}#atm-adr-pv .pv-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.35);border-radius:50%}#atm-adr-pv .pv-prev{left:8px}#atm-adr-pv .pv-next{right:8px}' +
    '#atm-adr-pv .pv-cap{padding:10px 18px max(14px,env(safe-area-inset-bottom));font:15px/1.45 system-ui,sans-serif;text-align:center;min-height:1em}' +
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
  function viewer(e, i) {
    var pics = picsOf(e); if (!pics.length) return;
    var old = document.getElementById('atm-adr-pv'); if (old) old.remove();
    var v = document.createElement('div'); v.id = 'atm-adr-pv'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', T.pics);
    v.innerHTML = '<div class="pv-top"><span class="pv-n"></span><button type="button" class="pv-x" aria-label="' + esc(T.close) + '">×</button></div>' +
      '<div class="pv-main"><img alt=""><button type="button" class="pv-nav pv-prev" aria-label="‹">‹</button><button type="button" class="pv-nav pv-next" aria-label="›">›</button></div><div class="pv-cap"></div>';
    document.body.appendChild(v);
    var img = v.querySelector('img'), n = v.querySelector('.pv-n'), cap = v.querySelector('.pv-cap'), pv = v.querySelector('.pv-prev'), nx = v.querySelector('.pv-next');
    function show(k) { i = (k + pics.length) % pics.length; img.src = pics[i].src; cap.textContent = pics[i].cap || ''; n.textContent = T.pics + (pics.length > 1 ? ' ' + (i + 1) + ' / ' + pics.length : ''); pv.hidden = nx.hidden = pics.length < 2; }
    pv.addEventListener('click', function () { show(i - 1); }); nx.addEventListener('click', function () { show(i + 1); });
    var x0 = null; v.addEventListener('touchstart', function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
    v.addEventListener('touchend', function (ev) { if (x0 == null) return; var dx = ev.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
    v.querySelector('.pv-x').addEventListener('click', function () { closePv(); });
    try { history.pushState({ atmAdrPv: 1 }, ''); v.dataset.pushed = '1'; } catch (x) {}
    show(i || 0); v.querySelector('.pv-x').focus();
  }
  function closePv(fromPop) { var v = document.getElementById('atm-adr-pv'); if (!v) return false; var p = v.dataset.pushed; v.remove(); if (p && !fromPop) { skipPop = true; try { history.back(); } catch (x) { skipPop = false; } } return true; }
  window.addEventListener('popstate', function () { if (skipPop) { skipPop = false; return; } if (closePv(true)) return; if (document.getElementById('atm-adr-big')) close(true); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { if (!closePv()) close(); } });
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

  window.ATM_ADDR = { href: href, html: html, open: open, dir: dirOf };
})();
