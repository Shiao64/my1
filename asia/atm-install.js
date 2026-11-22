/* 2026-11-22 (Shiao): 放到桌面 / Add to Home Screen. Menu item + ?install=1 link; never opens by itself otherwise.
   Four guides: in-app browser, iOS, Android one-tap (beforeinstallprompt), other Android.
   No claim of success: most browsers do not tell the page whether the icon was added.
   iOS keeps Home Screen storage apart from Safari. Plain stars are local only; /social/going/mine brings back only 要参加／感兴趣. */
(function () {
  var zh = /^zh/i.test(document.documentElement.lang || ''), UA = navigator.userAgent || '';
  var standalone = navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  var wanted = /[?&]install=1(&|$)/.test(location.search);
  if (standalone) return;
  var android = /Android|HarmonyOS|OpenHarmony/i.test(UA);
  var ios = !android && (/iP(hone|ad|od)/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1));
  var browserApp = /HeyTapBrowser|OppoBrowser|VivoBrowser|HuaweiBrowser|HonorBrowser|MiuiBrowser|UCBrowser|Quark/i.test(UA);   /* some of these also say "; wv)" */
  var inApp = /MicroMessenger|\sQQ\/|Weibo|FBAN|FBAV|Instagram|KAKAOTALK|\sLine\/|AlipayClient|DingTalk|xiaohongshu|discover\/|aweme|baiduboxapp/i.test(UA) || (!browserApp && /; wv\)/.test(UA));
  var prompt = null, box = null, last = null;
  if (android) addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); prompt = e; if (box && !inApp) show(); });
  if (!ios && !android && !wanted) return;

  var T = zh ? {
    item: '放到桌面', title: '把 ATM 放到手机桌面', close: '关闭', copy: '复制网址', copied: '已复制',
    app: ['点右上角「…」（有的 App 是分享按钮）', '选「在浏览器打开」或「在 Safari 中打开」', '打开后会接着显示安装步骤'],
    appNote: '找不到的话，复制网址，粘贴到手机自带浏览器里打开。',
    ios: ['点浏览器的「分享」{share}<small>没看到？先点网址旁边的「…」</small>', '把分享菜单往上滑<small>有「查看更多」就先点它</small>', '点「添加到主屏幕」{plus}<small>没有？滑到最底点「编辑操作」，把它加进来</small>', '点右上角「添加」'],
    iosNote: '桌面版和浏览器的记录是分开的：装好后请在桌面版重新登录。登录能带回「要参加／感兴趣」；只按星星的收藏和收藏的团体，需要重新收藏。',
    one: '安装到桌面', oneNote: '点下面按钮，再在系统窗口里确认。',
    other: ['点浏览器菜单（☰ 或 ⋮）', '找「添加到桌面」或「添加到主屏幕」<small>也可能在「添加书签」「添加到」「工具箱」里</small>', '确认添加'],
    otherNote: '桌面没出现图标？在手机设置里允许浏览器「创建桌面快捷方式」，再试一次。菜单里找不到，就复制网址，换手机自带浏览器、Edge 或 Chrome。',
    desk: ['请用手机打开这个网址']
  } : {
    item: 'Add to Home Screen', title: 'Add ATM to your Home Screen', close: 'Close', copy: 'Copy link', copied: 'Copied',
    app: ['Tap … at the top right (or the share button)', 'Choose Open in browser or Open in Safari', 'The steps will continue there'],
    appNote: 'If you can’t find it, copy the link and paste it into your phone’s browser.',
    ios: ['Tap Share {share}<small>Not there? Tap … next to the address first</small>', 'Scroll the share menu up<small>Tap View More if you see it</small>', 'Tap Add to Home Screen {plus}<small>Missing? Tap Edit Actions at the bottom to add it</small>', 'Tap Add at the top right'],
    iosNote: 'The Home Screen app keeps its own data, so sign in again there. Signing in restores Going / Interested. Events you only starred, and saved groups, need to be saved again.',
    one: 'Install', oneNote: 'Tap the button below, then confirm.',
    other: ['Open the browser menu (☰ or ⋮)', 'Find Add to Home screen<small>It may be under Add bookmark, Add to, or Tools</small>', 'Confirm'],
    otherNote: 'No icon? Allow your browser to create home screen shortcuts in phone settings, then retry. If the option is missing, copy the link and use Edge, Chrome or your phone’s own browser.',
    desk: ['Open this link on your phone']
  };
  var ICON = { share: 'M12 15V3M7 8l5-5 5 5M5 13v7h14v-7', plus: 'M4 4h16v16H4zM12 8v8M8 12h8', phone: 'M7 2h10v20H7zM11 18h2' };
  function svg(k, cls) { return '<svg class="' + (cls || 'atm-ins-i') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[k] + '"/></svg>'; }

  function url() {
    var q = new URLSearchParams(), g = (document.documentElement.getAttribute('data-asia-lang') || '').slice(0, 2), p = new URLSearchParams(location.search).get('lang');
    q.set('install', '1'); q.set('lang', zh ? 'zh' : (/^(ko|es|ru)$/.test(p || g) ? (p || g) : 'en'));
    return location.origin + (zh ? '/zh/asia/' : '/asia/') + '?' + q;
  }
  function setParam(on) {
    try {
      var u = new URL(location.href);
      if (on) { u.searchParams.set('install', '1'); u.searchParams.set('lang', new URL(url()).searchParams.get('lang')); } else u.searchParams.delete('install');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  var css = document.createElement('style');
  css.textContent = '#atm-ins{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,51,58,.55)}' +
    '#atm-ins .p{box-sizing:border-box;width:100%;max-width:480px;max-height:88%;overflow:auto;background:#fbf5e9;color:#0A4F57;border-radius:18px 18px 0 0;padding:8px 20px calc(20px + env(safe-area-inset-bottom,0px));font:16px/1.5 var(--sans)}' +
    '#atm-ins .h{display:flex;align-items:center;gap:8px}#atm-ins h2{flex:1;margin:0;font:700 19px/1.3 var(--serif);color:#0A4F57}' +
    '#atm-ins .x{width:44px;height:44px;margin:0 -10px 0 0;padding:0;border:0;background:none;color:#4A6B70;font:28px/1 sans-serif}' +
    '#atm-ins ol{margin:8px 0;padding-left:24px}#atm-ins li{padding:5px 0}#atm-ins small{display:block;color:#4A6B70;font-size:13px}' +
    '#atm-ins .n{margin:8px 0 12px;padding:10px 12px;background:#EFE6D3;border-radius:10px;font-size:13px;color:#4A6B70}' +
    '#atm-ins .b{display:block;width:100%;min-height:46px;margin-top:8px;border:1px solid #0e6e78;border-radius:10px;background:#fff;color:#0e6e78;font:600 16px var(--sans)}' +
    '#atm-ins .go{background:#0e6e78;color:#fff}#atm-ins input{box-sizing:border-box;width:100%;margin-top:8px;font-size:16px;padding:8px}' +
    '.atm-ins-i{display:inline-block;width:19px;height:19px;vertical-align:-3px;margin-left:4px;fill:none;stroke:#0e6e78;stroke-width:2}';
  document.head.appendChild(css);

  function mode() { return inApp ? 'app' : ios ? 'ios' : !android ? 'desk' : prompt ? 'one' : 'other'; }
  function show() {
    var k = mode();
    if (!box) {
      last = document.activeElement;
      box = document.createElement('div'); box.id = 'atm-ins';
      box.addEventListener('click', click); document.body.appendChild(box);
      setParam(true);
    }
    var steps = (T[k] instanceof Array) ? '<ol>' + T[k].map(function (s) { return '<li>' + s.replace('{share}', svg('share')).replace('{plus}', svg('plus')) + '</li>'; }).join('') + '</ol>' : '';
    box.innerHTML = '<div class="p" role="dialog" aria-modal="true" aria-labelledby="atm-ins-t" data-mode="' + k + '"><div class="h"><h2 id="atm-ins-t">' + T.title + '</h2><button type="button" class="x" data-ins="x" aria-label="' + T.close + '">×</button></div>' + steps +
      (T[k + 'Note'] ? '<p class="n">' + T[k + 'Note'] + '</p>' : '') +
      (k === 'one' ? '<button type="button" class="b go" data-ins="go">' + T.one + '</button>' : '') +
      '<button type="button" class="b" data-ins="copy">' + T.copy + '</button></div>';
    box.querySelector('.x').focus({ preventScroll: true });
  }
  function hide() {
    if (!box) return;
    box.remove(); box = null; setParam(false);
    if (last && last.isConnected && last.focus) last.focus({ preventScroll: true });
  }
  function copy(btn) {
    var v = url();
    function manual() {
      var i = box && (box.querySelector('input') || btn.parentNode.appendChild(document.createElement('input')));
      if (!i) return;
      i.readOnly = true; i.value = v; i.focus(); i.select(); i.setSelectionRange(0, v.length);
      try { if (document.execCommand('copy')) btn.textContent = T.copied; } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(function () { btn.textContent = T.copied; }, manual);
    else manual();
  }
  function click(e) {
    if (e.target === box) return hide();
    var b = e.target.closest('[data-ins]'); if (!b) return;
    var a = b.getAttribute('data-ins');
    if (a === 'x') return hide();
    if (a === 'copy') return copy(b);
    var p = prompt; prompt = null;   /* a prompt can be used once */
    if (!p) return show();
    Promise.resolve(p.prompt()).then(function () { return p.userChoice; }).then(function (r) { if (r && r.outcome === 'accepted') hide(); else if (box) show(); }, function () { if (box) show(); });
  }
  addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  addEventListener('appinstalled', hide);

  var after = document.querySelector('#atm-menu [data-a="mine"]');
  if (after && (ios || android)) {
    var item = document.createElement('button');
    item.type = 'button'; item.className = 'atm-mi'; item.id = 'atm-ins-open';
    item.innerHTML = svg('phone', 'atm-ic') + '<span>' + T.item + '</span>';
    item.addEventListener('click', function () { if (window.ATM_MENU) window.ATM_MENU.close(); show(); });
    after.parentNode.insertBefore(item, after.nextSibling);
  }
  if (wanted) {
    /* the beta notice makes the rest of the page inert: wait for its button */
    var n = document.getElementById('atm-notice');
    if (n && !n.hidden) {
      var mo = new MutationObserver(function () { if (n.hidden) { mo.disconnect(); show(); } });
      mo.observe(n, { attributes: true, attributeFilter: ['hidden'] });
    } else show();
  }
})();
