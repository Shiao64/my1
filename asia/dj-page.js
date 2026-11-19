(function () {
  var body = document.body, id = body.getAttribute('data-id') || '', kind = body.getAttribute('data-kind') || 'dj', zh = body.getAttribute('data-lang') === 'zh';
  var card = '';
  try { card = new URLSearchParams(location.search).get('card') || ''; } catch (e) {}
  var back = document.querySelector('.dj-back');
  if (back) back.href = (zh ? '/zh' : '') + '/asia/' + (card ? ('?card=' + encodeURIComponent(card)) : '');
  /* v12: header matches the card page (#atm-c1bar): 48px bar, same SVG ‹ at left, title centered */
  if (back) { back.innerHTML = '<svg width="14" height="28" viewBox="0 0 14 28" aria-hidden="true"><path d="M11.5 2.5L2.8 14l8.7 11.5" fill="none" stroke="#0A4F57" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'; var bar = back.parentNode, h1 = bar.querySelector('h1'), aff = bar.querySelector('.dj-aff'); if (h1 && !bar.querySelector('.dj-tw')) { var tw = document.createElement('div'); tw.className = 'dj-tw'; bar.insertBefore(tw, h1); tw.appendChild(h1); if (aff) tw.appendChild(aff); } }
  /* v12 fix: ‹ returns via history when we came from that same page (no new entry → no loop); otherwise replace this page instead of pushing */
  if (back) back.addEventListener('click', function (ev) { ev.preventDefault(); var rf = null; try { rf = new URL(document.referrer); } catch (e) {} var t = new URL(back.href, location.href); if (rf && rf.origin === location.origin && rf.pathname === t.pathname && rf.search === t.search && history.length > 1) history.back(); else location.replace(t.href); });
  function today() {
    try {
      var y, m, d, parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      parts.forEach(function (p) { if (p.type === 'year') y = p.value; else if (p.type === 'month') m = p.value; else if (p.type === 'day') d = p.value; });
      if (y && m && d) return y + '-' + m + '-' + d;
    } catch (e) {}
    return '';
  }
  function key(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, ''); }
  function setText(elId, text) { var el = document.getElementById(elId); if (el) el.textContent = text || ''; }
  function setPhoto(url, alt) {
    var el = document.getElementById('pf-photo'); if (!el) return; el.textContent = ''; if (!url) return;
    var img = document.createElement('img'); img.src = url; img.alt = alt || ''; el.appendChild(img);
  }
  function setLink(elId, url) {
    var el = document.getElementById(elId); if (!el) return; el.textContent = ''; if (!url) return;
    if (!/^https?:\/\//i.test(url)) { el.textContent = url; return; }
    var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = url; el.appendChild(a);
  }
  function matches(profile, e) {
    var names = [profile.name, profile.name_zh].concat(profile.match || [], profile.members || []).map(key).filter(Boolean), got = [];
    if (kind === 'organizer' || kind === 'group') (e.organizers || []).concat(e.organizers_en || []).forEach(function (n) { if (n) got.push(n); });
    else {
      if (e.dj) got.push(e.dj);
      var map = e.poster_djs || {};
      Object.keys(map).forEach(function (p) { if (map[p]) got.push(map[p]); });
    }
    return got.some(function (n) { return names.indexOf(key(n)) >= 0; });
  }
  function when(e) { return e.kind === 'weekly' ? (zh ? '每周' : 'Weekly') : (e.start || ''); }
  function isPast(e, day) { if (e.kind === 'weekly') return false; var end = e.end || e.start || ''; return !!(end && end < day); }
  var file = (kind === 'organizer' || kind === 'group') ? '/asia/organizers.json?v=o8' : '/asia/djs.json?v=d1';
  fetch(file).then(function (r) { return r.json(); }).then(function (list) {
    var profile = (list || []).filter(function (p) { return p.id === id; })[0];
    if (!profile) return;
    var name = zh ? (profile.name_zh || profile.name || '') : (profile.name || profile.name_zh || '');
    var bio = zh ? (profile.bio_zh || '') : (profile.bio || '');
    var aff = zh ? (profile.affiliation_zh || profile.affiliation || '') : (profile.affiliation || profile.affiliation_zh || '');
    var h1 = document.querySelector('.dj-bar h1'); if (h1 && name) h1.textContent = name;
    setText('pf-aff', aff); setText('pf-bio', bio); setPhoto(profile.photo || '', name);
    var links = profile.links || {};
    setLink('pf-ig', links.instagram || ''); setLink('pf-fb', links.facebook || ''); setLink('pf-wx', links.wechat || ''); setLink('pf-sc', links.soundcloud || ''); setLink('pf-web', links.website || '');
    return fetch('/asia/events.json?v=e233').then(function (r) { return r.json(); }).then(function (events) {
      var day = today(), up = [], past = [];
      (events || []).forEach(function (e) { if (!e || e.hidden || !matches(profile, e)) return; (isPast(e, day) ? past : up).push(e); });
      /* 2026-11-20 (Shiao): organizer / group pages list their events first, one rich row each:
         small poster, name, "每周五 21:00–01:00 · 下次 11/20", venue, and a star (same local favorites as the map, atm_fav_v1). */
      var WD = zh ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
      function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
      function nextDate(e) {
        if (e.kind !== 'weekly') return e.start || '';
        var w = e.weekdays || (e.weekday != null ? [e.weekday] : []), cx = e.cancelled_dates || [], nth = e.nth, d = new Date();
        for (var i = 0; i < 70; i++) {
          var dd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i), k = ymd(dd);
          if (w.indexOf(dd.getDay()) < 0 || cx.indexOf(k) >= 0) continue;
          if (nth) { var n = Math.floor((dd.getDate() - 1) / 7) + 1, last = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() + 7).getMonth() !== dd.getMonth(); var ns = [].concat(nth); if (!(ns.indexOf(n) >= 0 || (last && ns.indexOf(-1) >= 0))) continue; }
          return k;
        }
        return '';
      }
      function md(k) { return k ? (+k.slice(5, 7)) + '/' + (+k.slice(8, 10)) : ''; }
      function favs() { try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); return Array.isArray(a) ? a : []; } catch (x) { return []; } }
      function setFav(id, on) {
        try {
          var a = favs().filter(function (x) { return x !== id; }); if (on) a.unshift(id); localStorage.setItem('atm_fav_v1', JSON.stringify(a));
          var r = JSON.parse(localStorage.getItem('atm_fav_removed_v1') || '[]'); if (!Array.isArray(r)) r = [];
          r = r.filter(function (x) { return x !== id; }); if (!on) r.push(id); localStorage.setItem('atm_fav_removed_v1', JSON.stringify(r));
        } catch (x) {}
      }
      function rich(e) {
        var title = (zh && e.name_zh) || e.name || '', nx = nextDate(e);
        var line = e.kind === 'weekly'
          ? (zh ? '每' : 'Every ') + (e.weekdays || [e.weekday]).map(function (x) { return WD[x]; }).join(zh ? '、' : ', ') + (e.time ? ' ' + e.time : '') + (nx ? (zh ? ' · 下次 ' : ' · Next ') + md(nx) : '')
          : md(e.start) + (e.end && e.end !== e.start ? '–' + md(e.end) : '') + (e.time ? ' · ' + e.time : '');
        var ven = zh ? (e.venue || e.venue_en || '') : (e.venue_en || e.venue || '');
        var p = String(e.poster || '').split('?')[0], th = p ? '/images/thumb/' + p.replace(/^\//, '').replace(/\.(jpe?g|png|webp)$/i, '') + '.webp?v=t360' : '';
        var on = favs().indexOf(e.id) >= 0;
        return '<div class="pf-ev"><a class="pf-ev-a" href="' + (zh ? '/zh/asia/' : '/asia/') + '?card=' + encodeURIComponent(e.id) + '">' +
          (th ? '<img class="pf-ev-img" src="' + esc(th) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="pf-ev-img"></span>') +
          '<span class="pf-ev-t"><b>' + esc(title) + '</b><span class="pf-ev-w">' + esc(line) + '</span>' + (ven ? '<span class="pf-ev-v">' + esc(ven) + '</span>' : '') + '</span></a>' +
          '<button type="button" class="pf-star" data-id="' + esc(e.id) + '" aria-pressed="' + on + '" aria-label="' + (zh ? '收藏' : 'Save') + '">' + (on ? '★' : '☆') + '</button></div>';
      }
      function draw(node, rows, empty, isRich) {
        if (!node) return;
        if (!rows.length) { node.innerHTML = '<p class="dj-empty">' + empty + '</p>'; return; }
        var home = zh ? '/zh/asia/' : '/asia/';
        if (isRich) {
          rows.sort(function (a, b) { return (nextDate(a) || '9') < (nextDate(b) || '9') ? -1 : 1; });
          node.innerHTML = rows.map(rich).join('') + '<a class="pf-ev-all" href="' + home + '">' + (zh ? '在亚洲探戈地图看全部 ›' : 'See everything on Asia Tango Map ›') + '</a>';
          node.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('.pf-star'); if (!b) return; var on = b.getAttribute('aria-pressed') !== 'true'; setFav(b.getAttribute('data-id'), on); b.setAttribute('aria-pressed', on); b.textContent = on ? '★' : '☆'; });
          return;
        }
        node.innerHTML = rows.map(function (e) {
          var title = (zh && e.name_zh) || e.name || '';
          var cz = { Shanghai: '上海', Beijing: '北京', Shenzhen: '深圳', Guangzhou: '广州', Hangzhou: '杭州', Chengdu: '成都', Wuhan: '武汉', Nanjing: '南京', Suzhou: '苏州', Xiamen: '厦门', Tianjin: '天津', Chongqing: '重庆', "Xi'an": '西安', 'Hong Kong': '香港', Taipei: '台北', Macau: '澳门' }, city = (zh && cz[e.city]) || e.city || '';
          var sub = [when(e), city].filter(Boolean).join(' · ');
          return '<a href="' + home + '?card=' + encodeURIComponent(e.id) + '"><b>' + esc(title) + '</b><span>' + sub + '</span></a>';
        }).join('');
      }
      var richOn = kind === 'organizer' || kind === 'group';
      if (richOn) {
        var upN = document.getElementById('pf-up'), main = document.querySelector('.dj-main'), h2 = upN && upN.previousElementSibling;
        if (upN && main) {
          if (h2 && h2.tagName === 'H2') { if (kind === 'group') h2.textContent = zh ? name + '的活动' : 'Events by ' + name; main.insertBefore(h2, main.firstChild); main.insertBefore(upN, h2.nextSibling); h2.classList.add('pf-ev-h'); }
          else main.insertBefore(upN, main.firstChild);
          var st = document.createElement('style'); st.textContent = '.pf-ev-h{margin:4px 0 10px!important}.dj-events .pf-ev{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:10px;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06)}.dj-events a.pf-ev-a{display:flex!important;align-items:center;gap:12px;flex:1;min-width:0;margin:0;padding:0;background:none;box-shadow:none;border-radius:0;text-decoration:none;color:#0A4F57}.dj-events .pf-ev-img{display:block;width:64px;height:64px;flex:none;object-fit:cover;border-radius:8px;background:#EFE6D3}.dj-events a.pf-ev-a .pf-ev-t{display:block;flex:1;min-width:0;margin:0;color:#0A4F57}.dj-events .pf-ev-t b{display:block;font-size:16px;color:#0A4F57}.dj-events a.pf-ev-a .pf-ev-w{display:block;margin-top:2px;font-size:13px;font-weight:600;color:#0E6E78}.dj-events a.pf-ev-a .pf-ev-v{display:block;margin-top:1px;font-size:13px;font-weight:600;color:#5f6f66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pf-star{flex:none;width:44px;height:44px;border:1.5px solid #0E6E78;border-radius:50%;background:#fff;color:#0E6E78;font-size:20px;line-height:1;cursor:pointer}.pf-star[aria-pressed="true"]{background:#0E6E78;color:#F2CF7F}.dj-events a.pf-ev-all{display:block;text-align:center;margin:4px 0 22px;padding:11px;border:1.5px solid #0E6E78;border-radius:999px;background:none;box-shadow:none;color:#0E6E78;font-weight:700;text-decoration:none}'; document.head.appendChild(st);
        }
      }
      draw(document.getElementById('pf-up'), up, zh ? '暂无' : 'None yet', richOn);
      draw(document.getElementById('pf-past'), past, zh ? '暂无' : 'None yet');
    });
  }).catch(function () {});
})();
