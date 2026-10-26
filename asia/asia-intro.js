/* Asia Tango Map opening intro: non-blocking toast, once per session, ?intro=1 forces. */
(function () {
  var KEY = 'asiaIntroSeen';
  return; // PREVIEW: how-to card replaces intro at all widths
  var force = /[?&]intro=1(&|$)/.test(location.search);
  try { if (!force && sessionStorage.getItem(KEY)) return; } catch (e) {}
  var zh = (document.documentElement.getAttribute('lang') || '').indexOf('zh') === 0;
  var text = zh ? '亚洲探戈地图，帮你找阿根廷探戈' : 'Asia Tango Map — find Argentine tango across Asia';
  function K(n, b) { var w = b.replace(/transform:([^;}]+)/g, '-webkit-transform:$1;transform:$1'); return '@-webkit-keyframes ' + n + '{' + w + '}@keyframes ' + n + '{' + w + '}'; }
  function A(v) { return '-webkit-animation:' + v + ';animation:' + v; }
  var css = '.atm-intro-wrap{position:fixed;left:0;right:0;top:46px;overflow:visible;z-index:200;display:flex;justify-content:center;pointer-events:none;padding:0 10px}' +
    '.atm-intro{pointer-events:auto;-webkit-transform:translateY(-14px);display:flex;align-items:center;gap:12px;max-width:620px;white-space:nowrap;padding:12px 14px 12px 18px;border-radius:14px;' +
    'position:relative;isolation:isolate;color:#fff;' +
    'font-size:clamp(14px,3.8vw,17px);font-weight:600;line-height:1.35;opacity:0;transform:translateY(-14px);transition:opacity .45s ease,transform .45s ease}' +
    '@media (max-width:520px){.atm-intro{white-space:normal;gap:10px;padding:10px 12px}}' +
    '.atm-intro::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:linear-gradient(135deg,#0a4f57,#0e6e78);border:1.5px solid #e8c06a;box-shadow:0 10px 28px rgba(0,0,0,.28)}' +
        '.atm-intro.show{opacity:1;transform:none}' +
    '.atm-intro b{color:#f0d28a}' +
    '.atm-intro-x{flex:0 0 auto;width:28px;height:28px;border-radius:50%;border:1px solid rgba(240,210,138,.8);background:transparent;color:#f0d28a;font-size:18px;line-height:1;cursor:pointer}' +
    '.atm-intro-x:hover{background:#f0d28a;color:#0a4f57}' +
    '.atm-intro-pin{flex:0 0 auto;width:48px;height:48px;overflow:visible;color:#d4af37}' +
    '.atm-intro.show .atm-intro-pin{' + A('atmBob 2.8s ease-in-out .5s infinite') + '}' +
    '.atm-intro-pupil{-webkit-transform-origin:13.4px 12.4px;transform-origin:13.4px 12.4px}' +
    '.atm-intro.show .atm-intro-pupil{' + A('atmScan 2.5s ease-in-out .3s both') + '}' +
    '.atm-intro-lid{-webkit-transform-origin:13.4px 5.2px;transform-origin:13.4px 5.2px;-webkit-transform:scaleY(0);transform:scaleY(0)}' +
    '.atm-intro.show .atm-intro-lid{' + A('atmBlink 2.5s linear .3s both') + '}' +
    K('atmScan', '0%,8%{transform:translate(0,0)}22%,34%{transform:translate(-2.8px,0)}52%,64%{transform:translate(2.8px,0)}82%,100%{transform:translate(0,0)}') +
    K('atmBlink', '0%,30%{transform:scaleY(0)}35%{transform:scaleY(1)}40%,80%{transform:scaleY(0)}85%{transform:scaleY(1)}90%,100%{transform:scaleY(0)}') +
    '.atm-intro.fadeout{opacity:0;transition:opacity .9s ease;pointer-events:none}' +
    K('atmBob', '0%,100%{transform:translate(0,0)}50%{transform:translate(0,-2.5px)}') +
    '.atm-bigeye{position:fixed;left:0;top:0;z-index:201;pointer-events:none;-webkit-transform-origin:0 0;transform-origin:0 0;-webkit-transition:-webkit-transform 1.25s cubic-bezier(.45,0,.25,1);transition:transform 1.25s cubic-bezier(.45,0,.25,1)}' +
    '.atm-bigeye .lid{-webkit-transform-origin:13.4px 5.2px;transform-origin:13.4px 5.2px;-webkit-transform:scaleY(0);transform:scaleY(0)}.atm-bigeye.blink .lid{' + A('atmBigBlink .6s linear .05s both') + '}' +
    K('atmBigBlink', '0%,25%{transform:scaleY(0)}50%{transform:scaleY(1)}75%,100%{transform:scaleY(0)}') +
    '.atm-bigeye .pz{width:100%;height:100%;-webkit-transform-origin:50% 50%;transform-origin:50% 50%}.atm-bigeye svg{display:block;width:100%;height:100%;overflow:visible}.atm-bigeye.pop .pz{' + A('atmPop .5s cubic-bezier(.3,0,.8,.4) forwards') + '}' +
    K('atmPop', '0%{opacity:1;transform:scale(1,1)}35%{opacity:1;transform:scale(1.12,1.12)}100%{opacity:0;transform:scale(1.45,1.45)}') +
        '.atm-intro-txt{display:flex;flex-direction:column;gap:2px}' +
    '.atm-intro-sub{font-size:.78em;font-weight:500;color:rgba(255,255,255,.78)}';
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
    card.insertAdjacentHTML('afterbegin', '<svg class="atm-intro-pin" viewBox="5.4 3.8 20 20" aria-hidden="true" focusable="false"><defs><clipPath id="atmLens"><circle cx="13.4" cy="12" r="6.6"/></clipPath></defs><g class="atm-intro-mag"><path d="M18.6 17.2 L23.6 22.2" stroke="#d4af37" stroke-width="2.8" stroke-linecap="round"/><circle cx="13.4" cy="12" r="6.6" fill="#fff"/><g clip-path="url(#atmLens)"><circle class="atm-intro-pupil" cx="13.4" cy="12.4" r="3" fill="#1b1b1b"/><circle class="atm-intro-pupil" cx="14.4" cy="11.2" r=".9" fill="#fff"/><rect class="atm-intro-lid" x="6.6" y="5.2" width="13.6" height="13.8" fill="#d4af37"/></g><circle class="atm-intro-ring" cx="13.4" cy="12" r="6.9" fill="none" stroke="#d4af37" stroke-width="1.6"/></g></svg>'); card.appendChild(tx); card.appendChild(x); wrap.appendChild(card); document.body.appendChild(wrap);
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    var reduce = false; /* owner wants the full animation for everyone */
    requestAnimationFrame(function () { requestAnimationFrame(function () { card.classList.add('show'); }); });
    var done = false;
    function close() {
      if (done) return; done = true; clearTimeout(t);
      card.classList.remove('show'); if (eye && eye.parentNode) eye.parentNode.removeChild(eye);
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, reduce ? 0 : 480);
    }
    x.addEventListener('click', close);
    var eye = null;
    function finish() { done = true; if (wrap.parentNode) wrap.parentNode.removeChild(wrap); if (eye && eye.parentNode) eye.parentNode.removeChild(eye); }
    var t = setTimeout(function () {
      card.classList.add('fadeout');
      var ring = card.querySelector('.atm-intro-ring'), mag = card.querySelector('.atm-intro-mag');
      var r = ring.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
      if (!r.width) r = { left: 20, top: 60, width: 40 };
      var d0 = r.width, D = 0.5 * Math.min(vw, vh), k = D / d0;
      eye = document.createElement('div'); eye.className = 'atm-bigeye'; eye.setAttribute('aria-hidden', 'true');
      eye.style.width = d0 + 'px'; eye.style.height = d0 + 'px';
      eye.style.webkitTransform = eye.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px) scale(1)';
      eye.innerHTML = '<div class="pz"><svg viewBox="6.5 5.1 13.8 13.8"><defs><clipPath id="atmBigLens"><circle cx="13.4" cy="12" r="6.6"/></clipPath></defs><circle cx="13.4" cy="12" r="6.6" fill="#fff"/><circle cx="13.4" cy="12.4" r="3" fill="#1b1b1b"/><circle cx="14.4" cy="11.2" r=".9" fill="#fff"/><g clip-path="url(#atmBigLens)"><rect class="lid" x="6.6" y="5.2" width="13.6" height="13.8" fill="#d4af37"/></g><circle cx="13.4" cy="12" r="6.9" fill="none" stroke="#d4af37" stroke-width=".7"/></svg></div>';
      document.body.appendChild(eye); if (mag) mag.style.visibility = 'hidden';
      eye.getBoundingClientRect();
      eye.style.webkitTransform = eye.style.transform = 'translate(' + (vw / 2 - D / 2) + 'px,' + (vh / 2 - D / 2) + 'px) scale(' + k.toFixed(3) + ')';
      t = setTimeout(function () {
        var tx = vw / 2 - D / 2, ty = vh / 2 - D / 2;
        try {
          var box = document.querySelector('.china-filters-row1') || document.querySelector('.m-filters');
          var br = box && box.getBoundingClientRect();
          if (br && br.height > 0 && br.bottom > 0 && br.top < vh) {
            ty = br.top + br.height / 2 - D / 2;
            tx = br.left + br.width / 2 - D / 2;
          }
        } catch (e) {}
        ty = Math.max(8, Math.min(vh - D - 8, ty)); tx = Math.max(8, Math.min(vw - D - 8, tx));
        eye.style.webkitTransition = '-webkit-transform .5s ease-in-out'; eye.style.transition = 'transform .5s ease-in-out';
        eye.style.webkitTransform = eye.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + k.toFixed(3) + ')';
        t = setTimeout(function () {
          eye.classList.add('blink');
          t = setTimeout(function () {
            eye.classList.add('pop');
            t = setTimeout(finish, 520);
          }, 650);
        }, 450);
      }, 1260);
    }, 2900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
