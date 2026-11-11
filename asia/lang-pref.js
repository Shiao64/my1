/* Asia Tango Map language preference.
   v11.8 draft: the URL decides the language. /zh/... always Chinese, /asia/ always English;
   no redirect here (browser language / saved choice only apply on the bare homepage /, see /index.html).
   Explicit switch click saves localStorage asiaMapLang = 'en' | 'zh' (used by / next time). */
(function () {
  try {
    var hash = location.hash || '';
    var pm = /^#p=([0-9a-f]{64})$/.exec(hash);
    if (pm) {
      var api = String(window.TANGO_SUB_API || 'https://api.tangoweekend.org').replace(/\/$/, '');
      try { localStorage.setItem('atm_pass_url', api + '/social/going/enter/' + pm[1]); } catch (e0) {}
      hash = '';
    }
    var q = new URLSearchParams(location.search);
    var s = q.get('s') || '';
    if (/^[0-9a-f]{64}$/.test(s)) {
      try { localStorage.setItem('atm_session', s); } catch (e) {}
      q.delete('s');
      var next = location.pathname + (q.toString() ? '?' + q.toString() : '') + hash;
      try { history.replaceState(history.state, '', next); } catch (e2) {}
    } else {
      if (pm) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e5) {} }
      var have = '';
      try { have = localStorage.getItem('atm_session') || ''; } catch (e3) {}
      if (!/^[0-9a-f]{64}$/.test(have)) {
        var m = (document.cookie || '').match(/(?:^|; )atm_session=([0-9a-f]{64})/);
        if (m) { try { localStorage.setItem('atm_session', m[1]); } catch (e4) {} }
      }
    }
  } catch (e) {}
})();
(function () {
  var KEY = 'asiaMapLang';
  var html = document.documentElement;
  var page = html.getAttribute('data-asia-lang') || 'en';
  var enUrl = html.getAttribute('data-asia-en') || './';
  var zhUrl = html.getAttribute('data-asia-zh') || '../zh/asia/';

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  function isZhBrowser() {
    var langs = [];
    try {
      if (navigator.languages && navigator.languages.length) {
        for (var i = 0; i < navigator.languages.length; i++) langs.push(navigator.languages[i]);
      }
      if (navigator.language) langs.push(navigator.language);
      if (navigator.userLanguage) langs.push(navigator.userLanguage);
    } catch (e) {}
    for (var j = 0; j < langs.length; j++) {
      if (/^zh\b/i.test(String(langs[j] || ''))) return true;
    }
    return false;
  }

  // Remember explicit choice when user clicks the language switch
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document && !(t.getAttribute && t.getAttribute('data-asia-lang-set'))) t = t.parentNode;
    if (!t || t === document) return;
    var v = t.getAttribute('data-asia-lang-set');
    if (v === 'en' || v === 'zh') save(v);
  }, true);

  void page; void enUrl; void zhUrl; void isZhBrowser;
})();
