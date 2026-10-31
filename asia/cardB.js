/* Card design B (young/fresh) — draft only */
(function(){
var zh=location.pathname.indexOf('/zh/')===0; /* page language = path only */
var NOTE=/<b>(备注|備註|Notes?)<\/b>/;
var EV=null; fetch('/asia/events.json?v=china342').then(function(r){return r.json()}).then(function(d){d=Array.isArray(d)?d:(d.events||d);EV={};d.forEach(function(e){EV[e.id]=e});document.querySelectorAll('.ev-card.b-card').forEach(dj)}).catch(function(){});
/* DJ row only when the event's own note names exactly one DJ (never invented); several DJs -> notes only */
function djName(e){ var t=(zh?(e.note_zh||e.note):(e.note||e.note_zh))||''; var re=/\bDJ(?!s)(?!\s*booth)(?!台)\s*[:：]?\s*([^；;。，,（()）\n]+?)(?=\s*[（(；;。，,]|\.\s|\.$|$)/g, m, out=[]; while(m=re.exec(t)){ var n=m[1].replace(/\s*\(host[^)]*\)/i,'').trim(); if(n&&out.indexOf(n)<0) out.push(n); } if(/\bDJs\b/.test(t)||/DJ\s*[：:][^。；;]*、/.test(t)) return null; return out.length===1?out[0]:null; }
function dj(li){ if(!EV||li.dataset.dj) return; var e=EV[li.dataset.id]; if(!e) return; li.dataset.dj='0'; var n=djName(e); if(!n) return; li.dataset.dj='1'; var v=li.querySelectorAll('.b-meta>.b-m')[1]; var d=document.createElement('div'); d.className='b-m b-dj'; d.innerHTML='<i>🎧</i><span class="b-l">DJ</span><span class="b-v"></span>'; d.lastChild.textContent=n; var m=li.querySelector('.b-meta'); var ven=[].filter.call(m.children,function(x){return /📍/.test(x.textContent)})[0]; if(ven) ven.after(d); else m.appendChild(d); }
/* draft 2026-10-31: one-step 更多/More — opening expands everything (notes unclamped, no second 展开全文 level); open state shows a single 收起/Less at the bottom */
function H(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function bad(x){return !x||/not found|没找到|未找到|unknown|未知|^tba$|待定/i.test(String(x))}
function rebuild(dt){ var li=dt.closest('.ev-card'), inn=dt.querySelector('.b-in'); if(!inn||!EV||!li||inn.dataset.r) return; var e=EV[li.dataset.id]; if(!e) return; inn.dataset.r='1';
 var R=[], row=function(l,v,c){ if(v) R.push('<div class="b-row'+(c?' '+c:'')+'"><b>'+l+'</b><span>'+v+'</span></div>'); };
 var cn=e.country==='China', a1=bad(e.venue_address)?'':e.venue_address, a2=bad(e.venue_address_en)?'':e.venue_address_en, ad=[];
 if(zh){ if(a1) ad.push(a1); if(a2&&(!cn||!a1||e.addr_en_zh)&&a2!==a1) ad.push(a2); } else { if(a2||a1) ad.push(a2||a1); }
 var mq=(e.venue?e.venue+' ':'')+(a1||a2||''), mu=(cn?'https://uri.amap.com/search?keyword=':'https://www.google.com/maps/search/?api=1&query=')+encodeURIComponent(a1||a2||'');
 row(zh?'地址':'Address', ad.length?'<a class="b-map" href="'+mu+'" target="_blank" rel="noopener">'+ad.map(H).join('<br>')+'</a>':'');
 var f=function(x){return x.replace(/-/g,'/')}, tm='';
 if(e.start&&e.end&&e.start!==e.end) tm=f(e.start)+' – '+f(e.end); else if(e.start) tm=f(e.start)+(e.time?' '+e.time:''); else if(e.time) tm=e.time;
 row(zh?'时间':'Time', H(tm));
 row('DJ', H(djName(e)||''));
 var nt=(zh?(e.note_zh||e.note):(e.note||e.note_zh))||'', ss=nt.split(/(?<=[。；;！!])\s*|(?<=\.)\s+/).filter(function(x){return x.trim()}), fee=[], keep=[];
 ss.forEach(function(x){ if(bad(x)) return; if(/门票|票价|费用|入场费|收费|免费|¥|￥|\d+\s*元|RMB|CNY|KRW|₩|NT\$|HK\$|\bEntry\b|\bFee\b|\bTicket|\bFree\b|\bAdmission/i.test(x)&&x.length<120) fee.push(x); else keep.push(x); });
 row(zh?'费用':'Fee', fee.map(H).join(' '));
 row(zh?'说明':'Notes', H(keep.join(zh?'':' ')), 'b-note');
 var C=(e.contacts&&!Array.isArray(e.contacts))?e.contacts:{}, org=(!zh&&e.organizers_en)||e.organizers||[], ct=[];
 if(org.length) ct.push(H(org.join(zh?'、':', ')));
 if(C.wechat_id) ct.push((zh?'微信号：':'WeChat ID: ')+H(C.wechat_id)+(C.wechat_label?' ('+H(C.wechat_label)+')':''));
 if(C.phone) ct.push((zh?'电话：':'Phone: ')+'<a href="tel:'+H(C.phone.replace(/[^\d+]/g,''))+'">'+H(C.phone)+'</a>');
 if(C.email) ct.push((zh?'邮箱：':'Email: ')+'<a href="mailto:'+H(C.email)+'">'+H(C.email)+'</a>');
 row(zh?'联络方式':'Contact', ct.join('<br>'));
 var L=e.links||{}, lk=[], A=function(u,t){ lk.push('<a href="'+H(u)+'" target="_blank" rel="noopener">'+t+'</a>'); };
 if(L.wechat) A(L.wechat, zh?'微信文章':'WeChat article');
 if(L.facebook) A(L.facebook, zh?'脸书':'Facebook');
 if(L.other&&!/tangoweekend\.org\/event\//.test(L.other)) A(L.other, zh?'网站':'Website');
 if(L.register) A(L.register, zh?'报名':'Register');
 if(L.video) A(L.video, zh?'视频':'Video');
 row(zh?'链接':'Links', lk.join('<br>'), 'b-links');
 inn.innerHTML=R.join(''); }
document.addEventListener('toggle',function(ev){ var dt=ev.target; if(!dt.classList||!dt.classList.contains('b-more')) return; var inn=dt.querySelector('.b-in')||dt;
 if(dt.open){ rebuild(dt); dt.querySelectorAll('.b-note>span').forEach(function(sp){ sp.classList.add('b-open'); }); if(!inn.querySelector(':scope>.b-less')){ var b=document.createElement('button'); b.type='button'; b.className='b-less'; b.textContent=zh?'收起':'Less'; b.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); dt.open=false; var c=dt.closest('.ev-card')||dt, r=c.getBoundingClientRect(); if(r.top<0) c.scrollIntoView({block:'start'}); }); inn.appendChild(b); var li=dt.closest('.ev-card'), e=EV&&li&&EV[li.dataset.id], m=e&&((e.detail&&('https://tangoweekend.org'+e.detail))||(e.links&&e.links.other)||'').match(/^https?:\/\/(www\.)?tangoweekend\.org\/event\/([^\/]+)\/$/); if(m){ var a=document.createElement('a'); a.className='b-det'; a.href='/event/'+m[2]+'/'+(zh?'zh/':'')+'?from='+encodeURIComponent(li.dataset.id); a.textContent=zh?'活动详情':'Event details'; inn.insertBefore(a,b); } } }
},true);
function k(l){return (l.querySelector('.ev-k')||{}).textContent||''}
function fix(li){ if(li.dataset.b)return; li.dataset.b='1'; li.classList.add('b-card');
 var q=function(s){return li.querySelector(s)};
 var KO={E105:'第5周特别场 BIG LUMINOSO Milonga',E106:'양헬 Tango 13周年派对',E107:'The Pista Milonga',E108:'16周年派对',R249:'周一 Luminoso'};
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
 /* v10.7: name already names the venue -> keep the name, hide the venue row on the face (address stays in 更多) */ var vn=function(x){return String(x||'').toLowerCase().replace(/俱乐部|俱樂部|工作室|舞蹈|探戈|club|studio|tango|dance|academy|学院|[\s()（）·\-_&.,，、'’]/g,'')}; /* v10.7: card face never shows (…)/（…） in names (display only) */ /* v10.8: en page, Korean name (English) -> 'Korean English', no parens */ if(!zh){ var km=/^([\uac00-\ud7a3][^()（）]*?)\s*[（(]\s*([A-Za-z][^()（）]*?)\s*[)）]\s*$/.exec(name); if(km) name=km[1]+' '+km[2]; } var sn=name; for(var gi=0;gi<3;gi++) sn=sn.replace(/\s*[（(][^()（）]*[)）]/g,''); sn=sn.replace(/\s{2,}/g,' ').trim(); if(sn!==name.trim()){ li.dataset.orgStripped=name; if(sn) name=sn; else li.dataset.stripEmpty='1'; }
 var bm=name.match(/^(.*\S)\s+by\s+(.+)$/i); if(bm&&bm[1].split('(').length===bm[1].split(')').length&&bm[1].split('（').length===bm[1].split('）').length){ var by=bm[2].trim(), oz=(function(t){t.innerHTML=meta.org||'';return t.textContent.trim()})(document.createElement('div')), nz=function(x){return x.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'')}; if(!oz){meta.org=by.replace(/</g,'&lt;');name=bm[1];} else if(nz(oz)===nz(by)) name=bm[1]; else if(li.dataset.id==='R079'){meta.org=by.replace(/</g,'&lt;');name=bm[1];} else li.dataset.byConflict=by; }
 var cm=!li.dataset.byConflict&&li.dataset.id!=='E043'&&name.match(/^([^:：]+?)\s*[:：]\s*(.+)$/); if(cm&&/\s&\s|＆/.test(cm[1])&&!/\d/.test(cm[1])){ var pp=cm[1].trim(), oz2=(function(t){t.innerHTML=meta.org||'';return t.textContent.trim()})(document.createElement('div')), nz2=function(x){return x.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'')}; if(!oz2){meta.org=pp.replace(/</g,'&lt;');name=cm[2];} else if(nz2(oz2)===nz2(pp)) name=cm[2]; else li.dataset.colonConflict=pp; }
 var links=q('.china-links'); var cx=q('.china-cancelled-bar'); var badges=[].map.call(li.querySelectorAll('.ev-top .china-badge'),function(x){return x.outerHTML}).join('');
 var pal=['#FF5C8A','#7B61FF','#00B8A9','#FF9F1C','#2EC4F1']; var h=0; for(var i=0;i<type.length;i++)h+=type.charCodeAt(i);
 li.style.setProperty('--b',pal[h%pal.length]);
 var row=function(ic,lab,v){return v?'<div class="b-m"><i>'+ic+'</i><span class="b-l">'+lab+'</span><span class="b-v">'+v+'</span></div>':''};
 var dl=li.dataset.kind==='event'&&li.dataset.dates?li.dataset.dates.split(','):null; if(dl){var f=function(x){return x.replace(/-/g,'/')}; when=f(dl[0])+(dl.length>1?'–'+f(dl[dl.length-1]):'');}
 var html=(cx?cx.outerHTML:'')+'<div class="ev-top b-head">'+badges+'<span class="b-label">'+(function(w,t){w=w.replace(/ · .*$/,'').trim();t=t.trim();if(li.dataset.id==='nTUlADFZ')return zh?t:t.charAt(0).toUpperCase()+t.slice(1); /* v10.8: Suzhou TangoBlast label = type only, no date */if(li.dataset.kind==='weekly'&&w){var tr=false;w=/每月|monthly/i.test(w)?(zh?'每月':'Monthly'):/隔[周週]|每两周|每兩週|every other|biweekly/i.test(w)?(zh?(tr?'每兩週':'每两周'):'Biweekly'):(zh?(tr?'每週':'每周'):'Weekly');if(zh)return w+t;} /* v10.8: frequency + type only, no weekday */if(li.dataset.kind==='event'&&w){var co=document.querySelector('#china-city option[value="'+li.dataset.region+'"]');var cn=co?(zh?co.textContent:(co.getAttribute('data-en')||co.textContent)):'';cn=String(cn||'').replace(/\s*[（(][^（）()]*[）)]\s*$/,'').replace(/\d+场$/,'').trim();w=(dl?dl[0].replace(/-/g,'/'):w.replace(/–.*$/,''));var tt=t?(zh?t:t.charAt(0).toUpperCase()+t.slice(1)):'';return [tt,w,cn].filter(Boolean).join(' ');} /* v11.1: event label = type + start date + city (no end date, no city count, no ·) */if(!w)return t;if(!t)return w;return zh?(li.dataset.kind==='weekly'?w+t:w+' '+t):w+' · '+t.charAt(0).toUpperCase()+t.slice(1)})(when,type)+'</span></div>'+
  '<h3 class="ev-name b-name">'+name.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</h3><div class="b-meta">'+
  row('🕗',zh?'时间':'Time',meta.time||(when.indexOf(' · ')>0?when.split(' · ').slice(1).join(' · '):''))+'<div class="b-m b-venue"><i>📍</i><span class="b-l">'+(zh?'场地':'Venue')+'</span><span class="b-v">'+(meta.venue||'')+'</span></div>'+row('🎪',zh?'主办':'ORG',meta.org)+'</div>'+
  (cover?'<div class="b-poster"></div>':'')+
  ((rest.length||links)?'<details class="b-more"><summary>'+(zh?'更多':'More')+'</summary><div class="b-in">'+rest.filter(function(x){return !NOTE.test(x)}).join('')+(links?links.outerHTML:'')+rest.filter(function(x){return NOTE.test(x)}).map(function(x){return x.replace('<div class="b-row">','<div class="b-row b-note">')}).join('')+'</div></details>':'');
 html=html.replace(/\s*[（(]\s*[）)]/g,''); /* v11.1: drop empty （ ） anywhere on the card */ li.innerHTML=html; dj(li); if(cover){cover.removeAttribute('aria-hidden');cover.removeAttribute('tabindex');li.querySelector('.b-poster').appendChild(cover);}
}
var REG=null,CV={};
if(zh){fetch('/asia/events.json?v=china342').then(function(r){return r.json()}).then(function(d){d=Array.isArray(d)?d:(d.events||d);REG={};d.forEach(function(e){REG[e.id]=e.region});trad()}).catch(function(){});}
var occL=0; function conv(k){ if(!window.OpenCC){ if(!occL){occL=1;var sc=document.createElement('script');sc.src='/asia/opencc-cn2t.js';sc.onload=function(){document.querySelectorAll('.ev-card.b-card[data-t]').forEach(function(x){if(!x.lang)x.removeAttribute('data-t')});trad()};document.head.appendChild(sc);} return null; } return CV[k]||(CV[k]=OpenCC.Converter({from:'cn',to:k==='hk'?'hk':'twp'})); }
function trad(){ if(!REG) return; document.querySelectorAll('.ev-card.b-card[data-b]:not([data-t]), .ev-card.b-card[lang]').forEach(function(li){ var r=REG[li.dataset.id]; li.dataset.t='1'; var k=r==='Taiwan'?'tw':r==='Hong Kong'?'hk':null; if(!k) return; var c=conv(k); if(!c){li.removeAttribute('data-t');return;} li.lang=k==='hk'?'zh-HK':'zh-TW';
  var w=document.createTreeWalker(li,NodeFilter.SHOW_TEXT),n; while(n=w.nextNode()){ if(!/[\u4e00-\u9fff]/.test(n.nodeValue)) continue; if(n.parentElement&&n.parentElement.closest('.b-row')&&/^(城市|国家)$/.test((n.parentElement.closest('.b-row').querySelector('b')||{}).textContent||'')) continue; if(n.parentElement&&n.parentElement.closest('.atm-pt,.b-l,.b-label,.atm-mk,.china-badge,.atm-more,.ev-type,summary,.b-row>b,.china-links,.b-note-tg,.atm-heart')) continue; /* quickfix: fixed UI labels stay Simplified */ var nv=n.nodeValue.split(/([台里])/).map(function(p){return /^[台里]$/.test(p)?p:c(p)}).join(''); if(nv!==n.nodeValue) n.nodeValue=nv; } }); }
function run(){document.querySelectorAll('.ev-card:not([data-b])').forEach(fix); trad();}
new MutationObserver(function(){run()}).observe(document.documentElement,{childList:true,subtree:true}); run();
})();
