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

/**
 * Intervalle de refresh proactif. Doit rester STRICTEMENT inférieur à la TTL
 * du JWT (15 min côté backend, voir auth.module.ts). On prend 12 min pour
 * laisser une marge de 3 min — si le réseau est lent ou le serveur en cold
 * start, le refresh a le temps d'aboutir avant que le JWT n'expire.
 *
 * ⚠️ Si vous modifiez `expiresIn` dans auth.module.ts, mettez à jour cette
 *    constante en conséquence (REFRESH_INTERVAL_MS < JWT TTL - 2 min).
 */
const REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 min (JWT vit 15 min)
const RETRY_BACKOFF_MS = 30 * 1000; // 30s si un refresh échoue ponctuellement

export function useTokenRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const lastAttemptRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  // Throttle dédié pour les triggers "pathname change" : il faut être plus
  // tolérant que le throttle global (30s) car une navigation rapide entre 2
  // pages ne doit pas re-refresh. 5 min suffit : c'est largement en-deça des
  // 15 min du JWT, et ça absorbe les sequences de navigations rapprochées.
  const lastPathnameRefreshRef = useRef<number>(0);
  const PATHNAME_REFRESH_THROTTLE_MS = 5 * 60 * 1000;

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
        if (c