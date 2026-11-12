/* Shared check-email state for the subscribe sheet and the star Going sheet.
   One wording, one grey button, one 60s resend link. */
(function () {
  var zh = document.documentElement.getAttribute('data-asia-lang') === 'zh';
  var RESEND_MS = 60000;
  var L = zh ? {
    sent: '确认邮件已发送',
    sending: '发送中…',
    resend: '没收到？重新发送',
    edit: '邮箱写错了？返回修改',
    used: '已重发过，请查收或稍后再试。'
  } : {
    sent: 'Confirmation email sent',
    sending: 'Sending…',
    resend: 'Didn\'t get it? Send again',
    edit: 'Wrong address? Edit it',
    used: 'Already resent. Please check your inbox, or try again later.'
  };
  function note(email) {
    var addr = email || '';
    return zh
      ? ('确认邮件已寄到 ' + addr + '，请到收件箱（也请查看垃圾邮件箱）点确认链接，30 分钟内有效。')
      : ('We sent a confirmation email to ' + addr + '. Please open it (check spam too) and tap the link within 30 minutes.');
  }
  var css = document.createElement('style');
  css.textContent = '.atm-sent-panel{margin:8px 0 0}.atm-sent-note{margin:0;color:#0a4f57;font-weight:700;font-size:.92rem;line-height:1.45}' +
    '.atm-sent-used{margin:8px 0 0;color:#5b5148;font-size:.82rem;line-height:1.45}' +
    '.atm-sent-links{display:flex;flex-direction:column;align-items:center;gap:2px;margin:8px 0 0}' +
    '.atm-sent-resend,.atm-sent-edit{margin:0;padding:4px 0;border:0;background:transparent;color:#0e6e78;font:600 .82rem/1.4 system-ui,sans-serif;text-decoration:underline;text-underline-offset:2px;cursor:pointer}' +
    '.atm-sent-panel[hidden],.atm-sent-links[hidden],.atm-sent-resend[hidden],.atm-sent-used[hidden],.atm-sent-edit[hidden]{display:none!important}' +
    '#tsub-modal [hidden]{display:none!important}' +
    '#tsub-modal .tsub-go.atm-sent-go:disabled,#atm-star .asg-go.atm-sent-go:disabled,button.atm-sent-go:disabled{background:#bdb6aa!important;color:#3f3a34!important;opacity:1!important;cursor:not-allowed}';
  document.head.appendChild(css);

  function uiOf(button) {
    var parent = button && button.parentNode;
    if (!parent) return {};
    var panel = parent.querySelector('.atm-sent-panel');
    return {
      panel: panel,
      links: parent.querySelector('.atm-sent-links'),
      note: panel && panel.querySelector('.atm-sent-note'),
      used: panel && panel.querySelector('.atm-sent-used'),
      resend: parent.querySelector('.atm-sent-resend'),
      edit: parent.querySelector('.atm-sent-edit')
    };
  }
  function ensure(button, noteId, resendId) {
    var parent = button.parentNode;
    var panel = parent.querySelector('.atm-sent-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'atm-sent-panel';
      panel.hidden = true;
      var p = document.createElement('p');
      p.className = 'atm-sent-note';
      panel.appendChild(p);
      var used = document.createElement('p');
      used.className = 'atm-sent-used';
      used.hidden = true;
      panel.appendChild(used);
      parent.insertBefore(panel, button);
    }
    var noteEl = panel.querySelector('.atm-sent-note');
    if (noteId) noteEl.id = noteId;
    var links = parent.querySelector('.atm-sent-links');
    if (!links) {
      links = document.createElement('div');
      links.className = 'atm-sent-links';
      links.hidden = true;
      var resend = document.createElement('button');
      resend.type = 'button';
      resend.className = 'atm-sent-resend';
      resend.hidden = true;
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'atm-sent-edit';
      links.appendChild(resend);
      links.appendChild(edit);
      if (button.nextSibling) parent.insertBefore(links, button.nextSibling);
      else parent.appendChild(links);
    }
    if (resendId) links.querySelector('.atm-sent-resend').id = resendId;
    return uiOf(button);
  }
  function clearTimer(button) {
    if (button && button._atmSentTimer) { clearTimeout(button._atmSentTimer); button._atmSentTimer = 0; }
  }
  function restore(button) {
    var snap = button && button._atmSentHide;
    if (snap) snap.forEach(function (s) { s.el.hidden = s.hidden; });
    if (button) button._atmSentHide = null;
  }
  function release(button, opt) {
    if (!button) return;
    clearTimer(button);
    restore(button);
    var ui = uiOf(button);
    if (ui.panel) ui.panel.hidden = true;
    if (ui.links) ui.links.hidden = true;
    button.dataset.sent = '';
    button.dataset.sentAt = '';
    button.dataset.busy = '';
    button.classList.remove('atm-sent-go');
    button.setAttribute('aria-busy', 'false');
    if (!opt || opt.enable !== false) {
      button.disabled = false;
      if (opt && opt.label) button.textContent = opt.label;
    }
  }
  function hold(opts) {
    var button = opts.button;
    if (!button) return;
    clearTimer(button);
    var ui = ensure(button, opts.noteId || '', opts.resendId || '');
    if (!button._atmSentHide) {
      var hide = opts.hide || [];
      button._atmSentHide = hide.map(function (el) { return { el: el, hidden: !!el.hidden }; });
      hide.forEach(function (el) { el.hidden = true; });
    }
    var at = opts.sentAt || Date.now();
    if (button.dataset.sent === '1' && button.dataset.sentAt) at = Number(button.dataset.sentAt) || at;
    else button.dataset.sentAt = String(at);
    button.disabled = true;
    button.dataset.sent = '1';
    button.dataset.busy = '';
    button.dataset.sentAddr = String(opts.match || opts.email || '');
    button.setAttribute('aria-busy', 'false');
    button.classList.add('atm-sent-go');
    button.textContent = L.sent;
    ui.panel.hidden = false;
    ui.links.hidden = false;
    ui.note.textContent = note(opts.email);
    ui.edit.hidden = false;
    ui.edit.textContent = L.edit;
    ui.resend.textContent = L.resend;
    ui.resend.hidden = true;
    if (opts.canResend === false) {
      ui.used.hidden = false;
      ui.used.textContent = L.used;
    } else {
      ui.used.hidden = true;
      var wait = Math.max(0, RESEND_MS - (Date.now() - at));
      button._atmSentTimer = setTimeout(function () {
        button._atmSentTimer = 0;
        if (!button.isConnected || button.dataset.sent !== '1') return;
        var again = uiOf(button);
        if (again.links) again.links.hidden = false;
        if (again.resend) again.resend.hidden = false;
      }, wait);
    }
    ui.resend.onclick = function () {
      if (button.dataset.sent !== '1') return;
      clearTimer(button);
      restore(button);
      ui.panel.hidden = true;
      ui.links.hidden = true;
      button.dataset.sent = '';
      button.dataset.sentAt = '';
      button.dataset.busy = '';
      button.classList.remove('atm-sent-go');
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
      button.textContent = opts.sendLabel || '';
      if (opts.onResend) opts.onResend();
    };
    ui.edit.onclick = function () {
      if (button.dataset.sent !== '1') return;
      restore(button);
      if (opts.onEdit) opts.onEdit();
    };
  }
  function arm(button, label) {
    if (!button || button.dataset.busy === '1' || button.dataset.sent === '1') return false;
    button.dataset.busy = '1';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('atm-sent-go');
    if (label) button.textContent = label;
    return true;
  }
  function disarm(button, label) {
    if (!button || button.dataset.sent === '1') return;
    button.dataset.busy = '';
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
    button.classList.remove('atm-sent-go');
    if (label) button.textContent = label;
  }
  function quiet(button) {
    clearTimer(button);
    var ui = uiOf(button);
    if (ui.links) ui.links.hidden = true;
    if (ui.used) ui.used.hidden = true;
  }
  window.ATM_MAIL_SENT = { L: L, note: note, RESEND_MS: RESEND_MS, hold: hold, release: release, arm: arm, disarm: disarm, quiet: quiet };
})();
