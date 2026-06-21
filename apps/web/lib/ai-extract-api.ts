/**
 * Client API pour l'extraction IA de dossiers.
 * Appelle POST /api/v1/ia/extract-dossier (cookies + CSRF gérés par api()).
 */

import { api } from './api';

/** Mapping des 5 dates butoires standards (ISO date string ou null). */
export interface ExtractionDatesButoires {
  suiviChantier: string | null;
  releveMesures: string | null;
  planTechnique: string | null;
  fichePose: string | null;
  permisConstruire: string | null;
}

export interface ExtractionCommande {
  fournisseur: string;
  /** Désignation du produit/article (détail ligne par ligne). null si commande globale. */
  produit: string | null;
  dateButoir: string | null;
  /** Prix d'ACHAT HT (coût pour le pro) — lu sur facture/bon de commande fournisseur. */
  montantHT: number | null;
  /** Prix de VENTE HT (facturé au client) — lu sur un devis client. */
  montantVenteHT: number | null;
  categorie: string | null;
}

export interface ExtractionLivraison {
  categorie: string;
  dateButoir: string | null;
}

export interface ExtractionResult {
  datesButoires: ExtractionDatesButoires;
  commandes: ExtractionCommande[];
  livraisons: ExtractionLivraison[];
  /** Score 0-1 de la confiance globale de l'IA. */
  confiance: number;
  notes: string;
}

/** Appelle le backend pour extraire les données IA d'un dossier. */
export async function extractDossier(
  dossierId: string,
  scope?: 'achat' | 'vente' | 'all',
): Promise<ExtractionResult> {
  const payload = scope && scope !== 'all' ? { dossierId, scope } : { dossierId };
  return api<ExtractionResult>('/ia/extract-dossier', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Mapping "sûr" : champ sémantique (ExtractionDatesButoires) → libellé EXACT
 * du jalon de date, PAR MÉTIER. On ne mappe QUE les correspondances non
 * ambiguës ; les jalons sans source IA fiable (MODIFICATIONS, FABRICATION,
 * LANCEMENT, MARCHÉ / SIGNATURES…) restent volontairement vides.
 *
 * ⚠️ Les libellés doivent matcher au caractère près (accents inclus) ceux des
 * listes *_DATE_BUTOIRE_ITEMS de DateButoireValidationModal. Le résolveur côté
 * modale ne remplit de toute façon que les libellés réellement présents.
 *
 * Historique (28/05/2026) : l'ancienne table unique `DATE_LABEL_TO_FIELD`
 * n'utilisait que les libellés de DEFAULT_DATE_BUTOIRE_ITEMS → une seule date
 * (FICHE DE POSE) se remplissait pour les dossiers menuisier/cuisiniste.
 */
export const SEMANTIC_DATE_TARGET_BY_PROFESSION: Record<
  string,
  Partial<Record<keyof ExtractionDatesButoires, string>>
> = {
  menuisier: {
    releveMesures: 'RELEVÉ DE MESURE',
    planTechnique: 'DÉBIT / LISTE MATÉRIAUX',
    fichePose: 'FICHE DE POSE',
  },
  cuisiniste: {
    releveMesures: 'RELEVÉ DÉFINITIF',
    fichePose: 'FICHE DE POSE',
  },
  architecte: {
    suiviChantier: 'SUIVI DE CHANTIER',
    planTechnique: 'DCE',
    permisConstruire: 'PERMIS DE CONSTRUIRE',
  },
};

/** Fallback générique — libellés de DEFAULT_DATE_BUTOIRE_ITEMS. */
export const SEMANTIC_DATE_TARGET_DEFAULT: Partial<
  Record<keyof ExtractionDatesButoires, string>
> = {
  suiviChantier: 'SUIVI DE CHANTIER',
  releveMesures: 'RELEVE DE MESURES',
  planTechnique: 'PLAN TECHNIQUE',
  fichePose: 'FICHE DE POSE',
  permisConstruire: 'PERMIS DE CONSTRUIRE',
};

/** Retourne le mapping sémantique→libellé pour une profession donnée. */
export function dateTargetsForProfession(
  profession?: string | null,
): Partial<Record<keyof ExtractionDatesButoires, string>> {
  if (profession && SEMANTIC_DATE_TARGET_BY_PROFESSION[profession]) {
    return SEMANTIC_DATE_TARGET_BY_PROFESSION[profession];
  }
  return SEMANTIC_DATE_TARGET_DEFAULT;
}
