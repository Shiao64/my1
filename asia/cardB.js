/* Card design B (young/fresh) — draft only */
(function(){
var zh=location.pathname.indexOf('/zh/')===0; /* page language = path only */
var NOTE=/<b>(备注|備註|Notes?)<\/b>/;
var EV=null; fetch('/asia/events.json?v=e165').then(function(r){return r.json()}).then(function(d){d=Array.isArray(d)?d:(d.events||d);EV={};d.forEach(function(e){EV[e.id]=e});document.querySelectorAll('.ev-card.b-card').forEach(dj);p10mount()}).catch(function(){});
var DJPROF=[]; fetch('/asia/djs.json?v=d1').then(function(r){return r.json()}).then(function(d){ DJPROF=Array.isArray(d)?d:[]; document.querySelectorAll('.p10-dj[data-name]').forEach(function(el){ paintDj(el, el.dataset.name); }); }).catch(function(){});
var ORGPROF=[]; fetch('/asia/organizers.json?v=o1').then(function(r){return r.json()}).then(function(d){ ORGPROF=Array.isArray(d)?d:[]; document.querySelectorAll('.p10-orgs').forEach(function(el){ el.innerHTML=orgNamesHtml((el.dataset.orgs||'').split('||'), el.dataset.card||''); }); }).catch(function(){});
/* DJ line: events.dj wins. Else names from the note (DJ or 乐师). Several people are joined. A name that is a case/space-insensitive substring of another is dropped. The face label stays "DJ:". */
function djTrim(n){ n=String(n||'').replace(/\s*\(host[^)]*\)/i,'').replace(/\s*（主持[^）]*）/,'').replace(/\s+(who|which)\b[\s\S]*$/i,'').trim(); var lat=n.match(/^([A-Za-z][A-Za-z .'\-·]*[A-Za-z])/); if(lat&&/[\u4e00-\u9fff]/.test(n)) n=lat[1]; n=n.replace(/\s+[a-z][\s\S]*$/,'').trim(); return n.replace(/\s+/g,' ').trim(); }
function djPieces(n){ return String(n||'').split(/\s*(?:、|\+|＆|&|\/|\band\b|与|與)\s*/i).map(djTrim).filter(Boolean); }
function djKey(n){ return String(n||'').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,''); }
function djJoin(list){ var out=[]; list.forEach(function(n){ if(!n) return; var c=djKey(n); if(!c) return; for(var i=0;i<out.length;i++){ var o=djKey(out[i]); if(!o) continue; if(o===c||o.indexOf(c)>=0) return; if(c.indexOf(o)>=0){ out[i]=n; return; } } out.push(n); }); return out.join(zh?'、':', '); }
function djName(e){ if(!e) return '';
  var preset=e.dj; if(Array.isArray(preset)){ var aj=djJoin(preset.map(djTrim)); if(aj) return aj; } else if(preset!=null&&String(preset).trim()){ var sj=djJoin(djPieces(String(preset))); if(sj) return sj; }
  var parts=zh?[e.note_zh,e.note,e.poster_text]:[e.note,e.note_zh,e.poster_text], t=parts.filter(Boolean).join('\n'); if(!t) return '';
  var re=/(?:\bDJ|乐师)(?!s)(?!\s*booth)(?!台)\s*[:：]?\s*([^；;。，,（()）\n]+?)(?=\s*(?:[（(）)；;。，,]|\bDJ\b|乐师)|\.\s|\.$|$)/gi, m, found=[];
  while(m=re.exec(t)) djPieces(m[1]).forEach(function(n){ if(n) found.push(n); });
  return djJoin(found); }
function profileOf(list, name){ var k=djKey(name); if(!k) return null; for(var i=0;i<list.length;i++){ var p=list[i], names=[p.name,p.name_zh].concat(p.match||[]); for(var j=0;j<names.length;j++) if(djKey(names[j])===k) return p; } return null; }
function djProfileId(name){ var p=profileOf(DJPROF, name); return p&&p.id||''; }
function orgProfileId(name){ var p=profileOf(ORGPROF, name); return p&&p.id||''; }
function profileHref(kind, id, cardId){ var path=(zh?'/zh':'')+'/'+(kind==='organizer'?'organizer':'dj')+'/'+encodeURIComponent(id)+'/'; if(cardId) path+='?card='+encodeURIComponent(cardId); return path; }
function orgLabel(name){ var p=profileOf(ORGPROF, name); if(!p) return name; var shown=zh?(p.name_zh||p.name||name):(p.name||p.name_zh||name); return shown||name; }
function orgNamesHtml(names, cardId){ var sep=zh?'、':', '; return names.map(function(n){ n=String(n||'').trim(); if(!n) return ''; var id=orgProfileId(n), label=orgLabel(n); if(!id) return H(label); return '<a class="p10-org-a" href="'+H(profileHref('organizer', id, cardId))+'">'+H(label)+'</a>'; }).filter(Boolean).join(sep); }
function paintDj(el, name, cardId){ if(!el) return; if(cardId) el.dataset.card=cardId; el.dataset.name=name||''; while(el.firstChild) el.removeChild(el.firstChild); if(!name){ el.hidden=true; return; } el.hidden=false; el.appendChild(document.createTextNode('DJ: ')); var parts=djPieces(name); if(!parts.length) parts=[name]; parts.forEach(function(n,i){ if(i) el.appendChild(document.createTextNode(zh?'、':', ')); var id=djProfileId(n); if(!id){ el.appendChild(document.createTextNode(n)); return; } var a=document.createElement('a'); a.className='p10-dj-a'; a.href=profileHref('dj', id, el.dataset.card||''); a.textContent=n; el.appendChild(a); }); }
function djForSlide(e, url){ var q=String(url||'').split('?')[0]; var map=e.poster_djs; if(map&&map[q]) return map[q]; var cur=String(e.poster||'').split('?')[0]; if(q&&q===cur) return djName(e); return ''; }
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
 if(C.facebook&&!/^https?:\/\//i.test(C.facebook)) ct.push((zh?'脸书：':'Facebook: ')+H(C.facebook));
 row(zh?'联络方式':'Contact', ct.join('<br>'));
 var L=e.links||{}, lk=[], A=function(u,t){ lk.push('<a href="'+H(u)+'" target="_blank" rel="noopener">'+t+'</a>'); };
 var OA=L.wechat_oa, oaT=OA&&OA.name?(zh?'微信公众号：':'WeChat Official Account: ')+H(OA.name):''; if(oaT){ if(OA.biz) A('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz='+OA.biz.replace(/[^A-Za-z0-9+\/=]/g,'')+'#wechat_redirect', oaT); else lk.push('<span>'+oaT+'</span>'); } /* v11.7 wechat_oa */
 if(L.wechat&&!(oaT&&OA.biz)) A(L.wechat, zh?'微信文章':'WeChat article');
 if(L.facebook) A(L.facebook, zh?'脸书':'Facebook');
 if(L.other&&!/tangoweekend\.org\/event\//.test(L.other)) A(L.other, zh?'网站':'Website');
 if(L.register) A(L.register, zh?'报名':'Register');
 if(L.video) A(L.video, zh?'视频':'Video');
 row(zh?'链接':'Links', lk.join('<span class="b-lsep"> · </span>'), 'b-links');
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
 var links=q('.china-links'); var cx=q('.china-cancelled-bar'), thb=q('.atm-theme-bar'); var badges=[].map.call(li.querySelectorAll('.ev-top .china-badge'),function(x){return x.outerHTML}).join('');
 var pal=['#FF5C8A','#7B61FF','#00B8A9','#FF9F1C','#2EC4F1']; var h=0; for(var i=0;i<type.length;i++)h+=type.charCodeAt(i);
 li.style.setProperty('--b',pal[h%pal.length]);
 var row=function(ic,lab,v){return v?'<div class="b-m"><i>'+ic+'</i><span class="b-l">'+lab+'</span><span class="b-v">'+v+'</span></div>':''};
 var dl=li.dataset.kind==='event'&&li.dataset.dates?li.dataset.dates.split(','):null; if(dl){var f=function(x){return x.replace(/-/g,'/')}; when=f(dl[0])+(dl.length>1?'–'+f(dl[dl.length-1]):'');}
 var html=(cx?cx.outerHTML:'')+(thb?thb.outerHTML:'')+'<div class="ev-top b-head">'+badges+'<span class="b-label">'+(function(w,t){w=w.replace(/ · .*$/,'').trim();t=t.trim();if(li.dataset.id==='nTUlADFZ')return zh?t:t.charAt(0).toUpperCase()+t.slice(1); /* v10.8: Suzhou TangoBlast label = type only, no date */if(li.dataset.kind==='weekly'&&w){var tr=false;w=/每月|monthly/i.test(w)?(zh?'每月':'Monthly'):/隔[周週]|每两周|每兩週|every other|biweekly/i.test(w)?(zh?(tr?'每兩週':'每两周'):'Biweekly'):(zh?(tr?'每週':'每周'):'Weekly');if(zh)return w+t;} /* v10.8: frequency + type only, no weekday */if(li.dataset.kind==='event'&&w){var co=document.querySelector('#china-city option[value="'+li.dataset.region+'"]');var cn=co?(zh?co.textContent:(co.getAttribute('data-en')||co.textContent)):'';cn=String(cn||'').replace(/\s*[（(][^（）()]*[）)]\s*$/,'').replace(/\d+场$/,'').trim();w=(dl?dl[0].replace(/-/g,'/'):w.replace(/–.*$/,''));var tt=t?(zh?t:t.charAt(0).toUpperCase()+t.slice(1)):'';return [tt,w,cn].filter(Boolean).join(' ');} /* v11.1: event label = type + start date + city (no end date, no city count, no ·) */if(!w)return t;if(!t)return w;return zh?(li.dataset.kind==='weekly'?w+t:w+' '+t):w+' · '+t.charAt(0).toUpperCase()+t.slice(1)})(when,type)+'</span></div>'+
  '<h3 class="ev-name b-name">'+name.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</h3><div class="b-meta">'+
  row('🕗',zh?'时间':'Time',meta.time||(when.indexOf(' · ')>0?when.split(' · ').slice(1).join(' · '):''))+'<div class="b-m b-venue"><i>📍</i><span class="b-l">'+(zh?'场地':'Venue')+'</span><span class="b-v">'+(meta.venue||'')+'</span></div>'+row('🎪',zh?'主办':'ORG',meta.org)+'</div>'+
  (cover?'<div class="b-poster"></div>':'')+
  ((rest.length||links)?'<details class="b-more"><summary>'+(zh?'更多':'More')+'</summary><div class="b-in">'+rest.filter(function(x){return !NOTE.test(x)}).join('')+(links?links.outerHTML:'')+rest.filter(function(x){return NOTE.test(x)}).map(function(x){return x.replace('<div class="b-row">','<div class="b-row b-note">')}).join('')+'</div></details>':'');
 html=html.replace(/\s*[（(]\s*[）)]/g,''); /* v11.1: drop empty （ ） anywhere on the card */ li.innerHTML=html; dj(li); if(cover){cover.removeAttribute('aria-hidden');cover.removeAttribute('tabindex');li.querySelector('.b-poster').appendChild(cover);}
}
var REG=null,CV={};
if(zh){fetch('/asia/events.json?v=e165').then(function(r){return r.json()}).then(function(d){d=Array.isArray(d)?d:(d.events||d);REG={};d.forEach(function(e){REG[e.id]=e.region});trad()}).catch(function(){});}
var occL=0; function conv(k){ if(!window.OpenCC){ if(!occL){occL=1;var sc=document.createElement('script');sc.src='/asia/opencc-cn2t.js';sc.onload=function(){document.querySelectorAll('.ev-card.b-card[data-t]').forEach(function(x){if(!x.lang)x.removeAttribute('data-t')});trad()};document.head.appendChild(sc);} return null; } return CV[k]||(CV[k]=OpenCC.Converter({from:'cn',to:k==='hk'?'hk':'twp'})); }
function trad(){ if(!REG) return; document.querySelectorAll('.ev-card.b-card[data-b]:not([data-t]), .ev-card.b-card[lang]').forEach(function(li){ var r=REG[li.dataset.id]; li.dataset.t='1'; var k=r==='Taiwan'?'tw':r==='Hong Kong'?'hk':null; if(!k) return; var c=conv(k); if(!c){li.removeAttribute('data-t');return;} li.lang=k==='hk'?'zh-HK':'zh-TW';
  var w=document.createTreeWalker(li,NodeFilter.SHOW_TEXT),n; while(n=w.nextNode()){ if(!/[\u4e00-\u9fff]/.test(n.nodeValue)) continue; if(n.parentElement&&n.parentElement.closest('.b-row')&&/^(城市|国家)$/.test((n.parentElement.closest('.b-row').querySelector('b')||{}).textContent||'')) continue; if(n.parentElement&&n.parentElement.closest('.atm-pt,.b-l,.b-label,.atm-mk,.china-badge,.atm-more,.ev-type,summary,.b-row>b,.china-links,.b-note-tg,.atm-heart,.p10-more,.p10-less,.p10-k,.p10-npill,.p10-ncollapse')) continue; /* quickfix: fixed UI labels stay Simplified */ var nv=n.nodeValue.split(/([台里])/).map(function(p){return /^[台里]$/.test(p)?p:c(p)}).join(''); if(nv!==n.nodeValue) n.nodeValue=nv; } }); }
/* v11.8 P10: weekly / regular single card (?card=). Featured event cards stay on the existing shell. */
var P10TN=zh?{milonga:'舞会',practica:'练习场',festival:'探戈节',marathon:'马拉松',event:'活动',weekend:'周末',encuentro:'聚会',championship:'锦标赛',class:'课程'}:{milonga:'Milonga',practica:'Práctica',festival:'Festival',marathon:'Marathon',event:'Event',weekend:'Weekend',encuentro:'Encuentro',championship:'Championship',class:'Class'};
var P10DZ=['日','一','二','三','四','五','六'], P10DE=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], P10DS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function p10type(e){ return P10TN[e.type]||e.type||(zh?'活动':'Event'); }
function p10freq(e){ var ty=p10type(e); if(e.kind!=='weekly') return ty; var ds=e.weekdays||(e.weekday!=null?[e.weekday]:[]); if(!ds.length) return (zh?'每周':'Weekly ')+ty;
  if(e.nth&&ds.length===1){ var d=ds[0]%7; if(zh) return '每月'+(e.nth===-1?'最后一个':'第'+['','一','二','三','四','五'][e.nth]+'个')+'周'+P10DZ[d]+ty; return (e.nth===-1?'Last':['','1st','2nd','3rd','4th','5th'][e.nth])+' '+P10DE[d]+' '+ty; }
  if(e.every===2&&ds.length===1) return zh?('隔周周'+P10DZ[ds[0]%7]+ty):('Every other '+P10DE[ds[0]%7]+' '+ty);
  if(zh) return '每周'+ds.map(function(i){return P10DZ[i%7]}).join('、')+ty;
  return 'Every '+ds.map(function(i){return ds.length>1?P10DS[i%7]:P10DE[i%7]}).join(' & ')+' '+ty; }
function p10pad(n){ return (n<10?'0':'')+n; }
function p10shToday(){ try{ var y,m,d, parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); parts.forEach(function(p){ if(p.type==='year') y=p.value; else if(p.type==='month') m=p.value; else if(p.type==='day') d=p.value; }); if(y&&m&&d) return y+'-'+m+'-'+d; }catch(err){} var n=new Date(Date.now()+8*3600000); return n.getUTCFullYear()+'-'+p10pad(n.getUTCMonth()+1)+'-'+p10pad(n.getUTCDate()); }
function p10normDate(s){ var m=String(s||'').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); return m?m[1]+'-'+p10pad(+m[2])+'-'+p10pad(+m[3]):''; }
function p10nextDate(e){ var today=p10shToday(), p=today.split('-'), now=new Date(+p[0], +p[1]-1, +p[2], 12,0,0,0);
  if(e.kind!=='weekly') return p10normDate(e.start);
  var ds=e.weekdays||(e.weekday!=null?[e.weekday]:[]); if(!ds.length) return ''; var best=null;
  ds.forEach(function(wd){ wd=wd%7; var n=new Date(now.getFullYear(),now.getMonth(),now.getDate()+((wd-now.getDay()+7)%7)); if(e.nth){ var g=0; while(g++<8){ var k=Math.floor((n.getDate()-1)/7)+1, last=new Date(n.getFullYear(),n.getMonth(),n.getDate()+7).getMonth()!==n.getMonth(); if(e.nth===-1?last:k===e.nth) break; n=new Date(n.getFullYear(),n.getMonth(),n.getDate()+7); } } if(!best||n<best) best=n; });
  return best?best.getFullYear()+'-'+p10pad(best.getMonth()+1)+'-'+p10pad(best.getDate()):''; }
/* temp_notices: visible while Asia/Shanghai today is within date, or start–end. Hidden after the end date. */
function p10noticeSpan(o){ var date=p10normDate(o.date), start=p10normDate(o.start)||date, end=p10normDate(o.end)||date||start; if(!start) start=end; if(!end) end=start; if(!start||!end) return null; if(end<start){ var t=start; start=end; end=t; } return {start:start, end:end}; }
function p10notices(e){ var list=e.temp_notices; if(!Array.isArray(list)) return []; var today=p10shToday(), out=[];
  for(var i=0;i<list.length;i++){ var o=list[i]; if(!o) continue; var w=p10noticeSpan(o); if(!w||today<w.start||today>w.end) continue; out.push(o); } return out; }
function p10noticeBody(o){ return String(zh?(o.text!=null&&o.text!==''?o.text:(o.text_en||'')):(o.text_en!=null&&o.text_en!==''?o.text_en:(o.text||''))); }
function p10safeImg(u){ u=String(u||'').trim(); if(/^\/(?!\/)/.test(u)||/^https?:\/\//i.test(u)) return u; return ''; }
function p10when(e){ if(e.kind!=='weekly'){ if(!e.start) return ''; var p=String(e.start).split('-'), s=(+p[1])+'/'+(+p[2]); if(e.end&&e.end!==e.start){ var q=String(e.end).split('-'); s+='–'+(p[0]===q[0]&&p[1]===q[1]?(+q[2]):(+q[1])+'/'+(+q[2])); } return s; }
  var iso=p10nextDate(e); if(!iso) return ''; var x=iso.split('-'); return (+x[1])+'/'+(+x[2]); }
function p10time(t){ if(!t) return ''; var raw=String(t).replace(/-/g,'–'); if(zh) return raw; function one(x){ var m=String(x).trim().match(/^(\d{1,2}):(\d{2})$/); if(!m) return String(x).trim(); var h=(+m[1])%24, mi=m[2], ap=h>=12?'PM':'AM'; h=h%12; if(!h) h=12; return h+':'+mi+' '+ap; } var parts=raw.split('–'); return parts.length===2?one(parts[0])+' – '+one(parts[1]):one(raw); }
function p10slides(e){ var cur=(zh&&e.poster_zh)||(!zh&&e.poster_en)||e.poster||''; var past=e.posters_past||e.past_posters||[]; if(!Array.isArray(past)) past=[]; var out=[]; function add(u){ u=String(u||'').trim(); if(u&&out.indexOf(u)<0) out.push(u); } add(cur); past.forEach(add); return out; }
function p10fileDate(u){ var b=String(u||'').split('/').pop().split('?')[0]; var m=b.match(/(20\d{2})-(\d{2})-(\d{2})/); if(!m){ m=b.match(/(20\d{2})(\d{2})(\d{2})(?!\d)/); if(m&&b.indexOf(m[0]+'T')>=0) m=null; } if(!m) return ''; var y=+m[1], mo=+m[2], d=+m[3]; if(mo<1||mo>12||d<1||d>31) return ''; return m[1]+'-'+p10pad(mo)+'-'+p10pad(d); }
function p10dateOf(e, url){ var q=String(url||'').split('?')[0]; var map=e.poster_dates; if(map&&map[q]) return map[q]; var cur=String((zh&&e.poster_zh)||(!zh&&e.poster_en)||e.poster||'').split('?')[0]; if(q&&q===cur&&e.poster_date) return e.poster_date; return p10fileDate(q); }
function p10singlePast(e, url){ var today=p10shToday(); if(e.kind!=='weekly'){ var end=e.end||e.start||''; if(end) return end<today; } var d=p10dateOf(e, url); return !!(d&&d<today); }
function p10rows(e, faceVenue, faceDj){ var R=[], row=function(l,v){ if(v) R.push('<div class="b-row p10-row"><b class="p10-k">'+l+'</b><span>'+v+'</span></div>'); };
  var org=(!zh&&e.organizers_en&&e.organizers_en.length)?e.organizers_en:(e.organizers||[]); if(org.length) R.push('<div class="b-row p10-row"><b class="p10-k">'+(zh?'主办':'Organizer')+'</b><span class="p10-orgs" data-card="'+H(e.id)+'" data-orgs="'+H(org.join('||'))+'">'+orgNamesHtml(org, e.id)+'</span></div>');
  var ven=(!zh&&e.venue_en)||e.venue||''; if(!zh&&/[\u4e00-\u9fff]/.test(ven)&&e.venue_en) ven=e.venue_en; if(ven&&!faceVenue) row(zh?'场地':'Venue', H(ven));
  var dj=djName(e)||''; if(dj&&!faceDj) row('DJ', H(dj));
  var cn=e.country==='China', a1=bad(e.venue_address)?'':e.venue_address, a2=bad(e.venue_address_en)?'':e.venue_address_en, ad=[];
  if(zh){ if(a1) ad.push(a1); if(a2&&(!cn||!a1||e.addr_en_zh)&&a2!==a1) ad.push(a2); } else if(a2||a1) ad.push(a2||a1);
  if(ad.length){ var mu=(cn?'https://uri.amap.com/search?keyword=':'https://www.google.com/maps/search/?api=1&query=')+encodeURIComponent(a1||a2||''); row(zh?'地址':'Address', '<a href="'+mu+'" target="_blank" rel="noopener">'+ad.map(H).join('<br>')+'</a>'); }
  var C=(e.contacts&&!Array.isArray(e.contacts))?e.contacts:{}, ct=[];
  if(C.wechat_id) ct.push((zh?'微信号：':'WeChat ID: ')+H(C.wechat_id)+(C.wechat_label?' ('+H(C.wechat_label)+')':''));
  if(C.phone) ct.push((zh?'电话：':'Phone: ')+'<a href="tel:'+H(String(C.phone).replace(/[^\d+]/g,''))+'">'+H(C.phone)+'</a>');
  if(C.email) ct.push((zh?'邮箱：':'Email: ')+'<a href="mailto:'+H(C.email)+'">'+H(C.email)+'</a>');
  if(C.facebook&&!/^https?:\/\//i.test(C.facebook)) ct.push((zh?'脸书：':'Facebook: ')+H(C.facebook));
  row(zh?'联络方式':'Contact', ct.join('<br>'));
  var L=e.links||{}, lk=[], A=function(u,t){ lk.push('<a href="'+H(u)+'" target="_blank" rel="noopener">'+t+'</a>'); };
  var OA=L.wechat_oa, oaT=OA&&OA.name?(zh?'微信公众号：':'WeChat Official Account: ')+H(OA.name):''; if(oaT){ if(OA.biz) A('https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz='+OA.biz.replace(/[^A-Za-z0-9+\/=]/g,'')+'#wechat_redirect', oaT); else lk.push('<span>'+oaT+'</span>'); }
  if(L.wechat&&!(oaT&&OA.biz)) A(L.wechat, zh?'微信文章':'WeChat article');
  if(L.facebook) A(L.facebook, zh?'脸书':'Facebook');
  if(L.other&&!/tangoweekend\.org\/event\//.test(L.other)) A(L.other, zh?'网站':'Website');
  if(L.register) A(L.register, zh?'报名':'Register');
  if(L.video) A(L.video, zh?'视频':'Video');
  row(zh?'链接':'Links', lk.join('<span class="b-lsep"> · </span>'));
  var nt=(zh?(e.note_zh||e.note):(e.note||e.note_zh))||''; nt=String(nt).trim(); if(nt&&!bad(nt)) row(zh?'备注':'Note', H(nt));
  return R.join(''); }
function p10noticeUI(e, notices){ if(!notices||!notices.length) return null; var wrap=document.createElement('div'); wrap.className='p10-npill-wrap';
  var btn=document.createElement('button'); btn.type='button'; btn.className='p10-npill'; btn.setAttribute('aria-expanded','false');
  var panel=document.createElement('div'); panel.className='p10-npanel'; panel.hidden=true;
  notices.forEach(function(o){ var block=document.createElement('div'); block.className='p10-nblock'; var body=p10noticeBody(o);
    if(body.trim()){ var t=document.createElement('div'); t.className='p10-ntxt'; t.textContent=body; block.appendChild(t); }
    var vn=zh?(o.venue||o.venue_en||''):(o.venue_en||o.venue||''), oa=zh?(o.address||o.address_en||''):(o.address_en||o.address||'');
    if(vn&&!bad(vn)){ var v=document.createElement('div'); v.className='p10-nven'; v.textContent=vn; block.appendChild(v); }
    if(oa&&!bad(oa)){ var a=document.createElement('a'); a.className='p10-ndir'; a.href=(e.country==='China'?'https://uri.amap.com/search?keyword=':'https://www.google.com/maps/search/?api=1&query=')+encodeURIComponent(oa); a.target='_blank'; a.rel='noopener'; a.textContent=oa; block.appendChild(a); }
    var img=p10safeImg(o.image); if(img){ var pic=document.createElement('div'); pic.className='p10-ovpic'; var im=document.createElement('img'); im.src=img; im.alt=zh?'临时通知':'Notice'; pic.appendChild(im); block.appendChild(pic); }
    if(block.childNodes.length) panel.appendChild(block); });
  if(!panel.childNodes.length) return null;
  var less=document.createElement('button'); less.type='button'; less.className='p10-ncollapse'; less.textContent=zh?'收起 ⌃':'Collapse ⌃'; panel.appendChild(less);
  function setOpen(on){ panel.hidden=!on; btn.setAttribute('aria-expanded', on?'true':'false'); btn.textContent=(zh?'临时通知':'Notice')+(on?' ⌃':' ›'); }
  setOpen(false);
  btn.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); setOpen(panel.hidden); });
  less.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); setOpen(false); });
  wrap.appendChild(btn); wrap.appendChild(panel); return wrap; }
