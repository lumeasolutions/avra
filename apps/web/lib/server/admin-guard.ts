/**
 * admin-guard.ts — Vérification d'accès admin pour les routes /api/admin/*
 *
 * Lit l'email depuis le JWT (access_token cookie) et vérifie
 * qu'il est dans BETA_ADMIN_EMAILS.
 *
 * En développement sans JWT, accepte le cookie "dev_admin=true" pour
 * faciliter le test local (désactivé en production).
 */

import type { NextRequest } from 'next/server';
import { getVerifiedClaims } from './jwt-verify';

type AdminCheckResult = { ok: true; email: string } | { ok: false };

// HIGH-002: dev escape-hatches accepted only on local dev.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development');

/**
 * Extrait l'email du payload JWT APRÈS vérification de la signature (HS256) et
 * de l'expiration (cf. jwt-verify.ts). Sans cette vérification, un cookie forgé
 * avec l'email admin connu donnait un accès admin complet (audit sécurité C1).
 */
function extractEmailFromJwt(token: string): string | null {
  const claims = getVerifiedClaims(token);
  if (!claims) return null;
  const email =
    (typeof claims.email === 'string' ? claims.email : null) ??
    (typeof claims.sub === 'string' ? claims.sub : null);
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

/**
 * Retourne la liste des emails admin autorisés.
 */
function getAdminEmails(): Set<string> {
  const raw = process.env.BETA_ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Vérifie si la requête provient d'un admin autorisé.
 *
 * MED-6 (passe-2): in production we REFUSE to fall back when
 *   BETA_ADMIN_EMAILS is empty/unset. Previously an empty whitelist + a
 *   forged cookie / dev branch could open admin routes. Now any prod env
 *   without an explicit whitelist returns `{ ok: false }` immediately.
 */
export function isAdminEmail(req: NextRequest): AdminCheckResult {
  const adminEmails = getAdminEmails();

  if (IS_PRODUCTION && adminEmails.size === 0) {
    // Refuse outright — failing closed beats failing open in prod.
    return { ok: false };
  }

  // En dev local strict, autoriser si aucune whitelist n'est configurée.
  if (IS_LOCAL_DEV && adminEmails.size === 0) {
    return { ok: true, email: 'dev@local' };
  }

  // Vérification par JWT (access_token)
  const token = req.cookies.get('access_token')?.value;
  if (token) {
    const email = extractEmailFromJwt(token);
    if (email && adminEmails.has(email)) {
      return { ok: true, email };
    }
  }

  // En dev local UNIQUEMENT : cookie dev_admin=true (pour tester sans auth).
  if (IS_LOCAL_DEV) {
    const devAdmin = req.cookies.get('dev_admin')?.value;
    if (devAdmin === 'true') {
      return { ok: true, email: 'dev@local' };
    }
  }

  return { ok: false };
}
