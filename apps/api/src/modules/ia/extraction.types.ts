/**
 * Types pour le module d'extraction documents IA.
 */

/** Mapping des 5 dates butoires standards. ISO date string ou null. */
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
  /** Score 0-1 indiquant la confiance globale de l'IA dans son extraction. */
  confiance: number;
  /** Notes explicatives ou avertissements (max 500 chars). */
  notes: string;
}

/** Document brut tel que passé à OpenAI. */
export interface ExtractionDocumentPayload {
  subfolder: string;
  docName: string;
  text: string;
}
