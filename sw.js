// Service Worker Chino Aventura v17
var CACHE_NAME = 'chino-aventura-v12';
var urlsToCache = [
  '/Cerebro-Gonzalo-/chino_aventura.html',
  '/Cerebro-Gonzalo-/manifest.json'
];
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(urlsToCache.map(function(url) {
        return fetch(new Request(url, {cache: 'no-cache'})).then(function(r){ return cache.put(url, r); });
      }));
    })
  );
  self.skipWaiting();
});
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});
self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  if (url.endsWith('.html') || url.endsWith('.json')) {
    event.respondWith(
      fetch(new Request(event.request, {cache: 'no-cache'})).then(function(r) {
        caches.open(CACHE_NAME).then(function(c){ c.put(event.request, r.clone()); });
        return r;
      }).catch(function(){ return caches.match(event.request); })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(r) {
          caches.open(CACHE_NAME).then(function(c){ c.put(event.request, r.clone()); });
          return r;
        });
      })
    );
  }
});