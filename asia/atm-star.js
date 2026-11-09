/* Star intent. Replaces the local heart as the way to say Going or Interested.
   The star stays disabled when the card has no organizer email. Counts are verified
   Going+Interested people, one per email, from /social/going/counts. */
(function () {
  var R = document.documentElement;
  var zh = /^zh/i.test(R.getAttribute('data-asia-lang') || document.body.getAttribute('data-lang') || R.lang || '') || location.pathname.indexOf('/zh/') === 0;
  var API = (window.ATM_SOCIAL_API || window.TANGO_SUB_API || 'https://api.tangoweekend.org');
  var STAR = 'M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1 6.8 18.6l1-5.8L3.6 8.7l5.8-.8z';
  var L = zh ? {
    grey: '组织者尚未提供邮箱',
    title: '你的活动意向',
    explain: '五角星表示参加意向，不是点赞，也不是购票或正式报名。',
    going: 'Going · 要参加', interested: 'Interested · 感兴趣',
    notify: '收本活动更新（可关）',
    scope: '早鸟／截止／异动／已审核主办消息等。与一般通知偏好分开；不等于订阅全站。',
    transport: '请组织者寄送前往场地的交通指引（可选）',
    noPromise: '组织者自行回复，不保证送达或回复时间。',
    disclose: '确认后，系统将把你的姓名、邮箱与意向发给本活动组织者，并抄送 Selecttango@gmail.com。城市与角色不会默认转交。',
    discloseDate: '确认后，系统将把你的姓名、邮箱、意向和场次日期发给本活动组织者，并抄送 Selecttango@gmail.com。若勾选交通指引，请求会一并转交。城市与角色不会默认转交。',
    submit: '确认意向', needIntent: '请选择 Going 或 Interested。',
    profileTitle: '完成资料以继续',
    profileDesc: '验证通过后将返回「{event}」，再确认你的 Going／Interested。仅完成验证不会通知组织者。',
    name: '姓名（必填）', email: '邮箱（必填）', city: '城市（必填）', role: '角色（必填）',
    rl: '引带（Leader）', rf: '跟随（follower）', rb: '两者皆可（both）', rolePh: '请选择',
    once: '同一设备验证通过后，再选 Going／Interested 无需重复验证。',
    verifyBtn: '发送验证邮件', pending: '验证邮件已发出，请查收。未验证前不会亮星，也不会通知组织者。',
    resend: '重新发送验证邮件',
    saved: '邮箱已验证，资料已保存。可到活动五角星选择 Going／Interested。',
    sent: '已记录你的意向。已向组织者发送通知（含抄送）。',
    unchanged: '意向已保存。相同意向已经通知过组织者，这次没有再发信。',
    fail: '意向已保存；通知邮件发送失败，请稍后重试。',
    queued: '意向已保存；通知邮件排队中，请稍后查看。',
    fill: '请补全城市与角色等信息后继续。无需再次验证同一邮箱。',
    bar: '我的活动意向', manage: '管理意向', cancel: '取消意向',
    cancelAsk: '取消意向？这不会再发邮件给组织者，也不会撤回已经发出的信。',
    cancelled: '已取消意向。没有新的邮件发给组织者。',
    restore: '用邮箱恢复登录', restoreSent: '如果这个邮箱已验证，恢复链接已发出。输入邮箱本身不会登录。',
    unsub: '退订本活动更新（不会取消你的 Going／Interested）',
    date: '参加日期（北京时间 UTC+8）', close: '关闭',
    hint: '点五角星选择 Going 或 Interested。验证邮箱后，意向会显示在这里，并可在其他设备恢复。',
    empty: '还没有活动意向。',
    notTicket: 'Going 不是购票或正式报名。'
  } : {
    grey: 'Organizer email not available yet',
    title: 'Your event intent',
    explain: 'The star means intent to attend—not a like, ticket purchase, or formal registration.',
    going: 'Going · I’ll attend', interested: 'Interested · I’m interested',
    notify: 'Get updates for this event (optional)',
    scope: 'Early-bird, deadlines, changes, reviewed host messages. Separate from general prefs; not a site-wide subscription.',
    transport: 'Ask the organizer for venue directions (optional)',
    noPromise: 'The organizer replies directly. Delivery and timing are not guaranteed.',
    disclose: 'On confirm, we’ll send your name, email, and intent to the organizer, CC Selecttango@gmail.com. City and role are not shared by default.',
    discloseDate: 'On confirm, we’ll send your name, email, intent, and the date to the organizer, CC Selecttango@gmail.com. A directions request is included only if you check it. City and role are not shared by default.',
    submit: 'Confirm intent', needIntent: 'Choose Going or Interested.',
    profileTitle: 'Complete your profile to continue',
    profileDesc: 'After verification you will return to “{event}” to confirm Going or Interested. Verifying alone does not notify the organizer.',
    name: 'Name (required)', email: 'Email (required)', city: 'City (required)', role: 'Role (required)',
    rl: 'Leader', rf: 'follower', rb: 'both', rolePh: 'Choose',
    once: 'After one verification on this device, you won’t need to verify again to choose Going or Interested.',
    verifyBtn: 'Send verification email', pending: 'Verification email sent. We won’t light the star or notify the organizer until you verify.',
    resend: 'Resend verification email',
    saved: 'Email verified. Profile saved. Use the star on an event to choose Going or Interested.',
    sent: 'Your intent is saved. The organizer has been notified (with CC).',
    unchanged: 'Intent saved. The organizer was already notified, so nothing new was sent.',
    fail: 'Intent saved; notification failed to send. Please try again later.',
    queued: 'Intent saved; notification is queued. Check again later.',
    fill: 'Please complete city, role, and any missing fields. No need to re-verify the same email.',
    bar: 'My event intents', manage: 'Manage intent', cancel: 'Cancel intent',
    cancelAsk: 'Cancel this intent? We will not email the organizer again, and mail already sent is not recalled.',
    cancelled: 'Intent cancelled. No new email was sent to the organizer.',
    restore: 'Restore access with email', restoreSent: 'If this email is verified, a restore link is on its way. Typing the address does not sign you in.',
    unsub: 'Unsubscribe from this event’s updates (keeps your Going / Interested)',
    date: 'Date (Beijing time, UTC+8)', close: 'Close',
    hint: 'Tap the star to choose Going or Interested. After you verify your email, intents show here and restore on your other devices.',
    empty: 'No event intents yet.',
    notTicket: 'Going is not a ticket or a formal registration.'
  };
  var css = document.createElement('style');
  css.textContent = '.atm-heart svg path{d:path("' + STAR + '")}.atm-heart path{fill:none;stroke:#b8913a;stroke-width:1.6;stroke-linejoin:round}.atm-heart[aria-pressed="true"] path{fill:#b8913a;stroke:#b8913a}' +
    '.atm-heart.atm-star-off{opacity:1;cursor:not-allowed;background:#e7e2da}.atm-heart.atm-star-off path{stroke:#b0a89c;fill:none}' +
    'html.atm-p10 #atm-c1bar .p10-heart.atm-star-off{cursor:not-allowed!important;background:transparent!important}html.atm-p10 #atm-c1bar .p10-heart.atm-star-off path{fill:none!important;stroke:#b0a89c!important}' +
    '.atm-star-n{position:absolute;z-index:5;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#0e6e78;color:#fff;font:700 11px/18px system-ui,sans-serif;text-align:center;pointer-events:none}' +
    '.ev-card>.atm-star-n,.atm-favfc>.atm-star-n,.tw-fc>.atm-star-n{top:10px;right:44px}.p10-heart+.atm-star-n,.atm-star-n.atm-star-inline{position:static;margin-right:6px}' +
    '#atm-star{position:fixed;inset:0;z-index:3000;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,51,58,.55)}#atm-star[hidden]{display:none}' +
    '#atm-star .asg{background:#fffdf8;width:100%;max-width:480px;max-height:92dvh;overflow:auto;border-radius:16px 16px 0 0;padding:16px 16px 22px;box-sizing:border-box;color:#2a1a14}' +
    '@media(min-width:700px){#atm-star{align-items:center}#atm-star .asg{border-radius:16px;max-height:88vh}}' +
    '#atm-star h2{font:700 1.15rem Georgia,serif;color:#0a4f57;margin:0 28px 8px 0}#atm-star p{margin:6px 0;line-height:1.45;font-size:.92rem}' +
    '#atm-star label.asg-l{display:block;font-weight:700;color:#0a4f57;margin:10px 0 4px;font-size:.84rem}' +
    '#atm-star input,#atm-star select{width:100%;box-sizing:border-box;min-height:44px;font-size:16px;padding:8px 10px;border:1px solid #ead9b8;border-radius:8px}' +
    '#atm-star .asg-opt{display:flex;gap:8px;margin:8px 0}#atm-star .asg-opt button{flex:1;min-height:44px;border:1px solid #0e6e78;background:#fff;color:#0e6e78;border-radius:10px;font-weight:700}' +
    '#atm-star .asg-opt button[aria-pressed="true"]{background:#0e6e78;color:#f6e3b4}' +
    '#atm-star .asg-go,#atm-star .asg-x2{min-height:44px;border-radius:999px;font-weight:700;border:0;width:100%;margin-top:10px}#atm-star .asg-go{background:#0e6e78;color:#f6e3b4}#atm-star .asg-x2{background:#f3ece0;color:#2a1a14}' +
    '#atm-star .asg-x{position:absolute;top:8px;right:8px;width:44px;height:44px;border:0;background:transparent;font-size:28px;color:#7a6255}' +
    '#atm-star .asg-err{color:#b5654a;min-height:1.2em}#atm-star .asg-ok{color:#0a4f57;font-weight:700}#atm-star .asg-check{display:flex;gap:8px;align-items:flex-start;margin:8px 0;font-size:.88rem}#atm-star .asg-check input{width:auto;min-height:0;margin-top:3px}' +
    '.atm-favbar b{color:#0a4f57}';
  document.head.appendChild(css);

  var counts = {}, mine = {}, me = null, ready = false, eventsP = null;
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
  box.addEventListener('click', function (e) { if (e.target === box || (e.target.closest && e.target.closest('[data-x]'))) box.hidden = true; });
  function h2() { return box.querySelector('h2'); }
  function body() { return box.querySelector('.asg-body'); }
  function field(label, id, type) {
    return '<label class="asg-l" for="' + id + '">' + label + '</label><input id="' + id + '" ' + (type === 'email' ? 'type="email" autocomplete="email"' : 'type="text"') + ' maxlength="80">';
  }
  function roleSelect() {
    return '<label class="asg-l" for="asg-role">' + L.role + '</label><select id="asg-role"><option value="">' + L.rolePh + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select>';
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
    if (g === 'sent') toast(L.sent);
    else if (g === 'fail') toast(L.fail);
    else if (g === 'unchanged') toast(L.unchanged);
    else if (g === 'none') toast(L.saved);
    if (m) refreshMine();
  }
  function toast(text) { var t = document.createElement('div'); t.className = 'atm-toast'; t.setAttribute('role', 'status'); t.textContent = text; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200); }
  function open(b) {
    var id = idOf(b); if (!id) return;
    var e = eventOf(id);
    if (!e) { ensureEvents().then(function () { open(b); }); return; }
    if (!hasEmail(e)) return;
    var saved = mine[id];
    var draft = ctxGet(); if (!draft || draft.id !== id) draft = { id: id, intent: saved ? saved.intent : '', date: saved ? saved.date : '', notify: saved ? saved.notify : true, transport: saved ? !!saved.transport : false };
    ctxSet(draft);
    h2().textContent = saved ? L.manage : L.title;
    var dates = datesOf(e), reg = regular(e);
    var html = '<p>' + L.explain + '</p><p><b>' + esc(titleOf(e)) + '</b>' + (reg && dates[0] ? ' · ' + esc(draft.date || dates[0]) : '') + '</p><p>' + L.notTicket + '</p>';
    html += '<div class="asg-opt"><button type="button" data-intent="going" aria-pressed="' + (draft.intent === 'going') + '">' + L.going + '</button><button type="button" data-intent="interested" aria-pressed="' + (draft.intent === 'interested') + '">' + L.interested + '</button></div>';
    if (reg && dates.length) {
      html += '<label class="asg-l" for="asg-date">' + L.date + '</label><select id="asg-date">';
      dates.forEach(function (d) { html += '<option value="' + d + '"' + ((draft.date || dates[0]) === d ? ' selected' : '') + '>' + d + '</option>'; });
      html += '</select>';
    }
    html += '<label class="asg-check"><input type="checkbox" id="asg-notify"' + (draft.notify !== false ? ' checked' : '') + '>' + L.notify + '</label><p>' + L.scope + '</p>';
    if (reg) html += '<label class="asg-check"><input type="checkbox" id="asg-dir"' + (draft.transport ? ' checked' : '') + '>' + L.transport + '</label><p>' + L.noPromise + '</p>';
    var needProfile = !me || !me.city || !me.role || !me.name;
    if (!token()) {
      html += '<h2 style="font-size:1rem">' + L.profileTitle + '</h2><p>' + L.profileDesc.replace('{event}', esc(titleOf(e))) + '</p>';
      html += field(L.name, 'asg-name') + field(L.email, 'asg-email', 'email') + field(L.city, 'asg-city') + roleSelect();
      html += '<p>' + L.once + '</p><p><button type="button" class="asg-x2" id="asg-restore">' + L.restore + '</button></p>';
    } else if (needProfile) {
      html += '<p>' + L.fill + '</p>' + field(L.name, 'asg-name') + field(L.city, 'asg-city') + roleSelect();
    }
    html += '<p>' + (reg ? L.discloseDate : L.disclose) + '</p>';
    html += '<p class="asg-err" id="asg-err"></p><p class="asg-ok" id="asg-ok"></p>';
    html += '<button type="button" class="asg-go" id="asg-go">' + L.submit + '</button>';
    if (saved) html += '<button type="button" class="asg-x2" id="asg-cancel">' + L.cancel + '</button>';
    html += '<div class="asg-ts"></div>';
    body().innerHTML = html;
    if (me) { var n = body().querySelector('#asg-name'); if (n && me.name) n.value = me.name; var c = body().querySelector('#asg-city'); if (c && me.city) c.value = me.city; var rr = body().querySelector('#asg-role'); if (rr && me.role) rr.value = me.role; }
    body().querySelectorAll('[data-intent]').forEach(function (btn) { btn.onclick = function () { draft.intent = btn.getAttribute('data-intent'); ctxSet(draft); body().querySelectorAll('[data-intent]').forEach(function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); }); }; });
    var dateEl = body().querySelector('#asg-date'); if (dateEl) dateEl.onchange = function () { draft.date = dateEl.value; ctxSet(draft); };
    var go = body().querySelector('#asg-go');
    go.onclick = function () { submit(e, draft, go); };
    var cancel = body().querySelector('#asg-cancel');
    if (cancel) cancel.onclick = function () { if (!window.confirm(L.cancelAsk)) return; api('/social/going/cancel', { id: id, explicit: 1 }).then(function (d) { if (d.ok && d.cancelled) { delete mine[id]; paint(); body().querySelector('#asg-ok').textContent = L.cancelled; } }); };
    var restore = body().querySelector('#asg-restore');
    if (restore) restore.onclick = function () {
      var em = (body().querySelector('#asg-email') || {}).value || '';
      api('/social/going/restore', { email: em.trim(), ret: location.href.split('#')[0], ts: tsToken(), lang: zh ? 'zh' : 'en' }).then(function (d) {
        var err = body().querySelector('#asg-err'), ok = body().querySelector('#asg-ok');
        if (d.confirm) { ok.textContent = L.restoreSent; err.textContent = ''; } else err.textContent = d.error || L.fail;
      });
    };
    mountTs(body().querySelector('.asg-ts'));
    box.hidden = false;
  }
  function tsToken() {
    var inp = box.querySelector('[name="cf-turnstile-response"]');
    return inp ? inp.value : '';
  }
  function mountTs(el) {
    var key = window.ATM_TS_KEY || '';
    if (!key || !el || el.dataset.ts) return;
    function render() { if (!window.turnstile || el.dataset.ts) return; el.dataset.ts = '1'; window.turnstile.render(el, { sitekey: key }); }
    if (window.turnstile) render();
    else { var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = render; document.head.appendChild(s); }
  }
  function submit(e, draft, go) {
    var err = body().querySelector('#asg-err'), ok = body().querySelector('#asg-ok');
    err.textContent = ''; ok.textContent = '';
    if (draft.intent !== 'going' && draft.intent !== 'interested') { err.textContent = L.needIntent; return; }
    var payload = { id: e.id, intent: draft.intent, explicit: 1, disclose: 1, notify: body().querySelector('#asg-notify').checked ? 1 : 0, transport: (body().querySelector('#asg-dir') && body().querySelector('#asg-dir').checked) ? 1 : 0, date: (body().querySelector('#asg-date') || {}).value || draft.date || '', lang: zh ? 'zh' : 'en', ret: location.href.split('#')[0], ts: tsToken(), dev: dev() };
    ['name', 'email', 'city'].forEach(function (k) { var el = body().querySelector('#asg-' + k); if (el) payload[k] = el.value.trim(); });
    var role = body().querySelector('#asg-role'); if (role) payload.role = role.value;
    ctxSet({ id: e.id, intent: draft.intent, date: payload.date, notify: payload.notify !== 0, transport: !!payload.transport });
    go.disabled = true;
    api('/social/going', payload).then(function (d) {
      go.disabled = false;
      if (d.confirm) { ok.textContent = L.pending; return; }
      if (d.need_profile || d.error === 'need_city' || d.error === 'need_role' || d.error === 'need_name') { err.textContent = L.fill; return; }
      if (d.error === 'no_organizer') { err.textContent = L.grey; return; }
      if (!d.ok) { err.textContent = d.error || L.fail; return; }
      ok.textContent = statusText(d.mail);
      refreshMine();
    }).catch(function () { go.disabled = false; err.textContent = L.fail; });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function paint() {
    document.querySelectorAll('.atm-heart').forEach(function (b) {
      if (!b.querySelector('path')) return;
      var path = b.querySelector('path'); if (path && path.getAttribute('d') !== STAR) path.setAttribute('d', STAR);
      var id = idOf(b); if (!id) return;
      var e = eventOf(id); var known = !!(e || ready);
      var ok = !!(e && hasEmail(e));
      b.classList.toggle('atm-star-off', known && !ok);
      if (known && !ok) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-pressed', 'false'); b.title = L.grey; b.setAttribute('aria-label', L.grey); }
      else if (mine[id]) { b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-disabled', 'false'); var lab = L.manage + ' ' + (mine[id].intent === 'going' ? 'Going' : 'Interested'); b.title = lab; b.setAttribute('aria-label', lab); }
      else { b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-disabled', 'false'); b.title = L.title; b.setAttribute('aria-label', L.title); }
      var n = counts[id] || 0; var badge = b.parentNode && b.parentNode.querySelector(':scope>.atm-star-n[data-for="' + id + '"]');
      if (n > 0) { if (!badge && b.parentNode) { badge = document.createElement('span'); badge.className = 'atm-star-n' + (b.classList.contains('p10-heart') ? ' atm-star-inline' : ''); badge.setAttribute('data-for', id); b.parentNode.insertBefore(badge, b); } if (badge) badge.textContent = String(n); }
      else if (badge) badge.remove();
    });
  }
  function paintBar() {
    var bar = document.querySelector('.atm-favbar'); if (!bar) return false;
    var grid = document.querySelector('.atm-favgrid');
    var items = Object.keys(mine);
    bar.classList.toggle('atm-on', items.length > 0);
    if (!token()) { bar.innerHTML = '<b>★ ' + L.bar + '</b><span class="atm-hint">' + L.hint + '</span>'; if (grid) { grid.hidden = true; grid.innerHTML = ''; } return true; }
    if (!items.length) { bar.innerHTML = '<b>★ ' + L.bar + '</b><span class="atm-hint">' + L.empty + '</span>'; if (grid) { grid.hidden = true; grid.innerHTML = ''; } return true; }
    bar.innerHTML = '<b>★ ' + L.bar + (zh ? '（' + items.length + '）' : ' (' + items.length + ')') + '</b>';
    if (grid) {
      grid.hidden = false; grid.innerHTML = '';
      items.forEach(function (id) {
        var row = mine[id], e = eventOf(id), a = document.createElement('a');
        a.className = 'tw-fc atm-favfc'; a.href = location.pathname + '?card=' + encodeURIComponent(id); a.setAttribute('data-fid', id);
        var name = titleOf(e) || id;
        a.innerHTML = '<span class="tw-fc-body"><strong>' + esc(name) + '</strong><span class="tw-fc-meta">' + esc((row.intent === 'going' ? 'Going' : 'Interested') + (row.date ? ' · ' + row.date : '') + (row.notify ? '' : (zh ? ' · 不收更新' : ' · no updates'))) + '</span></span>';
        var btn = document.createElement('span'); btn.className = 'atm-heart'; btn.setAttribute('role', 'button'); btn.tabIndex = 0; btn.setAttribute('aria-pressed', 'true'); btn.title = L.manage; btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '"/></svg>';
        a.appendChild(btn); grid.appendChild(a);
      });
    }
    return true;
  }
  function refreshCounts() {
    var ids = []; document.querySelectorAll('.ev-card[data-id],.atm-heart').forEach(function (el) { var id = el.getAttribute('data-id') || idOf(el); if (id && ids.indexOf(id) < 0) ids.push(id); });
    if (!ids.length) return;
    api('/social/going/counts?ids=' + encodeURIComponent(ids.slice(0, 80).join(','))).then(function (d) { counts = d.counts || {}; paint(); }).catch(function () {});
  }
  function refreshMine() {
    if (!token()) { me = null; mine = {}; paint(); paintBar(); return; }
    api('/social/going/mine').then(function (d) {
      if (d._s === 401) { try { localStorage.removeItem('atm_session'); } catch (e) {} me = null; mine = {}; }
      else { me = { email: d.email, name: d.name, city: d.city, role: d.role }; mine = {}; (d.items || []).forEach(function (it) { mine[it.id] = it; }); }
      paint(); paintBar();
    }).catch(function () {});
  }
  window.ATM_STAR = {
    take: function (b) { if (b.classList.contains('atm-star-off') || b.getAttribute('aria-disabled') === 'true') return true; open(b); return true; },
    paintBar: paintBar, paint: paint
  };
  document.addEventListener('atm-more', function () { paint(); refreshCounts(); });
  readHash();
  ensureEvents();
  refreshMine();
  refreshCounts();
  setInterval(refreshCounts, 60000);
  var moWait = 0; var mo = new MutationObserver(function () { paint(); if (moWait++ % 8 === 0) refreshCounts(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
