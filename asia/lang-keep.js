/* Keep scroll position + search state when switching EN <-> ZH on the Asia map. */
(function () {
  var KEY = 'atmLangKeep';
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document && !(t.getAttribute && t.getAttribute('data-asia-lang-set'))) t = t.parentNode;
    if (!t || t === document || t.getAttribute('aria-current') === 'page') return;
    /* v10.8: carry the current card (#v-ID / ?id= / last opened card) so the deep-link code scrolls + rings it */
    var m = /^#v-(.+)$/.exec(location.hash) || /[?&]id=([^&#]+)/.exec(location.search), id = window._atmLastCard || (m ? decodeURIComponent(m[1]) : '');
    if (id) {
      var h = (t.getAttribute('href') || '').split('#')[0], qi = /[?&]id=/.test(location.search) && !/[?&]id=/.test(h);
      if (qi) h += (h.indexOf('?') < 0 ? '?' : '&') + 'id=' + encodeURIComponent(id);
      t.setAttribute('href', h + '#v-' + encodeURIComponent(id));
      try { sessionStorage.removeItem(KEY); } catch (err) {}
      return;
    }
    var c = document.getElementById('china-city'), f = document.getElementById('china-from');
    var s = { y: window.pageYOffset || document.documentElement.scrollTop || 0,
      city: c ? c.value : '', from: f ? f.value : '',
      etype: (document.querySelector('input[name=etype]:checked') || {}).value || '',
      searched: !document.body.classList.contains('china-presearch'), t: Date.now() };
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (err) {}
  }, true);

  document.addEventListener('click', function (e) {
    var c = e.target && e.target.closest && e.target.closest('.ev-card[data-id]');
    if (c && !c.closest('.atm-recent')) window._atmLastCard = c.getAttribute('data-id');
  }, true);

  var s = null;
  try { s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (err) {}
  if (!s || Date.now() - s.t > 30000) return;
  try { history.scrollRestoration = 'manual'; } catch (err) {}
  var start = Date.now(), restoredForm = false, settled = 0, userMoved = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { userMoved = true; }, { passive: true, once: true });
  });
  function tick() {
    if (userMoved) return;
    var c = document.getElementById('china-city'), f = document.getElementById('china-from');
    if (!restoredForm && !window._chinaData && Date.now() - start < 10000) { setTimeout(tick, 100); return; }
    if (!restoredForm && c && (!s.city || c.querySelector('option[value="' + String(s.city).replace(/"/g, '') + '"]'))) {
      restoredForm = true;
      if (s.etype) { var r = document.querySelector('input[name=etype][value="' + String(s.etype).replace(/"/g, '') + '"]'); if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }
      if (s.city && s.city !== c.value) { c.value = s.city; c.dispatchEvent(new Event('change', { bubbles: true })); }
      if (f && s.from) { f.value = s.from; f.dispatchEvent(new Event('change', { bubbles: true })); }
      if (s.searched) { var b = document.getElementById('china-search'); if (b) b.click(); }
    }
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    var y = Math.min(s.y, Math.max(0, maxY));
    if (Math.abs((window.pageYOffset || 0) - y) > 2) { window.scrollTo(0, y); settled = 0; } else settled++;
    if (Date.now() - start < 2500 || (settled < 3 && Date.now() - start < 12000) || maxY < s.y && Date.now() - start < 12000) setTimeout(tick, 100);
  }
  if (document.readyState === 'complete') tick(); else window.addEventListener('load', tick);
})();
