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
  function localFetch(localUrl) {
    return fetch(localUrl, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  /* Remote first. A failure (DNS, CORS, 404, timeout) uses the git copy. */
  w.atmDataJson = function (localUrl) {
    var b = base(), name = jsonName(localUrl);
    if (!b || !name) return localFetch(localUrl);
    var remote = b + '/asia/' + name;
    var opts = { cache: 'no-cache' };
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(2500);
    return fetch(remote, opts).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      w.ATM_DATA_OK = true;
      return data;
    }).catch(function () { return localFetch(localUrl); });
  };
  w.atmPosterUrl = function (path) {
    if (!path || !w.ATM_DATA_OK) return path;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.charAt(0) === '/') return base() + path;
    return path;
  };
  /* A query on the poster field (…jpg?v=20261105) busts that one image.
     Otherwise list thumbs stay ?v=t480 and opened-card thumbs ?v=t800. */
  w.atmPosterUrls = function (p, wide) {
    var raw = String(p || '');
    var qi = raw.indexOf('?');
    var q = qi >= 0 ? raw.slice(0, qi) : raw;
    var extra = qi >= 0 ? raw.slice(qi) : '';
    var stem = q.replace(/\.(jpe?g|png|webp)$/i, '');
    var root = (wide ? '/images/thumb800' : '/images/thumb') + stem;
    var v = extra || ('?v=' + (wide ? 't800' : 't480'));
    function pub(path) { return w.atmPosterUrl(path); }
    return {
      webp: pub(root + '.webp') + v,
      jpg: pub(root + '.jpg') + v,
      full: pub(q) + (extra || ''),
      key: q,
      localJpg: root + '.jpg' + v
    };
  };
})(window);
