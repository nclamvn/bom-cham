// Bờm Chăm Family PWA — Service Worker
// Minimal offline support for static assets

const CACHE_NAME = 'bom-cham-family-v1';
const STATIC_ASSETS = [
  '/family/',
  '/family/app.js',
  '/family/styles.css',
  '/family/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for API/WebSocket, cache-first for static
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws')) {
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
