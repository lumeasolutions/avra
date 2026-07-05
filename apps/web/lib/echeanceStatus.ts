/**
 * STATUT D'UNE ÉCHÉANCE — source unique partagée.
 *
 * Utilisé par le tableau de bord (étapes à date + lignes commande/livraison) ET
 * la bande « Échéances » du dossier, pour que tout affiche EXACTEMENT le même
 * statut (aucune divergence possible).
 *
 * Règle : le drapeau « validé » est la SEULE vérité.
 *   • validated === true            → 'done'  (rien d'autre ne valide, ni le temps)
 *   • sinon, la date butoir pilote :
 *       - déjà passée                → 'retard'
 *       - dans ≤ soonDays jours      → 'urgent'
 *       - plus loin                  → 'planned'
 *   • pas de date                    → 'none'
 *
 * La date est parsée en LOCAL (YYYY-MM-DD ou dd/mm/yyyy) pour éviter tout
 * décalage d'un jour dû au fuseau (UTC).
 */
export type EcheanceStatus = 'done' | 'retard' | 'urgent' | 'planned' | 'none';

/** Ordre de priorité d'affichage : retard d'abord, done en dernier. */
export const ECHEANCE_PRIO: Record<EcheanceStatus, number> = {
  retard: 0,
  urgent: 1,
  planned: 2,
  none: 3,
  done: 4,
};

/** Parse une date "YYYY-MM-DD" ou "dd/mm/yyyy" en Date LOCALE (minuit). */
export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const slash = dateStr.includes('/') ? dateStr.split('/') : null;
  if (slash && slash.length === 3) return new Date(+slash[2], +slash[1] - 1, +slash[0]);
  const t = new Date(dateStr);
  return isNaN(t.getTime()) ? null : t;
}

export function echeanceStatus(
  dateStr?: string | null,
  validated?: boolean,
  soonDays = 7,
): EcheanceStatus {
  if (validated === true) return 'done';
  const d = parseLocalDate(dateStr);
  if (!d || isNaN(d.getTime())) return 'none';
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - t0.getTime()) / 86_400_000);
  if (diff < 0) return 'retard';
  return diff <= soonDays ? 'urgent' : 'planned';
}

/** true si l'échéance est « en cours » (a une date, pas encore validée). */
export function isEcheanceEnCours(dateStr?: string | null, validated?: boolean): boolean {
  const s = echeanceStatus(dateStr, validated);
  return s === 'retard' || s === 'urgent' || s === 'planned';
}
