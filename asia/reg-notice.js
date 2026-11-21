/* Registration reminder bar (Beijing Select Tango Weekend 2027).
   For a signed-in subscriber who registered: when the status changes (confirmed → please pay, paid → entry QR, …)
   show one small bar at the top of the map. ✕ hides it until the status changes again. No call without a session.
   Once paid: tapping the ATM logo opens "My entry pass" full screen (one QR per person, swipe between them). */
(function () {
  var API = 'https://api.tangoweekend.org';
  try { var qa = new URLSearchParams(location.search).get('api'); if (qa && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(qa)) API = qa; } catch (e) {}   // local test only
  var PAGE = '/event/beijing-2027-tango-weekend/register/draft/';   // 12/1: change to /register/ when the form moves there
  var tok = ''; try { tok = localStorage.getItem('atm_session') || ''; } catch (e) {}
  if (!/^[0-9a-f]{64}$/.test(tok)) return;
  var D = document, zh = (D.documentElement.getAttribute('data-asia-lang') || D.documentElement.lang || '').indexOf('zh') === 0;
  var T = zh ? {
    confirmed: '🎉 北京精选探戈周末：你的报名 C 已确认，请在 D 前付款 A', soon: '⏰ 北京精选探戈周末：报名 C 的付款期限 D 快到了（A）',
    paid: '✓ 北京精选探戈周末：已收到报名 C 的付款，入场二维码在这里', cash: '北京精选探戈周末：报名 C 请到场付现 A，入场二维码在这里',
    waitlist: '北京精选探戈周末：报名 C 目前在候补名单上', declined: '北京精选探戈周末：报名 C 的审核结果',
    go: '查看', close: '关闭' } : {
    confirmed: '🎉 Beijing Select Tango Weekend: registration C is confirmed. Please pay A by D', soon: '⏰ Beijing Select Tango Weekend: payment for C (A) is due D',
    paid: '✓ Beijing Select Tango Weekend: payment for C received. Your entry QR codes are here', cash: 'Beijing Select Tango Weekend: C, pay A in cash at the event. Entry QR codes here',
    waitlist: 'Beijing Select Tango Weekend: registration C is on the waiting list', declined: 'Beijing Select Tango Weekend: result for registration C',
    go: 'View', close: 'Close' };
  function seen() { try { return localStorage.getItem('bstw_seen') || ''; } catch (e) { return ''; } }
  fetch(API + '/social/reg/me?event=bj2027&lang=' + (zh ? 'zh' : 'en'), { headers: { Authorization: 'Bearer ' + tok } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var r = d && d.reg; if (!r) return;
      if (r.passes && r.passes.length) logoPass(r);
      if (!T[r.status]) return;
      var kind = r.status, left = r.due ? (Date.parse(r.due) - Date.now()) / 864e5 : 99;
      if (kind === 'confirmed' && left <= 3) kind = 'soon';
      var key = r.code + ':' + kind; if (seen() === key) return;
      var date = r.due ? new Date(r.due).toLocaleDateString(zh ? 'zh-CN' : 'en', { month: 'short', day: 'numeric' }) : '';
      var text = T[kind].replace('C', r.code).replace('A', '¥' + Number(r.amount || 0).toLocaleString('en-US')).replace('D', date);
      var bar = D.createElement('div');
      bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;max-width:640px;margin:0 auto;display:flex;align-items:center;gap:10px;' +
        'background:#4a0609;color:#f6e3b4;border:1px solid #e8c06a;border-radius:12px;padding:10px 12px;font:14px/1.4 system-ui,-apple-system,"PingFang SC",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)';
      var a = D.createElement('a'); a.href = PAGE + '?lang=' + (zh ? 'zh' : 'en'); a.style.cssText = 'flex:1;color:#f6e3b4;text-decoration:none';
      a.textContent = text + ' › ';
      var go = D.createElement('b'); go.textContent = T.go; go.style.color = '#e8c06a'; a.appendChild(go);
      var x = D.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', T.close); x.textContent = '✕';
      x.style.cssText = 'background:none;border:0;color:#e8c06a;font-size:18px;cursor:pointer;padding:0 4px';
      function hide() { try { localStorage.setItem('bstw_seen', key); } catch (e) {} bar.remove(); }
      x.addEventListener('click', hide); a.addEventListener('click', function () { try { localStorage.setItem('bstw_seen', key); } catch (e) {} });
      bar.append(a, x); D.body.appendChild(bar);
    }).catch(function () {});

  // ---------- tap the ATM logo → my entry pass ----------
  function logoPass(r) {
    var logo = D.querySelector('.china-sticky-top img.atm-sign') || D.querySelector('img.atm-sign'); if (!logo) return;
    var wrap = logo.parentNode; if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    var tag = D.createElement('span'); tag.textContent = '🎫'; tag.setAttribute('aria-hidden', 'true');
    tag.style.cssText = 'position:absolute;right:-6px;top:-6px;font-size:14px;line-height:1;background:#fff;border-radius:50%;padding:2px;box-shadow:0 1px 4px rgba(0,0,0,.3);pointer-events:none';
    wrap.appendChild(tag);
    logo.setAttribute('title', zh ? '我的入场码' : 'My entry pass');
    // Capture phase: the logo is inside the header link and title tap handler; only the pass opens.
    logo.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(r); }, true);
  }
  var lock = null;
  function open(r) {
    if (D.getElementById('atm-pass')) return;
    var ov = D.createElement('div'); ov.id = 'atm-pass'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#fff;color:#2a1a14;display:flex;flex-direction:column;font:15px/1.4 system-ui,-apple-system,"PingFang SC",sans-serif';
    var top = D.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:max(12px,env(safe-area-inset-top)) 16px 10px;background:#4a0609;color:#f6e3b4';
    var h = D.createElement('b'); h.textContent = (zh ? '我的入场码 · 北京精选探戈周末' : 'My entry pass · Beijing Select Tango Weekend');
    var x = D.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', T.close);
    x.style.cssText = 'background:none;border:0;color:#e8c06a;font-size:22px;padding:0 4px;cursor:pointer';
    top.append(h, x);
    var row = D.createElement('div');
    row.style.cssText = 'flex:1;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch';
    r.passes.forEach(function (p, i) {
      var c = D.createElement('div');
      c.style.cssText = 'flex:0 0 100%;scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';
      var im = D.createElement('img'); im.src = p.img; im.alt = 'QR';
      im.style.cssText = 'width:min(82vw,62vh,380px);height:auto;aspect-ratio:1;image-rendering:pixelated;background:#fff';
      var n = D.createElement('div'); n.textContent = p.name; n.style.cssText = 'font-size:22px;font-weight:800;margin-top:14px';
      var cd = D.createElement('div'); cd.textContent = p.pass.split('.')[0] + (r.passes.length > 1 ? '  ·  ' + (i + 1) + ' / ' + r.passes.length : '');
      cd.style.cssText = 'color:#7a6255;margin-top:4px';
      // Name above, code below, so the QR itself sits in the middle of the screen.
      n.style.margin = '0 0 12px'; cd.style.margin = '10px 0 0';
      c.append(n, im, cd); row.appendChild(c);
    });
    var foot = D.createElement('div');
    foot.style.cssText = 'padding:10px 16px max(14px,env(safe-area-inset-bottom));text-align:center;color:#7a6255;font-size:13px';
    foot.textContent = (r.passes.length > 1 ? (zh ? '左右滑动看同行者的码 · ' : 'Swipe for your companions · ') : '') +
      (zh ? '入场时出示，请把屏幕调亮' : 'Show it at the door. Turn up your screen brightness.');
    if (r.status === 'cash') foot.textContent += (zh ? ' · 请到场付现 ¥' : ' · Pay in cash at the event: ¥') + Number(r.amount || 0).toLocaleString('en-US');
    ov.append(top, row, foot); D.body.appendChild(ov);
    var oldOverflow = D.documentElement.style.overflow; D.documentElement.style.overflow = 'hidden';
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); } catch (e) {}
    function close() { ov.remove(); D.documentElement.style.overflow = oldOverflow; try { if (lock) lock.release(); } catch (e) {} lock = null; D.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    x.addEventListener('click', close); D.addEventListener('keydown', esc);
  }
})();
