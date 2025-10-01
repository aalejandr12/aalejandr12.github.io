// Minimal service worker for PWA installability and basic caching
const CACHE_NAME = 'purrcrafter-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/Icono/site.webmanifest',
  '/Icono/favicon.ico',
  '/Icono/favicon-96x96.png',
  '/Icono/apple-touch-icon.png',
  '/Icono/web-app-manifest-192x192.png',
  '/Icono/web-app-manifest-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
      return resp;
    }).catch(() => cached))
  );
});
