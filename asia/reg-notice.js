/* Registration reminder bar (Beijing Select Tango Weekend 2027).
   For a signed-in subscriber who registered: when the status changes (confirmed → please pay, paid → entry QR, …)
   show one small bar at the top of the map. ✕ hides it until the status changes again; while payment is due it folds to one line instead. No call without a session.
   Once paid: tapping the ATM logo opens "My entry pass" full screen (one QR per person, swipe between them). */
(function () {
  var API = 'https://api.tangoweekend.org';
  try { var qa = new URLSearchParams(location.search).get('api'); if (qa && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(qa)) API = qa; } catch (e) {}   // local test only
  var PAGE = '/event/beijing-2027-tango-weekend/register/';   // the form since 12/1 (draft/ forwards here)
  var tok = ''; try { tok = localStorage.getItem('atm_session') || ''; } catch (e) {}
  if (!/^[0-9a-f]{64}$/.test(tok)) return;
  var D = document, zh = (D.documentElement.getAttribute('data-asia-lang') || D.documentElement.lang || '').indexOf('zh') === 0;
  var T = zh ? {
    confirmed: '🎉 北京精选探戈周末：你的报名 C 已确认，请在 D 前付款 A', soon: '⏰ 北京精选探戈周末：报名 C 的付款期限 D 快到了（A）',
    paid: '✓ 北京精选探戈周末：已收到报名 C 的付款，入场二维码在这里', cash: '北京精选探戈周末：报名 C 请到场付款 A，入场二维码在这里',
    waitlist: '北京精选探戈周末：报名 C 目前在候补名单上', declined: '北京精选探戈周末：报名 C 的审核结果',
    go: '查看', close: '关闭', payH: '💳 你的付款码已准备好', soonH: '⏰ 付款期限快到了', waitH: '🎉 报名已确认', passH: '🎫 你的入场码已准备好',
    ev: '北京精选探戈周末', payL: '请在 D 前付款 A', waitL: '付款码稍后提供', paidL: '已收到付款，建议先截图保存', cashL: '到场请先出示二维码给现场经理，付款 A',
    payB: '查看付款码', passB: '查看入场码', mini: '💳 待付款 A · D 前', miniB: '付款码' } : {
    confirmed: '🎉 Beijing Select Tango Weekend: registration C is confirmed. Please pay A by D', soon: '⏰ Beijing Select Tango Weekend: payment for C (A) is due D',
    paid: '✓ Beijing Select Tango Weekend: payment for C received. Your entry QR codes are here', cash: 'Beijing Select Tango Weekend: C, pay A when you arrive. Entry QR codes here',
    waitlist: 'Beijing Select Tango Weekend: registration C is on the waiting list', declined: 'Beijing Select Tango Weekend: result for registration C',
    go: 'View', close: 'Close', payH: '💳 Your payment QR code is ready', soonH: '⏰ Payment is due soon', waitH: '🎉 Registration confirmed', passH: '🎫 Your entry QR code is ready',
    ev: 'Beijing Select Tango Weekend', payL: 'Please pay A by D', waitL: 'The payment QR code will follow', paidL: 'Payment received. Take a screenshot to keep', cashL: 'On arrival, show your QR to an event manager and pay A',
    payB: 'View payment QR', passB: 'View entry QR', mini: '💳 Pay A by D', miniB: 'QR code' };
  function seen() { try { return localStorage.getItem('bstw_seen') || ''; } catch (e) { return ''; } }
  fetch(API + '/social/reg/me?event=bstw2027&lang=' + (zh ? 'zh' : 'en'), { headers: { Authorization: 'Bearer ' + tok } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var r = d && d.reg; if (!r) return;
      // The logo pass only on a day the person (or a companion) has an event; the registration page and the
      // payment email always keep the QR as a backup.
      if (r.passes && r.passes.length && r.passes.some(function (p) { return (p.items || []).some(function (c) { return SCHED[c] && SCHED[c][0] === bjToday(); }); })) logoPass(r);
      if (!T[r.status]) return;
      var kind = r.status, left = r.due ? (Date.parse(r.due) - Date.now()) / 864e5 : 99;
      var unpaid = kind === 'confirmed', hasQr = !!(r.pay && r.pay.length), hasPass = kind === 'paid' || kind === 'cash';
      if (unpaid) kind = left <= 3 ? (hasQr ? 'soon' : 'soon_noqr') : (hasQr ? 'confirmed' : 'confirmed_noqr');
      var key = r.code + ':' + kind + ':2', folded = seen() === key;
      if (folded && !(unpaid && hasQr)) return;   // only an unpaid registration with a QR keeps a one-line reminder
      var date = r.due ? new Date(r.due).toLocaleDateString(zh ? 'zh-CN' : 'en', { month: 'short', day: 'numeric', timeZone: 'Asia/Shanghai' }) : '';
      var fill = function (s) { return s.replace(/\b[ACD]\b/g, function (m) { return m === 'A' ? '¥' + Number((r.rest == null ? r.amount : r.rest) || 0).toLocaleString('en-US') : m === 'C' ? r.code : date; }); };
      var href = PAGE + '?lang=' + (zh ? 'zh' : 'en') + (unpaid ? '#pay' : hasPass ? '#passes' : '');
      var el = function (tag, text, css) { var e = D.createElement(tag); e.textContent = text; if (css) e.style.cssText = css; return e; };
      var keep = function () { try { localStorage.setItem('bstw_seen', key); } catch (e) {} };
      // The one-line reminder sits in the page flow, so it never covers the header or the logo.
      function slim() {
        var s = D.createElement('a'); s.id = 'atm-reg-slim'; s.href = href; s.setAttribute('role', 'status');
        s.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;box-sizing:border-box;width:100%;min-height:40px;padding:8px 14px;background:#4a0609;color:#f6e3b4;text-decoration:none;font:14px/1.4 system-ui,-apple-system,"PingFang SC",sans-serif';
        s.append(el('span', fill(T.mini)), el('b', T.miniB + ' ›', 'color:#e8c06a;white-space:nowrap'));
        D.body.insertBefore(s, D.body.firstChild);
      }
      if (folded) { slim(); return; }
      var bar = D.createElement('div'); bar.id = 'atm-reg-bar';
      bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;max-width:640px;margin:0 auto;display:flex;align-items:center;gap:10px;' +
        'background:#4a0609;color:#f6e3b4;border:1px solid #e8c06a;border-radius:12px;padding:10px 12px;font:14px/1.5 system-ui,-apple-system,"PingFang SC",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)';
      var a = D.createElement('a'); a.href = href; a.style.cssText = 'flex:1;min-width:0;color:#f6e3b4;text-decoration:none';
      if (unpaid || hasPass) {
        var head = hasPass ? T.passH : left <= 3 ? T.soonH : hasQr ? T.payH : T.waitH;
        a.append(el('b', head, 'display:block;font-size:16px'), el('span', T.ev + ' · ' + r.code, 'display:block'),
          el('span', fill(hasPass ? (kind === 'cash' ? T.cashL : T.paidL) : T.payL), 'display:block'));
        if (unpaid && !hasQr) a.append(el('span', T.waitL, 'display:block'));
        a.append(el('b', hasPass ? T.passB : hasQr ? T.payB : T.go, 'display:inline-block;margin-top:8px;padding:6px 18px;border-radius:999px;background:#e8c06a;color:#4a0609'));
      } else a.append(el('span', fill(T[kind]) + ' › '), el('b', T.go, 'color:#e8c06a'));
      var x = D.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', T.close); x.textContent = '✕';
      x.style.cssText = 'background:none;border:0;color:#e8c06a;font-size:18px;cursor:pointer;min-width:36px;min-height:44px;padding:0 4px';
      x.addEventListener('click', function () { keep(); bar.remove(); if (unpaid && hasQr) slim(); });
      a.addEventListener('click', keep);
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
  // Words under the QR: always Chinese, plus the language chosen when registering.
  var CAP = {"zh": {"pass": "入场码：请出示给前台，每人一个", "cash": "到场付款：请出示此二维码给现场经理，付款后才能入场"}, "en": {"pass": "Entry code: show it at the front desk, one per person", "cash": "Pay on arrival: show this QR code to an event manager. Entry is possible after payment"}, "ko": {"pass": "입장 코드: 안내 데스크에 보여 주세요. 1인당 하나입니다", "cash": "현장 결제: 이 QR 코드를 행사 매니저에게 보여 주세요. 결제 후 입장할 수 있습니다"}, "es": {"pass": "Código de entrada: muéstralo en recepción, uno por persona", "cash": "Pago al llegar: muestra este código QR al responsable del evento. Podrás entrar después de pagar"}, "ru": {"pass": "Входной код: покажите на стойке, один на человека", "cash": "Оплата на месте: покажите этот QR-код менеджеру мероприятия. Вход возможен после оплаты"}};
  // Event schedule (Beijing time). One pass covers every event the person chose; the door picks the event.
  var SCHED = { MV: ['2027-06-18', '20:00', '周五 欢迎舞会', 'Fri Welcome Milonga'], T1: ['2027-06-18', '09:00', '周五 一日游', 'Fri Day Tour'],
    M1: ['2027-06-19', '14:00', '周六 下午场', 'Sat afternoon milonga'], M2: ['2027-06-19', '20:00', '周六 晚场', 'Sat night milonga'],
    M3: ['2027-06-20', '14:00', '周日 下午场', 'Sun afternoon milonga'], M4: ['2027-06-20', '20:00', '周日 晚场', 'Sun night milonga'],
    S1: ['2027-06-21', '16:00', '周一 探戈小院', 'Mon Tango Courtyard'], T2: ['2027-06-22', '09:00', '周二 城市漫步', 'Tue City Walk'],
    MF: ['2027-06-22', '21:00', '周二 告别舞会', 'Tue Farewell Milonga'] };
  function bjToday() { return new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10); }
  function scheduleLine(items) {
    var list = (items || []).filter(function (c) { return SCHED[c]; }).sort(function (a, b) { return (SCHED[a][0] + SCHED[a][1]).localeCompare(SCHED[b][0] + SCHED[b][1]); });
    if (!list.length) return '';
    var today = bjToday(), todays = list.filter(function (c) { return SCHED[c][0] === today; });
    var name = function (c) { return (zh ? SCHED[c][2] : SCHED[c][3]) + ' ' + SCHED[c][1]; };
    if (todays.length) return (zh ? '今天：' : 'Today: ') + todays.map(name).join(' · ');
    return zh ? '今天没有报名的场次' : 'Nothing booked for today';
  }
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
    row.style.cssText = 'flex:1;min-height:0;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch';
    r.passes.forEach(function (p, i) {
      var c = D.createElement('div');
      c.style.cssText = 'flex:0 0 100%;scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;min-height:0;overflow-y:auto';
      if (window.innerHeight < 700) c.style.justifyContent = 'flex-start';
      var im = D.createElement('img'); im.src = p.img; im.alt = 'QR';
      im.style.cssText = 'flex-shrink:0;width:min(82vw,42vh,380px);height:auto;aspect-ratio:1;image-rendering:pixelated;background:#fff';
      var n = D.createElement('div'); n.textContent = p.name; n.style.cssText = 'font-size:22px;font-weight:800;margin-top:14px';
      var cd = D.createElement('div'); cd.textContent = p.pass.split('.')[0] + (r.passes.length > 1 ? '  ·  ' + (i + 1) + ' / ' + r.passes.length : '');
      cd.style.cssText = 'color:#7a6255;margin-top:4px';
      // Name above, code and events below, so the QR itself sits in the middle of the screen.
      n.style.margin = '0 0 12px'; cd.style.margin = '10px 0 0';
      var ev = D.createElement('div'); ev.textContent = scheduleLine(p.items);
      ev.style.cssText = 'margin-top:10px;max-width:420px;text-align:center;font-weight:700;color:#7a0a10;font-size:15px;line-height:1.5';
      var words = D.createElement('div'), k = r.status === 'cash' ? 'cash' : 'pass', rl = CAP[r.lang] ? r.lang : (zh ? 'zh' : 'en');
      words.className = 'atm-pass-words'; words.style.cssText = 'margin-top:10px;max-width:360px;text-align:center;font-size:14px;line-height:1.4';
      [CAP.zh[k]].concat(rl === 'zh' ? [] : [CAP[rl][k]]).forEach(function (s, j) { var w = D.createElement('div'); w.textContent = s; w.style.cssText = j ? 'margin-top:4px;padding-top:4px;border-top:1px solid #ead9b8' : 'font-weight:700'; words.appendChild(w); });
      if (window.innerHeight < 700) { c.style.padding = '8px 16px'; im.style.width = 'min(72vw,30vh)'; words.style.fontSize = '12.5px'; }
      c.append(n, im, cd, ev, words); row.appendChild(c);
    });
    var foot = D.createElement('div');
    foot.style.cssText = 'padding:10px 16px max(14px,env(safe-area-inset-bottom));text-align:center;color:#7a6255;font-size:13px';
    foot.textContent = (r.passes.length > 1 ? (zh ? '左右滑动看同行者的码 · ' : 'Swipe for your companions · ') : '') +
      (zh ? '入场时出示，请把屏幕调亮' : 'Show it at the door. Turn up your screen brightness.');
    if (r.status === 'cash') foot.textContent += (zh ? ' · 请到场付款 ¥' : ' · Pay on arrival: ¥') + Number((r.rest == null ? r.amount : r.rest) || 0).toLocaleString('en-US');
    ov.append(top, row, foot); D.body.appendChild(ov);
    var oldOverflow = D.documentElement.style.overflow; D.documentElement.style.overflow = 'hidden';
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); } catch (e) {}
    function close() { ov.remove(); D.documentElement.style.overflow = oldOverflow; try { if (lock) lock.release(); } catch (e) {} lock = null; D.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    x.addEventListener('click', close); D.addEventListener('keydown', esc);
  }
})();
