/**
 * DATES BUTOIRS DU CHANTIER — source unique (demande cofondatrice, 18/10/2026).
 *
 * « On met les dates butoires pour les commandes / l'administratif mais pas
 * encore pour ceux qui gèrent le chantier. » Ces dates (livraison, pose,
 * réception…) se saisissent dans la même fenêtre « Valider le projet » que les
 * autres dates butoirs, dans une section « Chantier ». Elles vivent au même
 * endroit (`datesButoiresSignes`) : alertes de retard / d'approche, rappels
 * J-14 / J-7 / J-3, bande « Échéances » et tableau de bord du dossier signé les
 * reprennent sans rien de spécial. Elles s'affichent en plus dans le Planning
 * gestion, où l'équipe chantier les voit et peut planifier l'intervention.
 *
 * Décision produit (Esteve, 18/10/2026) : ALERTE seulement, jamais bloquant.
 *
 * Les libellés ne reprennent volontairement aucun nom de sous-dossier signé
 * (cf. buildSignedEcheanceItems) : ce sont des dates, pas des dossiers.
 */
import type { Profession } from '@/store/useAuthStore';

export interface DateChantier {
  /** Clé de la date (libellé affiché, stocké dans datesButoiresSignes). */
  label: string;
  /** Type d'intervention du planning gestion proposé pour la planifier. */
  typeIntervention: string;
  /** Délai suggéré par « Pré-remplir », en jours après aujourd'hui. */
  delaiJours: number;
}

const CUISINISTE: DateChantier[] = [
  { label: 'LIVRAISON MEUBLES',      typeIntervention: 'LIVRAISON',    delaiJours: 100 },
  { label: 'POSE CUISINE',           typeIntervention: 'POSE CUISINE', delaiJours: 105 },
  { label: 'POSE PLAN DE TRAVAIL',   typeIntervention: 'POSE GRANITE', delaiJours: 120 },
  { label: 'RÉCEPTION DES TRAVAUX',  typeIntervention: 'RECEPTION',    delaiJours: 125 },
];

const MENUISIER: DateChantier[] = [
  { label: 'LIVRAISON SUR CHANTIER', typeIntervention: 'LIVRAISON',    delaiJours: 100 },
  { label: 'POSE',                   typeIntervention: 'POSEUR',       delaiJours: 105 },
  { label: 'RÉCEPTION DES TRAVAUX',  typeIntervention: 'RECEPTION',    delaiJours: 115 },
];

const ARCHITECTE: DateChantier[] = [
  { label: 'DÉBUT DES TRAVAUX',      typeIntervention: 'SUIVI_CHANTIER', delaiJours: 60 },
  { label: 'LIVRAISON SUR CHANTIER', typeIntervention: 'LIVRAISON',      delaiJours: 100 },
  { label: 'RÉCEPTION DES TRAVAUX',  typeIntervention: 'RECEPTION',      delaiJours: 150 },
];

const DEFAUT: DateChantier[] = [
  { label: 'LIVRAISON SUR CHANTIER', typeIntervention: 'LIVRAISON',    delaiJours: 100 },
  { label: 'POSE',                   typeIntervention: 'POSEUR',       delaiJours: 105 },
  { label: 'RÉCEPTION DES TRAVAUX',  typeIntervention: 'RECEPTION',    delaiJours: 115 },
];

/** Dates du chantier proposées pour un métier. */
export function datesChantierPour(profession?: Profession | string | null): DateChantier[] {
  if (profession === 'cuisiniste') return CUISINISTE;
  if (profession === 'menuisier') return MENUISIER;
  if (profession === 'architecte') return ARCHITECTE;
  return DEFAUT;
}

const TOUTES = new Map<string, DateChantier>(
  [...CUISINISTE, ...MENUISIER, ...ARCHITECTE, ...DEFAUT].map((d) => [d.label, d]),
);

/** La clé de date appartient-elle au chantier (tous métiers confondus) ? */
export function estDateChantier(label: string): boolean {
  return TOUTES.has(label);
}

/** Description d'une date chantier (type d'intervention, délai), si c'en est une. */
export function infoDateChantier(label: string): DateChantier | undefined {
  return TOUTES.get(label);
}

/** Libellé lisible : « POSE PLAN DE TRAVAIL » → « Pose plan de travail ». */
export function libelleDateChantier(label: string): string {
  const bas = label.toLowerCase();
  return bas.charAt(0).toUpperCase() + bas.slice(1);
}

/** « 2026-10-21 » ou « 21/10/2026 » → Date locale (minuit), sinon null. */
export function lireDate(str?: string | null): Date | null {
  if (!str) return null;
  const fr = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fr) {
    const d = new Date(+fr[3], +fr[2] - 1, +fr[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Mise en service de la fonctionnalité : l'alerte « dates du chantier non
 * fixées » ne concerne que les dossiers signés à partir de ce jour (les
 * anciens dossiers, souvent déjà posés, ne sont pas relancés à tort).
 */
export const MISE_EN_SERVICE_DATES_CHANTIER = new Date(2026, 9, 19);
