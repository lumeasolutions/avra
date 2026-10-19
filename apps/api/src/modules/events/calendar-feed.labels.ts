/**
 * Libellés lisibles pour le flux agenda (Google Agenda, Outlook, iPhone).
 *
 * Le flux est lu sans navigateur : il ne connaît ni les types d'intervention
 * du planning gestion ni les dates du chantier, définis côté web. Copies
 * volontaires, à garder alignées sur :
 *  - apps/web/app/(app)/planning-gestion/page.tsx (INTERVENTION_TYPES +
 *    OCCASIONAL_INTERVENTION_TYPES) ;
 *  - apps/web/lib/datesChantier.ts (libellés des dates du chantier).
 * Un type absent d'ici n'est pas perdu : on retombe sur un libellé déduit de
 * sa clé.
 */

const TYPES_INTERVENTION: Record<string, string> = {
  LIVRAISON: 'Livraison',
  SUIVI_CHANTIER: 'Suivi chantier',
  RECEPTION: 'Réception travaux',
  MESURAGE: 'Relevé de mesures',
  'POSE CUISINE': 'Pose cuisine',
  'POSE GRANITE': 'Pose granite',
  'REUNION CHANTIER': 'Réunion chantier',
  SAV: 'SAV',
  COMPLEMENT: 'Complément',
  POSEUR: 'Poseur',
  PLOMBIER: 'Plombier',
  ELECTRICIEN: 'Électricien',
  PLAQUISTE: 'Plaquiste',
  LIVREUR: 'Livreur',
  MARBRIER: 'Marbrier',
  MACON: 'Maçon',
  PLATRIER: 'Plâtrier',
  MENUISIER: 'Menuisier',
  EBENISTE: 'Ébéniste',
  AGENCEUR: 'Agenceur',
  CHARPENTIER: 'Charpentier',
  CARRELEUR: 'Carreleur',
  PARQUETEUR: 'Parqueteur',
  PEINTRE_BATIMENT: 'Peintre bâtiment',
  ENDUISEUR: 'Enduiseur',
  FACADIER: 'Façadier',
  CHAUFFAGISTE: 'Chauffagiste',
  CLIMATICIEN: 'Climaticien',
  FRIGORISTE: 'Frigoriste',
  INSTALLATEUR_DOMOTIQUE: 'Installateur domotique',
  TECHNICIEN_VMC: 'Technicien VMC',
  SERRURIER: 'Serrurier',
  FERRONNIER: 'Ferronnier',
  MENUISIER_ALU_PVC: 'Menuisier aluminium / PVC',
  MIROITIER: 'Miroitier',
  TAPISSIER: 'Tapissier',
};

/**
 * Libellé d'un type d'intervention du planning gestion.
 * @param personnalises types créés par l'utilisateur (réglages `planningTypes.metiers`).
 */
export function libelleIntervention(
  type: unknown,
  personnalises: Array<{ key?: unknown; label?: unknown }> = [],
): string | null {
  if (typeof type !== 'string' || !type.trim()) return null;
  if (TYPES_INTERVENTION[type]) return TYPES_INTERVENTION[type];
  const perso = personnalises.find((t) => t?.key === type);
  if (typeof perso?.label === 'string' && perso.label.trim()) return perso.label.trim();
  // CUSTOM_POSE_CREDENCE_ab12cd34 → « Pose credence »
  const brut = type.replace(/^CUSTOM_/, '').replace(/_[a-z0-9]{8}$/i, '').replace(/_/g, ' ').trim();
  if (!brut) return null;
  return brut.charAt(0).toUpperCase() + brut.slice(1).toLowerCase();
}

/** Dates du chantier (clé stockée dans dossierBoard.dates → libellé). */
export const DATES_CHANTIER: Record<string, string> = {
  'LIVRAISON MEUBLES': 'Livraison meubles',
  'POSE CUISINE': 'Pose cuisine',
  'POSE PLAN DE TRAVAIL': 'Pose plan de travail',
  'RÉCEPTION DES TRAVAUX': 'Réception des travaux',
  'LIVRAISON SUR CHANTIER': 'Livraison sur chantier',
  POSE: 'Pose',
  'DÉBUT DES TRAVAUX': 'Début des travaux',
};

/** « 2026-10-21 » ou « 21/10/2026 » → { y, m, d } (jour civil), sinon null. */
export function lireJour(v: unknown): { y: number; m: number; d: number } | null {
  if (typeof v !== 'string') return null;
  const fr = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fr) return { y: +fr[3], m: +fr[2], d: +fr[1] };
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { y: +iso[1], m: +iso[2], d: +iso[3] };
  return null;
}
