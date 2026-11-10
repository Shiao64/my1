/* draft 2026-10-30: header hamburger menu (footer removed). Holds 分享/复制链接/刷新 (moved from ··· 10/31), 资料来源 (moved .china-disclaimer), 联系我们, 订阅, 提交活动, 语言. Only existing content. */
(function () {
  var zh = /^zh/i.test(document.documentElement.lang || '');
  var L = zh ? { menu: '菜单', close: '关闭', src: '资料来源', contact: '联系', emailUs: '发邮件给我们', sub: '订阅', mine: '我的资料', add: '提交活动', share: '分享', copy: '复制链接', reload: '刷新', site: '亚洲探戈地图', gAct: '活动', gMine: '我的', gAbout: '关于' }
             : { menu: 'Menu', close: 'Close', src: 'Sources', contact: 'Contact', emailUs: 'Email us', sub: 'Subscribe', mine: 'My profile', add: 'Submit event', share: 'Share', copy: 'Copy link', reload: 'Refresh', site: 'Asia Tango Map', gAct: 'Events', gMine: 'My ATM', gAbout: 'About' };
  var css = document.createElement('style');
  css.textContent = 'html body footer#contact,html body #contact{display:none!important}' +
    '.atm-burger{width:44px;height:44px;margin:0 0 0 4px;padding:0;border:0;background:transparent;color:#F2CF7F;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;position:relative;z-index:5}' +
    '.atm-burger svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.atm-burger:focus-visible{outline:2px solid #F2CF7F;border-radius:8px}' +
    '#atm-menu[hidden]{display:none!important}#atm-menu{position:fixed;inset:0;z-index:2000}' +
    '#atm-menu .atm-mbg{position:absolute;inset:0;background:rgba(6,51,58,.55)}' +
    '#atm-menu .atm-mp{position:absolute;top:0;right:0;bottom:0;width:80vw;max-width:316px;background:#fbf5e9;box-shadow:-8px 0 24px rgba(6,51,58,.25);overflow-y:auto;padding:0;box-sizing:border-box;color:#4A6B70;display:flex;flex-direction:column}' +
    '#atm-menu .atm-mhd{display:flex;align-items:center;height:56px;padding:0 4px 0 20px;border-bottom:1px solid #EADFC8;flex:0 0 auto}' +
    '#atm-menu .atm-mhd b{flex:1;font-family:var(--serif);font-size:18px;line-height:24px;font-weight:700;color:#0A4F57}' +
    '#atm-menu .atm-mx{width:44px;height:44px;border:0;background:transparent;color:#4A6B70;cursor:pointer;padding:0;display:grid;place-items:center;margin:0}' +
    '#atm-menu .atm-mx svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}' +
    '#atm-menu .atm-seg{margin:14px 20px 6px;display:flex;background:#EFE6D3;border-radius:10px;padding:3px}' +
    '#atm-menu .atm-seg a,#atm-menu .atm-seg span{flex:1;text-align:center;height:34px;line-height:34px;font-size:14px;font-weight:600;color:#4A6B70;border-radius:8px;text-decoration:none;display:block}' +
    '#atm-menu .atm-seg .on{background:#fff;color:#0A4F57;box-shadow:0 1px 2px rgba(0,0,0,.08)}' +
    '#atm-menu .atm-mg{padding:16px 20px 0;font-size:12px;line-height:16px;font-weight:600;color:#4A6B70;letter-spacing:.04em}' +
    '#atm-menu .atm-mi{display:flex;align-items:center;gap:14px;width:100%;height:52px;min-height:52px;padding:0 20px;border:0;border-bottom:1px solid #EADFC8;background:transparent;font:inherit;font-size:16px;line-height:22px;font-weight:500;color:#0A4F57;text-align:left;text-decoration:none;cursor:pointer;box-sizing:border-box}' +
    '#atm-menu .atm-mi small{margin-left:auto;font-weight:400;color:#4A6B70;font-size:13px}' +
    '#atm-menu .atm-ic{width:20px;height:20px;flex:0 0 20px;margin:0;fill:none;stroke:#0e6e78;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    'html body #atm-menu details.atm-msrcd{border:0!important;background:none!important;padding:0!important;margin:0!important;box-shadow:none!important;border-radius:0!important}html body #atm-menu details.atm-msrcd>summary{padding:0 20px!important;margin:0!important;border:0!important;border-bottom:1px solid #EADFC8!important;background:none!important;font-size:16px!important;font-weight:500!important;color:#0a4f57!important;height:52px;display:flex;align-items:center}html body #atm-menu details.atm-msrcd>summary:before,html body #atm-menu details.atm-msrcd>summary:after{content:none!important;display:none!important}' +
    '#atm-menu summary.atm-mi{list-style:none}#atm-menu summary.atm-mi::-webkit-details-marker{display:none}#atm-menu details[open] .atm-car{transform:rotate(180deg)}#atm-menu .atm-msrc{padding:10px 20px 16px 54px}' +
    '@media (min-width:768px){#atm-menu .atm-mbg{background:transparent}#atm-menu .atm-mp{top:calc(var(--atm-hh,56px) - 8px);right:max(12px,calc((100vw - 1100px)/2));bottom:auto;width:360px;max-height:calc(100vh - 90px);border-radius:14px;border:1px solid #EADFC8;box-shadow:0 12px 36px rgba(6,51,58,.28)}}' +
    '#atm-menu h3{margin:18px 4px 6px;font-size:.95rem;color:#0a4f57}#atm-menu .china-disclaimer{margin:0;font-size:12px!important;font-weight:400;line-height:18px;color:#4A6B70!important;overflow-wrap:anywhere}#atm-menu .china-disclaimer a{color:#0E6E78}' +
    '#atm-menu #site-ver{margin:16px 20px 24px auto;padding:0;text-align:left;font:400 12px/18px var(--sans)!important;color:#4A6B70!important;letter-spacing:0!important}#atm-menu #site-ver:before,#atm-menu #site-ver:after{display:none!important}#atm-menu #site-ver b{font-weight:400;color:#4A6B70}#atm-menu #site-ver a{color:#0A4F57;text-decoration:underline;text-underline-offset:2px}' +
    'html body.china-page nav.top-lang.china-map-lang{overflow:visible!important;border-radius:0!important;min-height:44px!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;display:inline-flex!important;align-items:center}' +
    'html body.china-page nav.top-lang.china-map-lang a[aria-current]{display:none!important}' +
    'html body.china-page nav.top-lang.china-map-lang a.atm-langbtn,.atm-burger{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:#F2CF7F!important;font-size:13px!important;font-weight:600!important;line-height:1!important;letter-spacing:.02em;text-decoration:none!important;display:inline-flex!important;align-items:center;justify-content:center;position:relative;border-radius:0!important}' +
    'html body.china-page nav.top-lang.china-map-lang a.atm-langbtn:before,html body .atm-burger:before{content:"";position:absolute!important;inset:4px!important;top:4px!important;bottom:4px!important;left:4px!important;right:4px!important;width:auto!important;height:auto!important;transform:none!important;display:block!important;border:1.5px solid rgba(242,207,127,.45);border-radius:10px;background:transparent;pointer-events:none}' +
    'html body.china-page nav.top-lang.china-map-lang a.atm-langbtn:after{display:none!important}.atm-burger svg{position:relative;width:22px!important;height:22px!important}' +
    'html.atm-h-inner .atm-burger,html.atm-h-inner nav.top-lang a.atm-langbtn{color:#0E6E78!important}' +
    'html.atm-h-inner nav.top-lang a.atm-langbtn:before,html.atm-h-inner .atm-burger:before{border-color:rgba(14,110,120,.45)!important}' +
    'html.atm-sug-on #china-suggest-modal:not([hidden]){display:flex!important}';
  document.head.appendChild(css);
  var nav = document.querySelector('nav.top-lang'); if (!nav) return;
  var other = nav.querySelector('a:not([aria-current])');
  if (other) { other.classList.add('atm-langbtn'); other.setAttribute('aria-label', zh ? 'English' : '中文'); other.title = zh ? 'English' : '中文'; other.textContent = zh ? 'EN' : '中文'; }
  var b = document.createElement('button'); b.type = 'button'; b.className = 'atm-burger'; b.setAttribute('aria-label', L.menu); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  nav.parentNode.insertBefore(b, nav.nextSibling);
  var m = document.createElement('div'); m.id = 'atm-menu'; m.hidden = true;
  function ic(p) { return '<svg class="atm-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + p + '"/></svg>'; }
  var I = { add: 'M12 5v14M5 12h14', sub: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0', mail: 'M3 5h18v14H3zM3 7l9 6 9-6', src: 'M4 5h6a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-6a2 2 0 00-2 2v12a2 2 0 012-2h6z', share: 'M12 15V3M7 8l5-5 5 5M5 13v7h14v-7', copy: 'M8 8h12v12H8zM4 16V4h12', reload: 'M20 12a8 8 0 11-3-6.2M20 4v5h-5', mine: 'M12 8a4 4 0 110 0.01M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6' };
  var href = other ? (other.getAttribute('href') || '') : '';
  var hl = other ? (other.getAttribute('hreflang') || '') : '';
  var set = other ? (other.getAttribute('data-asia-lang-set') || '') : '';
  var seg = '<div class="atm-seg" role="group" aria-label="Language">' +
    (zh ? '<span class="on">中文</span><a href="' + href + '" hreflang="' + hl + '" data-asia-lang-set="' + set + '" lang="en">English</a>'
        : '<a href="' + href + '" hreflang="' + hl + '" data-asia-lang-set="' + set + '" lang="zh-CN">中文</a><span class="on">English</span>') +
    '</div>';
  m.innerHTML = '<div class="atm-mbg" data-x></div><div class="atm-mp" role="dialog" aria-modal="true" aria-label="' + L.menu + '"><div class="atm-mhd"><b>' + L.site + '</b><button type="button" class="atm-mx" data-x aria-label="' + L.close + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    (other ? seg : '') +
    '<div class="atm-mg">' + L.gAct + '</div>' +
    '<button type="button" class="atm-mi" data-a="add">' + ic(I.add) + L.add + '</button>' +
    '<button type="button" class="atm-mi" data-a="sub" aria-label="' + L.sub + '">' + ic(I.sub) + L.sub + '</button>' +
    '<div class="atm-mg">' + L.gMine + '</div>' +
    '<button type="button" class="atm-mi" data-a="mine" aria-label="' + L.mine + '">' + ic(I.mine) + L.mine + '</button>' +
    '<button type="button" class="atm-mi" data-a="wx-s">' + ic(I.share) + L.share + '</button>' +
    '<button type="button" class="atm-mi" data-a="wx-c">' + ic(I.copy) + L.copy + '</button>' +
    '<button type="button" class="atm-mi" data-a="wx-r">' + ic(I.reload) + L.reload + '</button>' +
    '<div class="atm-mg">' + L.gAbout + '</div>' +
    '<button type="button" class="atm-mi" data-a="mail">' + ic(I.mail) + L.emailUs + '</button>' +
    '<details class="atm-msrcd"><summary class="atm-mi">' + ic(I.src) + L.src + '</summary><div class="atm-msrc"></div></details></div>';
  document.body.appendChild(m);
  var d = document.querySelector('.china-disclaimer');
  if (d) { d.innerHTML = d.innerHTML.replace(/\b([a-z0-9-]+\.(?:com|jp|tw|kr|wordpress\.com))\b/g, function (x) { return '<a href="https://' + x + '" target="_blank" rel="noopener">' + x + '</a>'; }).replace(/<a href="https:\/\/([a-z0-9-]+)\.<a[^>]*>wordpress\.com<\/a>/g, '<a href="https://$1.wordpress.com'); m.querySelector('.atm-msrc').appendChild(d); }
  var last = null;
  function sessionOn() { try { return /^[0-9a-f]{64}$/.test(localStorage.getItem('atm_session') || ''); } catch (e) { return false; } }
  function paintSub() {
    var btn = m.querySelector('[data-a="sub"]'); if (!btn) return;
    btn.setAttribute('aria-label', L.sub);
    btn.innerHTML = ic(I.sub) + L.sub;
  }
  function open() { paintSub(); last = document.activeElement; m.hidden = false; b.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden'; m.querySelector('.atm-mx').focus(); }
  function close() { if (m.hidden) return; m.hidden = true; b.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; if (last && last.focus) last.focus(); }
  b.addEventListener('click', open);
  function mailHref(query) {
    var local = ['in', 'fo'].join('');
    var host = ['tango', 'weekend', '.', 'org'].join('');
    return 'mailto:' + local + String.fromCharCode(64) + host + (query || '');
  }
  function openMail(query) { location.href = mailHref(query); }
  function openSub() { var t = document.getElementById('tsub-open'); if (t) t.click(); }
  m.addEventListener('click', function (e) {
    if (e.target.closest('[data-x]')) return close();
    var a = e.target.closest('[data-a]'); if (!a) return;
    close();
    if (a.dataset.a.indexOf('wx-') === 0) { if (window.atmWxAct) window.atmWxAct(a.dataset.a.slice(3)); }
    else if (a.dataset.a === 'sub' || a.dataset.a === 'mine') { openSub(); }
    else if (a.dataset.a === 'mail') { openMail(); }
    else { document.documentElement.classList.add('atm-sug-on'); var s = document.getElementById('china-suggest-open'); if (s) s.click(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  paintSub();
  window.ATM_MENU = { open: open, close: close, paintSub: paintSub };
})();
