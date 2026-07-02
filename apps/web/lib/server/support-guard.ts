/**
 * support-guard.ts — Contrôle d'accès au portail SUPPORT (/support et /api/support/*)
 *
 * Réservé STRICTEMENT aux deux comptes fondateurs. La vérification se fait
 * côté serveur sur l'email du JWT (signature HS256 vérifiée via jwt-verify),
 * impossible à contourner en devinant l'URL ou en forgeant un cookie.
 *
 * Liste blanche : variable d'env SUPPORT_ADMIN_EMAILS (séparée par des virgules)
 * avec un FALLBACK codé en dur sur les deux emails réels — ainsi le portail
 * fonctionne dès le déploiement sans dépendre d'une config Vercel, tout en
 * restant surchargeable plus tard via l'env.
 */

import type { NextRequest } from 'next/server';
import { getVerifiedClaims } from './jwt-verify';

type SupportCheckResult = { ok: true; email: string } | { ok: false };

/**
 * Emails autorisés par défaut (les deux comptes fondateurs).
 * ⚠️ Esteve = `lumeasolutions@outlook.fr` (UN seul « s ») — surtout pas la
 * variante `...sss` qui est un ancien compte vide.
 */
const DEFAULT_SUPPORT_EMAILS = [
  'lumeasolutions@outlook.fr',
  'cgdesignplan@gmail.com',
];

function getSupportEmails(): Set<string> {
  const raw = process.env.SUPPORT_ADMIN_EMAILS ?? '';
  const fromEnv = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const list = fromEnv.length > 0 ? fromEnv : DEFAULT_SUPPORT_EMAILS;
  return new Set(list.map((e) => e.toLowerCase()));
}

function extractEmailFromJwt(token: string): string | null {
  const claims = getVerifiedClaims(token);
  if (!claims) return null;
  const email =
    (typeof claims.email === 'string' ? claims.email : null) ??
    (typeof claims.sub === 'string' ? claims.sub : null);
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

/**
 * Cœur du contrôle : vérifie un access_token (JWT) contre la liste blanche.
 * Partagé par les routes API (NextRequest) et les Server Components (cookies()).
 * Échoue fermé par défaut.
 */
export function checkSupportToken(token: string | undefined | null): SupportCheckResult {
  if (!token) return { ok: false };
  const allowed = getSupportEmails();
  const email = extractEmailFromJwt(token);
  if (email && allowed.has(email)) {
    return { ok: true, email };
  }
  return { ok: false };
}

/**
 * Vérifie que la requête provient d'un des deux comptes support.
 * Retourne { ok:true, email } ou { ok:false }. Échoue fermé par défaut.
 */
export function isSupportEmail(req: NextRequest): SupportCheckResult {
  return checkSupportToken(req.cookies.get('access_token')?.value);
}

/** Liste publique (pour le front : masquer/afficher le lien). Pas un secret. */
export function getSupportEmailList(): string[] {
  return Array.from(getSupportEmails());
}
