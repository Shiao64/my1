/* 2026-11-24 Shiao: Google sign-in on ATM (the subscribe panel and the Going / Interested dialog), for people outside mainland China.
   Shown only where Google's script loads (it does not in mainland China) and not in app built-in browsers
   (WeChat, KakaoTalk, LINE...), where Google refuses sign-in. The backend checks Google's ID token:
   POST /social/going/google -> { session }. The same sign-in as on the BSTW registration page.
   ATM_GOOGLE.mount(box, { done(session), fail(code) }) draws Google's button in box (.atm-g-btn inside it);
   box stays hidden when Google can't be used. The last mounted box gets the sign-in. */
(function () {
  var R = document.documentElement;
  var zh = /^zh/i.test(R.getAttribute('data-asia-lang') || (document.body && document.body.getAttribute('data-lang')) || R.lang || '') || location.pathname.indexOf('/zh/') === 0;
  var ui = zh ? 'zh_CN' : (/^(ko|es|ru)/i.exec(R.getAttribute('data-asia-lang') || R.lang || '') || ['en'])[0].toLowerCase(); // Google button language
  var INAPP = /MicroMessenger|WeChat|wxwork|QQ\/|MQQBrowser|Weibo|DingTalk|AlipayClient|Lark|Feishu|KAKAOTALK|NAVER\(inapp|Line\/|FBAN|FBAV|FB_IAB|Instagram|Twitter|Snapchat|TikTok|musical_ly|Bytedance|Telegram|Zalo|; wv\)/i;
  function apiBase() {
    var host = location.hostname;
    if (host === 'tangoweekend.org' || host === 'www.tangoweekend.org') return 'https://api.tangoweekend.org';
    try {
      var q = new URLSearchParams(location.search).get('api');
      if (q) {
        var u = new URL(q), h = u.hostname;
        if ((u.protocol === 'http:' && (h === 'localhost' || h === '127.0.0.1')) || (u.protocol === 'https:' && (h.endsWith('.workers.dev') || h.endsWith('.pages.dev') || h === 'api.tangoweekend.org'))) return u.origin;
      }
    } catch (e) {}
    return window.TANGO_SUB_API || 'https://api.tangoweekend.org';
  }
  var API = apiBase();
  var css = document.createElement('style');
  css.textContent = '.atm-g-btn{display:flex;justify-content:center;min-height:44px}' +
    '.atm-g-note{font-size:.82rem;line-height:1.5;opacity:.75;text-align:center;margin:6px 0 0}' +
    '.atm-g-or{display:flex;align-items:center;gap:10px;font-size:.82rem;opacity:.7;margin:12px 0 10px}' +
    '.atm-g-or::before,.atm-g-or::after{content:"";flex:1;border-top:1px solid currentColor;opacity:.35}' +
    '.atm-g-err{color:#b42318;font-size:.85rem;text-align:center;margin:6px 0 0}';
  document.head.appendChild(css);
  var ready = null, active = null;
  function load() {
    if (ready) return ready;
    ready = new Promise(function (res) {
      if (INAPP.test(navigator.userAgent || '')) { res(false); return; }
      fetch(API + '/social/going/config').then(function (r) { return r.json(); }).then(function (d) {
        var cid = d && d.google || '';
        if (!cid) { res(false); return; }
        var go = function () {
          try { window.google.accounts.id.initialize({ client_id: cid, callback: onCred, ux_mode: 'popup', auto_select: false }); res(true); }
          catch (e) { res(false); }
        };
        if (window.google && window.google.accounts && window.google.accounts.id) go();
        else { var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = go; s.onerror = function () { res(false); }; document.head.appendChild(s); }
      }).catch(function () { res(false); });
    });
    return ready;
  }
  function onCred(r) {
    var h = active;
    if (!h || !r || !r.credential) return;
    fetch(API + '/social/going/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: r.credential, lang: zh ? 'zh' : 'en' }) })
      .then(function (x) { return x.json(); })
      .then(function (d) {
        if (d && d.ok && /^[0-9a-f]{64}$/.test(d.session || '')) {
          try { localStorage.setItem('atm_session', d.session); } catch (e) {}
          if (h.done) h.done(d.session);
        } else if (h.fail) h.fail(d && d.error || 'google_bad');
      })
      .catch(function () { if (h.fail) h.fail('net'); });
  }
  function mount(box, h) {
    if (!box) return;
    box.hidden = true;
    load().then(function (ok) {
      if (!ok || !box.isConnected) return;
      var slot = box.querySelector('.atm-g-btn');
      if (!slot) return;
      active = h;
      box.hidden = false;
      slot.innerHTML = '';
      var w = Math.max(200, Math.min(400, Math.round(slot.getBoundingClientRect().width) || 300));
      try { window.google.accounts.id.renderButton(slot, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'center', width: w, locale: ui }); }
      catch (e) { box.hidden = true; }
    });
  }
  window.ATM_GOOGLE = { mount: mount, load: load };
})();
