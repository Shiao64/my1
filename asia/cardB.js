/* Card design B (young/fresh) — draft only */
(function(){
var zh=document.documentElement.lang.indexOf('zh')===0||location.pathname.indexOf('/zh/')===0;
function k(l){return (l.querySelector('.ev-k')||{}).textContent||''}
function fix(li){ if(li.dataset.b)return; li.dataset.b='1'; li.classList.add('b-card');
 var q=function(s){return li.querySelector(s)};
 var KO={E076:'박미 Tango 巨嘴鸟 Milonga',R094:'火热星期五',R098:'午后 Milonga',R114:'헝얏 & 화이 周日弘大引导 Práctica',R124:'둘리 引导 Práctica',R143:'定期聚会 Con Milonga',E105:'第5周特别场 BIG LUMINOSO Milonga',E106:'양헬 Tango 13周年派对',E107:'The Pista Milonga',E108:'16周年派对',R249:'周一 Luminoso',R106:'Saturday o nada Milonga',R116:'MilMil Milonga',R153:'Monday o nada Milonga',R166:'Solo Tango',E049:'Happy G Milonga',E085:'Tora Milonga',R142:'周五 Vida'};
 var cover=q('.ev-cover'), when=(q('.ev-when')||{}).textContent||'', type=(q('.ev-type')||{}).textContent||'';
 var nameEl=q('.ev-name'), name=nameEl?nameEl.textContent:''; var koN=zh&&KO[li.dataset.id]; if(koN) name=koN;
 var lines=[].slice.call(li.querySelectorAll(':scope>.ev-line:not(.china-links), :scope>.china-contact-block, .atm-desc>*'));
 var meta={time:'',venue:'',org:'',dj:''}, rest=[];
 lines.forEach(function(l){ var key=k(l).trim(); var c=l.cloneNode(true);
  var kk=c.querySelector('.ev-k'); if(kk)kk.remove();
  if(/^(Time|时间)$/i.test(key)) meta.time=c.innerHTML.trim();
  else if(/^(Venue|场地|地点|场馆)$/i.test(key)){ var a=c.querySelectorAll('.china-addr,.china-addr-en'); var ad=[].map.call(a,function(x){return x.textContent.replace(/^·\s*/,'')}); a.forEach(function(x){x.remove()}); meta.venue=c.textContent.trim(); if(ad.length) rest.push('<div class="b-row"><b>'+(zh?'地址':'Address')+'</b><span>'+ad.join('<br>')+'</span></div>'); }
  else if(/^(ORG|Organizer|主办|组织者)$/i.test(key)) meta.org=c.innerHTML.trim();
  else if(/^DJ/i.test(key)) meta.dj=c.innerHTML.trim();
  else if(/^(Dates?|日期)$/i.test(key)) {}
  else { var nt=c.textContent; if(!meta.dj&&(nt.match(/DJ/g)||[]).length===1){var dm=nt.match(/DJ\s*[:：]?\s*([^；;。，,]{1,30}?)(?=[；;。，,]|\.\s|\.$|$)/); if(dm) meta.dj=dm[1].replace(/\s*[（(](主持|host)[^）)]*[）)]/i,'').trim().replace(/</g,'&lt;');} var b=c.querySelector('.atm-note-tg'); if(b)b.remove(); rest.push('<div class="b-row"><b>'+key+'</b><span>'+c.innerHTML.trim()+'</span></div>'); }
 });
 var m=name.match(/^(.*\S)\s*[（(]([^()（）]+)[)）]\s*$/); if(m&&meta.venue&&(meta.venue.indexOf(m[2])>=0||m[2].indexOf(meta.venue)>=0)) name=m[1];
 var bm=name.match(/^(.*\S)\s+by\s+(.+)$/i); if(bm&&bm[1].split('(').length===bm[1].split(')').length&&bm[1].split('（').length===bm[1].split('）').length){ var by=bm[2].trim(), oz=(function(t){t.innerHTML=meta.org||'';return t.textContent.trim()})(document.createElement('div')), nz=function(x){return x.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'')}; if(!oz){meta.org=by.replace(/</g,'&lt;');name=bm[1];} else if(nz(oz)===nz(by)) name=bm[1]; else if(li.dataset.id==='R079'){meta.org=by.replace(/</g,'&lt;');name=bm[1];} else li.dataset.byConflict=by; }
 var cm=!li.dataset.byConflict&&li.dataset.id!=='E043'&&name.match(/^([^:：]+?)\s*[:：]\s*(.+)$/); if(cm&&/\s&\s|＆/.test(cm[1])&&!/\d/.test(cm[1])){ var pp=cm[1].trim(), oz2=(function(t){t.innerHTML=meta.org||'';return t.textContent.trim()})(document.createElement('div')), nz2=function(x){return x.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'')}; if(!oz2){meta.org=pp.replace(/</g,'&lt;');name=cm[2];} else if(nz2(oz2)===nz2(pp)) name=cm[2]; else li.dataset.colonConflict=pp; }
 var links=q('.china-links'); var cx=q('.china-cancelled-bar'); var badges=[].map.call(li.querySelectorAll('.ev-top .china-badge'),function(x){return x.outerHTML}).join('');
 var pal=['#FF5C8A','#7B61FF','#00B8A9','#FF9F1C','#2EC4F1']; var h=0; for(var i=0;i<type.length;i++)h+=type.charCodeAt(i);
 li.style.setProperty('--b',pal[h%pal.length]);
 var row=function(ic,lab,v){return v?'<div class="b-m"><i>'+ic+'</i><span class="b-l">'+lab+'</span><span class="b-v">'+v+'</span></div>':''};
 var dl=zh&&li.dataset.kind==='event'&&li.dataset.dates?li.dataset.dates.split(','):null; if(dl){var f=function(x){return x.replace(/-/g,'/')}; when=f(dl[0])+(dl.length>1?'–'+f(dl[dl.length-1]):'');}
 var html=(cx?cx.outerHTML:'')+'<div class="ev-top b-head"><span class="b-date">'+when.replace(/ · .*$/,'')+'</span><span class="b-type">'+type+'</span>'+badges+'</div>'+
  '<h3 class="ev-name b-name">'+name.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</h3><div class="b-meta">'+
  row('🕗',zh?'时间':'Time',meta.time||(when.indexOf(' · ')>0?when.split(' · ').slice(1).join(' · '):''))+row('📍',zh?'场地':'Venue',meta.venue)+row('🎪',zh?'主办':'ORG',meta.org)+row('🎧','DJ',meta.dj)+'</div>'+
  (cover?'<div class="b-poster"></div>':'')+
  ((rest.length||links)?'<details class="b-more"><summary>'+(zh?'地址 · 联系 · 链接':'Address · Contact · Links')+'</summary><div class="b-in">'+rest.join('')+(links?links.outerHTML:'')+'</div></details>':'');
 li.innerHTML=html; if(cover){cover.removeAttribute('aria-hidden');cover.removeAttribute('tabindex');li.querySelector('.b-poster').appendChild(cover);}
}
var REG=null,CV={};
if(zh){fetch('/asia/events.json').then(function(r){return r.json()}).then(function(d){d=Array.isArray(d)?d:(d.events||d);REG={};d.forEach(function(e){REG[e.id]=e.region});trad()}).catch(function(){});}
var occL=0; function conv(k){ if(!window.OpenCC){ if(!occL){occL=1;var sc=document.createElement('script');sc.src='/asia/opencc-cn2t.js';sc.onload=function(){document.querySelectorAll('.ev-card.b-card[data-t]').forEach(function(x){if(!x.lang)x.removeAttribute('data-t')});trad()};document.head.appendChild(sc);} return null; } return CV[k]||(CV[k]=OpenCC.Converter({from:'cn',to:k==='hk'?'hk':'twp'})); }
function trad(){ if(!REG) return; document.querySelectorAll('.ev-card.b-card[data-b]:not([data-t]), .ev-card.b-card[lang]').forEach(function(li){ var r=REG[li.dataset.id]; li.dataset.t='1'; var k=r==='Taiwan'?'tw':r==='Hong Kong'?'hk':null; if(!k) return; var c=conv(k); if(!c){li.removeAttribute('data-t');return;} li.lang=k==='hk'?'zh-HK':'zh-TW';
  var w=document.createTreeWalker(li,NodeFilter.SHOW_TEXT),n; while(n=w.nextNode()){ if(!/[\u4e00-\u9fff]/.test(n.nodeValue)) continue; var nv=n.nodeValue.split(/([台里])/).map(function(p){return /^[台里]$/.test(p)?p:c(p)}).join(''); if(nv!==n.nodeValue) n.nodeValue=nv; } }); }
function run(){document.querySelectorAll('.ev-card:not([data-b])').forEach(fix); trad();}
new MutationObserver(function(){run()}).observe(document.documentElement,{childList:true,subtree:true}); run();
})();
