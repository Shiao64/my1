/* v8e 2026-10-28: 常规活动 city picker — no city box; tapping 常规 opens a custom list (iOS-safe, not a native select).
   The hidden #china-city select stays the data model: picking sets its value and fires 'change' (asia-map.js switches to 常规 + searches). */
(function () {
  var sel = document.getElementById('china-city');
  var rg = document.querySelector('input[name="etype"][value="regular"]');
  var evR = document.querySelector('input[name="etype"][value="event"]');
  if (!sel || !rg) return;
  var lab = rg.closest('label'), zh = /^zh/i.test(document.documentElement.lang || '');
  var BASE = zh ? '常规活动' : 'Regular';
  var txt = null;
  for (var i = 0; i < lab.childNodes.length; i++) { var n = lab.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) { txt = n; break; } }
  var tspan = document.createElement('span'); tspan.className = 'atm-reg-txt'; tspan.textContent = BASE;
  if (txt) lab.replaceChild(tspan, txt); else lab.appendChild(tspan);
  lab.insertBefore(document.createTextNode(' '), tspan);
  lab.setAttribute('aria-haspopup', 'listbox'); lab.setAttribute('aria-expanded', 'false'); lab.tabIndex = 0;
  var css = document.createElement('style');
  css.textContent = 'body.china-page .china-city-wrap,body.china-page #filters .china-city-wrap,.china-page .atm-form .atm-row-reg .china-city-wrap{display:none!important}' +
    '.atm-reglist{position:absolute;z-index:9990;min-width:180px;max-width:calc(100vw - 24px);max-height:min(60vh,360px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;margin:0;padding:6px 0;list-style:none;background:#fff;border:1px solid #C9B48A;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);box-sizing:border-box}' +
    '.atm-reglist[hidden]{display:none}' +
    '.china-page .atm-form .atm-row-reg{flex-wrap:wrap;row-gap:4px}.china-page .atm-form .atm-reg-note{white-space:normal}' +
    '.atm-reglist li{padding:11px 16px;font-size:1rem;line-height:1.3;color:#0a4f57;cursor:pointer;white-space:nowrap;outline:none}' +
    '.atm-reglist li:hover,.atm-reglist li:focus,.atm-reglist li.on{background:#f6efe0}' +
    '.atm-reglist li[aria-selected="true"]{font-weight:700}';
  document.head.appendChild(css);
  var ul = document.createElement('ul'); ul.className = 'atm-reglist'; ul.setAttribute('role', 'listbox'); ul.hidden = true;
  ul.setAttribute('aria-label', zh ? '选择城市' : 'Choose a city');
  document.body.appendChild(ul);

  function cityLabel() { var o = sel.options[sel.selectedIndex]; return (rg.checked && o && o.value && o.value !== 'all') ? o.textContent : ''; }
  function sync() { var c = cityLabel(); tspan.textContent = c ? BASE + (zh ? '·' : ' · ') + c : BASE; }
  function place() {
    var r = lab.getBoundingClientRect(), w = Math.max(r.width, 180);
    ul.style.minWidth = w + 'px';
    var left = r.left + scrollX, maxL = scrollX + document.documentElement.clientWidth - ul.offsetWidth - 12;
    ul.style.left = Math.max(scrollX + 12, Math.min(left, maxL)) + 'px';
    ul.style.top = (r.bottom + scrollY + 6) + 'px';
    var room = innerHeight - r.bottom - 18; ul.style.maxHeight = Math.max(160, Math.min(room, 360)) + 'px';
  }
  function build() {
    ul.innerHTML = '';
    Array.prototype.forEach.call(sel.options, function (o) {
      if (!o.value || o.value === 'all' || o.hidden || o.disabled) return;
      var li = document.createElement('li'); li.setAttribute('role', 'option'); li.tabIndex = -1;
      li.dataset.v = o.value; li.textContent = o.textContent;
      li.setAttribute('aria-selected', rg.checked && sel.value === o.value ? 'true' : 'false');
      ul.appendChild(li);
    });
  }
  function open() {
    if (typeof window.updateCityOptions === 'function') { try { window.updateCityOptions(); } catch (e) {} }
    build(); ul.hidden = false; lab.setAttribute('aria-expanded', 'true'); place();
    var cur = ul.querySelector('[aria-selected="true"]') || ul.firstElementChild; if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: 'nearest' }); }
  }
  function close(refocus) { if (ul.hidden) return; ul.hidden = true; lab.setAttribute('aria-expanded', 'false'); if (refocus) try { lab.focus({ preventScroll: true }); } catch (e) {} }
  function pick(v) {
    close(true);
    sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
  }
  lab.addEventListener('click', function (e) { e.preventDefault(); if (ul.hidden) open(); else close(); });
  lab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); open(); } });
  ul.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) pick(li.dataset.v); });
  ul.addEventListener('keydown', function (e) {
    var li = document.activeElement && document.activeElement.closest && document.activeElement.closest('.atm-reglist li');
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var nx = li ? (e.key === 'ArrowDown' ? li.nextElementSibling : li.previousElementSibling) : ul.firstElementChild; if (nx) nx.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); var t = e.key === 'Home' ? ul.firstElementChild : ul.lastElementChild; if (t) t.focus(); }
    else if ((e.key === 'Enter' || e.key === ' ') && li) { e.preventDefault(); pick(li.dataset.v); }
    else if (e.key === 'Tab') close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
  document.addEventListener('pointerdown', function (e) { if (!ul.hidden && !ul.contains(e.target) && !lab.contains(e.target)) close(); }, true);
  addEventListener('resize', function () { if (!ul.hidden) place(); });
  document.querySelectorAll('input[name="etype"]').forEach(function (r) { r.addEventListener('change', sync); });
  if (evR) evR.addEventListener('click', function () { setTimeout(sync, 0); });
  sel.addEventListener('change', function () { setTimeout(sync, 0); });
  sync();
})();
