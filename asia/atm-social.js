/* Asia Tango Map: 👍 likes + comments under a single event card (?card=ID), on the map and on DJ/organizer pages.
   Likes: no login, one per device (localStorage id + server dedupe), tap again to un-like.
   Comments: name + email sign-up, 6-digit code by email (Turnstile against spam), then post. API: /social/* on the subscribe Worker. */
(function () {
  var R = document.documentElement, zh = /^zh/i.test(R.getAttribute('data-asia-lang') || document.body.getAttribute('data-lang') || R.lang || '');
  var API = (window.ATM_SOCIAL_API || 'https://api.tangoweekend.org') + '/social', TSKEY = window.ATM_TS_KEY || '';
  var cardId = ''; try { cardId = new URLSearchParams(location.search).get('card') || ''; } catch (e) {}
  var pm = location.pathname.match(/^\/(?:zh\/|en\/)?(organizer|dj)\/([a-z0-9-]{1,48})\/?(?:index\.html)?$/i);
  if (pm && document.querySelector('.dj-main')) cardId = (pm[1].toLowerCase() === 'dj' ? 'dj:' : 'org:') + pm[2].toLowerCase();
  if (!/^(?:(?:org|dj):)?[A-Za-z0-9_-]{1,64}$/.test(cardId)) return;
  var L = zh ? { like: '赞', cm: '留言', none: '还没有留言，来说第一句吧。', ph: '写下你的留言…', post: '发布', join: '登录后留言', name: '名字', email: '邮箱',
      send: '发送验证码', code: '邮件里的 6 位验证码', verify: '验证', sent: '验证码已发到你的邮箱（15 分钟内有效，没收到请看垃圾邮件）。', as: '以 {n} 的身份留言 · ', out: '退出',
      need: '请填写名字和正确的邮箱。', bad: '验证码不对或已过期。', fail: '出错了，请稍后再试。', rate: '太频繁了，请稍后再试。', ts: '请先完成人机验证。', why: '留言需要注册并验证邮箱。', city: '城市（必填）', ncity: '请填写你所在的城市。', role: '你跳的角色（必选）', rl: 'Leader 领舞', rf: 'Follower 跟舞', rb: '两者都跳 Both', nrole: '请选择你跳的角色。', trd: '译文', org: '查看原文', shtr: '查看译文' }
    : { like: 'Like', cm: 'Comments', none: 'No comments yet. Be the first!', ph: 'Write a comment…', post: 'Post', join: 'Sign in to comment', name: 'Name', email: 'Email',
      send: 'Send code', code: '6-digit code from the email', verify: 'Verify', sent: 'We emailed you a code (valid 15 minutes; check spam if you don\'t see it).', as: 'Commenting as {n} · ', out: 'Sign out',
      need: 'Please enter your name and a valid email.', bad: 'Wrong or expired code.', fail: 'Something went wrong. Please try again later.', rate: 'Too many tries. Please try again later.', ts: 'Please complete the check first.', why: 'Commenting needs an account with a verified email.', city: 'City (required)', ncity: 'Please enter your city.', role: 'Your role (required)', rl: 'Leader', rf: 'Follower', rb: 'Both', nrole: 'Please choose your role.', trd: 'Translated', org: 'See original', shtr: 'See translation' };
  function dev() { var k = 'atm_dev_id', v = ''; try { v = localStorage.getItem(k) || ''; if (!/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))); localStorage.setItem(k, v); } } catch (e) { v = v || 'anon-' + Date.now().toString(36) + '0000000000'; } return v; }
  function tok() { try { return localStorage.getItem('atm_social_tok') || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(path, body, auth) {
    var o = { method: body ? 'POST' : 'GET', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    if (auth && tok()) o.headers.Authorization = 'Bearer ' + tok();
    return fetch(API + path, o).then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); });
  }
  function day(iso) { var d = new Date(iso); if (isNaN(d)) return ''; try { return new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: zh ? 'numeric' : 'short', day: 'numeric' }).format(d); } catch (e) { return iso.slice(0, 10); } }
  var css = '#atm-soc{max-width:560px;margin:10px auto 18px;padding:0 12px;box-sizing:border-box;font-family:inherit;color:#2a1a14}' +
    '#atm-soc .as-bar{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #ead9b8;border-bottom:1px solid #ead9b8}' +
    '#atm-soc .as-btn{display:inline-flex;align-items:center;gap:6px;background:none;border:0;border-radius:8px;padding:6px 10px;font-size:.95rem;font-weight:600;color:#65676b;cursor:pointer}' +
    '#atm-soc .as-btn:hover{background:#f3ece0}#atm-soc .as-like[aria-pressed="true"]{color:#0e6e78}#atm-soc .as-like[aria-pressed="true"] .as-ic{filter:none;transform:scale(1.08)}' +
    '#atm-soc .as-ic{font-size:1.15rem;line-height:1;filter:grayscale(1);transition:transform .15s}#atm-soc .as-n{font-variant-numeric:tabular-nums}' +
    '#atm-soc .as-list{list-style:none;margin:10px 0;padding:0}#atm-soc .as-item{background:#f6f1e7;border-radius:14px;padding:8px 12px;margin:0 0 8px}' +
    '#atm-soc .as-item b{color:#0a4f57;font-size:.88rem}#atm-soc .as-item time{color:#7a6255;font-size:.8rem}#atm-soc .as-item p{margin:3px 0 0;font-size:.92rem;line-height:1.5;white-space:pre-wrap;word-break:break-word}#atm-soc .as-cty{color:#7a6255;font-size:.8rem}#atm-soc .as-trt{background:none;border:0;padding:2px 0;color:#7a6255;font-size:.75rem;cursor:pointer;text-decoration:underline}' +
    '#atm-soc .as-empty{color:#7a6255;font-size:.88rem;margin:10px 0}#atm-soc .as-in{width:100%;box-sizing:border-box;min-height:40px;padding:8px 10px;border:1px solid #ead9b8;border-radius:10px;font-size:16px;margin:4px 0;font-family:inherit}' +
    '#atm-soc textarea.as-in{min-height:64px;resize:vertical}#atm-soc .as-go{min-height:40px;padding:0 18px;border-radius:999px;background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;font-size:.95rem;cursor:pointer}#atm-soc .as-go:disabled{opacity:.5}' +
    '#atm-soc .as-meta{font-size:.8rem;color:#7a6255;margin:4px 0}#atm-soc .as-meta a{color:#0e6e78;cursor:pointer}#atm-soc .as-err{color:#b5654a;font-size:.85rem;min-height:1em;margin:4px 0}#atm-soc .as-ok{color:#0a4f57;font-size:.85rem;margin:4px 0}' +
    '#atm-soc .as-pv{background:#fff6d6;border:1px dashed #e8c06a;border-radius:8px;padding:4px 8px;font-size:.8rem;color:#6b5220}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var box = document.createElement('section'); box.id = 'atm-soc'; box.setAttribute('data-card', cardId);
  box.innerHTML = '<div class="as-bar"><button type="button" class="as-btn as-like" aria-pressed="false"><span class="as-ic">👍</span><span class="as-l">' + L.like + '</span><span class="as-n" data-n="0"></span></button>' +
    '<button type="button" class="as-btn as-cmb"><span class="as-ic">💬</span><span>' + L.cm + '</span><span class="as-n as-cn"></span></button></div>' +
    '<ul class="as-list" aria-live="polite"></ul><div class="as-form"></div>';
  var placed = false;
  function place() {
    if (placed) return true;
    var single = document.getElementById('atm-single'), anchor = single && single.querySelector('ul.china-list');
    if (anchor && anchor.querySelector('.ev-card')) { anchor.parentNode.insertBefore(box, anchor.nextSibling); placed = true; }
    else if (pm && document.querySelector('.dj-main')) { var mm = document.querySelector('.dj-main'); mm.insertBefore(box, mm.querySelector('section') || null); placed = true; }
    if (placed) init(); return placed;
  }
  var likeB = box.querySelector('.as-like'), nEl = likeB.querySelector('.as-n'), list = box.querySelector('.as-list'), form = box.querySelector('.as-form');
  function setLike(n, on) { nEl.textContent = n > 0 ? n : ''; likeB.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function drawItems(items) {
    box.querySelector('.as-cn').textContent = items.length || '';
    list.innerHTML = items.length ? items.map(function (c) { return '<li class="as-item"><b>' + esc(c.name) + '</b>' + (c.city ? '<span class="as-cty"> · ' + esc(c.city) + '</span>' : '') + '<time> · ' + esc(day(c.at)) + '</time>' + (function () { var want = zh ? 'zh' : 'en', t = c.tr && c.lang && c.lang !== want;
        return t ? '<p class="as-txt">' + esc(c.tr) + '</p><p class="as-txt as-org" hidden>' + esc(c.body) + '</p><button type="button" class="as-trt" data-t="1">' + L.trd + ' · ' + L.org + '</button>' : '<p>' + esc(c.body) + '</p>'; })() + '</li>'; }).join('') : '<li class="as-empty">' + L.none + '</li>';
    list.querySelectorAll('.as-trt').forEach(function (bt) { bt.onclick = function () { var li = bt.parentNode, ps = li.querySelectorAll('.as-txt'), o = bt.getAttribute('data-t') === '1'; ps[0].hidden = o; ps[1].hidden = !o; bt.setAttribute('data-t', o ? '0' : '1'); bt.textContent = o ? L.shtr : L.trd + ' · ' + L.org; }; });
  }
  var me = null, tsId = null, tsTok = '';
  function drawForm() {
    if (me) {
      form.innerHTML = '<textarea class="as-in as-body" maxlength="1000" placeholder="' + L.ph + '"></textarea><p class="as-meta">' + esc(L.as.replace('{n}', me)) + '<a class="as-out">' + L.out + '</a></p><p class="as-err"></p><button type="button" class="as-go as-post">' + L.post + '</button>';
      form.querySelector('.as-out').onclick = function () { try { localStorage.removeItem('atm_social_tok'); } catch (e) {} me = null; drawForm(); };
      form.querySelector('.as-post').onclick = function () {
        var b = form.querySelector('.as-body'), t = b.value.trim(), er = form.querySelector('.as-err'), go = this; if (!t) return; go.disabled = true; er.textContent = '';
        api('/comment', { id: cardId, body: t }, true).then(function (d) { if (d.ok) { b.value = ''; loadComments(); } else if (d.error === 'auth') { me = null; drawForm(); } else er.textContent = d.error === 'rate_limited' ? L.rate : L.fail; })
          .catch(function () { er.textContent = L.fail; }).then(function () { go.disabled = false; });
      };
      return;
    }
    form.innerHTML = '<p class="as-meta"><b>' + L.join + '</b> — ' + L.why + '</p><input class="as-in as-nm" maxlength="40" autocomplete="name" placeholder="' + L.name + '"><input class="as-in as-cy0" maxlength="40" autocomplete="address-level2" placeholder="' + L.city + '"><select class="as-in as-role"><option value="">' + L.role + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select><input class="as-in as-em" type="email" autocomplete="email" placeholder="' + L.email + '">' +
      '<div class="as-ts"></div><p class="as-err"></p><button type="button" class="as-go as-send">' + L.send + '</button>' + (zh ? '<p class="as-meta"><a class="as-wxt">已通过微信订阅？用微信号 + 4 位验证码留言</a></p><div class="as-wx" hidden><input class="as-in as-wxid" placeholder="微信号"><input class="as-in as-wxc" inputmode="numeric" maxlength="4" placeholder="订阅时拿到的 4 位验证码"><button type="button" class="as-go as-wxgo">用微信验证</button></div>' : '') + '<div class="as-step2" hidden><p class="as-ok"></p><input class="as-in as-code" inputmode="numeric" maxlength="6" placeholder="' + L.code + '"><button type="button" class="as-go as-ver">' + L.verify + '</button></div>';
    var er = form.querySelector('.as-err');
    if (zh) { var wt = form.querySelector('.as-wxt'), wb = form.querySelector('.as-wx'); try { var sv = JSON.parse(localStorage.getItem('atm_wx_sub') || 'null'); if (sv) { wb.querySelector('.as-wxid').value = sv.wechat || ''; wb.querySelector('.as-wxc').value = sv.code || ''; } } catch (e) {}
      wt.onclick = function () { wb.hidden = !wb.hidden; };
      wb.querySelector('.as-wxgo').onclick = function () { er.textContent = ''; if (!form.querySelector('.as-cy0').value.trim()) { er.textContent = L.ncity; return; } if (!form.querySelector('.as-role').value) { er.textContent = L.nrole; return; }
        api('/wx-login', { lang: 'zh', city: form.querySelector('.as-cy0').value.trim(), role: form.querySelector('.as-role').value, wechat: wb.querySelector('.as-wxid').value.trim(), code: wb.querySelector('.as-wxc').value.trim() }).then(function (d) {
          if (d.ok) { try { localStorage.setItem('atm_social_tok', d.token); } catch (e) {} me = d.name; drawForm(); }
          else er.textContent = d.error === 'wx_pending' ? '还在等我们核对你的好友申请，通过后就能留言。' : '微信号或验证码不对，或还没有用微信订阅。'; }).catch(function () { er.textContent = L.fail; }); }; }
    if (TSKEY) loadTs(function () { tsId = window.turnstile.render(form.querySelector('.as-ts'), { sitekey: TSKEY, language: zh ? 'zh-cn' : 'en', callback: function (t) { tsTok = t; } }); });
    form.querySelector('.as-send').onclick = function () {
      var nm = form.querySelector('.as-nm').value.trim(), em = form.querySelector('.as-em').value.trim(), go = this; er.textContent = '';
      if (!form.querySelector('.as-cy0').value.trim()) { er.textContent = L.ncity; return; } if (!form.querySelector('.as-role').value) { er.textContent = L.nrole; return; }
      if (!nm || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = L.need; return; }
      if (TSKEY && !tsTok) { er.textContent = L.ts; return; }
      go.disabled = true;
      api('/signup', { name: nm, city: form.querySelector('.as-cy0').value.trim(), role: form.querySelector('.as-role').value, email: em, lang: zh ? 'zh' : 'en', ts: tsTok }).then(function (d) {
        if (!d.ok) { er.textContent = d.error === 'rate_limited' ? L.rate : d.error === 'turnstile' ? L.ts : d.error === 'need_city' ? L.ncity : d.error === 'need_role' ? L.nrole : d.error === 'need_name' || d.error === 'bad_email' ? L.need : L.fail; if (tsId != null && window.turnstile) { window.turnstile.reset(tsId); tsTok = ''; } return; }
        var s2 = form.querySelector('.as-step2'); s2.hidden = false; s2.querySelector('.as-ok').textContent = L.sent;
        if (d.preview_code) { var pv = document.createElement('p'); pv.className = 'as-pv'; pv.textContent = (zh ? '预览版：邮件未真正发送，验证码是 ' : 'Preview only: no email sent, the code is ') + d.preview_code; s2.insertBefore(pv, s2.firstChild.nextSibling); }
      }).catch(function () { er.textContent = L.fail; }).then(function () { go.disabled = false; });
    };
    form.querySelector('.as-ver').onclick = function () {
      var em = form.querySelector('.as-em').value.trim(), cd = form.querySelector('.as-code').value.trim(); er.textContent = '';
      api('/verify', { email: em, code: cd }).then(function (d) { if (d.ok) { try { localStorage.setItem('atm_social_tok', d.token); } catch (e) {} me = d.name; drawForm(); } else er.textContent = d.error === 'bad_code' || d.error === 'expired' ? L.bad : L.fail; })
        .catch(function () { er.textContent = L.fail; });
    };
  }
  function loadTs(cb) { if (window.turnstile) return cb(); var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = cb; document.head.appendChild(s); }
  function loadComments() { api('/comments?id=' + encodeURIComponent(cardId)).then(function (d) { drawItems(d.items || []); }).catch(function () {}); }
  function init() {
    api('/likes?ids=' + encodeURIComponent(cardId) + '&dev=' + encodeURIComponent(dev())).then(function (d) { setLike((d.counts || {})[cardId] || 0, (d.mine || []).indexOf(cardId) >= 0); }).catch(function () {});
    likeB.onclick = function () {
      var on = likeB.getAttribute('aria-pressed') !== 'true', n = +(nEl.textContent || 0); setLike(n + (on ? 1 : -1), on); /* optimistic */
      api('/like', { id: cardId, dev: dev() }).then(function (d) { if (d.id) setLike(d.n, d.liked); }).catch(function () { setLike(n, !on); });
    };
    box.querySelector('.as-cmb').onclick = function () { var t = form.querySelector('textarea,input'); if (t) t.focus(); };
    loadComments();
    if (tok()) api('/me', null, true).then(function (d) { me = d.name || null; if (!me) try { localStorage.removeItem('atm_social_tok'); } catch (e) {} drawForm(); }).catch(drawForm); else drawForm();
  }
  if (!place()) { var mo = new MutationObserver(function () { if (place()) mo.disconnect(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect(); }, 20000); }
})();
