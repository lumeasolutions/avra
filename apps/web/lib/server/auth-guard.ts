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

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Retourne true si la requête est authentifiée.
 * Priorité : access_token (JWT HttpOnly) > logged_in (dev uniquement — mode démo).
 *
 * SÉCURITÉ : Le cookie `logged_in` n'est PAS HttpOnly et est trivialement
 * forgeable côté client. Il est donc REJETÉ en production pour éviter
 * de facturer des appels fal.ai / OpenAI à un attaquant non authentifié.
 */
export function isAuthenticated(req: NextRequest): boolean {
  const accessToken = req.cookies.get('access_token')?.value;
  if (accessToken) {
    return isJwtStructurallyValid(accessToken);
  }
  if (!IS_PRODUCTION) {
    const loggedIn = req.cookies.get('logged_in')?.value;
    return loggedIn === 'true';
  }
  return false;
}
