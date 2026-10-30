/* draft 2026-10-30: header hamburger menu (footer removed). Holds 资料来源 (moved .china-disclaimer), 联系我们, 订阅, 提交活动, 语言. Only existing content. */
(function () {
  var zh = /^zh/i.test(document.documentElement.lang || '');
  var L = zh ? { menu: '菜单', close: '关闭', src: '资料来源', contact: '联系我们', sub: '订阅更新', add: '提交活动', langL: '中文 / English', lang: 'English', site: '亚洲探戈地图' }
             : { menu: 'Menu', close: 'Close', src: 'Sources', contact: 'Contact', sub: 'Subscribe', add: 'Submit event', langL: 'Language', lang: '中文', site: 'Asia Tango Map' };
  var css = document.createElement('style');
  css.textContent = 'html body footer#contact,html body #contact{display:none!important}' +
    '.atm-burger{width:44px;height:44px;margin:0 0 0 4px;padding:0;border:0;background:transparent;color:#F6D58E;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;position:relative;z-index:5}' +
    '.atm-burger svg{width:24px;height:24px}.atm-burger:focus-visible{outline:2px solid #F6D58E;border-radius:8px}' +
    '#atm-menu[hidden]{display:none!important}#atm-menu{position:fixed;inset:0;z-index:2000}' +
    '#atm-menu .atm-mbg{position:absolute;inset:0;background:rgba(6,51,58,.55)}' +
    '#atm-menu .atm-mp{position:absolute;top:0;right:0;bottom:0;width:80vw;max-width:360px;background:#fbf5e9;box-shadow:-8px 0 30px rgba(0,0,0,.25);overflow-y:auto;padding:4px 18px 24px;box-sizing:border-box;color:#2a1a14}' +
    '#atm-menu .atm-mx{float:right;width:44px;height:44px;border:0;background:transparent;font-size:28px;line-height:1;color:#7a6255;cursor:pointer;margin:-4px -10px 0 0}' +
    '#atm-menu .atm-mi{display:flex;align-items:center;width:100%;min-height:48px;padding:0 4px;border:0;border-bottom:1px solid #ead9b8;background:transparent;font:inherit;font-size:1rem;font-weight:700;color:#0a4f57;text-align:left;text-decoration:none;cursor:pointer;box-sizing:border-box}' +
    '#atm-menu .atm-mi small{margin-left:auto;font-weight:400;color:#6B6390;font-size:.85rem}' +
    '#atm-menu .atm-mhd{display:flex;align-items:center;justify-content:space-between;min-height:48px;border-bottom:1px solid #ead9b8;font-size:.85rem;font-weight:700;color:#6B6390;padding-left:4px}#atm-menu .atm-mhd .atm-mx{float:none;margin:0 -10px 0 0}' +
    '#atm-menu .atm-ic{width:20px;height:20px;flex:0 0 20px;margin-right:12px;fill:none;stroke:#0e6e78;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    'html body #atm-menu details.atm-msrcd{border:0!important;background:none!important;padding:0!important;margin:0!important;box-shadow:none!important;border-radius:0!important}html body #atm-menu details.atm-msrcd>summary{padding:0 4px!important;margin:0!important;border:0!important;border-bottom:1px solid #ead9b8!important;background:none!important;font-size:1rem!important;color:#0a4f57!important}html body #atm-menu details.atm-msrcd>summary:before,html body #atm-menu details.atm-msrcd>summary:after{content:none!important;display:none!important}' +
    '#atm-menu summary.atm-mi{list-style:none}#atm-menu summary.atm-mi::-webkit-details-marker{display:none}#atm-menu details[open] .atm-car{transform:rotate(180deg)}#atm-menu .atm-msrc{padding:10px 4px 4px 36px}' +
    '@media (min-width:768px){#atm-menu .atm-mbg{background:transparent}#atm-menu .atm-mp{top:calc(var(--atm-hh,74px) - 8px);right:max(12px,calc((100vw - 1100px)/2));bottom:auto;width:360px;max-height:calc(100vh - 90px);border-radius:14px;border:1px solid #ead9b8;box-shadow:0 12px 36px rgba(6,51,58,.28);padding:4px 16px 12px}}' +
    '#atm-menu h3{margin:18px 4px 6px;font-size:.95rem;color:#0a4f57}#atm-menu .china-disclaimer{margin:0 4px;font-size:.85rem!important;line-height:1.55;color:#2a1a14}#atm-menu .china-disclaimer a{color:#0e6e78}' +
    'html body.china-page nav.top-lang.china-map-lang{overflow:visible!important;border-radius:0!important;min-height:44px!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;display:inline-flex!important;align-items:center}' +
    'html body.china-page nav.top-lang.china-map-lang a[aria-current]{display:none!important}' +
    'html body.china-page nav.top-lang.china-map-lang a.atm-langbtn,.atm-burger{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:#F6D58E!important;font-size:13px!important;font-weight:700!important;line-height:1!important;letter-spacing:.02em;text-decoration:none!important;display:inline-flex!important;align-items:center;justify-content:center;position:relative;border-radius:0!important}' +
    'html body.china-page nav.top-lang.china-map-lang a.atm-langbtn:before,html body .atm-burger:before{content:"";position:absolute!important;inset:4px!important;top:4px!important;bottom:4px!important;left:4px!important;right:4px!important;width:auto!important;height:auto!important;transform:none!important;display:block!important;border:1.5px solid rgba(246,213,142,.75);border-radius:10px;background:rgba(0,0,0,.12);pointer-events:none}' +
    'html body.china-page nav.top-lang.china-map-lang a.atm-langbtn:after{display:none!important}.atm-burger svg{position:relative;width:20px!important;height:20px!important}' +
    'html.atm-sug-on #china-suggest-modal:not([hidden]){display:flex!important}';
  document.head.appendChild(css);
  var nav = document.querySelector('nav.top-lang'); if (!nav) return;
  var other = nav.querySelector('a:not([aria-current])');
  if (other) { other.classList.add('atm-langbtn'); other.setAttribute('aria-label', zh ? 'English' : '中文'); other.title = zh ? 'English' : '中文'; other.textContent = zh ? 'ENG' : '中'; }
  var b = document.createElement('button'); b.type = 'button'; b.className = 'atm-burger'; b.setAttribute('aria-label', L.menu); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  nav.parentNode.insertBefore(b, nav.nextSibling);
  var m = document.createElement('div'); m.id = 'atm-menu'; m.hidden = true;
  function ic(p) { return '<svg class="atm-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + p + '"/></svg>'; }
  var I = { lang: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18', add: 'M12 5v14M5 12h14', sub: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20h4', mail: 'M3 6h18v12H3zM3 6l9 7 9-7', src: 'M4 5h7v14H4zM13 5h7v14h-7z' };
  m.innerHTML = '<div class="atm-mbg" data-x></div><div class="atm-mp" role="dialog" aria-modal="true" aria-label="' + L.menu + '"><div class="atm-mhd"><span>' + L.site + '</span><button type="button" class="atm-mx" data-x aria-label="' + L.close + '">&times;</button></div>' +
    (other ? '<a class="atm-mi atm-mlang" href="' + other.getAttribute('href') + '" hreflang="' + (other.getAttribute('hreflang') || '') + '" data-asia-lang-set="' + (other.getAttribute('data-asia-lang-set') || '') + '">' + ic(I.lang) + L.langL + '<small>' + L.lang + '</small></a>' : '') +
    '<button type="button" class="atm-mi" data-a="add">' + ic(I.add) + L.add + '</button>' +
    '<button type="button" class="atm-mi" data-a="sub">' + ic(I.sub) + L.sub + '</button>' +
    '<a class="atm-mi" href="mailto:info@tangoweekend.org">' + ic(I.mail) + L.contact + '<small>info@tangoweekend.org</small></a>' +
    '<details class="atm-msrcd"><summary class="atm-mi">' + ic(I.src) + L.src + '<small class="atm-car">\u25BE</small></summary><div class="atm-msrc"></div></details></div>';
  document.body.appendChild(m);
  var d = document.querySelector('.china-disclaimer');
  if (d) { d.innerHTML = d.innerHTML.replace(/\b([a-z0-9-]+\.(?:com|jp|tw|kr|wordpress\.com))\b/g, function (x) { return '<a href="https://' + x + '" target="_blank" rel="noopener">' + x + '</a>'; }).replace(/<a href="https:\/\/([a-z0-9-]+)\.<a[^>]*>wordpress\.com<\/a>/g, '<a href="https://$1.wordpress.com'); m.querySelector('.atm-msrc').appendChild(d); }
  var last = null;
  function open() { last = document.activeElement; m.hidden = false; b.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden'; m.querySelector('.atm-mx').focus(); }
  function close() { if (m.hidden) return; m.hidden = true; b.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; if (last && last.focus) last.focus(); }
  b.addEventListener('click', open);
  m.addEventListener('click', function (e) {
    if (e.target.closest('[data-x]')) return close();
    var a = e.target.closest('[data-a]'); if (!a) return;
    close();
    if (a.dataset.a === 'sub') { var t = document.getElementById('tsub-open'); if (t) t.click(); }
    else { document.documentElement.classList.add('atm-sug-on'); var s = document.getElementById('china-suggest-open'); if (s) s.click(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.ATM_MENU = { open: open, close: close };
})();
