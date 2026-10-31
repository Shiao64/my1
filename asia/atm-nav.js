/* draft 2026-10-31 design fixes (map side) n5 early-load: #v-ID deep link restored (code from asia-recent.js, which is no longer loaded),
   ?from=<ID> on links to detail pages, empty state with Clear filters, grey placeholder cards + hidden counts until events.json arrives. */
(function () {
  var D = document, H = D.documentElement, zh = /^zh/i.test(H.lang || '');
  /* ---- loading placeholders (item 7) ---- */
  var st = D.createElement('style');
  st.textContent = 'html:not(.atm-data) .atm-featstrip,html:not(.atm-data) .atm-onehead,html:not(.atm-data) .china-city-head,html:not(.atm-data) .atm-favbar .atm-fav-n{visibility:hidden!important}' +
    '#atm-skel{display:grid;gap:14px;margin:12px auto;padding:0 16px;max-width:1100px;box-sizing:border-box}#atm-skel .sk{height:150px;border-radius:16px;background:linear-gradient(90deg,#ece8e2 25%,#f6f3ee 50%,#ece8e2 75%);background-size:200% 100%;animation:atmsk 1.2s infinite linear}#atm-skel .sk.s{height:22px;width:55%;border-radius:8px}@keyframes atmsk{to{background-position:-200% 0}}html.atm-data #atm-skel{display:none}' +
    '#atm-empty{display:none;text-align:center;padding:36px 16px 40px;margin:12px 0;border:1px dashed #d9c9a8;border-radius:16px;background:#fffdf8;color:#5a3e2b}#atm-empty p{margin:0 0 16px;font:600 17px/1.4 system-ui,sans-serif}#atm-empty button{min-height:44px;padding:0 22px;border-radius:999px;border:1px solid #0e6e78;background:#0e6e78;color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer}' +
    'html.atm-empty #atm-empty{display:block}html.atm-empty .atm-favbar,html.atm-empty .atm-favrow,html.atm-empty [class*="atm-fav-row"],html.atm-empty .tw-m-feat-grid,html.atm-empty .atm-featstrip,html.atm-empty .atm-onehead,html.atm-empty .china-global-empty,html.atm-empty .china-date-empty{display:none!important}';
  D.head.appendChild(st);
  var root = D.getElementById('china-listings');
  if (root && !window._chinaData) { var sk = D.createElement('div'); sk.id = 'atm-skel'; sk.setAttribute('aria-hidden', 'true'); sk.innerHTML = '<div class="sk s"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div>'; var sec = root.closest('section') || root; sec.parentNode.insertBefore(sk, sec); }
  (function w() { if (window._chinaData) { H.classList.add('atm-data'); chk(); } else setTimeout(w, 80); })();
  /* ---- empty state (item 4) ---- */
  var em = null;
  function cnt() { if (!root) return 1; return [].filter.call(root.querySelectorAll('li.ev-card'), function (li) { return !li.closest('[hidden]'); }).length; }
  function clearAll() {
    var c = D.getElementById('china-city'); if (c) c.value = '';
    var d = D.querySelector('input[type=date]'); if (d) { var t = new Date(); d.value = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); d.dispatchEvent(new Event('change', { bubbles: true })); }
    var ev = D.querySelector('input[value=event]'); if (ev && !ev.checked) ev.click();
    if (c) c.dispatchEvent(new Event('change', { bubbles: true }));
    var b = D.getElementById('china-search'); if (b) b.click();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    setTimeout(chk, 300);
  }
  function chk() {
    if (!window._chinaData || !root) return;
    if (!em) { em = D.createElement('div'); em.id = 'atm-empty'; em.setAttribute('role', 'status'); em.innerHTML = '<p>' + (zh ? '没有找到活动' : 'No events found') + '</p><button type="button">' + (zh ? '清除筛选' : 'Clear filters') + '</button>'; em.querySelector('button').addEventListener('click', clearAll); root.parentNode.insertBefore(em, root); }
    var presearch = D.body.classList.contains('china-presearch'), reg = D.querySelector('input[value=regular]');
    var regNoCity = reg && reg.checked && D.getElementById('china-city') && D.getElementById('china-city').value === '';
    H.classList.toggle('atm-empty', cnt() === 0 && !regNoCity);
  }
  var tm; if (root) new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(chk, 120); }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  D.addEventListener('change', function () { setTimeout(chk, 200); });
  /* ---- ?from=ID on detail links (item 2) ---- */
  window.atmFromUrl = function (h, id) {
    if (!id || !/\/event\//.test(h)) return h;
    try { var u = new URL(h, location.href); if (u.origin !== location.origin) return h; u.searchParams.set('from', id); try { history.replaceState(history.state, '', location.pathname + location.search + '#v-' + encodeURIComponent(id)); } catch (e) {} return u.pathname + u.search + u.hash; } catch (e) { return h; }
  };
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="/event/"]'); if (!a) return;
    var c = a.closest('[data-id]'); var id = c && c.getAttribute('data-id'); if (!id) return;
    a.setAttribute('href', window.atmFromUrl(a.getAttribute('href'), id));
  }, true);
  var dl = (function () { var m = /^#v-(.+)$/.exec(location.hash) || /[?&]id=([^&#]+)/.exec(location.search); return m ? decodeURIComponent(m[1]) : null; })(), dlDone = false, dlUser = false;
  ['touchstart', 'wheel', 'keydown'].forEach(function (t) { window.addEventListener(t, function () { if (dlDone) dlUser = true; }, { passive: true }); });
  function dlFind() { return [].filter.call(document.querySelectorAll('#china-listings .ev-card[data-id="' + dl.replace(/"/g, '') + '"]'), function (n) { return !n.closest('.atm-recent'); }); }
  function dlOpen(el) { for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (p.tagName === 'DETAILS' && !p.open) p.open = true; if (p.hidden && p.closest('#china-listings') && !p.classList.contains('china-chrono')) p.hidden = false; } }
  function dlOff(el) { var off = 0; if (el) [].forEach.call(document.querySelectorAll('#china-listings h2, #china-listings h3, #china-listings h4, #china-listings [class*="head"], #china-listings [class*="day"]'), function (h) { if (h.contains(el) || !h.parentElement.contains(el) || !h.offsetParent) return; var cs = getComputedStyle(h); if (cs.position === 'sticky') off = Math.max(off, (parseFloat(cs.top) || 0) + h.offsetHeight); }); ['.site-header', '.china-region-nav', '.china-sticky-top'].forEach(function (s) { var e = document.querySelector(s); if (e) { var cs = getComputedStyle(e); if (cs.position === 'sticky' || cs.position === 'fixed') off = Math.max(off, e.getBoundingClientRect().bottom); } }); return off; }
  function dlScroll(el, smooth) { var y = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - dlOff(el) - 12); try { window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { window.scrollTo(0, y); } }
  function deep() { if (!dl || dlDone) return; var c = dlFind(), el = c.filter(function (n) { return n.offsetParent; })[0]; if (!el && c[0]) { dlOpen(c[0]); el = c[0].offsetParent ? c[0] : null; } if (!el) return;
    dlDone = true; window._atmDeepEl = el; dlScroll(el, false);
    [250, 600, 1200, 2000, 3200].forEach(function (t) { setTimeout(function () { if (!dlUser && el.isConnected) dlScroll(el, false); }, t); });
    el.querySelectorAll('img').forEach(function (i) { if (!i.complete) i.addEventListener('load', function () { if (!dlUser) dlScroll(el, false); }); });
    window.addEventListener('load', function () { if (!dlUser) dlScroll(el, false); });
    setTimeout(function () { el.classList.add('atm-flash', 'atm-ring'); setTimeout(function () { el.classList.add('atm-ring-off'); }, 2200); setTimeout(function () { el.classList.remove('atm-flash', 'atm-ring', 'atm-ring-off'); }, 3200); }, 400); }
  window.addEventListener('hashchange', function () { var m = /^#v-(.+)$/.exec(location.hash); if (!m) return; dl = decodeURIComponent(m[1]); dlDone = false; dlUser = false; (function w2(k) { if (dlDone) return; deep(); if (!dlDone && k < 50) setTimeout(function () { w2(k + 1); }, 100); })(0); });
  (function dlWait(k) { if (!dl || dlDone) return; deep(); if (!dlDone && k < 250) setTimeout(function () { dlWait(k + 1); }, 100); })(0);
})();
