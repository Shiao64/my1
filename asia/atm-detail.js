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
