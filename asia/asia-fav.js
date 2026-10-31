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

  /* draft 2026-10-31: first visit seeds the 3 recommended cards (HOST ids) as saved, once (flag atm_fav_seeded_v1),
     so un-saving persists. Cards un-saved this session stay in the row with a hollow heart so a second tap re-saves. */
  var SK = 'atm_fav_seeded_v1', SEED = ['manual-hz-jinsha', 'cwCbtm27', 'E093'], ghost = [];
  (function () { try { if (localStorage.getItem(SK) === '1') return; if (!load().length && localStorage.getItem(KEY) === null) save(SEED.slice()); localStorage.setItem(SK, '1'); } catch (e) {} })();
  var HP = 'M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2.1 0 3.5 1.1 5.4 3.1C13.9 6.1 15.3 5 17.4 5 20.8 5 23 8.3 21.5 11.8 19.5 16.4 12 21 12 21z';
  var css = document.createElement('style');
  css.textContent = '.atm-heart{position:absolute;top:6px;right:6px;z-index:4;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '.atm-heart svg{width:20px;height:20px;display:block}.atm-heart path{fill:none;stroke:#C8102E;stroke-width:2;stroke-linejoin:round}' +
    '.atm-heart[aria-pressed="true"] path{fill:#C8102E}.atm-heart:focus-visible{outline:2px solid #0e6e78;outline-offset:1px}' +
    '.ev-card>.atm-viewed-abs{right:46px!important;top:13px!important}.ev-card{position:relative}' +
    '.atm-favbar{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;width:100%;box-sizing:border-box;margin:4px 0 8px;padding:8px 12px;border:1px solid #ead9b8;border-radius:12px;background:#fff;font:inherit;text-align:left;color:#2a1a14;cursor:default}' +
    '.atm-favbar b{font-weight:700;color:#C8102E;font-size:.95rem}.atm-favbar .atm-hint{font-size:.78rem;color:#8a7563;font-weight:400}' +
    '.atm-favbar.atm-on{cursor:pointer;justify-content:space-between}.atm-favbar .atm-car{color:#b8913a;font-size:.9rem}' +
    '.atm-noimg{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:120px;background:linear-gradient(135deg,#0e6e78,#2a1a14);color:#F6D58E;font-weight:700;font-size:1.3rem;letter-spacing:.1em}' +
    '.atm-favgrid{transition:max-height .2s ease,opacity .2s ease,margin .2s ease,padding .2s ease;overflow-y:hidden}html body.china-page .wrap .tw-m-feat-grid.tw-feat-ad.atm-favgrid.atm-fold{opacity:0;max-height:0!important;min-height:0!important;border-width:0!important;margin-top:0!important;margin-bottom:0!important;padding-top:0!important;padding-bottom:0!important;pointer-events:none}'+'.atm-favgrid[hidden]{display:none!important}.atm-favfc{position:relative}.atm-favfc .atm-heart{top:8px;right:8px}' +
    'html.atm-has-fav .tw-m-feat-grid.tw-feat-ad:not(.atm-favgrid),html.atm-has-fav .tw-m-feat-grid:not(.atm-favgrid)+.atm-dots,html.atm-has-fav .atm-mk.atm-fav,html.atm-has-fav .tw-m-ad{display:none!important}' +
    '.atm-mk.atm-fav,.tw-m-feat-k.atm-fav-k,.tw-m-ad-k{display:none!important}.tw-fc.atm-hostfc{position:relative}.tw-fc.atm-hostfc .atm-heart{top:8px;right:8px}' +
    '.atm-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:10000;background:rgba(42,26,20,.92);color:#fff;padding:10px 18px;border-radius:999px;font-size:.9rem;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:opacity .4s;pointer-events:none}.atm-toast.atm-toast-out{opacity:0}';
  document.head.appendChild(css);

  var CK = 'atm_fav_collapsed_v1', TK = 'atm_fav_toasted_v1', memC = false, memT = false;
  function getC() { try { return localStorage.getItem(CK) === '1'; } catch (e) { return memC; } }
  function setC(v) { memC = v; try { localStorage.setItem(CK, v ? '1' : '0'); } catch (e) {} }
  var T2 = zh ? { hint: '点卡片右上角的心，加入我的收藏', toast: '已加入我的收藏' } : { hint: 'Tap the heart on a card to save it', toast: 'Saved to My favorites' };
  var bar = document.createElement('button'); bar.type = 'button'; bar.className = 'atm-favbar';
  var grid = document.createElement('div'); grid.className = 'tw-m-feat-grid tw-feat-ad atm-favgrid';
  function hostGrid() { return document.querySelector('.tw-m-feat-grid.tw-feat-ad:not(.atm-favgrid)'); }
  function place() { var g = hostGrid(); if (!g) return false; if (bar.parentNode !== g.parentNode || bar.nextSibling !== g) { g.parentNode.insertBefore(bar, g); g.parentNode.insertBefore(grid, g); } return true; }
  bar.addEventListener('click', function () { if (!valid().length) return; setC(!getC()); refresh(); });
  function cityName(r) { var o = document.querySelector('#china-city option[data-en="' + r.city + '"]'); return o ? (o.textContent || '').replace(/[（(]\d+[)）]|\d+场/g, '').trim() : r.city; }
  function go(r) { /* draft 10/31: favorite -> single-card view ?card=ID (was: full list filtered + #v-ID) */
    location.href = location.pathname + '?card=' + encodeURIComponent(r.id); return;
    var qs;
    if (r.kind === 'weekly') { var o = document.querySelector('#china-city option[data-en="' + r.city + '"]'); qs = '?mode=regular&city=' + encodeURIComponent(o ? o.value : r.city); }
    else qs = '?mode=featured' + (r.start ? '&date=' + r.start : '');
    location.href = location.pathname + qs + '#v-' + encodeURIComponent(r.id);
  }
  function d(x) { return (x || '').replace(/-/g, '/'); }
  var WD = zh ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function meta(r) {
    var w = r.kind === 'weekly' ? ((r.weekdays || (r.weekday != null ? [r.weekday] : [])).map(function (i) { return WD[i % 7]; }).join('/') + (r.time ? ' ' + r.time : '')) : (d(r.start) + (r.end && r.end !== r.start ? '–' + d(r.end) : ''));
    return w + ' · ' + cityName(r);
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function card(r) {
    var a = document.createElement('a'); a.className = 'tw-fc atm-favfc'; a.setAttribute('data-fid', r.id);
    var li = document.querySelector('#china-listings .ev-card[data-id="' + r.id + '"] a[href*="/event/"]');
    a.href = location.pathname + '?card=' + encodeURIComponent(r.id); /* draft 10/31: always the single-card view (was: own detail page if any, else list #v-ID) */
    a.addEventListener('click', function (e) { if (e.target.closest('.atm-heart')) return; e.preventDefault(); go(r); });
    var lim = document.querySelector('#china-listings .ev-card[data-id="' + r.id + '"] img'), ls = lim && (lim.getAttribute('data-src') || lim.getAttribute('src'));
    var pos = r.poster || ls || '', th = r.poster ? '/images/thumb' + pos.replace(/\.(jpe?g|png)$/i, '.webp') : pos;
    a.innerHTML = '<span class="tw-fc-img">' + (pos ? '<img src="' + esc(th) + '" data-full="' + esc(pos) + '" onerror="if(this.dataset.full&&this.src.indexOf(this.dataset.full)<0)this.src=this.dataset.full" decoding="async" alt="" loading="eager" style="object-position:center 20%">' : '<span class="atm-noimg">' + esc(cityName(r)) + '</span>') + '</span>' +
      '<span class="tw-fc-body"><strong>' + esc((zh && r.name_zh) || r.name) + '</strong><span class="tw-fc-meta">' + esc(meta(r)) + '</span></span>' +
      '<span class="atm-heart" role="button" tabindex="0" aria-pressed="true" aria-label="' + T.del + '" title="' + T.del + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + HP + '"/></svg></span>';
    return a;
  }
  function drawRow(ids, show) {
    var m = byId(), c = getC(), n = ids.filter(function (id) { return m[id]; }).length, sv = {}; ids.forEach(function (x) { sv[x] = 1; });
    ids = show;
    bar.classList.toggle('atm-on', n > 0);
    if (!n) { bar.innerHTML = '<b>\u2661 ' + T.title + '</b><span class="atm-hint">' + T2.hint + '</span>'; bar.removeAttribute('aria-expanded'); bar.tabIndex = -1; }
    else { bar.innerHTML = '<b>\u2764\uFE0E ' + T.title + (zh ? '（' + n + '）' : ' (' + n + ')') + '</b><span class="atm-car">' + (c ? '\u25B8' : '\u25BE') + '</span>'; bar.setAttribute('aria-expanded', String(!c)); bar.tabIndex = 0; }
    var key = ids.join(',');
    if (grid._k !== key) { grid._k = key; grid.innerHTML = ''; ids.forEach(function (id) { if (m[id]) grid.appendChild(card(m[id])); }); }
    grid.querySelectorAll('.atm-favfc').forEach(function (a) { var b = a.querySelector('.atm-heart'), f = !!sv[a.getAttribute('data-fid')]; if (b && b.getAttribute('aria-pressed') !== String(f)) { b.setAttribute('aria-pressed', String(f)); b.setAttribute('aria-label', f ? T.del : T.add); b.title = f ? T.del : T.add; } });
    grid.hidden = !grid.children.length; n = n || 0;
    if (grid.children.length) { var was = grid.classList.contains('atm-fold');
      if (grid._init && was !== c) { grid.style.maxHeight = grid.scrollHeight + 'px'; void grid.offsetHeight; }
      grid.classList.toggle('atm-fold', c);
      if (!c) { grid.style.maxHeight = grid._init ? grid.scrollHeight + 'px' : 'none'; clearTimeout(grid._tm); grid._tm = setTimeout(function () { if (!grid.classList.contains('atm-fold')) grid.style.maxHeight = 'none'; }, 260); }
      else grid.style.maxHeight = '0px';
      grid._init = 1; }
  }
  function toast() {
    var t = document.createElement('div'); t.className = 'atm-toast'; t.setAttribute('role', 'status'); t.textContent = T2.toast; document.body.appendChild(t);
    setTimeout(function () { t.classList.add('atm-toast-out'); }, 1800); setTimeout(function () { t.remove(); }, 2300);
  }
  function firstToast() { var done; try { done = localStorage.getItem(TK) === '1'; localStorage.setItem(TK, '1'); } catch (e) { done = memT; } memT = true; if (!done) toast(); }
  function hearts(ids) {
    var on = {}; ids.forEach(function (id) { on[id] = 1; });
    document.querySelectorAll('#china-listings .ev-card[data-id]').forEach(function (li) {
      var b = li.querySelector(':scope>.atm-heart');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'atm-heart'; b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + HP + '"/></svg>'; li.appendChild(b); }
      var f = !!on[li.getAttribute('data-id')];
      if (b.getAttribute('aria-pressed') !== String(f)) { b.setAttribute('aria-pressed', String(f)); b.setAttribute('aria-label', f ? T.del : T.add); b.title = f ? T.del : T.add; }
    });
  }
  var HOST = [['hangzhou', 'manual-hz-jinsha'], ['changwon', 'cwCbtm27'], ['beijing', 'E093']];
  function hostHearts(on) {
    var g = hostGrid(); if (!g) return;
    g.querySelectorAll('a.tw-fc').forEach(function (a) {
      var id = a.getAttribute('data-fid');
      if (!id) { var h = a.getAttribute('href') || ''; HOST.forEach(function (p) { if (!id && h.indexOf(p[0]) >= 0) id = p[1]; }); if (!id) return; a.setAttribute('data-fid', id); a.classList.add('atm-hostfc'); }
      var b = a.querySelector(':scope>.atm-heart');
      if (!b) { b = document.createElement('span'); b.className = 'atm-heart'; b.setAttribute('role', 'button'); b.tabIndex = 0; b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + HP + '"/></svg>'; a.appendChild(b); }
      var f = !!on[id];
      if (b.getAttribute('aria-pressed') !== String(f)) { b.setAttribute('aria-pressed', String(f)); b.setAttribute('aria-label', f ? T.del : T.add); b.title = f ? T.del : T.add; }
    });
  }
  var busy = false, mo = null, tm = null;
  function refresh() { busy = true; try { place(); var ids = valid(), m0 = byId(); ghost = ghost.filter(function (x) { return ids.indexOf(x) < 0 && m0[x]; }); var show = ids.slice(); ghost.forEach(function (g) { var p = (grid._k || '').split(',').indexOf(g); if (p < 0 || p > show.length) show.push(g); else show.splice(p, 0, g); }); document.documentElement.classList.toggle('atm-has-fav', show.length > 0); hearts(ids); var on = {}; ids.forEach(function (x) { on[x] = 1; }); hostHearts(on); drawRow(ids, show); } finally { busy = false; } if (mo) mo.takeRecords(); }
  function toggle(id) { var a = load(), i = a.indexOf(id); if (i >= 0) { a.splice(i, 1); if (grid.querySelector('[data-fid="' + id + '"]')) ghost.push(id); } else { var gp = ghost.indexOf(id) >= 0 ? (grid._k || '').split(',').indexOf(id) : -1; if (gp >= 0) a.splice(Math.min(gp, a.length), 0, id); else a.unshift(id); firstToast(); } save(a); refresh(); }
  document.addEventListener('keydown', function (e) { var b = e.target.closest && e.target.closest('.atm-favfc .atm-heart,.atm-hostfc .atm-heart'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); b.click(); } }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.atm-heart'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); var li = b.closest('.ev-card[data-id]'); if (li) toggle(li.getAttribute('data-id')); else if ((li = b.closest('[data-fid]'))) toggle(li.getAttribute('data-fid'));
  }, true);
  window.ATM_FAV = { get: valid, toggle: toggle, refresh: refresh };
  var lst = document.getElementById('china-listings');
  if (lst && window.MutationObserver) (mo = new MutationObserver(function () { if (busy) return; clearTimeout(tm); tm = setTimeout(refresh, 60); })).observe(lst, { childList: true, subtree: true });
  var n = 0; (function wait() { if (window._chinaData && hostGrid()) return refresh(); if (window._chinaData && n % 10 === 0) refresh(); if (++n < 150) setTimeout(wait, 100); })();
  window.addEventListener('storage', function (e) { if (e.key === KEY) refresh(); });
})();
