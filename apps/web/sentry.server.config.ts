/**
 * Sentry — configuration côté serveur Next.js (API routes, RSC).
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  });
}
