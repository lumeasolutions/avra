/**
 * statut-dossier-signe.ts — Le statut à afficher pour un dossier SIGNÉ.
 *
 * LE BUG (retour Cassandra, 24/09/2026)
 * -------------------------------------
 * Sur le tableau de bord, les dossiers signés portaient l'étiquette « EN
 * COURS » alors qu'un seul dossier était réellement en cours. Cause : au
 * moment de la signature, `signerDossier()` recopie le dossier tel quel et ne
 * touche pas à `status`. Un dossier qui était « EN COURS » avant la signature
 * garde donc cette valeur — laquelle décrit une étape de la phase AVANT-VENTE
 * et n'a plus aucun sens une fois le dossier signé.
 *
 * On ne réécrit pas `status` en base : la valeur d'origine reste utile (elle
 * dit où en était le dossier quand il a été signé), et la réécrire ne
 * corrigerait pas les dossiers déjà signés. On calcule donc le statut
 * d'affichage à partir de l'état réel du dossier signé.
 *
 * Les trois états d'un dossier signé, dans l'ordre de priorité :
 *   1. TERMINÉ  — chantier fini, marqué par `toggleDossierTermine`
 *   2. SAV      — au moins une confirmation fournisseur non validée
 *   3. SIGNÉ    — le cas courant
 */

export type StatutSigne = 'TERMINÉ' | 'SAV' | 'SIGNÉ';

interface DossierSigneMinimal {
  terminated?: boolean;
  confirmations?: Array<{ validee?: boolean }>;
}

export function statutSigne(d: DossierSigneMinimal): StatutSigne {
  if (d.terminated) return 'TERMINÉ';
  if ((d.confirmations ?? []).some(c => !c.validee)) return 'SAV';
  return 'SIGNÉ';
}

/** Couleurs des pastilles, alignées sur celles des portails. */
export function couleurStatutSigne(s: string): { bg: string; text: string } {
  switch (s) {
    case 'TERMINÉ': return { bg: '#ECEFF1', text: '#546E7A' };
    case 'SAV': return { bg: '#FFF3E0', text: '#E07B00' };
    case 'SIGNÉ': return { bg: '#E8F5E9', text: '#2E7D32' };
    default: return { bg: '#E5EDF5', text: '#1A3A5C' };
  }
}

/** Ordre d'affichage : ce qui demande une action d'abord. */
const ORDRE: Record<StatutSigne, number> = { SAV: 0, 'SIGNÉ': 1, 'TERMINÉ': 2 };

export function parStatutSigne(a: DossierSigneMinimal, b: DossierSigneMinimal): number {
  return ORDRE[statutSigne(a)] - ORDRE[statutSigne(b)];
}
