/* Select Tango Weekend · language switch (English default / 中文)
   - English for everyone by default (no browser auto-detect)
   - ?lang=en / ?lang=zh in the URL, or a saved choice (localStorage), override it
   - Elements tagged data-l="en" / data-l="zh" are shown for that language only (see css/style.css)
   - <title data-en data-zh>, <meta name=description data-en data-zh>, [data-alt-en/zh], [data-aria-en/zh] are swapped */
(function(){
  var KEY = 'stw-lang', root = document.documentElement;
  function valid(l){ return l === 'en' || l === 'zh'; }
  function current(){ return root.getAttribute('data-lang') === 'zh' ? 'zh' : 'en'; }
  function apply(lang, save){
    if (!valid(lang)) lang = 'en';
    root.setAttribute('data-lang', lang);
    root.lang = lang === 'zh' ? 'zh-CN' : 'en';
    if (save) { try { localStorage.setItem(KEY, lang); } catch(e){} }
    var t = document.querySelector('title');
    if (t && t.getAttribute('data-' + lang)) document.title = t.getAttribute('data-' + lang);
    var md = document.querySelector('meta[name="description"]');
    if (md && md.getAttribute('data-' + lang)) md.setAttribute('content', md.getAttribute('data-' + lang));
    document.querySelectorAll('[data-alt-' + lang + ']').forEach(function(el){ el.alt = el.getAttribute('data-alt-' + lang); });
    document.querySelectorAll('[data-aria-' + lang + ']').forEach(function(el){ el.setAttribute('aria-label', el.getAttribute('data-aria-' + lang)); });
    // gallery thumbnails take their alt text from the link's caption
    document.querySelectorAll('a[data-cap-' + lang + '] img').forEach(function(img){ img.alt = img.parentNode.getAttribute('data-cap-' + lang); });
    document.querySelectorAll('[data-set-lang]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === lang); });
    // keep an explicit ?lang= in the address bar in sync
    try {
      var u = new URL(location.href);
      if (u.searchParams.has('lang')) { u.searchParams.set('lang', lang); history.replaceState(null, '', u); }
    } catch(e){}
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }
  window.STW_LANG = current;
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-set-lang]');
    if (b) { e.preventDefault(); apply(b.getAttribute('data-set-lang'), true); }
  });
  apply(current(), false);
})();
