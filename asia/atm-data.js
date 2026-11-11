/* Card JSON and poster bytes live on R2 (public custom domain).
   Program pages keep the in-repo files as fallback. A pure card edit does not
   change this file: publish with tools/r2_sync_cards.py. Set window.ATM_DATA_BASE
   to '' before this script to force the in-repo copies. */
(function (w) {
  var DEFAULT_BASE = 'https://data.tangoweekend.org';
  /* Production (tangoweekend.org) reads R2 first. A Pages preview
     (*.pages.dev) reads this commit's JSON, so a card edited in the
     branch shows on the preview before it is published to the bucket. */
  if (w.ATM_DATA_BASE == null) {
    var host = '';
    try { host = (w.location && w.location.hostname) || ''; } catch (e) {}
    w.ATM_DATA_BASE = /\.pages\.dev$/i.test(host) ? '' : DEFAULT_BASE;
  }
  function base() { return String(w.ATM_DATA_BASE || '').replace(/\/$/, ''); }
  w.atmDataBase = base;
  function jsonName(url) {
    var m = String(url || '').match(/([^/?#]+\.json)(?:$|[?#])/);
    return m ? m[1] : '';
  }
  /* The page's ?v=chinaNNN (or ?v=eNNN) is the cache key. R2 must keep it.
     Dropping the query leaves one unversioned URL that mobile and WeChat
     can hold after the card data changes. Preload uses the same query. */
  function jsonQuery(url) {
    var s = String(url || '');
    var q = s.indexOf('?');
    if (q < 0) return '';
    var h = s.indexOf('#', q);
    var query = h < 0 ? s.slice(q) : s.slice(q, h);
    return query.length > 1 ? query : '';
  }
  /* One in-flight promise per JSON file for this page load. Default cache
     mode so a preload and HTTP Cache-Control / ETag can satisfy it. Do not
     pass cache:'no-cache' — that is a different cache key from <link rel=preload>
     and forces a second download. */
  var inflight = {};
  var freshInflight = {};
  w.ATM_DATA_SOURCE = w.ATM_DATA_SOURCE || {};
  function localFetch(localUrl) {
    return fetch(localUrl).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  /* Remote first. A failure (DNS, CORS, 404, timeout) uses the git copy. */
  w.atmDataJson = function (localUrl) {
    var name = jsonName(localUrl) || String(localUrl || '');
    if (inflight[name]) return inflight[name];
    var b = base(), file = jsonName(localUrl);
    var p;
    if (!b || !file) p = localFetch(localUrl);
    else {
      var remote = b + '/asia/' + file + jsonQuery(localUrl);
      var opts = {};
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(2500);
      p = fetch(remote, opts).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (data) {
        w.ATM_DATA_OK = true;
        w.ATM_DATA_SOURCE[file] = 'r2';
        return data;
      }).catch(function () {
        w.ATM_DATA_SOURCE[file] = 'git';
        return localFetch(localUrl);
      });
    }
    inflight[name] = p;
    p.catch(function () { if (inflight[name] === p) delete inflight[name]; });
    return p;
  };
  /* One extra R2 read for a ?card= id the cached/fallback lists did not have.
     A new query misses the long-lived ?v=china object. It does not replace
     the normal inflight fetch, and it does not fall back to the git file. */
  w.atmDataJsonFresh = function (localUrl) {
    var b = base(), file = jsonName(localUrl);
    if (!b || !file) return localFetch(localUrl);
    var q = jsonQuery(localUrl);
    var remote = b + '/asia/' + file + q + (q ? '&' : '?') + 'atmbust=1';
    var opts = {};
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(4000);
    return fetch(remote, opts).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      w.ATM_DATA_OK = true;
      return data;
    });
  };
  /* Home and city lists paint the git fallback immediately, then one fresh
     R2 read (a different cache key) redraws if that list was stale. Card
     pages already call atmDataJsonFresh themselves. One try per file. */
  w.atmRetryAfterFallback = function (localUrl) {
    var file = jsonName(localUrl);
    if (!base() || !file) return Promise.resolve(null);
    if (freshInflight[file]) return freshInflight[file];
    if (w.ATM_DATA_SOURCE[file] !== 'git') return Promise.resolve(null);
    freshInflight[file] = w.atmDataJsonFresh(localUrl).then(function (data) {
      w.ATM_DATA_SOURCE[file] = 'r2';
      inflight[file] = Promise.resolve(data);
      return data;
    }).catch(function () { return null; });
    return freshInflight[file];
  };
  /* A poisoned CDN image (null bytes, or a 404 cached for 30 days) is skipped
     once. A second call returns '' so a probe cannot loop. */
  w.atmPosterRetryUrl = function (url) {
    var s = String(url || '');
    if (!s || s.indexOf('atmbust=') >= 0) return '';
    return s + (s.indexOf('?') >= 0 ? '&' : '?') + 'atmbust=1';
  };
  function pickCard(groups, id) {
    if (!groups) return null;
    for (var g = 0; g < groups.length; g++) {
      var list = groups[g] || [];
      for (var i = 0; i < list.length; i++) {
        var row = list[i];
        if (row && row.id === id && !row.hidden) return row;
      }
    }
    return null;
  }
  w.atmEventEnded = function (row, today) {
    if (!row) return false;
    var end = row.end || row.start || '';
    var dated = !!(row.start && (row.kind === 'event' || row.regular_oneoff) && end && String(end) < String(today || ''));
    return dated || row.status === 'ended';
  };
  /* staleGroups missed the id (old ?v= cache or git fallback). freshGroups is
     the one retry, or null when that retry failed. Missing is not ended. */
  w.atmResolveCard = function (staleGroups, freshGroups, id, today) {
    var row = pickCard(staleGroups, id);
    if (!row && freshGroups) row = pickCard(freshGroups, id);
    return { row: row, fate: !row ? 'missing' : (w.atmEventEnded(row, today) ? 'ended' : 'found') };
  };
  /* Old public ids that are the same event as another card. No alias field on
     the row: ?card=E163 must leave the map before missing/ended UI. */
  w.atmCardAliasHref = function (id, zh, search, hash) {
    var base = ({ E163: '/event/chengdu-2027-ich-tango-festival/' })[id];
    if (!base) return '';
    var params;
    try { params = new URLSearchParams(String(search || '').replace(/^\?/, '')); }
    catch (e) { params = new URLSearchParams(); }
    params.delete('card');
    var q = params.toString();
    var h = hash || '';
    if (h && h.charAt(0) !== '#') h = '#' + h;
    return base + (zh ? 'zh/' : '') + (q ? '?' + q : '') + h;
  };
  w.atmPosterUrl = function (path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;
    var host = '';
    try { host = (w.location && w.location.hostname) || ''; } catch (e) {}
    /* Pages preview keeps JSON local so unpublished card edits show, but the
       direct-upload omits thumb800 + full posters (SPA HTML 200). Point poster
       bytes at R2 so single-card / onerror fallbacks actually load. */
    if (/\.pages\.dev$/i.test(host) && path.charAt(0) === '/') return DEFAULT_BASE + path;
    if (!w.ATM_DATA_OK) return path;
    if (path.charAt(0) === '/') return base() + path;
    return path;
  };
  /* A query on the poster field (…jpg?v=20261105) busts that one image.
     Otherwise list thumbs stay ?v=t360 and opened-card thumbs ?v=t800. */
  w.atmPosterUrls = function (p, wide) {
    var raw = String(p || '');
    var qi = raw.indexOf('?');
    var q = qi >= 0 ? raw.slice(0, qi) : raw;
    var extra = qi >= 0 ? raw.slice(qi) : '';
    var stem = q.replace(/\.(jpe?g|png|webp)$/i, '');
    var root = (wide ? '/images/thumb800' : '/images/thumb') + stem;
    var v = extra || ('?v=' + (wide ? 't800' : 't360'));
    function pub(path) { return w.atmPosterUrl(path); }
    return {
      webp: pub(root + '.webp') + v,
      jpg: pub(root + '.jpg') + v,
      full: pub(q) + (extra || ''),
      key: q,
      localJpg: root + '.jpg' + v
    };
  };
  /* Single-card poster: paint the list thumb (t360, often already in cache)
     immediately, then upgrade to thumb800. The original file is last, and
     only when both thumbs fail — a thumb800 that exists must not be skipped
     for the ~500KB jpg. Probes own failure; img onerror from a src swap must
     not jump to the original. */
  w.atmCardPoster = function (img, sourceEl, path, opts) {
    opts = opts || {};
    if (!img || !path || !w.atmPosterUrls) return;
    var small = w.atmPosterUrls(path, false);
    var big = w.atmPosterUrls(path, true);
    var token = String(Math.random()).slice(2);
    img.setAttribute('data-atm-gen', token);
    img.removeAttribute('data-atm-fell');
    img.setAttribute('data-full', (big && big.full) || (small && small.full) || '');
    img.decoding = 'async';
    try { img.loading = 'eager'; } catch (e) {}
    var pri = opts.priority || 'high';
    img.setAttribute('fetchpriority', pri);
    try { img.fetchPriority = pri; } catch (e2) {}
    function alive() { return img.getAttribute('data-atm-gen') === token; }
    function paint(step, webp, jpg) {
      if (!alive()) return;
      img.setAttribute('data-atm-step', step);
      if (sourceEl) {
        if (webp) { sourceEl.type = 'image/webp'; sourceEl.setAttribute('srcset', webp); }
        else sourceEl.removeAttribute('srcset');
      }
      if (jpg) img.src = jpg;
    }
    img.onerror = function () {};
    paint('t360', small.webp, small.jpg);
    if (!big || !big.webp || big.webp === small.webp) return;
    var smallBad = false, bigBad = false, bigOk = false;
    function goFull() {
      if (!alive() || bigOk || img.getAttribute('data-atm-fell') === '1') return;
      img.setAttribute('data-atm-fell', '1');
      var full = (big && big.full) || (small && small.full) || '';
      var again = w.atmPosterRetryUrl(full);
      paint('full', '', again || full);
    }
    function loadImg(src, low, ok, bad) {
      if (!src) { bad(); return; }
      var im = new Image();
      try { im.fetchPriority = low ? 'low' : 'high'; } catch (e3) {}
      im.onload = function () { if (alive()) ok(); };
      im.onerror = function () { if (alive()) bad(); };
      im.src = src;
    }
    /* webp, then the same URL once with atmbust, then jpg, then jpg atmbust. */
    function probe(urls, low, ok, bad) {
      var webp = urls.webp, jpg = urls.jpg, webp2 = w.atmPosterRetryUrl(webp), jpg2 = w.atmPosterRetryUrl(jpg);
      loadImg(webp, low, function () { ok(webp, ''); }, function () {
        loadImg(webp2, low, function () { ok(webp2, ''); }, function () {
          loadImg(jpg, low, function () { ok('', jpg); }, function () {
            loadImg(jpg2, low, function () { ok('', jpg2); }, bad);
          });
        });
      });
    }
    probe(small, false, function (webpUrl, jpgUrl) {
      if (webpUrl && webpUrl !== small.webp) paint('t360', webpUrl, '');
      else if (!webpUrl) paint('t360', '', jpgUrl || small.jpg);
    }, function () {
      smallBad = true;
      if (bigOk) return;
      if (bigBad) goFull();
    });
    probe(big, true, function (webpUrl, jpgUrl) {
      bigOk = true;
      paint('t800', webpUrl, jpgUrl);
    }, function () {
      bigBad = true;
      if (smallBad) goFull();
    });
  };

  /* Assign src only when the img is inside the viewport and inside every
     overflow ancestor. Native loading=lazy still fetches horizontally
     off-screen strips in Safari and WeChat, because those imgs are
     vertically inside the viewport. */
  if (typeof document === 'undefined') return;
  function clippedInView(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var top = r.top, left = r.left, bottom = r.bottom, right = r.right;
    var node = el.parentElement;
    while (node && node !== document.documentElement) {
      var st;
      try { st = getComputedStyle(node); } catch (e) { break; }
      if (st.display === 'none' || st.visibility === 'hidden') return false;
      var clipX = /(auto|scroll|hidden)/.test(st.overflowX);
      var clipY = /(auto|scroll|hidden)/.test(st.overflowY);
      if (clipX || clipY) {
        var b = node.getBoundingClientRect();
        if (clipX) { left = Math.max(left, b.left); right = Math.min(right, b.right); }
        if (clipY) { top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom); }
      }
      node = node.parentElement;
    }
    var vw = w.innerWidth || 400, vh = w.innerHeight || 700;
    if (right - left < 8 || bottom - top < 8) return false;
    if (bottom <= -40 || top >= vh + 120) return false;
    if (right <= -16 || left >= vw + 48) return false;
    return true;
  }
  function promote(img) {
    if (img.getAttribute('data-atm-on') === '1') return;
    var pic = img.parentElement;
    if (pic && pic.tagName === 'PICTURE') {
      var sources = pic.querySelectorAll('source[data-atm-srcset]');
      for (var i = 0; i < sources.length; i++) sources[i].srcset = sources[i].getAttribute('data-atm-srcset');
    }
    var s = img.getAttribute('data-atm-src');
    if (s) img.src = s;
    img.setAttribute('data-atm-on', '1');
  }
  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var imgs = scope.querySelectorAll('img[data-atm-src]:not([data-atm-on="1"])');
    for (var i = 0; i < imgs.length; i++) if (clippedInView(imgs[i])) promote(imgs[i]);
  }
  var queued = 0, watching = false;
  function arm(root) {
    scan(root || document);
    if (watching) return;
    watching = true;
    function kick() {
      if (queued) return;
      queued = 1;
      requestAnimationFrame(function () { queued = 0; scan(document); });
    }
    addEventListener('scroll', kick, { passive: true, capture: true });
    addEventListener('resize', kick);
    addEventListener('hashchange', function () { setTimeout(function () { scan(document); }, 80); });
    if (typeof MutationObserver !== 'undefined') new MutationObserver(kick).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }
  w.atmArmImages = arm;
  function bootArm() { arm(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootArm);
  else bootArm();
})(window);
