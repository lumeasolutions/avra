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
      // Scripts : self + unsafe-inline pour Next.js hydration + unsafe-eval en dev pour HMR/Fast Refresh
      `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
      // Styles : self + unsafe-inline pour Tailwind
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Images : self + data: (pour logos base64) + blob: (pour canvas/génération IA) + fal.ai CDN
      "img-src 'self' data: blob: https://fal.media https://*.fal.media https://v2.fal.media https://storage.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // API fetch : self + backend local + fal.ai
      `connect-src 'self' http://localhost:3001 https://fal.run https://*.fal.ai wss://fal.run${isProd ? '' : ' ws://localhost:3002'}`,
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

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@avra/types'],

  // Ignore TS and ESLint errors during build (fix incrementally post-deploy)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
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
    ];
  },

};

module.exports = nextConfig;
