/* atm-dance.js — a tango couple (original drawing), v2 (2026-11-14).
   Look: classic milonga-poster silhouette. Leader in ink black with a gold hat band; follower in a tango-red
   dress with a slit. In the embrace the follower does a boleo: her lower leg whips back and up, then returns.
   When it dances:
   1. While the event data is loading: on top of the grey skeleton cards (#atm-skel), with 「正在找舞会…」.
      It goes away with the skeleton when html gets .atm-data. No extra wait is added.
   2. When the visitor saves an event (star turns on): a small cream bubble pops up right next to the star
      that was tapped (so it is visible wherever the page is scrolled), the couple does one boleo, and the
      bubble fades out (about 2.4 s). Un-saving does nothing.
   prefers-reduced-motion: the loader couple stands still and the save bubble is not shown. */
(function () {
  var D = document, R = D.documentElement;
  var zh = /^zh/i.test(R.lang || R.getAttribute('data-asia-lang') || '');

  var css = D.createElement('style');
  css.id = 'atm-dance-css';
  css.textContent =
    '.atm-cp{display:block;overflow:visible}' +
    '.atm-cp .em,.atm-cp .shin{transform-box:view-box}' +
    '.atm-cp .em{transform-origin:30px 76px}' +            /* embrace sways from the floor */
    '.atm-cp .shin{transform-origin:43px 61px}' +          /* follower's knee */
    /* loader: endless gentle sway + a boleo every 2.4 s */
    '.atm-loop .atm-cp .em{animation:atmSway 2.4s ease-in-out infinite}' +
    '.atm-loop .atm-cp .shin{animation:atmBoleo 2.4s cubic-bezier(.3,.1,.3,1) infinite}' +
    '@keyframes atmSway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}' +
    '@keyframes atmBoleo{0%,35%{transform:rotate(0)}52%{transform:rotate(-125deg)}62%{transform:rotate(-112deg)}80%,100%{transform:rotate(0)}}' +
    '#atm-dance-ld{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0 4px;color:#6B5E52;font:600 14px/1.4 system-ui,sans-serif}' +
    '#atm-dance-ld .atm-cp{width:60px;height:80px}' +
    'html.atm-data #atm-dance-ld{display:none}' +
    /* save bubble: fixed next to the tapped star */
    '#atm-dance-pop{position:fixed;z-index:10060;width:64px;height:64px;border-radius:50%;background:#FFFCF6;border:1.5px solid #C9A24E;box-shadow:0 4px 14px rgba(30,26,23,.22);display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transform:scale(.4)}' +
    '#atm-dance-pop .atm-cp{width:42px;height:56px;margin-top:2px}' +
    '#atm-dance-pop.atm-on{animation:atmPopIn 2.4s ease-out forwards}' +
    '#atm-dance-pop.atm-on .atm-cp .em{animation:atmSway 1.2s ease-in-out 2}' +
    '#atm-dance-pop.atm-on .atm-cp .shin{animation:atmBoleo 1.2s cubic-bezier(.3,.1,.3,1) .15s 2}' +
    '@keyframes atmPopIn{0%{opacity:0;transform:scale(.4)}10%{opacity:1;transform:scale(1.08)}16%{transform:scale(1)}82%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.9) translateY(-6px)}}' +
    '@media (prefers-reduced-motion:reduce){.atm-cp .em,.atm-cp .shin{animation:none!important}#atm-dance-pop{display:none!important}}';
  (D.head || R).appendChild(css);

  /* viewBox 60 x 80, floor at y = 76. Leader on the left facing right, follower on the right facing left. */
  function couple() {
    var ink = '#1E1A17', red = '#9E1B32', gold = '#C9A24E';
    return '<svg class="atm-cp" viewBox="0 0 60 80" aria-hidden="true" focusable="false">' +
      '<ellipse cx="30" cy="77" rx="20" ry="2" fill="' + ink + '" opacity=".12"/>' +
      '<g class="em">' +
        /* leader, leaning in a little (close embrace): legs, suit, head, fedora with a gold band */
        '<g transform="rotate(5 22 76)">' +
          '<path d="M20 46L17 75M24 46L27 75" stroke="' + ink + '" stroke-width="3.6" stroke-linecap="round" fill="none"/>' +
          '<path d="M15 20Q20 17 26 19L28 30L26 47L17 47L15 32Z" fill="' + ink + '"/>' +
          '<circle cx="21" cy="13" r="4.6" fill="' + ink + '"/>' +
          '<path d="M14.5 9.6H27.5" stroke="' + ink + '" stroke-width="1.8" stroke-linecap="round"/>' +
          '<path d="M16.8 9.6L17.6 4.6Q21 3.2 24.4 4.6L25.2 9.6Z" fill="' + ink + '"/>' +
          '<path d="M17.2 8.2H24.8" stroke="' + gold + '" stroke-width="1.3"/>' +
          /* his right arm round her back */
          '<path d="M26 22Q32 25 37 29" stroke="' + ink + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
        '</g>' +
        /* follower, leaning in: standing leg, red dress with a slit, head, bun, gold flower */
        '<g transform="rotate(-5 37 76)">' +
          '<path d="M37 56L36 75" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
          '<path d="M33 20Q37 18 41 20L40 33L45 56Q39 59 32 57L35 33Z" fill="' + red + '"/>' +
          '<circle cx="38" cy="13.5" r="4.2" fill="' + ink + '"/>' +
          '<circle cx="41.8" cy="11.2" r="2.3" fill="' + ink + '"/>' +
          '<circle cx="40.6" cy="9.4" r="1.3" fill="' + gold + '"/>' +
          /* her left arm resting on his shoulder */
          '<path d="M34 21Q30 18 26 19" stroke="' + ink + '" stroke-width="2.3" stroke-linecap="round" fill="none"/>' +
          /* boleo leg: thigh from the slit to the knee; the shin whips back round the knee */
          '<path d="M41 52L43 61" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
          '<g class="shin"><path d="M43 61L42 74" stroke="' + ink + '" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M42 74L45 75" stroke="' + red + '" stroke-width="2" stroke-linecap="round"/></g>' +
        '</g>' +
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
    d.className = 'atm-loop';
    d.setAttribute('role', 'status');
    d.innerHTML = couple() + '<span>' + (zh ? '正在找舞会…' : 'Finding milongas…') + '</span>';
    sk.insertBefore(d, sk.firstChild);
    return true;
  }
  (function wait(n) { if (!addLoader() && n < 60) setTimeout(function () { wait(n + 1); }, 50); })(0);

  /* 2. Save: bubble next to the star that was tapped */
  var pop = null, popTimer = 0;
  function dance(star) {
    try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (x) {}
    if (!pop) {
      pop = D.createElement('div');
      pop.id = 'atm-dance-pop';
      pop.setAttribute('aria-hidden', 'true');
      pop.innerHTML = couple();
      D.body.appendChild(pop);
    }
    place(star);
    pop.classList.remove('atm-on'); void pop.offsetWidth; pop.classList.add('atm-on');
    clearTimeout(popTimer); popTimer = setTimeout(function () { pop.classList.remove('atm-on'); }, 2500);
    /* the list may redraw or the page may jump right after saving: follow the star for a moment */
    var t0 = Date.now(); (function follow() { if (Date.now() - t0 > 900) return; place(null); requestAnimationFrame(follow); })();
  }
  var findStar = null;
  function place(star) {
    if (findStar) { var cur = findStar(); if (cur) star = cur; }
    if (!star && pop.style.left) return; /* nothing better found: stay where it is */
    var vw = R.clientWidth || innerWidth, vh = innerHeight, x = vw / 2 - 32, y = vh / 2 - 32;
    if (star) {
      var r = star.getBoundingClientRect ? star.getBoundingClientRect() : star;
      if (r && r.width) {
        x = r.left + r.width / 2 - 32 - 40;           /* a little left of the star, so it stays on the card */
        y = r.top - 64 - 6;                            /* above the star … */
        if (y < 8) y = r.bottom + 6;                   /* … or below it near the top of the screen */
      }
    }
    x = Math.max(8, Math.min(vw - 72, x)); y = Math.max(8, Math.min(vh - 72, y));
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  /* the star as it is now: the list may have been redrawn or the page may have moved after saving */
  function where(b, at) {
    var id = b.getAttribute('data-fid') || b.getAttribute('data-sid') || '', list = id ? D.querySelectorAll('.atm-heart[data-fid="' + id.replace(/"/g, '') + '"], .atm-heart[data-sid="' + id.replace(/"/g, '') + '"]') : [];
    for (var i = 0; i < list.length; i++) { var r = list[i].getBoundingClientRect(); if (r.width && r.bottom > 0 && r.top < innerHeight) return list[i]; }
    return b.isConnected ? b : at;
  }
  function favCount() { try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); return Array.isArray(a) ? a.length : 0; } catch (x) { return 0; } }
  function onHeart(e) {
    var b = e.target && e.target.closest && e.target.closest('.atm-heart');
    if (!b) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    var was = b.getAttribute('aria-pressed') === 'true', n0 = favCount(), at = b.getBoundingClientRect(); /* the star may be redrawn: keep where it was tapped */
    /* the star may be re-rendered, so also check whether the saved list grew */
    setTimeout(function () { if ((!was && b.isConnected && b.getAttribute('aria-pressed') === 'true') || favCount() > n0) findStar = function () { return where(b, null); }; dance(where(b, at)); }, 60);
  }
  /* window capture runs before the star / favorite handlers on document, so the 'before' state is read correctly */
  window.addEventListener('click', onHeart, true);
  window.addEventListener('keydown', onHeart, true);
  window.atmDance = dance;
})();
