/* Profile form. POST /social/profile with alert:0.
   No session: email and the last 4 digits first. POST /social/going/phone.
   A new or unconfirmed address then completes name, role, and city and sends one confirmation email.
   The last 4 digits sign in only after that link is opened. A confirmed address with a matching last 4 signs in and does not send mail.
   Same verified session: update name, city, role, and the last 4 digits, and do not send another email.
   This does not create Going or Interested and does not email an organizer. */
(function () {
  var zh = document.documentElement.getAttribute('data-asia-lang') === 'zh';
  function apiBase() {
    var host = location.hostname;
    if (host === 'tangoweekend.org' || host === 'www.tangoweekend.org') return 'https://api.tangoweekend.org';
    try {
      var q = new URLSearchParams(location.search).get('api');
      if (q) {
        var u = new URL(q);
        var h = u.hostname;
        var local = (u.protocol === 'http:' && (h === 'localhost' || h === '127.0.0.1'));
        var preview = u.protocol === 'https:' && (h.endsWith('.workers.dev') || h.endsWith('.pages.dev') || h === 'api.tangoweekend.org');
        if (local || preview) return u.origin;
      }
    } catch (e) {}
    return window.TANGO_SUB_API || 'https://api.tangoweekend.org';
  }
  var API = apiBase();
  var L = zh ? {
    btn: '订阅', title: '订阅', mine: '我的资料', desc: '按需发送活动信息', name: '姓名', namePh: '您的姓名', city: '城市', cityPh: '所在城市', role: '角色', rolePh: '请选择', rl: '引带（Leader）', rf: '跟随（follower）', rb: '两者皆可（both）', needName: '请填写姓名。', needCity: '请填写城市。', needRole: '请选择角色：引带（Leader）、跟随（follower）或两者皆可（both）。',
    email: '邮箱', emailPh: 'name@example.com', site: '加入 ATM 全站订阅',
    need: '请填写邮箱。', bad: '邮箱格式不正确', sendfail: '验证邮件发送失败，请检查邮箱或稍后再试。',
    returnHint: '已经订阅过？请输入邮箱和电话末 4 码，不必再等确认信。',
    gateHelp: '邮箱和电话末 4 码<em>必填</em>。系统会识别是注册还是登录。第一次注册仍要发送确认邮件；在信里点确认以后，电话末 4 码才会生效。已确认过的，填邮箱和电话末 4 码即可登录，不必再等确认信。',
    regHelp: '请完成注册。邮箱和电话末 4 码<em>必填</em>。请补全资料并发送确认邮件。在信里点确认以后，电话末 4 码才会生效。',
    phone: '电话', phonePh: '手机号', last4: '电话末 4 码', signIn: '登录', signing: '登录中…', gate: '注册／登录', send: '发送确认邮件',
    needPhone: '请填写电话。', badPhone: '电话号码不正确。', needLast4: '请输入电话末 4 码。', badLogin: '邮箱或电话末 4 码不正确。',
    phoneSaved: '已保存末 4 码 ',
    submit: '发送验证邮件', save: '保存', saving: '保存中…', unsub: '退订', sending: '发送中…', ok: '验证邮件已发出。请打开邮件里的链接完成验证。没收到邮件？请到垃圾邮件箱查看。确认链接可能会在浏览器里打开，确认后回到这里就行。', saved: '资料已保存。这个设备已经验证过，没有再发信。', confirmed: '已确认',
    fail: '提交失败，请稍后再试。', rate: '提交太频繁，请稍后再试。', foot: '订阅即可收到亚洲各地的探戈活动信息。想去的活动点星星，我们通知组织者，你就能更早知道早鸟价、报名截止和场地指引。', close: '关闭',
    passTitle: '我的订阅', passHint: '在微信、Safari、Chrome 或其他浏览器打开这个链接即可登录，不必再收确认邮件。', passCopy: '复制', passCopied: '已复制', passNew: '生成新链接', passNewWarn: '生成新链接后，旧链接会失效。继续？', passMissing: '这个浏览器没有保存订阅链接。生成新链接会使旧链接失效。', passStale: '这个浏览器保存的链接已失效。可生成新链接。', passFail: '暂时无法读取订阅链接，请稍后再试。'
  } : {
    btn: 'Subscribe', title: 'Subscribe', mine: 'My profile', desc: 'Event updates, sent as needed.', name: 'Name', namePh: 'Your name', city: 'City', cityPh: 'Your city', role: 'Role', rolePh: 'Choose', rl: 'Leader', rf: 'follower', rb: 'both', needName: 'Please enter your name.', needCity: 'Please enter your city.', needRole: 'Please choose Leader, follower, or both.',
    email: 'Email', emailPh: 'name@example.com', site: 'Join ATM site-wide subscription',
    need: 'Please enter your email.', sendfail: 'We couldn’t send the verification email. Check the address or try again.', bad: 'Please check your email address.',
    returnHint: 'Already subscribed? Enter your email and the last 4 digits of your phone. You don\u2019t need another confirmation email.',
    gateHelp: 'Email and the last 4 digits are <em>required</em>. The form tells registration from sign-in. The first registration still sends a confirmation email. The last 4 digits work only after you tap the link in that email. If you already confirmed, enter your email and the last 4 digits to sign in. You don\u2019t need another confirmation email.',
    regHelp: 'Finish registration. Email and the last 4 digits are <em>required</em>. Complete your details and send the confirmation email. The last 4 digits work only after you tap the link in that email.',
    phone: 'Phone', phonePh: 'Mobile number', last4: 'Last 4 digits', signIn: 'Sign in', signing: 'Signing in…', gate: 'Register / sign in', send: 'Send confirmation email',
    needPhone: 'Please enter your phone number.', badPhone: 'That phone number does not look valid.', needLast4: 'Enter the last 4 digits of your phone.', badLogin: 'The email or the last 4 digits did not match.',
    phoneSaved: 'Saved, last 4 digits ',
    submit: 'Send verification email', save: 'Save', saving: 'Saving…', unsub: 'Unsubscribe', sending: 'Sending…', ok: 'Verification email sent. Open the link in that email to finish. Didn\'t get the email? Check your spam or junk folder. The confirmation link may open in your browser. After confirming, just come back here.', saved: 'Profile saved. This device is already verified, so no new email was sent.', confirmed: 'Confirmed',
    fail: 'Something went wrong. Please try again later.', rate: 'Too many tries. Please try again later.', foot: 'Subscribe for tango event news across Asia. Star an event and we\'ll tell the organizer, so you hear first about early-bird prices, deadlines and directions.', close: 'Close',
    passTitle: 'My subscription', passHint: 'Open this link in WeChat, Safari, Chrome, or another browser to sign in. No new confirmation email.', passCopy: 'Copy', passCopied: 'Copied', passNew: 'New link', passNewWarn: 'A new link stops the old one. Continue?', passMissing: 'This browser does not have the link saved. A new link stops the old one.', passStale: 'The link saved in this browser no longer works. You can make a new one.', passFail: 'The subscription link could not be loaded. Try again later.'
  };
  var css = '.tsub-pair{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 6px 0 auto}.tsub-pair .china-suggest-open{margin:0!important}' +
    '.tsub-open{background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;border-radius:999px;padding:5px 14px;font-size:.78rem;font-weight:700;line-height:1.2;white-space:nowrap;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:background .15s,transform .15s}' +
    '.tsub-open:hover{background:#128591;transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.3)}' +
    '@media (max-width:600px){.china-hero-bar:has(.tsub-pair){flex-wrap:wrap!important;row-gap:8px}.china-hero-bar .tsub-pair{order:9;flex:1 1 100%;margin:0;justify-content:flex-start}}' +
    '.tsub-bottom-wrap{display:flex;justify-content:center;padding:4px 0 12px}.tsub-bottom-wrap .tsub-pair{margin:0}' +
    '#tsub-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:max(10px,env(safe-area-inset-top)) 12px max(10px,env(safe-area-inset-bottom));box-sizing:border-box}#tsub-modal[hidden]{display:none}' +
    '#tsub-modal .tsub-bg{position:absolute;inset:0;background:rgba(6,51,58,.6)}' +
    '#tsub-modal .tsub-dlg{position:relative;display:flex;flex-direction:column;background:#fff;border:1px solid #ead9b8;border-top:4px solid #0e6e78;border-radius:14px;padding:0;max-width:440px;width:100%;box-sizing:border-box;box-shadow:0 16px 48px rgba(6,51,58,.35);max-height:90vh;max-height:90dvh;overflow:hidden;overflow-x:hidden}' +
    '#tsub-modal .tsub-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:0 0 auto;background:#fff;padding:6px 4px 4px 16px;border-radius:10px 10px 0 0}' +
    '#tsub-modal .tsub-body{overflow:auto;-webkit-overflow-scrolling:touch;padding:0 16px 12px;min-height:0}' +
    '#tsub-modal h2{font-family:var(--serif);color:#0a4f57;font-size:19px;line-height:26px;font-weight:700;margin:0}' +
    '#tsub-modal .tsub-x{position:static;flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;background:#fff;border:0;border-radius:8px;font-size:1.7rem;line-height:1;color:#7a6255;cursor:pointer}' +
    '#tsub-modal .tsub-lbl{display:block;font-size:13px;line-height:18px;font-weight:600;color:#0a4f57;margin:10px 0 4px}' +
    '@media (max-width:600px){#tsub-modal h2{font-size:1.05rem}#tsub-modal .tsub-desc{font-size:.8rem;line-height:1.35;margin:0 0 2px}#tsub-modal .tsub-lbl{margin:6px 0 2px;font-size:.78rem}#tsub-modal input.tsub-in,#tsub-modal select.tsub-in{min-height:36px;padding:4px 8px}#tsub-modal .tsub-tabs{margin:6px 0 4px}#tsub-modal .tsub-tab{padding:7px 0}#tsub-modal .tsub-stp{margin:6px 0 2px;font-size:.82rem}#tsub-modal .tsub-go{margin-top:8px;min-height:40px}#tsub-modal .tsub-foot{margin:8px 0 0;padding-top:6px}}' +
    '#tsub-modal input.tsub-in,#tsub-modal select.tsub-in{width:100%;box-sizing:border-box;min-height:40px;padding:6px 10px;border:1px solid #A98A4A;border-radius:8px;font-size:16px;color:#2a1a14;background:#fff;font-family:var(--sans)}' +
    '#tsub-modal input.tsub-in:focus,#tsub-modal select.tsub-in:focus{outline:none;border-color:#0E6E78;box-shadow:0 0 0 2px rgba(14,110,120,.25)}' +
    '#tsub-modal .tsub-row{display:flex;gap:8px}#tsub-modal .tsub-col{flex:1;min-width:0}@media (max-width:420px){#tsub-modal .tsub-row{flex-wrap:wrap}#tsub-modal .tsub-col{flex:1 1 100%}}' +
    '#tsub-modal .tsub-desc{font-size:.88rem;color:#2a1a14;margin:0 0 4px;line-height:1.5}' +
    '#tsub-modal .tsub-hint{font-size:.8rem;color:#7a6255;margin:6px 0 0}#tsub-modal .tsub-err{color:#b5654a;font-size:.85rem;margin:8px 0 0;min-height:1em}' +
    '#tsub-modal .tsub-tabs{display:flex;margin:10px 0 6px;border:1px solid #0e6e78;border-radius:8px;overflow:hidden}#tsub-modal .tsub-tab{flex:1;padding:9px 0;border:0;background:#fff;color:#0e6e78;font:600 .95rem system-ui;cursor:pointer}#tsub-modal .tsub-tab[aria-selected=true]{background:#0e6e78;color:#fff}#tsub-modal .tsub-tab.tsub-off,#tsub-modal .tsub-tab:disabled{opacity:.45;cursor:not-allowed;background:#eee;color:#9a9a9a;pointer-events:none}#tsub-modal [data-m=wx] .tsub-emf,#tsub-modal [data-m=em] .tsub-wxf,#tsub-modal [data-m] .tsub-hint{display:none!important}#tsub-modal .tsub-qa{display:flex;gap:10px;justify-content:center;margin:6px 0 2px}#tsub-modal .tsub-qb{padding:7px 14px;border:1px solid #0e6e78;border-radius:8px;color:#0e6e78;text-decoration:none;font:600 .9rem system-ui;background:#fff}#tsub-modal .tsub-wid{text-align:center;font-size:.88rem;margin:6px 0 2px}#tsub-modal .tsub-wid .tsub-qb{padding:4px 10px;font-size:.82rem;cursor:pointer}#tsub-modal .tsub-wxb{display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:#07a050;font:600 .72rem system-ui}#tsub-modal .tsub-qr{-webkit-touch-callout:default;user-select:auto}#tsub-modal .tsub-qh{text-align:center;font-size:.82rem;color:#7a6255;margin:2px 0 6px}#tsub-modal .tsub-stp{margin:10px 0 4px;font-size:.92rem;color:#0a4f57}#tsub-modal .tsub-ok{color:#0a4f57;font-size:.92rem;margin:8px 0 0;line-height:1.6}#tsub-modal .tsub-code{font-size:1.4rem;letter-spacing:.15em;color:#C8102E}#tsub-modal .tsub-tpl{display:flex;gap:6px;align-items:center;background:#f6f1e7;border:1px dashed #0e6e78;border-radius:8px;padding:6px 8px;margin:6px 0}#tsub-modal .tsub-tpl code{flex:1;color:#0a4f57}#tsub-modal .tsub-cp{border:1px solid #0e6e78;background:#fff;color:#0e6e78;border-radius:999px;padding:3px 10px;cursor:pointer}#tsub-modal .tsub-qr{display:block;width:180px;height:auto;margin:10px auto 0;border-radius:8px}' +
    '#tsub-modal .tsub-go{width:100%;min-height:48px;margin-top:10px;border-radius:12px;font:600 15px/20px var(--sans);background:#0e6e78;color:#FFFFFF;border:0;cursor:pointer}#tsub-modal .tsub-go:disabled{opacity:.5}' +
    '#tsub-modal .tsub-check{display:flex;gap:8px;align-items:flex-start;margin:10px 0 0;font-size:.88rem;color:#2a1a14}#tsub-modal .tsub-check input{width:auto;min-height:0;margin-top:3px}' +
    '#tsub-modal .tsub-unsub{width:100%;min-height:44px;margin-top:8px;border-radius:999px;background:#fff;color:#7a6255;border:1px solid #ead9b8;cursor:pointer}' +
    '#tsub-modal .tsub-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '#tsub-modal .tsub-foot{font-size:.78rem;color:#7a6255;margin:12px 0 0;padding-top:8px;border-top:1px dashed #ead9b8}' +
    '#tsub-modal .tsub-return{font-size:.88rem;font-weight:700;color:#0a4f57;margin:0 0 8px;line-height:1.45}' +
    '#tsub-modal .tsub-need{margin:8px 0 2px;font-size:.88rem;font-weight:700;color:#0a4f57;line-height:1.45}#tsub-modal .tsub-need em{color:#b5654a;font-style:normal}' +
    '#tsub-modal .tsub-star{color:#b5654a;font-weight:700;margin-left:2px}#tsub-modal input.tsub-must{border-color:#c48a6a}' +
    '#tsub-modal .tsub-need[hidden],#tsub-modal #tsub-reg[hidden],#tsub-modal #tsub-phone-go[hidden]{display:none!important}' +
    '#tsub-modal .tsub-return[hidden],#tsub-modal .tsub-login[hidden]{display:none!important}' +
    '#tsub-modal .tsub-alt{width:100%;min-height:44px;margin-top:8px;border-radius:999px;border:1px solid #0e6e78;background:#fff;color:#0e6e78;font:600 .95rem/1.2 system-ui,sans-serif;cursor:pointer}' +
    '#tsub-modal .tsub-alt:disabled{opacity:.5}' +
    '#tsub-modal .tsub-pass{margin:12px 0 0;padding-top:10px;border-top:1px dashed #ead9b8}#tsub-modal .tsub-pass[hidden]{display:none!important}' +
    '#tsub-modal .tsub-pass-note{font-size:.8rem;color:#7a6255;margin:4px 0 0;line-height:1.45}' +
    '#tsub-modal .tsub-pass-row{display:flex;gap:8px;align-items:center;margin:6px 0}#tsub-modal .tsub-pass-row input{flex:1;min-width:0}' +
    '#tsub-modal .tsub-pass-copy,#tsub-modal .tsub-pass-new{min-height:44px;border-radius:999px;border:1px solid #0e6e78;background:#fff;color:#0e6e78;font:600 .9rem/1.2 system-ui,sans-serif;padding:8px 14px;cursor:pointer}' +
    '#tsub-modal .tsub-pass-new{display:block;width:100%;margin-top:8px;background:#0e6e78;color:#f6e3b4}';
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

  function EM() { return '<label class="tsub-lbl" for="tsub-e">' + L.email + '<span class="tsub-star" id="tsub-email-star">*</span></label><input type="email" class="tsub-in tsub-must" id="tsub-e" autocomplete="email" required aria-required="true" maxlength="80" placeholder="' + L.emailPh + '">'; }
  var m = document.createElement('div'); m.id = 'tsub-modal'; m.hidden = true;
  m.innerHTML = '<div class="tsub-bg" data-x></div><div class="tsub-dlg" role="dialog" aria-modal="true" aria-labelledby="tsub-t">' +
    '<div class="tsub-hd"><h2 id="tsub-t">' + L.title + '</h2><button type="button" class="tsub-x" data-x aria-label="' + L.close + '">&times;</button></div><div class="tsub-body"><p class="tsub-need" id="tsub-need">' + L.gateHelp + '</p><p class="tsub-desc" id="tsub-desc">' + L.desc + '</p>' +
    '<form id="tsub-f" novalidate data-m="em">' +
    EM() +
    '<label class="tsub-lbl" for="tsub-last4">' + L.last4 + '<span class="tsub-star" id="tsub-tail-star">*</span></label><input type="text" class="tsub-in tsub-must" id="tsub-last4" inputmode="numeric" autocomplete="off" maxlength="4">' +
    '<button type="button" class="tsub-go" id="tsub-phone-go">' + L.gate + '</button>' +
    '<div id="tsub-reg" hidden>' +
    '<label class="tsub-lbl" for="tsub-n">' + L.name + '</label><input type="text" class="tsub-in" id="tsub-n" autocomplete="name" maxlength="40" required aria-required="true" placeholder="' + L.namePh + '">' +
    '<div class="tsub-row"><div class="tsub-col"><label class="tsub-lbl" for="tsub-r">' + L.role + '</label><select class="tsub-in" id="tsub-r" required aria-required="true"><option value="">' + L.rolePh + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div>' +
    '<div class="tsub-col"><label class="tsub-lbl" for="tsub-c">' + L.city + '</label><input type="text" class="tsub-in" id="tsub-c" autocomplete="address-level2" maxlength="40" required aria-required="true" placeholder="' + L.cityPh + '"></div></div>' +
    '<label class="tsub-check" for="tsub-site"><input type="checkbox" id="tsub-site" checked>' + L.site + '</label>' +
    '<div class="tsub-hp" aria-hidden="true"><label>Website<input type="text" id="tsub-hp" tabindex="-1" autocomplete="off"></label></div>' +
    '<div class="tsub-ts"></div>' +
    '<button type="submit" class="tsub-go" id="tsub-go">' + L.send + '</button>' +
    '<button type="submit" class="tsub-unsub" id="tsub-unsub" hidden>' + L.unsub + '</button>' +
    '<div class="tsub-pass" id="tsub-pass" hidden><p class="tsub-lbl">' + L.passTitle + '</p><p class="tsub-pass-note" id="tsub-pass-hint">' + L.passHint + '</p>' +
    '<div class="tsub-pass-row"><input class="tsub-in" id="tsub-pass-url" readonly autocomplete="off" spellcheck="false" aria-label="' + L.passTitle + '"><button type="button" class="tsub-pass-copy" id="tsub-pass-copy">' + L.passCopy + '</button></div>' +
    '<p class="tsub-pass-note" id="tsub-pass-note"></p><button type="button" class="tsub-pass-new" id="tsub-pass-new">' + L.passNew + '</button></div></div>' +
    '<p class="tsub-err" id="tsub-err" aria-live="polite"></p>' +
    '<p class="tsub-ok" id="tsub-ok" aria-live="polite" hidden></p></form>' +
    '<p class="tsub-foot">' + L.foot + '</p></div></div>';
  document.body.appendChild(m);
  var $ = function (id) { return document.getElementById(id); };
  var tmr = null;
  function mountSubTs() {
    var el = document.querySelector('#tsub-f .tsub-ts');
    if (!el || el.dataset.ts) return;
    var key = window.ATM_TS_KEY || '';
    function render() {
      if (!window.turnstile || !el.isConnected || el.dataset.ts) return;
      el.dataset.ts = '1';
      window.turnstile.render(el, { sitekey: key, action: 'profile' });
    }
    function start(k) { key = k || key; if (!key) return; if (window.turnstile) render(); else { var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = render; document.head.appendChild(s); } }
    if (key) start(key);
    else fetch((window.TANGO_SUB_API || 'https://api.tangoweekend.org') + '/social/going/config').then(function (r) { return r.json(); }).then(function (d) { if (d && d.sitekey) { window.ATM_TS_KEY = d.sitekey; start(d.sitekey); } }).catch(function () {});
  }
  function token() { try { return localStorage.getItem('atm_session') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem('atm_session', t); } catch (e) {} }
  function watchClaim(nonce, onOk) {
    if (!/^[0-9a-f]{64}$/.test(nonce || '')) return function () {};
    var stop = Date.now() + 30 * 60 * 1000;
    var timer = 0;
    var done = false;
    function finish(session) {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', kick);
      window.removeEventListener('focus', kick);
      setToken(session);
      if (onOk) onOk(session);
    }
    function kick() {
      if (done) return;
      if (Date.now() > stop) { if (timer) clearInterval(timer); return; }
      fetch(API + '/social/going/await', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nonce: nonce }) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.confirmed && /^[0-9a-f]{64}$/.test(d.session || '')) finish(d.session); })
        .catch(function () {});
    }
    function onVis() { if (document.visibilityState === 'visible') kick(); }
    timer = setInterval(kick, 4000);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', kick);
    window.addEventListener('focus', kick);
    kick();
    return kick;
  }
  window.ATM_CLAIM = { watch: watchClaim, kick: function (nonce) { return watchClaim(nonce, function () {}); } };
  function paintPhone(tail) {
    var el = $('tsub-last4'); if (!el) return;
    el.value = '';
    el.placeholder = tail ? (L.phoneSaved + tail) : '';
  }
  var PASS_KEY = 'atm_pass_url';
  function passSaved() { try { return localStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; } }
  function passSave(url) { try { if (url) localStorage.setItem(PASS_KEY, url); else localStorage.removeItem(PASS_KEY); } catch (e) {} }
  function passKeyOf(url) { var m = String(url || '').match(/\/enter\/([0-9a-f]{64})$/); return m ? m[1] : ''; }
  function showPass(mode, url) {
    var box = $('tsub-pass'); if (!box) return;
    box.hidden = false;
    var input = $('tsub-pass-url'), note = $('tsub-pass-note'), copy = $('tsub-pass-copy'), row = input && input.parentNode;
    var ready = mode === 'url' && url;
    if (row) row.hidden = !ready;
    if (input) { input.value = ready ? url : ''; }
    if (copy) copy.hidden = !ready;
    if (note) note.textContent = ready ? '' : (mode === 'stale' ? L.passStale : mode === 'fail' ? L.passFail : L.passMissing);
  }
  function issuePass(rotate) {
    return fetch(API + '/social/going/pass', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify(rotate ? { rotate: 1 } : { issue: 1 }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.d && res.d.url) { passSave(res.d.url); showPass('url', res.d.url); return; }
        if (res.d && res.d.active) { showPass(passSaved() ? 'stale' : 'missing'); return; }
        showPass('fail');
      }).catch(function () { showPass('fail'); });
  }
  function loadPass() {
    var box = $('tsub-pass');
    if (!box || !token()) { if (box) box.hidden = true; return; }
    fetch(API + '/social/going/pass', { headers: { Authorization: 'Bearer ' + token() } })
      .then(function (r) { if (!r.ok) throw new Error('pass'); return r.json(); })
      .then(function (d) {
        if (!d || d.active == null) throw new Error('pass');
        if (!d.active) return issuePass(false);
        var saved = passSaved(), key = passKeyOf(saved);
        if (!key) { showPass('missing'); return; }
        return fetch(API + '/social/going/pass', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ prove: key }) })
          .then(function (r) { return r.json(); })
          .then(function (p) { if (p && p.match) showPass('url', saved); else { passSave(''); showPass('stale'); } });
      }).catch(function () { if ($('tsub-pass')) $('tsub-pass').hidden = true; });
  }
  try {
    var passHash = /^#p=([0-9a-f]{64})$/.exec(location.hash || '');
    if (passHash) {
      passSave(API.replace(/\/$/, '') + '/social/going/enter/' + passHash[1]);
      history.replaceState(history.state, '', location.pathname + location.search);
    }
  } catch (ePass) {}
  function pageRet() {
    try {
      var u = new URL(location.href);
      u.hash = '';
      var y = Math.round(window.scrollY || window.pageYOffset || 0);
      if (y > 0) u.searchParams.set('atm_y', String(y));
      else u.searchParams.delete('atm_y');
      return u.toString();
    } catch (e) { return location.href.split('#')[0]; }
  }
  function paintMode(on) {
    $('tsub-t').textContent = on ? L.mine : L.title;
    var go = $('tsub-go');
    if (go && go.dataset.busy !== '1') go.textContent = on ? L.save : L.send;
    var un = $('tsub-unsub'); if (un) un.hidden = !on;
    var em = $('tsub-e'); if (em) { em.disabled = !!on; em.classList.toggle('tsub-must', !on); }
    var ts = document.querySelector('#tsub-f .tsub-ts'); if (ts) ts.hidden = true;
    var need = $('tsub-need');
    if (need) { need.hidden = !!on; if (!on) need.innerHTML = L.gateHelp; }
    var gateBtn = $('tsub-phone-go'); if (gateBtn) gateBtn.hidden = !!on;
    var reg = $('tsub-reg'); if (reg) reg.hidden = !on;
    var star = $('tsub-tail-star'); if (star) star.hidden = !!on;
    var emailStar = $('tsub-email-star'); if (emailStar) emailStar.hidden = !!on;
    var tail = $('tsub-last4'); if (tail) tail.classList.toggle('tsub-must', !on);
    if (!on && $('tsub-pass')) $('tsub-pass').hidden = true;
  }
  function showRegister() {
    var need = $('tsub-need');
    if (need) { need.hidden = false; need.innerHTML = L.regHelp; }
    var gateBtn = $('tsub-phone-go'); if (gateBtn) gateBtn.hidden = true;
    var reg = $('tsub-reg'); if (reg) reg.hidden = false;
    var ts = document.querySelector('#tsub-f .tsub-ts'); if (ts) ts.hidden = false;
    var go = $('tsub-go'); if (go && go.dataset.busy !== '1') go.textContent = L.send;
    mountSubTs();
  }
  function open() {
    if (tmr) { clearTimeout(tmr); tmr = null; }
    $('tsub-ok').hidden = true; $('tsub-err').textContent = '';
    var tok = token();
    paintMode(!!tok);
    m.hidden = false;
    if (!tok) { paintPhone(''); paintMode(false); return; }
    var headers = { Authorization: 'Bearer ' + tok };
    fetch(API + '/social/going/mine', { headers: headers }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.email) { paintPhone(''); paintMode(false); return; }
      $('tsub-n').value = d.name || '';
      if ($('tsub-c')) $('tsub-c').value = d.city || '';
      if ($('tsub-r')) $('tsub-r').value = d.role || '';
      if ($('tsub-e')) $('tsub-e').value = d.email || '';
      if ($('tsub-site')) $('tsub-site').checked = !!d.sitewide;
      paintPhone(d.phone_tail || '');
      paintMode(true);
      loadPass();
    }).catch(function () { paintMode(false); });
  }
  function close() { if (tmr) { clearTimeout(tmr); tmr = null; } m.hidden = true; }
  $('tsub-open').addEventListener('click', open);
  m.addEventListener('click', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-x')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) close(); });
  if (location.hash === '#subscribe') open();

  $('tsub-f').addEventListener('submit', function (e) {
    e.preventDefault();
    var profile = $('tsub-e') && $('tsub-e').disabled;
    var unsubmitting = e.submitter && e.submitter.id === 'tsub-unsub';
    var em = $('tsub-e') ? $('tsub-e').value.trim() : '', nm = $('tsub-n').value.trim(), cy = $('tsub-c') ? $('tsub-c').value.trim() : '', role = $('tsub-r') ? $('tsub-r').value : '', err = $('tsub-err'), ok = $('tsub-ok'), go = $('tsub-go');
    var site = unsubmitting ? 0 : ($('tsub-site') && $('tsub-site').checked ? 1 : 0);
    err.textContent = ''; ok.hidden = true;
    if (!nm) { err.textContent = L.needName; $('tsub-n').focus(); return; }
    if (!cy) { err.textContent = L.needCity; $('tsub-c').focus(); return; }
    if (role !== 'leader' && role !== 'follower' && role !== 'both') { err.textContent = L.needRole; $('tsub-r').focus(); return; }
    if (!em) { err.textContent = L.need; if ($('tsub-e')) $('tsub-e').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err.textContent = L.bad; return; }
    var tail = $('tsub-last4') ? $('tsub-last4').value.replace(/\D/g, '') : '';
    if (!profile && !/^\d{4}$/.test(tail)) { err.textContent = L.needLast4; if ($('tsub-last4')) $('tsub-last4').focus(); return; }
    if (profile && $('tsub-last4') && $('tsub-last4').value.trim() && !/^\d{4}$/.test(tail)) { err.textContent = L.needLast4; if ($('tsub-last4')) $('tsub-last4').focus(); return; }
    if ($('tsub-hp').value) { ok.textContent = L.ok; ok.hidden = false; return; }
    go.disabled = true; go.dataset.busy = '1'; go.textContent = profile ? L.saving : L.sending;
    var headers = { 'Content-Type': 'application/json' }; try { var tok = localStorage.getItem('atm_session'); if (tok) headers.Authorization = 'Bearer ' + tok; } catch (e2) {}
    var tsEl = document.querySelector('#tsub-f .tsub-ts');
    var ts = '';
    if (tsEl && !tsEl.hidden) { var inp = tsEl.querySelector('[name="cf-turnstile-response"]'); ts = inp ? String(inp.value || '').trim() : ''; }
    if (!profile && !ts) { err.textContent = zh ? '请先完成人机验证，再发送。' : 'Finish the human check, then send.'; go.disabled = false; go.dataset.busy = ''; go.textContent = L.send; if (tsEl && tsEl.scrollIntoView) tsEl.scrollIntoView({ block: 'nearest' }); return; }
    var body = { name: nm, email: em, city: cy, role: role, lang: zh ? 'zh' : 'en', alert: site, ret: pageRet(), website: $('tsub-hp').value, ts: ts };
    if (tail) body.last4 = tail;
    fetch(API + '/social/profile', { method: 'POST', credentials: 'include', headers: headers, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) {
          ok.textContent = d.session ? L.saved : L.ok; ok.hidden = false; if (!d.session) $('tsub-f').reset();
          if (!d.session && d.nonce) watchClaim(d.nonce, function () { ok.textContent = L.confirmed; ok.hidden = false; paintMode(true); open(); });
          if (d.session && $('tsub-site')) $('tsub-site').checked = !!d.sitewide;
          if (d.session && d.phone_tail) paintPhone(d.phone_tail);
          if (window.ATM_MENU && window.ATM_MENU.paintSub) window.ATM_MENU.paintSub();
          if (tmr) clearTimeout(tmr);
          tmr = setTimeout(function () { tmr = null; m.hidden = true; ok.hidden = true; ok.textContent = ''; }, 6000);
        }
        else {
          err.textContent = d.error === 'need_name' ? L.needName : d.error === 'need_city' ? L.needCity : d.error === 'need_role' ? L.needRole : d.error === 'need_phone' ? L.needLast4 : d.error === 'bad_phone' ? L.needLast4 : d.error === 'bad_email' ? L.bad : (d.error === 'need_email' || d.error === 'need_contact') ? L.need : d.error === 'send_failed' ? L.sendfail : d.error === 'rate_limited' ? L.rate : L.fail;
        }
      })
      .catch(function () { err.textContent = L.fail; })
      .then(function () {
        go.disabled = false; go.dataset.busy = '';
        if ($('tsub-e') && $('tsub-e').disabled && token()) paintMode(true);
        else if ($('tsub-reg') && !$('tsub-reg').hidden) go.textContent = L.send;
        else paintMode(false);
      });
  });
  var phoneGo = $('tsub-phone-go');
  if (phoneGo) phoneGo.addEventListener('click', function () {
    var err = $('tsub-err'), ok = $('tsub-ok');
    var em = $('tsub-e') ? $('tsub-e').value.trim() : '';
    var tail = $('tsub-last4') ? $('tsub-last4').value.replace(/\D/g, '') : '';
    err.textContent = ''; ok.hidden = true;
    if ($('tsub-hp').value) { ok.hidden = false; ok.textContent = L.saved; return; }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err.textContent = em ? L.bad : L.need; if ($('tsub-e')) $('tsub-e').focus(); return; }
    if (!/^\d{4}$/.test(tail)) { err.textContent = L.needLast4; if ($('tsub-last4')) $('tsub-last4').focus(); return; }
    phoneGo.disabled = true; phoneGo.textContent = L.signing;
    fetch(API + '/social/going/phone', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em, last4: tail, lang: zh ? 'zh' : 'en' }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.register) { showRegister(); return; }
        if (d && d.session) {
          setToken(d.session);
          if (window.ATM_STAR && window.ATM_STAR.refresh) window.ATM_STAR.refresh();
          if (window.ATM_MENU && window.ATM_MENU.paintSub) window.ATM_MENU.paintSub();
          open();
          return;
        }
        err.textContent = d && d.error === 'rate_limited' ? L.rate : L.badLogin;
      })
      .catch(function () { err.textContent = L.fail; })
      .then(function () { phoneGo.disabled = false; phoneGo.textContent = L.gate; });
  });
  var passCopy = $('tsub-pass-copy');
  if (passCopy) passCopy.addEventListener('click', function () {
    var input = $('tsub-pass-url'), note = $('tsub-pass-note'), text = input ? input.value : '';
    if (!text) return;
    function ok() { if (note) note.textContent = L.passCopied; }
    function fb() { try { input.focus(); input.select(); document.execCommand('copy'); ok(); } catch (e) {} }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fb);
    else fb();
  });
  var passNew = $('tsub-pass-new');
  if (passNew) passNew.addEventListener('click', function () {
    if (!window.confirm(L.passNewWarn)) return;
    issuePass(true);
  });
})();

