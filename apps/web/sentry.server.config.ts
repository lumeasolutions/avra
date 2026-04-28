/**
 * Sentry — configuration côté serveur Next.js (API routes, RSC).
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.SENTRY_DSN;

// MED-002: scrub well-known sensitive keys before sending events.
const SENSITIVE_KEYS = new Set([
  'password', 'pwd', 'passwd', 'newpassword', 'currentpassword',
  'token', 'accesstoken', 'refreshtoken', 'authorization', 'cookie',
  'x-csrf-token', 'apikey', 'api_key', 'secret', 'sessionid', 'set-cookie',
]);

function scrub<T>(input: T, depth = 0): T {
  if (depth > 6 || input == null) return input;
  if (Array.isArray(input)) return input.map((v) => scrub(v, depth + 1)) as unknown as T;
  if (typeof input !== 'object') return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) out[k] = '***REDACTED***';
    else if (v && typeof v === 'object') out[k] = scrub(v, depth + 1);
    else out[k] = v;
  }
  return out as T;
}

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      try {
        if (event.request?.headers) {
          const h = event.request.headers as Record<string, unknown>;
          delete h.authorization; delete h.cookie; delete h['x-csrf-token'];
        }
        if (event.request?.data) event.request.data = scrub(event.request.data);
        if (event.extra) event.extra = scrub(event.extra);
      } catch {/* never break Sentry */}
      return event;
    },
  });
}
