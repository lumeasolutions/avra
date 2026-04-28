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

// HIGH-002: gate the legacy `logged_in=true` demo cookie on the strictest
// possible signal. We accept it ONLY when both NODE_ENV says non-prod AND
// Vercel reports we are not running on a deployed env (preview/production).
// On any Vercel deployment (`VERCEL_ENV` set), this fallback is denied.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development');

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

/**
 * HIGH-007: per-request CSP nonce. Generated here (Edge runtime) and pushed
 * into both the request headers (so server components/route handlers can
 * read it via `headers().get('x-nonce')`) and the response CSP. Inline
 * scripts emitted by Next must carry `nonce={nonce}` to be allowed.
 *
 * NOTE: 'unsafe-inline' for styles is kept (Tailwind injects critical CSS).
 * Migrating styles to nonce/hash is non-trivial and out of scope here.
 */
function buildCspWithNonce(nonce: string, isProd: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://plausible.io${isProd ? '' : " 'unsafe-eval' 'unsafe-inline'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://fal.media https://*.fal.media https://v2.fal.media https://storage.googleapis.com https://*.supabase.co",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' https://fal.run https://*.fal.ai wss://fal.run https://*.sentry.io https://sentry.io https://plausible.io https://*.supabase.co${isProd ? '' : ' http://localhost:3001 ws://localhost:3002'}`,
    "frame-src 'self' https://*.supabase.co",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join('; ');
}

function applyCsp(req: NextRequest, res: NextResponse): NextResponse {
  // Generate a fresh nonce per request.
  const nonce = btoa(crypto.getRandomValues(new Uint8Array(16)).join('-'));
  // Make it available to RSC via request headers (read with `headers()`).
  res.headers.set('x-nonce', nonce);
  const isProd = process.env.NODE_ENV === 'production';
  res.headers.set('Content-Security-Policy', buildCspWithNonce(nonce, isProd));
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les routes publiques
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return applyCsp(request, NextResponse.next());

  // ── Vérification du JWT ──────────────────────────────────────────────────
  const accessToken = request.cookies.get('access_token')?.value;

  if (accessToken) {
    // JWT présent → vérifier structure + expiration
    if (isJwtStructurallyValid(accessToken)) {
      return applyCsp(request, NextResponse.next());
    }
    // JWT invalide ou expiré → rediriger vers login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Fallback cookie `logged_in` ────────────────────────────────────────
  // SÉCURITÉ : Ce cookie est non-HttpOnly et trivialement forgeable. On
  // l'accepte UNIQUEMENT en dev local sans déploiement Vercel.
  if (IS_LOCAL_DEV) {
    const loggedIn = request.cookies.get('logged_in')?.value;
    if (loggedIn === 'true') {
      return applyCsp(request, NextResponse.next());
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
