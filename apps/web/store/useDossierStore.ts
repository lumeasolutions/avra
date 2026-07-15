/**
 * Store Dossiers — gestion des dossiers clients
 * États: EN COURS, URGENT, FINITION, A VALIDER, SIGNÉ, PERDU
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORE_VERSION, preservingMigrate } from './persistVersioning';
import { SEP, isDescendant } from '@/lib/folderTree';

// Types (extraits du store global)
export type DossierStatus = 'URGENT' | 'EN COURS' | 'FINITION' | 'A VALIDER';

/**
 * Document stocké dans un sous-dossier.
 * Les documents hérités des anciennes versions peuvent être
 * de simples chaînes (nom seul) — on accepte donc `string | DocumentFile`.
 */
export interface DocumentFile {
  name: string;
  /** MIME type (ex: "image/png", "application/pdf") */
  type?: string;
  /** Taille en octets */
  size?: number;
  /** Contenu base64 data URL (fallback local). */
  dataUrl?: string;
  /** URL publique (Supabase Storage ou autre CDN) — préférée à dataUrl si présente. */
  url?: string;
  /** Clé / chemin du fichier dans le bucket (pour suppression). */
  storagePath?: string;
  /** Bucket Supabase où le fichier est stocké. */
  bucket?: string;
  /** Identifiant DossierDocument côté API (source de vérité). */
  docId?: string;
  addedAt?: string;
}

export type SubFolderDocument = DocumentFile | string;

export interface SubFolder {
  label: string;
  date?: string;
  /**
   * Alerte manuelle (backward-compat). L'alerte est désormais
   * dérivée dynamiquement de `documents.length === 0` au rendu.
   */
  alert?: boolean;
  icon?: string;
  /** Documents présents dans le sous-dossier (objets avec dataUrl, ou chaînes legacy). */
  documents?: SubFolderDocument[];
  /** Sous-dossier marqué comme validé par l'utilisateur. */
  validated?: boolean;
}

export interface Dossier {
  id: string;
  name: string;
  firstName?: string;
  address?: string;
  siteAddress?: string;
  postalCode?: string;
  tva?: string;
  tauxTVA?: number;
  delaiChantier?: number;
  delaiChantierUnit?: 'days' | 'weeks';
  phone?: string;
  email?: string;
  status: DossierStatus;
  createdAt: string;
  subfolders: SubFolder[];
  notes?: string;
  /**
   * Vendeur attribué au dossier (snapshot du nom). Utilisé par le TABLEAU 3
   * "Par vendeur" des statistiques (compte les dossiers en cours / signés /
   * perdus par vendeur). Optionnel — null/undefined = "Sans vendeur attribué".
   * Demande asso 19/05/2026.
   */
  vendeurName?: string;
  /**
   * Lignes prix achat/vente HT pour les stats (19/05/2026, demande asso).
   * Le gate /statistiques force la saisie sur les dossiers SIGNÉS. Depuis le
   * 26/05/2026, la saisie est aussi POSSIBLE (mais facultative) sur les
   * dossiers en cours et perdus via le bouton "+ Renseigner" du Tableau 1.
   */
  prixLignes?: DossierPrixLigne[];
}

/**
 * Entrée d'une "commande" dans le panneau ACCEDER de la modale validation.
 * Représente un fournisseur + sa date butoir pour un item de type 'access'
 * (COMMANDES, LIVRAISON…). Multiple entries possibles par item.
 */
export interface CommandeAccessEntry {
  id: string;
  fournisseur: string;
  dateButoir: string;
  /** Produit / désignation (optionnel — enrichi par l'extraction IA). */
  produit?: string;
  /** Montant HT en euros (optionnel). */
  montant?: number;
  /**
   * Ligne validée : commande passée / confirmation reçue / livraison faite.
   * Coché manuellement depuis le tableau de bord. Tant que false/undefined,
   * la date butoir peut générer une alerte (urgent / retard).
   */
  validee?: boolean;
}

export type CommandeType = 'STANDARD' | 'ELECTRO_DIRECT';

export interface ConfirmationFournisseur {
  id: string;
  fournisseur: string;
  produit: string;
  dateButoir: string;
  dateConfirmation?: string;
  validee: boolean;
  type: CommandeType;
  montant?: number;
  notes?: string;
}

/**
 * Une ligne de prix achat/vente saisie via le gate Statistiques.
 * Un dossier peut avoir plusieurs lignes (multi-fournisseurs : cuisine LEICHT,
 * granite LAPALMA, électroménager MIELE, etc.). Chaque ligne contribue à la
 * marge totale du dossier (somme des ventes − somme des achats).
 */
export interface DossierPrixLigne {
  /** Identifiant local (uniquement client, pas en DB). */
  id: string;
  /** Marque/fournisseur (LEICHT, LAPALMA, MARBRIER, BORA…). Saisie libre. */
  fournisseur: string;
  /** Désignation du produit/article (détail par produit issu de l'extraction IA). */
  produit?: string;
  /** Prix d'achat HT en euros (coût pour le pro). */
  prixAchatHT: number;
  /** Prix de vente HT en euros (facturé au client). */
  prixVenteHT: number;
}

export interface DossierSigne extends Dossier {
  signedDate: string;
  dateSignature?: string;
  signedSubfolders: SubFolder[];
  montant?: number;
  montantEstime?: number;
  confirmations?: ConfirmationFournisseur[];
  // prixLignes hérité de Dossier (étendu au type de base le 26/05/2026)
  /**
   * Dossier reporté du gate stats (StatsGate v2 — 26/05/2026).
   * Quand true, le dossier est exclu du gate bloquant mais reste visible dans
   * les stats avec un drapeau "données incomplètes". Permet de débloquer
   * l'accès aux tableaux quand un dossier historique n'a pas l'info dispo.
   */
  statsSkipped?: boolean;
  /**
   * Vendeur attribué au dossier (snapshot du nom, pas FK). Utilisé par le
   * TABLEAU 3 "Par vendeur" des statistiques. Optionnel — si absent, le
   * dossier apparaît dans une catégorie "Sans vendeur attribué".
   */
  vendeurName?: string;
  /**
   * Marque le chantier comme entièrement terminé (au-delà de la signature) :
   * pose finie, livraison effectuée, SAV à jour. C'est l'acte final côté pro
   * qui clôt le dossier visuellement (badge "DOSSIER TERMINÉ" sur la card).
   * Différent de `signedDate` (signature client) — peut survenir des semaines
   * voire des mois après.
   */
  terminated?: boolean;
  terminatedDate?: string;
  /**
   * Date d'archivage ISO (28/05/2026 - feature Archives).
   * Quand non-null, le dossier disparait de la liste /dossiers-signes
   * et n'apparait plus que dans Parametres -> Dossiers archives.
   * Sette automatiquement quand `terminated` passe a true,
   * efface quand on restaure depuis l'ecran Archives.
   */
  archivedAt?: string | null;
  dateButoires?: {
    suiviChantier?: string;
    releveMesures?: string;
    planTechnique?: string;
    fichePose?: string;
    permisConstruire?: string;
    sav?: string;
  };
}

