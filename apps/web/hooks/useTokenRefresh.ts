'use client';

/**
 * useTokenRefresh — refresh proactif du JWT access token.
 *
 * Le JWT access token a une TTL de **15 minutes** côté serveur
 * (voir `apps/api/src/modules/auth/auth.module.ts: expiresIn: '15m'`).
 * Pour éviter que l'utilisateur voie une erreur "Unauthorized" — ou pire,
 * soit éjecté vers /login par le middleware Edge qui décode le `exp` du JWT —
 * on déclenche un refresh silencieux **toutes les 12 minutes** (marge de 3 min
 * avant l'expiration).
 *
 * On refresh aussi à plusieurs moments stratégiques :
 *  - Au montage du layout authentifié (rattrape un token qui aurait expiré
 *    pendant que l'onglet était dormant).
 *  - Quand l'onglet redevient visible (visibilitychange).
 *  - Quand le réseau redevient en ligne.
 *  - Sur chaque changement de pathname (filet supplémentaire pour les
 *    navigations Next.js — voir AUDIT_AUTH_REFRESH du 26/05/2026).
 *
 * Pas de body : le backend lit refresh_token + user_id depuis les cookies
 * HttpOnly. Si le refresh échoue (cookies expirés / révoqués), on déconnecte
 * proprement et on redirige vers /login.
 */

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import {
  wasRecentlyRefreshed, isAnotherTabRefreshing,
  tryAcquireLock, markRefreshSuccess, releaseLock,
  waitForOtherTabRefresh,
} from '@/lib/refreshLock';

const REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 min (JWT vit 15 min)
const RETRY_BACKOFF_MS = 30 * 1000;
const PATHNAME_REFRESH_THROTTLE_MS = 5 * 60 * 1000;

export function useTokenRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const lastAttemptRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  const lastPathnameRefreshRef = useRef<number>(0);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated()) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function attemptRefresh(reason: string): Promise<boolean> {
      if (cancelled) return false;
      if (inFlightRef.current) return false;
      if (Date.now() - lastAttemptRef.current < RETRY_BACKOFF_MS) return false;

      // ── CROSS-TAB DEDUPLICATION (27/05/2026) ─────────────────────────
      // Un autre onglet a deja rafraichi recemment → notre cookie est deja
      // a jour, on saute pour eviter une rotation inutile (qui invalide
      // le token de l'autre onglet → 401 → logout en cascade).
      if (wasRecentlyRefreshed()) {
        return true;
      }
      // Un autre onglet est en train de rafraichir → on attend son resultat
      // au lieu de lancer le notre en parallele (race condition garantie).
      if (isAnotherTabRefreshing()) {
        const ok = await waitForOtherTabRefresh();
        return ok;
      }
      // On essaie d'acquerir le lock cross-tab. Si ca echoue (un autre tab
      // est passe devant nous), on attend son resultat.
      if (!tryAcquireLock()) {
        const ok = await waitForOtherTabRefresh();
        return ok;
      }

      inFlightRef.current = true;
      lastAttemptRef.current = Date.now();
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (cancelled) { releaseLock(); return false; }
        if (!res.ok) {
          if (res.status === 401) {
            // ── RETRY RESILIENT (27/05/2026) ───────────────────────────
            // Avant de logout, on retente 1 fois apres 2s. Raison : une
            // race condition transitoire (rotation token chevauchee) peut
            // causer un 401 ponctuel, alors que la session est encore
            // valide. On ne deconnecte qu'apres 2 echecs consecutifs.
            console.warn(`[useTokenRefresh] refresh 401 (${reason}) — retry in 2s before logout`);
            releaseLock();
            await new Promise((r) => setTimeout(r, 2000));
            if (cancelled) return false;

            // Le retry beneficie d'eventuels refresh fait par autres onglets
            if (wasRecentlyRefreshed()) {
              return true;
            }
            // Sinon on retente nous-meme
            const retry = await fetch('/api/v1/auth/refresh', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            if (retry.ok) {
              markRefreshSuccess();
              return true;
            }
            // Apres 2 echecs, on accepte le verdict : session morte
            console.warn(`[useTokenRefresh] refresh definitivement KO (${reason}) — logging out`);
            logout();
            setTimeout(() => {
              if (typeof window !== 'undefined') router.replace('/login?reason=session-expired');
            }, 50);
            return false;
          }
          console.warn(`[useTokenRefresh] refresh transient error (${res.status}, ${reason})`);
          releaseLock();
          return false;
        }
        markRefreshSuccess();
        return true;
      } catch (err) {
        if (cancelled) return false;
        console.warn(`[useTokenRefresh] refresh network error (${reason}):`, err);
        releaseLock();
        return false;
      } finally {
        inFlightRef.current = false;
      }
    }

    void attemptRefresh('mount');

    intervalId = setInterval(() => {
      void attemptRefresh('interval');
    }, REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void attemptRefresh('visibility');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onOnline = () => { void attemptRefresh('online'); };
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated()) return;
    if (!pathname) return;
    const now = Date.now();
    if (now - lastPathnameRefreshRef.current < PATHNAME_REFRESH_THROTTLE_MS) return;
    if (inFlightRef.current) return;
    // Cross-tab : si refresh recent ou en cours ailleurs, on saute
    if (wasRecentlyRefreshed() || isAnotherTabRefreshing()) {
      lastPathnameRefreshRef.current = now;
      return;
    }
    if (!tryAcquireLock()) return;
    lastPathnameRefreshRef.current = now;
    lastAttemptRef.current = now;
    inFlightRef.current = true;
    void (async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          markRefreshSuccess();
        } else if (res.status === 401) {
          // Retry resilient avant logout (cf. attemptRefresh principal)
          releaseLock();
          await new Promise((r) => setTimeout(r, 2000));
          if (wasRecentlyRefreshed()) return; // un autre onglet l'a fait
          const retry = await fetch('/api/v1/auth/refresh', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (retry.ok) { markRefreshSuccess(); return; }
          console.warn('[useTokenRefresh] refresh definitivement KO (pathname) — logging out');
          logout();
          setTimeout(() => {
            if (typeof window !== 'undefined') router.replace('/login?reason=session-expired');
          }, 50);
        } else {
          releaseLock();
        }
      } catch {
        releaseLock();
        // Le mécanisme réactif d'api.ts prendra le relais.
      } finally {
        inFlightRef.current = false;
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hasHydrated]);
}
