/**
 * auth-guard.ts — Vérification d'authentification pour les routes API Next.js
 *
 * Vérifie la signature cryptographique (HS256) ET l'expiration du JWT du cookie
 * de session, via `getVerifiedClaims` (cf. jwt-verify.ts).
 *
 * ⚠️ Auparavant la signature N'était PAS vérifiée ici : un token forgé
 * permettait IDOR cross-tenant / accès admin sur les routes serverless qui
 * parlent directement à Prisma (cf. audit sécurité C1). C'est désormais corrigé.
 */

import type { NextRequest } from 'next/server';
import { getVerifiedClaims } from './jwt-verify';

// HIGH-002: only accept the legacy `logged_in` demo cookie when we are
// genuinely on a developer machine — never on Vercel previews/production.
const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development');

export function isAuthenticated(req: NextRequest): boolean {
  const accessToken = req.cookies.get('access_token')?.value;
  if (accessToken) {
    const claims = getVerifiedClaims(accessToken);
    return !!(claims && (claims.sub || claims.id || claims.userId));
  }
  if (IS_LOCAL_DEV) {
    const loggedIn = req.cookies.get('logged_in')?.value;
    return loggedIn === 'true';
  }
  return false;
}

/**
 * Extrait l'ID utilisateur depuis le JWT (signature vérifiée) du cookie
 * access_token. Utilisé pour scoper les fichiers stockés
 * (ex: ia-renders/<userId>/...). Retourne null si le token est absent/invalide.
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  const claims = getVerifiedClaims(req.cookies.get('access_token')?.value);
  if (!claims) return null;
  const userId = claims.sub ?? claims.id ?? claims.userId;
  return userId ? String(userId) : null;
}

/**
 * Contexte utilisateur extrait du JWT (signature vérifiée) — pour les routes
 * serverless qui scopent en DB (workspaceId) et auditent (createdById).
 *
 * Le backend NestJS encode `workspaceId` directement dans le payload JWT
 * (cf. workspace.guard.ts : `user.workspaceId`).
 *
 * Retourne null si le token est absent / invalide / expiré / sans workspaceId.
 */
export interface UserContext {
  userId:      string;
  workspaceId: string;
  email?:      string;
  role?:       string;
}

export function getUserContextFromRequest(req: NextRequest): UserContext | null {
  const claims = getVerifiedClaims(req.cookies.get('access_token')?.value);
  if (!claims) return null;

  const userId      = claims.sub ?? claims.id ?? claims.userId;
  const workspaceId = claims.workspaceId ?? claims.workspace?.id;
  if (!userId || !workspaceId) return null;

  return {
    userId:      String(userId),
    workspaceId: String(workspaceId),
    email:       typeof claims.email === 'string' ? claims.email : undefined,
    role:        typeof claims.role === 'string' ? claims.role : undefined,
  };
}
