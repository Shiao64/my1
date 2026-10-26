/* Keep scroll position + search state when switching EN <-> ZH on the Asia map. */
(function () {
  var KEY = 'atmLangKeep';
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document && !(t.getAttribute && t.getAttribute('data-asia-lang-set'))) t = t.parentNode;
    if (!t || t === document || t.getAttribute('aria-current') === 'page') return;
    var c = document.getElementById('china-city'), f = document.getElementById('china-from');
    var s = { y: window.pageYOffset || document.documentElement.scrollTop || 0,
      city: c ? c.value : '', from: f ? f.value : '',
      searched: !document.body.classList.contains('china-presearch'), t: Date.now() };
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (err) {}
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
    if (!restoredForm && c && (!s.city || c.querySelector('option[value="' + String(s.city).replace(/"/g, '') + '"]'))) {
      restoredForm = true;
      if (s.city) { c.value = s.city; c.dispatchEvent(new Event('change', { bubbles: true })); }
      if (f && s.from) { f.value = s.from; f.dispatchEvent(new Event('change', { bubbles: true })); }
      if (s.searched) { var b = document.getElementById('china-search'); if (b) b.click(); }
    }
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    var y = Math.min(s.y, Math.max(0, maxY));
    if (Math.abs((window.pageYOffset || 0) - y) > 2) { window.scrollTo(0, y); settled = 0; } else settled++;
    if (Date.now() - start < 2500 || (settled < 3 && Date.now() - start < 5000) || maxY < s.y && Date.now() - start < 5000) setTimeout(tick, 100);
  }
  if (document.readyState === 'complete') tick(); else window.addEventListener('load', tick);
})();
