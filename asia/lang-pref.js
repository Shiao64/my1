/* Asia Tango Map language preference + auto-detect.
   localStorage asiaMapLang = 'en' | 'zh'
   Any zh* browser locale (incl. zh-TW/zh-HK/zh-Hant) → Simplified Chinese page.
   Explicit switch click saves preference and wins over auto-detect. */
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

  var pref = saved();
  if (page === 'en') {
    if (pref === 'zh' || (!pref && isZhBrowser())) {
      location.replace(zhUrl);
      return;
    }
  } else if (page === 'zh') {
    if (pref === 'en') {
      location.replace(enUrl);
      return;
    }
  }
})();
