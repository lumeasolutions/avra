'use client';
import { useEffect } from 'react';

/**
 * 29/04/2026 — Kill-switch transitoire.
 *
 * Les anciennes versions du SW (avra-v1 / avra-v2) cachaient des HTMLs avec
 * une CSP "nonce + unsafe-inline" cassée par Chrome CSP3, provoquant des
 * pages blanches après le hotfix CSP. On ne réenregistre plus de SW : à la
 * place on désinscrit tout SW existant côté client et on supprime tous les
 * caches Cache Storage. Le `/sw.js` côté serveur fait pareil de son côté
 * (kill-switch, voir public/sw.js).
 *
 * Quand on voudra réintroduire une PWA, repartir d'un nom de SW différent
 * (ex: /sw-v4.js) et réintroduire l'enregistrement ici. Tant que ce
 * composant unregister, aucun nouveau visiteur ne peut accumuler de SW.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    (async () => {
      try {
        // 1) Désinscrit tous les SW déjà enregistrés sur cette origine.
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));

        // 2) Vide tous les caches Cache Storage (clés inconnues incluses).
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
        }
      } catch (err) {
        // Best effort — ne casse jamais l'app si l'API SW est indisponible.
        // eslint-disable-next-line no-console
        console.warn('[SW kill-switch] cleanup failed:', err);
      }
    })();
  }, []);

  return null;
}