export interface DossierPerdu {
  id: string;
  name: string;
  reason: string;
  lostDate: string;
  montantEstime?: number;
  /** Vendeur snapshot pour le TABLEAU 3 stats (19/05/2026). */
  vendeurName?: string;
  /**
   * Lignes prix achat/vente HT facultatives (26/05/2026).
   * Pour les dossiers perdus, la saisie est purement informative — utile pour
   * un post-mortem ("combien j'ai loupé ?").
   */
  prixLignes?: DossierPrixLigne[];
}

// Données initiales — sous-dossiers par défaut selon la profession.
// Pour le portail menuisier on a un jeu volontairement simple :
// renseignement → relevé de mesure & photos existants → projet 1,
// puis l'utilisateur ajoute "projet 2", "projet 3"… via le bouton "+ Créer projet".
//
// Cuisiniste = workflow OPTION : 2 options par defaut, l'utilisateur peut
// monter jusqu'a OPTION 5 via le bouton +.
// Architecte = workflow simplifie : 1 APS + 1 APD, jusqu'a 5 versions par phase.
const DEFAULT_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER RENSEIGNEMENT' },
  { label: 'ETAT DES LIEUX – PHOTOS EXISTANTS' },
  { label: 'RELEVE DE MESURES' },
  { label: 'OPTION 1' },
  { label: 'OPTION 2' },
];

export const ARCHITECTE_DEFAULT_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER RENSEIGNEMENT' },
  { label: 'ETAT DES LIEUX – PHOTOS EXISTANTS' },
  { label: 'RELEVE DE MESURES' },
  { label: 'PROJET VERSION 1 – APS' },
  { label: 'PROJET VERSION 1 – APD' },
];

export const MENUISIER_DEFAULT_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER RENSEIGNEMENT' },
  { label: 'ETAT DES LIEUX – PHOTOS EXISTANTS' },
  { label: 'RELEVE DE MESURES' },
  { label: 'PROJET 1' },
];

/** Regex pour détecter les sous-dossiers "PROJET N" (menuisier) */
export const MENUISIER_PROJET_REGEX = /^PROJET\s+(\d+)$/i;

/**
 * Regex pour détecter les sous-dossiers "PROJET VERSION N – APS" / "– APD" (architecte).
 * Capture : groupe 1 = numéro de version, groupe 2 = phase (APS|APD).
 * Tolère le tiret simple (-) ou em dash (–).
 */
export const ARCHITECTE_PROJET_VERSION_REGEX = /^PROJET\s+VERSION\s+(\d+)\s*[–—-]\s*(APS|APD)$/i;
/** Plafond de versions par phase (APS et APD) côté architecte. */
export const ARCHITECTE_MAX_VERSION = 5;

/** Regex pour détecter les sous-dossiers "OPTION N" (cuisiniste). */
export const CUISINISTE_OPTION_REGEX = /^OPTION\s+(\d+)$/i;
/** Plafond d'options côté cuisiniste. */
export const CUISINISTE_MAX_OPTION = 5;

/** Retourne le jeu par défaut de sous-dossiers selon la profession */
export function getDefaultSubfoldersForProfession(profession?: string | null): SubFolder[] {
  if (profession === 'menuisier') return MENUISIER_DEFAULT_SUBFOLDERS;
  if (profession === 'architecte') return ARCHITECTE_DEFAULT_SUBFOLDERS;
  return DEFAULT_SUBFOLDERS;
}

export const SIGNED_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER AVANT VENTE' },
  { label: 'PROJET VERSION 3' },
  { label: 'SUIVI DE CHANTIER' },
  { label: 'RELEVE DE MESURES' },
  { label: 'PLAN TECHNIQUE DCE', alert: true },
  { label: 'COMMANDES', alert: true },
  { label: 'BON DE LIVRAISON' },
  { label: 'FICHE DE POSE' },
  { label: 'PERMIS DE CONSTRUIRE' },
  { label: 'SAV' },
  { label: 'RECEPTION CHANTIER' },
];

/**
 * Sous-dossiers signés spécifiques au métier MENUISIER.
 * Ordre figé d'après la maquette validée par le client (DOSSIER SIGNE 5).
 *
 * "DOSSIER AVANT VENTE" agit comme une archive : à la signature, on y déplace
 * tous les sous-dossiers et documents qui étaient dans le dossier en cours
 * (DOSSIER RENSEIGNEMENT, ÉTAT DES LIEUX, RELEVE DE MESURES, PROJET 1..N…).
 * Les autres labels sont des étapes de production menuiserie.
 *
 * Le label "PROJET VALIDÉ" est un placeholder — `signerDossier` le réécrit en
 * "PROJET <N> VALIDÉ" en se basant sur le numéro du dernier PROJET du dossier.
 */
export const MENUISIER_SIGNED_SUBFOLDERS: SubFolder[] = [
  { label: 'AVANT VENTE' },
  { label: 'PROJET VALIDÉ' },
  // 05/05/2026 — MODIFICATIONS remonté en 3e position : le menuisier consulte
  // les modifications demandées par le client tout de suite après signature
  // (avant de lancer le relevé sur mesure et la fabrication).
  { label: 'MODIFICATIONS' },
  { label: 'RELEVÉ DE MESURE' },
  { label: 'DÉBIT / LISTE MATÉRIAUX' },
  { label: 'FABRICATION' },
  { label: 'LANCEMENT' },
  { label: 'COMMANDES FOURNISSEURS' },
  { label: 'CONFIRMATIONS / COMMANDE' },
  { label: 'FICHE DE POSE' },
  { label: 'BON DE LIVRAISON' },
  { label: 'SAV' },
];

/**
 * Sous-dossiers signés spécifiques au métier CUISINISTE.
 * Ordre figé d'après la maquette validée par le client (MODULE CUISINISTE).
 *
 * Même principe que MENUISIER : "AVANT VENTE" archive tous les sous-dossiers
 * et documents du dossier en cours. "OPTION VALIDÉE" est réécrit en
 * "OPTION <N> VALIDÉE" en se basant sur le numéro de la dernière OPTION.
 */
export const CUISINISTE_SIGNED_SUBFOLDERS: SubFolder[] = [
  { label: 'AVANT VENTE' },
  { label: 'OPTION VALIDÉE' },
  // 05/05/2026 — MODIFICATIONS en 3e position (cohérent avec menuisier).
  // Le cuisiniste consulte les modifications demandées par le client juste
  // après signature (avant relevé définitif et commandes).
  { label: 'MODIFICATIONS' },
  { label: 'RELEVÉ DÉFINITIF' },
  { label: 'COMMANDE' },
  { label: 'CONFIRMATIONS / FACTURES ACHATS' },
  { label: 'BON DE LIVRAISON' },
  { label: 'FICHE DE POSE' },
  { label: 'SAV' },
];

