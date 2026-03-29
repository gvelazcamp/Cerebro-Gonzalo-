// Service Worker Chino Aventura - Force Update v15
var CACHE_NAME = 'chino-aventura-v10';
var urlsToCache = [
  '/Cerebro-Gonzalo-/chino_aventura.html',
  '/Cerebro-Gonzalo-/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(urlsToCache.map(function(url) {
        return fetch(new Request(url, {cache: 'no-cache'})).then(function(resp) {
          return cache.put(url, resp);
        });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  if (url.endsWith('.html') || url.endsWith('.json')) {
    event.respondWith(
      fetch(new Request(event.request, {cache: 'no-cache'})).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return response;
        });
      })
    );
  }
});