function p10bar(name, id){ document.documentElement.classList.add('atm-p10'); var bar=document.getElementById('atm-c1bar'); if(!bar) return;
  if(!bar.querySelector('.p10-in')){ var inn=document.createElement('div'); inn.className='p10-in'; while(bar.firstChild) inn.appendChild(bar.firstChild); bar.appendChild(inn); }
  var t=bar.querySelector('.atm-c1-t'); if(t&&name) t.textContent=name;
  var back=bar.querySelector('.atm-c1-back'); if(back&&!back.dataset.p10){ var nb=back.cloneNode(true); nb.dataset.p10='1'; var path=nb.querySelector('path'); if(path) path.setAttribute('stroke','#0A4F57'); back.parentNode.replaceChild(nb, back);
    nb.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); if(history.length>1) history.back(); else location.assign(zh?'https://tangoweekend.org/zh/':'https://tangoweekend.org/'); }); }
  if(!bar.querySelector('.p10-heart')){ var host=bar.querySelector('.p10-in')||bar, h=document.createElement('span'); h.className='atm-heart p10-heart ah-sheart'; h.setAttribute('role','button'); h.tabIndex=0; h.setAttribute('data-fid', id); h.setAttribute('data-sid', id);
    var on=false; try{ on=JSON.parse(localStorage.getItem('atm_fav_v1')||'[]').indexOf(id)>=0; }catch(err){} var lab=on?(zh?'取消收藏':'Remove from favorites'):(zh?'加入收藏':'Add to favorites');
    h.setAttribute('aria-pressed', on?'true':'false'); h.setAttribute('aria-label', lab); h.title=lab;
    h.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2.1 0 3.5 1.1 5.4 3.1C13.9 6.1 15.3 5 17.4 5 20.8 5 23 8.3 21.5 11.8 19.5 16.4 12 21 12 21z"/></svg>'; host.appendChild(h); } }
function p10(li, sg, e){ li.dataset.atm='1'; var nameEl=li.querySelector('.ev-name'), name=(nameEl&&nameEl.textContent||'').trim()||((zh&&e.name_zh)||e.name||''); if(/^S[01]$/.test(name)) name=(zh&&e.name_zh)||e.name||name;
  var keep=''; li.querySelectorAll(':scope>.china-cancelled-bar,:scope>.atm-theme-bar').forEach(function(n){ keep+=n.outerHTML; });
  var ven=(!zh&&e.venue_en)||e.venue||''; if(!zh&&/[\u4e00-\u9fff]/.test(ven)&&e.venue_en) ven=e.venue_en;
  var when=p10when(e), time=p10time(e.time), dj=djName(e)||'', faceDj=!!dj, notices=p10notices(e);
  var info=document.createElement('section'); info.className='p10-info';
  info.innerHTML='<p class="p10-row1"><span class="p10-lead"><i class="p10-dot" aria-hidden="true"></i><span class="p10-freq"></span>'+(when?' <time class="p10-when"></time>':'')+'</span>'+(time?'<span class="p10-sep">·</span><span class="p10-time"></span>':'')+'</p><p class="p10-row2"><button type="button" class="p10-more" aria-expanded="false">'+ (zh?'更多':'More') +'</button></p><div class="p10-body" hidden></div>';
  info.querySelector('.p10-freq').textContent=p10freq(e); var tm=info.querySelector('.p10-when'); if(tm) tm.textContent=when; var tt=info.querySelector('.p10-time'); if(tt) tt.textContent=time;
  var jd=document.createElement('span'); jd.className='p10-dj'; paintDj(jd, dj, e.id); var row1=info.querySelector('.p10-row1'); row1.appendChild(jd);
  li.appendChild(info);
  var faceVenue=false; if(ven){ var vs=document.createElement('span'); vs.className='p10-venue'; vs.textContent=ven; row1.appendChild(vs);
    var lh=parseFloat(getComputedStyle(row1).lineHeight)||26; if(row1.scrollHeight>lh*2.25||row1.scrollWidth>row1.clientWidth+4) vs.remove(); else faceVenue=true; }
  var pill=p10noticeUI(e, notices); if(pill) info.querySelector('.p10-row1').insertAdjacentElement('afterend', pill);
  var html=p10rows(e, faceVenue, faceDj), body=info.querySelector('.p10-body'), more=info.querySelector('.p10-more'), det=sg.querySelector('a.atm-det');
  if(!html&&!det){ more.hidden=true; info.querySelector('.p10-row2').hidden=true; }
  else { body.innerHTML=html; if(det){ det.classList.add('p10-det'); body.appendChild(det); } var less=document.createElement('button'); less.type='button'; less.className='p10-less'; less.textContent=zh?'收起':'Less'; body.appendChild(less);
    function setMore(on){ more.hidden=on; body.hidden=!on; more.setAttribute('aria-expanded', on?'true':'false'); }
    more.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); setMore(true); });
    less.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); setMore(false); }); }
  var slides=p10slides(e), stage=null;
  if(slides.length){ stage=document.createElement('div'); stage.className='p10-stage'; var i=0, one=slides.length<2;
    stage.innerHTML='<button type="button" class="p10-chev p10-prev"'+(one?' hidden':'')+' aria-label="'+(zh?'较新的海报':'Newer poster')+'"><svg viewBox="0 0 28 44" aria-hidden="true"><path fill="#fff" d="M20 2 L6 22 L20 42 L15 42 L1 22 L15 2 Z"/></svg></button><div class="p10-frame"><picture><source type="image/webp"><img class="p10-img" alt="" loading="eager" decoding="async"></picture><span class="p10-idx" hidden></span></div><button type="button" class="p10-chev p10-next"'+(one?' hidden':'')+' aria-label="'+(zh?'更早的海报':'Older poster')+'"><svg viewBox="0 0 28 44" aria-hidden="true"><path fill="#fff" d="M8 2 L22 22 L8 42 L13 42 L27 22 L13 2 Z"/></svg></button>';
    var img=stage.querySelector('.p10-img'), srcEl=stage.querySelector('source'), prev=stage.querySelector('.p10-prev'), next=stage.querySelector('.p10-next'), idx=stage.querySelector('.p10-idx');
    function p10urls(u){ var q=String(u||'').split('?')[0], base='/images/thumb800'+q.replace(/\.(jpe?g|png|webp)$/i,''); return {webp:base+'.webp?v=t800', jpg:base+'.jpg?v=t800', full:q}; }
    img.onerror=function(){ if(this.dataset.full&&this.dataset.fell!=='1'){ this.dataset.fell='1'; this.src=this.dataset.full; } };
    function show(n){ if(n<0||n>=slides.length) return; i=n; var u=p10urls(slides[i]); img.alt=name+(zh?' 海报':' poster'); img.dataset.fell=''; img.dataset.full=u.full; srcEl.srcset=u.webp; img.src=u.jpg; paintDj(jd, djForSlide(e, slides[i]), e.id); if(!one&&i>0){ idx.hidden=false; idx.textContent=(zh?'过期海报 ':'Past poster ')+i+'/'+(slides.length-1); } else if(one&&p10singlePast(e, slides[0])){ idx.hidden=false; idx.textContent=zh?'过期海报':'Past poster'; } else { idx.hidden=true; idx.textContent=''; } prev.classList.toggle('is-off', i===0); next.classList.toggle('is-off', i===slides.length-1); }
    show(0); prev.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); if(i>0) show(i-1); }); next.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); if(i<slides.length-1) show(i+1); });
    var drag=null; stage.querySelector('.p10-frame').addEventListener('pointerdown', function(ev){ if(ev.target.closest&&ev.target.closest('button')) return; drag={x:ev.clientX,y:ev.clientY}; });
    stage.querySelector('.p10-frame').addEventListener('pointerup', function(ev){ if(!drag) return; var dx=ev.clientX-drag.x, dy=ev.clientY-drag.y; drag=null; if(!one&&Math.abs(dx)>36&&Math.abs(dx)>Math.abs(dy)){ if(dx<0&&i<slides.length-1) show(i+1); else if(dx>0&&i>0) show(i-1); } else if(Math.abs(dx)<12&&Math.abs(dy)<12){ var pv=document.getElementById('p10-pv'); if(!pv){ pv=document.createElement('div'); pv.id='p10-pv'; pv.className='p10-pv'; pv.hidden=true; pv.innerHTML='<img alt=""><button type="button" class="p10-pv-x" aria-label="'+(zh?'关闭':'Close')+'">✕</button>'; document.body.appendChild(pv); pv.querySelector('button').addEventListener('click', function(){ pv.hidden=true; }); } var full=img.getAttribute('data-full')||img.currentSrc||img.src; pv.querySelector('img').src=full; pv.querySelector('img').alt=img.alt; pv.hidden=false; } });
    stage.addEventListener('click', function(ev){ ev.stopPropagation(); }); }
  li.dataset.p10='1'; li.classList.add('b-reg'); li.innerHTML=keep+'<h3 class="ev-name b-name p10-sr"></h3>'; li.querySelector('.ev-name').textContent=name; li.appendChild(info); if(stage) li.appendChild(stage); p10bar(name, li.dataset.id); try{ trad(); }catch(err){} }
function p10mount(){ var sg=document.getElementById('atm-single'); if(!sg) return false; var li=sg.querySelector('.ev-card.b-card'); if(!li) return false; if(li.dataset.kind==='event'&&li.dataset.oneoff!=='1') return false; if(li.dataset.p10) return true; if(!EV||!EV[li.dataset.id]) return false; p10(li, sg, EV[li.dataset.id]); return true; }
function single(){ var sg=document.getElementById('atm-single'); if(!sg) return; var li=sg.querySelector('.ev-card.b-card'); if(!li) return;
 var feat=li.dataset.kind==='event'&&li.dataset.oneoff!=='1'; li.classList.add(feat?'b-feat':'b-reg'); if(feat) return; p10mount(); }
function run(){document.querySelectorAll('.ev-card:not([data-b])').forEach(fix); trad(); single();}
new MutationObserver(function(){run()}).observe(document.documentElement,{childList:true,subtree:true}); run();
})();