/**
 * Sous-dossiers signés spécifiques au métier ARCHITECTE D'INTÉRIEUR.
 * Ordre figé d'après la maquette validée par le client (MODULE ARCHITECTE).
 *
 * "AVANT VENTE" archive tous les sous-dossiers du dossier en cours.
 * "APD VERSION VALIDÉE" est réécrit en "APD VERSION <N> (DOSSIER SIGNÉ)" en
 * se basant sur le numéro de la dernière APD trouvée dans le dossier source.
 */
export const ARCHITECTE_SIGNED_SUBFOLDERS: SubFolder[] = [
  { label: 'AVANT VENTE' },
  { label: 'APD VERSION VALIDÉE' },
  // 05/05/2026 — DOSSIER MODIFICATIONS remonté en 3e position (sous APD).
  // Cohérent avec menuisier (MODIFICATIONS en 3e) et cuisiniste : l'architecte
  // consulte les modifications client tout de suite après l'APD validé,
  // avant les démarches administratives (permis, DCE, marché).
  { label: 'DOSSIER MODIFICATIONS' },
  { label: 'PERMIS DE CONSTRUIRE' },
  { label: 'DCE' },
  { label: 'MARCHÉ / SIGNATURES' },
  { label: 'COMMANDES FOURNISSEURS' },
  { label: 'CONFIRMATIONS / FACTURES ACHATS FOURNISSEURS' },
  { label: 'BON DE LIVRAISON' },
  { label: 'SUIVI DE CHANTIER' },
  { label: 'RÉCEPTION SAV' },
];

/**
 * Une option/projet/version sélectionnée par l'utilisateur au moment de la
 * validation. `sourceLabel` est le label exact du sous-dossier source
 * (ex "OPTION 1", "PROJET 2", "PROJET VERSION 3 – APD"). `customName`,
 * optionnel, est ajouté au label final du sous-dossier signé pour
 * différencier visuellement les options multiples
 * (ex "CUISINE" → "OPTION 1 CUISINE VALIDÉE").
 */
export interface ValidatedOptionSelection {
  sourceLabel: string;
  customName?: string;
  /**
   * Chemins COMPLETS des sous-dossiers imbriqués (ex "PROJET VERSION 1 – APD ▸ APD 1")
   * à inclure sous le dossier validé, en préservant la hiérarchie + les docs.
   * - undefined / vide → tout le dossier (tous les sous-dossiers imbriqués).
   * - liste → seulement ces sous-dossiers (et leurs propres descendants).
   */
  includeSubPaths?: string[];
}

/**
 * Construit les sous-dossiers d'un DossierSigne selon la profession.
 *
 * Pour MENUISIER / CUISINISTE / ARCHITECTE : "AVANT VENTE" reçoit en archive
 * les documents du dossier en cours, et la (les) option(s) sélectionnée(s)
 * deviennent chacune un sous-dossier validé dédié contenant les documents
 * originaux de l'option source.
 *
 * 19/05/2026 — Support multi-options : si `selectedOptions` est fourni avec
 * plusieurs entrées, on génère un sous-dossier "X VALIDÉE" par entrée à la
 * place du placeholder unique ("OPTION VALIDÉE", "PROJET VALIDÉ",
 * "APD VERSION VALIDÉE"). Si non fourni, fallback historique (dernière option
 * trouvée par regex).
 */
