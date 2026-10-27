/* Asia map subscribe form (draft 2026-10-27). Entry button below search; modal styled like the old 添加活动 modal. */
(function () {
  var zh = document.documentElement.getAttribute('data-asia-lang') === 'zh';
  var API = window.TANGO_SUB_API || 'https://api.tangoweekend.org';
  var L = zh ? {
    btn: '✉ 订阅活动', title: '订阅探戈活动',
    desc: '每月一封活动汇总，包括常规活动和特色活动。也可以留下微信号，我们会邀请您加入探戈活动群。',
    email: '邮箱', emailPh: 'name@example.com', wx: '微信号', wxPh: '填微信号，不是昵称', hint: '至少填一项',
    need: '请填写邮箱或微信号，至少一项。', bad: '邮箱格式不正确', submit: '订阅', sending: '提交中…',
    okEmail: '验证邮件已发送，请在24小时内点击邮件里的链接确认订阅。', okWx: '已收到您的微信号，我们会尽快邀请您入群。',
    fail: '提交失败，请稍后再试。', foot: '随时可退订，不会把您的信息给别人。', close: '关闭'
  } : {
    btn: '✉ Subscribe', title: 'Subscribe to Tango Events',
    desc: "Get a monthly summary of regular and featured tango events across Asia. Or leave your WeChat ID and we'll invite you to our tango group.",
    email: 'Email', emailPh: 'name@example.com', wx: 'WeChat ID', wxPh: 'Your WeChat ID, not nickname', hint: 'Fill in at least one',
    need: 'Please enter an email or a WeChat ID.', bad: 'Please check your email address.', submit: 'Subscribe', sending: 'Sending…',
    okEmail: 'Check your inbox and click the link within 24 hours to confirm.', okWx: "Got it! We'll invite you to the WeChat group soon.",
    fail: 'Something went wrong. Please try again later.', foot: 'Unsubscribe anytime. We never share your info.', close: 'Close'
  };
  var css = '.tsub-row{display:flex;justify-content:center;margin:10px 0 0}' +
    '.tsub-open{background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;border-radius:999px;padding:7px 18px;font-size:.9rem;font-weight:700;cursor:pointer}' +
    '.tsub-open:hover{filter:brightness(1.1)}' +
    '#tsub-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}#tsub-modal[hidden]{display:none}' +
    '#tsub-modal .tsub-bg{position:absolute;inset:0;background:rgba(6,51,58,.6)}' +
    '#tsub-modal .tsub-dlg{position:relative;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px;padding:18px;max-width:440px;width:100%;box-sizing:border-box;box-shadow:0 16px 48px rgba(6,51,58,.35);max-height:94vh;overflow:auto}' +
    '#tsub-modal h2{font-family:var(--serif);color:#0a4f57;font-size:1.3rem;margin:0 30px 8px 0}' +
    '#tsub-modal .tsub-x{position:absolute;top:8px;right:10px;background:none;border:0;font-size:1.6rem;color:#7a6255;cursor:pointer}' +
    '#tsub-modal p.tsub-desc{margin:0 0 12px;font-size:.88rem;line-height:1.5;color:#2a1a14}' +
    '#tsub-modal label{display:block;font-size:.84rem;font-weight:700;color:#0a4f57;margin:8px 0 3px}' +
    '#tsub-modal input{width:100%;box-sizing:border-box;min-height:40px;padding:6px 10px;border:1px solid #ead9b8;border-radius:8px;font-size:16px;color:#2a1a14}' +
    '#tsub-modal input:focus{outline:none;border-color:#0e6e78;box-shadow:0 0 0 3px rgba(14,110,120,.18)}' +
    '#tsub-modal .tsub-hint{font-size:.8rem;color:#7a6255;margin:6px 0 0}' +
    '#tsub-modal .tsub-err{color:#b5654a;font-size:.85rem;margin:8px 0 0;min-height:1em}' +
    '#tsub-modal .tsub-ok{color:#0a4f57;font-size:.9rem;margin:8px 0 0;line-height:1.5}' +
    '#tsub-modal .tsub-go{width:100%;min-height:44px;margin-top:12px;border-radius:999px;font-size:1rem;background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;cursor:pointer}' +
    '#tsub-modal .tsub-go:disabled{opacity:.5}' +
    '#tsub-modal .tsub-foot{font-size:.78rem;color:#7a6255;margin:12px 0 0;padding-top:8px;border-top:1px dashed #ead9b8}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var row = document.createElement('div'); row.className = 'tsub-row';
  row.innerHTML = '<button type="button" class="tsub-open" id="tsub-open">' + L.btn + '</button>';
  var anchor = document.querySelector('#filters .wrap') || document.getElementById('filters');
  if (anchor) anchor.appendChild(row);

  var m = document.createElement('div'); m.id = 'tsub-modal'; m.hidden = true;
  m.innerHTML = '<div class="tsub-bg" data-x></div><div class="tsub-dlg" role="dialog" aria-modal="true" aria-labelledby="tsub-t">' +
    '<button type="button" class="tsub-x" data-x aria-label="' + L.close + '">&times;</button>' +
    '<h2 id="tsub-t">' + L.title + '</h2><p class="tsub-desc">' + L.desc + '</p>' +
    '<form id="tsub-f" novalidate><label for="tsub-e">' + L.email + '</label><input type="email" id="tsub-e" autocomplete="email" placeholder="' + L.emailPh + '">' +
    '<label for="tsub-w">' + L.wx + '</label><input type="text" id="tsub-w" autocomplete="off" placeholder="' + L.wxPh + '">' +
    '<p class="tsub-hint">' + L.hint + '</p><p class="tsub-err" id="tsub-err" aria-live="polite"></p>' +
    '<button type="submit" class="tsub-go" id="tsub-go">' + L.submit + '</button><div class="tsub-ok" id="tsub-ok" aria-live="polite" hidden></div></form>' +
    '<p class="tsub-foot">' + L.foot + '</p></div>';
  document.body.appendChild(m);
  var $ = function (id) { return document.getElementById(id); };
  function open() { m.hidden = false; $('tsub-e').focus(); }
  function close() { m.hidden = true; }
  $('tsub-open').addEventListener('click', open);
  m.addEventListener('click', function (e) { if (e.target.hasAttribute('data-x')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) close(); });
  if (location.hash === '#subscribe') open();

  $('tsub-f').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('tsub-e').value.trim(), wx = $('tsub-w').value.trim(), err = $('tsub-err'), ok = $('tsub-ok'), go = $('tsub-go');
    err.textContent = ''; ok.hidden = true;
    if (!em && !wx) { err.textContent = L.need; return; }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err.textContent = L.bad; return; }
    go.disabled = true; go.textContent = L.sending;
    fetch(API + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em, wechat: wx, lang: zh ? 'zh' : 'en' }) })
      .then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); })
      .then(function (x) {
        var lines = [];
        if (x.d.email === 'sent') lines.push(L.okEmail);
        if (x.d.wechat === 'stored') lines.push(L.okWx);
        if (x.d.error === 'bad_email') err.textContent = L.bad;
        else if (x.d.error === 'need_one') err.textContent = L.need;
        else if (x.d.error) err.textContent = L.fail;
        if (lines.length) { ok.innerHTML = lines.map(function (s) { return '<p style="margin:0 0 4px">' + s + '</p>'; }).join(''); ok.hidden = false; $('tsub-f').reset(); }
      })
      .catch(function () { err.textContent = L.fail; })
      .then(function () { go.disabled = false; go.textContent = L.submit; });
  });
})();
