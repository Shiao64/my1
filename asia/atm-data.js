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
  /* One in-flight promise per JSON file for this page load. Default cache
     mode so a preload and HTTP Cache-Control / ETag can satisfy it. Do not
     pass cache:'no-cache' — that is a different cache key from <link rel=preload>
     and forces a second download. */
  var inflight = {};
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
      var remote = b + '/asia/' + file;
      var opts = {};
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(2500);
      p = fetch(remote, opts).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (data) {
        w.ATM_DATA_OK = true;
        return data;
      }).catch(function () { return localFetch(localUrl); });
    }
    inflight[name] = p;
    p.catch(function () { if (inflight[name] === p) delete inflight[name]; });
    return p;
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