export function buildSignedSubfoldersForProfession(
  source: Dossier,
  profession?: string | null,
  selectedOptions?: ValidatedOptionSelection[],
): SubFolder[] {
  if (
    profession !== 'menuisier' &&
    profession !== 'cuisiniste' &&
    profession !== 'architecte'
  ) {
    return SIGNED_SUBFOLDERS;
  }

  // ─── Helper interne : clone un document (string ou objet) ──────────────
  const cloneDoc = (d: SubFolderDocument): DocumentFile =>
    typeof d === 'string' ? { name: d } : { ...d };

  // ─── Étape 1 : archive AVANT VENTE (navigable) ─────────────────────────
  // On recopie l'INTÉGRALITÉ du dossier en cours (tous les sous-dossiers +
  // documents) SOUS le dossier "AVANT VENTE", en PRÉSERVANT la hiérarchie
  // (chemins "AVANT VENTE ▸ …"). Résultat : un dossier d'archive NAVIGABLE
  // dans le dossier signé où l'on retrouve tout l'avant-vente d'un coup
  // (y compris les options non retenues) — sans avoir à chercher partout.
  // NB : le projet validé reste STRICT (uniquement la sélection). L'archive,
  // elle, conserve tout.
  const archiveSubfolders: SubFolder[] = [
    { label: 'AVANT VENTE', documents: [] },
    ...(source.subfolders ?? []).map((sf) => ({
      label: `AVANT VENTE${SEP}${sf.label}`,
      documents: (sf.documents ?? []).map(cloneDoc),
    })),
  ];

  // Construit le dossier validé + ses SOUS-DOSSIERS IMBRIQUÉS sélectionnés, en
  // préservant la hiérarchie et en copiant les documents. Retourne la liste à
  // plat (labels = chemins complets avec le séparateur ▸).
  //   - opt.includeSubPaths vide/undefined → tout le dossier (tous descendants).
  //   - sinon → seulement les sous-dossiers cochés (+ leurs propres descendants).
  const buildNestedForOption = (
    opt: ValidatedOptionSelection,
    finalParentLabel: string,
  ): SubFolder[] => {
    const allSubs = source.subfolders ?? [];
    const src = allSubs.find((sf) => sf.label === opt.sourceLabel);
    const out: SubFolder[] = [{ label: finalParentLabel, documents: (src?.documents ?? []).map(cloneDoc) }];
    const descendants = allSubs.filter((sf) => isDescendant(sf.label, opt.sourceLabel));
    const sel = opt.includeSubPaths;
    // undefined → tout le dossier ; [] → aucun sous-dossier (parent seul) ;
    // liste → seulement ces sous-dossiers (+ leurs propres descendants).
    const included = sel === undefined
      ? descendants
      : descendants.filter((sf) => sel.some((p) => sf.label === p || isDescendant(sf.label, p)));
    for (const d of included) {
      const rel = d.label.slice(opt.sourceLabel.length + SEP.length);
      out.push({ label: `${finalParentLabel}${SEP}${rel}`, documents: (d.documents ?? []).map(cloneDoc) });
    }
    return out;
  };

  // Label du dossier validé pour menuisier / cuisiniste (suffixe VALIDÉ/VALIDÉE).
  const suffixLabel = (opt: ValidatedOptionSelection, suffix: 'VALIDÉE' | 'VALIDÉ'): string => {
    const base = opt.sourceLabel.trim();
    const c = opt.customName?.trim();
    return c ? `${base} ${c.toUpperCase()} ${suffix}` : `${base} ${suffix}`;
  };

  // ─── Sous-dossiers FACTURES / ACHATS FOURNISSEURS ──────────────────────────
  // Les modèles de dossier signé contiennent des placeholders VIDES
  // (« COMMANDES FOURNISSEURS », « CONFIRMATIONS / FACTURES ACHATS »…). On les
  // remplace par les vrais sous-dossiers du dossier (AVEC leurs documents) pour
  // qu'ils apparaissent dans la case « Confirmations validées » du gate stats,
  // en symétrie du devis. Si le dossier n'a pas de factures, on garde les
  // placeholders vides (comportement inchangé).
  const FOURN_RE = /CONFIRMATION|COMMANDE|FOURNISSEUR|ARTISAN|FACTURE.*ACHAT/i;
  const fournisseurSubfolders: SubFolder[] = (source.subfolders ?? [])
    .filter((sf) => FOURN_RE.test(sf.label) && (sf.documents?.length ?? 0) > 0)
    .map((sf) => ({ label: sf.label, documents: (sf.documents ?? []).map(cloneDoc) }));

  // ─── Étape 2 : aiguillage par profession ───────────────────────────────
  if (profession === 'menuisier') {
    // Determination des options a valider :
    //  - selectedOptions fourni : on l'utilise tel quel
    //  - sinon (fallback retro-compat) : dernier "PROJET N" trouve
    let optionsToValidate: ValidatedOptionSelection[];
    if (selectedOptions && selectedOptions.length > 0) {
      optionsToValidate = selectedOptions;
    } else {
      let bestVersion = 0;
      let bestLabel: string | null = null;
      for (const sf of source.subfolders ?? []) {
        const m = sf.label.match(MENUISIER_PROJET_REGEX);
        if (m) {
          const n = parseInt(m[1], 10);
          if (Number.isFinite(n) && n > bestVersion) {
            bestVersion = n;
            bestLabel = sf.label;
          }
        }
      }
      optionsToValidate = bestLabel ? [{ sourceLabel: bestLabel }] : [];
    }

    const validatedSubfolders = optionsToValidate.flatMap((opt) =>
      buildNestedForOption(opt, suffixLabel(opt, 'VALIDÉ')),
    );
    if (validatedSubfolders.length === 0) {
      // Aucune option detectee : on conserve le placeholder MENUISIER d'origine
      validatedSubfolders.push({ label: 'PROJET VALIDÉ' });
    }

    return MENUISIER_SIGNED_SUBFOLDERS.flatMap((sf) => {
      if (sf.label === 'AVANT VENTE') return archiveSubfolders;
      if (sf.label === 'PROJET VALIDÉ') return validatedSubfolders;
      if (FOURN_RE.test(sf.label) && fournisseurSubfolders.length > 0) return [];
      return [{ ...sf }];
    }).concat(fournisseurSubfolders);
  }

  if (profession === 'cuisiniste') {
    let optionsToValidate: ValidatedOptionSelection[];
    if (selectedOptions && selectedOptions.length > 0) {
      optionsToValidate = selectedOptions;
    } else {
      let bestOption = 0;
      let bestLabel: string | null = null;
      for (const sf of source.subfolders ?? []) {
        const m = sf.label.match(CUISINISTE_OPTION_REGEX);
        if (m) {
          const n = parseInt(m[1], 10);
          if (Number.isFinite(n) && n > bestOption) {
            bestOption = n;
            bestLabel = sf.label;
          }
        }
      }
      optionsToValidate = bestLabel ? [{ sourceLabel: bestLabel }] : [];
    }

    const validatedSubfolders = optionsToValidate.flatMap((opt) =>
      buildNestedForOption(opt, suffixLabel(opt, 'VALIDÉE')),
    );
    if (validatedSubfolders.length === 0) {
      validatedSubfolders.push({ label: 'OPTION VALIDÉE' });
    }

    return CUISINISTE_SIGNED_SUBFOLDERS.flatMap((sf) => {
      if (sf.label === 'AVANT VENTE') return archiveSubfolders;
      if (sf.label === 'OPTION VALIDÉE') return validatedSubfolders;
      if (FOURN_RE.test(sf.label) && fournisseurSubfolders.length > 0) return [];
      return [{ ...sf }];
    }).concat(fournisseurSubfolders);
  }

  // profession === 'architecte'
  let optionsToValidate: ValidatedOptionSelection[];
  if (selectedOptions && selectedOptions.length > 0) {
    optionsToValidate = selectedOptions;
  } else {
    let bestApd = 0;
    let bestLabel: string | null = null;
    for (const sf of source.subfolders ?? []) {
      const m = sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX);
      if (m && m[2].toUpperCase() === 'APD') {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > bestApd) {
          bestApd = n;
          bestLabel = sf.label;
        }
      }
    }
    optionsToValidate = bestLabel ? [{ sourceLabel: bestLabel }] : [];
  }

  // Pour l'architecte, on conserve le formatage historique
  // "APD VERSION N (DOSSIER SIGNÉ)" en remplacant le suffixe via une
  // construction custom (le helper generique ne convient pas).
  const architecteLabel = (opt: ValidatedOptionSelection): string => {
    const m = opt.sourceLabel.match(ARCHITECTE_PROJET_VERSION_REGEX);
    const baseLabel = m
      ? `APD VERSION ${m[1]} (DOSSIER SIGNÉ)`
      : `${opt.sourceLabel} VALIDÉ (DOSSIER SIGNÉ)`;
    const cleanCustom = opt.customName?.trim();
    return cleanCustom ? `${baseLabel} — ${cleanCustom.toUpperCase()}` : baseLabel;
  };

  const architecteValidatedSubfolders =
    optionsToValidate.length > 0
      ? optionsToValidate.flatMap((opt) => buildNestedForOption(opt, architecteLabel(opt)))
      : [{ label: 'APD VERSION VALIDÉE (DOSSIER SIGNÉ)' } as SubFolder];

  return ARCHITECTE_SIGNED_SUBFOLDERS.flatMap((sf) => {
    if (sf.label === 'AVANT VENTE') return archiveSubfolders;
    if (sf.label === 'APD VERSION VALIDÉE') return architecteValidatedSubfolders;
    if (FOURN_RE.test(sf.label) && fournisseurSubfolders.length > 0) return [];
    return [{ ...sf }];
  }).concat(fournisseurSubfolders);
}

