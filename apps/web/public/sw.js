// avra-sw v3 — KILL SWITCH (29/04/2026)
//
// Tous les visiteurs qui ont un ancien service worker enregistré (versions
// avra-v1, avra-v2) servaient en cache des HTMLs avec une CSP cassée
// ("nonce + unsafe-inline" → bloquée par Chrome CSP3) → page blanche.
//
// Cette version 3 ne fait RIEN d'utile : à l'installation elle se désinscrit
// elle-même, supprime tous ses caches, et force chaque onglet ouvert à
// recharger. Au prochain visit le browser ne trouve plus de SW enregistré
// (ServiceWorkerRegistration côté client appelle unregister maintenant), donc
// il fetch directement le serveur qui renvoie la bonne CSP.
//
// Si on veut réintroduire un SW PWA plus tard, repartir d'une nouvelle
// version (avra-v4+) après confirmation que tous les clients ont bien
// été nettoyés.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1) Vide TOUS les caches (peu importe leur nom).
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // 2) Désinscrit ce service worker.
      try {
        await self.registration.unregister();
      } catch (_) {
        /* ignore */
      }

      // 3) Recharge tous les onglets ouverts pour qu'ils repartent sans SW.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch (_) {
          /* certains navigateurs refusent navigate() — pas grave, le user
             aura juste à recharger une fois manuellement */
        }
      }
    })(),
  );
});

// Pendant le tout petit laps entre activate et reload, on laisse passer
// les requêtes telles quelles (network only) pour ne RIEN cacher.
self.addEventListener('fetch', () => {
  /* no-op — pas de respondWith → le browser fait son fetch standard */
});
