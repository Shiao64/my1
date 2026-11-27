(function () {
  /* 2026-11-21 (Shiao): remember this page when an event card (?card=) is opened from here, so the card's ‹ comes back (atm-home.js profBack). */
  document.addEventListener('click', function (ev) { var a = ev.target && ev.target.closest && ev.target.closest('a[href*="card="]'); if (!a || a.closest('.dj-back')) return; try { var u = new URL(a.href, location.href), cid = u.searchParams.get('card'); if (!cid || u.origin !== location.origin || !/\/asia\/$/.test(u.pathname)) return; sessionStorage.setItem('atm_prof_from', JSON.stringify({ id: cid, url: location.pathname + location.search, t: Date.now() })); } catch (e) {} }, true);
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
  /* 2026-11-25: keep Hangul too, so a Korean name (\uc2a4\ud14c\uc774\uc2dc) can match a profile. Same as cardB.js djKey(). */
  function key(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff\uac00-\ud7a3]/g, ''); }
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
  /* asDj: match the card's DJ even on an organizer page (2026-11-25, 近期担任 DJ). */
  function matches(profile, e, asDj) {
    var names = [profile.name, profile.name_zh].concat(profile.match || [], profile.members || []).map(key).filter(Boolean), got = [];
    if (!asDj && (kind === 'organizer' || kind === 'group')) (e.organizers || []).concat(e.organizers_en || []).forEach(function (n) { if (n) got.push(n); });
    else {
      /* 2026-11-21: only nights still to come. Past nights are in the "recent DJ sets" list (dj-recent.json).
         Weekly card: its dj is the current poster's, so only while poster_date is today or later. */
      var dd = today();
      if (e.kind === 'weekly') { if (e.dj && e.poster_date && e.poster_date >= dd) got.push(e.dj); }
      else if (e.dj) got = got.concat(e.dj);
    }
    return got.some(function (n) { return String(n).split(/\s*(?:、|\+|＆|&|\/|,|;)\s*/).some(function (x) { return names.indexOf(key(x)) >= 0; }); });
  }
  function when(e) { return e.kind === 'weekly' ? (zh ? '每周' : 'Weekly') : (e.start || ''); }
  function isPast(e, day) { if (e.kind === 'weekly') return false; var end = e.end || e.start || ''; return !!(end && end < day); }
  var file = (kind === 'organizer' || kind === 'group') ? '/asia/organizers.json?v=o14' : '/asia/djs.json?v=d1';
  function loadList(u) { return fetch(u).then(function (r) { return r.json(); }); }
  loadList(file).then(function (list) {
    if ((list || []).some(function (p) { return p && p.id === id; })) return list;
    /* 2026-11-25: the daily job (poster-prune.yml) can add a page that is newer than a cached list: ask once more, uncached. */
    return loadList(file + '&t=' + Date.now()).catch(function () { return list; });
  }).then(function (list) {
    var profile = (list || []).filter(function (p) { return p.id === id; })[0];
    if (!profile) return;
    var name = zh ? (profile.name_zh || profile.name || '') : (profile.name || profile.name_zh || '');
    var bio = zh ? (profile.bio_zh || '') : (profile.bio || '');
    var aff = zh ? (profile.affiliation_zh || profile.affiliation || '') : (profile.affiliation || profile.affiliation_zh || '');
    var h1 = document.querySelector('.dj-bar h1'); if (h1 && name) h1.textContent = name;
    setText('pf-aff', aff); setText('pf-bio', bio); setPhoto(profile.photo || '', name);
    /* 2026-11-21 (Shiao): DJ pages keep a place for the intro, and list the last 5 nights from the DJ session log (asia/dj-recent.json, tools/dj_sessions.py). */
    if (!bio && (kind === 'dj' || kind === 'organizer')) { var bz = document.getElementById('pf-bio'); if (bz) { bz.textContent = zh ? '介绍待补充。' : 'Profile coming soon.'; bz.classList.add('dj-bio-wait'); bz.style.color = '#8a7a66'; bz.style.fontStyle = 'italic'; } }
    /* 2026-11-25 (Shiao): organizer pages keep a place for the photo too, filled in later in asia/organizers.json.
       Same layout as 刘峥 / 王凯: photo left, intro beside it, under the event list. */
    if (!profile.photo && kind === 'organizer') { var pz = document.getElementById('pf-photo'); if (pz) { var ph = document.createElement('div'); ph.className = 'pf-photo-wait'; ph.textContent = zh ? '照片待补充' : 'Photo coming soon'; ph.style.cssText = 'aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;border:1.5px dashed #c9b89a;border-radius:12px;background:#EFE6D3;color:#8a7a66;font-size:14px;font-weight:600;text-align:center;padding:8px;box-sizing:border-box'; pz.appendChild(ph); } }
    /* 2026-11-25 (Shiao): an organizer who also DJs gets 近期担任 DJ (cards where they are the DJ, from events.json)
       and 最近担任 DJ 的场次 (the DJ log), side by side above the photo + intro. Both stay hidden when empty. */
    var djUpS = null, djRecS = null;
    if (kind === 'organizer') { var st0 = document.querySelector('.dj-story'); if (st0) { djUpS = document.createElement('section'); djUpS.id = 'pf-djup'; djUpS.hidden = true; djRecS = document.createElement('section'); djRecS.id = 'pf-djrec'; djRecS.hidden = true; djUpS.style.marginBottom = djRecS.style.marginBottom = '18px'; st0.parentNode.insertBefore(djUpS, st0); st0.parentNode.insertBefore(djRecS, st0); } }
    /* 2026-11-27 (Shiao): the events file is read once, by the DJ log list and the event lists below. */
    var evP = fetch('/asia/events.json?v=e233').then(function (r) { return r.json(); });
    Promise.all([fetch('/asia/dj-recent.json?v=r1').then(function (r) { return r.json(); }), evP.catch(function () { return []; })]).then(function (got) {
      var all = got[0], evById = {}, dNow = today(); (got[1] || []).forEach(function (e) { if (e && e.id) evById[e.id] = e; });
      var rec = all && all[id], list = rec && rec.recent || [];
      if (!list.length) return;
      var main = document.querySelector('.dj-main'), story = document.querySelector('.dj-story'); if (!main) return;
      var CZ = { Shanghai: '上海', Beijing: '北京', Shenzhen: '深圳', Guangzhou: '广州', Hangzhou: '杭州', Chengdu: '成都', Wuhan: '武汉', Nanjing: '南京', Suzhou: '苏州', Xiamen: '厦门', Tianjin: '天津', Chongqing: '重庆', "Xi'an": '西安', 'Hong Kong': '香港', Taipei: '台北', Macau: '澳门', Seoul: '首尔', Daegu: '大邱', Busan: '釜山', Tokyo: '东京', 'Da Nang': '岘港', 'Kuala Lumpur': '吉隆坡' };
      var home = zh ? '/zh/asia/' : '/asia/', sec = djRecS || document.createElement('section'); sec.className = 'dj-recent'; sec.hidden = false;
      var h = document.createElement('h2'); h.textContent = zh ? '最近担任 DJ 的场次' : 'Recent DJ sets'; sec.appendChild(h);
      var box = document.createElement('div'); box.className = 'dj-events'; sec.appendChild(box);
      list.forEach(function (x) {
        /* 2026-11-27 (Shiao): link only to a card that is still on: not ended (weekly cards never end), not hidden, still on the map. An ended one keeps its name, no link. */
        var ev = evById[x.event], live = !!(ev && !ev.hidden && !isPast(ev, dNow));
        var a = document.createElement('a'); if (live) a.href = home + '?card=' + encodeURIComponent(x.event); else a.className = 'dj-ev-off';
        var b = document.createElement('b'); b.textContent = (zh ? x.name : (x.name_en || x.name)) || ''; a.appendChild(b);
        var sp = document.createElement('span'); var d = String(x.date || '');
        sp.textContent = [d ? (zh ? d.slice(0, 4) + '/' + (+d.slice(5, 7)) + '/' + (+d.slice(8, 10)) : d) : '', (zh && CZ[x.city]) || x.city || ''].filter(Boolean).join(' · '); a.appendChild(sp);
        box.appendChild(a);
      });
      if (rec.n > list.length) { var m = document.createElement('p'); m.className = 'dj-empty'; m.textContent = zh ? ('地图上共记录 ' + rec.n + ' 场') : (rec.n + ' sets recorded on the map'); sec.appendChild(m); }
      if (!djRecS) { if (story && story.nextSibling) main.insertBefore(sec, story.nextSibling); else main.appendChild(sec); }
    }).catch(function () {});
    var links = profile.links || {};
    setLink('pf-ig', links.instagram || ''); setLink('pf-fb', links.facebook || ''); setLink('pf-wx', links.wechat || ''); setLink('pf-sc', links.soundcloud || ''); setLink('pf-web', links.website || '');
    return evP.then(function (events) {
      var day = today(), up = [], past = [];
      (events || []).forEach(function (e) { if (!e || e.hidden || !matches(profile, e)) return; (isPast(e, day) ? past : up).push(e); });
      past.sort(function (a, b) { var x = a.end || a.start || '', y = b.end || b.start || ''; return x < y ? 1 : x > y ? -1 : 0; });
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
      function thumb(e) { var p = String(e.poster || '').split('?')[0]; return p ? '/images/thumb/' + p.replace(/^\//, '').replace(/\.(jpe?g|png|webp)$/i, '') + '.webp?v=t360' : ''; }
      /* 2026-11-25 (Shiao): organizer pages also list past events, newest first, same row without the star.
         Not a link: an ended card only opens the map's "活动已结束" notice, so the row itself shows the poster, date and venue. */
      function ymdTxt(k) { return k ? k.slice(0, 4) + '/' + md(k) : ''; }
      function pastRow(e) {
        var title = (zh && e.name_zh) || e.name || '', s = e.start || '', t = e.end || '';
        var line = ymdTxt(s) + (t && t !== s ? '–' + (t.slice(0, 4) === s.slice(0, 4) ? md(t) : ymdTxt(t)) : '');
        var ven = zh ? (e.venue || e.venue_en || '') : (e.venue_en || e.venue || ''), th = thumb(e);
        return '<div class="pf-ev pf-ev-past"><a class="pf-ev-a">' +
          (th ? '<img class="pf-ev-img" src="' + esc(th) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="pf-ev-img"></span>') +
          '<span class="pf-ev-t"><b>' + esc(title) + '</b><span class="pf-ev-w">' + esc(line) + '</span>' + (ven ? '<span class="pf-ev-v">' + esc(ven) + '</span>' : '') + '</span></a></div>';
      }
      function rich(e) {
        var title = (zh && e.name_zh) || e.name || '', nx = nextDate(e);
        var line = e.kind === 'weekly'
          ? (zh ? '每' : 'Every ') + (e.weekdays || [e.weekday]).map(function (x) { return WD[x]; }).join(zh ? '、' : ', ') + (e.time ? ' ' + e.time : '') + (nx ? (zh ? ' · 下次 ' : ' · Next ') + md(nx) : '')
          : md(e.start) + (e.end && e.end !== e.start ? '–' + md(e.end) : '') + (e.time ? ' · ' + e.time : '');
        var ven = zh ? (e.venue || e.venue_en || '') : (e.venue_en || e.venue || '');
        var th = thumb(e);
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
          return '<a' + (isPast(e, today()) ? ' class="dj-ev-off"' : ' href="' + home + '?card=' + encodeURIComponent(e.id) + '"') + '><b>' + esc(title) + '</b><span>' + sub + '</span></a>';
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
      var pastN = document.getElementById('pf-past'), pastS = pastN && pastN.parentNode;
      if (pastN && richOn) {
        /* Same layout as 刘峥 / 王凯 (Shiao 11/25): 近期主办 list, then 过去的活动 only when there are any, then photo + intro. */
        var upB = document.getElementById('pf-up');
        if (!past.length) { if (pastS && pastS.tagName === 'SECTION') pastS.hidden = true; }
        else {
          if (pastS && pastS.tagName === 'SECTION' && upB && upB.parentNode) { upB.parentNode.insertBefore(pastS, upB.nextSibling); }
          pastN.innerHTML = past.map(pastRow).join('');
        }
      } else draw(pastN, past, zh ? '暂无' : 'None yet');
      /* 近期担任 DJ: cards still to come where this organizer is the DJ, minus the ones already under 近期主办.
         A weekly card counts only for its current poster's night (poster_date today or later), shown with that date. */
      if (djUpS) {
        var mine = {}; up.forEach(function (e) { mine[e.id] = 1; });
        var djDay = function (e) { return e.kind === 'weekly' ? (e.poster_date || '') : (e.start || ''); };
        var djUp = (events || []).filter(function (e) { return e && !e.hidden && !mine[e.id] && !isPast(e, day) && matches(profile, e, true); });
        djUp.sort(function (a, b) { var x = djDay(a), y = djDay(b); return x < y ? -1 : x > y ? 1 : 0; });
        if (djUp.length) {
          djUpS.innerHTML = '<h2>' + (zh ? '近期担任 DJ' : 'Upcoming DJ sets') + '</h2><div class="dj-events">' + djUp.map(function (e) { return rich(e.kind === 'weekly' ? Object.assign({}, e, { kind: 'event', start: e.poster_date, end: e.poster_date }) : e); }).join('') + '</div>';
          djUpS.hidden = false;
          djUpS.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('.pf-star'); if (!b) return; var on = b.getAttribute('aria-pressed') !== 'true'; setFav(b.getAttribute('data-id'), on); b.setAttribute('aria-pressed', on); b.textContent = on ? '★' : '☆'; });
        }
      }
    });
  }).catch(function () {});
})();
