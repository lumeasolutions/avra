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
  /** Score 0-1 indiquant la confiance globale de l'IA dans son extraction. */
  confiance: number;
  /** Notes explicatives ou avertissements (max 500 chars). */
  notes: string;
}

/** Document textuel (PDF / DOCX / XLSX / TXT) envoyé à OpenAI. */
export interface ExtractionDocumentPayload {
  subfolder: string;
  docName: string;
  /** Type de source pour aider l'IA à contextualiser. */
  type: 'pdf' | 'docx' | 'xlsx' | 'text';
  text: string;
}

/** Image envoyée à OpenAI Vision (PNG / JPG / WEBP / GIF). */
export interface ExtractionImagePayload {
  subfolder: string;
  docName: string;
  mime: string;
  /** data:image/...;base64,... — encodé inline pour le message Vision. */
  dataUrl: string;
}
