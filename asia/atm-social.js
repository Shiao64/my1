/* Asia Tango Map: 👍 likes + comments under a single event card (?card=ID), on the map and on DJ/organizer pages.
   Likes: no login, one per device (localStorage id + server dedupe), tap again to un-like.
   Comments: the list starts collapsed. 留言 toggles it for anyone. 写留言 opens the composer, or the email signup only when no session. One atm_social_tok covers every card on this origin. zh shows 微信 | 邮箱; the WeChat tab stays visible but disabled. Email sign-up sends a one-time confirm link (15 min); the page stores the session from #atm= into atm_social_tok. API: /social/* on the subscribe Worker. */
(function () {
  var R = document.documentElement, zh = /^zh/i.test(R.getAttribute('data-asia-lang') || document.body.getAttribute('data-lang') || R.lang || '');
  var API = (window.ATM_SOCIAL_API || 'https://api.tangoweekend.org') + '/social', TSKEY = window.ATM_TS_KEY || (/(^|\.)tangoweekend\.org$/.test(location.hostname) || /\.my1-7p3\.pages\.dev$/.test(location.hostname) ? '0x4AAAAAAFzkQw2fwneONelA' : '');
  var cardId = ''; try { cardId = new URLSearchParams(location.search).get('card') || ''; } catch (e) {}
  var cardPage = !!cardId;
  var pm = location.pathname.match(/^\/(?:zh\/|en\/)?(organizer|dj)\/([a-z0-9-]{1,48})\/?(?:index\.html)?$/i);
  if (pm && document.querySelector('.dj-main')) cardId = (pm[1].toLowerCase() === 'dj' ? 'dj:' : 'org:') + pm[2].toLowerCase();
  if (!/^(?:(?:org|dj):)?[A-Za-z0-9_-]{1,64}$/.test(cardId)) return;
  var L = zh ? { like: '赞', cm: '留言', none: '暂无留言', more: '查看更多留言', write: '写留言…', ph: '写下你的留言…', post: '发布', join: '用邮箱开通留言', name: '你的名字', email: '你的邮箱',
      send: '发送确认邮件', resend: '重新发送', sent: '确认邮件已发出。请打开邮箱，点邮件里的链接（约 15 分钟内有效，没收到请看垃圾邮件）。', as: '以 {n} 的身份留言 · ', out: '退出',
      need: '请填写名字和正确的邮箱。', fail: '出错了，请稍后再试。', rate: '太频繁了，请稍后再试。', ts: '请先完成人机验证。', why: '填写名字、城市、角色和邮箱，点「发送确认邮件」。打开邮箱点确认链接后，就可以在这张卡片下留言。', one: '这张卡你已经留过言了。', day: '今天已留过 2 条了，明天再写。', city: '所在城市（必填）', ncity: '请填写你所在的城市。', role: '你跳的角色（必选）', rl: '领舞', rf: '跟舞', rb: '双角色', nrole: '请选择你跳的角色。', trd: '译文', org: '查看原文', shtr: '查看译文' }
    : { like: 'Like', cm: 'Comments', none: 'No comments yet.', more: 'View more comments', write: 'Write a comment…', ph: 'Write a comment…', post: 'Post', join: 'Comment with email', name: 'Your name', email: 'Your email',
      send: 'Send confirmation email', resend: 'Resend', sent: 'Confirmation email sent. Open your inbox and tap the link (valid about 15 minutes; check spam).', as: 'Commenting as {n} · ', out: 'Sign out',
      need: 'Please enter your name and a valid email.', fail: 'Something went wrong. Please try again later.', rate: 'Too many tries. Please try again later.', ts: 'Please complete the check first.', why: 'Enter your name, city, role, and email, then tap Send confirmation email. Open the email and tap the link to comment on this card.', one: 'You\'ve already commented on this card.', day: 'You\'ve posted 2 comments today. Try again tomorrow.', city: 'Your city (required)', ncity: 'Please enter your city.', role: 'Your role (required)', rl: 'Leader', rf: 'Follower', rb: 'Both', nrole: 'Please choose your role.', trd: 'Translated', org: 'See original', shtr: 'See translation' };
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
  var css = '#atm-soc{max-width:560px;margin:6px auto 14px;padding:0 12px;box-sizing:border-box;font-family:inherit;color:#2a1a14}' +
    '#atm-soc .as-bar{display:flex;align-items:center;gap:4px;padding:2px 0;border-top:1px solid #ead9b8}' +
    '#atm-soc .as-btn{display:inline-flex;align-items:center;gap:4px;background:none;border:0;border-radius:6px;padding:4px 8px;font-size:.82rem;font-weight:600;color:#7a6255;cursor:pointer}' +
    '#atm-soc .as-btn:hover{background:#f3ece0}#atm-soc .as-like[aria-pressed="true"]{color:#0e6e78}#atm-soc .as-like[aria-pressed="true"] .as-ic{filter:none}' +
    '#atm-soc .as-ic{font-size:.95rem;line-height:1;filter:grayscale(1)}#atm-soc .as-n{font-variant-numeric:tabular-nums;font-weight:500}' +
    '#atm-soc .as-list{list-style:none;margin:4px 0 2px;padding:0}#atm-soc .as-item{background:#f6f1e7;border-radius:8px;padding:6px 8px;margin:0 0 6px}' +
    '#atm-soc .as-item b{color:#0a4f57;font-size:.8rem;font-weight:600}#atm-soc .as-item time{color:#7a6255;font-size:.75rem}#atm-soc .as-item p{margin:2px 0 0;font-size:.84rem;line-height:1.35;white-space:pre-wrap;word-break:break-word}#atm-soc .as-cty{color:#7a6255;font-size:.75rem}#atm-soc .as-trt{background:none;border:0;padding:2px 0;color:#7a6255;font-size:.72rem;cursor:pointer;text-decoration:underline}' +
    '#atm-soc .as-empty{color:#9a8b80;font-size:.8rem;margin:6px 0}#atm-soc .as-in{width:100%;box-sizing:border-box;min-height:40px;padding:8px 10px;border:1px solid #ead9b8;border-radius:10px;font-size:16px;margin:4px 0;font-family:inherit}' +
    '#atm-soc .as-tabs{display:flex;gap:0;margin:10px 0 6px;border:1px solid #0e6e78;border-radius:8px;overflow:hidden}#atm-soc .as-tab{flex:1;padding:9px 0;border:0;background:#fff;color:#0e6e78;font:600 .95rem system-ui;cursor:pointer}#atm-soc .as-tab[aria-selected=true]{background:#0e6e78;color:#fff}#atm-soc .as-tab.as-off,#atm-soc .as-tab:disabled{opacity:.45;cursor:not-allowed;background:#eee;color:#9a9a9a}#atm-soc .as-wx.as-locked{opacity:.45;pointer-events:none}#atm-soc [data-m=wx] .as-emf,#atm-soc [data-m=wx] .as-emerr,#atm-soc [data-m=wx] .as-step2,#atm-soc [data-m=em] .as-wx{display:none!important}#atm-soc .as-row{display:flex;gap:8px;align-items:center}#atm-soc .as-row>*{flex:1 1 0;min-width:0}#atm-soc .as-row>.as-go{flex:0 0 auto}@media (max-width:420px){#atm-soc .as-row:not(.as-cr):not(.as-wsm){flex-wrap:wrap}#atm-soc .as-row:not(.as-cr):not(.as-wsm)>.as-in{flex:1 1 100%}}' +
    '#atm-soc .as-wt{margin:12px 0 4px;font-size:1.05rem;color:#0a4f57}#atm-soc .as-wc{margin:2px 0;font-size:.9rem;color:#2a1a14}#atm-soc .as-wsm>.as-in{font-size:14px;min-height:34px;padding:4px 8px}#atm-soc .as-big{display:block;width:100%;min-height:46px;margin:8px 0 2px;font-size:1.05rem;font-weight:700}#atm-soc .as-rule{font-size:.75rem;color:#9a9a9a;margin:10px 0 2px;line-height:1.5}#atm-soc .as-note{background:#eef6f6;border-radius:8px;padding:6px 10px;font-size:.88rem;color:#0a4f57;margin:6px 0}#atm-soc .as-wait{background:#fff6d6;color:#6b5220}#atm-soc .as-vf{font-weight:700}#atm-soc .as-qr{text-align:center;margin:8px 0}#atm-soc .as-qr img{display:block;margin:0 auto;width:180px;height:180px;border-radius:10px;border:1px solid #ead9b8;-webkit-touch-callout:default}#atm-soc .as-code4{text-align:center;font:800 2.6rem/1.1 ui-monospace,Menlo,monospace;letter-spacing:.25em;color:#0a4f57;margin:10px 0 2px}#atm-soc .as-cdh{text-align:center}#atm-soc .as-go.as-add{background:#1f9d55;border-color:#1f9d55;color:#fff}#atm-soc .as-addh{text-align:center}' +
    '#atm-soc textarea.as-in{min-height:64px;resize:vertical}#atm-soc .as-go{min-height:40px;padding:0 18px;border-radius:999px;background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;font-size:.95rem;cursor:pointer}#atm-soc .as-go:disabled{opacity:.5}' +
    '#atm-soc .as-meta{font-size:.8rem;color:#7a6255;margin:4px 0}#atm-soc .as-meta a{color:#0e6e78;cursor:pointer}#atm-soc .as-err{color:#b5654a;font-size:.85rem;min-height:1em;margin:4px 0}#atm-soc .as-ok{color:#0a4f57;font-size:.85rem;margin:4px 0}' +
    '#atm-soc .as-panel[hidden],#atm-soc .as-form[hidden],#atm-soc .as-write[hidden],#atm-soc .as-more[hidden]{display:none!important}#atm-soc .as-more{display:block;margin:8px 0 4px;padding:0;border:0;background:none;color:#7a6255;font:inherit;font-size:.82rem;text-align:left;cursor:pointer;text-decoration:underline;text-underline-offset:2px}#atm-soc .as-write{display:block;width:100%;box-sizing:border-box;margin:6px 0 2px;padding:8px 12px;border:1px solid #ead9b8;border-radius:8px;background:#fbf5e9;color:#9a8b80;font:inherit;font-size:.84rem;text-align:left;cursor:text}' +
    '#atm-soc .as-pv{background:#fff6d6;border:1px dashed #e8c06a;border-radius:8px;padding:4px 8px;font-size:.8rem;color:#6b5220}' +
    '#atm-soc .as-copyrow{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:8px 0 2px}#atm-soc .as-wid{font:700 .95rem/1.3 ui-monospace,Menlo,monospace;color:#0a4f57}#atm-soc .as-copy{border:1px solid #0e6e78;background:#fff;color:#0e6e78;border-radius:999px;padding:4px 12px;cursor:pointer;font:600 .85rem inherit}#atm-soc .as-ph{text-align:center}' +
    '#as-wxpop{position:fixed;top:0;right:0;bottom:0;left:0;width:100%;height:100%;z-index:200000;background:rgba(42,26,20,.48);display:flex;align-items:flex-end;justify-content:center;padding:12px;box-sizing:border-box}#as-wxpop .as-sheet{background:#fffaf3;border-radius:18px;padding:14px 16px 18px;width:min(420px,100%);max-height:92vh;overflow:auto;box-sizing:border-box;box-shadow:0 16px 48px rgba(42,26,20,.28)}#as-wxpop .as-x{float:right;border:0;background:transparent;font-size:1.6rem;line-height:1;color:#7a6255;cursor:pointer;padding:0 2px}' +
    '#as-wxpop .as-qr{text-align:center;margin:8px 0;clear:both}#as-wxpop .as-qr img{display:block;margin:0 auto;width:180px;height:180px;border-radius:10px;border:1px solid #ead9b8;-webkit-touch-callout:default}#as-wxpop .as-meta{font-size:.8rem;color:#7a6255;margin:4px 0;text-align:center}#as-wxpop .as-code4{text-align:center;font:800 2.6rem/1.1 ui-monospace,Menlo,monospace;letter-spacing:.25em;color:#0a4f57;margin:10px 0 2px}#as-wxpop .as-wc{margin:2px 0;font-size:.9rem;color:#2a1a14}#as-wxpop .as-cdh,#as-wxpop .as-addh{text-align:center}' +
    '#as-wxpop .as-go{display:block;width:100%;min-height:46px;margin:8px 0 2px;border-radius:999px;background:#0e6e78;color:#f6e3b4;border:1px solid #e8c06a;font-size:1.05rem;font-weight:700;cursor:pointer}#as-wxpop .as-go.as-add{background:#1f9d55;border-color:#1f9d55;color:#fff}#as-wxpop .as-go:disabled{opacity:.5}#as-wxpop .as-err{color:#b5654a;font-size:.85rem;min-height:1em;margin:4px 0;text-align:center}@media (min-width:640px){#as-wxpop{align-items:center}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var box = document.createElement('section'); box.id = 'atm-soc'; box.setAttribute('data-card', cardId);
  box.innerHTML = '<div class="as-bar"><button type="button" class="as-btn as-like" aria-pressed="false"><span class="as-ic">👍</span><span class="as-l">' + L.like + '</span><span class="as-n" data-n="0"></span></button>' +
    '<button type="button" class="as-btn as-cmb" aria-expanded="false" aria-controls="atm-soc-panel"><span class="as-ic">💬</span><span>' + L.cm + '</span><span class="as-n as-cn"></span></button></div>' +
    '<div class="as-panel" id="atm-soc-panel" hidden><button type="button" class="as-more" hidden></button><ul class="as-list" aria-live="polite"></ul><button type="button" class="as-write">' + L.write + '</button><div class="as-form" hidden></div></div>';
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
  var allItems = [], shown = 3;
  function drawItems(items) {
    if (items) allItems = items;
    var rows = allItems.slice(0, shown).reverse(), more = box.querySelector('.as-more');
    box.querySelector('.as-cn').textContent = allItems.length || '';
    list.innerHTML = allItems.length ? rows.map(function (c) { return '<li class="as-item"><b>' + esc(c.name) + '</b>' + (c.city ? '<span class="as-cty"> · ' + esc(c.city) + '</span>' : '') + '<time> · ' + esc(day(c.at)) + '</time>' + (function () { var want = zh ? 'zh' : 'en', t = c.tr && c.lang && c.lang !== want;
        return t ? '<p class="as-txt">' + esc(c.tr) + '</p><p class="as-txt as-org" hidden>' + esc(c.body) + '</p><button type="button" class="as-trt" data-t="1">' + L.trd + ' · ' + L.org + '</button>' : '<p>' + esc(c.body) + '</p>'; })() + '</li>'; }).join('') : '<li class="as-empty">' + L.none + '</li>';
    list.querySelectorAll('.as-trt').forEach(function (bt) { bt.onclick = function () { var li = bt.parentNode, ps = li.querySelectorAll('.as-txt'), o = bt.getAttribute('data-t') === '1'; ps[0].hidden = o; ps[1].hidden = !o; bt.setAttribute('data-t', o ? '0' : '1'); bt.textContent = o ? L.shtr : L.trd + ' · ' + L.org; }; });
    if (more) { more.hidden = shown >= allItems.length; more.textContent = L.more; }
  }
  var me = null, wxi = null, tsId = null, tsTok = '', writing = false, writeQueued = false, open = false, session = 'guest', mineComment = false;   // session: guest | loading | in | error. writing: 写留言 was tapped. wxi = {wx:'pending'|'verified', used, wxdev}. mineComment: this confirmed user already has a comment on this card.
  var QR = window.ATM_WX_QR || '/asia/tango-assistant-qr.jpg', WXID = window.ATM_WX_ID || 'wxid_ixaen7sydccp12', poll = null;
  function inWeChat() { var ua = navigator.userAgent || ''; return /MicroMessenger|WeChat|Weixin/i.test(ua) || typeof window.WeixinJSBridge !== 'undefined' || window.__wxjs_environment === 'miniprogram'; }
  var WXT = { title: '留微信号或邮箱获取验证码', ph: '你的微信号', cy: '所在城市（选填）', rl: '你跳的角色（选填）', go: '获取验证码',
    cd: '加好友时，请在申请里写上这个验证码', add: '我已添加', addh: '按下后，探戈助理通常几分钟内通过', chk: '已通知探戈助理，正在核对', na: '请先加探戈助理好友，再按「我已添加」。',
    once: '你现在可以留言一次，或点一次赞。探戈助理加你为好友后，就不再限制', wait: '探戈助理正在加你为好友，通过后就可以继续留言', ver: '已验证', ban: '这个微信号不能再用来留言。', need: '请填写你的微信号。', first: '请先在下面填写微信号，获取验证码。',
    qrCap: '长按二维码，加探戈助理为好友', phone: '在手机微信里搜索这个微信号，加探戈助理为好友。', copyId: '复制微信号', copied: '已复制', seeQr: '查看二维码' };
  function wxHead() { return '<h4 class="as-wt">' + WXT.title + '</h4>'; }
  function qrBlock() { return '<div class="as-qr"><img src="' + esc(QR) + '" alt="探戈助理二维码" width="180" height="180"><p class="as-meta">' + WXT.qrCap + '</p></div>'; }
  var popHold = 0;
  function closePop(user) { var p = document.getElementById('as-wxpop'); if (p) p.remove(); if (user) popHold = Date.now(); }
  function copyText(btn, text) {
    var label = btn.getAttribute('data-label') || btn.textContent;
    function done() { btn.textContent = WXT.copied; setTimeout(function () { btn.textContent = label; }, 1400); }
    function fb() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb); else fb();
  }
  function setPoll() { var want = !!(me && wxi && wxi.wx === 'pending' && wxi.added); if (want && !poll) poll = setInterval(function () { if (document.hidden) return; api('/me', null, true).then(function (d) { if (d.error === 'wx_banned') { banned(); return; } if (d.wx && wxi && d.wx !== wxi.wx) { wxi = { wx: d.wx, used: d.used, wxdev: d.wxdev, added: d.added, code: d.code }; drawForm(); } }).catch(function () {}); }, 30000); if (!want && poll) { clearInterval(poll); poll = null; } }
  function signOut() { popHold = 0; closePop(); try { localStorage.removeItem('atm_social_tok'); } catch (e) {} me = null; wxi = null; mineComment = false; session = 'guest'; setPoll(); }
  function banned(msg) { signOut(); drawForm(); var e = form.querySelector('.as-wxerr') || form.querySelector('.as-err'); if (e) e.textContent = msg || WXT.ban; }
  function pressAdded() {
    var buttons = document.querySelectorAll('.as-add'); [].forEach.call(buttons, function (b) { b.disabled = true; });
    var pop = document.getElementById('as-wxpop'), e = (pop && pop.querySelector('.as-wxerr')) || form.querySelector('.as-wxerr'); if (e) e.textContent = '';
    api('/wx-added', {}, true).then(function (d) { if (d.ok) { wxi.added = true; if (d.wx) wxi.wx = d.wx; closePop(); drawForm(); } else if (d.error === 'wx_banned') banned(); else if (d.error === 'auth') { signOut(); drawForm(); } else if (e) e.textContent = L.fail; })
      .catch(function () { if (e) e.textContent = L.fail; }).then(function () { [].forEach.call(document.querySelectorAll('.as-add'), function (b) { b.disabled = false; }); });
  }
  function openPop() {
    if (!inWeChat() || !wxi) return; closePop();
    var pop = document.createElement('div'); pop.id = 'as-wxpop';
    pop.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;width:100%;height:100%;z-index:200000;background:rgba(42,26,20,.48);display:-webkit-flex;display:flex;-webkit-align-items:flex-end;align-items:flex-end;-webkit-justify-content:center;justify-content:center;padding:12px;box-sizing:border-box;';
    pop.innerHTML = '<div class="as-sheet" role="dialog" aria-modal="true" aria-label="加探戈助理"><button type="button" class="as-x" aria-label="关闭">×</button>' + qrBlock() +
      '<p class="as-code4">' + esc(wxi.code || '') + '</p><p class="as-wc as-cdh">' + WXT.cd + '</p><button type="button" class="as-go as-big as-add">' + WXT.add + '</button><p class="as-meta as-addh">' + WXT.addh + '</p><p class="as-err as-wxerr"></p></div>';
    (document.body || document.documentElement).appendChild(pop);
    var born = Date.now();
    pop.querySelector('.as-x').onclick = function () { closePop(true); };
    pop.addEventListener('click', function (ev) { if (Date.now() - born < 700) { ev.preventDefault(); ev.stopPropagation(); return; } if (ev.target === pop) closePop(true); });
    pop.addEventListener('touchend', function (ev) { if (Date.now() - born < 700 && ev.target === pop) { ev.preventDefault(); ev.stopPropagation(); } }, true);
    pop.querySelector('.as-add').onclick = pressAdded;
  }
  function armPop() {
    if (!inWeChat() || !wxi || wxi.added || (wxi.wx && wxi.wx !== 'pending')) return;
    if (popHold && Date.now() - popHold < 1200) return;
    openPop();
    setTimeout(function () {
      if (popHold && Date.now() - popHold < 1200) return;
      if (!document.getElementById('as-wxpop') && wxi && !wxi.added && wxi.wx === 'pending' && inWeChat()) openPop();
    }, 450);
  }
  function syncPanel() {
    var panel = box.querySelector('.as-panel'), cmb = box.querySelector('.as-cmb'), writeBtn = box.querySelector('.as-write');
    if (panel) panel.hidden = !open;
    if (cmb) cmb.setAttribute('aria-expanded', open ? 'true' : 'false');
    var delegate = !me && cardPage && !!document.getElementById('tsub-open');
    var real = !!(open && !delegate && ((writing && session !== 'loading') || (me && mineComment)));
    if (writeBtn) writeBtn.hidden = !open || real;
    form.hidden = !real;
  }
  function mountTs() {
    if (!TSKEY || tsId != null || !form.querySelector('.as-ts')) return;
    loadTs(function () { var slot = form.querySelector('.as-ts'); if (!slot || tsId != null) return; tsId = window.turnstile.render(slot, { sitekey: TSKEY, language: zh ? 'zh-cn' : 'en', callback: function (t) { tsTok = t; } }); });
  }
  function drawForm() {
    closePop();
    if (session === 'loading' || (!me && !writing)) { if (!me && !writing) form.innerHTML = ''; syncPanel(); return; }
    if (!me && cardPage && document.getElementById('tsub-open')) { form.innerHTML = ''; syncPanel(); return; }
    if (session === 'error' && !me) { form.innerHTML = '<p class="as-err">' + L.fail + '</p>'; syncPanel(); return; }
    if (me && mineComment) {
      form.innerHTML = '<p class="as-note">' + L.one + '</p><p class="as-meta">' + esc(L.as.replace('{n}', me)) + '<a class="as-out">' + L.out + '</a></p>';
      form.querySelector('.as-out').onclick = function () { signOut(); drawForm(); };
      syncPanel(); return;
    }
    if (me) {
      var pend = wxi && wxi.wx === 'pending', used = pend && wxi.used, nadd = pend && !wxi.added;
      if (nadd) {   // got the code, has not pressed 「我已添加」 yet. QR only in the WeChat popup.
        var here = inWeChat();
        form.innerHTML = '<div class="as-wx">' + wxHead() +
          (here ? '' : '<p class="as-meta as-ph">' + WXT.phone + '</p><p class="as-copyrow"><span class="as-wid">' + esc(WXID) + '</span><button type="button" class="as-copy" data-label="' + WXT.copyId + '" data-copy="' + esc(WXID) + '">' + WXT.copyId + '</button></p>') +
          '<p class="as-code4">' + esc(wxi.code || '') + '</p><p class="as-wc as-cdh">' + WXT.cd + '</p>' +
          (here ? '<button type="button" class="as-go as-qrbtn">' + WXT.seeQr + '</button>' : '') +
          '<button type="button" class="as-go as-big as-add">' + WXT.add + '</button><p class="as-meta as-addh">' + WXT.addh + '</p><p class="as-err as-wxerr"></p>' +
          '<p class="as-meta">' + esc(L.as.replace('{n}', me)) + '<a class="as-out">' + L.out + '</a></p></div>';
        form.querySelector('.as-add').onclick = pressAdded;
        var cp = form.querySelector('.as-copy'); if (cp) cp.onclick = function () { copyText(cp, cp.getAttribute('data-copy') || ''); };
        var qb = form.querySelector('.as-qrbtn'); if (qb) qb.onclick = openPop;
        form.querySelector('.as-out').onclick = function () { signOut(); drawForm(); };
        if (here) armPop();
        setPoll(); syncPanel(); return;
      }
      form.innerHTML = (wxi && wxi.wx === 'verified' ? '<p class="as-ok as-vf">✓ ' + WXT.ver + '</p>' : '') + (pend ? '<p class="as-note as-chk">' + WXT.chk + '</p>' : '') + (pend && !used ? '<p class="as-note">' + WXT.once + '</p>' : '') + (used ? '<p class="as-note as-wait">' + WXT.wait + '</p>' : '<textarea class="as-in as-body" maxlength="1000" placeholder="' + L.ph + '"></textarea>') +
        '<p class="as-meta">' + esc(L.as.replace('{n}', me)) + '<a class="as-out">' + L.out + '</a></p><p class="as-err"></p>' + (used ? '' : '<button type="button" class="as-go as-post">' + L.post + '</button>');
      setPoll();
      form.querySelector('.as-out').onclick = function () { signOut(); drawForm(); };
      var pb = form.querySelector('.as-post'); if (pb) pb.onclick = function () {
        var b = form.querySelector('.as-body'), t = b.value.trim(), er = form.querySelector('.as-err'), go = this; if (!t) return; go.disabled = true; er.textContent = '';
        api('/comment', { id: cardId, body: t }, true).then(function (d) { if (d.ok) { b.value = ''; mineComment = true; loadComments(); if (pend) { wxi.used = true; drawForm(); } else drawForm(); } else if (d.error === 'already_commented') { mineComment = true; drawForm(); } else if (d.error === 'auth') { signOut(); drawForm(); } else if (d.error === 'wx_banned') banned(); else if (d.error === 'wx_used') { wxi.used = true; drawForm(); reveal(gateEl()); } else if (d.error === 'wx_not_added') { wxi.added = false; drawForm(); reveal(gateEl()); } else er.textContent = d.error === 'day_limited' ? L.day : d.error === 'rate_limited' ? L.rate : L.fail; })
          .catch(function () { er.textContent = L.fail; }).then(function () { go.disabled = false; });
      };
      syncPanel(); return;
    }
    form.innerHTML = (zh ? '<div class="as-tabs" role="tablist"><button type="button" class="as-tab as-off" data-t="wx" disabled aria-disabled="true">微信</button><button type="button" class="as-tab" data-t="em">邮箱</button></div>' : '') +
      '<div class="as-emf"><h4 class="as-wt">' + L.join + '</h4><p class="as-wc">' + L.why + '</p><input class="as-in as-nm" maxlength="40" autocomplete="name" placeholder="' + L.name + '"><div class="as-row as-cr"><input class="as-in as-cy0" maxlength="40" autocomplete="address-level2" placeholder="' + L.city + '"><select class="as-in as-role"><option value="">' + L.role + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div><input class="as-in as-em" type="email" autocomplete="email" placeholder="' + L.email + '">' +
      '<div class="as-ts"></div><button type="button" class="as-go as-send">' + L.send + '</button><p class="as-ok as-mailnote" hidden></p></div>' +
      (zh ? '<div class="as-wx as-locked" aria-disabled="true">' + wxHead() +
        '<input class="as-in as-wxid" maxlength="64" disabled autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + WXT.ph + '"><div class="as-row as-wsm"><input class="as-in as-wcy" maxlength="40" disabled autocomplete="address-level2" placeholder="' + WXT.cy + '"><select class="as-in as-wrl" disabled><option value="">' + WXT.rl + '</option><option value="leader">' + L.rl + '</option><option value="follower">' + L.rf + '</option><option value="both">' + L.rb + '</option></select></div>' +
        '<button type="button" class="as-go as-big as-wxsub" disabled>' + WXT.go + '</button><p class="as-err as-wxerr"></p></div>' : '') +
      '<p class="as-err as-emerr"></p>';
    var er = form.querySelector('.as-emerr');
    if (zh) { var setM = function (m) { if (m !== 'em') return; form.setAttribute('data-m', m); [].forEach.call(form.querySelectorAll('.as-tab'), function (t) { t.setAttribute('aria-selected', t.getAttribute('data-t') === m ? 'true' : 'false'); }); er.textContent = ''; }; [].forEach.call(form.querySelectorAll('.as-tab'), function (t) { t.onclick = function () { if (!t.disabled) setM('em'); }; }); setM('em'); }
    tsId = null; tsTok = '';
    mountTs();
    syncPanel();
    form.querySelector('.as-send').onclick = function () {
      var nm = form.querySelector('.as-nm').value.trim(), em = form.querySelector('.as-em').value.trim(), go = this; er.textContent = '';
      if (!form.querySelector('.as-cy0').value.trim()) { er.textContent = L.ncity; return; } if (!form.querySelector('.as-role').value) { er.textContent = L.nrole; return; }
      if (!nm || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = L.need; return; }
      if (TSKEY && !tsTok) { er.textContent = L.ts; return; }
      go.disabled = true;
      api('/signup', { name: nm, city: form.querySelector('.as-cy0').value.trim(), role: form.querySelector('.as-role').value, email: em, lang: zh ? 'zh' : 'en', ts: tsTok, magic: 1, updates: 0, ret: location.href.split('#')[0] }).then(function (d) {
        if (!d.ok) { er.textContent = d.error === 'rate_limited' ? L.rate : d.error === 'turnstile' ? L.ts : d.error === 'need_city' ? L.ncity : d.error === 'need_role' ? L.nrole : d.error === 'need_name' || d.error === 'bad_email' ? L.need : L.fail; if (tsId != null && window.turnstile) { window.turnstile.reset(tsId); tsTok = ''; } return; }
        var note = form.querySelector('.as-mailnote'); note.hidden = false; note.textContent = L.sent; go.textContent = L.resend;
        if (tsId != null && window.turnstile) { window.turnstile.reset(tsId); tsTok = ''; }
      }).catch(function () { er.textContent = L.fail; }).then(function () { go.disabled = false; });
    };
  }
  function loadTs(cb) { if (window.turnstile) return cb(); var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = cb; document.head.appendChild(s); }
  function shown(el) { return !!(el && !el.hidden && el.getClientRects && el.getClientRects().length); }
  function stickyTop() { var st = document.querySelector('.china-sticky-top'); if (!st) return 0; var p = getComputedStyle(st).position; return (p === 'sticky' || p === 'fixed') ? (st.getBoundingClientRect().bottom || 0) : 0; }
  function reveal(el) { if (!el || !el.getBoundingClientRect) return; var y = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0) - stickyTop() - 8; try { window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); } catch (e) { window.scrollTo(0, Math.max(0, y)); } }
  function gateEl() { var hs = form.querySelectorAll('.as-wt'), i; for (i = 0; i < hs.length; i++) if (shown(hs[i])) return hs[i]; return form.querySelector('.as-wait') || form.querySelector('.as-note') || form; }
  function loadComments() { api('/comments?id=' + encodeURIComponent(cardId), null, true).then(function (d) { drawItems(d.items || []); if (!('mine' in d)) return; var was = mineComment; mineComment = !!d.mine; if (mineComment !== was && session !== 'loading' && (me || writing)) drawForm(); }).catch(function () {}); }
  function likeDev() { return wxi && wxi.wxdev ? wxi.wxdev : dev(); }
  function refreshLike() { api('/likes?ids=' + encodeURIComponent(cardId) + '&dev=' + encodeURIComponent(likeDev())).then(function (d) { setLike((d.counts || {})[cardId] || 0, (d.mine || []).indexOf(cardId) >= 0); }).catch(function () {}); }
  function takeLink() {
    var m = (location.hash || '').match(/(?:^#|&)atm=([0-9a-f]{64})/i);
    if (!m) return;
    try { localStorage.setItem('atm_social_tok', m[1]); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e2) {}
  }
  function openMapSubscribe() {
    var t = document.getElementById('tsub-open');
    if (!t) return false;
    window.ATM_SUB_RETURN = location.href.split('#')[0];
    t.click();
    return true;
  }
  function wantWrite() {
    writing = true; open = true;
    if (session === 'loading') { writeQueued = true; syncPanel(); return; }
    writeQueued = false;
    if (!me && cardPage && openMapSubscribe()) { syncPanel(); return; }
    drawForm();
    syncPanel();
    reveal(form);
  }
  function applyMe(d) {
    if (d && d.error === 'wx_banned') { banned(); refreshLike(); return; }
    if (!d || d.error === 'auth' || d._s === 401 || !d.name) {
      signOut();
      if (writing || writeQueued) { writing = true; writeQueued = false; open = true; if (!(cardPage && openMapSubscribe())) { drawForm(); reveal(form); } else syncPanel(); }
      else syncPanel();
      refreshLike();
      return;
    }
    me = d.name;
    wxi = d.wx ? { wx: d.wx, used: d.used, wxdev: d.wxdev, added: d.added, code: d.code } : null;
    session = 'in';
    if (writing || writeQueued) { writing = true; writeQueued = false; open = true; drawForm(); reveal(form); }
    else if (mineComment) drawForm();
    else syncPanel();
    refreshLike();
  }
  function init() {
    takeLink();
    likeB.onclick = function () {
      var on = likeB.getAttribute('aria-pressed') !== 'true', n = +(nEl.textContent || 0);
      if (on && wxi && wxi.wx === 'pending' && !wxi.added) { open = true; writing = true; drawForm(); reveal(gateEl()); return; }
      if (on && wxi && wxi.wx === 'pending' && wxi.used) { open = true; writing = true; drawForm(); reveal(gateEl()); return; }
      setLike(n + (on ? 1 : -1), on); /* optimistic */
      api('/like', { id: cardId, dev: dev() }, true).then(function (d) { if (d.id) { setLike(d.n, d.liked); if (d.liked && wxi && wxi.wx === 'pending' && !wxi.used) { wxi.used = true; drawForm(); } } else { setLike(n, !on); if (d.error === 'wx_banned') banned(); else if (d.error === 'wx_used') { wxi && (wxi.used = true); drawForm(); reveal(gateEl()); } else if (d.error === 'wx_not_added') { wxi && (wxi.added = false); drawForm(); reveal(gateEl()); } } }).catch(function () { setLike(n, !on); });
    };
    box.querySelector('.as-cmb').onclick = function () {
      open = !open;
      if (open) shown = 3;
      if (allItems.length) drawItems();
      syncPanel();
      if (open) reveal(box.querySelector('.as-panel'));
    };
    box.querySelector('.as-more').onclick = function () { shown += 10; drawItems(); };
    box.querySelector('.as-write').onclick = wantWrite;
    loadComments();
    if (tok()) {
      session = 'loading';
      syncPanel();
      api('/me', null, true).then(applyMe).catch(function () { session = 'error'; if (writing || writeQueued) { writing = true; writeQueued = false; open = true; drawForm(); reveal(form); } else syncPanel(); refreshLike(); });
    } else { session = 'guest'; syncPanel(); refreshLike(); }
  }
  if (!place()) { var mo = new MutationObserver(function () { if (place()) mo.disconnect(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect(); }, 20000); }
})();
