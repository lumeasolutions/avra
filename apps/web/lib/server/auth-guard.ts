/**
 * auth-guard.ts — Vérification d'authentification pour les routes API Next.js
 *
 * Vérifie la présence et la validité basique du cookie de session.
 * La vérification cryptographique complète de la signature JWT
 * est déléguée au backend NestJS (qui effectue cette validation à chaque appel API).
 */

import type { NextRequest } from 'next/server';

/**
 * Décode et valide un JWT (structure + expiration, pas la signature).
 * La signature est validée par le backend NestJS.
 */
function isJwtStructurallyValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Vérifier l'expiration
    if (payload.exp && typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec > payload.exp) return false;
    }

    // Exiger un sujet ou identifiant
    if (!payload.sub && !payload.id && !payload.userId) return false;

    return true;
  } catch {
    return false;
  }
}

// HIGH-002: only accept the legacy `logged_in` demo cookie when we are
// genuinely on a developer machine — never on Vercel previews/production.
const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development');

export function isAuthenticated(req: NextRequest): boolean {
  const accessToken = req.cookies.get('access_token')?.value;
  if (accessToken) {
    return isJwtStructurallyValid(accessToken);
  }
  if (IS_LOCAL_DEV) {
    const loggedIn = req.cookies.get('logged_in')?.value;
    return loggedIn === 'true';
  }
  return false;
}

/**
 * Extrait l'ID utilisateur depuis le JWT du cookie access_token.
 * Utilisé pour scoper les fichiers stockés (ex: ia-renders/<userId>/...).
 * Retourne null si le token est absent ou invalide.
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return (payload.sub ?? payload.id ?? payload.userId ?? null) || null;
  } catch {
    return null;
  }
}
