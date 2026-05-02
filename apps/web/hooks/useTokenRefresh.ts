'use client';

/**
 * useTokenRefresh — refresh proactif du JWT access token.
 *
 * Le token a une TTL de 60 min côté serveur. Pour éviter que l'utilisateur
 * voie une erreur "Unauthorized" en plein milieu d'une action, on déclenche
 * un refresh silencieux toutes les ~50 min.
 *
 * On refresh aussi à plusieurs moments stratégiques :
 *  - Au montage du layout authentifié (rattrape un token qui aurait expiré
 *    pendant que l'onglet était dormant).
 *  - Quand l'onglet redevient visible (visibilitychange).
 *  - Quand le réseau redevient en ligne.
 *
 * Pas de body : le backend lit refresh_token + user_id depuis les cookies
 * HttpOnly. Si le refresh échoue (cookies expirés / révoqués), on déconnecte
 * proprement et on redirige vers /login.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 min (le token vit 60 min)
const RETRY_BACKOFF_MS = 30 * 1000; // 30s si un refresh échoue ponctuellement

export function useTokenRefresh() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const lastAttemptRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated()) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function attemptRefresh(reason: string): Promise<boolean> {
      if (cancelled) return false;
      if (inFlightRef.current) return false;
      // Throttle : pas plus d'un essai toutes les 30s
      if (Date.now() - lastAttemptRef.current < RETRY_BACKOFF_MS) return false;
      inFlightRef.current = true;
      lastAttemptRef.current = Date.now();
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (cancelled) return false;
        if (!res.ok) {
          // 401 → refresh token expiré ou cookies absents → forcer logout
          if (res.status === 401) {
            console.warn(`[useTokenRefresh] refresh failed (401, ${reason}) — logging out`);
            logout();
            // Léger délai pour laisser le store se mettre à jour avant la redirection
            setTimeout(() => {
              if (typeof window !== 'undefined') router.replace('/login?reason=session-expired');
            }, 50);
            return false;
          }
          // Autres erreurs (500, réseau) → on retentera plus tard, pas de logout
          console.warn(`[useTokenRefresh] refresh transient error (${res.status}, ${reason})`);
          return false;
        }
        return true;
      } catch (err) {
        if (cancelled) return false;
        console.warn(`[useTokenRefresh] refresh network error (${reason}):`, err);
        return false;
      } finally {
        inFlightRef.current = false;
      }
    }

    // 1. Refresh au montage (sécurité après onglet dormant ou nav)
    void attemptRefresh('mount');

    // 2. Refresh périodique (toutes les 50 min)
    intervalId = setInterval(() => {
      void attemptRefresh('interval');
    }, REFRESH_INTERVAL_MS);

    // 3. Refresh quand l'onglet redevient visible (l'utilisateur revient
    //    après une longue pause — risque que le token ait expiré).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void attemptRefresh('visibility');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // 4. Refresh à la reprise du réseau.
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
}
