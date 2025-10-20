/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'pokepwa-cache-v3';
const API_CACHE_NAME = 'pokeapi-cache-v3';

// Solo archivos esenciales que siempre existen
const STATIC_FILES = [
  '/',
  '/manifest.json'
];

// Instalar
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalándose...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando archivos esenciales...');
        return cache.add('/');
      })
      .then(() => {
        console.log('✅ Service Worker instalado correctamente');
      })
      .catch((error) => {
        console.log('⚠️ Error cacheando, pero continuamos:', error);
      })
  );
});

// Activar
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ACTIVADO!');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  if (event.request.method !== 'GET') return;

  // PARA API POKÉMON
  if (url.includes('pokeapi.co/api/v2/pokemon')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE_NAME);
        
        try {
          // 1. Intentar red primero
          console.log('🌐 Intentando red para API...');
          const response = await fetch(event.request);
          
          // 2. Si funciona, guardar en cache
          if (response.status === 200) {
            console.log('💾 Guardando respuesta API en cache');
            cache.put(event.request, response.clone());
          }
          
          return response;
        } catch (error) {
          // 3. Si falla la red, usar cache
          console.log('📡 Sin conexión, buscando en cache...');
          const cached = await cache.match(event.request);
          
          if (cached) {
            console.log('✅ Sirviendo desde cache OFFLINE');
            return cached;
          }
          
          // 4. Si no hay cache, error
          console.log('❌ No hay datos cacheados');
          return new Response(
            JSON.stringify({ 
              error: 'offline',
              message: 'Conéctate a internet para cargar Pokémon' 
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // Para todo lo demás - Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request);
    })
  );
});