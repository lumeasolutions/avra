const CACHE_NAME = 'avra-v2';
// On ne cache QUE les assets statiques immuables (icons, manifest, offline page)
// Les bundles JS Next.js (/_next/static/) sont EXCLUS car ils changent à chaque déploiement
const PRECACHE = ['/manifest.json', '/offline.html', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // JAMAIS de cache pour les bundles JS/CSS Next.js — ils changent à chaque déploiement
  if (url.pathname.startsWith('/_next/')) return;

  // Cache First uniquement pour les icônes et assets vraiment statiques
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((resp) => {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return resp;
          })
      )
    );
    return;
  }

  // Network First pour toutes les pages — avec fallback offline
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match('/offline.html'))
    )
  );
});
