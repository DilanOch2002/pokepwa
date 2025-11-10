/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'pokepwa-final-v1';
const API_CACHE_NAME = 'pokeapi-final-v1';

// Cachear TODO lo necesario
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/pokeball-192.png',
  '/pokeball-512.png'
];

// Instalar - Cache AGGRESIVO
self.addEventListener('install', (event) => {
  console.log('🚀 INSTALANDO Service Worker...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando archivos críticos...');
        // Intentar cachear todo, pero si falla uno, continuar
        return Promise.allSettled(
          STATIC_FILES.map(url => 
            cache.add(url).catch(err => 
              console.log('⚠️ No se pudo cachear:', url, err)
            )
          )
        );
      })
      .then(() => {
        console.log('✅ Instalación completada');
      })
  );
});

// Activar
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ACTIVADO!');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          // eslint-disable-next-line array-callback-return
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Eliminando cache viejo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Estrategia: CACHE PRIMERO para TODO
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // No cachear solicitudes que no sean GET
  if (event.request.method !== 'GET') return;

  console.log('🔄 Interceptando:', url);

  event.respondWith(
    (async () => {
      // PARA LA API DE POKÉMON
      if (url.includes('pokeapi.co/api/v2/pokemon')) {
        const apiCache = await caches.open(API_CACHE_NAME);
        
        // 1. PRIMERO buscar en cache
        const cachedResponse = await apiCache.match(event.request);
        if (cachedResponse) {
          console.log('✅ Sirviendo API desde cache:', url);
          return cachedResponse;
        }

        // 2. Si no está en cache, intentar red
        try {
          console.log('🌐 Intentando red para API...');
          const networkResponse = await fetch(event.request);
          
          if (networkResponse.ok) {
            console.log('💾 Guardando en cache API:', url);
            apiCache.put(event.request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          console.log('❌ Error de red para API');
          // Devolver respuesta de error útil
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'No hay conexión a internet'
            }),
            {
              status: 200, // Usar 200 para que React no falle
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // PARA ARCHIVOS ESTÁTICOS - SIEMPRE CACHE PRIMERO
      const staticCache = await caches.open(CACHE_NAME);
      const cachedStatic = await staticCache.match(event.request);
      
      if (cachedStatic) {
        console.log('📁 Sirviendo estático desde cache:', url);
        return cachedStatic;
      }

      // Si no está en cache, intentar red
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          staticCache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        console.log('❌ Error cargando:', url);
        // Para la raíz, devolver el index.html cachead
        if (url === self.location.origin + '/') {
          return staticCache.match('/');
        }
        return new Response('Offline - Sin conexión', { status: 200 });
      }
    })()
  );
});

// Cachear datos iniciales automáticamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_POKEMON') {
    caches.open(API_CACHE_NAME).then(cache => {
      cache.add('https://pokeapi.co/api/v2/pokemon?limit=1000');
    });
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification("Pokédex actualizada", {
      body: event.data.body || "Nuevo Pokémon consultado",
      icon: "/pokeball-192.png",
      badge: "/pokeball-192.png",
      vibrate: [200, 100, 200],
      tag: "poke-notify"
    });
  }
});
