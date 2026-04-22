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

    // Pas de Replay sur les pages privées (évite de capturer les données clients)
    beforeSend(event) {
      const url = event.request?.url ?? '';
      if (
        url.includes('/dashboard') ||
        url.includes('/assistant') ||
        url.includes('/portail-') ||
        url.includes('/parametres')
      ) {
        // On capture l'erreur mais on retire le replay
        if (event.contexts?.replay) {
          delete event.contexts.replay;
        }
      }
      return event;
    },
  });
}
