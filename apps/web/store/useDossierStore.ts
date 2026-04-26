/**
 * Store Dossiers — gestion des dossiers clients
 * États: EN COURS, URGENT, FINITION, A VALIDER, SIGNÉ, PERDU
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface DossierSigne extends Dossier {
  signedDate: string;
  dateSignature?: string;
  signedSubfolders: SubFolder[];
  montant?: number;
  montantEstime?: number;
  confirmations?: ConfirmationFournisseur[];
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

const SIGNED_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER AVANT VENTE' },
  { label: 'PROJET VERSION 3' },
  { label: 'SUIVI DE CHANTIER' },
  { label: 'RELEVE DE MESURES' },
  { label: 'PLAN TECHNIQUE DCE', alert: true },
  { label: 'COMMANDES', alert: true },
  { label: 'LIVRAISONS' },
  { label: 'FICHE DE POSE' },
  { label: 'PERMIS DE CONSTRUIRE' },
  { label: 'SAV' },
  { label: 'RECEPTION CHANTIER' },
];

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

  // Actions
  addDossier: (data: { lastName: string; firstName?: string; address?: string; siteAddress?: string; postalCode?: string; tva?: string; tauxTVA?: number; delaiChantier?: number; delaiChantierUnit?: 'days' | 'weeks'; phone?: string; email?: string; profession?: string | null }) => string;
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
  signerDossier: (id: string) => void;
  perdreDossier: (id: string, reason: string) => void;
  /**
   * Supprime définitivement un dossier (active, signé ou perdu) du store local.
   * En backend l'appel API est fait depuis useProjectActions.deleteProject.
   */
  deleteDossier: (id: string) => void;
  updateDateButoireSignee: (dossierId: string, label: string, date: string) => void;
  updateDossierSigneDateButoires: (dossierId: string, dateButoires: DossierSigne['dateButoires']) => void;
  setDatesButoiresSignes: (dossierId: string, dates: Record<string, string>) => void;
  addConfirmation: (dossierId: string, conf: Omit<ConfirmationFournisseur, 'id'>) => void;
  updateConfirmation: (dossierId: string, confId: string, data: Partial<ConfirmationFournisseur>) => void;
  deleteConfirmation: (dossierId: string, confId: string) => void;
  toggleConfirmationValidee: (dossierId: string, confId: string) => void;

  // Reset
  reset: () => void;
}

export const useDossierStore = create<DossierState>()(
  persist(
    (set, get) => ({
      dossiers: INITIAL_DOSSIERS,
      dossiersSignes: INITIAL_SIGNES,
      dossiersPerdus: INITIAL_PERDUS,
      datesButoiresSignes: {},

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
                ? { ...d, signedSubfolders: d.signedSubfolders.filter(sf => sf.label !== label) }
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
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId ? { ...d, signedSubfolders: [...d.signedSubfolders, { label, date }] } : d
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
              d.id === dossierId ? { ...d, signedSubfolders: d.signedSubfolders.map(toggle) } : d
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
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId ? { ...d, signedSubfolders: d.signedSubfolders.map(addDoc) } : d
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
              d.id === dossierId ? { ...d, signedSubfolders: d.signedSubfolders.map(rmDoc) } : d
            ),
          }));
        }
      },

      signerDossier: (id) => {
        const dossier = get().dossiers.find(d => d.id === id);
        if (!dossier) return;
        const signed: DossierSigne = {
          ...dossier,
          signedDate: new Date().toLocaleDateString('fr-FR'),
          signedSubfolders: SIGNED_SUBFOLDERS,
        };
        set(s => ({
          dossiers: s.dossiers.filter(d => d.id !== id),
          dossiersSignes: [signed, ...s.dossiersSignes],
        }));
      },

      perdreDossier: (id, reason) => {
        const dossier = get().dossiers.find(d => d.id === id);
        if (!dossier) return;
        const perdu: DossierPerdu = {
          id: 'p' + uid(),
          name: dossier.name,
          reason,
          lostDate: new Date().toLocaleDateString('fr-FR'),
          montantEstime: 0,
        };
        set(s => ({
          dossiers: s.dossiers.filter(d => d.id !== id),
          dossiersPerdus: [perdu, ...s.dossiersPerdus],
        }));
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
      },

      updateDossierSigneDateButoires: (dossierId, dateButoires) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId ? { ...d, dateButoires } : d
          ),
        }));
      },

      setDatesButoiresSignes: (dossierId, dates) => {
        set(s => ({
          datesButoiresSignes: {
            ...s.datesButoiresSignes,
            [dossierId]: dates,
          },
        }));
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
      },

      updateConfirmation: (dossierId, confId, data) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).map(c => c.id === confId ? { ...c, ...data } : c) }
              : d
          ),
        }));
      },

      deleteConfirmation: (dossierId, confId) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).filter(c => c.id !== confId) }
              : d
          ),
        }));
      },

      toggleConfirmationValidee: (dossierId, confId) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).map(c => c.id === confId ? { ...c, validee: !c.validee } : c) }
              : d
          ),
        }));
      },

      reset: () => set({
        dossiers: INITIAL_DOSSIERS,
        dossiersSignes: INITIAL_SIGNES,
        dossiersPerdus: INITIAL_PERDUS,
        datesButoiresSignes: {},
      }),
    }),
    { name: 'avra-dossier-store' }
  )
);

     