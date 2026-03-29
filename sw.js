// Service Worker Chino Aventura - Audio Fix v5
var CACHE_NAME = 'chino-aventura-v5-audio-fix';
var urlsToCache = [
  '/Cerebro-Gonzalo-/chino_aventura.html',
  '/Cerebro-Gonzalo-/manifest.json'
];

self.addEventListener('install', function(event) {
  console.log('SW Install v5');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('SW Activate v5 - cleaning old caches');
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { 
               console.log('Deleting cache:', name);
               return caches.delete(name); 
             })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, clone);
      });
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});
