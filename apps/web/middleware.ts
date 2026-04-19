import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de protection des routes AVRA
 *
 * Vérifie la validité du token JWT avant d'autoriser l'accès aux pages protégées.
 * Ce contrôle s'effectue côté serveur (Edge Runtime).
 *
 * Sécurité :
 * - access_token (HttpOnly, SameSite=Strict) : JWT émis par le backend NestJS
 *   → Vérification format + expiration en Edge (signature vérifiée côté backend)
 * - logged_in (non-HttpOnly) : utilisé uniquement en mode démo sans backend
 *   → Accepté UNIQUEMENT si access_token est absent ET qu'on n'est pas en production
 */

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/portal-select',
  '/',
  '/api',
  '/_next',
  '/favicon',
  '/robots.txt',
  '/sitemap',
  // Pages marketing publiques
  '/accueil',
  '/fonctionnalites',
  '/comment-ca-marche',
  '/temoignages',
  '/tarifs',
  '/metiers',
  '/mentions-legales',
  '/confidentialite',
  '/cgv',
  '/forgot-password',
  '/reset-password',
];

const PORTAIL_PATHS = ['/portail-architecte', '/portail-menuisier', '/portail-cuisiniste'];

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Décode et valide un JWT (structure + expiration, signature vérifiée par le backend).
 */
function isJwtStructurallyValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Validation du type du payload
    if (typeof payload !== 'object' || payload === null) return false;

    // Vérifier l'expiration
    if (payload.exp && typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec > payload.exp) return false;
    }

    // Exiger un identifiant de sujet
    if (!payload.sub && !payload.id && !payload.userId) return false;

    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les routes publiques
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // ── Vérification du JWT ──────────────────────────────────────────────────
  const accessToken = request.cookies.get('access_token')?.value;

  if (accessToken) {
    // JWT présent → vérifier structure + expiration
    if (isJwtStructurallyValid(accessToken)) {
      return NextResponse.next();
    }
    // JWT invalide ou expiré → rediriger vers login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Fallback cookie `logged_in` ────────────────────────────────────────
  // SÉCURITÉ : Ce cookie est non-HttpOnly et non-signé. Il est donc TRIVIAL
  // à forger (un attaquant peut simplement `document.cookie = "logged_in=true"`
  // et accéder aux pages authentifiées). On l'accepte UNIQUEMENT en dev,
  // pour le mode démo sans backend. En production, un JWT access_token est requis.
  if (!IS_PRODUCTION) {
    const loggedIn = request.cookies.get('logged_in')?.value;
    if (loggedIn === 'true') {
      return NextResponse.next();
    }
  }

  // Pas authentifié → redirection vers login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/).*)',
  ],
};
