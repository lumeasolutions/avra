/**
 * Sentry — configuration côté client (navigateur).
 * Chargé automatiquement par Next.js au runtime.
 *
 * Désactivé si SENTRY_DSN est absent (pas de noise en dev local).
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',

    // Traces — sample rate réduit en prod pour le coût
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay — uniquement en prod, 10% des sessions, 100% si erreur
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // PII — jamais
    sendDefaultPii: false,

    // Ignorer les erreurs non-actionnables (bruit des navigateurs/extensions)
    ignoreErrors: [
      // Extensions Chrome
      'chrome-extension://',
      'moz-extension://',
      // Erreurs réseau transitoires
      'Network request failed',
      'NetworkError when attempting to fetch resource.',
      'Failed to fetch',
      // Hydration Next.js non critique
      'Hydration failed',
      'There was an error while hydrating',
      // ResizeObserver (benin)
      'ResizeObserver loop',
    ],

    // MED-002: scrub headers / body / extras for PII before send.
    beforeSend(event) {
      const SENSITIVE = new Set([
        'password', 'pwd', 'passwd', 'newpassword', 'currentpassword',
        'token', 'accesstoken', 'refreshtoken', 'authorization', 'cookie',
        'x-csrf-token', 'apikey', 'api_key', 'secret', 'sessionid',
      ]);
      const scrub = (v: any, d = 0): any => {
        if (d > 6 || v == null) return v;
        if (Array.isArray(v)) return v.map((x) => scrub(x, d + 1));
        if (typeof v !== 'object') return v;
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) {
          out[k] = SENSITIVE.has(k.toLowerCase())
            ? '***REDACTED***'
            : (val && typeof val === 'object' ? scrub(val, d + 1) : val);
        }
        return out;
      };
      try {
        if (event.request?.headers) {
          const h = event.request.headers as Record<string, unknown>;
          delete h.authorization; delete h.cookie; delete h['x-csrf-token'];
        }
        if (event.request?.data) event.request.data = scrub(event.request.data);
        if (event.extra) event.extra = scrub(event.extra);
      } catch {/* never break Sentry */}

      const url = event.request?.url ?? '';
      if (
        url.includes('/dashboard') ||
        url.includes('/assistant') ||
        url.includes('/portail-') ||
        url.includes('/parametres')
      ) {
        if (event.contexts?.replay) {
          delete event.contexts.replay;
        }
      }
      return event;
    },
  });
}
