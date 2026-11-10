/* Star intent. Replaces the local heart as the way to say Going or Interested.
   The star stays disabled only when neither the card nor the linked organizer
   record has a usable email. A visitor without a session can still open it. The public
   Going+Interested total stays on the server and is not drawn on the card. */
(function () {
  var R = document.documentElement;
  var zh = /^zh/i.test(R.getAttribute('data-asia-lang') || document.body.getAttribute('data-lang') || R.lang || '') || location.pathname.indexOf('/zh/') === 0;
  var API = (window.ATM_SOCIAL_API || window.TANGO_SUB_API || 'https://api.tangoweekend.org');
  var STAR = 'M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1 6.8 18.6l1-5.8L3.6 8.7l5.8-.8z';
  var L = zh ? {
    grey: '组织者尚未提供邮箱',
    checking: '正在确认组织者邮箱',
    tsWait: '请先完成人机验证，再点确认。',
    tsChallenge: '验证暂时没有完成，请稍等后重试。',
    tsExpired: '验证已过期，请等它重新完成后再试。',
    tsTimeout: '验证超时，请再试一次。',
    tsVerify: '验证没有被接受，请等它重新完成后再试。',
    net: '网络异常，请再试一次。',
    again: '这次没有提交成功，请再试一次。',
    title: '活动意向',
    explain: '不是购票或正式报名。',
    going: '要参加', interested: '感兴趣', absent: '去不了',
    promo: '加入 ATM 全站订阅',
    needName: '请填写姓名。', needEmail: '请填写邮箱。', needCity: '请填写城市。', needRole: '请选择角色：引带（Leader）、跟随（follower）或两者皆可（both）。',
    later: '请稍后再试。',
    limited: '确认邮件已达上限，请稍后再试。',
    withheld: '已记下。这一场不会交给主办。',
    unfav: '取消收藏',
    notify: '接收主办方信息',
    scope: '',
    transport: '交通指引（可选）',
    noPromise: '',
    optin: '勾选后，可接收早鸟报名及截止时间、场地交通指引、临时通知和主办方消息。',
    submit: '确认', needIntent: '请选择要参加、感兴趣或去不了。',
    profileTitle: '',
    profileDesc: '先确认邮箱。回到本页后再点「确认」，才会记录意向。',
    req: '以下均为必填',
    name: '姓名', email: '邮箱', city: '城市', role: '角色',
    rl: '引带（Leader）', rf: '跟随（follower）', rb: '两者皆可（both）', rolePh: '请选择',
    once: '同一设备验证通过后，再选 Going／Interested 无需重复验证。',
    verifyBtn: '确认', pending: '确认邮件已发出，请查收。点开邮件里的确认后，再回到这里点「确认」。',
    sentHold: '已发送邮件，请到邮箱确认',
    resendHint: '请先检查垃圾邮件；1 分钟后可重发一次',
    resendWait: '{n} 秒后可重发',
    resendUsed: '已重发过，请查收或稍后再试。',
    resend: '重新发送验证邮件',
    ready: '邮箱已确认。再点「确认」才会记录意向。',
    saved: '邮箱已验证，资料已保存。可到活动五角星选择 Going／Interested。',
    savedNotify: '✓ 已保存，主办方会收到通知',
    savedShort: '✓ 已保存',
    noRsvp: '暂不支持在线登记，请联系主办方',
    sent: '✓ 已保存，主办方会收到通知',
    unchanged: '✓ 已保存，主办方会收到通知',
    fail: '意向已保存；通知邮件发送失败，请稍后重试。',
    queued: '✓ 已保存，主办方会收到通知',
    fill: '请补全城市与角色等信息后继续。无需再次验证同一邮箱。',
    bar: '我的活动意向', manage: '管理意向', cancel: '取消意向',
    cancelAsk: '取消意向？这不会再发邮件给组织者，也不会撤回已经发出的信。',
    cancelled: '已取消意向。没有新的邮件发给组织者。',
    emailKept: '邮箱已确认',
    unsub: '退订本活动更新（不会取消你的 Going／Interested）',
    date: '参加日期（北京时间 UTC+8）', close: '关闭',
    hint: '点五角星选择 Going 或 Interested。验证邮箱后，意向会显示在这里，并可在其他设备恢复。',
    empty: '还没有活动意向。',
    notTicket: 'Going 不是购票或正式报名。'
  } : {
    grey: 'Organizer email not available yet',
    checking: 'Checking organizer email',
    tsWait: 'Finish the human check, then tap Confirm.',
    tsChallenge: 'The check did not finish. Wait a moment and try again.',
    tsExpired: 'The check expired. Wait until it finishes, then try again.',
    tsTimeout: 'The check timed out. Please try again.',
    tsVerify: 'The check was not accepted. Wait until it finishes, then try again.',
    net: 'Network error. Please try again.',
    again: 'This did not go through. Please try again.',
    title: 'Event intent',
    explain: 'Not a ticket or a formal registration.',
    going: 'Going', interested: 'Interested', absent: 'Not Going',
    promo: 'Join ATM site-wide subscription',
    needName: 'Please enter your name.', needEmail: 'Please enter your email.', needCity: 'Please enter your city.', needRole: 'Please choose Leader, follower, or both.',
    later: 'Please try again later.',
    limited: 'Too many confirmation emails. Please try again later.',
    withheld: 'Saved. This one is not sent to the organizer.',
    unfav: 'Remove from favorites',
    notify: 'Receive organizer updates',
    scope: '',
    transport: 'Directions (optional)',
    noPromise: '',
    optin: 'Get early-bird deadlines, directions and updates from the organizer.',
    submit: 'Confirm', needIntent: 'Choose Going, Interested, or Not Going.',
    profileTitle: '',
    profileDesc: 'Confirm your email first. After you come back, tap Confirm to save your intent.',
    req: 'All fields are required',
    name: 'Name', email: 'Email', city: 'City', role: 'Role',
    rl: 'Leader', rf: 'follower', rb: 'both', rolePh: 'Choose',
    once: 'After one verification on this device, you won’t need to verify again to choose Going or Interested.',
    verifyBtn: 'Confirm', pending: 'Confirmation email sent. Open it, then come back and tap Confirm.',
    sentHold: 'Email sent — please confirm in your inbox',
    resendHint: 'Check your spam folder first. You can resend once after 1 minute.',
    resendWait: 'Resend in {n}s',
    resendUsed: 'Already resent. Please check your inbox, or try again later.',
    resend: 'Resend verification email',
    ready: 'Email confirmed. Tap Confirm to save your intent.',
    saved: 'Email verified. Profile saved. Use the star on an event to choose Going or Interested.',
    savedNotify: '✓ Saved. The organizer will be notified.',
    savedShort: '✓ Saved.',
    noRsvp: 'RSVP unavailable. Please contact the organizer.',
    sent: '✓ Saved. The organizer will be notified.',
    unchanged: '✓ Saved. The organizer will be notified.',
    fail: 'Intent saved; notification failed to send. Please try again later.',
    queued: '✓ Saved. The organizer will be notified.',
    fill: 'Please complete city, role, and any missing fields. No need to re-verify the same email.',
    bar: 'My event intents', manage: 'Manage intent', cancel: 'Cancel intent',
    cancelAsk: 'Cancel this intent? We will not email the organizer again, and mail already sent is not recalled.',
    cancelled: 'Intent cancelled. No new email was sent to the organizer.',
    emailKept: 'Email confirmed',
    unsub: 'Unsubscribe from this event’s updates (keeps your Going / Interested)',
    date: 'Date (Beijing time, UTC+8)', close: 'Close',
    hint: 'Tap the star to choose Going or Interested. After you verify your email, intents show here and restore on your other devices.',
    empty: 'No event intents yet.',
    notTicket: 'Going is not a ticket or a formal registration.'
  };
  var css = document.createElement('style');
  css.textContent = '.atm-heart svg path{d:path("' + STAR + '")}.atm-heart path{fill:none;stroke:#b8913a;stroke-width:1.6;stroke-linejoin:round}.atm-heart[aria-pressed="true"] path{fill:#b8913a;stroke:#b8913a}' +
    '.atm-heart.atm-star-off{opacity:1;cursor:pointer}.atm-heart.atm-star-off path{stroke:#b8913a;stroke-width:1.15;fill:none;opacity:.25}' +
    '.atm-heart.atm-star-wait{cursor:pointer;background:transparent}.atm-heart.atm-star-wait path{stroke:#0e6e78;fill:none;stroke-dasharray:2.2 1.4}' +
    'html.atm-p10 #atm-c1bar .p10-heart.atm-star-off{cursor:pointer!important;background:transparent!important;opacity:1!important}html.atm-p10 #atm-c1bar .p10-heart.atm-star-off path{fill:none!important;stroke:#b8913a!important;stroke-width:1.15!important;opacity:.25!important}' +
    'html.atm-p10 #atm-c1bar .p10-heart.atm-star-wait{cursor:pointer!important}html.atm-p10 #atm-c1bar .p10-heart.atm-star-wait path{fill:none!important;stroke:#0e6e78!important;stroke-dasharray:2.2 1.4}' +
    '#atm-star{position:fixed;inset:0;z-index:3000;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,51,58,.55)}#atm-star[hidden]{display:none}' +
    '#atm-star .asg{position:relative;background:#fffdf8;width:100%;max-width:480px;max-height:92dvh;overflow:hidden;display:flex;flex-direction:column;border-radius:16px 16px 0 0;padding:16px 16px 22px;box-sizing:border-box;color:#2a1a14}' +
    '@media(min-width:700px){#atm-star{align-items:center}#atm-star .asg{border-radius:16px;max-height:88vh}}' +
    '#atm-star h2{font:700 1.05rem Georgia,serif;color:#0a4f57;margin:0 52px 6px 0;flex:none}#atm-star .asg-body{overflow:auto;min-height:0}#atm-star p{margin:4px 0;line-height:1.4;font-size:.88rem}' +
    '#atm-star .asg-note{color:#5b5148}#atm-star .asg-req{font-size:.78rem;font-weight:700;color:#0a4f57;margin:8px 0 0}#atm-star .asg-dis{font-size:.78rem;color:#5b5148}' +
    '#atm-star .asg-grid{display:flex;flex-wrap:wrap;gap:0 8px}#atm-star .asg-grid .asg-f{flex:1 1 140px;min-width:0}#atm-star .asg{overflow-x:hidden}' +
    '#atm-star label.asg-l{display:block;font-weight:700;color:#0a4f57;margin:10px 0 4px;font-size:.84rem}' +
    '#atm-star input,#atm-star select{width:100%;box-sizing:border-box;min-height:44px;font-size:16px;padding:8px 10px;border:1px solid #ead9b8;border-radius:8px}' +
    '#atm-star .asg-opt{display:flex;gap:6px;margin:8px 0;padding:4px;background:#f3ece0;border-radius:14px}#atm-star .asg-opt button{flex:1;min-height:48px;border:0;background:transparent;color:#0a4f57;border-radius:12px;font-weight:700;font-size:.92rem;padding:4px}' +
    '#atm-star select:disabled,#atm-star input:disabled{opacity:.55;background:#f3ece0}' +
    '.atm-unfav{min-height:44px;margin:6px 0 0;padding:0 12px;border:1px solid #ead9b8;border-radius:999px;background:#fff;color:#2a1a14;font-weight:700}' +
    '#atm-star .asg-opt button[aria-pressed="true"]{background:#0e6e78;color:#f6e3b4}' +
    '#atm-star .asg-go{min-height:48px;font-weight:700;border:0;width:100%;margin-top:10px;background:#0e6e78;color:#f6e3b4;border-radius:12px}#atm-star .asg-go[aria-busy="true"],#atm-star .asg-go:disabled{opacity:.72}' +
    '#atm-star .asg-hint{margin:10px 2px 0;color:#6b5d52;font-size:.8rem;line-height:1.45}' +
    '#atm-star .asg-tslab{margin:10px 0 4px;color:#0a4f57;font-size:.84rem;font-weight:700}' +
    '#atm-star .asg-ts{min-height:65px;margin:0 0 4px}' +
    '#atm-star .asg-x{position:absolute;top:6px;right:6px;z-index:2;width:44px;height:44px;border:0;border-radius:8px;background:transparent;font-size:28px;line-height:44px;padding:0;color:#7a6255;cursor:pointer}' +
    '#atm-star .asg-x:focus-visible{outline:2px solid #0e6e78;outline-offset:2px}' +
    '#atm-star .asg-err{color:#b5654a;min-height:1.2em}#atm-star .asg-ok{color:#0a4f57;font-weight:700}#atm-star .asg-check{display:flex;gap:8px;align-items:flex-start;margin:8px 0;font-size:.88rem}#atm-star .asg-check input{width:auto;min-height:0;margin-top:3px}#atm-star [hidden]{display:none!important}' +
    '.atm-savebar{box-sizing:border-box;display:block;width:100%;margin:0 0 8px;padding:8px 12px;border-radius:8px;font:600 13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC","Helvetica Neue",sans-serif;text-align:left;pointer-events:none;-webkit-tap-highlight-color:transparent}' +
    '.atm-savebar-ok{background:#e5f4ee;color:#1b7a46}.atm-savebar-off,.atm-savebar-note{background:#f4efe6;color:#6a5e52}' +
    '.atm-savebar-fixed{position:fixed;z-index:80;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));width:auto;top:var(--atm-save-top,calc(env(safe-area-inset-top,0px) + 8px));margin:0}' +
    '.atm-favbar b{color:#0a4f57}';
  document.head.appendChild(css);

  var mine = {}, occ = {}, favs = {}, drafts = {}, me = null, ready = false, eventsP = null, reach = {}, reachWait = {}, reachTries = {}, reachNext = {}, reachTimer = 0, reachWaiters = {}, reopen = '';
  var REACH_MAX = 3;
  function token() { try { return localStorage.getItem('atm_session') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem('atm_session', t); } catch (e) {} }
  function takeSession() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
    var s = q ? (q.get('s') || '') : '';
    if (/^[0-9a-f]{64}$/.test(s)) {
      setToken(s);
      q.delete('s');
      var next = location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash;
      try { history.replaceState(history.state, '', next); } catch (e2) {}
      return;
    }
    if (token()) return;
    var m = (document.cookie || '').match(/(?:^|; )atm_session=([0-9a-f]{64})/);
    if (m) setToken(m[1]);
  }
  function ctxGet() { try { return JSON.parse(localStorage.getItem('atm_star_ctx') || 'null'); } catch (e) { return null; } }
  function ctxSet(o) { try { localStorage.setItem('atm_star_ctx', JSON.stringify(o)); } catch (e) {} }
  function dev() { var k = 'atm_dev_id', v = ''; try { v = localStorage.getItem(k) || ''; if (!/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); localStorage.setItem(k, v); } } catch (e) { v = 'going-device-web1'; } return v; }
  function api(path, body) {
    var h = { 'Content-Type': 'application/json' }; var t = token(); if (t) h.Authorization = 'Bearer ' + t;
    return fetch(API + path, { method: body ? 'POST' : 'GET', credentials: body ? 'include' : 'same-origin', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); });
  }
  function eventLists() { return [window._chinaData, window._atmMore, window._atmFull, window._atmStarEvents]; }
  function eventOf(id) {
    var ls = eventLists();
    for (var i = 0; i < ls.length; i++) { var list = ls[i]; if (!list) continue; for (var j = 0; j < list.length; j++) if (list[j] && String(list[j].id) === id) return list[j]; }
    return null;
  }
  function hasEmail(e) { var c = e && e.contacts; var raw = c && !Array.isArray(c) ? String(c.email || '').trim() : ''; return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw); }
  function canIntent(e, id) { if (e && hasEmail(e)) return true; if (reach[id] === true) return true; if (reach[id] === false) return false; return null; }
  function scheduleReach(ms) {
    if (reachTimer) return;
    reachTimer = setTimeout(function () { reachTimer = 0; queueReach(); }, ms);
  }
  function wakeReach(id) {
    var list = reachWaiters[id] || [];
    delete reachWaiters[id];
    list.forEach(function (fn) { fn(reach[id] === true || reach[id] === false ? reach[id] : null); });
  }
  function awaitReach(id) {
    if (reach[id] === true || reach[id] === false) return Promise.resolve(reach[id]);
    queueReach();
    return new Promise(function (resolve) {
      var done = false;
      function finish(v) { if (done) return; done = true; resolve(v); }
      (reachWaiters[id] || (reachWaiters[id] = [])).push(finish);
      setTimeout(function () { finish(reach[id] === true || reach[id] === false ? reach[id] : null); }, 8000);
    });
  }
  function noteReachFail(chunk) {
    var wait = 800;
    chunk.forEach(function (id) {
      delete reachWait[id];
      var n = reachTries[id] || 1;
      wait = Math.max(wait, 700 * Math.pow(2, Math.min(n - 1, 3)));
      reachNext[id] = Date.now() + wait;
    });
    if (chunk.some(function (id) { return (reachTries[id] || 0) < REACH_MAX; })) scheduleReach(wait);
    chunk.forEach(wakeReach);
    paint();
  }
  function queueReach() {
    var now = Date.now(), ids = [];
    document.querySelectorAll('.atm-heart').forEach(function (b) {
      if (!b.querySelector('path')) return;
      var id = idOf(b);
      if (!id || reachWait[id] || reach[id] === true || reach[id] === false) return;
      var e = eventOf(id);
      if (e && hasEmail(e)) return;
      if (!e && !ready) return;
      if ((reachTries[id] || 0) >= REACH_MAX) return;
      if (reachNext[id] && now < reachNext[id]) return;
      if (ids.indexOf(id) < 0) ids.push(id);
    });
    if (!ids.length) return;
    for (var i = 0; i < ids.length; i += 80) {
      (function (chunk) {
        chunk.forEach(function (id) { reachWait[id] = 1; reachTries[id] = (reachTries[id] || 0) + 1; });
        api('/social/going/reach?ids=' + chunk.map(encodeURIComponent).join(',')).then(function (d) {
          if (!d || d._s >= 400 || d.error || !d.reach || typeof d.reach !== 'object') { noteReachFail(chunk); return; }
          var again = false;
          chunk.forEach(function (id) {
            delete reachWait[id];
            if (!Object.prototype.hasOwnProperty.call(d.reach, id)) { again = true; reachNext[id] = Date.now() + 800; return; }
            if (d.reach[id] === true) reach[id] = true;
            else if (d.reach[id] === false) reach[id] = false;
            else { again = true; reachNext[id] = Date.now() + 800; }
          });
          if (again && chunk.some(function (id) { return reach[id] !== true && reach[id] !== false && (reachTries[id] || 0) < REACH_MAX; })) scheduleReach(800);
          chunk.forEach(wakeReach);
          paint();
        }).catch(function () { noteReachFail(chunk); });
      })(ids.slice(i, i + 80));
    }
  }
  function ensureEvents() {
    if (eventsP) return eventsP;
    eventsP = fetch('/asia/events.json?v=e216').then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }).then(function (d) { window._atmStarEvents = Array.isArray(d) ? d : (d.events || []); ready = true; paint(); }).catch(function () { ready = true; paint(); });
    return eventsP;
  }
  function idOf(b) {
    var li = b.closest && b.closest('.ev-card[data-id]');
    if (li) return li.getAttribute('data-id') || '';
    var host = b.closest && b.closest('[data-fid],[data-sid]');
    if (host && host !== b) return host.getAttribute('data-fid') || host.getAttribute('data-sid') || '';
    return b.getAttribute('data-fid') || b.getAttribute('data-sid') || '';
  }
  function shToday() {
    try { var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); return p; } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function shanghaiMidnight(ymd) { return Date.parse(ymd + 'T00:00:00Z') - 8 * 3600000; }
  function occurrenceEnd(ymd, time) {
    var m = String(time || '').match(/(\d{1,2}):(\d{2})\s*[–\-\u2013\u2014]\s*(\d{1,2}):(\d{2})/);
    var base = shanghaiMidnight(ymd);
    if (!m) return base + 24 * 3600000 - 1000;
    var sh = +m[1], sm = +m[2], eh = +m[3], em = +m[4], extra = 0;
    if (eh >= 24) { extra = Math.floor(eh / 24); eh %= 24; }
    if (sh > 23 || sm > 59 || eh > 23 || em > 59) return base + 24 * 3600000 - 1000;
    var start = sh * 60 + sm, end = eh * 60 + em + extra * 24 * 60;
    if (end <= start) end += 24 * 60;
    return base + end * 60000;
  }
  function datesOf(e) {
    if (!e || e.kind === 'event' || e.kind === 'featured') return [];
    var wds = e.weekdays || (e.weekday != null ? [e.weekday] : []);
    if (!wds.length) return [];
    var today = shToday(), start = new Date(Date.parse(today + 'T00:00:00Z') - 86400000), now = Date.now(), out = [];
    for (var i = 0; i < 210 && out.length < 8; i++) {
      var d = new Date(start.getTime() + i * 86400000), ymd = d.toISOString().slice(0, 10);
      if (wds.indexOf(d.getUTCDay()) < 0) continue;
      if (occurrenceEnd(ymd, e.time) <= now) continue;
      out.push(ymd);
    }
    return out;
  }
  function regular(e) { return e && e.kind !== 'event' && e.kind !== 'featured'; }
  function titleOf(e) { return (zh && e && (e.name_zh || e.title_zh)) || (e && (e.name || e.title)) || ''; }

  var box = document.createElement('div'); box.id = 'atm-star'; box.hidden = true;
  var view = 0;
  box.innerHTML = '<div class="asg" role="dialog" aria-modal="true"><button type="button" class="asg-x" data-x aria-label="' + L.close + '">&times;</button><h2></h2><div class="asg-body"></div></div>';
  document.body.appendChild(box);
  function shut() {
    if (box.hidden) return;
    view++;
    if (resendTick) { clearInterval(resendTick); resendTick = 0; }
    box.hidden = true;
  }
  box.addEventListener('click', function (e) { if (e.target === box || (e.target.closest && e.target.closest('[data-x]'))) shut(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden || (e.key !== 'Escape' && e.key !== 'Esc')) return;
    e.preventDefault();
    shut();
  });
  function h2() { return box.querySelector('h2'); }
  function body() { return box.querySelector('.asg-body'); }
  function field(label, id, type) {
    return '<div class="asg-f"><label class="asg-l" for="' + id + '">' + label + '</label><input id="' + id + '" ' + (type === 'email' ? 'type="email" autocomplete="email"' : 'type="text"') + ' maxlength="80"></div>';
  }
  function roleSelect(disabled) {
    return '<div class="asg-f"><label class="asg-l" for="asg-role">' + L.role + '</label><select id="asg-role"' + (disabled ? ' disabled' : '') + '><option value="">' + L.rolePh + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div>';
  }
  function roleLabel(role) {
    if (role === 'leader') return L.rl;
    if (role === 'follower') return L.rf;
    if (role === 'both') return L.rb;
    return '';
  }
  function statusText(mail) {
    if (mail === 'sent') return L.sent;
    if (mail === 'unchanged') return L.unchanged;
    if (mail === 'withheld') return L.withheld;
    if (mail === 'failed' || mail === 'no_organizer') return L.fail;
    return L.queued;
  }
  function whenAck(fn) {
    if (window.__atmNoticeAck || document.documentElement.classList.contains('atm-notice-ack')) { fn(); return; }
    var go = document.getElementById('atm-notice-go');
    if (!go) { fn(); return; }
    go.addEventListener('click', function () { setTimeout(fn, 0); });
  }
  function readHash() {
    var h = location.hash || '';
    var m = h.match(/atm=([0-9a-f]{64})/);
    if (m) setToken(m[1]);
    var g = (h.match(/going=([a-z]+)/) || [])[1];
    if (m || g) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} }
    var card = (h.match(/card=([A-Za-z0-9_-]+)/) || [])[1];
    if (g === 'queued' || g === 'sent' || g === 'unchanged') toast(L.savedNotify);
    else if (g === 'fail') toast(L.fail, 'note');
    else if (g === 'none') toast(L.saved);
    else if (g === 'ready') toast(L.ready);
    if (card) reopen = card;
    if (m) refreshMine();
  }
  var barEl = null, barTimer = 0, barHold = 0, barAnchor = null;
  function shown(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      if (n.hidden) return false;
      var s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      n = n.parentElement;
    }
    return !!el;
  }
  function sectionSlot(from) {
    if (!from || !from.closest) return null;
    var ly = from.closest('.ah-ly');
    if (ly && shown(ly)) {
      var lyList = ly.querySelector('.ah-list');
      if (lyList) return { parent: lyList.parentNode, before: lyList };
    }
    var home = from.closest('#atm-home');
    if (home && shown(home)) {
      var homeList = home.querySelector('.ah-list');
      if (homeList) return { parent: homeList.parentNode, before: homeList };
    }
    var block = from.closest('.china-city-block, .china-chrono');
    if (block && shown(block)) {
      var title = block.querySelector('.atm-onehead:not(.atm-oh-hide)') || block.querySelector('.china-city-head');
      if (title && shown(title)) {
        var after = title, n = title.nextElementSibling;
        if (n && (n.classList.contains('china-from-line') || n.classList.contains('atm-oh-from'))) after = n;
        return { parent: after.parentNode, before: after.nextSibling };
      }
    }
    return null;
  }
  function bannerSlot() {
    var from = barAnchor && barAnchor.isConnected ? barAnchor : null;
    var local = from ? sectionSlot(from) : null;
    if (local) return local;
    var home = document.getElementById('atm-home');
    if (home && shown(home)) {
      var list = home.querySelector('.ah-list');
      if (list) return { parent: list.parentNode, before: list };
      var note = home.querySelector('.ah-note');
      if (note) return { parent: note.parentNode, before: note.nextSibling };
      var top = home.querySelector('.ah-top');
      if (top) return { parent: top.parentNode, before: top.nextSibling };
    }
    var heads = document.querySelectorAll('.atm-onehead, .china-city-head');
    for (var i = 0; i < heads.length; i++) {
      if (!shown(heads[i]) || heads[i].classList.contains('atm-oh-hide')) continue;
      var after = heads[i], n = after.nextElementSibling;
      if (n && (n.classList.contains('china-from-line') || n.classList.contains('atm-oh-from')) && !n.classList.contains('atm-oh-hide')) after = n;
      return { parent: after.parentNode, before: after.nextSibling };
    }
    return null;
  }
  function placeBar() {
    if (!barEl || !barHold) return;
    var slot = bannerSlot();
    if (slot && slot.parent && slot.before !== barEl) {
      barEl.classList.remove('atm-savebar-fixed');
      if (barEl.parentNode !== slot.parent || barEl.nextSibling !== slot.before) slot.parent.insertBefore(barEl, slot.before);
      return;
    }
    var head = document.querySelector('.china-sticky-top');
    var below = 8;
    if (head && shown(head)) {
      var r = head.getBoundingClientRect();
      if (r.bottom > 0) below = Math.round(r.bottom) + 6;
    }
    document.documentElement.style.setProperty('--atm-save-top', below + 'px');
    barEl.classList.add('atm-savebar-fixed');
    if (barEl.parentNode !== document.body) document.body.appendChild(barEl);
  }
  function revealBar() {
    if (!barEl || !barEl.isConnected || barEl.classList.contains('atm-savebar-fixed')) return;
    var limit = 8, head = document.querySelector('.china-sticky-top'), sticky = document.querySelector('#atm-home .ah-top');
    if (head && shown(head)) { var hb = head.getBoundingClientRect().bottom; if (hb > 0) limit = hb + 4; }
    if (sticky && shown(sticky) && getComputedStyle(sticky).position === 'sticky') {
      var sb = sticky.getBoundingClientRect().bottom;
      if (sb > limit) limit = sb + 4;
    }
    var rect = barEl.getBoundingClientRect();
    if (rect.top < limit - 2 || rect.bottom > window.innerHeight - 12) window.scrollBy(0, rect.top - limit);
  }
  function toast(text, kind, anchor) {
    if (anchor) barAnchor = anchor;
    kind = kind || 'ok';
    if (!barEl) {
      barEl = document.createElement('div');
      barEl.id = 'atm-savebar';
      barEl.setAttribute('role', 'status');
      barEl.setAttribute('aria-live', 'polite');
    }
    barEl.className = 'atm-savebar atm-savebar-' + (kind === 'off' || kind === 'note' ? kind : 'ok');
    barEl.textContent = text;
    barHold = Date.now() + 2000;
    placeBar();
    revealBar();
    clearTimeout(barTimer);
    barTimer = setTimeout(function () {
      barHold = 0;
      if (barEl && barEl.parentNode) barEl.parentNode.removeChild(barEl);
    }, 2000);
  }
  function localOcc() { try { var o = JSON.parse(localStorage.getItem('atm_occ_v1') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function rememberAbsent(id, anchor) {
    var o = localOcc();
    if (!o[id]) o[id] = {};
    o[id][anchor || ''] = { intent: 'absent' };
    try { localStorage.setItem('atm_occ_v1', JSON.stringify(o)); } catch (e) {}
    if (!occ[id]) occ[id] = {};
    occ[id][anchor || ''] = { id: id, anchor: anchor || '', intent: 'absent', date: '' };
  }
  function forgetLocalCard(id) {
    var o = localOcc();
    delete o[id];
    try { localStorage.setItem('atm_occ_v1', JSON.stringify(o)); } catch (e) {}
  }
  var resendTick = 0;
  var refreshResend = function () {};
  var HOLD_KEY = 'atm_mail_hold_v1';
  function holds() { try { var o = JSON.parse(sessionStorage.getItem(HOLD_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function holdKey(id, anchor, email) { return id + '|' + (anchor || '') + '|' + String(email || '').trim().toLowerCase(); }
  function getHold(id, anchor, email) { return holds()[holdKey(id, anchor, email)] || null; }
  function putHold(id, anchor, email, n, at) {
    var o = holds();
    o[holdKey(id, anchor, email)] = { n: n, at: at || Date.now() };
    try { sessionStorage.setItem(HOLD_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function latestHold(id, anchor) {
    var o = holds(), best = null, email = '', mark = anchor || '';
    Object.keys(o).forEach(function (k) {
      var parts = k.split('|');
      if (parts[0] !== id || parts[1] !== mark) return;
      if (!best || (o[k].at || 0) > best.at) { best = o[k]; email = parts.slice(2).join('|'); }
    });
    return best ? { email: email, n: best.n || 0, at: best.at || 0 } : null;
  }
  function holdSent(go) {
    go.disabled = true;
    go.dataset.busy = '';
    go.dataset.sent = '1';
    go.setAttribute('aria-busy', 'false');
    go.textContent = L.sentHold;
  }
  function saveAbsent(ev, id, anchor) {
    rememberAbsent(id, anchor);
    addLocalFav(id);
    paint();
    toast(L.savedShort, 'ok', document.querySelector('.atm-heart[data-fid="' + id + '"], .atm-heart[data-sid="' + id + '"]'));
    shut();
    if (!token()) return;
    api('/social/going', { id: id, intent: 'absent', anchor: anchor || '', date: '', explicit: 1, disclose: 1, notify: 0, transport: 0, alert: 0, lang: zh ? 'zh' : 'en', ret: location.href.split('#')[0], dev: dev() }).then(function (d) {
      if (!(d && d.ok && !d.confirm)) toast(L.later, 'note');
      else refreshMine();
    }).catch(function () { toast(L.later, 'note'); });
  }
  function open(b, opt) {
    opt = opt || {};
    var id = idOf(b); if (!id) return;
    var e = eventOf(id);
    if (!e) { ensureEvents().then(function () { open(b); }); return; }
    if (canIntent(e, id) === false) return;
    if (canIntent(e, id) !== true) { awaitReach(id).then(function (v) { if (v === true) open(b); }); return; }
    var dates = datesOf(e), reg = regular(e);
    var anchor0 = reg ? (dates[0] || '') : '';
    var saved = (occ[id] && occ[id][anchor0]) || null;
    var pending = drafts[id] || null;
    var draft = pending && (pending.intent === 'going' || pending.intent === 'interested' || pending.intent === 'absent')
      ? { id: id, anchor: pending.anchor || anchor0, intent: pending.intent, date: pending.intent === 'going' ? (pending.date || pending.anchor || anchor0) : '', notify: pending.intent === 'absent' ? false : pending.notify !== false, transport: pending.intent === 'going' && !!pending.transport }
      : saved
      ? { id: id, anchor: anchor0, intent: saved.intent, date: saved.intent === 'going' ? (saved.date || anchor0) : '', notify: saved.intent === 'absent' ? false : saved.notify !== false, transport: saved.intent === 'going' && !!saved.transport }
      : { id: id, anchor: anchor0, intent: 'going', date: reg ? anchor0 : '', notify: true, transport: false };
    ctxSet(draft);
    h2().textContent = titleOf(e) || L.title;
    var verified = !!token();
    var needProfile = verified && (!me || !me.city || !me.role || !me.name);
    var showFilled = verified && !needProfile && !!opt.resume;
    var action = L.submit;
    var html = '';
    if (!verified || needProfile) html += '<p class="asg-note">' + L.explain + '</p>';
    html += '<div class="asg-opt">';
    ['going', 'interested', 'absent'].forEach(function (k) { html += '<button type="button" data-intent="' + k + '" aria-pressed="' + (draft.intent === k) + '">' + L[k] + '</button>'; });
    html += '</div><div id="asg-rest"' + (draft.intent ? '' : ' hidden') + '>';
    if (reg && dates.length) {
      html += '<label class="asg-l" for="asg-date">' + L.date + '</label><select id="asg-date"' + (draft.intent === 'going' ? '' : ' disabled') + '>';
      dates.forEach(function (d) { html += '<option value="' + d + '"' + ((draft.date || anchor0) === d ? ' selected' : '') + '>' + d + '</option>'; });
      html += '</select>';
    }
    html += '<label class="asg-check"><input type="checkbox" id="asg-notify"' + (draft.intent !== 'absent' && draft.notify !== false ? ' checked' : '') + (draft.intent === 'absent' ? ' disabled' : '') + '>' + L.notify + '</label>';
    if (reg) html += '<label class="asg-check"><input type="checkbox" id="asg-dir"' + (draft.intent === 'going' && draft.transport ? ' checked' : '') + (draft.intent === 'going' ? '' : ' disabled') + '>' + L.transport + '</label>';
    if (!verified) {
      html += '<p class="asg-note" id="asg-mailnote">' + L.profileDesc + '</p>';
      html += '<p class="asg-req">' + L.req + '</p><div id="asg-profile">';
      html += field(L.email, 'asg-email', 'email');
      html += '<div class="asg-grid">' + field(L.name, 'asg-name') + roleSelect(false) + field(L.city, 'asg-city') + '</div></div>';
      html += '<label class="asg-check" id="asg-promolab"><input type="checkbox" id="asg-promo" checked>' + L.promo + '</label>';
    } else if (needProfile) {
      html += '<div id="asg-profile"><p class="asg-note">' + L.fill + '</p>';
      if (me && me.email) html += '<p class="asg-note">' + L.emailKept + (zh ? '：' : ': ') + esc(me.email) + '</p>';
      html += '<p class="asg-req">' + L.req + '</p><div class="asg-grid">' + field(L.name, 'asg-name') + field(L.city, 'asg-city') + roleSelect(false) + '</div></div>';
    } else if (showFilled) {
      html += '<div id="asg-profile"><p class="asg-note">' + L.emailKept + (zh ? '：' : ': ') + esc(me.email || '') + '</p>';
      html += '<div class="asg-grid">' + field(L.name, 'asg-name') + field(L.city, 'asg-city') + roleSelect(true) + '</div></div>';
    }
    html += '<p class="asg-err" id="asg-err"></p><p class="asg-ok" id="asg-ok"></p>';
    html += '<button type="button" class="asg-go" id="asg-go" aria-busy="false">' + action + '</button>';
    if (verified) html += '<p class="asg-hint">' + L.optin + '</p>';
    html += '</div>';
    view++;
    body().innerHTML = html;
    if (me) { var n = body().querySelector('#asg-name'); if (n && me.name) n.value = me.name; var c = body().querySelector('#asg-city'); if (c && me.city) c.value = me.city; var rr = body().querySelector('#asg-role'); if (rr && me.role) rr.value = me.role; }
    var dateEl = body().querySelector('#asg-date');
    var dirEl0 = body().querySelector('#asg-dir');
    function lockFields() {
      var going = draft.intent === 'going';
      var away = draft.intent === 'absent';
      if (dateEl) dateEl.disabled = !going;
      if (dirEl0) { dirEl0.disabled = !going; if (!going) dirEl0.checked = false; }
      var note = body().querySelector('#asg-notify');
      if (note) {
        note.disabled = away;
        if (away) note.checked = false;
        else if (!note.disabled) note.checked = draft.notify !== false;
      }
      var email = body().querySelector('#asg-email');
      if (email) email.disabled = away;
      ['#asg-name', '#asg-city', '#asg-role'].forEach(function (sel) {
        var el = body().querySelector(sel);
        if (el) el.disabled = away || showFilled;
      });
      var promo = body().querySelector('#asg-promo');
      if (promo) {
        if (away) {
          if (!promo.disabled) promo.dataset.was = promo.checked ? '1' : '0';
          promo.disabled = true;
          promo.checked = false;
        } else {
          promo.disabled = false;
          if (promo.dataset.was) { promo.checked = promo.dataset.was === '1'; promo.dataset.was = ''; }
        }
      }
      var mailNote = body().querySelector('#asg-mailnote');
      var promoLab = body().querySelector('#asg-promolab');
      var profile = body().querySelector('#asg-profile');
      if (mailNote) mailNote.hidden = away;
      if (promoLab) promoLab.hidden = away;
      if (profile) profile.hidden = away;
    }
    body().querySelectorAll('[data-intent]').forEach(function (btn) { btn.onclick = function () {
      var next = btn.getAttribute('data-intent');
      var wasAway = draft.intent === 'absent';
      if (draft.intent === 'going' && dateEl) { draft.anchor = dateEl.value; draft.date = dateEl.value; }
      draft.intent = next;
      if (!draft.anchor) draft.anchor = anchor0;
      if (draft.intent === 'going') {
        if (dateEl && !dateEl.value) dateEl.value = anchor0;
        if (dateEl) { draft.date = dateEl.value; draft.anchor = dateEl.value; }
      } else draft.date = '';
      if (draft.intent === 'absent') draft.notify = false;
      else if (wasAway) draft.notify = true;
      var rest = body().querySelector('#asg-rest'); if (rest) rest.hidden = false;
      lockFields();
      var goNow = body().querySelector('#asg-go');
      if (goNow && goNow.dataset.sent === '1') holdSent(goNow);
      else paintResend();
      ctxSet(draft);
      body().querySelectorAll('[data-intent]').forEach(function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); });
    }; });
    if (dateEl) dateEl.onchange = function () { if (draft.intent !== 'going') return; draft.date = dateEl.value; draft.anchor = dateEl.value; ctxSet(draft); paintResend(); };
    var noteEl = body().querySelector('#asg-notify'); if (noteEl) noteEl.onchange = function () { draft.notify = noteEl.checked; ctxSet(draft); };
    var dirEl = body().querySelector('#asg-dir'); if (dirEl) dirEl.onchange = function () { draft.transport = dirEl.checked; ctxSet(draft); };
    var emailEl = body().querySelector('#asg-email');
    if (emailEl) emailEl.oninput = function () { paintResend(); };
    var known = latestHold(id, draft.anchor || '');
    if (emailEl && known && known.email && !emailEl.value) emailEl.value = known.email;
    var go = body().querySelector('#asg-go');
    function paintResend() {
      if (resendTick) { clearInterval(resendTick); resendTick = 0; }
      var btn = body().querySelector('#asg-go');
      if (!btn || btn.dataset.sent === '1') return;
      if (draft.intent === 'absent') {
        var awayNote = body().querySelector('#asg-resend');
        if (awayNote) awayNote.hidden = true;
        btn.disabled = false;
        btn.textContent = L.submit;
        return;
      }
      var mail = body().querySelector('#asg-email');
      var addr = mail ? mail.value.trim().toLowerCase() : '';
      var row = addr ? getHold(id, draft.anchor || '', addr) : null;
      var hint = body().querySelector('#asg-resend');
      if (!row) {
        if (hint) hint.hidden = true;
        btn.disabled = false;
        btn.textContent = L.submit;
        return;
      }
      if (!hint) {
        hint = document.createElement('p');
        hint.id = 'asg-resend';
        hint.className = 'asg-note';
        btn.parentNode.insertBefore(hint, btn);
      }
      hint.hidden = false;
      if ((row.n || 0) >= 2) {
        hint.textContent = L.resendUsed;
        btn.disabled = true;
        btn.textContent = L.resendUsed;
        return;
      }
      hint.textContent = L.resendHint;
      var left = Math.ceil((60000 - (Date.now() - row.at)) / 1000);
      if (left > 0) {
        btn.disabled = true;
        btn.textContent = L.resendWait.replace('{n}', String(left));
        resendTick = setInterval(function () {
          if (!btn.isConnected || box.hidden || btn.dataset.sent === '1') { if (resendTick) { clearInterval(resendTick); resendTick = 0; } return; }
          var n = Math.ceil((60000 - (Date.now() - row.at)) / 1000);
          if (n > 0) btn.textContent = L.resendWait.replace('{n}', String(n));
          else { clearInterval(resendTick); resendTick = 0; btn.disabled = false; btn.textContent = L.submit; }
        }, 250);
      } else {
        btn.disabled = false;
        btn.textContent = L.submit;
      }
    }
    go.onclick = function () { submit(e, draft, go); };
    refreshResend = paintResend;
    lockFields();
    paintResend();
    box.hidden = false;
  }
  function submit(e, draft, go) {
    var err = body().querySelector('#asg-err'), ok = body().querySelector('#asg-ok');
    if (!err || !ok) return;
    if (go.dataset.busy === '1' || go.dataset.sent === '1') return;
    err.textContent = ''; ok.textContent = '';
    if (draft.intent !== 'going' && draft.intent !== 'interested' && draft.intent !== 'absent') { err.textContent = L.needIntent; return; }
    if (draft.intent === 'absent') { saveAbsent(e, e.id, draft.anchor || ''); return; }
    if (!token()) {
      var nm = (body().querySelector('#asg-name') || {}).value || '';
      var em = (body().querySelector('#asg-email') || {}).value || '';
      var cy = (body().querySelector('#asg-city') || {}).value || '';
      var rl = (body().querySelector('#asg-role') || {}).value || '';
      if (!String(nm).trim()) { err.textContent = L.needName; return; }
      if (!String(em).trim()) { err.textContent = L.needEmail; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(em).trim())) { err.textContent = L.needEmail; return; }
      if (!String(cy).trim()) { err.textContent = L.needCity; return; }
      if (rl !== 'leader' && rl !== 'follower' && rl !== 'both') { err.textContent = L.needRole; return; }
    }
    go.dataset.busy = '1';
    var dateEl = body().querySelector('#asg-date');
    var going = draft.intent === 'going';
    var promo = body().querySelector('#asg-promo');
    var payload = { id: e.id, intent: draft.intent, explicit: 1, disclose: 1, notify: body().querySelector('#asg-notify').checked ? 1 : 0, transport: (going && body().querySelector('#asg-dir') && body().querySelector('#asg-dir').checked) ? 1 : 0, anchor: draft.anchor || '', date: going ? ((dateEl && dateEl.value) || draft.date || '') : '', alert: promo && promo.checked ? 1 : 0, lang: zh ? 'zh' : 'en', ret: location.href.split('#')[0], dev: dev() };
    ['name', 'email', 'city'].forEach(function (k) { var el = body().querySelector('#asg-' + k); if (el) payload[k] = el.value.trim(); });
    var role = body().querySelector('#asg-role'); if (role) payload.role = role.value;
    ctxSet({ id: e.id, intent: draft.intent, date: payload.date, notify: payload.notify !== 0, transport: !!payload.transport });
    go.disabled = true;
    go.setAttribute('aria-busy', 'true');
    var seen = view;
    var settled = false;
    function sameView() { return seen === view && go.isConnected && !box.hidden; }
    function finish(stay) {
      if (settled) return;
      settled = true;
      if (!sameView()) return;
      if (!stay) { shut(); return; }
      go.disabled = false;
      go.dataset.busy = '';
      go.setAttribute('aria-busy', 'false');
    }
    function mailBad(d) { return d.mail === 'failed' || d.mail === 'rate_limited' || d.mail === 'no_organizer'; }
    api('/social/going', payload).then(function (d) {
      var here = sameView();
      var savedOk = !!(d && d.ok && !d.confirm && !d.need_profile && !d.error && !mailBad(d));
      if (d && d.ok && !d.confirm) refreshMine();
      if (d && d.confirm) {
        var prev = getHold(e.id, payload.anchor, payload.email) || { n: 0 };
        putHold(e.id, payload.anchor, payload.email, (prev.n || 0) + 1, Date.now());
      }
      if (!here) return;
      if (d && d.confirm) { addLocalFav(e.id); holdSent(go); return; }
      if (d && (d.error === 'resend_wait' || d.error === 'resend_used')) {
        if (d.error === 'resend_used') putHold(e.id, payload.anchor, payload.email, 2, Date.now());
        else putHold(e.id, payload.anchor, payload.email, Math.max(1, ((getHold(e.id, payload.anchor, payload.email) || {}).n) || 1), Date.now() - Math.max(0, 60000 - (Number(d.wait) || 1) * 1000));
        if (err.isConnected) err.textContent = '';
        go.dataset.busy = '';
        go.setAttribute('aria-busy', 'false');
        settled = true;
        refreshResend();
        return;
      }
      if (err.isConnected) {
        if (d.need_profile || d.error === 'need_city' || d.error === 'need_role' || d.error === 'need_name') err.textContent = L.fill;
        else if (d.error === 'no_organizer') err.textContent = L.grey;
        else if (d.error === 'rate_limited') err.textContent = L.limited;
        else if (!d.ok) err.textContent = L.again;
        else if (mailBad(d)) ok.textContent = L.fail;
      }
      if (savedOk) addLocalFav(e.id);
      if (savedOk) {
        var line = statusText(d.mail);
        toast(line, line === L.fail ? 'note' : 'ok', document.querySelector('.atm-heart[data-fid="' + e.id + '"], .atm-heart[data-sid="' + e.id + '"]'));
        finish(false);
        return;
      }
      finish(true);
    }).catch(function () { if (sameView() && err.isConnected) err.textContent = L.net; if (sameView()) finish(true); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var painting = false;
  function paint() {
    if (painting) return;
    painting = true;
    try { paintHearts(); placeBar(); } finally { painting = false; }
  }
  function paintHearts() {
    document.querySelectorAll('.atm-heart').forEach(function (b) {
      if (!b.querySelector('path')) return;
      var path = b.querySelector('path'); if (path && path.getAttribute('d') !== STAR) path.setAttribute('d', STAR);
      var id = idOf(b); if (!id) return;
      var e = eventOf(id);
      var state = canIntent(e, id);
      var off = state === false;
      var waiting = state === null && !!(e || ready) && !(e && hasEmail(e));
      b.classList.toggle('atm-star-off', off);
      b.classList.toggle('atm-star-wait', waiting);
      if (off) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-busy', 'false'); b.setAttribute('aria-pressed', 'false'); b.title = L.grey; b.setAttribute('aria-label', L.grey); }
      else if (waiting) { b.setAttribute('aria-disabled', 'false'); b.setAttribute('aria-busy', 'true'); b.setAttribute('aria-pressed', 'false'); b.title = L.checking; b.setAttribute('aria-label', L.checking); }
      else if (showSolid(id, e)) { b.setAttribute('aria-busy', 'false'); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-disabled', 'false'); var st = occNow(id, e); var lab = L.manage + ' ' + (st && st.intent === 'going' ? L.going : L.interested); b.title = lab; b.setAttribute('aria-label', lab); }
      else { b.setAttribute('aria-busy', 'false'); b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-disabled', 'false'); b.title = L.title; b.setAttribute('aria-label', L.title); }
    });
    document.querySelectorAll('.atm-star-n').forEach(function (n) { n.remove(); });
    queueReach();
  }
  function nextAnchor(e) { if (!e || !regular(e)) return ''; var ds = datesOf(e); return ds[0] || ''; }
  function occNow(id, e) { var bag = occ[id]; if (!bag) return null; return bag[nextAnchor(e)] || null; }
  function showSolid(id, e) { var st = occNow(id, e); return !!(st && (st.intent === 'going' || st.intent === 'interested')); }
  function mergeLocalOcc() {
    var o = localOcc();
    Object.keys(o).forEach(function (id) {
      var bag = o[id] || {};
      if (!occ[id]) occ[id] = {};
      Object.keys(bag).forEach(function (anchor) {
        if (!occ[id][anchor]) occ[id][anchor] = { id: id, anchor: anchor, intent: bag[anchor].intent, date: '' };
      });
    });
  }
  function loadLocalFavs() {
    favs = {};
    try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); if (Array.isArray(a)) a.forEach(function (id) { if (typeof id === 'string') favs[id] = 1; }); } catch (e) {}
  }
  function addLocalFav(id) {
    favs[id] = 1;
    try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); if (!Array.isArray(a)) a = []; if (a.indexOf(id) < 0) a.unshift(id); localStorage.setItem('atm_fav_v1', JSON.stringify(a)); } catch (e) {}
    if (window.ATM_FAV && window.ATM_FAV.refresh) window.ATM_FAV.refresh();
  }
  function dropLocalFav(id) {
    delete favs[id]; delete occ[id]; delete mine[id];
    forgetLocalCard(id);
    try { var a = JSON.parse(localStorage.getItem('atm_fav_v1') || '[]'); localStorage.setItem('atm_fav_v1', JSON.stringify((a || []).filter(function (x) { return x !== id; }))); } catch (e) {}
    paint(); paintBar();
    if (window.ATM_FAV && window.ATM_FAV.refresh) window.ATM_FAV.refresh();
  }
  function savedText(n) { return zh ? ('☆ 已收藏 ' + n + ' 个活动') : ('☆ ' + n + ' saved event' + (n === 1 ? '' : 's')); }
  function syncSaved() {
    var t = savedText(Object.keys(mine).length);
    document.querySelectorAll('[data-atm-saved]').forEach(function (el) { if (el.textContent !== t) el.textContent = t; });
  }
  function paintBar() {
    var bar = document.querySelector('.atm-favbar'); if (!bar) { syncSaved(); return false; }
    var grid = document.querySelector('.atm-favgrid');
    var items = Object.keys(favs);
    var n = items.length;
    bar.classList.toggle('atm-on', n > 0);
    bar.innerHTML = '<b>' + L.bar + '</b><span class="atm-hint" data-atm-saved="1">' + savedText(n) + '</span>';
    syncSaved();
    if (!token() || !n) { if (grid) { grid.hidden = true; grid.innerHTML = ''; } return true; }
    if (grid) {
      grid.hidden = false; grid.innerHTML = '';
      items.forEach(function (id) {
        var e = eventOf(id), a = document.createElement('a');
        a.className = 'tw-fc atm-favfc'; a.href = location.pathname + '?card=' + encodeURIComponent(id); a.setAttribute('data-fid', id);
        var name = titleOf(e) || id;
        var st = occNow(id, e);
        var meta = st ? ((st.intent === 'going' ? L.going : st.intent === 'interested' ? L.interested : L.absent) + (st.intent === 'going' && st.date ? ' · ' + st.date : '')) : (zh ? '已收藏' : 'Saved');
        a.innerHTML = '<span class="tw-fc-body"><strong>' + esc(name) + '</strong><span class="tw-fc-meta">' + esc(meta) + '</span></span>';
        var btn = document.createElement('span'); btn.className = 'atm-heart'; btn.setAttribute('role', 'button'); btn.tabIndex = 0; btn.setAttribute('aria-pressed', showSolid(id, e) ? 'true' : 'false'); btn.title = L.manage; btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '"/></svg>';
        var ux = document.createElement('button'); ux.type = 'button'; ux.className = 'atm-unfav'; ux.setAttribute('data-unfav', id); ux.textContent = L.unfav;
        a.appendChild(btn); a.appendChild(ux); grid.appendChild(a);
      });
    }
    return true;
  }
  function refreshMine() {
    var back = resumeId || reopen;
    resumeId = '';
    reopen = '';
    if (!token()) { me = null; mine = {}; occ = {}; drafts = {}; loadLocalFavs(); mergeLocalOcc(); paint(); paintBar(); return Promise.resolve(); }
    return api('/social/going/mine').then(function (d) {
      if (d._s === 401) { try { localStorage.removeItem('atm_session'); } catch (e) {} me = null; mine = {}; occ = {}; favs = {}; drafts = {}; }
      else {
        me = { email: d.email, name: d.name, city: d.city, role: d.role };
        mine = {}; occ = {}; favs = {}; drafts = {};
        (d.items || []).forEach(function (it) { mine[it.id] = it; if (!occ[it.id]) occ[it.id] = {}; occ[it.id][it.anchor || ''] = it; });
        (d.drafts || []).forEach(function (it) { drafts[it.id] = it; });
        (d.favs || []).forEach(function (fid) { favs[fid] = 1; addLocalFav(fid); });
        mergeLocalOcc();
      }
      paint(); paintBar();
      if (back) whenAck(function () { openId(back, { resume: true }); });
    }).catch(function () {});
  }
  var resumeId = '';
  function openId(id, opt) {
    var b = document.querySelector('[data-fid="' + id + '"], [data-sid="' + id + '"]');
    if (!b) { b = document.createElement('button'); b.setAttribute('data-fid', id); }
    open(b, opt);
  }
  window.ATM_STAR = {
    take: function (b) {
      if (b.closest && b.closest('[data-unfav]')) return false;
      if (b.classList.contains('atm-star-off')) { toast(L.noRsvp, 'off', b); return true; }
      if (b.getAttribute('aria-disabled') === 'true') return true;
      var id = idOf(b), e = id ? eventOf(id) : null;
      if (!id || (e && hasEmail(e)) || reach[id] === true) { open(b); return true; }
      if (reach[id] === false) { toast(L.noRsvp, 'off', b); return true; }
      awaitReach(id).then(function (v) { if (v === true) open(b); else if (v === false) toast(L.noRsvp, 'off', b); else paint(); });
      return true;
    },
    paintBar: paintBar, paint: paint, listed: function () { return Object.keys(mine).length; }
  };
  document.addEventListener('click', function (e) {
    var u = e.target.closest && e.target.closest('[data-unfav]');
    if (!u) return;
    e.preventDefault(); e.stopPropagation();
    var id = u.getAttribute('data-unfav');
    if (!token()) { dropLocalFav(id); return; }
    api('/social/going/unfav', { id: id, explicit: 1 }).then(function (d) { if (d && d.ok) dropLocalFav(id); else toast(L.later, 'note'); }).catch(function () { toast(L.later, 'note'); });
  }, true);
  document.addEventListener('atm-more', function () { paint(); });
  (function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (q.get('intent') === 'resume') {
      var card = q.get('card') || '';
      if (/^[A-Za-z0-9_-]{1,64}$/.test(card)) resumeId = card;
    }
  })();
  takeSession();
  readHash();
  ensureEvents();
  refreshMine();
  var mo = new MutationObserver(function () { if (!painting) paint(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
