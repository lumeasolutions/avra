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

type AdminCheckResult = { ok: true; email: string } | { ok: false };

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Extrait l'email du payload JWT sans vérifier la signature
 * (la vérification crypto est faite par le backend NestJS).
 */
function extractEmailFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

    // Vérifier expiration
    if (payload.exp && typeof payload.exp === 'number') {
      if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    }

    const email =
      payload.email ??
      payload.sub ??
      null;

    return typeof email === 'string' ? email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
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
 */
export function isAdminEmail(req: NextRequest): AdminCheckResult {
  const adminEmails = getAdminEmails();

  // En dev, autoriser l'accès si aucune whitelist n'est configurée
  // (pour ne pas bloquer les tests locaux)
  if (!IS_PRODUCTION && adminEmails.size === 0) {
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

  // En dev uniquement : cookie dev_admin=true (pour tester sans auth)
  if (!IS_PRODUCTION) {
    const devAdmin = req.cookies.get('dev_admin')?.value;
    if (devAdmin === 'true') {
      return { ok: true, email: 'dev@local' };
    }
  }

  return { ok: false };
}
