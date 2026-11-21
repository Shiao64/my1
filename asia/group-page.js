/* Group page (/group/<id>/, /zh/group/<id>/). 2026-11-20 (Shiao) order, top to bottom:
   one-line intro + WeChat / website / intro buttons -> "coming up" banner (big event within 30 days) ->
   regular events (weekly milongas / prácticas) -> big events (workshops, festivals) -> classes -> about (full bio, venues, people).
   Events belong to the group when e.groups has the id, or (fallback) an organizer is in members / match. */
(function () {
  /* 2026-11-21 (Shiao): remember this page when an event card (?card=) is opened from here, so the card's ‹ comes back (atm-home.js profBack). */
  document.addEventListener('click', function (ev) { var a = ev.target && ev.target.closest && ev.target.closest('a[href*="card="]'); if (!a || a.closest('.dj-back')) return; try { var u = new URL(a.href, location.href), cid = u.searchParams.get('card'); if (!cid || u.origin !== location.origin || !/\/asia\/$/.test(u.pathname)) return; sessionStorage.setItem('atm_prof_from', JSON.stringify({ id: cid, url: location.pathname + location.search, t: Date.now() })); } catch (e) {} }, true);
  var body = document.body, id = body.getAttribute('data-id') || '', zh = body.getAttribute('data-lang') === 'zh';
  var card = '';
  try { card = new URLSearchParams(location.search).get('card') || ''; } catch (e) {}
  var HOME = zh ? '/zh/asia/' : '/asia/';
  var back = document.querySelector('.dj-back');
  if (back) {
    back.href = HOME + (card ? ('?card=' + encodeURIComponent(card)) : '');
    back.innerHTML = '<svg width="14" height="28" viewBox="0 0 14 28" aria-hidden="true"><path d="M11.5 2.5L2.8 14l8.7 11.5" fill="none" stroke="#0A4F57" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var bar = back.parentNode, h1 = bar.querySelector('h1'), aff = bar.querySelector('.dj-aff');
    if (h1 && !bar.querySelector('.dj-tw')) { var tw = document.createElement('div'); tw.className = 'dj-tw'; bar.insertBefore(tw, h1); tw.appendChild(h1); if (aff) tw.appendChild(aff); }
    back.addEventListener('click', function (ev) { ev.preventDefault(); var rf = null; try { rf = new URL(document.referrer); } catch (e) {} var t = new URL(back.href, location.href); if (rf && rf.origin === location.origin && /\/asia\/$/.test(rf.pathname) && history.length > 1) history.back(); else location.replace(t.href); });
  }
  var T = zh ? {
    reg: '日常活动', regSub: '舞会 · 练习', big: '大活动', bigSub: '工作坊 · 探戈节', cls: '课程', about: '关于', soon: '近期', wx: '微信', web: '网站', intro: '介绍', more: '展开', less: '收起',
    copied: '微信号已复制', saveG: '收藏', unsaveG: '取消收藏', savedG: '已收藏', unsavedG: '已取消收藏', venues: '场地', people: '主理人', dir: '有指路图', next: '下次', every: '每', all: '在亚洲探戈地图看全部活动 ›', none: '暂无', save: '收藏', ask: '报名、时间请联络：微信 '
  } : {
    reg: 'Regular events', regSub: 'Milongas · Prácticas', big: 'Big events', bigSub: 'Workshops · Festivals', cls: 'Classes', about: 'About', soon: 'Coming up', wx: 'WeChat', web: 'Website', intro: 'About', more: 'More', less: 'Less',
    copied: 'WeChat ID copied', saveG: 'Save ', unsaveG: 'Unsave ', savedG: 'Saved ', unsavedG: 'Removed ', venues: 'Venues', people: 'People', dir: 'photo directions', next: 'Next', every: 'Every ', all: 'See everything on Asia Tango Map ›', none: 'None yet', save: 'Save', ask: 'Times and sign-up: WeChat '
  };
  var WD = zh ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function key(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9一-鿿]/g, ''); }
  function pick(o, f) { return zh ? (o[f + '_zh'] || o[f] || '') : (o[f + '_en'] || o[f] || o[f + '_zh'] || ''); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function today() {
    try {
      var y, m, d; new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(function (p) { if (p.type === 'year') y = p.value; else if (p.type === 'month') m = p.value; else if (p.type === 'day') d = p.value; });
      if (y && m && d) return y + '-' + m + '-' + d;
    } catch (e) {}
    return ymd(new Date());
  }
  var DAY = today();
  function addDays(k, n) { var p = k.split('-'); return ymd(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function md(k) { return k ? (+k.slice(5, 7)) + '/' + (+k.slice(8, 10)) : ''; }
  function nextDate(e) {
    if (e.kind !== 'weekly') return e.start || '';
    var w = e.weekdays || (e.weekday != null ? [e.weekday] : []), cx = e.cancelled_dates || [], nth = e.nth, p = DAY.split('-');
    for (var i = 0; i < 70; i++) {
      var dd = new Date(+p[0], +p[1] - 1, +p[2] + i), k = ymd(dd);
      if (w.indexOf(dd.getDay()) < 0 || cx.indexOf(k) >= 0) continue;
      if (nth) { var n = Math.floor((dd.getDate() - 1) / 7) + 1, last = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() + 7).getMonth() !== dd.getMonth(), ns = [].concat(nth); if (!(ns.indexOf(n) >= 0 || (last && ns.indexOf(-1) >= 0))) continue; }
      return k;
    }
    return '';
  }
  function favs() { try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); return Array.isArray(a) ? a : []; } catch (x) { return []; } }
  function setFav(fid, on) {
    try {
      var a = favs().filter(function (x) { return x !== fid; }); if (on) a.unshift(fid); localStorage.setItem('atm_fav_v1', JSON.stringify(a));
      var r = JSON.parse(localStorage.getItem('atm_fav_removed_v1') || '[]'); if (!Array.isArray(r)) r = [];
      r = r.filter(function (x) { return x !== fid; }); if (!on) r.push(fid); localStorage.setItem('atm_fav_removed_v1', JSON.stringify(r));
    } catch (x) {}
  }
  function thumb(poster) { var p = String(poster || '').split('?')[0]; return p ? '/images/thumb/' + p.replace(/^\//, '').replace(/\.(jpe?g|png|webp)$/i, '') + '.webp?v=t360' : ''; }
  function venueOf(e) { return zh ? (e.venue || e.venue_en || '') : (e.venue_en || e.venue || ''); }
  function row(e, logo) {
    var title = (zh && e.name_zh) || e.name || '', nx = nextDate(e);
    var line = e.kind === 'weekly'
      ? T.every + (e.weekdays || [e.weekday]).map(function (x) { return WD[x]; }).join(zh ? '、' : ', ') + (e.time ? ' ' + e.time : '') + (nx ? ' · ' + T.next + ' ' + md(nx) : '')
      : md(e.start) + (e.end && e.end !== e.start ? '–' + md(e.end) : '') + (e.time ? ' · ' + e.time : '');
    var ven = venueOf(e), th = thumb(e.poster) || logo || '', on = favs().indexOf(e.id) >= 0;
    return '<div class="pf-ev"><a class="pf-ev-a" href="' + HOME + '?card=' + encodeURIComponent(e.id) + '">' +
      (th ? '<img class="pf-ev-img" src="' + esc(th) + '" alt="" loading="lazy"' + (logo && th !== logo ? ' onerror="this.onerror=null;this.src=\'' + esc(logo) + '\'"' : '') + '>' : '<span class="pf-ev-img"></span>') +
      '<span class="pf-ev-t"><b>' + esc(title) + '</b><span class="pf-ev-w">' + esc(line) + '</span>' + (ven ? '<span class="pf-ev-v">' + esc(ven) + '</span>' : '') + '</span></a>' +
      '<button type="button" class="pf-star" data-id="' + esc(e.id) + '" aria-pressed="' + on + '" aria-label="' + T.save + '">' + (on ? '★' : '☆') + '</button></div>';
  }
  function section(sid, title, sub, inner) { return '<section class="gp-sec" id="' + sid + '"><h2>' + esc(title) + (sub ? ' <small>' + esc(sub) + '</small>' : '') + '</h2>' + inner + '</section>'; }
  function toast(msg) { var t = document.createElement('div'); t.className = 'gp-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1600); }
  function copy(text) {
    var done = function () { toast(T.copied + '：' + text); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else { try { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e) {} done(); }
  }
  function mine(profile, e) {
    if (Array.isArray(e.groups) && e.groups.length) return e.groups.indexOf(profile.id) >= 0;
    var names = [profile.name, profile.name_zh].concat(profile.match || [], profile.members || []).map(key).filter(Boolean);
    return (e.organizers || []).concat(e.organizers_en || []).some(function (n) { return names.indexOf(key(n)) >= 0; });
  }
  Promise.all([
    fetch('/asia/organizers.json?v=o10').then(function (r) { return r.json(); }),
    fetch('/asia/events.json?v=e235').then(function (r) { return r.json(); })
  ]).then(function (res) {
    var people = res[0] || [], events = res[1] || [];
    var profile = people.filter(function (p) { return p.id === id; })[0];
    var main = document.querySelector('.dj-main');
    if (!profile || !main) return;
    var name = zh ? (profile.name_zh || profile.name || '') : (profile.name || profile.name_zh || '');
    var aff = zh ? (profile.affiliation_zh || profile.affiliation || '') : (profile.affiliation || profile.affiliation_zh || '');
    var h1 = document.querySelector('.dj-bar h1'); if (h1 && name) h1.textContent = name;
    var affEl = document.getElementById('pf-aff'); if (affEl) affEl.textContent = aff;
    var bio = String(zh ? (profile.bio_zh || '') : (profile.bio || '')).trim(), paras = bio.split(/\n\s*\n/), tagline = paras.length > 1 ? paras[0].trim() : '', rest = paras.length > 1 ? paras.slice(1).join('\n\n') : bio;
    var links = profile.links || {}, logo = profile.photo || '';

    var mineList = events.filter(function (e) { return e && !e.hidden && mine(profile, e); });
    /* 2026-11-20 (Shiao): save the whole group with the star at top right (star only: a group has no date, so no 要参加/感兴趣).
       atm_fav_groups_v1 = [{id,name,name_zh,photo}]. Shiao 2026-11-20 later: saving a group saves only the group (its card in 收藏), not its events.
       Un-saving still removes events an older version added for this group (added). */
    var GK = 'atm_fav_groups_v1';
    function gList() { try { var a = JSON.parse(localStorage.getItem(GK) || '[]'); return Array.isArray(a) ? a : []; } catch (x) { return []; } }
    function gOn() { return gList().some(function (g) { return g && g.id === profile.id; }); }
    function gSet(on) {
      var G = gList().filter(function (g) { return g && g.id !== profile.id; });
      if (on) {
        G.unshift({ id: profile.id, name: profile.name || '', name_zh: profile.name_zh || '', photo: profile.photo || '' });
      } else {
        var old = gList().filter(function (g) { return g && g.id === profile.id; })[0];
        ((old && old.added) || []).forEach(function (fid) { setFav(fid, false); });
      }
      try { localStorage.setItem(GK, JSON.stringify(G)); } catch (x) {}
    }
    var bar2 = document.querySelector('.dj-bar');
    if (bar2 && !bar2.querySelector('.gp-star')) {
      var gs = document.createElement('button'); gs.type = 'button'; gs.className = 'gp-star';
      gs.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1 6.8 18.6l1-5.8L3.6 8.7l5.8-.8z"/></svg>';
      var paint = function () { var on = gOn(); gs.setAttribute('aria-pressed', on); gs.setAttribute('aria-label', (on ? T.unsaveG : T.saveG) + name); gs.title = gs.getAttribute('aria-label'); };
      paint(); bar2.appendChild(gs);
      gs.addEventListener('click', function () {
        var on = !gOn(); gSet(on); paint(); toast(on ? T.savedG + name : T.unsavedG + name);
        main.querySelectorAll('.pf-star').forEach(function (b) { var v = favs().indexOf(b.getAttribute('data-id')) >= 0; b.setAttribute('aria-pressed', v); b.textContent = v ? '★' : '☆'; });
      });
    }
    var reg = mineList.filter(function (e) { return e.kind === 'weekly'; });
    var big = mineList.filter(function (e) { return e.kind !== 'weekly' && (e.end || e.start || '') >= DAY; });
    var byNext = function (a, b) { var x = nextDate(a) || '9', y = nextDate(b) || '9'; return x < y ? -1 : x > y ? 1 : 0; };
    reg.sort(byNext); big.sort(byNext);
    var soon = big.filter(function (e) { return e.start && e.start <= addDays(DAY, 30); })[0];

    var h = '';
    /* 1. top: logo, one-line intro, buttons */
    var btn = [];
    if (links.website) btn.push('<a class="gp-btn" href="' + esc(links.website) + '" target="_blank" rel="noopener">' + T.web + ' ↗</a>');
    if (bio) btn.push('<a class="gp-btn" href="#pf-about">' + T.intro + ' ↓</a>');
    h += '<section class="gp-top">' + (logo ? '<img class="gp-logo" src="' + esc(logo) + '" alt="">' : '') + '<div class="gp-tag">' + (tagline ? '<p>' + esc(tagline) + '</p>' : '') + '</div></section>' + (btn.length ? '<div class="gp-btns">' + btn.join('') + '</div>' : '');
    if (soon) h += '<a class="gp-soon" href="' + HOME + '?card=' + encodeURIComponent(soon.id) + '"><b>' + T.soon + '</b> ' + esc(md(soon.start) + (soon.end && soon.end !== soon.start ? '–' + md(soon.end) : '')) + ' · ' + esc((zh && soon.name_zh) || soon.name || '') + ' ›</a>';
    /* 2. regular */
    if (reg.length) h += section('gp-reg', T.reg, T.regSub, '<div class="dj-events">' + reg.map(function (e) { return row(e, logo); }).join('') + '</div>');
    /* 3. big */
    if (big.length) h += section('gp-big', T.big, T.bigSub, '<div class="dj-events">' + big.map(function (e) { return row(e, logo); }).join('') + '</div>');
    /* 4. classes: profile.classes [{weekday,time,level,level_en,venue,venue_en,teacher,note,note_en}], profile.classes_note */
    var cls = Array.isArray(profile.classes) ? profile.classes.slice() : [], cnote = pick(profile, 'classes_note');
    if (cls.length || cnote) {
      cls.sort(function (a, b) { return ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || String(a.time || '').localeCompare(String(b.time || '')); });
      var ct = cls.map(function (c) { return '<div class="gp-cls"><span class="gp-cls-d">' + esc(WD[c.weekday] || '') + '</span><span class="gp-cls-t">' + esc(c.time || '') + '</span><span class="gp-cls-l"><b>' + esc(pick(c, 'level')) + '</b>' + [pick(c, 'venue'), c.teacher].filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</span></div>'; }).join('');
      h += section('pf-classes', T.cls, '', (ct ? '<div class="gp-clist">' + ct + '</div>' : '') + (cnote ? '<p class="gp-note">' + esc(cnote) + '</p>' : '') + (links.wechat ? '<p class="gp-note">' + T.ask + '<button type="button" class="gp-link" data-copy="' + esc(links.wechat) + '">' + esc(links.wechat) + '</button></p>' : ''));
    }
    /* 5. about: full bio (folded), venues, people */
    var ab = '';
    if (rest) ab += '<div class="gp-bio" id="gp-bio"><p class="dj-bio">' + esc(rest) + '</p></div><button type="button" class="gp-more" aria-expanded="false">' + T.more + ' ›</button>';
    var vseen = {}, vrows = [];
    /* profile.venues (names as on the cards) limits this list to the group's own places (user 11/20: TangoBang = 永惠大厦 only) */
    var vonly = Array.isArray(profile.venues) && profile.venues.length ? profile.venues.map(key) : null;
    mineList.forEach(function (e) { var v = venueOf(e); if (!v || vseen[v]) return; if (vonly && vonly.indexOf(key(e.venue)) < 0 && vonly.indexOf(key(e.venue_en)) < 0) return; vseen[v] = 1; vrows.push('<a href="' + HOME + '?card=' + encodeURIComponent(e.id) + '">' + esc(v) + '</a>'); });
    if (vrows.length) ab += '<div class="gp-kv"><b>' + T.venues + '</b><div>' + vrows.join('') + '</div></div>';
    var mem = (profile.members || []).map(function (m) { var p = people.filter(function (x) { return x.kind !== 'group' && [x.name, x.name_zh].concat(x.match || []).map(key).indexOf(key(m)) >= 0; })[0]; var label = p ? (zh ? (p.name_zh || p.name) : (p.name || p.name_zh)) || m : m; return p ? '<a href="' + (zh ? '/zh' : '') + '/organizer/' + encodeURIComponent(p.id) + '/">' + esc(label) + '</a>' : '<span>' + esc(label) + '</span>'; });
    if (mem.length) ab += '<div class="gp-kv"><b>' + T.people + '</b><div>' + mem.join('') + '</div></div>';
    if (ab) h += section('pf-about', T.about + (name ? (zh ? name : ' ' + name) : ''), '', ab);
    h += '<a class="gp-all" href="' + HOME + '">' + T.all + '</a>';
    main.innerHTML = h;

    main.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('.pf-star, [data-copy], .gp-more');
      if (!t) return;
      if (t.classList.contains('pf-star')) { var on = t.getAttribute('aria-pressed') !== 'true'; setFav(t.getAttribute('data-id'), on); t.setAttribute('aria-pressed', on); t.textContent = on ? '★' : '☆'; return; }
      if (t.hasAttribute('data-copy')) { copy(t.getAttribute('data-copy')); return; }
      var b = document.getElementById('gp-bio'), open = t.getAttribute('aria-expanded') !== 'true';
      b.classList.toggle('open', open); t.setAttribute('aria-expanded', open); t.textContent = open ? T.less : T.more + ' ›';
    });
    var mb = main.querySelector('.gp-more'), bb = document.getElementById('gp-bio');
    if (mb && bb && bb.scrollHeight <= bb.clientHeight + 4) { bb.classList.add('open'); mb.remove(); }
    if (location.hash === '#pf-about' || location.hash === '#pf-classes') { var tg = document.getElementById(location.hash.slice(1)); if (tg) tg.scrollIntoView(); }
  }).catch(function () {});
})();
