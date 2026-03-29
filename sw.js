// Service Worker Chino Aventura v19
const CACHE_NAME = 'chino-aventura-v19';
const GITHUB_RAW = 'https://raw.githubusercontent.com/gvelazcamp/Cerebro-Gonzalo-/main';
const MAIN_FILE = 'chino_aventura.html';

self.addEventListener('install', event => {
  console.log('[SW] Installing v19...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([MAIN_FILE]).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating v19...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, {cache:'no-store'})
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request)
        .then(cached => cached || new Response('Sin conexión', {status:503}))
      )
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
