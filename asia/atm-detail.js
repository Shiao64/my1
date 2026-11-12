/* draft 2026-10-31: unified back arrow on event detail pages.
   Came from the map (or, with data-back, from any page of this site) -> history.back(); otherwise go to the map in the same language with ?card=<cardID>. */
(function () {
  var D = document, H = D.documentElement, zh = /\/zh\//.test(location.pathname) || (!/\/event\//.test(location.pathname) && /^zh/i.test(H.lang || '')), bar = D.querySelector('.atm-bar');
  if (!bar) return;
  D.body.classList.add('atm-detail');
  var KEY = 'atm_from_' + location.pathname, q = new URLSearchParams(location.search), from = q.get('from') || '';
  try { if (from) sessionStorage.setItem(KEY, from); else from = sessionStorage.getItem(KEY) || ''; } catch (e) {}
  var map = zh ? '/zh/asia/' : '/asia/', fb = bar.getAttribute('data-back') || '';
  var ref = ''; try { var u = new URL(D.referrer); if (u.origin === location.origin) ref = u.pathname; } catch (e) {}
  var cameMap = /\/asia\/?$/.test(ref), hl0 = history.length;
  var a = D.createElement('a'); a.className = 'atm-dback'; a.setAttribute('aria-label', zh ? '返回' : 'Back');
  a.innerHTML = '<svg viewBox="0 0 10 26" aria-hidden="true" focusable="false"><path d="M8.5 1.5L1.5 13l7 11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function href() { return fb || (map + (from ? '?card=' + encodeURIComponent(from) : '')); } /* draft 11/01: land on the card view, like the list's ‹ */
  a.href = href(); bar.insertBefore(a, bar.firstChild);
  a.addEventListener('click', function (e) {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var can = (fb ? !!ref : cameMap) && history.length > 1;
    if (can) { e.preventDefault(); history.go(-(1 + Math.max(0, history.length - hl0))); }
  });
  if (!from && !fb && window.fetch) {
    var slug = (location.pathname.match(/\/event\/([^\/]+)\//) || [])[1];
    if (slug) fetch('/asia/events.json').then(function (r) { return r.json(); }).then(function (d) {
      d = Array.isArray(d) ? d : (d.events || []);
      for (var i = 0; i < d.length; i++) { var o = ((d[i].links && d[i].links.other) || '') + ' ' + (typeof d[i].detail === 'string' ? d[i].detail : JSON.stringify(d[i].detail || '')); if (!d[i].hidden && o.indexOf('/event/' + slug + '/') > -1) { from = d[i].id; a.href = href(); break; } }
    }).catch(function () {});
  }
})();
/* draft 2026-10-31: mobile header like the list page — row 1: back 〈 left, site name centred, ☰ far right (proxies the page's own .nav-toggle so every page's menu logic keeps working); row 2 keeps only the event name; EN/中文 moves into the ☰ menu. */
(function () {
  var D = document, bar = D.querySelector('.atm-bar'), hdr = D.querySelector('.site-header'), tg = hdr && hdr.querySelector('.nav-toggle');
  if (!bar || !hdr || !tg) return;
  var zh = /^zh/i.test(D.documentElement.lang || ''), lang = bar.querySelector('a.atm-lang');
  var b = D.createElement('button'); b.type = 'button'; b.className = 'atm-dburger'; b.setAttribute('aria-label', zh ? '菜单' : 'Menu'); b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  bar.appendChild(b);
  b.addEventListener('click', function (e) { e.preventDefault(); tg.click(); setTimeout(sync, 0); });
  function sync() { var o = tg.getAttribute('aria-expanded') === 'true' || hdr.classList.contains('is-open') || hdr.classList.contains('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); }
  new MutationObserver(sync).observe(tg, { attributes: true, attributeFilter: ['aria-expanded'] });
  if (lang) {
    var box = hdr.querySelector('.main-nav') || hdr.querySelector('.header-menus') || hdr.querySelector('nav');
    if (box) { var l = D.createElement('a'); l.className = 'atm-dmlang'; l.href = lang.getAttribute('href'); l.setAttribute('hreflang', lang.getAttribute('hreflang') || ''); l.textContent = '🌐 ' + lang.textContent.trim(); l.addEventListener('click', function () { try { localStorage.setItem('twLang', l.getAttribute('hreflang') === 'en' ? 'en' : 'zh'); } catch (x) {} }); box.appendChild(l); }
  }
  function mode() { D.body.classList.remove('atm-dhb'); var m = getComputedStyle(tg).display !== 'none'; D.body.classList.toggle('atm-dhb', m); }
  mode(); addEventListener('resize', mode);
})();
/* draft 2026-10-31: close X (top-right, gold) + bottom 「返回列表 / Back to list」: page slides down, then the same return as 〈 (history.back when we came from the map, keeping its scroll; else map?card=<cardID>). */
(function () {
  var D = document, bar = D.querySelector('.atm-bar'), back = bar && bar.querySelector('.atm-dback'); if (!bar || !back) return;
  var zh = /^zh/i.test(D.documentElement.lang || '');
  function close(e) { if (e) e.preventDefault(); if (D.body.classList.contains('atm-closing')) return; D.body.classList.add('atm-closing'); setTimeout(function () { back.click(); }, 280); }
  addEventListener('pageshow', function () { D.body.classList.remove('atm-closing'); });
  var x = D.createElement('a'); x.className = 'atm-dclose'; x.href = back.href; x.setAttribute('aria-label', zh ? '关闭' : 'Close');
  x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  x.addEventListener('click', close); D.body.appendChild(x); /* draft 11/01: floating X on top layer, below the sticky bars, never inside them */
  function placeX() { var b = 0; [bar, D.querySelector('.site-header')].forEach(function (h) { if (h) { var r = h.getBoundingClientRect(); if (r.height && r.top < 160 && r.bottom > b) b = r.bottom; } }); x.style.top = Math.max(8, Math.round(b) + 10) + 'px'; }
  placeX(); window.addEventListener('resize', placeX); window.addEventListener('scroll', function () { if (!placeX._r) { placeX._r = 1; requestAnimationFrame(function () { placeX._r = 0; placeX(); }); } }, { passive: true }); window.addEventListener('load', placeX);
  var bt = D.createElement('div'); bt.className = 'atm-dfoot';
  bt.innerHTML = '<a class="atm-dlist" href="' + back.href + '">' + (zh ? '返回列表' : 'Back to list') + '</a>';
  bt.firstChild.addEventListener('click', close);
  D.body.appendChild(bt);
  setTimeout(function () { x.href = bt.firstChild.href = back.href; }, 1500);
})();
/* Event-article posters use the list viewer (.atm-pv). The href stays, so the file still opens when JavaScript is off. */
(function () {
  if (!/\/event\//.test(location.pathname)) return;
  var D = document, zh = /\/zh\//.test(location.pathname);
  var IMG = /\.(jpe?g|png|webp|gif)$/i;
  var pv, img, prev, next, open = false, y = 0, list = [], i = 0, stamp = 0;
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  var css = D.createElement('style');
  css.textContent = '.atm-pv{position:fixed;inset:0;z-index:2147483646;background:rgba(6,20,24,.92);overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y pinch-zoom}.atm-pv[hidden]{display:none!important}' +
    '.atm-pv-img{display:block;margin:0 auto;max-width:100%;height:auto;cursor:default;touch-action:pinch-zoom}' +
    '.atm-pv-x{position:fixed;top:10px;right:10px;z-index:3;width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:rgba(0,0,0,.55);color:#fff;font:400 30px/1 system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '.atm-pv-nav{position:fixed;top:50%;z-index:3;width:44px;height:44px;margin-top:-22px;border:0;border-radius:50%;background:rgba(0,0,0,.45);color:#fff;font:700 28px/1 system-ui,sans-serif;cursor:pointer}' +
    '.atm-pv-prev{left:8px}.atm-pv-next{right:8px}';
  D.head.appendChild(css);
  function isImg(a) {
    var h = a.getAttribute('href') || '';
    if (!h || /^(mailto|tel|sms|javascript):/i.test(h)) return false;
    try { return IMG.test(new URL(h, location.href).pathname); } catch (e) { return false; }
  }
  function srcOf(a) { return new URL(a.getAttribute('href'), location.href).href; }
  function groupOf(a) {
    var lb = a.getAttribute('data-lb');
    if (lb) {
      var same = [].filter.call(D.querySelectorAll('a[data-lb]'), function (n) { return n.getAttribute('data-lb') === lb && isImg(n); });
      if (same.length) return same;
    }
    var box = a.closest('.ev-posters, .wt-posters, .gallery, .gs-photos, .sy-poster, .hz-poster-wrap, .cw-topbanner');
    var links = box ? [].filter.call(box.querySelectorAll('a[href]'), isImg) : [];
    if (links.indexOf(a) >= 0 && links.length) return links;
    return [a];
  }
  function build() {
    if (pv) return;
    pv = D.createElement('div'); pv.className = 'atm-pv'; pv.hidden = true; pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-modal', 'true');
    img = D.createElement('img'); img.className = 'atm-pv-img'; img.alt = '';
    var x = D.createElement('button'); x.type = 'button'; x.className = 'atm-pv-x'; x.setAttribute('aria-label', zh ? '关闭' : 'Close'); x.textContent = '\u2715';
    prev = D.createElement('button'); prev.type = 'button'; prev.className = 'atm-pv-nav atm-pv-prev'; prev.setAttribute('aria-label', zh ? '上一张' : 'Previous poster'); prev.textContent = '\u2039';
    next = D.createElement('button'); next.type = 'button'; next.className = 'atm-pv-nav atm-pv-next'; next.setAttribute('aria-label', zh ? '下一张' : 'Next poster'); next.textContent = '\u203a';
    pv.appendChild(img); pv.appendChild(x); pv.appendChild(prev); pv.appendChild(next);
    D.body.appendChild(pv);
    function shut() { if (open) history.back(); }
    x.addEventListener('click', function (e) { e.stopPropagation(); shut(); });
    prev.addEventListener('click', function (e) { e.stopPropagation(); show(i - 1); });
    next.addEventListener('click', function (e) { e.stopPropagation(); show(i + 1); });
    pv.addEventListener('click', function (e) { if (e.target === img || e.target.closest('button')) return; shut(); });
    var sx, sy, track;
    pv.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { track = false; return; }
      track = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    pv.addEventListener('touchend', function (e) {
      if (!track || !open) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      track = false;
      if (list.length > 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) show(i + 1); else show(i - 1); }
      else if (dy > 72 && dy > Math.abs(dx) && pv.scrollTop <= 0) shut();
    }, { passive: true });
  }
  function show(n) {
    if (!list.length) return;
    if (n < 0) n = 0;
    if (n >= list.length) n = list.length - 1;
    i = n;
    var a = list[i], im = a.querySelector('img');
    img.src = srcOf(a);
    img.alt = (im && im.alt) || '';
    var many = list.length > 1;
    prev.hidden = !many || i === 0;
    next.hidden = !many || i === list.length - 1;
    pv.scrollTop = 0;
  }
  function close() {
    if (!open) return false;
    open = false;
    var keep = y;
    pv.hidden = true;
    D.documentElement.style.overflow = '';
    function put() { window.scrollTo(0, keep); }
    put();
    var n = 0, t = setInterval(function () { put(); if (++n > 10) clearInterval(t); }, 40);
    return true;
  }
  function openAt(links, index) {
    build();
    list = links;
    pv.hidden = false;
    D.documentElement.style.overflow = 'hidden';
    show(index);
    if (!open) history.pushState({ atmPv: 1 }, '', location.href);
    open = true;
  }
  D.addEventListener('pointerdown', function (e) {
    if (e.button) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !isImg(a)) return;
    y = window.scrollY || window.pageYOffset || 0;
    stamp = Date.now();
  }, true);
  D.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !isImg(a)) return;
    e.preventDefault();
    if (Date.now() - stamp > 800) y = window.scrollY || window.pageYOffset || 0;
    var links = groupOf(a);
    openAt(links, Math.max(0, links.indexOf(a)));
  }, true);
  window.addEventListener('popstate', function () { close(); });
  D.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); history.back(); }
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === 'ArrowRight') show(i + 1);
  });
})();
