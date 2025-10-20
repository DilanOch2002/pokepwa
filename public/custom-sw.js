const CACHE_NAME = 'pokepwa-v1';
const API_CACHE_NAME = 'pokeapi-v1';

// Archivos para cachear inmediatamente
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/pokeball-192.png',
  '/pokeball-512.png'
];

// Usar 'this' en lugar de 'self' para evitar el warning de ESLint
const sw = this;

// Instalar - Cachear archivos estáticos
sw.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  sw.skipWaiting(); // Forzar activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cacheando archivos estáticos');
        return cache.addAll(STATIC_FILES);
      })
      .catch(error => {
        console.log('Error cacheando archivos:', error);
      })
  );
});

// Activar - Limpiar caches viejos
sw.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  sw.clients.claim(); // Tomar control inmediato de todas las pestañas
});

// Fetch - Interceptar peticiones
sw.addEventListener('fetch', (event) => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cachear peticiones a la API de Pokémon
  if (url.href.includes('pokeapi.co/api/v2/pokemon')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        // Primero intentar devolver del cache
        return cache.match(event.request).then((cachedResponse) => {
          // Si existe en cache, devolverlo
          if (cachedResponse) {
            console.log('Sirviendo desde cache:', event.request.url);
            return cachedResponse;
          }

          // Si no está en cache, hacer fetch y cachear
          return fetch(event.request)
            .then((response) => {
              // Solo cachear respuestas exitosas
              if (response.status === 200) {
                console.log('Cacheando nueva respuesta:', event.request.url);
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch((error) => {
              console.log('Error de conexión, no hay datos en cache');
              // Devolver una respuesta de error más útil
              return new Response(
                JSON.stringify({
                  error: 'No hay conexión a internet',
                  message: 'Los datos de Pokémon no están disponibles offline'
                }), {
                  status: 408,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        });
      })
    );
  } else {
    // Para archivos estáticos, estrategia Cache First
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Devolver del cache si existe
          if (response) {
            return response;
          }
          // Si no está en cache, hacer fetch
          return fetch(event.request);
        })
    );
  }
});