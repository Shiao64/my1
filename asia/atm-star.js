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
    going: '要参加', interested: '感兴趣',
    notify: '接收主办方讯息',
    scope: '',
    transport: '交通指引（可选）',
    noPromise: '',
    optin: '勾选后，可接收早鸟报名及截止时间、场地交通指引、临时通知和主办方消息。',
    submit: '确认', needIntent: '请选择要参加或感兴趣。',
    profileTitle: '',
    profileDesc: '先确认邮箱。回到本页后再点「确认」，才会记录意向。',
    req: '以下均为必填',
    name: '姓名', email: '邮箱', city: '城市', role: '角色',
    rl: '引带（Leader）', rf: '跟随（follower）', rb: '两者皆可（both）', rolePh: '请选择',
    once: '同一设备验证通过后，再选 Going／Interested 无需重复验证。',
    verifyBtn: '确认邮箱并继续', pending: '确认邮件已发出，请查收。点开邮件里的确认后，再回到这里点「确认」。',
    resend: '重新发送验证邮件',
    ready: '邮箱已确认。再点「确认」才会记录意向。',
    saved: '邮箱已验证，资料已保存。可到活动五角星选择 Going／Interested。',
    sent: '已记录你的意向。已向组织者发送通知（含抄送）。',
    unchanged: '意向已保存。没有新的内容需要汇总。',
    fail: '意向已保存；通知邮件发送失败，请稍后重试。',
    queued: '已记录你的意向。会在汇总时通知主办（含抄送）。',
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
    going: 'Going', interested: 'Interested',
    notify: 'Receive organizer updates',
    scope: '',
    transport: 'Directions (optional)',
    noPromise: '',
    optin: 'Opt in to receive early-bird and registration deadlines, venue directions, last-minute notices, and organizer updates.',
    submit: 'Confirm', needIntent: 'Choose Going or Interested.',
    profileTitle: '',
    profileDesc: 'Confirm your email first. After you come back, tap Confirm to save your intent.',
    req: 'All fields are required',
    name: 'Name', email: 'Email', city: 'City', role: 'Role',
    rl: 'Leader', rf: 'follower', rb: 'both', rolePh: 'Choose',
    once: 'After one verification on this device, you won’t need to verify again to choose Going or Interested.',
    verifyBtn: 'Confirm email and continue', pending: 'Confirmation email sent. Open it, then come back and tap Confirm.',
    resend: 'Resend verification email',
    ready: 'Email confirmed. Tap Confirm to save your intent.',
    saved: 'Email verified. Profile saved. Use the star on an event to choose Going or Interested.',
    sent: 'Your intent is saved. The organizer has been notified (with CC).',
    unchanged: 'Intent saved. Nothing new is waiting for the summary.',
    fail: 'Intent saved; notification failed to send. Please try again later.',
    queued: 'Your intent is saved. The organizer is notified in the next summary (with CC).',
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
    '.atm-heart.atm-star-off{opacity:1;cursor:not-allowed;background:#e7e2da}.atm-heart.atm-star-off path{stroke:#b0a89c;fill:none}' +
    '.atm-heart.atm-star-wait{cursor:pointer;background:transparent}.atm-heart.atm-star-wait path{stroke:#0e6e78;fill:none;stroke-dasharray:2.2 1.4}' +
    'html.atm-p10 #atm-c1bar .p10-heart.atm-star-off{cursor:not-allowed!important;background:transparent!important}html.atm-p10 #atm-c1bar .p10-heart.atm-star-off path{fill:none!important;stroke:#b0a89c!important}' +
    'html.atm-p10 #atm-c1bar .p10-heart.atm-star-wait{cursor:pointer!important}html.atm-p10 #atm-c1bar .p10-heart.atm-star-wait path{fill:none!important;stroke:#0e6e78!important;stroke-dasharray:2.2 1.4}' +
    '#atm-star{position:fixed;inset:0;z-index:3000;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,51,58,.55)}#atm-star[hidden]{display:none}' +
    '#atm-star .asg{position:relative;background:#fffdf8;width:100%;max-width:480px;max-height:92dvh;overflow:hidden;display:flex;flex-direction:column;border-radius:16px 16px 0 0;padding:16px 16px 22px;box-sizing:border-box;color:#2a1a14}' +
    '@media(min-width:700px){#atm-star{align-items:center}#atm-star .asg{border-radius:16px;max-height:88vh}}' +
    '#atm-star h2{font:700 1.05rem Georgia,serif;color:#0a4f57;margin:0 52px 6px 0;flex:none}#atm-star .asg-body{overflow:auto;min-height:0}#atm-star p{margin:4px 0;line-height:1.4;font-size:.88rem}' +
    '#atm-star .asg-note{color:#5b5148}#atm-star .asg-req{font-size:.78rem;font-weight:700;color:#0a4f57;margin:8px 0 0}#atm-star .asg-dis{font-size:.78rem;color:#5b5148}' +
    '#atm-star .asg-grid{display:flex;flex-wrap:wrap;gap:0 8px}#atm-star .asg-grid .asg-f{flex:1 1 140px;min-width:0}#atm-star .asg{overflow-x:hidden}' +
    '#atm-star label.asg-l{display:block;font-weight:700;color:#0a4f57;margin:10px 0 4px;font-size:.84rem}' +
    '#atm-star input,#atm-star select{width:100%;box-sizing:border-box;min-height:44px;font-size:16px;padding:8px 10px;border:1px solid #ead9b8;border-radius:8px}' +
    '#atm-star .asg-opt{display:flex;gap:8px;margin:8px 0;padding:4px;background:#f3ece0;border-radius:14px}#atm-star .asg-opt button{flex:1;min-height:48px;border:0;background:transparent;color:#0a4f57;border-radius:12px;font-weight:700}' +
    '#atm-star .asg-opt button[aria-pressed="true"]{background:#0e6e78;color:#f6e3b4}' +
    '#atm-star .asg-go{min-height:48px;font-weight:700;border:0;width:100%;margin-top:10px;background:#0e6e78;color:#f6e3b4;border-radius:12px}#atm-star .asg-go[aria-busy="true"]{opacity:.72}' +
    '#atm-star .asg-hint{margin:10px 2px 0;color:#6b5d52;font-size:.8rem;line-height:1.45}' +
    '#atm-star .asg-tslab{margin:10px 0 4px;color:#0a4f57;font-size:.84rem;font-weight:700}' +
    '#atm-star .asg-ts{min-height:65px;margin:0 0 4px}' +
    '#atm-star .asg-x{position:absolute;top:6px;right:6px;z-index:2;width:44px;height:44px;border:0;border-radius:8px;background:transparent;font-size:28px;line-height:44px;padding:0;color:#7a6255;cursor:pointer}' +
    '#atm-star .asg-x:focus-visible{outline:2px solid #0e6e78;outline-offset:2px}' +
    '#atm-star .asg-err{color:#b5654a;min-height:1.2em}#atm-star .asg-ok{color:#0a4f57;font-weight:700}#atm-star .asg-check{display:flex;gap:8px;align-items:flex-start;margin:8px 0;font-size:.88rem}#atm-star .asg-check input{width:auto;min-height:0;margin-top:3px}' +
    '.atm-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:4000;background:rgba(42,26,20,.92);color:#fff;padding:10px 18px;border-radius:999px;font-size:.9rem;max-width:calc(100vw - 32px);text-align:center;box-sizing:border-box}' +
    '.atm-favbar b{color:#0a4f57}';
  document.head.appendChild(css);

  var mine = {}, drafts = {}, me = null, ready = false, eventsP = null, reach = {}, reachWait = {}, reachTries = {}, reachNext = {}, reachTimer = 0, reachWaiters = {}, reopen = '';
  var REACH_MAX = 3;
  function token() { try { return localStorage.getItem('atm_session') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem('atm_session', t); } catch (e) {} }
  function ctxGet() { try { return JSON.parse(localStorage.getItem('atm_star_ctx') || 'null'); } catch (e) { return null; } }
  function ctxSet(o) { try { localStorage.setItem('atm_star_ctx', JSON.stringify(o)); } catch (e) {} }
  function dev() { var k = 'atm_dev_id', v = ''; try { v = localStorage.getItem(k) || ''; if (!/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); localStorage.setItem(k, v); } } catch (e) { v = 'going-device-web1'; } return v; }
  function api(path, body) {
    var h = { 'Content-Type': 'application/json' }; var t = token(); if (t) h.Authorization = 'Bearer ' + t;
    return fetch(API + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); });
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
  function datesOf(e) {
    if (!e || e.kind === 'event') return [];
    var wds = e.weekdays || (e.weekday != null ? [e.weekday] : []);
    if (!wds.length) return [];
    var today = shToday(), out = [], t = new Date(today + 'T00:00:00Z');
    for (var i = 0; i < 200 && out.length < 8; i++) {
      var d = new Date(t.getTime() + i * 86400000), ymd = d.toISOString().slice(0, 10);
      if (wds.indexOf(d.getUTCDay()) < 0) continue;
      out.push(ymd);
    }
    return out;
  }
  function regular(e) { return e && e.kind !== 'event'; }
  function titleOf(e) { return (zh && e && (e.name_zh || e.title_zh)) || (e && (e.name || e.title)) || ''; }

  var box = document.createElement('div'); box.id = 'atm-star'; box.hidden = true;
  box.innerHTML = '<div class="asg" role="dialog" aria-modal="true"><button type="button" class="asg-x" data-x aria-label="' + L.close + '">&times;</button><h2></h2><div class="asg-body"></div></div>';
  document.body.appendChild(box);
  function shut() {
    if (box.hidden) return;
    dropTs();
    var host = body().querySelector('.asg-ts');
    if (host) host.remove();
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
  function roleSelect() {
    return '<div class="asg-f"><label class="asg-l" for="asg-role">' + L.role + '</label><select id="asg-role"><option value="">' + L.rolePh + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div>';
  }
  function statusText(mail) {
    if (mail === 'sent') return L.sent;
    if (mail === 'unchanged') return L.unchanged;
    if (mail === 'failed' || mail === 'rate_limited' || mail === 'no_organizer') return L.fail;
    return L.queued;
  }
  function readHash() {
    var h = location.hash || '';
    var m = h.match(/atm=([0-9a-f]{64})/);
    if (m) setToken(m[1]);
    var g = (h.match(/going=([a-z]+)/) || [])[1];
    if (m || g) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} }
    var card = (h.match(/card=([A-Za-z0-9_-]+)/) || [])[1];
    if (g === 'queued') toast(L.queued);
    else if (g === 'sent') toast(L.sent);
    else if (g === 'fail') toast(L.fail);
    else if (g === 'unchanged') toast(L.unchanged);
    else if (g === 'none') toast(L.saved);
    else if (g === 'ready') toast(L.ready);
    if (card) reopen = card;
    if (m) refreshMine();
  }
  function toast(text) { var t = document.createElement('div'); t.className = 'atm-toast'; t.setAttribute('role', 'status'); t.textContent = text; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200); }
  function open(b) {
    var id = idOf(b); if (!id) return;
    var e = eventOf(id);
    if (!e) { ensureEvents().then(function () { open(b); }); return; }
    if (canIntent(e, id) === false) return;
    if (canIntent(e, id) !== true) { awaitReach(id).then(function (v) { if (v === true) open(b); }); return; }
    var saved = mine[id];
    var local = ctxGet();
    var server = drafts[id];
    var draft = (local && local.id === id && local.intent) ? local
      : (server ? { id: id, intent: server.intent, date: server.date || '', notify: server.notify !== false, transport: !!server.transport }
      : { id: id, intent: saved ? saved.intent : '', date: saved ? saved.date || '' : '', notify: saved ? saved.notify !== false : true, transport: saved ? !!saved.transport : false });
    ctxSet(draft);
    h2().textContent = titleOf(e) || L.title;
    var dates = datesOf(e), reg = regular(e);
    var verified = !!token();
    var needProfile = verified && (!me || !me.city || !me.role || !me.name);
    var action = verified ? L.submit : L.verifyBtn;
    var html = '';
    if (!verified || needProfile) html += '<p class="asg-note">' + L.explain + '</p>';
    html += '<div class="asg-opt"><button type="button" data-intent="going" aria-pressed="' + (draft.intent === 'going') + '">' + L.going + '</button><button type="button" data-intent="interested" aria-pressed="' + (draft.intent === 'interested') + '">' + L.interested + '</button></div>';
    if (reg && dates.length) {
      html += '<label class="asg-l" for="asg-date">' + L.date + '</label><select id="asg-date">';
      dates.forEach(function (d) { html += '<option value="' + d + '"' + ((draft.date || dates[0]) === d ? ' selected' : '') + '>' + d + '</option>'; });
      html += '</select>';
    }
    html += '<label class="asg-check"><input type="checkbox" id="asg-notify"' + (draft.notify !== false ? ' checked' : '') + '>' + L.notify + '</label>';
    if (reg) html += '<label class="asg-check"><input type="checkbox" id="asg-dir"' + (draft.transport ? ' checked' : '') + '>' + L.transport + '</label>';
    if (!verified) {
      html += '<p class="asg-note">' + L.profileDesc + '</p>';
      html += field(L.email, 'asg-email', 'email');
    } else if (needProfile) {
      html += '<p class="asg-note">' + L.fill + '</p>';
      if (me && me.email) html += '<p class="asg-note">' + L.emailKept + (zh ? '：' : ': ') + esc(me.email) + '</p>';
      html += '<p class="asg-req">' + L.req + '</p><div class="asg-grid">' + field(L.name, 'asg-name') + field(L.city, 'asg-city') + roleSelect() + '</div>';
    }
    html += '<p class="asg-err" id="asg-err"></p><p class="asg-ok" id="asg-ok"></p>';
    html += '<p class="asg-tslab" id="asg-tslab">' + L.tsWait + '</p><div class="asg-ts"></div>';
    html += '<button type="button" class="asg-go" id="asg-go" aria-busy="false">' + action + '</button>';
    if (verified) html += '<p class="asg-hint">' + L.optin + '</p>';
    dropTs();
    body().innerHTML = html;
    if (me) { var n = body().querySelector('#asg-name'); if (n && me.name) n.value = me.name; var c = body().querySelector('#asg-city'); if (c && me.city) c.value = me.city; var rr = body().querySelector('#asg-role'); if (rr && me.role) rr.value = me.role; }
    body().querySelectorAll('[data-intent]').forEach(function (btn) { btn.onclick = function () { draft.intent = btn.getAttribute('data-intent'); ctxSet(draft); body().querySelectorAll('[data-intent]').forEach(function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); }); }; });
    var dateEl = body().querySelector('#asg-date'); if (dateEl) dateEl.onchange = function () { draft.date = dateEl.value; ctxSet(draft); };
    var noteEl = body().querySelector('#asg-notify'); if (noteEl) noteEl.onchange = function () { draft.notify = noteEl.checked; ctxSet(draft); };
    var dirEl = body().querySelector('#asg-dir'); if (dirEl) dirEl.onchange = function () { draft.transport = dirEl.checked; ctxSet(draft); };
    var go = body().querySelector('#asg-go');
    go.onclick = function () { submit(e, draft, go); };
    mountTs(body().querySelector('.asg-ts'));
    box.hidden = false;
  }
  var sitekeyP = null;
  function loadSitekey() {
    if (window.ATM_TS_KEY) return Promise.resolve(window.ATM_TS_KEY);
    if (sitekeyP) return sitekeyP;
    sitekeyP = fetch(API + '/social/going/config').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.sitekey) window.ATM_TS_KEY = d.sitekey;
      return window.ATM_TS_KEY || '';
    }).catch(function () { return ''; });
    return sitekeyP;
  }
  var TS_RESET_MAX = 3;
  function tsMessage(el) {
    var phase = el && el.dataset.phase;
    if (phase === 'challenge') return L.tsChallenge;
    if (phase === 'expired') return L.tsExpired;
    if (phase === 'timeout') return L.tsTimeout;
    return L.tsWait;
  }
  function clearTsNote() {
    var err = body().querySelector('#asg-err');
    if (!err) return;
    if (err.textContent === L.tsChallenge || err.textContent === L.tsExpired || err.textContent === L.tsTimeout || err.textContent === L.tsWait || err.textContent === L.tsVerify) err.textContent = '';
  }
  function paintTsLab(el) {
    var lab = body().querySelector('#asg-tslab');
    if (!lab) return;
    lab.hidden = !!(el && el.dataset.ready === '1' && !el.dataset.phase);
  }
  function wipeToken(el) {
    if (!el) return;
    el.dataset.ready = '';
    var inp = el.querySelector('[name="cf-turnstile-response"]');
    if (inp) inp.value = '';
  }
  function takeToken(el) {
    if (!el || el.dataset.ready !== '1' || el.dataset.phase) return '';
    var inp = el.querySelector('[name="cf-turnstile-response"]');
    var v = inp ? String(inp.value || '').trim() : '';
    if (!v) return '';
    el.dataset.ready = '';
    inp.value = '';
    return v;
  }
  function scheduleChallengeReset(el) {
    if (!el || el.dataset.resetQueued === '1') return;
    if (Number(el.dataset.resets || 0) >= TS_RESET_MAX) return;
    el.dataset.resetQueued = '1';
    setTimeout(function () {
      if (!el.isConnected) return;
      el.dataset.resetQueued = '';
      var n = Number(el.dataset.resets || 0);
      if (n >= TS_RESET_MAX) return;
      el.dataset.resets = String(n + 1);
      wipeToken(el);
      if (el.dataset.wid && window.turnstile) { try { window.turnstile.reset(el.dataset.wid); } catch (e) {} }
    }, 800);
  }
  function widgetById(wid) {
    var all = box.querySelectorAll('.asg-ts'), i;
    for (i = 0; i < all.length; i++) if (all[i].dataset.wid === String(wid)) return all[i];
    return null;
  }
  function releaseWidget(wid) {
    var el = wid ? widgetById(wid) : null;
    if (el) wipeToken(el);
    if (wid && window.turnstile) { try { window.turnstile.reset(wid); } catch (e) {} }
  }
  function dropTs() {
    var old = body().querySelector('.asg-ts');
    if (!old) return;
    var wid = old.dataset.wid;
    wipeToken(old);
    if (wid && window.turnstile) { try { window.turnstile.remove(wid); } catch (e) {} }
  }
  function mountTs(el) {
    loadSitekey().then(function (key) {
      if (!key || !el || !el.isConnected || el.dataset.ts) return;
      function render() {
        if (!window.turnstile || !el.isConnected || el.dataset.ts) return;
        el.dataset.ts = '1';
        el.dataset.ready = '';
        el.dataset.phase = '';
        el.dataset.resets = '0';
        var wid = window.turnstile.render(el, {
          sitekey: key,
          action: 'going',
          retry: 'never',
          callback: function () {
            if (!el.isConnected) return;
            el.dataset.ready = '1';
            el.dataset.phase = '';
            clearTsNote();
            paintTsLab(el);
          },
          'expired-callback': function () {
            if (!el.isConnected) return;
            el.dataset.phase = 'expired';
            wipeToken(el);
            paintTsLab(el);
            var err = body().querySelector('#asg-err'); if (err) err.textContent = L.tsExpired;
            scheduleChallengeReset(el);
          },
          'timeout-callback': function () {
            if (!el.isConnected) return;
            el.dataset.phase = 'timeout';
            wipeToken(el);
            paintTsLab(el);
            var err = body().querySelector('#asg-err'); if (err) err.textContent = L.tsTimeout;
            scheduleChallengeReset(el);
          },
          'error-callback': function () {
            if (!el.isConnected) return;
            el.dataset.phase = 'challenge';
            wipeToken(el);
            paintTsLab(el);
            var err = body().querySelector('#asg-err'); if (err) err.textContent = L.tsChallenge;
            scheduleChallengeReset(el);
          }
        });
        el.dataset.wid = wid == null ? '' : String(wid);
      }
      if (window.turnstile) render();
      else { var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = render; document.head.appendChild(s); }
    });
  }
  function submit(e, draft, go) {
    var err = body().querySelector('#asg-err'), ok = body().querySelector('#asg-ok');
    if (!err || !ok) return;
    if (go.dataset.busy === '1') return;
    err.textContent = ''; ok.textContent = '';
    if (draft.intent !== 'going' && draft.intent !== 'interested') { err.textContent = L.needIntent; return; }
    go.dataset.busy = '1';
    var tsEl = body().querySelector('.asg-ts');
    var ts = takeToken(tsEl);
    if (!ts) {
      go.dataset.busy = '';
      go.setAttribute('aria-busy', 'false');
      err.textContent = tsMessage(tsEl);
      var lab = body().querySelector('#asg-tslab');
      if (lab) lab.hidden = false;
      var mark = lab || tsEl;
      if (mark && mark.scrollIntoView) { try { mark.scrollIntoView({ block: 'nearest' }); } catch (e2) {} }
      return;
    }
    var wid = tsEl.dataset.wid || '';
    var payload = { id: e.id, intent: draft.intent, explicit: 1, disclose: 1, notify: body().querySelector('#asg-notify').checked ? 1 : 0, transport: (body().querySelector('#asg-dir') && body().querySelector('#asg-dir').checked) ? 1 : 0, date: (body().querySelector('#asg-date') || {}).value || draft.date || '', lang: zh ? 'zh' : 'en', ret: location.href.split('#')[0], ts: ts, dev: dev() };
    ['name', 'email', 'city'].forEach(function (k) { var el = body().querySelector('#asg-' + k); if (el) payload[k] = el.value.trim(); });
    var role = body().querySelector('#asg-role'); if (role) payload.role = role.value;
    ctxSet({ id: e.id, intent: draft.intent, date: payload.date, notify: payload.notify !== 0, transport: !!payload.transport });
    go.disabled = true;
    go.setAttribute('aria-busy', 'true');
    var settled = false;
    function finish(stay) {
      if (settled) return;
      settled = true;
      if (!stay || box.hidden) { shut(); return; }
      if (go.isConnected) { go.disabled = false; go.dataset.busy = ''; go.setAttribute('aria-busy', 'false'); }
      var lab = body().querySelector('#asg-tslab');
      if (lab) lab.hidden = false;
      releaseWidget(wid);
    }
    function mailBad(d) { return d.mail === 'failed' || d.mail === 'rate_limited' || d.mail === 'no_organizer'; }
    api('/social/going', payload).then(function (d) {
      var left = box.hidden;
      var savedOk = !!(d && d.ok && !d.confirm && !d.need_profile && !d.error && !mailBad(d));
      if (!left && err.isConnected) {
        if (d.confirm) ok.textContent = L.pending;
        else if (d.need_profile || d.error === 'need_city' || d.error === 'need_role' || d.error === 'need_name') err.textContent = L.fill;
        else if (d.error === 'no_organizer') err.textContent = L.grey;
        else if (d.error === 'turnstile') err.textContent = L.tsVerify;
        else if (!d.ok) err.textContent = L.again;
        else if (mailBad(d)) ok.textContent = L.fail;
      }
      if (savedOk) {
        refreshMine();
        if (!left) toast(statusText(d.mail));
        finish(false);
        return;
      }
      if (left) { finish(false); return; }
      if (d.ok && !d.confirm) refreshMine();
      finish(true);
    }).catch(function () { if (!box.hidden && err.isConnected) err.textContent = L.net; finish(!box.hidden); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var painting = false;
  function paint() {
    if (painting) return;
    painting = true;
    try { paintHearts(); } finally { painting = false; }
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
      else if (mine[id]) { b.setAttribute('aria-busy', 'false'); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-disabled', 'false'); var lab = L.manage + ' ' + (mine[id].intent === 'going' ? L.going : L.interested); b.title = lab; b.setAttribute('aria-label', lab); }
      else { b.setAttribute('aria-busy', 'false'); b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-disabled', 'false'); b.title = L.title; b.setAttribute('aria-label', L.title); }
    });
    document.querySelectorAll('.atm-star-n').forEach(function (n) { n.remove(); });
    queueReach();
  }
  function savedText(n) { return '☆ 已收藏 ' + n + ' 个活动'; }
  function syncSaved() {
    if (!zh) return;
    var t = savedText(Object.keys(mine).length);
    document.querySelectorAll('[data-atm-saved]').forEach(function (el) { if (el.textContent !== t) el.textContent = t; });
  }
  function paintBar() {
    var bar = document.querySelector('.atm-favbar'); if (!bar) { syncSaved(); return false; }
    var grid = document.querySelector('.atm-favgrid');
    var items = Object.keys(mine);
    var n = items.length;
    bar.classList.toggle('atm-on', n > 0);
    if (zh) {
      bar.innerHTML = '<b>' + L.bar + '</b><span class="atm-hint" data-atm-saved="1">' + savedText(n) + '</span>';
      syncSaved();
    } else if (!token()) { bar.innerHTML = '<b>★ ' + L.bar + '</b><span class="atm-hint">' + L.hint + '</span>'; if (grid) { grid.hidden = true; grid.innerHTML = ''; } return true; }
    else if (!n) { bar.innerHTML = '<b>★ ' + L.bar + '</b><span class="atm-hint">' + L.empty + '</span>'; if (grid) { grid.hidden = true; grid.innerHTML = ''; } return true; }
    else bar.innerHTML = '<b>★ ' + L.bar + ' (' + n + ')</b>';
    if (zh && !n) { if (grid) { grid.hidden = true; grid.innerHTML = ''; } return true; }
    if (grid) {
      grid.hidden = false; grid.innerHTML = '';
      items.forEach(function (id) {
        var row = mine[id], e = eventOf(id), a = document.createElement('a');
        a.className = 'tw-fc atm-favfc'; a.href = location.pathname + '?card=' + encodeURIComponent(id); a.setAttribute('data-fid', id);
        var name = titleOf(e) || id;
        a.innerHTML = '<span class="tw-fc-body"><strong>' + esc(name) + '</strong><span class="tw-fc-meta">' + esc((row.intent === 'going' ? L.going : L.interested) + (row.date ? ' · ' + row.date : '') + (row.notify ? '' : (zh ? ' · 不收更新' : ' · no updates'))) + '</span></span>';
        var btn = document.createElement('span'); btn.className = 'atm-heart'; btn.setAttribute('role', 'button'); btn.tabIndex = 0; btn.setAttribute('aria-pressed', 'true'); btn.title = L.manage; btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '"/></svg>';
        a.appendChild(btn); grid.appendChild(a);
      });
    }
    return true;
  }
  function refreshMine() {
    if (!token()) { me = null; mine = {}; drafts = {}; paint(); paintBar(); return Promise.resolve(); }
    return api('/social/going/mine').then(function (d) {
      if (d._s === 401) { try { localStorage.removeItem('atm_session'); } catch (e) {} me = null; mine = {}; drafts = {}; }
      else {
        me = { email: d.email, name: d.name, city: d.city, role: d.role };
        mine = {}; drafts = {};
        (d.items || []).forEach(function (it) { mine[it.id] = it; });
        (d.drafts || []).forEach(function (it) { drafts[it.id] = it; });
      }
      paint(); paintBar();
      if (reopen) { var id = reopen; reopen = ''; openId(id); }
    }).catch(function () {});
  }
  function openId(id) {
    var b = document.querySelector('[data-fid="' + id + '"], [data-sid="' + id + '"]');
    if (!b) { b = document.createElement('button'); b.setAttribute('data-fid', id); }
    open(b);
  }
  window.ATM_STAR = {
    take: function (b) {
      if (b.classList.contains('atm-star-off') || b.getAttribute('aria-disabled') === 'true') return true;
      var id = idOf(b), e = id ? eventOf(id) : null;
      if (!id || (e && hasEmail(e)) || reach[id] === true) { open(b); return true; }
      if (reach[id] === false) return true;
      awaitReach(id).then(function (v) { if (v === true) open(b); else paint(); });
      return true;
    },
    paintBar: paintBar, paint: paint, listed: function () { return Object.keys(mine).length; }
  };
  document.addEventListener('atm-more', function () { paint(); });
  readHash();
  ensureEvents();
  refreshMine();
  var mo = new MutationObserver(function () { if (!painting) paint(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
