/* Asia Tango Map service worker: web push only. No fetch handler on purpose, so HTTP caching and ?v= cache-busting work exactly as before. */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function(e){
  var d={}; try{ d=e.data?e.data.json():{}; }catch(err){ d={title:e.data&&e.data.text()}; }
  var title=d.title||'Asia Tango Map';
  e.waitUntil(self.registration.showNotification(title,{ body:d.body||'', tag:d.tag||undefined, renotify:!!d.tag, icon:'/icons/icon-192.png', badge:'/icons/badge-72.png', data:{url:d.url||'/asia/'} }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close(); var url=(e.notification.data&&e.notification.data.url)||'/asia/';
  try{ var u=new URL(url, self.location.origin); if(!/(^|\.)tangoweekend\.org$/.test(u.hostname)&&u.origin!==self.location.origin) url='/asia/'; }catch(err){ url='/asia/'; }
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){ for(var i=0;i<cs.length;i++){ if('navigate' in cs[i]){ return cs[i].navigate(url).then(function(c){ return c&&c.focus(); }); } } return self.clients.openWindow(url); }));
});
