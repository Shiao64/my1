/* draft 2026-10-31: unified back arrow on event detail pages.
   Came from the map (or, with data-back, from any page of this site) -> history.back(); otherwise go to the map in the same language with #v-<cardID>. */
(function () {
  var D = document, H = D.documentElement, zh = /^zh/i.test(H.lang || ''), bar = D.querySelector('.atm-bar');
  if (!bar) return;
  D.body.classList.add('atm-detail');
  var KEY = 'atm_from_' + location.pathname, q = new URLSearchParams(location.search), from = q.get('from') || '';
  try { if (from) sessionStorage.setItem(KEY, from); else from = sessionStorage.getItem(KEY) || ''; } catch (e) {}
  var map = zh ? '/zh/asia/' : '/asia/', fb = bar.getAttribute('data-back') || '';
  var ref = ''; try { var u = new URL(D.referrer); if (u.origin === location.origin) ref = u.pathname; } catch (e) {}
  var cameMap = /\/asia\/?$/.test(ref), hl0 = history.length;
  var a = D.createElement('a'); a.className = 'atm-dback'; a.setAttribute('aria-label', zh ? '返回' : 'Back');
  a.innerHTML = '<svg viewBox="0 0 10 26" aria-hidden="true" focusable="false"><path d="M8.5 1.5L1.5 13l7 11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function href() { return fb || (map + (from ? '#v-' + encodeURIComponent(from) : '')); }
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
      for (var i = 0; i < d.length; i++) { var o = (d[i].links && d[i].links.other) || ''; if (!d[i].hidden && o.indexOf('/event/' + slug + '/') > -1) { from = d[i].id; a.href = href(); break; } }
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
/* draft 2026-10-31: close X (top-right, gold) + bottom 「返回列表 / Back to list」: page slides down, then the same return as 〈 (history.back when we came from the map, keeping its scroll; else map#v-<cardID>). */
(function () {
  var D = document, bar = D.querySelector('.atm-bar'), back = bar && bar.querySelector('.atm-dback'); if (!bar || !back) return;
  var zh = /^zh/i.test(D.documentElement.lang || '');
  function close(e) { if (e) e.preventDefault(); if (D.body.classList.contains('atm-closing')) return; D.body.classList.add('atm-closing'); setTimeout(function () { back.click(); }, 280); }
  addEventListener('pageshow', function () { D.body.classList.remove('atm-closing'); });
  var x = D.createElement('a'); x.className = 'atm-dclose'; x.href = back.href; x.setAttribute('aria-label', zh ? '关闭' : 'Close');
  x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  x.addEventListener('click', close); bar.appendChild(x);
  var bt = D.createElement('div'); bt.className = 'atm-dfoot';
  bt.innerHTML = '<a class="atm-dlist" href="' + back.href + '">' + (zh ? '返回列表' : 'Back to list') + '</a>';
  bt.firstChild.addEventListener('click', close);
  D.body.appendChild(bt);
  setTimeout(function () { x.href = bt.firstChild.href = back.href; }, 1500);
})();
