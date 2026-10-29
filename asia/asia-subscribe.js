/* Asia map "event alerts" form (draft). Double opt-in: POST to api.tangoweekend.org stores the email as PENDING and sends a confirmation link; only confirmed emails join the list. Email required; WeChat ID optional. */
(function () {
  var zh = document.documentElement.getAttribute('data-asia-lang') === 'zh';
  var API = window.TANGO_SUB_API || 'https://api.tangoweekend.org';
  var L = zh ? {
    btn: '✉ 新活动通知', title: '新活动通知', desc: '每周通过邮件发送新活动；微信群里不定时发布新活动。留微信号的订阅者会收到亚洲探戈地图微信群的入群邀请，新活动通知会在群里发布。',
    email: '邮箱（必填）', emailPh: 'name@example.com', wx: '微信号（选填）', wxPh: '您的微信号', hint: '新活动通知只能通过邮件发送，所以邮箱必填。提交后请到邮箱点击确认链接，7天内未确认会自动删除。',
    need: '请填写邮箱。微信收不到通知，邮箱必填。', bad: '邮箱格式不正确', sendfail: '确认邮件发送失败，请检查邮箱地址或稍后再试。',
    submit: '订阅', sending: '提交中…', ok: '确认邮件已发出！请到邮箱点击链接完成订阅（7天内有效，没收到请查看垃圾邮件）。',
    fail: '提交失败，请稍后再试。', rate: '提交太频繁，请稍后再试。', foot: '随时可退订，不会把您的信息给别人。', close: '关闭'
  } : {
    btn: '✉ Get event alert', title: 'New activity alerts', desc: 'We email new events every week, and post new events in our WeChat group from time to time. If you leave your WeChat ID, you\'ll get an invite to the Asia Tango Map WeChat group, where new activity alerts are posted.',
    email: 'Email (required)', emailPh: 'name@example.com', wx: 'WeChat ID (optional)', wxPh: 'Your WeChat ID', hint: 'Event alerts are sent by email only, so an email is required. After submitting, click the confirmation link in your inbox; unconfirmed sign-ups are deleted after 7 days.',
    need: 'Please enter your email. Alerts can’t be sent to WeChat, so email is required.', sendfail: 'We couldn’t send the confirmation email. Please check the address or try again later.', bad: 'Please check your email address.',
    submit: 'Subscribe', sending: 'Sending…', ok: "Almost done! Check your inbox and click the confirmation link (valid 7 days; check spam if you don't see it).",
    fail: 'Something went wrong. Please try again later.', rate: 'Too many tries. Please try again later.', foot: 'Unsubscribe anytime. We never share your info.', close: 'Close'
  };
  var css = '.tsub-pair{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 6px 0 auto}.tsub-pair .china-suggest-open{margin:0!important}' +
    '.tsub-open{background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;border-radius:999px;padding:5px 14px;font-size:.78rem;font-weight:700;line-height:1.2;white-space:nowrap;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:background .15s,transform .15s}' +
    '.tsub-open:hover{background:#128591;transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.3)}' +
    '@media (max-width:600px){.china-hero-bar:has(.tsub-pair){flex-wrap:wrap!important;row-gap:8px}.china-hero-bar .tsub-pair{order:9;flex:1 1 100%;margin:0;justify-content:flex-start}}' +
    '.tsub-bottom-wrap{display:flex;justify-content:center;padding:4px 0 12px}.tsub-bottom-wrap .tsub-pair{margin:0}' +
    '#tsub-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}#tsub-modal[hidden]{display:none}' +
    '#tsub-modal .tsub-bg{position:absolute;inset:0;background:rgba(6,51,58,.6)}' +
    '#tsub-modal .tsub-dlg{position:relative;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px;padding:18px;max-width:440px;width:100%;box-sizing:border-box;box-shadow:0 16px 48px rgba(6,51,58,.35);max-height:94vh;overflow:auto}' +
    '#tsub-modal h2{font-family:var(--serif);color:#0a4f57;font-size:1.3rem;margin:0 30px 6px 0}' +
    '#tsub-modal .tsub-x{position:absolute;top:8px;right:10px;background:none;border:0;font-size:1.6rem;color:#7a6255;cursor:pointer}' +
    '#tsub-modal .tsub-lbl{display:block;font-size:.84rem;font-weight:700;color:#0a4f57;margin:10px 0 4px}' +
    '#tsub-modal input.tsub-in{width:100%;box-sizing:border-box;min-height:40px;padding:6px 10px;border:1px solid #ead9b8;border-radius:8px;font-size:16px;color:#2a1a14}' +
    '#tsub-modal input.tsub-in:focus{outline:none;border-color:#0e6e78;box-shadow:0 0 0 3px rgba(14,110,120,.18)}' +
    '#tsub-modal .tsub-desc{font-size:.88rem;color:#2a1a14;margin:0 0 4px;line-height:1.5}' +
    '#tsub-modal .tsub-hint{font-size:.8rem;color:#7a6255;margin:6px 0 0}#tsub-modal .tsub-err{color:#b5654a;font-size:.85rem;margin:8px 0 0;min-height:1em}' +
    '#tsub-modal .tsub-ok{color:#0a4f57;font-size:.92rem;margin:8px 0 0}' +
    '#tsub-modal .tsub-go{width:100%;min-height:44px;margin-top:10px;border-radius:999px;font-size:1rem;background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;cursor:pointer}#tsub-modal .tsub-go:disabled{opacity:.5}' +
    '#tsub-modal .tsub-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '#tsub-modal .tsub-foot{font-size:.78rem;color:#7a6255;margin:12px 0 0;padding-top:8px;border-top:1px dashed #ead9b8}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // Sit beside the header "Add event" button (before the language switch) as a matching pill.
  var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'tsub-open'; btn.id = 'tsub-open'; btn.textContent = L.btn;
  var sug = document.getElementById('china-suggest-open'), lang = document.querySelector('.china-map-lang');
  var pair = document.createElement('div'); pair.className = 'tsub-pair'; pair.appendChild(btn);
  var zhMobile = true; /* v8: 新活动通知 in footer on zh and en, all widths */ /* draft: zh footer placement on all widths (was mobile only) */
  var foot = document.getElementById('contact');
  if (zhMobile && foot) { /* draft 2026-10-28: move out of sticky header to page bottom */
    pair.className = 'tsub-pair tsub-bottom'; var fw = document.createElement('div'); fw.className = 'wrap tsub-bottom-wrap'; fw.appendChild(pair); foot.insertBefore(fw, foot.firstChild);
  } else
  if (sug) { sug.parentNode.insertBefore(pair, sug); pair.appendChild(sug); sug.style.setProperty('margin-left', '0', 'important'); sug.style.setProperty('margin-right', '0', 'important'); }
  else if (lang) lang.parentNode.insertBefore(pair, lang);
  else { var f = document.querySelector('#filters .wrap') || document.getElementById('filters'); if (f) f.appendChild(pair); }

  var m = document.createElement('div'); m.id = 'tsub-modal'; m.hidden = true;
  m.innerHTML = '<div class="tsub-bg" data-x></div><div class="tsub-dlg" role="dialog" aria-modal="true" aria-labelledby="tsub-t">' +
    '<button type="button" class="tsub-x" data-x aria-label="' + L.close + '">&times;</button><h2 id="tsub-t">' + L.title + '</h2><p class="tsub-desc">' + L.desc + '</p>' +
    '<form id="tsub-f" novalidate>' +
    '<label class="tsub-lbl" for="tsub-w">' + L.wx + '</label><input type="text" class="tsub-in" id="tsub-w" autocomplete="off" placeholder="' + L.wxPh + '">' +
    '<label class="tsub-lbl" for="tsub-e">' + L.email + '</label><input type="email" class="tsub-in" id="tsub-e" required aria-required="true" autocomplete="email" placeholder="' + L.emailPh + '">' +
    '<div class="tsub-hp" aria-hidden="true"><label>Website<input type="text" id="tsub-hp" tabindex="-1" autocomplete="off"></label></div>' +
    '<p class="tsub-hint">' + L.hint + '</p><p class="tsub-err" id="tsub-err" aria-live="polite"></p>' +
    '<button type="submit" class="tsub-go" id="tsub-go">' + L.submit + '</button><p class="tsub-ok" id="tsub-ok" aria-live="polite" hidden></p></form>' +
    '<p class="tsub-foot">' + L.foot + '</p></div>';
  document.body.appendChild(m);
  var $ = function (id) { return document.getElementById(id); };
  var tmr = null;
  function open() { if (tmr) { clearTimeout(tmr); tmr = null; } $('tsub-ok').hidden = true; $('tsub-err').textContent = ''; m.hidden = false; }
  function close() { if (tmr) { clearTimeout(tmr); tmr = null; } m.hidden = true; }
  $('tsub-open').addEventListener('click', open);
  m.addEventListener('click', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-x')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) close(); });
  if (location.hash === '#subscribe') open();

  $('tsub-f').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('tsub-e').value.trim(), wx = $('tsub-w').value.trim(), err = $('tsub-err'), ok = $('tsub-ok'), go = $('tsub-go');
    err.textContent = ''; ok.hidden = true;
    if (!em) { err.textContent = L.need; $('tsub-e').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err.textContent = L.bad; return; }
    go.disabled = true; go.textContent = L.sending;
    fetch(API + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ types: ['featured', 'regular'], cities: [], email: em, wechat: wx, lang: zh ? 'zh' : 'en', website: $('tsub-hp').value }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) {
          ok.textContent = L.ok; ok.hidden = false; $('tsub-f').reset();
          // Auto-close shortly after success so the thank-you is seen; errors never auto-close.
          if (tmr) clearTimeout(tmr);
          tmr = setTimeout(function () { tmr = null; m.hidden = true; ok.hidden = true; ok.textContent = ''; }, 6000);
        }
        else err.textContent = d.error === 'bad_email' ? L.bad : (d.error === 'need_email' || d.error === 'need_contact') ? L.need : d.error === 'send_failed' ? L.sendfail : d.error === 'rate_limited' ? L.rate : L.fail;
      })
      .catch(function () { err.textContent = L.fail; })
      .then(function () { go.disabled = false; go.textContent = L.submit; });
  });
})();