// Données initiales — vides. Les vraies données viennent de l'API via useDataSync.
const INITIAL_DOSSIERS: Dossier[] = [];
const INITIAL_SIGNES: DossierSigne[] = [];
const INITIAL_PERDUS: DossierPerdu[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

interface DossierState {
  // Data
  dossiers: Dossier[];
  dossiersSignes: DossierSigne[];
  dossiersPerdus: DossierPerdu[];
  datesButoiresSignes: Record<string, Record<string, string>>;
  /**
   * Drapeau « étape validée (faite) » par échéance, INDÉPENDANT de la date.
   * true = faite, false = échéance réelle non faite (→ peut être en retard),
   * undefined = legacy (avant la separation echeance/validé) → traité comme fait
   * pour ne pas generer de faux retards sur l'historique.
   */
  echeancesValidees: Record<string, Record<string, boolean>>;
  /**
   * Commandes saisies via le panneau ACCEDER de la modale validation.
   * Indexé par dossierId puis par label d'item access (COMMANDES, LIVRAISON…).
   * Chaque entrée = un fournisseur + une date butoir.
   */
  commandesAccess: Record<string, Record<string, CommandeAccessEntry[]>>;

  // Actions
  addDossier: (data: { lastName: string; firstName?: string; address?: string; siteAddress?: string; postalCode?: string; tva?: string; tauxTVA?: number; delaiChantier?: number; delaiChantierUnit?: 'days' | 'weeks'; phone?: string; email?: string; profession?: string | null; vendeurName?: string }) => string;
  removeSubfolder: (dossierId: string, label: string) => void;
  updateDossierStatus: (id: string, status: DossierStatus) => void;
  updateDossierNotes: (id: string, notes: string) => void;
  addSubfolder: (dossierId: string, label: string) => void;
  toggleSubfolderValidated: (dossierId: string, label: string) => void;
  addDocumentToSubfolder: (dossierId: string, label: string, doc: SubFolderDocument) => void;
  removeDocumentFromSubfolder: (dossierId: string, label: string, docName: string) => void;
  /**
   * Complète un dossier existant avec les sous-dossiers par défaut manquants
   * (backfill pour les dossiers créés avant l'ajout des defaults).
   */
  ensureDefaultSubfolders: (dossierId: string, profession?: string | null) => void;
  /**
   * Signe un dossier — le déplace de `dossiers` vers `dossiersSignes`.
   * @param profession sert à choisir le bon set de sous-dossiers signés
   *   (MENUISIER_SIGNED_SUBFOLDERS si 'menuisier', sinon SIGNED_SUBFOLDERS).
   */
  signerDossier: (id: string, profession?: string | null, selectedOptions?: ValidatedOptionSelection[]) => void;
  /**
   * Marque un dossier signé comme entièrement terminé (chantier fini,
   * livraison faite, SAV à jour). L'inverse rebascule en "actif".
   */
  toggleDossierTermine: (id: string) => void;
  /**
   * Restaure un dossier archive : efface archivedAt + terminated.
   * Utilise par le bouton "Restaurer" de Parametres -> Dossiers archives
   * (28/05/2026).
   */
  restoreDossierSigne: (id: string) => void;
  // ─── Stats : prix achat / vente par dossier signé (19/05/2026, demande asso)
  /** Ajoute une ligne (fournisseur + achat HT + vente HT) sur un DossierSigne. */
  addDossierPrixLigne: (dossierId: string, ligne: Omit<DossierPrixLigne, 'id'>) => void;
  /** Met à jour une ligne existante (édition inline). */
  updateDossierPrixLigne: (dossierId: string, ligneId: string, patch: Partial<Omit<DossierPrixLigne, 'id'>>) => void;
  /** Retire une ligne par id. */
  removeDossierPrixLigne: (dossierId: string, ligneId: string) => void;
  /**
   * Ajoute plusieurs lignes d'un coup (auto-import depuis confirmations).
   * Utilisé par StatsGate v2 pour le bouton "Importer X confirmations".
   */
  addDossierPrixLignesBulk: (dossierId: string, lignes: Omit<DossierPrixLigne, 'id'>[]) => void;
  /**
   * Marque/démarque un dossier comme "reporté" sur le gate stats.
   * Un dossier reporté est exclu du gate bloquant — l'utilisateur peut
   * accéder aux stats même si ce dossier n'a pas de prixLignes.
   */
  setDossierStatsSkipped: (dossierId: string, skipped: boolean) => void;
  /** Set le vendeur attribué (sur Dossier, DossierSigne ou DossierPerdu). */
  setDossierVendeur: (dossierId: string, vendeurName: string | null) => void;
  // ─── Commandes ACCESS (panneau ACCEDER de la modale validation) ─────────
  addCommandeAccess: (dossierId: string, label: string, entry: Omit<CommandeAccessEntry, 'id'>) => void;
  updateCommandeAccess: (dossierId: string, label: string, entryId: string, patch: Partial<Omit<CommandeAccessEntry, 'id'>>) => void;
  removeCommandeAccess: (dossierId: string, label: string, entryId: string) => void;
  perdreDossier: (id: string, reason: string) => void;
  /** Restaure un dossier perdu : le retire de dossiersPerdus (le backend le
   *  repasse en actif, la resync le replace dans "en cours"). */
  restaurerDossierPerdu: (id: string) => void;
  /**
   * Supprime définitivement un dossier (active, signé ou perdu) du store local.
   * En backend l'appel API est fait depuis useProjectActions.deleteProject.
   */
  deleteDossier: (id: string) => void;
  updateDateButoireSignee: (dossierId: string, label: string, date: string) => void;
  updateDossierSigneDateButoires: (dossierId: string, dateButoires: DossierSigne['dateButoires']) => void;
  setDatesButoiresSignes: (dossierId: string, dates: Record<string, string>) => void;
  /** Marque une étape faite (true) ou non faite (false). */
  setEcheanceValidee: (dossierId: string, label: string, validated: boolean) => void;
  addConfirmation: (dossierId: string, conf: Omit<ConfirmationFournisseur, 'id'>) => void;
  updateConfirmation: (dossierId: string, confId: string, data: Partial<ConfirmationFournisseur>) => void;
  deleteConfirmation: (dossierId: string, confId: string) => void;
  toggleConfirmationValidee: (dossierId: string, confId: string) => void;

  // Reset
  reset: () => void;
}

// ── VAGUE 2 (28/05/2026) — sync backend des données métier dossier ──────────
// Push optimiste (fire-and-forget) vers PATCH /projects/:id/dossier-data.
// Skip les ids local-only (pas encore en DB) et le SSR. En cas d'echec on
// laisse tomber : le prochain reload re-sync via useDataSync.
function isPersistableId(id: string): boolean {
  return /^c[0-9a-z]{24}$/.test(id) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function pushDossierData(get: () => DossierState, dossierId: string): void {
  if (typeof window === 'undefined') return;
  if (!isPersistableId(dossierId)) return;
  const s = get();
  const d =
    s.dossiers.find((x) => x.id === dossierId) ??
    s.dossiersSignes.find((x) => x.id === dossierId) ??
    s.dossiersPerdus.find((x) => x.id === dossierId);
  if (!d) return;
  const dd = d as any;
  const payload: Record<string, unknown> = {
    prixLignes: dd.prixLignes ?? [],
    vendeurName: dd.vendeurName ?? null,
    statsSkipped: !!dd.statsSkipped,
    terminated: !!dd.terminated,
    archivedAt: dd.archivedAt ?? null,
    // terminatedAt ISO = meme instant que archivedAt quand termine
    terminatedAt: dd.archivedAt ?? null,
    confirmations: dd.confirmations ?? [],
    // dateButoires : soit sur le dossier, soit dans la map dediee
    dateButoires: dd.dateButoires ?? s.datesButoiresSignes?.[dossierId] ?? null,
    // VAGUE 3 : état complet du tableau de bord (dates + validations + lignes).
    dossierBoard: {
      dates: s.datesButoiresSignes?.[dossierId] ?? {},
      validees: s.echeancesValidees?.[dossierId] ?? {},
      commandes: s.commandesAccess?.[dossierId] ?? {},
    },
  };
  void import('@/lib/api')
    .then(({ api }) =>
      api(`/projects/${dossierId}/dossier-data`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    )
    .catch(() => { /* fire-and-forget */ });
}

/**
 * Migration v2 — retire le sous-dossier « DEVIS ARTISANS » (et ses éventuels
 * enfants imbriqués) de TOUS les dossiers existants. Il a été supprimé des
 * templates par défaut ; cette migration nettoie les dossiers déjà créés en
 * local (les sous-dossiers ne vivent qu'en local, cf. persistVersioning.ts).
 */
function stripDevisArtisansSubfolder(state: unknown): DossierState {
  const s = (state ?? {}) as DossierState;
  const isDevisArtisans = (label: string) => {
    const l = (label ?? '').trim().toUpperCase();
    return l === 'DEVIS ARTISANS' || l.startsWith('DEVIS ARTISANS ▸');
  };
  const cleanSubs = (subs?: SubFolder[]): SubFolder[] =>
    (subs ?? []).filter((sf) => !isDevisArtisans(sf.label));
  return {
    ...s,
    dossiers: (s.dossiers ?? []).map((d) => ({ ...d, subfolders: cleanSubs(d.subfolders) })),
    dossiersSignes: (s.dossiersSignes ?? []).map((d) => ({ ...d, subfolders: cleanSubs(d.subfolders) })),
    dossiersPerdus: (s.dossiersPerdus ?? []).map((d) => ({ ...d, subfolders: cleanSubs(d.subfolders) })),
  };
}

export const useDossierStore = create<DossierState>()(
  persist(
    (set, get) => ({
      dossiers: INITIAL_DOSSIERS,
      dossiersSignes: INITIAL_SIGNES,
      dossiersPerdus: INITIAL_PERDUS,
      datesButoiresSignes: {},
      echeancesValidees: {},
      commandesAccess: {},

      addDossier: (data) => {
        const id = 'd' + uid();
        const name = data.lastName.trim();
        const newDossier: Dossier = {
          id,
          name,
          firstName: data.firstName,
          address: data.address,
          siteAddress: data.siteAddress,
          postalCode: data.postalCode,
          tva: data.tva,
          tauxTVA: data.tauxTVA,
          delaiChantier: data.delaiChantier,
          delaiChantierUnit: data.delaiChantierUnit,
          phone: data.phone,
          email: data.email,
          status: 'EN COURS',
          createdAt: new Date().toLocaleDateString('fr-FR'),
          subfolders: getDefaultSubfoldersForProfession(data.profession).map(sf => ({ ...sf })),
          // Multi-vendeur (26/05/2026) : auto-assign à la création.
          // Le caller passe le nom du user connecté (récupéré depuis useAuthStore).
          // Si non fourni, le dossier reste "Sans vendeur attribué" jusqu'à
          // réassignation manuelle via VendeurAssignDropdown.
          vendeurName: data.vendeurName?.trim() || undefined,
        };
        set(s => ({ dossiers: [newDossier, ...s.dossiers] }));
        return id;
      },

      removeSubfolder: (dossierId, label) => {
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (inDossiers) {
          set(s => ({
            dossiers: s.dossiers.map(d =>
              d.id === dossierId
                ? { ...d, subfolders: d.subfolders.filter(sf => sf.label !== label) }
                : d,
            ),
          }));
        } else {
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId
                ? {
                    ...d,
                    subfolders: d.subfolders.filter(sf => sf.label !== label),
                    signedSubfolders: d.signedSubfolders.filter(sf => sf.label !== label),
                  }
                : d,
            ),
          }));
        }
      },

      updateDossierStatus: (id, status) => {
        set(s => ({ dossiers: s.dossiers.map(d => d.id === id ? { ...d, status } : d) }));
      },

      updateDossierNotes: (id, notes) => {
        set(s => ({ dossiers: s.dossiers.map(d => d.id === id ? { ...d, notes } : d) }));
      },

      addSubfolder: (dossierId, label) => {
        const date = new Date().toLocaleDateString('fr-FR');
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (inDossiers) {
          set(s => ({
            dossiers: s.dossiers.map(d =>
              d.id === dossierId ? { ...d, subfolders: [...d.subfolders, { label, date }] } : d
            ),
          }));
        } else {
          // Sync subfolders + signedSubfolders pour les dossiers signés
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId
                ? {
                    ...d,
                    subfolders: [...d.subfolders, { label, date }],
                    signedSubfolders: [...d.signedSubfolders, { label, date }],
                  }
                : d,
            ),
          }));
        }
      },

      toggleSubfolderValidated: (dossierId, label) => {
        const today = new Date().toLocaleDateString('fr-FR');
        const toggle = (sf: SubFolder): SubFolder =>
          sf.label === label ? { ...sf, validated: !sf.validated, date: today } : sf;
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (inDossiers) {
          set(s => ({
            dossiers: s.dossiers.map(d =>
              d.id === dossierId ? { ...d, subfolders: d.subfolders.map(toggle) } : d
            ),
          }));
        } else {
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId
                ? {
                    ...d,
                    subfolders: d.subfolders.map(toggle),
                    signedSubfolders: d.signedSubfolders.map(toggle),
                  }
                : d,
            ),
          }));
        }
      },

      addDocumentToSubfolder: (dossierId, label, doc) => {
        const today = new Date().toLocaleDateString('fr-FR');
        const normalized: SubFolderDocument =
          typeof doc === 'string'
            ? { name: doc, addedAt: today }
            : { ...doc, addedAt: doc.addedAt ?? today };
        const addDoc = (sf: SubFolder): SubFolder =>
          sf.label === label
            ? { ...sf, documents: [...(sf.documents ?? []), normalized], date: today }
            : sf;
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (inDossiers) {
          set(s => ({
            dossiers: s.dossiers.map(d =>
              d.id === dossierId ? { ...d, subfolders: d.subfolders.map(addDoc) } : d
            ),
          }));
        } else {
          // BUG FIX 04/05/2026 : pour un dossier signé, on doit mettre à jour
          // À LA FOIS subfolders ET signedSubfolders. La page /dossiers/[id]
          // affiche `dossier.subfolders` partout (>10 endroits) — sans mise à
          // jour des deux, le doc uploadé était stocké dans signedSubfolders
          // mais invisible côté UI car la modale lit subfolders.
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId
                ? {
                    ...d,
                    subfolders: d.subfolders.map(addDoc),
                    signedSubfolders: d.signedSubfolders.map(addDoc),
                  }
                : d,
            ),
          }));
        }
      },

      ensureDefaultSubfolders: (dossierId, profession) => {
        // Skip entierement si le dossier a deja des sous-dossiers : c'est l'utilisateur
        // qui gere sa liste (notamment en menuisier ou il peut avoir supprime des defaults).
        // Le backfill n'est utile que pour les tres vieux dossiers arrives avec une liste vide.
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (!inDossiers) return;
        const defaults = getDefaultSubfoldersForProfession(profession);
        set(s => ({
          dossiers: s.dossiers.map(d => {
            if (d.id !== dossierId) return d;
            if (d.subfolders.length > 0) return d; // respect choix utilisateur
            return { ...d, subfolders: defaults.map(sf => ({ ...sf })) };
          }),
        }));
      },

      removeDocumentFromSubfolder: (dossierId, label, docName) => {
        const today = new Date().toLocaleDateString('fr-FR');
        const docNameOf = (d: SubFolderDocument) => typeof d === 'string' ? d : d.name;
        const rmDoc = (sf: SubFolder): SubFolder =>
          sf.label === label
            ? { ...sf, documents: (sf.documents ?? []).filter(d => docNameOf(d) !== docName), date: today }
            : sf;
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (inDossiers) {
          set(s => ({
            dossiers: s.dossiers.map(d =>
              d.id === dossierId ? { ...d, subfolders: d.subfolders.map(rmDoc) } : d
            ),
          }));
        } else {
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId
                ? {
                    ...d,
                    subfolders: d.subfolders.map(rmDoc),
                    signedSubfolders: d.signedSubfolders.map(rmDoc),
                  }
                : d,
            ),
          }));
        }
      },

      signerDossier: (id, profession, selectedOptions) => {
        const dossier = get().dossiers.find(d => d.id === id);
        if (!dossier) return;
        // Liste profession-aware (architecte/menuisier/cuisiniste) avec
        // archive AVANT VENTE des documents du dossier en cours.
        // selectedOptions (19/05/2026) : liste des options validees par
        // l'utilisateur — chacune devient un sous-dossier dedie.
        const built = buildSignedSubfoldersForProfession(dossier, profession, selectedOptions);
        const signed: DossierSigne = {
          ...dossier,
          // FIX 30/04/2026 : on REMPLACE aussi `subfolders` par la nouvelle
          // liste signée. La page /dossiers/[id] affiche `dossier.subfolders`
          // (en > 10 endroits) — sans ce remplacement, le dossier signé
          // continuait d'afficher DOSSIER RENSEIGNEMENT / RELEVE DE MESURES /
          // PROJET VERSION 1 — APS / APD au lieu de AVANT VENTE / APD VERSION
          // N (DOSSIER SIGNÉ) / PERMIS DE CONSTRUIRE / DCE / etc.
          subfolders: built,
          signedSubfolders: built,
          signedDate: new Date().toLocaleDateString('fr-FR'),
        };
        set(s => ({
          dossiers: s.dossiers.filter(d => d.id !== id),
          dossiersSignes: [signed, ...s.dossiersSignes],
        }));
      },

      toggleDossierTermine: (id) => {
        const today = new Date().toLocaleDateString('fr-FR');
        const nowIso = new Date().toISOString();
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === id
              ? {
                  ...d,
                  terminated: !d.terminated,
                  terminatedDate: !d.terminated ? today : undefined,
                  // Archivage auto (28/05/2026) : terminer un dossier
                  // l'archive - il disparait de /dossiers-signes et n'est
                  // plus visible que dans Parametres -> Dossiers archives.
                  archivedAt: !d.terminated ? nowIso : null,
                }
              : d,
          ),
        }));
        pushDossierData(get, id);
      },

      /**
       * Restaure un dossier archive : efface `archivedAt` ET `terminated` ->
       * le dossier reapparait dans /dossiers-signes comme actif.
       * Action explicite declenchee depuis le bouton "Restaurer" de la
       * section Archives.
       */
      restoreDossierSigne: (id) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === id
              ? { ...d, archivedAt: null, terminated: false, terminatedDate: undefined }
              : d,
          ),
        }));
        pushDossierData(get, id);
      },

      // ── Stats : prix achat/vente, poly-collection (19/05/2026 + 26/05/2026)
      //   Initialement les actions ne traitaient que dossiersSignes. Depuis
      //   le 26/05/2026 elles parcourent aussi dossiers (en cours) et
      //   dossiersPerdus, pour permettre la saisie facultative sur ces
      //   catégories via le bouton "+ Renseigner" du Tableau 1 Statut.
      //   Le matching se fait par id, donc transparent — on patche dans la
      //   collection où le dossier est trouvé.
      addDossierPrixLigne: (dossierId, ligne) => {
        const id = 'prix_' + uid();
        set(s => ({
          dossiers:       s.dossiers.map(d =>       d.id === dossierId ? { ...d, prixLignes: [...(d.prixLignes ?? []), { ...ligne, id }] } : d),
          dossiersSignes: s.dossiersSignes.map(d => d.id === dossierId ? { ...d, prixLignes: [...(d.prixLignes ?? []), { ...ligne, id }] } : d),
          dossiersPerdus: s.dossiersPerdus.map(d => d.id === dossierId ? { ...d, prixLignes: [...(d.prixLignes ?? []), { ...ligne, id }] } : d),
        }));
        pushDossierData(get, dossierId);
      },

      updateDossierPrixLigne: (dossierId, ligneId, patch) => {
        const apply = <T extends { id: string; prixLignes?: DossierPrixLigne[] }>(arr: T[]): T[] =>
          arr.map(d => d.id === dossierId
            ? { ...d, prixLignes: (d.prixLignes ?? []).map(l => l.id === ligneId ? { ...l, ...patch } : l) }
            : d);
        set(s => ({
          dossiers:       apply(s.dossiers),
          dossiersSignes: apply(s.dossiersSignes),
          dossiersPerdus: apply(s.dossiersPerdus),
        }));
        pushDossierData(get, dossierId);
      },

      removeDossierPrixLigne: (dossierId, ligneId) => {
        const apply = <T extends { id: string; prixLignes?: DossierPrixLigne[] }>(arr: T[]): T[] =>
          arr.map(d => d.id === dossierId
            ? { ...d, prixLignes: (d.prixLignes ?? []).filter(l => l.id !== ligneId) }
            : d);
        set(s => ({
          dossiers:       apply(s.dossiers),
          dossiersSignes: apply(s.dossiersSignes),
          dossiersPerdus: apply(s.dossiersPerdus),
        }));
        pushDossierData(get, dossierId);
      },

      addDossierPrixLignesBulk: (dossierId, lignes) => {
        if (!lignes.length) return;
        const newLignes = lignes.map(l => ({ ...l, id: 'prix_' + uid() }));
        const apply = <T extends { id: string; prixLignes?: DossierPrixLigne[] }>(arr: T[]): T[] =>
          arr.map(d => d.id === dossierId
            ? { ...d, prixLignes: [...(d.prixLignes ?? []), ...newLignes] }
            : d);
        set(s => ({
          dossiers:       apply(s.dossiers),
          dossiersSignes: apply(s.dossiersSignes),
          dossiersPerdus: apply(s.dossiersPerdus),
        }));
        pushDossierData(get, dossierId);
      },

      setDossierStatsSkipped: (dossierId, skipped) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId ? { ...d, statsSkipped: skipped } : d,
          ),
        }));
        pushDossierData(get, dossierId);
      },

      setDossierVendeur: (dossierId, vendeurName) => {
        // Met à jour le vendeur sur le dossier où qu'il soit (en cours, signé, perdu)
        const v = vendeurName?.trim() || undefined;
        set(s => ({
          dossiers: s.dossiers.map(d => d.id === dossierId ? { ...d, vendeurName: v } : d),
          dossiersSignes: s.dossiersSignes.map(d => d.id === dossierId ? { ...d, vendeurName: v } : d),
          dossiersPerdus: s.dossiersPerdus.map(d => d.id === dossierId ? { ...d, vendeurName: v } : d),
        }));
        pushDossierData(get, dossierId);
      },

      addCommandeAccess: (dossierId, label, entry) => {
        const id = 'cmd_' + uid();
        set(s => {
          const dossierMap = { ...(s.commandesAccess[dossierId] ?? {}) };
          const labelList = [...(dossierMap[label] ?? []), { ...entry, id }];
          dossierMap[label] = labelList;
          return {
            commandesAccess: { ...s.commandesAccess, [dossierId]: dossierMap },
          };
        });
        pushDossierData(get, dossierId);
      },

      updateCommandeAccess: (dossierId, label, entryId, patch) => {
        set(s => {
          const dossierMap = { ...(s.commandesAccess[dossierId] ?? {}) };
          const labelList = (dossierMap[label] ?? []).map(e =>
            e.id === entryId ? { ...e, ...patch } : e,
          );
          dossierMap[label] = labelList;
          return {
            commandesAccess: { ...s.commandesAccess, [dossierId]: dossierMap },
          };
        });
        pushDossierData(get, dossierId);
      },

      removeCommandeAccess: (dossierId, label, entryId) => {
        set(s => {
          const dossierMap = { ...(s.commandesAccess[dossierId] ?? {}) };
          const labelList = (dossierMap[label] ?? []).filter(e => e.id !== entryId);
          dossierMap[label] = labelList;
          return {
            commandesAccess: { ...s.commandesAccess, [dossierId]: dossierMap },
          };
        });
        pushDossierData(get, dossierId);
      },

      perdreDossier: (id, reason) => {
        const dossier = get().dossiers.find(d => d.id === id);
        if (!dossier) return;
        const perdu: DossierPerdu = {
          // FONC 13/07/2026 — On CONSERVE l'id DB (cuid) au lieu de générer un
          // id local 'p'+uid(). Sinon `restaurerDossierPerdu` reçoit un id local,
          // `isLocalOnlyId` renvoie true, et la restauration n'est jamais
          // persistée côté backend (le dossier repassait perdu à la resync).
          id: dossier.id,
          name: dossier.name,
          reason,
          lostDate: new Date().toLocaleDateString('fr-FR'),
          montantEstime: (dossier as any).montant ?? (dossier as any).montantEstime ?? 0,
        };
        set(s => ({
          dossiers: s.dossiers.filter(d => d.id !== id),
          dossiersPerdus: [perdu, ...s.dossiersPerdus],
        }));
      },

      restaurerDossierPerdu: (id) => {
        set(s => ({ dossiersPerdus: s.dossiersPerdus.filter(d => d.id !== id) }));
      },

      deleteDossier: (id) => {
        set(s => ({
          dossiers: s.dossiers.filter(d => d.id !== id),
          dossiersSignes: s.dossiersSignes.filter(d => d.id !== id),
          dossiersPerdus: s.dossiersPerdus.filter(d => d.id !== id),
        }));
      },

      updateDateButoireSignee: (dossierId, label, date) => {
        set(s => ({
          datesButoiresSignes: {
            ...s.datesButoiresSignes,
            [dossierId]: { ...(s.datesButoiresSignes[dossierId] ?? {}), [label]: date },
          },
        }));
        pushDossierData(get, dossierId);
      },

      updateDossierSigneDateButoires: (dossierId, dateButoires) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId ? { ...d, dateButoires } : d
          ),
        }));
      },

      setDatesButoiresSignes: (dossierId, dates) => {
        set(s => {
          // Nouvelle echeance = NON validée par défaut ; on preserve les
          // validations existantes pour ce dossier.
          const flags: Record<string, boolean> = { ...(s.echeancesValidees[dossierId] ?? {}) };
          for (const label of Object.keys(dates)) {
            // SEUL le bouton « Validé » marque une étape faite. Le fait que la date
            // butoir soit déjà passée ne valide RIEN → elle reste "à valider" et
            // génère une alerte tant que l'utilisateur n'a pas cliqué Validé.
            if (flags[label] === undefined) flags[label] = false;
          }
          return {
            datesButoiresSignes: { ...s.datesButoiresSignes, [dossierId]: dates },
            echeancesValidees: { ...s.echeancesValidees, [dossierId]: flags },
          };
        });
        pushDossierData(get, dossierId);
      },

      setEcheanceValidee: (dossierId, label, validated) => {
        set(s => ({
          echeancesValidees: {
            ...s.echeancesValidees,
            [dossierId]: { ...(s.echeancesValidees[dossierId] ?? {}), [label]: validated },
          },
        }));
        pushDossierData(get, dossierId);
      },

      addConfirmation: (dossierId, conf) => {
        const newConf: ConfirmationFournisseur = { ...conf, id: 'cf' + uid() };
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: [...(d.confirmations ?? []), newConf] }
              : d
          ),
        }));
        pushDossierData(get, dossierId);
      },

      updateConfirmation: (dossierId, confId, data) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).map(c => c.id === confId ? { ...c, ...data } : c) }
              : d
          ),
        }));
        pushDossierData(get, dossierId);
      },

      deleteConfirmation: (dossierId, confId) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).filter(c => c.id !== confId) }
              : d
          ),
        }));
        pushDossierData(get, dossierId);
      },

      toggleConfirmationValidee: (dossierId, confId) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).map(c => c.id === confId ? { ...c, validee: !c.validee } : c) }
              : d
          ),
        }));
        // Persiste la validation en base (manquait — les autres actions
        // confirmation le faisaient déjà). Sans ça, valider une confirmation
        // n'était pas sauvegardé et disparaissait au rechargement.
        pushDossierData(get, dossierId);
      },

      reset: () => set({
        dossiers: INITIAL_DOSSIERS,
        dossiersSignes: INITIAL_SIGNES,
        dossiersPerdus: INITIAL_PERDUS,
        datesButoiresSignes: {},
        echeancesValidees: {},
        commandesAccess: {},
      }),
    }),
    {
      name: 'avra-dossier-store',
      version: STORE_VERSION,
      // v2 : retrait du sous-dossier « DEVIS ARTISANS » des dossiers existants.
      migrate: preservingMigrate<DossierState>({ 2: stripDevisArtisansSubfolder }),
    }
  )
);
