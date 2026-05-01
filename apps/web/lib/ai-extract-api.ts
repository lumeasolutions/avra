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
  dateButoir: string | null;
  montantHT: number | null;
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
export async function extractDossier(dossierId: string): Promise<ExtractionResult> {
  return api<ExtractionResult>('/ia/extract-dossier', {
    method: 'POST',
    body: JSON.stringify({ dossierId }),
  });
}

/**
 * Mapping label modale → champ ExtractionDatesButoires.
 * Labels exacts utilisés dans DateButoireValidationModal.
 */
export const DATE_LABEL_TO_FIELD: Record<
  string,
  keyof ExtractionDatesButoires
> = {
  'SUIVI DE CHANTIER': 'suiviChantier',
  'RELEVE DE MESURES': 'releveMesures',
  'PLAN TECHNIQUE': 'planTechnique',
  'FICHE DE POSE': 'fichePose',
  'PERMIS DE CONSTRUIRE': 'permisConstruire',
};
