/* Asia Tango Map service worker: web push, plus (2026-11-19) a cache for files with ?v= (see the fetch handler at the end). */
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

/* 2026-11-19 (speed on mobile data, Shiao): cache versioned files (?v=...) so a second visit does not ask the server ~30 times.
   - Page HTML is never cached here: it always comes from the network, so new ?v= numbers arrive as before.
   - JS / CSS with ?v=: cache first (a new version has a new ?v=, so it is a new URL).
   - Event JSON and images with ?v=: show the cached copy at once, refresh it in the background (same-name images can change).
   - Older copies of the same file (same path, other ?v=) are dropped when a new one is stored. */
var ATM_CACHE = 'atm-v1';
var ATM_HOSTS = [self.location.origin, 'https://data.tangoweekend.org'];
function atmKind(u) {
  if (ATM_HOSTS.indexOf(u.origin) < 0 || !u.searchParams.has('v')) return '';
  if (/\.(js|css)$/i.test(u.pathname)) return 'first';
  if (/\.(json|webp|jpe?g|png|svg)$/i.test(u.pathname)) return 'swr';
  return '';
}
function atmPut(cache, req, res) {
  if (!res || !res.ok || (res.type !== 'basic' && res.type !== 'cors')) return Promise.resolve();
  var u = new URL(req.url);
  return cache.put(req, res).then(function () {
    return cache.keys().then(function (keys) {
      var dels = [];
      keys.forEach(function (k) { var ku = new URL(k.url); if (ku.origin === u.origin && ku.pathname === u.pathname && ku.search !== u.search) dels.push(cache.delete(k)); });
      if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(function (k) { dels.push(cache.delete(k)); });
      return Promise.all(dels);
    });
  }).catch(function () {});
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.mode === 'navigate') return;
  var u; try { u = new URL(req.url); } catch (x) { return; }
  var kind = atmKind(u); if (!kind) return;
  e.respondWith(caches.open(ATM_CACHE).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { var copy = res.clone(); e.waitUntil(atmPut(cache, req, copy)); return res; });
      if (hit) { if (kind === 'swr') e.waitUntil(net.catch(function () {})); return hit; }
      return net;
    });
  }).catch(function () { return fetch(req); }));
});
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^atm-/.test(k) && k !== ATM_CACHE; }).map(function (k) { return caches.delete(k); })); })); });
