// Service worker: network-first for navigations (index.html) so users get fresh HTML,
// cache-first (with background update) for other GET assets. Cache name bumped to v2
// when you change core assets or HTML structure increment this version again.
const CACHE_NAME = 'purrcrafter-v2';
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
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Helper: simple network fetch with timeout
function fetchWithTimeout(request, ms = 8000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then((resp) => {
      clearTimeout(timeout);
      resolve(resp);
    }, (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Treat navigations (HTML pages) with network-first strategy so index.html updates.
  const acceptHeader = req.headers.get('accept') || '';
  const isNavigation = req.mode === 'navigate' || acceptHeader.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetchWithTimeout(req, 8000).then((networkResp) => {
        // Update the cache with fresh HTML
        const copy = networkResp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
        return networkResp;
      }).catch(() => {
        // Fallback to cache if network fails
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For other assets: try cache first, but also attempt network update in background
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((resp) => {
        // Only cache valid responses
        if (!resp || resp.status !== 200) return resp;
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => null);

      // Serve cached if available immediately, otherwise wait for network
      return cached || networkFetch;
    })
  );
});

// Allow page to trigger skipWaiting (useful when you detect update and want immediate activation)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
