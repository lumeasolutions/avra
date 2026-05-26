import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// LOW-004: rely on Web Crypto for the per-request nonce instead of btoa()-of-join.
// `crypto.randomUUID()` returns a 128-bit cryptographically random value with
// no ambiguity around base64 alphabet edge-cases.

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
function buildCspWithNonce(_nonce: string, isProd: boolean): string {
  // HOTFIX prod 29/04/2026 : la combinaison `'nonce-XXX' 'unsafe-inline'` ne
  // fonctionne PAS comme prévu — les browsers CSP3 (Chrome moderne) ignorent
  // `'unsafe-inline'` dès qu'un nonce est présent dans `script-src`, ce qui
  // bloque tous les scripts inline Next.js (qui ne portent pas de nonce sur
  // chunks bootstrap RSC). Résultat : page blanche en prod.
  //
  // Trade-off : on revient à `'self' 'unsafe-inline'` (statu quo pré-passe-2)
  // jusqu'à pouvoir threader `nonce={...}` sur tous les scripts inline RSC.
  // Le nonce est toujours généré et exposé via header `x-nonce` pour pouvoir
  // le câbler progressivement sans toucher de nouveau au middleware.
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://plausible.io https://www.googletagmanager.com${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://fal.media https://*.fal.media https://v2.fal.media https://storage.googleapis.com https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' https://fal.run https://*.fal.ai wss://fal.run https://*.sentry.io https://sentry.io https://plausible.io https://*.supabase.co https://www.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://vitals.vercel-insights.com${isProd ? '' : ' http://localhost:3001 ws://localhost:3002'}`,
    // Office Online viewer (https://view.officeapps.live.com) pour la
    // prévisualisation inline des Word/Excel/PowerPoint dans la modale doc.
    "frame-src 'self' https://*.supabase.co https://view.officeapps.live.com https://*.officeapps.live.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join('; ');
}

function applyCspToResponse(
  req: NextRequest,
  res: NextResponse,
  nonce: string,
): NextResponse {
  res.headers.set('x-nonce', nonce);
  const isProd = process.env.NODE_ENV === 'production';
  res.headers.set('Content-Security-Policy', buildCspWithNonce(nonce, isProd));
  return res;
}

/**
 * CRIT-001: produce a NextResponse.next() that ALSO injects the nonce into
 * the *request* headers so server components / route handlers can read it
 * via `headers().get('x-nonce')`. Without forwarding the nonce on the
 * request object, RSC code has no way to attach `nonce={...}` on inline
 * scripts and the CSP would silently block them in strict mode.
 */
function nextWithNonce(req: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function freshNonce(): string {
  // LOW-004: crypto.randomUUID() is cryptographically secure and stable across
  //   the Node and Edge runtimes Next 14 uses. We drop the legacy btoa(...) hack.
  return crypto.randomUUID().replace(/-/g, '');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = freshNonce();

  // Laisser passer les routes publiques
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    return applyCspToResponse(request, nextWithNonce(request, nonce), nonce);
  }

  // ── Vérification du JWT ──────────────────────────────────────────────────
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (accessToken) {
    // JWT présent → vérifier structure + expiration
    if (isJwtStructurallyValid(accessToken)) {
      return applyCspToResponse(request, nextWithNonce(request, nonce), nonce);
    }
    // JWT structurellement invalide OU expiré (exp dépassé).
    //
    // AUDIT 26/05/2026 — refresh tolerant flow :
    // Auparavant, on redirigeait vers /login dès qu'on voyait un JWT expiré.
    // Conséquence : à 15 min pile (TTL du JWT), la 1ère navigation Next.js
    // post-expiration éjectait l'utilisateur, sans laisser au mécanisme de
    // refresh côté client la moindre chance d'intervenir.
    //
    // Nouveau comportement : si le `refresh_token` (HttpOnly, 30j) est
    // toujours présent, on laisse passer la requête. Le client (`api.ts` ou
    // `useTokenRefresh.ts`) déclenchera alors un /auth/refresh sur la 1ère
    // requête API ou au montage du layout, posant un nouveau `access_token`.
    //
    // SÉCURITÉ : laisser passer un JWT expiré côté middleware ne donne PAS
    // accès aux ressources protégées. Le backend NestJS valide le JWT à
    // CHAQUE requête API via `JwtAuthGuard` (signature + exp). Un JWT e