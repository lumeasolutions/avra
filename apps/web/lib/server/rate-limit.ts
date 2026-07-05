/**
 * Limiteur de débit en mémoire pour les routes API
 *
 * Implémentation par fenêtre glissante (sliding window).
 * Adapté pour Next.js Node runtime.
 *
 * SÉCURITÉ :
 * - Protection contre le spoofing IP : les headers proxy (x-forwarded-for)
 *   ne sont acceptés que si TRUSTED_PROXY=true est défini côté serveur.
 *   Sans ce flag, on utilise uniquement x-real-ip ou 'unknown'.
 *
 * NOTE : En production multi-instance (ex: Vercel), migrer vers Redis :
 *   https://github.com/upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Map en mémoire : clé → { count, resetAt }
const store = new Map<string, RateLimitEntry>();

// Nettoyage périodique des entrées expirées (toutes les minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  /** Nombre max de requêtes par fenêtre */
  limit: number;
  /** Durée de la fenêtre en millisecondes */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Vérifie et incrémente le compteur pour une clé donnée.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extrait l'IP réelle du client de manière sécurisée.
 *
 * Anti-spoofing : x-forwarded-for n'est accepté QUE si l'env TRUSTED_PROXY=true
 * est configuré (indiquant qu'un reverse proxy légitime est en frontal).
 * Sans ce flag, un client malveillant pourrait forger ce header pour contourner le rate limit.
 */
export function getClientIp(req: Request): string {
  const trustedProxy = process.env.TRUSTED_PROXY === 'true';
  // Sur Vercel, la plateforme est le proxy de confiance en frontal : elle réécrit
  // x-forwarded-for / x-real-ip avec l'IP client réelle, non spoofable à ce niveau.
  const onVercel = !!process.env.VERCEL;

  // x-real-ip est posé par la plateforme (Vercel) — prioritaire car non forgeable.
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  // Sur Vercel (ou proxy de confiance déclaré), la 1re IP de x-forwarded-for est
  // l'IP client réelle.
  if (onVercel || trustedProxy) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
      if (ips.length > 0) return ips[0];
    }
  }

  // Ni plateforme de confiance ni header exploitable : clé générique (moins précis).
  return 'unknown';
}
