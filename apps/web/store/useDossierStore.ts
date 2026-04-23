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

// Données initiales
const DEFAULT_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER RENSEIGNEMENT' },
  { label: 'ETAT DES LIEUX – PHOTOS EXISTANTS' },
  { label: 'RELEVE DE MESURES' },
  { label: 'PROJET VERSION 1 – APS' },
  { label: 'PROJET VERSION 2' },
  { label: 'PROJET VERSION 3 – APD' },
];

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
  addDossier: (data: { lastName: string; firstName?: string; address?: string; siteAddress?: string; postalCode?: string; tva?: string; tauxTVA?: number; delaiChantier?: number; delaiChantierUnit?: 'days' | 'weeks'; phone?: string; email?: string }) => string;
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
  ensureDefaultSubfolders: (dossierId: string) => void;
  signerDossier: (id: string) => void;
  perdreDossier: (id: string, reason: string) => void;
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
          phone: data.phone,
          email: data.email,
          status: 'EN COURS',
          createdAt: new Date().toLocaleDateString('fr-FR'),
          subfolders: DEFAULT_SUBFOLDERS.map(sf => ({ ...sf })),
        };
        set(s => ({ dossiers: [newDossier, ...s.dossiers] }));
        return id;
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

      ensureDefaultSubfolders: (dossierId) => {
        const mergeDefaults = (existing: SubFolder[]): SubFolder[] => {
          const existingLabels = new Set(existing.map(s => s.label));
          const missing = DEFAULT_SUBFOLDERS.filter(d => !existingLabels.has(d.label)).map(sf => ({ ...sf }));
          if (missing.length === 0) return existing;
          return [...existing, ...missing];
        };
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (inDossiers) {
          set(s => ({
            dossiers: s.dossiers.map(d =>
              d.id === dossierId ? { ...d, subfolders: mergeDefaults(d.subfolders) } : d
            ),
          }));
        }
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
