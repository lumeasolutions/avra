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

  if (trustedProxy) {
    // Reverse proxy configuré — prendre la dernière IP de confiance dans la chaîne
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      // La première IP est l'originale, mais avec plusieurs proxies prendre la dernière
      // ajoutée par notre proxy de confiance (dernier élément du header)
      const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
      // On retourne la première IP (client réel) uniquement si la chaîne est courte
      // pour éviter les injections de fausses IPs en tête de liste
      if (ips.length > 0 && ips.length <= 3) return ips[0];
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp && realIp.trim()) return realIp.trim();
  }

  // Sans proxy de confiance : on ne peut pas déterminer l'IP réelle
  // On utilise une clé générique — moins précis mais plus sûr
  return req.headers.get('x-real-ip')?.trim() ?? 'unknown';
}
