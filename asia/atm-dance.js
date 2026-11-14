/* atm-dance.js — a small cute tango couple (original drawing).
   When it dances:
   1. While the event data is loading: it dances on top of the grey skeleton cards (#atm-skel),
      and goes away together with the skeleton when html gets .atm-data. No extra wait is added.
   2. When the visitor saves an event (heart turns on): it dances once across the middle of the
      header bar (about 5 s), then fades out. Un-saving does nothing.
   Nothing else triggers it: no random dancing, no dancing on filter / city switches. */
(function () {
  var D = document, R = D.documentElement;
  var zh = /^zh/i.test(R.lang || R.getAttribute('data-asia-lang') || '');

  var css = D.createElement('style');
  css.id = 'atm-dance-css';
  css.textContent =
    '.atm-cp{display:block;overflow:visible}' +
    '.atm-cp .hb,.atm-cp .lg{transform-box:view-box}' +
    '.atm-cp .hb{transform-origin:20px 46px}' +
    '.atm-cp .lg{transform-origin:23px 39px}' +
    '.atm-go .atm-cp{animation:atmGiro 4s ease-in-out infinite}' +
    '.atm-go .atm-cp .hb{animation:atmHop 1s ease-in-out infinite}' +
    '.atm-go .atm-cp .lg{animation:atmBoleo 2s ease-in-out infinite}' +
    '@keyframes atmGiro{0%,38%{transform:scaleX(1)}50%{transform:scaleX(-1)}62%,100%{transform:scaleX(1)}}' +
    '@keyframes atmHop{0%,100%{transform:translateY(0) rotate(-9deg)}50%{transform:translateY(-3px) rotate(9deg)}}' +
    '@keyframes atmBoleo{0%,30%,100%{transform:rotate(0)}45%{transform:rotate(-110deg)}60%{transform:rotate(15deg)}}' +
    /* loading: on top of the skeleton */
    '#atm-dance-ld{display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px 0 2px;color:#5a3e2b;font:600 14px/1.4 system-ui,sans-serif}' +
    '#atm-dance-ld .atm-cp{width:64px;height:83px}' +
    'html.atm-data #atm-dance-ld{display:none}' +
    /* header: crosses the middle of the bar */
    /* the bar is already position:relative (atm-map-page.css); no overflow:hidden so menus / badges are never clipped */
    '#atm-dance-hd{position:absolute;top:50%;left:var(--atm-da,40%);width:30px;height:39px;margin-top:-20px;pointer-events:none;opacity:0;z-index:3}' +
    '#atm-dance-hd.atm-go{animation:atmCross 5s ease-in-out forwards}' +
    '#atm-dance-hd .atm-cp{width:100%;height:100%}' +
    '@keyframes atmCross{0%{left:var(--atm-da,40%);opacity:0}15%{opacity:1}85%{opacity:1}100%{left:var(--atm-db,52%);opacity:0}}' +
    /* reduced motion: still couple while loading, no header dance */
    '@media (prefers-reduced-motion:reduce){.atm-go .atm-cp,.atm-go .atm-cp .hb,.atm-go .atm-cp .lg{animation:none!important}#atm-dance-hd{display:none!important}}';
  (D.head || R).appendChild(css);

  /* body = face/legs colour, lead = leader's arms and legs, face = face fill */
  function couple(body, lead, face) {
    return '<svg class="atm-cp" viewBox="0 0 40 52" aria-hidden="true" focusable="false">' +
      '<ellipse cx="20" cy="48.5" rx="13" ry="2" fill="' + body + '" opacity=".15"/>' +
      '<g class="hb"><g fill="none" stroke="' + lead + '" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M14 16L15 30M15 30L12 45M15 30L18 45"/><path d="M15 20L8 17L7 12"/><path d="M15 21L23 20"/></g>' +
      '<path d="M24 17L23.5 28M24 39L25 46" stroke="' + body + '" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
      '<circle cx="14" cy="10" r="6.5" fill="' + face + '" stroke="' + body + '" stroke-width="1.3"/>' +
      '<circle cx="30" cy="7" r="2.8" fill="' + body + '"/>' +
      '<circle cx="25" cy="11" r="6" fill="' + face + '" stroke="' + body + '" stroke-width="1.3"/>' +
      '<circle cx="31.5" cy="5" r="1.9" fill="#E0475E"/>' +
      '<circle cx="17" cy="12.5" r="1.1" fill="#E0475E"/><circle cx="22" cy="13.5" r="1.1" fill="#E0475E"/>' +
      '<path d="M23 26L17 40Q24 43 31 38Z" fill="#C8102E"/>' +
      '<g class="lg"><path d="M23 39L31 46" fill="none" stroke="' + body + '" stroke-width="3.4" stroke-linecap="round"/></g>' +
      '</g></svg>';
  }

  /* 1. Loading */
  function addLoader() {
    if (R.classList.contains('atm-data')) return true;
    var sk = D.getElementById('atm-skel');
    if (!sk) return false;
    if (D.getElementById('atm-dance-ld')) return true;
    var d = D.createElement('div');
    d.id = 'atm-dance-ld';
    d.className = 'atm-go';
    d.setAttribute('role', 'status');
    d.innerHTML = couple('#5a3e2b', '#B8892E', '#FBF3E1') + '<span>' + (zh ? '正在找舞会…' : 'Finding milongas…') + '</span>';
    sk.insertBefore(d, sk.firstChild);
    return true;
  }
  (function wait(n) { if (!addLoader() && n < 60) setTimeout(function () { wait(n + 1); }, 50); })(0);

  /* 2. Header dance when an event is saved */
  function dance() {
    try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (x) {}
    var bar = D.querySelector('.china-hero-bar');
    if (!bar) return;
    var h = D.getElementById('atm-dance-hd');
    if (!h) {
      h = D.createElement('div');
      h.id = 'atm-dance-hd';
      h.setAttribute('aria-hidden', 'true');
      h.innerHTML = couple('#FFF6E0', '#E9C46A', '#FFF6E0');
      h.addEventListener('animationend', function (e) { if (e.animationName === 'atmCross') h.classList.remove('atm-go'); });
      bar.appendChild(h);
    }
    if (h.classList.contains('atm-go')) return; /* already dancing: let it finish */
    /* light bar (inner pages) -> dark couple; dark bar (home) -> light couple */
    var bg = getComputedStyle(bar).backgroundColor.match(/\d+(\.\d+)?/g) || [0, 0, 0], lum = (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) / 255;
    if (bg.length > 3 && +bg[3] === 0) lum = 1;
    h.innerHTML = lum > 0.6 ? couple('#5a3e2b', '#B8892E', '#FBF3E1') : couple('#FFF6E0', '#E9C46A', '#FFF6E0');
    /* dance in the widest empty gap of the bar (works for the home bar and the inner ‹ title bar) */
    var br = bar.getBoundingClientRect(), xs = [];
    [].forEach.call(bar.children, function (el) {
      if (el === h || !el.offsetWidth) return;
      if (getComputedStyle(el).visibility === 'hidden') return;
      /* use the drawn content, not the box: a title span may stretch across the bar */
      var r = el.getBoundingClientRect(); try { var rg = D.createRange(); rg.selectNodeContents(el); var c = rg.getBoundingClientRect(); if (c.width > 0) r = c; } catch (x) {}
      if (r.width < 1) return;
      xs.push([r.left - br.left, r.right - br.left]);
    });
    xs.sort(function (p, q) { return p[0] - q[0]; });
    var best = [0, 0], prev = 0;
    xs.concat([[br.width, br.width]]).forEach(function (r) { if (r[0] - prev > best[1] - best[0]) best = [prev, r[0]]; prev = Math.max(prev, r[1]); });
    var a = best[0] + 8, z = best[1] - 8 - 30, m = (a + z) / 2;
    if (z < a) { if (best[1] - best[0] < 34) return; a = z = Math.max(0, m); } /* no room at all: skip */
    else { a = Math.max(a, m - 60); z = Math.min(z, m + 60); } /* a short walk, at most 120px */
    h.style.setProperty('--atm-da', a + 'px');
    h.style.setProperty('--atm-db', z + 'px');
    h.classList.add('atm-go');
  }
  function favCount() { try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); return Array.isArray(a) ? a.length : 0; } catch (x) { return 0; } }
  function onHeart(e) {
    var b = e.target && e.target.closest && e.target.closest('.atm-heart');
    if (!b) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    var was = b.getAttribute('aria-pressed') === 'true', n0 = favCount();
    /* the heart may be re-rendered, so also check whether the saved list grew */
    setTimeout(function () { if ((!was && b.isConnected && b.getAttribute('aria-pressed') === 'true') || favCount() > n0) dance(); }, 60);
  }
  /* window capture runs before the star / favorite handlers on document, so the 'before' state is read correctly */
  window.addEventListener('click', onHeart, true);
  window.addEventListener('keydown', onHeart, true);
  window.atmDance = dance;
})();
