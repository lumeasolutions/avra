/**
 * Bêta Gate — Whitelist d'emails autorisés à créer un compte ou se connecter
 * pendant la phase de bêta privée (lancement juillet 2026).
 *
 * Configuration :
 * - BETA_GATE_ENABLED=true       → active la whitelist
 * - BETA_ADMIN_EMAILS=a@b.fr,c@d.fr → liste séparée par virgules
 *
 * Si BETA_GATE_ENABLED n'est pas "true", la whitelist est désactivée (lancement public).
 */

/**
 * Retourne la liste des emails whitelistés (lowercased, trimmed).
 */
export function getBetaAdminEmails(): Set<string> {
  const raw = process.env.BETA_ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Renvoie true si le bêta gate est actif.
 */
export function isBetaGateEnabled(): boolean {
  return process.env.BETA_GATE_ENABLED === 'true';
}

/**
 * Vérifie si un email est autorisé à se connecter / créer un compte.
 * Si le gate est désactivé, tout email est autorisé.
 */
export function isEmailAllowed(email: string): boolean {
  if (!isBetaGateEnabled()) return true;
  const normalized = email.trim().toLowerCase();
  const whitelist = getBetaAdminEmails();
  return whitelist.has(normalized);
}
