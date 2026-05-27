'use client';

/**
 * refreshLock.ts — coordination cross-tab pour /auth/refresh.
 *
 * PROBLÈME résolu (27/05/2026) : déconnexions intempestives en multi-onglets.
 *
 * Le backend rotate le refresh_token à chaque appel /auth/refresh : un seul
 * jti valide à la fois, donc 2 onglets qui appellent en parallèle = le 2e
 * échoue avec 401 → logout → user déconnecté sans raison.
 *
 * Solution :
 *   1. Lock cross-tab via localStorage timestamp : si un autre onglet vient
 *      de refresh (<10s), on saute notre propre refresh — le cookie
 *      access_token a été posé par l'autre onglet, on en bénéficie.
 *   2. Lock cross-tab via localStorage "refreshing" flag : si un refresh est
 *      déjà en cours sur un autre onglet, on attend qu'il finisse plutôt
 *      que de lancer le nôtre.
 *
 * Sécurité : localStorage est SAFE pour ce cas — on n'y stocke que des flags
 * d'état (pas de token). Le token reste dans les cookies HttpOnly.
 */

const KEY_LAST_REFRESH_AT = 'avra:refresh:lastSuccessAt';
const KEY_IN_FLIGHT = 'avra:refresh:inFlightAt';

/** Fenêtre de "récent" : si un refresh a réussi dans les X derniers ms, skip. */
const RECENT_WINDOW_MS = 10_000;
/** Durée max de validité d'un flag in-flight (stale lock). */
const STALE_LOCK_MS = 8_000;

/** Lit le timestamp du dernier refresh réussi (par n'importe quel onglet). */
export function getLastRefreshAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = localStorage.getItem(KEY_LAST_REFRESH_AT);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch { return 0; }
}

/** Lit le timestamp d'un refresh en cours (par n'importe quel onglet). */
export function getInFlightAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = localStorage.getItem(KEY_IN_FLIGHT);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch { return 0; }
}

/** True si un autre onglet a refresh dans les RECENT_WINDOW_MS dernières ms. */
export function wasRecentlyRefreshed(): boolean {
  return Date.now() - getLastRefreshAt() < RECENT_WINDOW_MS;
}

/** True si un autre onglet est en train de refresh (lock vivant). */
export function isAnotherTabRefreshing(): boolean {
  const at = getInFlightAt();
  if (at === 0) return false;
  // Si le lock est plus vieux que STALE_LOCK_MS, on le considère mort
  return Date.now() - at < STALE_LOCK_MS;
}

/** Acquiert le lock cross-tab. Retourne false si un autre onglet est déjà en cours. */
export function tryAcquireLock(): boolean {
  if (typeof window === 'undefined') return false;
  if (isAnotherTabRefreshing()) return false;
  try {
    localStorage.setItem(KEY_IN_FLIGHT, String(Date.now()));
    return true;
  } catch { return true; /* localStorage plein → on continue quand même */ }
}

/** Marque le refresh comme réussi (timestamp courant). */
export function markRefreshSuccess(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_LAST_REFRESH_AT, String(Date.now()));
    localStorage.removeItem(KEY_IN_FLIGHT);
  } catch { /* noop */ }
}

/** Libère le lock sans marquer succès (cas d'échec). */
export function releaseLock(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(KEY_IN_FLIGHT); } catch { /* noop */ }
}

/**
 * Attend qu'un refresh en cours sur un autre onglet se termine.
 * Polling de 200ms, abandon après timeout.
 */
export async function waitForOtherTabRefresh(timeoutMs = 6000): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isAnotherTabRefreshing()) {
      // Vérifier qu'il y a eu un succès récent
      return wasRecentlyRefreshed();
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}
