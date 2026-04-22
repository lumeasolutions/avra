/** @type {import('next').NextConfig} */

// ── En-têtes de sécurité HTTP ────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

const securityHeaders = [
  // Empêche le clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Empêche le MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy stricte
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Désactive l'ancienne protection XSS du navigateur (CSP suffit)
  { key: 'X-XSS-Protection', value: '0' },
  // DNS prefetch control
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Permissions Policy — désactiver les APIs inutilisées
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // HSTS — activé en production uniquement
  ...(isProd ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  }] : []),
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts : self + unsafe-inline pour Next.js hydration + Plausible analytics + unsafe-eval en dev
      `script-src 'self' 'unsafe-inline' https://plausible.io${isProd ? '' : " 'unsafe-eval'"}`,
      // Styles : self + unsafe-inline pour Tailwind
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Images : self + data: (pour logos base64) + blob: (pour canvas/génération IA) + fal.ai CDN
      "img-src 'self' data: blob: https://fal.media https://*.fal.media https://v2.fal.media https://storage.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // API fetch : self + fal.ai + Sentry + Plausible (+ localhost en dev)
      `connect-src 'self' https://fal.run https://*.fal.ai wss://fal.run https://*.sentry.io https://sentry.io https://plausible.io${isProd ? '' : ' http://localhost:3001 ws://localhost:3002'}`,
      // Frames interdites
      "frame-src 'none'",
      "frame-ancestors 'self'",
      // Objects interdits
      "object-src 'none'",
      // Base URI restreinte
      "base-uri 'self'",
      // Forms : self uniquement
      "form-action 'self'",
    ].join('; '),
  },
];

// Cache long-terme pour les assets statiques (déjà hash par Next) + images publiques
const longCacheHeaders = [
  { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@avra/types'],

  // ── Perf : suppression de l'entête X-Powered-By + compression Gzip/Brotli
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // Réduit la taille des bundles pour les gros packages (import granulaire)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
    ],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: '*.fal.media' },
      { protocol: 'https', hostname: 'v2.fal.media' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache agressif pour les polices + icônes PWA (déjà versionnées ou rarement modifiées)
      {
        source: '/icons/:path*',
        headers: longCacheHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: longCacheHeaders,
      },
    ];
  },

  async rewrites() {
    // En prod sur Vercel : /api/v1/* est routé par vercel.json vers la Serverless Function NestJS.
    // En dev : on proxie vers le backend NestJS local sur :3001.
    if (isProd) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },

};

// ── Sentry wrapper ───────────────────────────────────────────────────────────
// `withSentryConfig` injecte la config Sentry automatiquement en prod.
// Désactivé si SENTRY_AUTH_TOKEN est absent (évite les builds qui échouent en dev).
const { withSentryConfig } = require('@sentry/nextjs');

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Ne tente pas d'uploader les sourcemaps si pas de token
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
};

const sentryOptions = {
  hideSourceMaps: true,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
};

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions)
  : nextConfig;
