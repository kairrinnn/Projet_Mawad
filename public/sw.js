const CACHE_NAME = 'mawad-scan-v3-optimized'; // On passe en v3
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
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

  // 1. Ignorer ce qui n'est pas HTTP/HTTPS (extensions, etc.)
  if (!request.url.startsWith('http')) return;

  // 2. Stratégie pour les assets statiques (JS, CSS, Images internes)
  // Cache First pour une vitesse maximale sur les ressources qui ne changent pas (hachées par Next.js)
  if (
    url.pathname.startsWith('/_next/static/') || 
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff2|ttf)$/) ||
    url.origin === self.location.origin && ASSETS_TO_CACHE.includes(url.pathname)
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

  // 3. Stratégie pour la Navigation et les APIs (Network First)
  // On priorise le réseau pour avoir les données fraîches, mais on répond instantanément via le cache si ça échoue.
  event.respondWith(
    fetch(request).then((networkResponse) => {
      if (networkResponse.status === 200) {
        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
      }
      return networkResponse;
    }).catch(() => caches.match(request))
  );
});
