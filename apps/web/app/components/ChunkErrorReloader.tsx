'use client';

import { useEffect } from 'react';

/**
 * 29/04/2026 — Auto-reload sur chunk JS introuvable (post-deploy).
 *
 * Symptôme classique après un nouveau build Vercel :
 *   Failed to load resource: /_next/static/chunks/XXXX.js (404)
 *   Refused to execute script ... because its MIME type ('text/plain') is not executable
 *
 * Cause : le HTML servi (cache HTTP/CDN ou SSR rendu juste avant le swap)
 * référence un chunk d'un build précédent que Vercel a supprimé. Sans
 * intervention l'utilisateur voit une page blanche tant qu'il ne fait pas
 * un hard reload.
 *
 * Comportement de ce composant :
 *  - Écoute window.error et unhandledrejection
 *  - Si le message contient "Loading chunk", "ChunkLoadError", "MIME type",
 *    ou un échec de fetch sur /_next/static/chunks/, on déclenche un reload
 *    (forçage côté navigateur via location.reload).
 *  - Un flag sessionStorage évite la boucle infinie (max 1 reload par session).
 */
export default function ChunkErrorReloader() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const RELOAD_FLAG = 'avra_chunk_reloaded_at';
    const RELOAD_WINDOW_MS = 60_000; // ne pas reload plus d'une fois par minute

    const shouldReload = (): boolean => {
      try {
        const last = sessionStorage.getItem(RELOAD_FLAG);
        if (!last) return true;
        const lastMs = parseInt(last, 10);
        if (Number.isNaN(lastMs)) return true;
        return Date.now() - lastMs > RELOAD_WINDOW_MS;
      } catch {
        return true;
      }
    };

    const triggerReload = (reason: string) => {
      if (!shouldReload()) {
        // eslint-disable-next-line no-console
        console.warn('[chunk-reloader] skip reload (cooldown):', reason);
        return;
      }
      try {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      } catch {
        /* ignore */
      }
      // eslint-disable-next-line no-console
      console.warn('[chunk-reloader] reloading because:', reason);
      // location.reload() bypass partiellement le cache. Pour être sûr,
      // on passe par une URL avec un cache-buster côté query.
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', String(Date.now()));
      window.location.replace(url.toString());
    };

    const isChunkError = (msg: string | undefined | null): boolean => {
      if (!msg) return false;
      const m = msg.toLowerCase();
      return (
        m.includes('loading chunk') ||
        m.includes('chunkloaderror') ||
        m.includes("mime type ('text/plain')") ||
        m.includes('failed to fetch dynamically imported module') ||
        m.includes('refused to execute script') ||
        (m.includes('/_next/static/chunks/') && m.includes('404'))
      );
    };

    const onError = (event: ErrorEvent) => {
      // a) Chunk JS qui n'a pas pu être chargé (script tag) — event.target est
      //    l'élément script avec un src commençant par /_next/static/chunks/
      const target = event.target as HTMLElement | null;
      if (target && target instanceof HTMLScriptElement) {
        const src = target.src ?? '';
        if (src.includes('/_next/static/chunks/')) {
          triggerReload(`script 404: ${src}`);
          return;
        }
      }
      // b) Erreur runtime : Loading chunk N failed / ChunkLoadError
      if (isChunkError(event.message)) {
        triggerReload(`runtime: ${event.message}`);
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message;
      if (isChunkError(msg)) {
        triggerReload(`rejection: ${msg}`);
      }
    };

    // Capture phase pour attraper les erreurs de chargement de <script>
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
