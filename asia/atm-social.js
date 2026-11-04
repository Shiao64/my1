/* Asia Tango Map: 👍 likes + comments under a single event card (?card=ID), on the map and on DJ/organizer pages.
   Likes: no login, one per device (localStorage id + server dedupe), tap again to un-like.
   Comments: zh WeChat tab = add 探戈助理 (QR) + WeChat ID → 4-digit code for the friend request → 「我已添加」 unlocks one comment or like and alerts the owner; verified = unlimited; unverified after 3 daytime hours = deleted + banned (AUTO_EXPIRE), or email sign-up with a 6-digit code. API: /social/* on the subscribe Worker. */
(function () {
  var R = document.documentElement, zh = /^zh/i.test(R.getAttribute('data-asia-lang') || document.body.getAttribute('data-lang') || R.lang || '');
  var API = (window.ATM_SOCIAL_API || 'https://api.tangoweekend.org') + '/social', TSKEY = window.ATM_TS_KEY || (/(^|\.)tangoweekend\.org$/.test(location.hostname) ? '0x4AAAAAAFzkQw2fwneONelA' : '');
  var cardId = ''; try { cardId = new URLSearchParams(location.search).get('card') || ''; } catch (e) {}
  var pm = location.pathname.match(/^\/(?:zh\/|en\/)?(organizer|dj)\/([a-z0-9-]{1,48})\/?(?:index\.html)?$/i);
  if (pm && document.querySelector('.dj-main')) cardId = (pm[1].toLowerCase() === 'dj' ? 'dj:' : 'org:') + pm[2].toLowerCase();
  if (!/^(?:(?:org|dj):)?[A-Za-z0-9_-]{1,64}$/.test(cardId)) return;
  var L = zh ? { like: '赞', cm: '留言', none: '还没有留言，来说第一句吧。', ph: '写下你的留言…', post: '发布', join: '用邮箱留言', name: '你的名字', email: '你的邮箱',
      send: '发送验证码', code: '邮件里的 6 位验证码', verify: '验证', sent: '验证码已发到你的邮箱（15 分钟内有效，没收到请看垃圾邮件）。', as: '以 {n} 的身份留言 · ', out: '退出',
      need: '请填写名字和正确的邮箱。', bad: '验证码不对或已过期。', fail: '出错了，请稍后再试。', rate: '太频繁了，请稍后再试。', ts: '请先完成人机验证。', why: '填好资料，我们把验证码发到你的邮箱', upd: '我们会不定期把活动更新发到这个邮箱', city: '所在城市（必填）', ncity: '请填写你所在的城市。', role: '你跳的角色（必选）', rl: '领舞', rf: '跟舞', rb: '双角色', nrole: '请选择你跳的角色。', trd: '译文', org: '查看原文', shtr: '查看译文' }
    : { like: 'Like', cm: 'Comments', none: 'No comments yet. Be the first!', ph: 'Write a comment…', post: 'Post', join: 'Comment with email', name: 'Your name', email: 'Your email',
      send: 'Send code', code: '6-digit code from the email', verify: 'Verify', sent: 'We emailed you a code (valid 15 minutes; check spam if you don\'t see it).', as: 'Commenting as {n} · ', out: 'Sign out',
      need: 'Please enter your name and a valid email.', bad: 'Wrong or expired code.', fail: 'Something went wrong. Please try again later.', rate: 'Too many tries. Please try again later.', ts: 'Please complete the check first.', why: 'Fill in your details and we\'ll email you a code', upd: 'We\'ll send event updates to this address from time to time', city: 'Your city (required)', ncity: 'Please enter your city.', role: 'Your role (required)', rl: 'Leader', rf: 'Follower', rb: 'Both', nrole: 'Please choose your role.', trd: 'Translated', org: 'See original', shtr: 'See translation' };
  function dev() { var k = 'atm_dev_id', v = ''; try { v = localStorage.getItem(k) || ''; if (!/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))); localStorage.setItem(k, v); } } catch (e) { v = v || 'anon-' + Date.now().toString(36) + '0000000000'; } return v; }
  function tok() { try { return localStorage.getItem('atm_social_tok') || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(path, body, auth) {
    var o = { method: body ? 'POST' : 'GET', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    if (auth && tok()) o.headers.Authorization = 'Bearer ' + tok();
    return fetch(API + path, o).then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); });
  }
  function day(iso) { var d = new Date(iso); if (isNaN(d)) return ''; var c = new Date(d.getTime() + 8 * 3600e3); return (c.getUTCMonth() + 1) + '/' + c.getUTCDate(); }
  var css = '#atm-soc{max-width:560px;margin:10px auto 18px;padding:0 12px;box-sizing:border-box;font-family:inherit;color:#2a1a14}' +
    '#atm-soc .as-bar{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #ead9b8;border-bottom:1px solid #ead9b8}' +
    '#atm-soc .as-btn{display:inline-flex;align-items:center;gap:6px;background:none;border:0;border-radius:8px;padding:6px 10px;font-size:.95rem;font-weight:600;color:#65676b;cursor:pointer}' +
    '#atm-soc .as-btn:hover{background:#f3ece0}#atm-soc .as-like[aria-pressed="true"]{color:#0e6e78}#atm-soc .as-like[aria-pressed="true"] .as-ic{filter:none;transform:scale(1.08)}' +
    '#atm-soc .as-ic{font-size:1.15rem;line-height:1;filter:grayscale(1);transition:transform .15s}#atm-soc .as-n{font-variant-numeric:tabular-nums}' +
    '#atm-soc .as-list{list-style:none;margin:10px 0;padding:0}#atm-soc .as-item{background:#f6f1e7;border-radius:14px;padding:8px 12px;margin:0 0 8px}' +
    '#atm-soc .as-item b{color:#0a4f57;font-size:.88rem}#atm-soc .as-item time{color:#7a6255;font-size:.8rem}#atm-soc .as-item p{margin:3px 0 0;font-size:.92rem;line-height:1.5;white-space:pre-wrap;word-break:break-word}#atm-soc .as-cty{color:#7a6255;font-size:.8rem}#atm-soc .as-trt{background:none;border:0;padding:2px 0;color:#7a6255;font-size:.75rem;cursor:pointer;text-decoration:underline}' +
    '#atm-soc .as-empty{color:#7a6255;font-size:.88rem;margin:10px 0}#atm-soc .as-in{width:100%;box-sizing:border-box;min-height:40px;padding:8px 10px;border:1px solid #ead9b8;border-radius:10px;font-size:16px;margin:4px 0;font-family:inherit}' +
    '#atm-soc .as-tabs{display:flex;gap:0;margin:10px 0 6px;border:1px solid #0e6e78;border-radius:8px;overflow:hidden}#atm-soc .as-tab{flex:1;padding:9px 0;border:0;background:#fff;color:#0e6e78;font:600 .95rem system-ui;cursor:pointer}#atm-soc .as-tab[aria-selected=true]{background:#0e6e78;color:#fff}#atm-soc [data-m=wx] .as-emf,#atm-soc [data-m=wx] .as-emerr,#atm-soc [data-m=wx] .as-step2,#atm-soc [data-m=em] .as-wx{display:none!important}#atm-soc .as-row{display:flex;gap:8px;align-items:center}#atm-soc .as-row>*{flex:1 1 0;min-width:0}#atm-soc .as-row>.as-go{flex:0 0 auto}@media (max-width:420px){#atm-soc .as-row:not(.as-cr):not(.as-wsm){flex-wrap:wrap}#atm-soc .as-row:not(.as-cr):not(.as-wsm)>.as-in{flex:1 1 100%}}' +
    '#atm-soc .as-wt{margin:12px 0 4px;font-size:1.05rem;color:#0a4f57}#atm-soc .as-wc{margin:2px 0;font-size:.9rem;color:#2a1a14}#atm-soc .as-wsm>.as-in{font-size:14px;min-height:34px;padding:4px 8px}#atm-soc .as-big{display:block;width:100%;min-height:46px;margin:8px 0 2px;font-size:1.05rem;font-weight:700}#atm-soc .as-rule{font-size:.75rem;color:#9a9a9a;margin:10px 0 2px;line-height:1.5}#atm-soc .as-note{background:#eef6f6;border-radius:8px;padding:6px 10px;font-size:.88rem;color:#0a4f57;margin:6px 0}#atm-soc .as-wait{background:#fff6d6;color:#6b5220}#atm-soc .as-vf{font-weight:700}#atm-soc .as-qr{text-align:center;margin:8px 0}#atm-soc .as-qr img{display:block;margin:0 auto;width:180px;height:180px;border-radius:10px;border:1px solid #ead9b8;-webkit-touch-callout:default}#atm-soc .as-code4{text-align:center;font:800 2.6rem/1.1 ui-monospace,Menlo,monospace;letter-spacing:.25em;color:#0a4f57;margin:10px 0 2px}#atm-soc .as-cdh{text-align:center}#atm-soc .as-go.as-add{background:#1f9d55;border-color:#1f9d55;color:#fff}#atm-soc .as-addh{text-align:center}' +
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
  var me = null, wxi = null, tsId = null, tsTok = '';   // wxi = {wx:'pending'|'verified', used, wxdev} for WeChat sessions
  var inWx = /MicroMessenger/i.test(navigator.userAgent || ''), QR = window.ATM_WX_QR || '/asia/tango-assistant-qr.jpg', poll = null;
  var WXT = { title: '先加探戈助理为好友，就能留言', ok: '留下微信号，就表示同意探戈助理加你为好友', qr: inWx ? '长按二维码，加探戈助理为好友' : '用微信扫码，加探戈助理为好友', ph: '你的微信号', cy: '所在城市（选填）', rl: '你跳的角色（选填）', go: '获取验证码',
    cd: '加好友时，请在申请里写上这个验证码', add: '我已添加', addh: '按下后，探戈助理通常几分钟内通过', chk: '已通知探戈助理，正在核对', na: '请先加探戈助理好友，再按「我已添加」。',
    once: '你现在可以留言一次，或点一次赞。探戈助理加你为好友后，就不再限制', wait: '探戈助理正在加你为好友，通过后就可以继续留言', ver: '已验证', rule: inWx ? '长按二维码加探戈助理为好友，申请时写上验证码。' : '请填真实的微信号，探戈助理会来加你。', ban: '这个微信号不能再用来留言。' /* v12: 3-hour expiry still enforced in backend; user removed the delete/ban sentence from the panel */, need: '请填写你的微信号。', first: '请先在下面填写微信号，获取验证码。' };
  function qrHtml() { return '<div class="as-qr"><img src="' + esc(QR) + '" alt="探戈助理二维码" width="180" height="180" loading="lazy"><p class="as-meta">' + WXT.qr + '</p></div>'; }
  function wxHead() { return '<h4 class="as-wt">' + WXT.title + '</h4><p class="as-wc">' + WXT.ok + '</p>'; }
  function setPoll() { var want = !!(me && wxi && wxi.wx === 'pending' && wxi.added); if (want && !poll) poll = setInterval(function () { if (document.hidden) return; api('/me', null, true).then(function (d) { if (d.error === 'wx_banned') { banned(); return; } if (d.wx && wxi && d.wx !== wxi.wx) { wxi = { wx: d.wx, used: d.used, wxdev: d.wxdev, added: d.added, code: d.code }; drawForm(); } }).catch(function () {}); }, 30000); if (!want && poll) { clearInterval(poll); poll = null; } }
  function signOut() { try { localStorage.removeItem('atm_social_tok'); } catch (e) {} me = null; wxi = null; setPoll(); }
  function banned(msg) { signOut(); drawForm(); var e = form.querySelector('.as-wxerr') || form.querySelector('.as-err'); if (e) e.textContent = msg || WXT.ban; }
  function drawForm() {
    if (me) {
      var pend = wxi && wxi.wx === 'pending', used = pend && wxi.used, nadd = pend && !wxi.added;
      if (nadd) {   // got the code, has not pressed 「我已添加」 yet
        form.innerHTML = '<div class="as-wx">' + wxHead() + qrHtml() + '<p class="as-code4">' + esc(wxi.code || '') + '</p><p class="as-wc as-cdh">' + WXT.cd + '</p>' +
          '<button type="button" class="as-go as-big as-add">' + WXT.add + '</button><p class="as-meta as-addh">' + WXT.addh + '</p><p class="as-err as-wxerr"></p>' +
          '<p class="as-meta">' + esc(L.as.replace('{n}', me)) + '<a class="as-out">' + L.out + '</a></p><p class="as-rule">' + WXT.rule + '</p></div>';
        form.querySelector('.as-add').onclick = function () { var go = this, e = form.querySelector('.as-wxerr'); go.disabled = true; e.textContent = '';
          api('/wx-added', {}, true).then(function (d) { if (d.ok) { wxi.added = true; if (d.wx) wxi.wx = d.wx; drawForm(); } else if (d.error === 'wx_banned') banned(); else if (d.error === 'auth') { signOut(); drawForm(); } else e.textContent = L.fail; })
            .catch(function () { e.textContent = L.fail; }).then(function () { go.disabled = false; }); };
        form.querySelector('.as-out').onclick = function () { signOut(); drawForm(); };
        setPoll(); return;
      }
      form.innerHTML = (wxi && wxi.wx === 'verified' ? '<p class="as-ok as-vf">✓ ' + WXT.ver + '</p>' : '') + (pend ? '<p class="as-note as-chk">' + WXT.chk + '</p>' : '') + (pend && !used ? '<p class="as-note">' + WXT.once + '</p>' : '') + (used ? '<p class="as-note as-wait">' + WXT.wait + '</p>' : '<textarea class="as-in as-body" maxlength="1000" placeholder="' + L.ph + '"></textarea>') +
        '<p class="as-meta">' + esc(L.as.replace('{n}', me)) + '<a class="as-out">' + L.out + '</a></p><p class="as-err"></p>' + (used ? '' : '<button type="button" class="as-go as-post">' + L.post + '</button>') + (pend ? '<p class="as-rule">' + WXT.rule + '</p>' : '');
      setPoll();
      form.querySelector('.as-out').onclick = function () { signOut(); drawForm(); };
      var pb = form.querySelector('.as-post'); if (pb) pb.onclick = function () {
        var b = form.querySelector('.as-body'), t = b.value.trim(), er = form.querySelector('.as-err'), go = this; if (!t) return; go.disabled = true; er.textContent = '';
        api('/comment', { id: cardId, body: t }, true).then(function (d) { if (d.ok) { b.value = ''; loadComments(); if (pend) { wxi.used = true; drawForm(); } } else if (d.error === 'auth') { signOut(); drawForm(); } else if (d.error === 'wx_banned') banned(); else if (d.error === 'wx_used') { wxi.used = true; drawForm(); } else if (d.error === 'wx_not_added') { wxi.added = false; drawForm(); } else er.textContent = d.error === 'rate_limited' ? L.rate : L.fail; })
          .catch(function () { er.textContent = L.fail; }).then(function () { go.disabled = false; });
      };
      return;
    }
    form.innerHTML = (zh ? '<div class="as-tabs" role="tablist"><button type="button" class="as-tab" data-t="wx">微信</button><button type="button" class="as-tab" data-t="em">邮箱</button></div>' : '') +
      '<div class="as-emf"><h4 class="as-wt">' + L.join + '</h4><p class="as-wc">' + L.why + '</p><input class="as-in as-nm" maxlength="40" autocomplete="name" placeholder="' + L.name + '"><div class="as-row as-cr"><input class="as-in as-cy0" maxlength="40" autocomplete="address-level2" placeholder="' + L.city + '"><select class="as-in as-role"><option value="">' + L.role + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div><input class="as-in as-em" type="email" autocomplete="email" placeholder="' + L.email + '"><p class="as-meta as-upd">' + L.upd + '</p>' +
      '<div class="as-ts"></div><button type="button" class="as-go as-send">' + L.send + '</button></div>' +
      (zh ? '<div class="as-wx">' + wxHead() + qrHtml() +
        '<input class="as-in as-wxid" maxlength="64" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + WXT.ph + '"><div class="as-row as-wsm"><input class="as-in as-wcy" maxlength="40" autocomplete="address-level2" placeholder="' + WXT.cy + '"><select class="as-in as-wrl"><option value="">' + WXT.rl + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div>' +
        '<button type="button" class="as-go as-big as-wxsub">' + WXT.go + '</button><p class="as-err as-wxerr"></p><p class="as-rule">' + WXT.rule + '</p></div>' : '') +
      '<p class="as-err as-emerr"></p><div class="as-step2" hidden><p class="as-ok"></p><input class="as-in as-code" inputmode="numeric" maxlength="6" placeholder="' + L.code + '"><button type="button" class="as-go as-ver">' + L.verify + '</button></div>';
    var er = form.querySelector('.as-emerr');
    if (zh) { var wer = form.querySelector('.as-wxerr'), setM = function (m) { form.setAttribute('data-m', m); [].forEach.call(form.querySelectorAll('.as-tab'), function (t) { t.setAttribute('aria-selected', t.getAttribute('data-t') === m ? 'true' : 'false'); }); er.textContent = ''; wer.textContent = ''; try { localStorage.setItem('atm_vm', m); } catch (e) {} }; [].forEach.call(form.querySelectorAll('.as-tab'), function (t) { t.onclick = function () { setM(t.getAttribute('data-t')); }; }); var vm0 = 'wx'; try { vm0 = localStorage.getItem('atm_vm') || 'wx'; } catch (e) {} setM(vm0);
      var wb = form.querySelector('.as-wx');
      wb.querySelector('.as-wxsub').onclick = function () { var go = this, wx = wb.querySelector('.as-wxid').value.trim(), cy = wb.querySelector('.as-wcy').value.trim(), rl = wb.querySelector('.as-wrl').value; wer.textContent = '';
        if (!wx) { wer.textContent = WXT.need; return; }
        go.disabled = true; fetch(API.replace(/\/social$/, '') + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ types: ['featured', 'regular'], cities: [], name: wx, email: '', wechat: wx, city: cy, role: rl, lang: 'zh', website: '' }) })
          .then(function (r) { return r.json(); }).then(function (d) { if (d.error === 'wx_banned') { wer.textContent = WXT.ban; return; } if (!d.ok) { wer.textContent = d.error === 'rate_limited' ? L.rate : L.fail; return; }
            return api('/wx-login', { lang: 'zh', wechat: wx, city: cy, role: rl }).then(function (d2) {
              if (d2.ok) { try { localStorage.setItem('atm_social_tok', d2.token); } catch (e) {} me = d2.name; wxi = { wx: d2.wx, used: d2.used, wxdev: d2.wxdev, added: d2.added, code: d2.code || d.wechat_code }; drawForm(); refreshLike(); }
              else wer.textContent = d2.error === 'wx_banned' ? WXT.ban : L.fail; });
          }).catch(function () { wer.textContent = L.fail; }).then(function () { go.disabled = false; }); }; }
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
      api('/verify', { email: em, code: cd }).then(function (d) { if (d.ok) { try { localStorage.setItem('atm_social_tok', d.token); } catch (e) {} me = d.name; wxi = null; drawForm(); } else er.textContent = d.error === 'bad_code' || d.error === 'expired' ? L.bad : L.fail; })
        .catch(function () { er.textContent = L.fail; });
    };
  }
  function loadTs(cb) { if (window.turnstile) return cb(); var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = cb; document.head.appendChild(s); }
  function loadComments() { api('/comments?id=' + encodeURIComponent(cardId)).then(function (d) { drawItems(d.items || []); }).catch(function () {}); }
  function likeDev() { return wxi && wxi.wxdev ? wxi.wxdev : dev(); }
  function refreshLike() { api('/likes?ids=' + encodeURIComponent(cardId) + '&dev=' + encodeURIComponent(likeDev())).then(function (d) { setLike((d.counts || {})[cardId] || 0, (d.mine || []).indexOf(cardId) >= 0); }).catch(function () {}); }
  function init() {
    likeB.onclick = function () {
      if (zh && !me) { var w = form.querySelector('.as-wxid'), e = form.querySelector('.as-wxerr'); if (w && form.getAttribute('data-m') === 'wx') { if (e) e.textContent = WXT.first; w.focus(); return; } }
      var on = likeB.getAttribute('aria-pressed') !== 'true', n = +(nEl.textContent || 0);
      if (on && wxi && wxi.wx === 'pending' && !wxi.added) { var e3 = form.querySelector('.as-wxerr'); if (e3) e3.textContent = WXT.na; return; }
      if (on && wxi && wxi.wx === 'pending' && wxi.used) { var e2 = form.querySelector('.as-err'); if (e2) e2.textContent = WXT.wait; return; }
      setLike(n + (on ? 1 : -1), on); /* optimistic */
      api('/like', { id: cardId, dev: dev() }, true).then(function (d) { if (d.id) { setLike(d.n, d.liked); if (d.liked && wxi && wxi.wx === 'pending' && !wxi.used) { wxi.used = true; drawForm(); } } else { setLike(n, !on); if (d.error === 'wx_banned') banned(); else if (d.error === 'wx_used') { wxi && (wxi.used = true); drawForm(); } else if (d.error === 'wx_not_added') { wxi && (wxi.added = false); drawForm(); } } }).catch(function () { setLike(n, !on); });
    };
    box.querySelector('.as-cmb').onclick = function () { var t = form.querySelector('textarea,input'); if (t) t.focus(); };
    loadComments();
    if (tok()) api('/me', null, true).then(function (d) { if (d.error === 'wx_banned') { banned(); refreshLike(); return; } me = d.name || null; wxi = d.wx ? { wx: d.wx, used: d.used, wxdev: d.wxdev, added: d.added, code: d.code } : null; if (!me) signOut(); drawForm(); refreshLike(); }).catch(function () { drawForm(); refreshLike(); }); else { drawForm(); refreshLike(); }
  }
  if (!place()) { var mo = new MutationObserver(function () { if (place()) mo.disconnect(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect(); }, 20000); }
})();
