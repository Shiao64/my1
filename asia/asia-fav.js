/* draft 2026-10-30: personal favorites (local only, localStorage atm_fav_v1 = array of card ids).
   Heart button top-right on each card toggles; a 我的收藏 / My favorites row sits above the list (like 最近看过).
   The site's hardcoded favorites (red-heart marks, 收藏 feature card, tw-m-ad line) are the default and show only
   while the visitor has no personal favorites (html.atm-has-fav hides them). Storage blocked → in-memory only. */
(function () {
  var KEY = 'atm_fav_v1', mem = null;
  var zh = /^zh/i.test(document.documentElement.lang || '');
  var T = zh ? { title: '我的收藏', clear: '清除', add: '加入收藏', del: '取消收藏' } : { title: 'My favorites', clear: 'Clear', add: 'Add to favorites', del: 'Remove from favorites' };
  function load() { if (mem) return mem.slice(); try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }) : []; } catch (e) { return []; } }
  function save(a) { mem = null; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { mem = a.slice(); } }
  function byId() { var m = {}; (window._chinaData || []).forEach(function (r) { if (!r.hidden) m[r.id] = r; }); return m; }
  function valid() { var a = load(); if (!window._chinaData) return a; var m = byId(); return a.filter(function (id) { return m[id]; }); }

  var HP = 'M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2.1 0 3.5 1.1 5.4 3.1C13.9 6.1 15.3 5 17.4 5 20.8 5 23 8.3 21.5 11.8 19.5 16.4 12 21 12 21z';
  var css = document.createElement('style');
  css.textContent = '.atm-heart{position:absolute;top:6px;right:6px;z-index:4;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '.atm-heart svg{width:20px;height:20px;display:block}.atm-heart path{fill:none;stroke:#C8102E;stroke-width:2;stroke-linejoin:round}' +
    '.atm-heart[aria-pressed="true"] path{fill:#C8102E}.atm-heart:focus-visible{outline:2px solid #0e6e78;outline-offset:1px}' +
    '.ev-card>.atm-viewed-abs{right:46px!important;top:13px!important}.ev-card{position:relative}' +
    '.atm-recent{max-width:1100px;margin:6px auto 0;padding:0 12px;box-sizing:border-box;font-size:.82rem;color:#5b4636}.atm-recent[hidden]{display:none}.atm-recent-h{display:flex;align-items:center;gap:8px;margin:0 0 4px}.atm-recent-h b{font-weight:700;color:#0a4f57}.atm-recent-h button{border:0;background:none;padding:2px 4px;font:inherit;font-size:.76rem;color:#0e6e78;cursor:pointer;text-decoration:underline}.atm-recent-row{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 0 4px;scrollbar-width:thin}.atm-recent-row a{flex:0 0 auto;max-width:200px;display:block;padding:4px 10px;border:1px solid #ead9b8;border-radius:999px;background:#fff;color:#2a1a14;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.78rem;line-height:1.4}.atm-recent-row a span{color:#8a7563;margin-left:4px}' +
    '.atm-favrow .atm-recent-h b{color:#C8102E}' +
    'html.atm-has-fav .atm-mk.atm-fav,html.atm-has-fav .tw-m-feat,html.atm-has-fav .tw-m-ad{display:none!important}';
  document.head.appendChild(css);

  var box = document.createElement('div'); box.className = 'atm-recent atm-favrow'; box.hidden = true;
  box.innerHTML = '<div class="atm-recent-h"><b>\u2665 ' + T.title + '</b><button type="button" class="atm-fav-cl">' + T.clear + '</button></div><div class="atm-recent-row"></div>';
  function place() { if (box.isConnected) return; var f = document.getElementById('filters'); if (f && f.parentNode) f.parentNode.insertBefore(box, f.nextSibling); }
  place();
  box.querySelector('.atm-fav-cl').addEventListener('click', function () { save([]); refresh(); });

  function cityName(r) { var o = document.querySelector('#china-city option[data-en="' + r.city + '"]'); return o ? (o.textContent || '').replace(/[（(]\d+[)）]|\d+场/g, '').trim() : r.city; }
  function flash(el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('atm-flash'); setTimeout(function () { el.classList.remove('atm-flash'); }, 1600); }
  function go(r) { /* same behaviour as 最近看过 */
    var el = document.querySelector('#china-listings .ev-card[data-id="' + r.id + '"]');
    if (el && el.offsetParent) return flash(el);
    var qs;
    if (r.kind === 'weekly') { var o = document.querySelector('#china-city option[data-en="' + r.city + '"]'); qs = '?mode=regular&city=' + encodeURIComponent(o ? o.value : r.city); }
    else qs = '?mode=featured' + (r.start ? '&date=' + r.start : '');
    location.href = location.pathname + qs + '#v-' + encodeURIComponent(r.id);
  }
  function drawRow(ids) {
    var m = byId(), row = box.querySelector('.atm-recent-row'); row.innerHTML = '';
    ids.forEach(function (id) { var r = m[id]; if (!r) return;
      var a = document.createElement('a'); a.href = '#'; a.setAttribute('data-fid', id);
      a.textContent = (zh && r.name_zh) || r.name; var s = document.createElement('span'); s.textContent = cityName(r); a.appendChild(s);
      a.addEventListener('click', function (e) { e.preventDefault(); go(r); }); row.appendChild(a); });
    box.hidden = !row.children.length;
  }
  function hearts(ids) {
    var on = {}; ids.forEach(function (id) { on[id] = 1; });
    document.querySelectorAll('#china-listings .ev-card[data-id]').forEach(function (li) {
      var b = li.querySelector(':scope>.atm-heart');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'atm-heart'; b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + HP + '"/></svg>'; li.appendChild(b); }
      var f = !!on[li.getAttribute('data-id')];
      if (b.getAttribute('aria-pressed') !== String(f)) { b.setAttribute('aria-pressed', String(f)); b.setAttribute('aria-label', f ? T.del : T.add); b.title = f ? T.del : T.add; }
    });
  }
  var busy = false, mo = null, tm = null;
  function refresh() { busy = true; try { place(); var ids = valid(); document.documentElement.classList.toggle('atm-has-fav', ids.length > 0); hearts(ids); drawRow(ids); } finally { busy = false; } if (mo) mo.takeRecords(); }
  function toggle(id) { var a = load(), i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.unshift(id); save(a); refresh(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.atm-heart'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); var li = b.closest('.ev-card[data-id]'); if (li) toggle(li.getAttribute('data-id'));
  }, true);
  window.ATM_FAV = { get: valid, toggle: toggle, refresh: refresh };
  var lst = document.getElementById('china-listings');
  if (lst && window.MutationObserver) (mo = new MutationObserver(function () { if (busy) return; clearTimeout(tm); tm = setTimeout(refresh, 60); })).observe(lst, { childList: true, subtree: true });
  var n = 0; (function wait() { if (window._chinaData) return refresh(); if (++n < 100) setTimeout(wait, 100); })();
  window.addEventListener('storage', function (e) { if (e.key === KEY) refresh(); });
})();
