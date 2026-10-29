/* v9.9 2026-10-29: "Recently viewed" (local only, localStorage). Tapping a card (or any link in it) records its id
   (max 20, newest first). Viewed cards get a small "看过 / Viewed" mark and are moved to the front of each result list
   (most recent first; unviewed keep their order). A compact, collapsible row under the filter box lists the last few. */
(function () {
  var KEY = 'atm_recent_v1', MAX = 20, SHOW = 6;
  var zh = /^zh/i.test(document.documentElement.lang || '');
  var T = zh ? { mark: '看过', title: '最近看过', hide: '收起', show: '展开', clear: '清除' } : { mark: 'Viewed', title: 'Recently viewed', hide: 'Hide', show: 'Show', clear: 'Clear' };
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }) : []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {} }
  function byId() { var m = {}; (window._chinaData || []).forEach(function (r) { if (!r.hidden) m[r.id] = r; }); return m; }
  function valid() { var m = byId(), a = load(); if (!window._chinaData) return a; var b = a.filter(function (id) { return m[id]; }); if (b.length !== a.length) save(b); return b; } /* drop ids no longer in events.json */

  var css = document.createElement('style');
  css.textContent = '.atm-viewed-mark{display:inline-block;margin-left:6px;padding:0 6px;border-radius:999px;font-size:.68rem;line-height:1.5;font-weight:600;color:#7a6255;background:#f1e8d6;vertical-align:middle;letter-spacing:.02em}' +
    '.atm-recent{max-width:1100px;margin:6px auto 0;padding:0 12px;box-sizing:border-box;font-size:.82rem;color:#5b4636}' +
    '.atm-recent[hidden]{display:none}.atm-recent-h{display:flex;align-items:center;gap:8px;margin:0 0 4px}.atm-recent-h b{font-weight:700;color:#0a4f57}' +
    '.atm-recent-h button{border:0;background:none;padding:2px 4px;font:inherit;font-size:.76rem;color:#0e6e78;cursor:pointer;text-decoration:underline}' +
    '.atm-recent-row{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 0 4px;scrollbar-width:thin}' +
    '.atm-recent-row a{flex:0 0 auto;max-width:200px;display:block;padding:4px 10px;border:1px solid #ead9b8;border-radius:999px;background:#fff;color:#2a1a14;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.78rem;line-height:1.4}' +
    '.atm-recent-row a span{color:#8a7563;margin-left:4px}.atm-recent.atm-collapsed .atm-recent-row{display:none}' +
    '.ev-card.atm-flash{box-shadow:0 0 0 3px #0e6e78;transition:box-shadow .3s}';
  document.head.appendChild(css);

  var box = document.createElement('div'); box.className = 'atm-recent'; box.hidden = true;
  box.innerHTML = '<div class="atm-recent-h"><b>' + T.title + '</b><button type="button" class="atm-recent-tg"></button><button type="button" class="atm-recent-cl">' + T.clear + '</button></div><div class="atm-recent-row"></div>';
  var f = document.getElementById('filters'); if (f && f.parentNode) f.parentNode.insertBefore(box, f.nextSibling);
  var collapsed = false; try { collapsed = localStorage.getItem(KEY + '_c') === '1'; } catch (e) {}
  function setC(c) { collapsed = c; box.classList.toggle('atm-collapsed', c); box.querySelector('.atm-recent-tg').textContent = c ? T.show : T.hide; try { localStorage.setItem(KEY + '_c', c ? '1' : '0'); } catch (e) {} }
  box.querySelector('.atm-recent-tg').addEventListener('click', function () { setC(!collapsed); });
  box.querySelector('.atm-recent-cl').addEventListener('click', function () { save([]); refresh(); });
  setC(collapsed);

  function cityName(r) { var o = document.querySelector('#china-city option[data-en="' + r.city + '"]'); return o ? (o.textContent || '').replace(/[（(]\d+[)）]|\d+场/g, '').trim() : r.city; }
  function drawRow() {
    var m = byId(), ids = valid().slice(0, SHOW), row = box.querySelector('.atm-recent-row');
    row.innerHTML = '';
    ids.forEach(function (id) { var r = m[id]; if (!r) return;
      var a = document.createElement('a'); a.href = '#'; a.setAttribute('data-rid', id);
      a.textContent = (zh && r.name_zh) || r.name; var s = document.createElement('span'); s.textContent = cityName(r); a.appendChild(s);
      a.addEventListener('click', function (e) { e.preventDefault(); go(r); }); row.appendChild(a); });
    box.hidden = !row.children.length;
  }
  function flash(el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('atm-flash'); setTimeout(function () { el.classList.remove('atm-flash'); }, 1600); }
  function go(r) {
    var el = document.querySelector('#china-listings .ev-card[data-id="' + r.id + '"]');
    if (el && el.offsetParent) return flash(el);
    var qs;
    if (r.kind === 'weekly') { var o = document.querySelector('#china-city option[data-en="' + r.city + '"]'); qs = '?mode=regular&city=' + encodeURIComponent(o ? o.value : r.city); }
    else qs = '?mode=featured' + (r.start ? '&date=' + r.start : '');
    location.href = location.pathname + qs + '#v-' + encodeURIComponent(r.id);
  }

  function mark() {
    var ids = valid(), rank = {}; ids.forEach(function (id, i) { rank[id] = i; });
    document.querySelectorAll('#china-listings .ev-card[data-id]').forEach(function (li) {
      var on = rank[li.getAttribute('data-id')] != null, mk = li.querySelector('.atm-viewed-mark');
      li.classList.toggle('atm-viewed', on);
      if (on && !mk) { var top = li.querySelector('.ev-top'); if (top) { mk = document.createElement('span'); mk.className = 'atm-viewed-mark'; mk.textContent = T.mark; top.appendChild(mk); } }
      else if (!on && mk) mk.remove();
    });
    return rank;
  }
  function reorder() { /* viewed to the front of each list, most recent first; unviewed keep their order */
    var rank = mark();
    var lists = []; document.querySelectorAll('#china-listings .ev-card[data-id]').forEach(function (li) { if (lists.indexOf(li.parentNode) === -1) lists.push(li.parentNode); });
    lists.forEach(function (ul) {
      var kids = Array.prototype.filter.call(ul.children, function (c) { return c.classList && c.classList.contains('ev-card'); });
      var v = kids.filter(function (c) { return rank[c.getAttribute('data-id')] != null; }).sort(function (a, b) { return rank[a.getAttribute('data-id')] - rank[b.getAttribute('data-id')]; });
      if (!v.length) return;
      var u = kids.filter(function (c) { return v.indexOf(c) === -1; }), mk = document.createComment('r');
      ul.insertBefore(mk, kids[0]); v.concat(u).forEach(function (c) { ul.insertBefore(c, mk); }); ul.removeChild(mk);
    });
  }
  function firstCard(ul) { for (var c = ul.firstChild; c; c = c.nextSibling) if (c.classList && c.classList.contains('ev-card')) return c; return null; }

  function record(id) { var a = load().filter(function (x) { return x !== id; }); a.unshift(id); save(a); mark(); drawRow(); } /* no reorder on tap: cards don't jump under the finger */
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('.ev-card[data-id]'); if (li) record(li.getAttribute('data-id'));
  }, true);

  var lst = document.getElementById('china-listings'), busy = false, tm = null;
  function refresh() { busy = true; try { reorder(); drawRow(); } finally { busy = false; } }
  if (lst && window.MutationObserver) new MutationObserver(function () { if (busy) return; clearTimeout(tm); tm = setTimeout(function () { refresh(); deep(); }, 60); }).observe(lst, { childList: true, subtree: true });
  function deep() { var m = /^#v-(.+)$/.exec(location.hash); if (!m) return; var el = document.querySelector('#china-listings .ev-card[data-id="' + decodeURIComponent(m[1]) + '"]'); if (el && el.offsetParent) { history.replaceState(history.state, '', location.pathname + location.search); setTimeout(function () { flash(el); }, 300); } }
  var n = 0; (function wait() { if (window._chinaData) return refresh(); if (++n < 100) setTimeout(wait, 100); })();
})();
