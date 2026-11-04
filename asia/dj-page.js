(function () {
  var body = document.body, id = body.getAttribute('data-id') || '', kind = body.getAttribute('data-kind') || 'dj', zh = body.getAttribute('data-lang') === 'zh';
  var card = '';
  try { card = new URLSearchParams(location.search).get('card') || ''; } catch (e) {}
  var back = document.querySelector('.dj-back');
  if (back) back.href = (zh ? '/zh' : '') + '/asia/' + (card ? ('?card=' + encodeURIComponent(card)) : '');
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
    var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = url; el.appendChild(a);
  }
  function matches(profile, e) {
    var names = [profile.name, profile.name_zh].concat(profile.match || []).map(key).filter(Boolean), got = [];
    if (kind === 'organizer') (e.organizers || []).concat(e.organizers_en || []).forEach(function (n) { if (n) got.push(n); });
    else {
      if (e.dj) got.push(e.dj);
      var map = e.poster_djs || {};
      Object.keys(map).forEach(function (p) { if (map[p]) got.push(map[p]); });
    }
    return got.some(function (n) { return names.indexOf(key(n)) >= 0; });
  }
  function when(e) { return e.kind === 'weekly' ? (zh ? '每周' : 'Weekly') : (e.start || ''); }
  function isPast(e, day) { if (e.kind === 'weekly') return false; var end = e.end || e.start || ''; return !!(end && end < day); }
  var file = kind === 'organizer' ? '/asia/organizers.json?v=o4' : '/asia/djs.json?v=d1';
  fetch(file).then(function (r) { return r.json(); }).then(function (list) {
    var profile = (list || []).filter(function (p) { return p.id === id; })[0];
    if (!profile) return;
    var name = zh ? (profile.name_zh || profile.name || '') : (profile.name || profile.name_zh || '');
    var bio = zh ? (profile.bio_zh || '') : (profile.bio || '');
    var aff = zh ? (profile.affiliation_zh || profile.affiliation || '') : (profile.affiliation || profile.affiliation_zh || '');
    var h1 = document.querySelector('.dj-bar h1'); if (h1 && name) h1.textContent = name;
    setText('pf-aff', aff); setText('pf-bio', bio); setPhoto(profile.photo || '', name);
    var links = profile.links || {};
    setLink('pf-ig', links.instagram || ''); setLink('pf-fb', links.facebook || ''); setLink('pf-wx', links.wechat || ''); setLink('pf-sc', links.soundcloud || '');
    return fetch('/asia/events.json?v=e153').then(function (r) { return r.json(); }).then(function (events) {
      var day = today(), up = [], past = [];
      (events || []).forEach(function (e) { if (!e || e.hidden || !matches(profile, e)) return; (isPast(e, day) ? past : up).push(e); });
      function draw(node, rows, empty) {
        if (!node) return;
        if (!rows.length) { node.innerHTML = '<p class="dj-empty">' + empty + '</p>'; return; }
        var home = zh ? '/zh/asia/' : '/asia/';
        node.innerHTML = rows.map(function (e) {
          var title = (zh && e.name_zh) || e.name || '';
          var sub = [when(e), e.city || ''].filter(Boolean).join(' · ');
          return '<a href="' + home + '?card=' + encodeURIComponent(e.id) + '"><b>' + title.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</b><span>' + sub + '</span></a>';
        }).join('');
      }
      draw(document.getElementById('pf-up'), up, zh ? '暂无' : 'None yet');
      draw(document.getElementById('pf-past'), past, zh ? '暂无' : 'None yet');
    });
  }).catch(function () {});
})();
