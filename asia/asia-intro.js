/* Asia Tango Map opening intro: non-blocking toast, once per session, ?intro=1 forces. */
(function () {
  var KEY = 'asiaIntroSeen';
  var force = /[?&]intro=1(&|$)/.test(location.search);
  try { if (!force && sessionStorage.getItem(KEY)) return; } catch (e) {}
  var zh = (document.documentElement.getAttribute('lang') || '').indexOf('zh') === 0;
  var text = zh ? '亚洲探戈地图，帮你找阿根廷探戈' : 'Asia Tango Map — find Argentine tango across Asia';
  var css = '.atm-intro-wrap{position:fixed;left:0;right:0;top:46px;overflow:visible;z-index:200;display:flex;justify-content:center;pointer-events:none;padding:0 10px}' +
    '.atm-intro{pointer-events:auto;display:flex;align-items:center;gap:12px;max-width:620px;white-space:nowrap;padding:12px 14px 12px 18px;border-radius:14px;' +
    'position:relative;isolation:isolate;color:#fff;' +
    'font-size:clamp(14px,3.8vw,17px);font-weight:600;line-height:1.35;opacity:0;transform:translateY(-14px);transition:opacity .45s ease,transform .45s ease}' +
    '@media (max-width:520px){.atm-intro{white-space:normal;gap:10px;padding:10px 12px}}' +
    '.atm-intro::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:linear-gradient(135deg,#0a4f57,#0e6e78);border:1.5px solid #e8c06a;box-shadow:0 10px 28px rgba(0,0,0,.28)}' +
    '.atm-intro>*{transition:opacity .3s ease}.atm-intro.burst>*{opacity:0}' +
    '.atm-intro.show{opacity:1;transform:none}' +
    '.atm-intro b{color:#f0d28a}' +
    '.atm-intro-x{flex:0 0 auto;width:28px;height:28px;border-radius:50%;border:1px solid rgba(240,210,138,.8);background:transparent;color:#f0d28a;font-size:18px;line-height:1;cursor:pointer}' +
    '.atm-intro-x:hover{background:#f0d28a;color:#0a4f57}' +
    '.atm-intro-pin{flex:0 0 auto;width:44px;height:53px;overflow:visible;color:#d4af37}' +
    '.atm-intro.show .atm-intro-pin{animation:atmBob 2.8s ease-in-out .5s infinite}' +
    '.atm-intro-pupil{transform-box:fill-box;transform-origin:center}' +
    '.atm-intro.show .atm-intro-pupil{animation:atmScan 2.5s ease-in-out .4s both}' +
    '.atm-intro-lid{transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0)}' +
    '.atm-intro.show .atm-intro-lid{animation:atmBlink 2.5s linear .4s both}' +
    '@keyframes atmScan{0%,8%{transform:translateX(0)}22%,34%{transform:translateX(-2.8px)}52%,64%{transform:translateX(2.8px)}82%,100%{transform:translateX(0)}}' +
    '@keyframes atmBlink{0%,30%{transform:scaleY(0)}35%{transform:scaleY(1)}40%,80%{transform:scaleY(0)}85%{transform:scaleY(1)}90%,100%{transform:scaleY(0)}}' +
    '.atm-intro.center{transition:transform .6s cubic-bezier(.3,.7,.3,1);transform:translate(var(--dx),var(--dy))}' +
    '@keyframes atmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}' +
    '.atm-intro.center.burst{pointer-events:none}.atm-intro.center.burst::before{animation:atmBurst 1.4s cubic-bezier(.4,0,.9,.6) forwards}' +
    '@keyframes atmBurst{0%{transform:scale(1);opacity:1;filter:none}82%{transform:scale(var(--s1));opacity:.85;filter:none}100%{transform:scale(var(--s2));opacity:0;filter:blur(5px)}}' +
    '@keyframes atmFade{to{opacity:0}}' +
    '.atm-intro-txt{display:flex;flex-direction:column;gap:2px}' +
    '.atm-intro-sub{font-size:.78em;font-weight:500;color:rgba(255,255,255,.78)}' +
    '@media (prefers-reduced-motion:reduce){.atm-intro{transition:none;transform:none}.atm-intro.center{transition:none;transform:none}.atm-intro.center.burst{animation:atmFade 1.4s ease forwards}.atm-intro.center.burst::before{animation:none}.atm-intro.burst>*{opacity:1}.atm-intro.show .atm-intro-pin,.atm-intro.show .atm-intro-pupil,.atm-intro.show .atm-intro-lid{animation:none}}';
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
    card.insertAdjacentHTML('afterbegin', '<svg class="atm-intro-pin" viewBox="0 0 28 34" aria-hidden="true" focusable="false"><path d="M14 1C7.4 1 2 6.2 2 12.7 2 21.5 14 33 14 33s12-11.5 12-20.3C26 6.2 20.6 1 14 1z" fill="currentColor"/><defs><clipPath id="atmLens"><circle cx="13.4" cy="12" r="6.6"/></clipPath></defs><g class="atm-intro-mag"><path d="M18.4 17.2 L21.6 20.6" stroke="#0a4f57" stroke-width="2.6" stroke-linecap="round"/><circle cx="13.4" cy="12" r="6.6" fill="#fff"/><g clip-path="url(#atmLens)"><circle class="atm-intro-pupil" cx="13.4" cy="12.4" r="3" fill="#1b1b1b"/><circle class="atm-intro-pupil" cx="14.4" cy="11.2" r=".9" fill="#fff"/><rect class="atm-intro-lid" x="6.6" y="5.2" width="13.6" height="13.8" fill="#d4af37"/></g><circle cx="13.4" cy="12" r="6.9" fill="none" stroke="#0a4f57" stroke-width="1.6"/></g></svg>'); card.appendChild(tx); card.appendChild(x); wrap.appendChild(card); document.body.appendChild(wrap);
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
    var t = setTimeout(function () {
      var r = card.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
      card.style.setProperty('--dx', Math.round(vw / 2 - (r.left + r.width / 2)) + 'px');
      card.style.setProperty('--dy', Math.round(vh / 2 - (r.top + r.height / 2)) + 'px');
      var fit = (vw - 12) / r.width, s1 = Math.max(1, Math.min(1.6, fit));
      card.style.setProperty('--s1', s1.toFixed(3)); card.style.setProperty('--s2', (s1 * 1.18).toFixed(3));
      card.classList.add('center');
      t = setTimeout(function () {
        card.classList.add('burst');
        t = setTimeout(function () { done = true; if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 1400);
      }, reduce ? 0 : 650);
    }, 2950);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
