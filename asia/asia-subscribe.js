/* Profile form. POST /social/profile with alert:0.
   No session: send a verification email and save nothing public.
   Same verified session: update name, city, and role, and do not send another email.
   This does not create Going or Interested and does not email an organizer. */
(function () {
  var zh = document.documentElement.getAttribute('data-asia-lang') === 'zh';
  var API = window.TANGO_SUB_API || 'https://api.tangoweekend.org';
  var L = zh ? {
    btn: '订阅', title: '订阅', desc: '按需发送活动资讯', name: '姓名', namePh: '您的姓名', city: '城市', cityPh: '所在城市', role: '角色', rolePh: '请选择', rl: '引带（Leader）', rf: '跟随（follower）', rb: '两者皆可（both）', needName: '请填写姓名。', needCity: '请填写城市。', needRole: '请选择角色：引带（Leader）、跟随（follower）或两者皆可（both）。',
    email: '邮箱', emailPh: 'name@example.com',
    need: '请填写邮箱。', bad: '邮箱格式不正确', sendfail: '验证邮件发送失败，请检查邮箱或稍后再试。',
    submit: '发送验证邮件', sending: '发送中…', ok: '验证邮件已发出。请打开邮件里的链接完成验证。', saved: '资料已保存。这个设备已经验证过，没有再发信。',
    fail: '提交失败，请稍后再试。', rate: '提交太频繁，请稍后再试。', foot: '这里不报名，也不通知组织者。某个活动要参加或感兴趣，请到该活动点五角星再确认。', close: '关闭'
  } : {
    btn: '✉ Subscribe & event intent', title: 'Subscribe', desc: 'Enter your name, city, role, and email, then verify the email. This saves your profile.', name: 'Name', namePh: 'Your name', city: 'City', cityPh: 'Your city', role: 'Role', rolePh: 'Choose', rl: 'Leader', rf: 'follower', rb: 'both', needName: 'Please enter your name.', needCity: 'Please enter your city.', needRole: 'Please choose Leader, follower, or both.',
    email: 'Email', emailPh: 'name@example.com',
    need: 'Please enter your email.', sendfail: 'We couldn’t send the verification email. Check the address or try again.', bad: 'Please check your email address.',
    submit: 'Send verification email', sending: 'Sending…', ok: 'Verification email sent. Open the link in that email to finish.', saved: 'Profile saved. This device is already verified, so no new email was sent.',
    fail: 'Something went wrong. Please try again later.', rate: 'Too many tries. Please try again later.', foot: 'This does not register you for an event and does not email organizers. For Going or Interested, use the star on that event.', close: 'Close'
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
    '#tsub-modal h2{font-family:var(--serif);color:#0a4f57;font-size:1.15rem;line-height:1.25;margin:0}' +
    '#tsub-modal .tsub-x{position:static;flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;background:#fff;border:0;border-radius:8px;font-size:1.7rem;line-height:1;color:#7a6255;cursor:pointer}' +
    '#tsub-modal .tsub-lbl{display:block;font-size:.84rem;font-weight:700;color:#0a4f57;margin:10px 0 4px}' +
    '@media (max-width:600px){#tsub-modal h2{font-size:1.05rem}#tsub-modal .tsub-desc{font-size:.8rem;line-height:1.35;margin:0 0 2px}#tsub-modal .tsub-lbl{margin:6px 0 2px;font-size:.78rem}#tsub-modal input.tsub-in,#tsub-modal select.tsub-in{min-height:36px;padding:4px 8px}#tsub-modal .tsub-tabs{margin:6px 0 4px}#tsub-modal .tsub-tab{padding:7px 0}#tsub-modal .tsub-stp{margin:6px 0 2px;font-size:.82rem}#tsub-modal .tsub-go{margin-top:8px;min-height:40px}#tsub-modal .tsub-foot{margin:8px 0 0;padding-top:6px}}' +
    '#tsub-modal input.tsub-in,#tsub-modal select.tsub-in{width:100%;box-sizing:border-box;min-height:40px;padding:6px 10px;border:1px solid #ead9b8;border-radius:8px;font-size:16px;color:#2a1a14;background:#fff}' +
    '#tsub-modal input.tsub-in:focus,#tsub-modal select.tsub-in:focus{outline:none;border-color:#0e6e78;box-shadow:0 0 0 3px rgba(14,110,120,.18)}' +
    '#tsub-modal .tsub-row{display:flex;gap:8px}#tsub-modal .tsub-col{flex:1;min-width:0}@media (max-width:420px){#tsub-modal .tsub-row{flex-wrap:wrap}#tsub-modal .tsub-col{flex:1 1 100%}}' +
    '#tsub-modal .tsub-desc{font-size:.88rem;color:#2a1a14;margin:0 0 4px;line-height:1.5}' +
    '#tsub-modal .tsub-hint{font-size:.8rem;color:#7a6255;margin:6px 0 0}#tsub-modal .tsub-err{color:#b5654a;font-size:.85rem;margin:8px 0 0;min-height:1em}' +
    '#tsub-modal .tsub-tabs{display:flex;margin:10px 0 6px;border:1px solid #0e6e78;border-radius:8px;overflow:hidden}#tsub-modal .tsub-tab{flex:1;padding:9px 0;border:0;background:#fff;color:#0e6e78;font:600 .95rem system-ui;cursor:pointer}#tsub-modal .tsub-tab[aria-selected=true]{background:#0e6e78;color:#fff}#tsub-modal .tsub-tab.tsub-off,#tsub-modal .tsub-tab:disabled{opacity:.45;cursor:not-allowed;background:#eee;color:#9a9a9a;pointer-events:none}#tsub-modal [data-m=wx] .tsub-emf,#tsub-modal [data-m=em] .tsub-wxf,#tsub-modal [data-m] .tsub-hint{display:none!important}#tsub-modal .tsub-qa{display:flex;gap:10px;justify-content:center;margin:6px 0 2px}#tsub-modal .tsub-qb{padding:7px 14px;border:1px solid #0e6e78;border-radius:8px;color:#0e6e78;text-decoration:none;font:600 .9rem system-ui;background:#fff}#tsub-modal .tsub-wid{text-align:center;font-size:.88rem;margin:6px 0 2px}#tsub-modal .tsub-wid .tsub-qb{padding:4px 10px;font-size:.82rem;cursor:pointer}#tsub-modal .tsub-wxb{display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:#07a050;font:600 .72rem system-ui}#tsub-modal .tsub-qr{-webkit-touch-callout:default;user-select:auto}#tsub-modal .tsub-qh{text-align:center;font-size:.82rem;color:#7a6255;margin:2px 0 6px}#tsub-modal .tsub-stp{margin:10px 0 4px;font-size:.92rem;color:#0a4f57}#tsub-modal .tsub-ok{color:#0a4f57;font-size:.92rem;margin:8px 0 0;line-height:1.6}#tsub-modal .tsub-code{font-size:1.4rem;letter-spacing:.15em;color:#C8102E}#tsub-modal .tsub-tpl{display:flex;gap:6px;align-items:center;background:#f6f1e7;border:1px dashed #0e6e78;border-radius:8px;padding:6px 8px;margin:6px 0}#tsub-modal .tsub-tpl code{flex:1;color:#0a4f57}#tsub-modal .tsub-cp{border:1px solid #0e6e78;background:#fff;color:#0e6e78;border-radius:999px;padding:3px 10px;cursor:pointer}#tsub-modal .tsub-qr{display:block;width:180px;height:auto;margin:10px auto 0;border-radius:8px}' +
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

  function EM() { return '<label class="tsub-lbl" for="tsub-e">' + L.email + '</label><input type="email" class="tsub-in" id="tsub-e" autocomplete="email" required aria-required="true" placeholder="' + L.emailPh + '">'; }
  var m = document.createElement('div'); m.id = 'tsub-modal'; m.hidden = true;
  m.innerHTML = '<div class="tsub-bg" data-x></div><div class="tsub-dlg" role="dialog" aria-modal="true" aria-labelledby="tsub-t">' +
    '<div class="tsub-hd"><h2 id="tsub-t">' + L.title + '</h2><button type="button" class="tsub-x" data-x aria-label="' + L.close + '">&times;</button></div><div class="tsub-body"><p class="tsub-desc">' + L.desc + '</p>' +
    '<form id="tsub-f" novalidate data-m="em">' +
    '<label class="tsub-lbl" for="tsub-n">' + L.name + '</label><input type="text" class="tsub-in" id="tsub-n" autocomplete="name" maxlength="40" required aria-required="true" placeholder="' + L.namePh + '">' +
    '<div class="tsub-row"><div class="tsub-col"><label class="tsub-lbl" for="tsub-c">' + L.city + '</label><input type="text" class="tsub-in" id="tsub-c" autocomplete="address-level2" maxlength="40" required aria-required="true" placeholder="' + L.cityPh + '"></div>' +
    '<div class="tsub-col"><label class="tsub-lbl" for="tsub-r">' + L.role + '</label><select class="tsub-in" id="tsub-r" required aria-required="true"><option value="">' + L.rolePh + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div></div>' +
    EM() +
    '<div class="tsub-hp" aria-hidden="true"><label>Website<input type="text" id="tsub-hp" tabindex="-1" autocomplete="off"></label></div>' +
    '<div class="tsub-ts"></div><p class="tsub-err" id="tsub-err" aria-live="polite"></p>' +
    '<button type="submit" class="tsub-go" id="tsub-go">' + L.submit + '</button><p class="tsub-ok" id="tsub-ok" aria-live="polite" hidden></p></form>' +
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
  function open() { if (tmr) { clearTimeout(tmr); tmr = null; } $('tsub-ok').hidden = true; $('tsub-err').textContent = ''; m.hidden = false; mountSubTs(); }
  function close() { if (tmr) { clearTimeout(tmr); tmr = null; } m.hidden = true; }
  $('tsub-open').addEventListener('click', open);
  m.addEventListener('click', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-x')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) close(); });
  if (location.hash === '#subscribe') open();

  $('tsub-f').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('tsub-e') ? $('tsub-e').value.trim() : '', nm = $('tsub-n').value.trim(), cy = $('tsub-c') ? $('tsub-c').value.trim() : '', role = $('tsub-r') ? $('tsub-r').value : '', err = $('tsub-err'), ok = $('tsub-ok'), go = $('tsub-go');
    err.textContent = ''; ok.hidden = true;
    if (!nm) { err.textContent = L.needName; $('tsub-n').focus(); return; }
    if (!cy) { err.textContent = L.needCity; $('tsub-c').focus(); return; }
    if (role !== 'leader' && role !== 'follower' && role !== 'both') { err.textContent = L.needRole; $('tsub-r').focus(); return; }
    if (!em) { err.textContent = L.need; if ($('tsub-e')) $('tsub-e').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err.textContent = L.bad; return; }
    if ($('tsub-hp').value) { ok.textContent = L.ok; ok.hidden = false; return; }
    go.disabled = true; go.textContent = L.sending;
    var headers = { 'Content-Type': 'application/json' }; try { var tok = localStorage.getItem('atm_session'); if (tok) headers.Authorization = 'Bearer ' + tok; } catch (e2) {}
    var tsEl = document.querySelector('#tsub-f .tsub-ts');
    var ts = '';
    if (tsEl) { var inp = tsEl.querySelector('[name="cf-turnstile-response"]'); ts = inp ? String(inp.value || '').trim() : ''; }
    if (!ts) { err.textContent = zh ? '请先完成人机验证，再发送。' : 'Finish the human check, then send.'; go.disabled = false; go.textContent = L.submit; if (tsEl && tsEl.scrollIntoView) tsEl.scrollIntoView({ block: 'nearest' }); return; }
    fetch(API + '/social/profile', { method: 'POST', headers: headers, body: JSON.stringify({ name: nm, email: em, city: cy, role: role, lang: zh ? 'zh' : 'en', alert: 0, ret: location.href.split('#')[0], website: $('tsub-hp').value, ts: ts }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) {
          ok.textContent = d.session ? L.saved : L.ok; ok.hidden = false; if (!d.session) $('tsub-f').reset();
          if (tmr) clearTimeout(tmr);
          tmr = setTimeout(function () { tmr = null; m.hidden = true; ok.hidden = true; ok.textContent = ''; }, 6000);
        }
        else {
          err.textContent = d.error === 'need_name' ? L.needName : d.error === 'need_city' ? L.needCity : d.error === 'need_role' ? L.needRole : d.error === 'bad_email' ? L.bad : (d.error === 'need_email' || d.error === 'need_contact') ? L.need : d.error === 'send_failed' ? L.sendfail : d.error === 'rate_limited' ? L.rate : L.fail;
        }
      })
      .catch(function () { err.textContent = L.fail; })
      .then(function () { go.disabled = false; go.textContent = L.submit; });
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
    '#site-ver{display:block;text-align:center;margin:8px auto 0;font:500 14px/1 Georgia,"Times New Roman",serif;letter-spacing:.08em;color:#D9B56A;opacity:1}' +
    '#site-ver b{font-weight:600;color:#e2cf9f;letter-spacing:.08em}' +
    '#site-ver:before,#site-ver:after{content:"";display:inline-block;width:18px;height:1px;background:currentColor;opacity:.5;vertical-align:middle;margin:0 8px}';
  /* v11.1: version line lives at the bottom of the ☰ menu (#atm-menu .atm-mp), no longer in the hidden page-bottom #contact */
  css += '#atm-menu #site-ver{color:#8a6d2f;margin:18px auto 4px}#atm-menu #site-ver b{color:#6b5220}';
  function put(){ if (document.getElementById('site-ver')) return; var f = document.querySelector('#atm-menu .atm-mp'); if (!f) return;
    var st = document.createElement('style'); st.id = 'site-ver-css'; st.textContent = css; document.head.appendChild(st);
    var s = document.createElement('div'); s.id = 'site-ver';
    { var zhN = document.documentElement.getAttribute('data-asia-lang') === 'zh'; s.appendChild(document.createTextNode('By ')); var a = document.createElement('a'); a.href = 'https://www.facebook.com/shiao.chang'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = zhN ? '张孝立' : 'Shiao Chang'; a.style.cssText = 'color:inherit;text-decoration:underline;text-underline-offset:2px'; s.appendChild(a); s.appendChild(document.createTextNode(' ')); } var b = document.createElement('b'); if (rel) b.textContent = '· v' + rel; s.appendChild(b);
    f.appendChild(s); }
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