/* Footer signature line — edit these strings to bump */
(function(){
  var SITE_VERSION = 'v10', SITE_DESIGNER = 'By Shiao Chang';
  var css = '#contact{padding:14px 0 12px!important}#contact .wrap p{margin:0!important;font-size:13px;line-height:1.5}' +
    '#contact .tsub-bottom-wrap{padding:0 0 8px!important}' +
    '#site-ver{display:block;text-align:center;margin:8px auto 0;font:500 12px/1 Georgia,"Times New Roman",serif;letter-spacing:.08em;color:#D9B56A;opacity:1}' +
    '#site-ver b{font-weight:600;color:#e2cf9f;letter-spacing:.08em}' +
    '#site-ver:before,#site-ver:after{content:"";display:inline-block;width:18px;height:1px;background:currentColor;opacity:.5;vertical-align:middle;margin:0 8px}';
  function put(){ var f = document.getElementById('contact'); if (!f || document.getElementById('site-ver')) return;
    var st = document.createElement('style'); st.id = 'site-ver-css'; st.textContent = css; document.head.appendChild(st);
    var s = document.createElement('div'); s.id = 'site-ver';
    s.appendChild(document.createTextNode(SITE_DESIGNER + ' ')); var b = document.createElement('b'); b.textContent = '· ' + SITE_VERSION; s.appendChild(b);
    var w = f.querySelectorAll('.wrap'); (w[w.length - 1] || f).appendChild(s); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put); else put();
})();

/* Open at top: don't restore an old scroll position (e.g. footer) on reload */
(function(){
  if (location.hash) return;
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  function top(){ if (!location.hash) window.scrollTo(0, 0); }
  top(); window.addEventListener('load', function(){ top(); setTimeout(top, 60); });
  window.addEventListener('pageshow', function(e){ if (e.persisted) top(); });
})();

/* Mobile: keep footer below the first screen (only seen after scrolling down) */
(function(){
  var cur = 0;
  function fit(){ var f = document.getElementById('contact'); if (!f) return;
    var want = 0;
    if (true) { var top = f.getBoundingClientRect().top + window.scrollY - cur; want = Math.max(0, Math.ceil(window.innerHeight + 8 - top)); }
    if (want !== cur) { cur = want; f.style.marginTop = want ? want + 'px' : ''; } }
  window.addEventListener('load', function(){ fit(); setTimeout(fit, 500); setTimeout(fit, 1500); }); window.addEventListener('resize', fit); document.addEventListener('DOMContentLoaded', fit);
  if (window.ResizeObserver) document.addEventListener('DOMContentLoaded', function(){ new ResizeObserver(function(){ fit(); }).observe(document.body); });
})();
