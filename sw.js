// Service Worker Chino Aventura - Auto-update from Git
// Verifica cambios en el repo cada 6 horas y se actualiza automáticamente

const GITHUB_REPO = 'gvelazcamp/Cerebro-Gonzalo-';
const GITHUB_RAW = 'https://raw.githubusercontent.com/' + GITHUB_REPO + '/main';
const FILES_TO_MONITOR = [
  'chino_aventura.html',
  'manifest.json'
];

let CACHE_VERSION = 'v1'; // Se actualiza dinámicamente con hash

// Hash simple para versioning
async function computeHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
}

// Verificar cambios en GitHub
async function checkForUpdates() {
  try {
    let latestHash = '';
    
    for (const file of FILES_TO_MONITOR) {
      try {
        const response = await fetch(GITHUB_RAW + '/' + file + '?_=' + Date.now(), {
          cache: 'no-store',
          method: 'HEAD'
        });
        
        if (response.ok) {
          const lastModified = response.headers.get('last-modified');
          const etag = response.headers.get('etag');
          latestHash += (etag || lastModified || file);
        }
      } catch (e) {
        console.log('Check file:', file, e.message);
      }
    }
    
    if (latestHash) {
      const newVersion = await computeHash(latestHash);
      const storedVersion = await self.registration.scope 
        ? localStorage?.getItem?.('ca-version') 
        : newVersion;
      
      if (storedVersion && storedVersion !== newVersion) {
        console.log('🔄 Cambios detectados en Git - actualizando...');
        // Notificar a todos los clientes que actualicen
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'UPDATE_AVAILABLE',
              version: newVersion,
              message: '⬇️ Nueva versión disponible - actualizando...'
            });
          });
        });
        
        // Limpiar cache e instalación
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        
        CACHE_VERSION = 'v-' + newVersion;
      }
    }
  } catch (e) {
    console.log('Update check error:', e);
  }
}

// Verificar actualizaciones cada 6 horas
setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
checkForUpdates();

// ─── INSTALL ───
self.addEventListener('install', event => {
  console.log('🔧 Installing SW...');
  self.skipWaiting();
  
  event.waitUntil(
    (async () => {
      const CACHE_NAME = 'chino-aventura-' + CACHE_VERSION;
      const cache = await caches.open(CACHE_NAME);
      
      // Descargar archivos principales
      for (const file of FILES_TO_MONITOR) {
        try {
          const url = GITHUB_RAW + '/' + file;
          const response = await fetch(url + '?_=' + Date.now(), {
            cache: 'no-store'
          });
          if (response.ok) {
            await cache.put(file, response.clone());
            console.log('✓ Cached:', file);
          }
        } catch (e) {
          console.log('Cache file error:', file, e.message);
        }
      }
    })()
  );
});

// ─── ACTIVATE ───
self.addEventListener('activate', event => {
  console.log('🚀 Activating SW...');
  
  event.waitUntil(
    (async () => {
      // Limpiar caches viejos
      const keys = await caches.keys();
      const oldCaches = keys.filter(k => 
        !k.includes(CACHE_VERSION) && k.startsWith('chino-aventura-')
      );
      
      await Promise.all(oldCaches.map(async (k) => {
        console.log('🗑 Cleaning old cache:', k);
        return caches.delete(k);
      }));
      
      // Tomar control de clientes inmediatamente
      return self.clients.claim();
    })()
  );
});

// ─── FETCH ───
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Solo GET
  if (request.method !== 'GET') return;
  
  // Ignorar solicitudes externas (apis, CDN, etc)
  if (!request.url.includes(self.location.origin) && 
      !request.url.includes('raw.githubusercontent.com')) {
    return;
  }
  
  event.respondWith(
    (async () => {
      const CACHE_NAME = 'chino-aventura-' + CACHE_VERSION;
      
      try {
        // 1. Intentar red primero (offline-first para contenido dinámico)
        const networkResponse = await fetch(request, {
          cache: 'no-store'
        });
        
        if (networkResponse && networkResponse.status === 200) {
          // Guardar en cache para offline
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (e) {
        // 2. Si error de red, usar cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('📦 Using cache for:', request.url);
          return cachedResponse;
        }
        
        // 3. Fallback a página de error offline
        return new Response('Offline - sin conexión', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// ─── MESSAGE HANDLER para comunicación con cliente ───
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATES') {
    checkForUpdates();
  }
});

// ─── PERIODIC BACKGROUND SYNC (opcional, si el navegador lo soporta) ───
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'check-updates') {
      event.waitUntil(checkForUpdates());
    }
  });
}
