/* Asia Tango Map language preference.
   The URL decides the language. /ko/... Korean, /zh/... Chinese, /asia/ English.
   No redirect here (browser language / Korea IP / saved choice only apply on /, see /index.html).
   Explicit switch click saves localStorage asiaMapLang = 'en' | 'zh' | 'ko' (used by / next time). */
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
    if (v === 'en' || v === 'zh' || v === 'ko') save(v);
  }, true);

  void page; void enUrl; void zhUrl; void isZhBrowser;
})();