/* Footer signature line — edit these strings to bump */
(function(){
  var SITE_DESIGNER = 'By Shiao Chang';
  var rel = document.documentElement.getAttribute('data-site-release') || '';
  var day = document.documentElement.getAttribute('data-site-release-date') || '';
  if (rel && /^\d{4}-\d{2}-\d{2}$/.test(day)) rel += ' ' + day;
  var css = '#contact{padding:14px 0 12px!important}#contact .wrap p{margin:0!important;font-size:13px;line-height:1.5}' +
    '#contact .tsub-bottom-wrap{padding:0 0 8px!important}' +
    '#site-ver{display:block;text-align:center;margin:8px auto 0;font:400 12px/18px var(--sans);letter-spacing:0;color:#4A6B70;opacity:1}' +
    '#site-ver b{font-weight:600;color:#e2cf9f;letter-spacing:.08em}' +
    '#site-ver:before,#site-ver:after{content:"";display:inline-block;width:18px;height:1px;background:currentColor;opacity:.5;vertical-align:middle;margin:0 8px}';
  /* v11.1: version line lives at the bottom of the ☰ menu (#atm-menu .atm-mp), no longer in the hidden page-bottom #contact */
  css += '#atm-menu #site-ver{color:#4A6B70;margin:16px 20px 24px;text-align:left}#atm-menu #site-ver b{color:#4A6B70;font-weight:400}';
  function put(){ if (document.getElementById('site-ver')) return; var f = document.querySelector('#atm-menu .atm-mp'); if (!f) return;
    var st = document.createElement('style'); st.id = 'site-ver-css'; st.textContent = css; document.head.appendChild(st);
    var s = document.createElement('div'); s.id = 'site-ver';
    { var zhN = document.documentElement.getAttribute('data-asia-lang') === 'zh'; s.appendChild(document.createTextNode('By ')); var a = document.createElement('a'); a.href = 'https://www.facebook.com/shiao.chang'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = zhN ? '张孝' : 'Shiao Chang'; a.style.cssText = 'color:inherit;text-decoration:underline;text-underline-offset:2px'; s.appendChild(a); s.appendChild(document.createTextNode(' ')); } var b = document.createElement('b'); if (rel) b.textContent = '· v' + rel; s.appendChild(b);
    f.appendChild(s); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put); else put();
})();

/* Return from a menu confirm to the scroll position stored in atm_y. */
(function () {
  var y = '';
  try { y = new URLSearchParams(location.search).get('atm_y') || ''; } catch (e) { return; }
  if (!/^\d+$/.test(y)) return;
  var n = +y;
  function go() { window.scrollTo(0, n); }
  go();
  window.addEventListener('load', function () { go(); setTimeout(go, 80); });
  try {
    var u = new URL(location.href);
    u.searchParams.delete('atm_y');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  } catch (e) {}
})();

/* Open at top: don't restore an old scroll position (e.g. footer) on reload */
(function(){
  if (location.hash || /[?&]atm_y=\d+/.test(location.search) || /[?&]intent=resume(?:&|$)/.test(location.search)) return;
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
