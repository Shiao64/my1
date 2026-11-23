// 探戈通 TP sign-in helpers shared by the login, management and check-in pages (docs/tangopass.md, step 2, 2026-11-23).
// One identity per phone: tp_dev = this phone's key (dev:…), tp_key = the personal link's key, tp_who = {name, role}.
// The platform admin keeps the long password (bstw_admin) and does not use any of this.
(function () {
  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function put(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  var ROLE = { owner: '管理员', chief: '总管', deputy: '经理', manager: '现场经理', desk: '前台' };
  var UP = { chief: '管理员', deputy: '总管', manager: '经理或总管', desk: '经理或总管' };
  function bjTime(iso) { return iso ? new Date(Date.parse(iso) + 288e5).toISOString().slice(11, 16) : ''; }
  function bjDay(iso) { return iso ? new Date(Date.parse(iso) + 288e5).toISOString().slice(0, 16).replace('T', ' ').replace(/-/g, '/') : ''; }
  function who() { try { return JSON.parse(get('tp_who') || 'null'); } catch (e) { return null; } }
  var TP = {
    ROLE: ROLE,
    dev: function () { return get('tp_dev'); },
    key: function () { return get('tp_key'); },
    who: who,
    owner: function () { return get('bstw_admin'); },
    signedIn: function (d, key) { put('tp_dev', d.token); put('tp_key', key); put('tp_who', JSON.stringify({ name: d.name, role: d.role })); put('bstw_staff', ''); },
    // leaving keeps the link's key on this phone, so the same person can come back with the password alone
    out: function (forget) { put('tp_dev', ''); if (forget) { put('tp_key', ''); put('tp_who', ''); } },
    keyFromUrl: function () {
      var h = /^#(?:k=)?([0-9a-f]{48})$/.exec(location.hash || ''), q = new URLSearchParams(location.search).get('k') || '';
      return h ? h[1] : /^[0-9a-f]{48}$/.test(q) ? q : '';
    },
    loginUrl: function (key, api) { return '../in/?k=' + encodeURIComponent(key || '') + (api ? '&api=' + encodeURIComponent(api) : ''); },
    up: function (role) { return UP[role] || '经理或总管'; },
    bjTime: bjTime, bjDay: bjDay,
    // why a phone was signed out (the server keeps a row per phone so it can say)
    gone: function (d, role) {
      var up = UP[role || (who() || {}).role] || '经理或总管', w = d && d.why;
      if (w === 'replaced') return '你在另一台手机登入了（北京时间 ' + bjTime(d.at) + '），这台已经退出。';
      if (w === 'reset') return '你的账号已被重设，这台已经退出。请向' + up + '拿新的链接和临时密码。';
      if (w === 'deleted') return '你已经被删除，这台已经退出。';
      if (w === 'role') return '你的职务改了，这台已经退出。请用链接重新登入。';
      if (w === 'stopped') return '连错 10 次，已停用。请找' + up + '按「重设」。';
      if (w === 'ended') return '活动已经结束，这个账号已失效。';
      if (w === 'logout') return '这台已经退出。';
      return '这台已经退出，请重新登入。';
    },
    // a refused password: how many tries are left, until when it is locked
    pinText: function (d) {
      if (!d) return '';
      if (d.error === 'wrong_pin') return '密码不对。再错 ' + d.left + ' 次' + (d.then === 'stop' ? '会停用，要' + (UP[(who() || {}).role] || '上级') + '重设' : '会锁 15 分钟') + '。';
      if (d.error === 'locked') return '连错 5 次，已锁住。北京时间 ' + bjTime(d.until) + ' 以后再试。';
      if (d.error === 'stopped') return '连错 10 次，已停用。请找' + (UP[(who() || {}).role] || '上级') + '按「重设」。';
      if (d.error === 'network') return '连不上后台，请检查网络再试。';
      return '';
    },
    weak: function (why) {
      return { same: '不能全是同一个数字', run: '不能是连号（123456、654321 这类）', repeat: '不能是重复的（121212、123123、112233 这类）', common: '这个太常见了', temp: '不能和临时密码一样', format: '要六位数字' }[why] || '太简单了';
    },
    // A sheet asking for the six digits. check(pin) does the real request and resolves {value} to close, or {msg} to stay open.
    pin: function (o) {
      return new Promise(function (done) {
        var box = document.createElement('div');
        box.className = 'tp-dim';
        box.innerHTML = '<form class="tp-sheet" autocomplete="off"><h3></h3><p class="tp-note"></p>' +
          '<input class="tp-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" aria-label="六位密码">' +
          '<p class="tp-err" role="alert"></p><div class="tp-acts"><button class="tp-ok" type="submit">确定</button><button class="tp-no" type="button">取消</button></div></form>';
        box.querySelector('h3').textContent = o.title || '请再输一次密码';
        box.querySelector('.tp-note').textContent = o.note || '';
        document.body.appendChild(box);
        var f = box.querySelector('form'), inp = box.querySelector('input'), err = box.querySelector('.tp-err'), ok = box.querySelector('.tp-ok'), busy = false;
        function end(v) { box.remove(); done(v); }
        inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); err.textContent = ''; if (inp.value.length === 6 && !busy) f.requestSubmit ? f.requestSubmit() : ok.click(); });
        box.querySelector('.tp-no').addEventListener('click', function () { if (!busy) end(null); });
        f.addEventListener('submit', function (e) {
          e.preventDefault(); if (busy) return;
          if (!/^\d{6}$/.test(inp.value)) { err.textContent = '要六位数字'; return; }
          if (!o.check) return end(inp.value);
          busy = true; ok.disabled = true;
          Promise.resolve(o.check(inp.value)).then(function (r) {
            busy = false; ok.disabled = false;
            if (r && 'value' in r) return end(r.value);
            err.textContent = (r && r.msg) || '没成功'; inp.value = ''; inp.focus();
            if (r && r.stop) { ok.disabled = true; inp.disabled = true; }
          }, function () { busy = false; ok.disabled = false; err.textContent = '连不上后台，请检查网络再试。'; });
        });
        setTimeout(function () { inp.focus(); }, 30);
      });
    }
  };
  var css = document.createElement('style');
  css.textContent = '.tp-dim{position:fixed;inset:0;background:rgba(30,10,8,.55);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:14vh 14px 0}' +
    '.tp-sheet{background:#fff;border-radius:16px;padding:18px;width:100%;max-width:380px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:16px/1.5 -apple-system,"PingFang SC","Hiragino Sans GB",sans-serif;color:#2a1a14}' +
    '.tp-sheet h3{margin:0 0 4px;font-size:19px;color:#4a0609}.tp-note{margin:0 0 12px;color:#7a6255;font-size:14px}' +
    '.tp-pin{width:100%;box-sizing:border-box;font-size:28px;letter-spacing:.6em;text-align:center;padding:10px;border:2px solid #ead9b8;border-radius:10px}' +
    '.tp-pin:focus{outline:none;border-color:#4a0609}.tp-err{min-height:1.4em;margin:8px 0 0;color:#8a0f15;font-size:14px}' +
    '.tp-acts{display:flex;gap:10px;margin-top:10px}.tp-acts button{flex:1;padding:12px;border-radius:10px;font-size:16px;font-weight:700;border:2px solid #4a0609;background:#fff;color:#4a0609}' +
    '.tp-acts .tp-ok{background:#4a0609;color:#fff}.tp-acts button:disabled{opacity:.5}';
  document.head.appendChild(css);
  window.TP = TP;
})();
