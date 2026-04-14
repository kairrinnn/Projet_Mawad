const CACHE_NAME = 'mawad-scan-v5'; // bump = purge tous les anciens caches
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
  // NOTE: '/' retiré — les pages HTML doivent toujours venir du réseau (new deployments)
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer ce qui n'est pas HTTP/HTTPS
  if (!request.url.startsWith('http')) return;

  // Navigation requests (HTML pages) — TOUJOURS Network First
  // Les pages HTML changent à chaque déploiement (nouveaux hash de chunks).
  // Les mettre en Cache First causerait des versions stale après déploiement.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Assets statiques hachés par Next.js (immuables, Cache First)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Images/fonts statiques (Cache First)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff2|ttf)$/) ||
    ASSETS_TO_CACHE.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // API et tout le reste — Network First, sans mise en cache
  event.respondWith(fetch(request));
});
