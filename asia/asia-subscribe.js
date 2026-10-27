/* Asia map "event alerts" form (draft). Collect only: POST to api.tangoweekend.org, which stores in D1 and notifies the owner. */
(function () {
  var zh = document.documentElement.getAttribute('data-asia-lang') === 'zh';
  var API = window.TANGO_SUB_API || 'https://api.tangoweekend.org';
  var UI = window.CHINA_UI || {};
  var L = zh ? {
    btn: '✉ 订阅活动提醒', title: '订阅活动提醒', types: '活动类型', feat: '特色活动', reg: '常规活动',
    city: '城市', cityPh: '＋ 添加城市（不加就是全部城市）', noCity: '没有匹配的城市',
    email: '邮箱', emailPh: 'name@example.com', wx: '微信名', wxPh: '您的微信名', hint: '邮箱和微信名至少填一项',
    needType: '请至少选一种活动类型。', need: '请填写邮箱或微信名，至少一项。', bad: '邮箱格式不正确',
    submit: '订阅', sending: '提交中…', ok: '已收到，谢谢！我们会把活动提醒发给您。',
    fail: '提交失败，请稍后再试。', rate: '提交太频繁，请稍后再试。', foot: '随时可退订，不会把您的信息给别人。', close: '关闭', rm: '移除'
  } : {
    btn: '✉ Get Event Alerts', title: 'Get Event Alerts', types: 'Event types', feat: 'Featured events', reg: 'Regular events',
    city: 'Cities', cityPh: '+ Add a city (none = all cities)', noCity: 'No matching city',
    email: 'Email', emailPh: 'name@example.com', wx: 'WeChat name', wxPh: 'Your WeChat name', hint: 'Fill in an email or a WeChat name (at least one)',
    needType: 'Please choose at least one event type.', need: 'Please enter an email or a WeChat name.', bad: 'Please check your email address.',
    submit: 'Subscribe', sending: 'Sending…', ok: "Got it, thank you! We'll send you event alerts.",
    fail: 'Something went wrong. Please try again later.', rate: 'Too many tries. Please try again later.', foot: 'Unsubscribe anytime. We never share your info.', close: 'Close', rm: 'Remove'
  };
  var css = '.tsub-row{display:flex;justify-content:center;margin:10px 0 0}' +
    '.tsub-open{background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;border-radius:999px;padding:7px 18px;font-size:.9rem;font-weight:700;cursor:pointer}.tsub-open:hover{filter:brightness(1.1)}' +
    '#tsub-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}#tsub-modal[hidden]{display:none}' +
    '#tsub-modal .tsub-bg{position:absolute;inset:0;background:rgba(6,51,58,.6)}' +
    '#tsub-modal .tsub-dlg{position:relative;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px;padding:18px;max-width:440px;width:100%;box-sizing:border-box;box-shadow:0 16px 48px rgba(6,51,58,.35);max-height:94vh;overflow:auto}' +
    '#tsub-modal h2{font-family:var(--serif);color:#0a4f57;font-size:1.3rem;margin:0 30px 6px 0}' +
    '#tsub-modal .tsub-x{position:absolute;top:8px;right:10px;background:none;border:0;font-size:1.6rem;color:#7a6255;cursor:pointer}' +
    '#tsub-modal .tsub-lbl{display:block;font-size:.84rem;font-weight:700;color:#0a4f57;margin:10px 0 4px}' +
    '#tsub-modal .tsub-checks{display:flex;gap:16px;flex-wrap:wrap}#tsub-modal .tsub-checks label{display:flex;align-items:center;gap:6px;font-size:.92rem;color:#2a1a14;cursor:pointer}' +
    '#tsub-modal .tsub-checks input{width:18px;height:18px;accent-color:#0e6e78;margin:0}' +
    '#tsub-modal input.tsub-in{width:100%;box-sizing:border-box;min-height:40px;padding:6px 10px;border:1px solid #ead9b8;border-radius:8px;font-size:16px;color:#2a1a14}' +
    '#tsub-modal input.tsub-in:focus{outline:none;border-color:#0e6e78;box-shadow:0 0 0 3px rgba(14,110,120,.18)}' +
    '#tsub-modal .tsub-pick{position:relative}#tsub-modal .tsub-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}#tsub-modal .tsub-tags:empty{display:none}' +
    '#tsub-modal .tsub-tag{display:inline-flex;align-items:center;gap:4px;background:#0e6e78;color:#f6e3b4;border-radius:999px;padding:3px 6px 3px 11px;font-size:.85rem}' +
    '#tsub-modal .tsub-tag button{background:none;border:0;color:#f6e3b4;font-size:1rem;line-height:1;cursor:pointer;padding:0 3px}' +
    '#tsub-modal .tsub-list{position:absolute;left:0;right:0;top:100%;z-index:2;background:#fff;border:1px solid #ead9b8;border-radius:8px;margin-top:2px;max-height:190px;overflow:auto;box-shadow:0 8px 20px rgba(6,51,58,.18)}' +
    '#tsub-modal .tsub-list[hidden]{display:none}#tsub-modal .tsub-list div{padding:8px 10px;cursor:pointer;font-size:.92rem}#tsub-modal .tsub-list div:hover{background:#fbf5e9}#tsub-modal .tsub-list .tsub-none{color:#a8968a;cursor:default}' +
    '#tsub-modal .tsub-hint{font-size:.8rem;color:#7a6255;margin:6px 0 0}#tsub-modal .tsub-err{color:#b5654a;font-size:.85rem;margin:8px 0 0;min-height:1em}' +
    '#tsub-modal .tsub-ok{color:#0a4f57;font-size:.92rem;margin:8px 0 0}' +
    '#tsub-modal .tsub-go{width:100%;min-height:44px;margin-top:10px;border-radius:999px;font-size:1rem;background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;cursor:pointer}#tsub-modal .tsub-go:disabled{opacity:.5}' +
    '#tsub-modal .tsub-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '#tsub-modal .tsub-foot{font-size:.78rem;color:#7a6255;margin:12px 0 0;padding-top:8px;border-top:1px dashed #ead9b8}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var row = document.createElement('div'); row.className = 'tsub-row';
  row.innerHTML = '<button type="button" class="tsub-open" id="tsub-open">' + L.btn + '</button>';
  var anchor = document.querySelector('#filters .wrap') || document.getElementById('filters');
  if (anchor) anchor.appendChild(row);

  var m = document.createElement('div'); m.id = 'tsub-modal'; m.hidden = true;
  m.innerHTML = '<div class="tsub-bg" data-x></div><div class="tsub-dlg" role="dialog" aria-modal="true" aria-labelledby="tsub-t">' +
    '<button type="button" class="tsub-x" data-x aria-label="' + L.close + '">&times;</button><h2 id="tsub-t">' + L.title + '</h2>' +
    '<form id="tsub-f" novalidate>' +
    '<span class="tsub-lbl">' + L.types + '</span><div class="tsub-checks"><label><input type="checkbox" id="tsub-feat" value="featured">' + L.feat + '</label><label><input type="checkbox" id="tsub-reg" value="regular">' + L.reg + '</label></div>' +
    '<div id="tsub-citybox" hidden><span class="tsub-lbl">' + L.city + '</span><div class="tsub-pick"><div class="tsub-tags" id="tsub-tags"></div>' +
    '<input type="text" class="tsub-in" id="tsub-cityin" autocomplete="off" placeholder="' + L.cityPh + '"><div class="tsub-list" id="tsub-list" hidden></div></div></div>' +
    '<label class="tsub-lbl" for="tsub-e">' + L.email + '</label><input type="email" class="tsub-in" id="tsub-e" autocomplete="email" placeholder="' + L.emailPh + '">' +
    '<label class="tsub-lbl" for="tsub-w">' + L.wx + '</label><input type="text" class="tsub-in" id="tsub-w" autocomplete="off" placeholder="' + L.wxPh + '">' +
    '<div class="tsub-hp" aria-hidden="true"><label>Website<input type="text" id="tsub-hp" tabindex="-1" autocomplete="off"></label></div>' +
    '<p class="tsub-hint">' + L.hint + '</p><p class="tsub-err" id="tsub-err" aria-live="polite"></p>' +
    '<button type="submit" class="tsub-go" id="tsub-go">' + L.submit + '</button><p class="tsub-ok" id="tsub-ok" aria-live="polite" hidden></p></form>' +
    '<p class="tsub-foot">' + L.foot + '</p></div>';
  document.body.appendChild(m);
  var $ = function (id) { return document.getElementById(id); };
  function open() { m.hidden = false; }
  function close() { m.hidden = true; $('tsub-list').hidden = true; }
  $('tsub-open').addEventListener('click', open);
  m.addEventListener('click', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-x')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) close(); });
  if (location.hash === '#subscribe') open();

  // City picker: cities that have regular events on the map
  var all = [], picked = [];
  var names = UI.cityNames || {};
  var label = function (c) { return zh && names[c] ? names[c] : c; };
  var evUrl = UI.eventsUrl || (zh ? '../../asia/events.json' : 'events.json');
  fetch(evUrl).then(function (r) { return r.json(); }).then(function (d) {
    var s = {};
    (d || []).forEach(function (e) { if (e && e.city && e.kind !== 'event' && !e.hidden) s[e.city] = 1; });
    all = Object.keys(s).sort(function (a, b) { return label(a).localeCompare(label(b), zh ? 'zh-CN' : 'en'); });
  }).catch(function () {});
  function renderTags() {
    $('tsub-tags').innerHTML = picked.map(function (c, i) {
      return '<span class="tsub-tag">' + label(c) + '<button type="button" data-i="' + i + '" aria-label="' + L.rm + ' ' + label(c) + '">×</button></span>';
    }).join('');
  }
  function renderList() {
    var q = $('tsub-cityin').value.trim().toLowerCase();
    var opts = all.filter(function (c) { return picked.indexOf(c) < 0 && (!q || label(c).toLowerCase().indexOf(q) >= 0 || c.toLowerCase().indexOf(q) >= 0); });
    $('tsub-list').innerHTML = opts.length ? opts.map(function (c) { return '<div data-c="' + c + '">' + label(c) + '</div>'; }).join('') : '<div class="tsub-none">' + L.noCity + '</div>';
    $('tsub-list').hidden = false;
  }
  $('tsub-cityin').addEventListener('focus', renderList);
  $('tsub-cityin').addEventListener('click', renderList);
  $('tsub-cityin').addEventListener('input', renderList);
  $('tsub-list').addEventListener('mousedown', function (e) {
    var c = e.target.getAttribute('data-c'); if (!c) return; e.preventDefault();
    picked.push(c); $('tsub-cityin').value = ''; renderTags(); renderList();
  });
  $('tsub-cityin').addEventListener('blur', function () { setTimeout(function () { $('tsub-list').hidden = true; }, 150); });
  $('tsub-tags').addEventListener('click', function (e) {
    var i = e.target.getAttribute('data-i'); if (i === null) return;
    picked.splice(+i, 1); renderTags();
  });
  $('tsub-reg').addEventListener('change', function () { $('tsub-citybox').hidden = !this.checked; });

  $('tsub-f').addEventListener('submit', function (e) {
    e.preventDefault();
    var types = [];
    if ($('tsub-feat').checked) types.push('featured');
    if ($('tsub-reg').checked) types.push('regular');
    var em = $('tsub-e').value.trim(), wx = $('tsub-w').value.trim(), err = $('tsub-err'), ok = $('tsub-ok'), go = $('tsub-go');
    err.textContent = ''; ok.hidden = true;
    if (!types.length) { err.textContent = L.needType; return; }
    if (!em && !wx) { err.textContent = L.need; return; }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err.textContent = L.bad; return; }
    go.disabled = true; go.textContent = L.sending;
    fetch(API + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ types: types, cities: types.indexOf('regular') >= 0 ? picked.map(label) : [], email: em, wechat: wx, lang: zh ? 'zh' : 'en', website: $('tsub-hp').value }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { ok.textContent = L.ok; ok.hidden = false; $('tsub-f').reset(); picked = []; renderTags(); $('tsub-citybox').hidden = true; }
        else err.textContent = d.error === 'bad_email' ? L.bad : d.error === 'need_contact' ? L.need : d.error === 'need_type' ? L.needType : d.error === 'rate_limited' ? L.rate : L.fail;
      })
      .catch(function () { err.textContent = L.fail; })
      .then(function () { go.disabled = false; go.textContent = L.submit; });
  });
})();
