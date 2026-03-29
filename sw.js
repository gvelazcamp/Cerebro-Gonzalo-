// Service Worker Chino Aventura - Auto-update ROBUSTO
// Verifica cambios descargando el archivo HTML y comparando hash

const GITHUB_REPO = 'gvelazcamp/Cerebro-Gonzalo-';
const GITHUB_RAW = 'https://raw.githubusercontent.com/' + GITHUB_REPO + '/main';
const MAIN_FILE = 'chino_aventura.html';

// Función para obtener hash SHA-256
async function hashFile(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verificar actualizaciones descargando el archivo real
async function checkUpdates() {
  try {
    console.log('🔍 Verificando actualizaciones en GitHub...');
    
    // Descargar el archivo actual de GitHub
    const url = GITHUB_RAW + '/' + MAIN_FILE + '?t=' + Date.now();
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.log('⚠️ No se pudo descargar de GitHub:', response.status);
      return;
    }
    
    const newContent = await response.text();
    const newHash = await hashFile(newContent);
    
    // Comparar con hash almacenado
    const cacheKey = 'ca-file-hash';
    const oldHash = localStorage?.getItem?.(cacheKey);
    
    if (oldHash && oldHash !== newHash) {
      console.log('✅ ACTUALIZACIÓN DETECTADA');
      console.log('  Viejo hash:', oldHash.substring(0, 8));
      console.log('  Nuevo hash:', newHash.substring(0, 8));
      
      // Guardar nuevo hash
      localStorage?.setItem?.(cacheKey, newHash);
      
      // Limpiar TODOS los caches
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
        console.log('🗑️ Cache eliminado:', key);
      }
      
      // Notificar a todos los clientes
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          message: '⬇️ Actualización disponible - recargando...'
        });
      });
      
      // Recargar el SW
      self.registration.unregister();
      
    } else if (!oldHash) {
      // Primera vez, guardar el hash
      localStorage?.setItem?.(cacheKey, newHash);
      console.log('✅ Primer check - hash guardado:', newHash.substring(0, 8));
    } else {
      console.log('✅ Sin cambios -', newHash.substring(0, 8));
    }
    
  } catch (e) {
    console.log('⚠️ Error verificando actualizaciones:', e.message);
  }
}

// Verificar cada vez que se instala
self.addEventListener('install', event => {
  console.log('🔧 Instalando SW...');
  self.skipWaiting();
  
  event.waitUntil(
    (async () => {
      const CACHE_NAME = 'chino-aventura-cache';
      const cache = await caches.open(CACHE_NAME);
      
      // Precachear archivo principal
      try {
        const response = await fetch(GITHUB_RAW + '/' + MAIN_FILE + '?t=' + Date.now());
        if (response.ok) {
          await cache.put(MAIN_FILE, response.clone());
          console.log('✓ Archivo principal en cache');
        }
      } catch (e) {
        console.log('⚠️ No se pudo cachear archivo principal:', e.message);
      }
      
      // Primer check
      await checkUpdates();
    })()
  );
});

// Activar inmediatamente
self.addEventListener('activate', event => {
  console.log('🚀 Activando SW...');
  event.waitUntil(self.clients.claim());
});

// Estrategia: Network-first (intentar red primero)
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Solo GET
  if (request.method !== 'GET') return;
  
  event.respondWith(
    (async () => {
      try {
        // 1. Intentar red
        const networkResponse = await fetch(request, { 
          cache: 'no-store',
          timeout: 5000 
        });
        
        // 2. Si éxito, cachear y retornar
        if (networkResponse && networkResponse.status === 200) {
          const CACHE_NAME = 'chino-aventura-cache';
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
        
        // 3. Si error de red pero tenemos cache, usar cache
        const cachedResponse = await caches.match(request);
        return cachedResponse || networkResponse;
        
      } catch (e) {
        // 4. Si error total, usar cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('📦 Usando cache (offline):', request.url);
          return cachedResponse;
        }
        
        // 5. Sin cache, error
        return new Response('Offline - sin conexión', { status: 503 });
      }
    })()
  );
});

// Escuchar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_UPDATES') {
    console.log('📨 Check manual solicitado');
    checkUpdates();
  }
});

// Verificar actualizaciones cada 5 minutos (agresivo)
setInterval(checkUpdates, 5 * 60 * 1000);
