/**
 * jwt-verify.ts — Vérification cryptographique HS256 des JWT côté Next.js.
 *
 * Les routes serverless Next.js qui parlent DIRECTEMENT à Prisma (sans passer
 * par NestJS) doivent vérifier elles-mêmes la signature du JWT. Sinon un token
 * forgé (`alg:none` ou signature bidon) permet une IDOR cross-tenant ou un
 * accès admin (cf. audit sécurité C1).
 *
 * On vérifie HS256 avec le secret partagé `JWT_SECRET` (le même que NestJS),
 * en s'appuyant uniquement sur `node:crypto` (aucune dépendance ajoutée).
 *
 * NB : ce module utilise `Buffer`/`crypto` (runtime Node). Il ne doit JAMAIS
 * être importé depuis le middleware Edge.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export type JwtClaims = Record<string, unknown> & {
  sub?: string;
  id?: string;
  userId?: string;
  workspaceId?: string;
  workspace?: { id?: string };
  email?: string;
  role?: string;
  exp?: number;
};

function decodeJson(part: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

function isExpired(payload: JwtClaims): boolean {
  return typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) > payload.exp;
}

/**
 * Vérifie la signature HS256 + l'expiration. Retourne les claims si valides,
 * sinon `null`. Rejette explicitement `alg:none` et tout algorithme ≠ HS256.
 */
export function verifyJwtHS256(token: string, secret: string): JwtClaims | null {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeJson(headerB64);
  if (!header || header.alg !== 'HS256') return null; // rejette alg:none & autres

  const expected = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signatureB64, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  const payload = decodeJson(payloadB64) as JwtClaims | null;
  if (!payload || isExpired(payload)) return null;
  return payload;
}

const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development');

let warnedMissingSecret = false;

/**
 * Retourne les claims VÉRIFIÉS d'un token, ou `null`.
 *
 *  - `JWT_SECRET` défini  → vérification cryptographique complète (cas prod).
 *  - `JWT_SECRET` absent + dev local → décodage structurel seul (confort de
 *    dev), avec avertissement une fois.
 *  - `JWT_SECRET` absent en prod → `null` (fail-closed, jamais de bypass).
 *
 * Ce comportement garantit qu'on ne casse jamais le dev local, tout en étant
 * réellement sûr dès que `JWT_SECRET` est présent (ce qui est le cas en prod).
 */
export function getVerifiedClaims(token: string | undefined | null): JwtClaims | null {
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return verifyJwtHS256(token, secret);
  }

  if (IS_LOCAL_DEV) {
    if (!warnedMissingSecret) {
      // eslint-disable-next-line no-console
      console.warn(
        '[jwt-verify] JWT_SECRET absent — décodage structurel seul (DEV uniquement). ' +
          'Définir JWT_SECRET pour activer la vérification de signature.',
      );
      warnedMissingSecret = true;
    }
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = decodeJson(parts[1]) as JwtClaims | null;
    if (!payload || isExpired(payload)) return null;
    return payload;
  }

  // Prod sans secret → fail closed (jamais de bypass silencieux).
  return null;
}
