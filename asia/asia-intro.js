/* Asia Tango Map opening intro: non-blocking toast, once per session, ?intro=1 forces. */
(function () {
  var KEY = 'asiaIntroSeen';
  var force = /[?&]intro=1(&|$)/.test(location.search);
  try { if (!force && sessionStorage.getItem(KEY)) return; } catch (e) {}
  var zh = (document.documentElement.getAttribute('lang') || '').indexOf('zh') === 0;
  var text = zh ? '亚洲探戈地图，帮你找阿根廷探戈' : 'Asia Tango Map — find Argentine tango across Asia';
  var css = '.atm-intro-wrap{position:fixed;left:0;right:0;top:46px;z-index:200;display:flex;justify-content:center;pointer-events:none;padding:0 10px}' +
    '.atm-intro{pointer-events:auto;display:flex;align-items:center;gap:12px;max-width:620px;white-space:nowrap;padding:12px 14px 12px 18px;border-radius:14px;' +
    'background:linear-gradient(135deg,#0a4f57,#0e6e78);color:#fff;border:1.5px solid #e8c06a;box-shadow:0 10px 28px rgba(0,0,0,.28);' +
    'font-size:clamp(14px,3.8vw,17px);font-weight:600;line-height:1.35;opacity:0;transform:translateY(-14px);transition:opacity .45s ease,transform .45s ease}' +
    '@media (max-width:520px){.atm-intro{white-space:normal;gap:10px;padding:10px 12px}}' +
    '.atm-intro.show{opacity:1;transform:none}' +
    '.atm-intro b{color:#f0d28a}' +
    '.atm-intro-x{flex:0 0 auto;width:28px;height:28px;border-radius:50%;border:1px solid rgba(240,210,138,.8);background:transparent;color:#f0d28a;font-size:18px;line-height:1;cursor:pointer}' +
    '.atm-intro-x:hover{background:#f0d28a;color:#0a4f57}' +
    '.atm-intro-pin{flex:0 0 auto;width:28px;height:34px;color:#d4af37}' +
    '.atm-intro.show .atm-intro-pin{animation:atmBob 2.8s ease-in-out .5s infinite}' +
    '.atm-intro.show .atm-intro-mag{animation:atmSweep 2.8s ease-in-out .5s infinite;transform-origin:13px 11.6px}' +
    '@keyframes atmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}' +
    '@keyframes atmSweep{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}' +
    '.atm-intro-txt{display:flex;flex-direction:column;gap:2px}' +
    '.atm-intro-sub{font-size:.78em;font-weight:500;color:rgba(255,255,255,.78)}' +
    '@media (prefers-reduced-motion:reduce){.atm-intro{transition:none;transform:none}.atm-intro.show .atm-intro-pin,.atm-intro.show .atm-intro-mag{animation:none}}';
  function run() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var wrap = document.createElement('div'); wrap.className = 'atm-intro-wrap';
    var card = document.createElement('div'); card.className = 'atm-intro'; card.setAttribute('role', 'status');
    var msg = document.createElement('span');
    var parts = zh ? ['亚洲探戈地图', '，帮你找阿根廷探戈'] : ['Asia Tango Map', ' — find Argentine tango across Asia'];
    var b = document.createElement('b'); b.textContent = parts[0]; msg.appendChild(b); msg.appendChild(document.createTextNode(parts[1]));
    var tx = document.createElement('span'); tx.className = 'atm-intro-txt'; tx.appendChild(msg);
    var sub = document.createElement('span'); sub.className = 'atm-intro-sub'; sub.textContent = zh ? '帮你找到身边的Milonga、探戈节和马拉松' : 'Milongas, festivals & marathons near you'; tx.appendChild(sub);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'atm-intro-x'; x.setAttribute('aria-label', zh ? '关闭' : 'Close'); x.textContent = '×';
    card.insertAdjacentHTML('afterbegin', '<svg class="atm-intro-pin" viewBox="0 0 28 34" aria-hidden="true" focusable="false"><path d="M14 1C7.4 1 2 6.2 2 12.7 2 21.5 14 33 14 33s12-11.5 12-20.3C26 6.2 20.6 1 14 1z" fill="currentColor"/><g class="atm-intro-mag"><circle cx="13" cy="11.6" r="4.6" fill="none" stroke="#0a4f57" stroke-width="2"/><path d="M16.4 15 L19.6 18.2" stroke="#0a4f57" stroke-width="2.2" stroke-linecap="round"/></g></svg>'); card.appendChild(tx); card.appendChild(x); wrap.appendChild(card); document.body.appendChild(wrap);
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(function () { requestAnimationFrame(function () { card.classList.add('show'); }); });
    var done = false;
    function close() {
      if (done) return; done = true; clearTimeout(t);
      card.classList.remove('show');
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, reduce ? 0 : 480);
    }
    x.addEventListener('click', close);
    var t = setTimeout(close, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
