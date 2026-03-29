// Service Worker Chino Aventura v18
var CACHE_NAME = 'chino-aventura-v18';
var urlsToCache = [
  '/Cerebro-Gonzalo-/chino_aventura.html',
  '/Cerebro-Gonzalo-/manifest.json'
];
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(urlsToCache.map(function(url) {
        return fetch(url + '?_=' + Date.now(), {cache: 'no-store'}).then(function(r){ return cache.put(url, r); }).catch(function(){});
      }));
    })
  );
});
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n){ if(n !== CACHE_NAME) return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, {cache: 'no-store'}).then(function(r) {
      if(r && r.status === 200){
        var rc = r.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(event.request, rc); });
      }
      return r;
    }).catch(function(){ return caches.match(event.request); })
  );
});
