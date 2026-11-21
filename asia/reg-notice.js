/* Registration reminder bar (Beijing Select Tango Weekend 2027).
   For a signed-in subscriber who registered: when the status changes (confirmed → please pay, paid → entry QR, …)
   show one small bar at the top of the map. ✕ hides it until the status changes again. No call without a session. */
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
      var r = d && d.reg; if (!r || !T[r.status]) return;
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
})();
