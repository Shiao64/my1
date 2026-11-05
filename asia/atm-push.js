/* Web push opt-in button (zh/en). Registers /sw.js (push only, no fetch caching). API: TANGO_SUB_API or api.tangoweekend.org.
   The button stays unmounted unless window.ATM_PUSH_UI is 1. sw.js and the Worker push API are unchanged. */
(function(){
  if (window.ATM_PUSH_UI !== 1 && window.ATM_PUSH_UI !== '1') return;
  var zh=location.pathname.indexOf('/zh/')===0, API=window.TANGO_SUB_API||'https://api.tangoweekend.org';
  var L=zh?{on:'🔔 开启推送通知',off:'🔕 关闭推送通知',busy:'处理中…',ok:'已开启推送：有新活动或临时变更时会通知您。',bye:'已关闭推送通知。',deny:'浏览器已拒绝通知权限，请在浏览器设置里允许本站通知。',ios:'iPhone/iPad 需要先点「分享」→「添加到主屏幕」，再从主屏幕打开本站，才能开启推送（iOS 16.4 及以上）。',na:'这个浏览器不支持推送通知。',fail:'开启失败，请稍后再试。'}
          :{on:'🔔 Turn on push alerts',off:'🔕 Turn off push alerts',busy:'Working…',ok:'Push alerts are on. We\'ll notify you about new events and temporary changes.',bye:'Push alerts are off.',deny:'Notifications are blocked. Please allow them for this site in your browser settings.',ios:'On iPhone/iPad, tap Share → Add to Home Screen, then open the site from your home screen to turn on push alerts (iOS 16.4+).',na:'This browser does not support push notifications.',fail:'Could not turn on push alerts. Please try again later.'};
  var ios=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var standalone=window.matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  var supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  var reg=null; if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(function(r){reg=r; paint();}).catch(function(){});
  function u8(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); s+='==='.slice((s.length+3)%4); var b=atob(s), o=new Uint8Array(b.length); for(var i=0;i<b.length;i++) o[i]=b.charCodeAt(i); return o; }
  function post(path, body){ return fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }); }
  var btn=document.createElement('button'); btn.type='button'; btn.className='tsub-open atm-push-btn'; btn.textContent=L.on;
  var msg=document.createElement('div'); msg.className='atm-push-msg'; msg.hidden=true; msg.setAttribute('role','status');
  function say(t){ msg.textContent=t; msg.hidden=!t; }
  function paint(){ if(!reg||!reg.pushManager) return; reg.pushManager.getSubscription().then(function(s){ btn.dataset.on=s?'1':''; btn.textContent=s?L.off:L.on; }); }
  btn.addEventListener('click', function(ev){ ev.preventDefault();
    if(ios&&!standalone){ say(L.ios); return; }
    if(!supported){ say(L.na); return; }
    btn.disabled=true; btn.textContent=L.busy; say('');
    var ready=reg?Promise.resolve(reg):navigator.serviceWorker.register('/sw.js',{scope:'/'});
    ready.then(function(r){ reg=r; return r.pushManager.getSubscription(); }).then(function(s){
      if(s) return post('/push/unsubscribe',{subscription:s.toJSON()}).catch(function(){}).then(function(){ return s.unsubscribe(); }).then(function(){ say(L.bye); });
      return Notification.requestPermission().then(function(p){ if(p!=='granted'){ say(L.deny); return; }
        return fetch(API+'/push/key').then(function(r){ return r.json(); }).then(function(k){ if(!k.key) throw new Error('nokey');
          return reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:u8(k.key)}); })
          .then(function(sub){ return post('/push/subscribe',{subscription:sub.toJSON(), lang:zh?'zh':'en'}); }).then(function(){ say(L.ok); }); });
    }).catch(function(){ say(L.fail); }).then(function(){ btn.disabled=false; paint(); });
  });
  var css=document.createElement('style'); css.textContent='.atm-push-msg{font-size:.8rem;color:#0a4f57;background:#fff;border:1px solid #ead9b8;border-radius:8px;padding:6px 10px;margin:6px 0;max-width:420px}.atm-push-in{margin:4px 0 10px;padding:0 0 10px;border-bottom:1px dashed #ead9b8}.atm-push-solo{display:flex;flex-direction:column;align-items:center;padding:4px 0 12px}';
  document.head.appendChild(css);
  function mount(){ if(btn.isConnected) return true; var h2=document.querySelector('#tsub-modal .tsub-dlg h2'); if(h2){ var w=document.createElement('div'); w.className='atm-push-in'; w.appendChild(btn); w.appendChild(msg); h2.insertAdjacentElement('afterend', w); return true; } var ps=document.querySelectorAll('.tsub-pair'), pair=[].filter.call(ps,function(x){ return x.offsetParent!==null; })[0]||ps[0];
    if(pair){ pair.appendChild(btn); pair.insertAdjacentElement('afterend', msg); return true; } return false; }
  if(!mount()){ var n=0, t=setInterval(function(){ if(mount()||++n>40){ clearInterval(t); if(!btn.isConnected){ var w=document.createElement('div'); w.className='atm-push-solo'; w.appendChild(btn); w.appendChild(msg); (document.querySelector('main')||document.body).appendChild(w); } } },250); }
  paint();
})();
