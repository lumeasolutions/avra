/**
 * Store Intervenants — poseurs, électriciens, maçons, etc.
 *
 * Les dossiers d'un intervenant peuvent contenir des "items" (clients,
 * photos, projets) avec un statut individuel URGENT / EN COURS / CLASSE.
 * Cette structure permet le drill-down 3 niveaux :
 *   intervenant -> dossiers -> items
 *
 * ─── Cohabitation avec useIntervenantDossiersStore ──────────────────────────
 * Deux stores coexistent volontairement :
 *   • useIntervenantStore (CE FICHIER) — vue "carnet d'adresses" côté pro :
 *     liste légère des intervenants, dossiers/items locaux pour drill-down,
 *     persisté localStorage. Source : /api/v1/intervenants (sync via
 *     useDataSync.syncIntervenants).
 *   • useIntervenantDossiersStore — vue détaillée d'UN intervenant (dossiers
 *     côté backend, partagés multi-utilisateurs). Source : endpoints
 *     /intervenants/:id/dossiers, NON persisté.
 *
 * Règle : la liste + métadonnées (rating, tags, notes, contact) vivent ici.
 * Les dossiers "officiels" partagés vivent dans useIntervenantDossiersStore.
 * Les "dossiers" locaux de ce store sont un cache UI legacy pour le drill-down
 * rapide ; ils peuvent diverger de la source backend mais ne sont jamais
 * écrits côté serveur.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DossierItemStatut = 'URGENT' | 'EN COURS' | 'CLASSE';
export type DossierStatut = 'A CLASSER' | 'CLASSE';

export interface DossierItem {
  id: string;
  name: string;
  statut: DossierItemStatut;
  /** Date d'ajout (ISO) — pour tri si besoin. */
  addedAt?: string;
}

export interface IntervenantDossier {
  /** Identifiant stable (clé de mise a jour). */
  id?: string;
  name: string;
  /** Date affichée du dossier (DD/MM/YYYY ou similaire). */
  date?: string;
  statut: DossierStatut;
  /** Items / clients / projets dans ce dossier. */
  items?: DossierItem[];
  /** Marqueur "DOSSIER RAJOUTE" : true si le pro a ajoute un dossier que
   *  l'intervenant n'a pas encore vu (effacé au premier opening). */
  rajoute?: boolean;
}

export interface Intervenant {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  /** Note manuelle 1-5 saisie par le pro. */
  rating?: number | null;
  /** Commentaire libre lie au rating. */
  ratingComment?: string | null;
  /** Tags / specialites (CSV). */
  tagsCsv?: string | null;
  dossiers: IntervenantDossier[];
}

// Données initiales — vides. Les vraies données viennent de l'API via useDataSync.
const INITIAL_INTERVENANTS: Intervenant[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

interface IntervenantState {
  // Data
  intervenants: Intervenant[];

  // Actions intervenants
  addIntervenant: (data: { type: string; name: string; phone: string; email: string; notes?: string }) => void;
  removeIntervenant: (id: string) => void;
  updateIntervenant: (id: string, data: Partial<Omit<Intervenant, 'id' | 'dossiers'>>) => void;

  // Actions dossiers
  addDossier: (intervenantId: string, dossier: Omit<IntervenantDossier, 'id' | 'items' | 'rajoute' | 'statut'> & { rajoute?: boolean; statut?: DossierStatut }) => void;
  removeDossier: (intervenantId: string, dossierId: string) => void;
  updateIntervenantDossierStatut: (intervenantId: string, dossierName: string, statut: DossierStatut) => void;
  markDossierVu: (intervenantId: string, dossierId: string) => void;

  // Actions items
  addDossierItem: (intervenantId: string, dossierId: string, item: { name: string; statut?: DossierItemStatut }) => void;
  removeDossierItem: (intervenantId: string, dossierId: string, itemId: string) => void;
  updateDossierItemStatut: (intervenantId: string, dossierId: string, itemId: string, statut: DossierItemStatut) => void;

  // Reset
  reset: () => void;
}

export const useIntervenantStore = create<IntervenantState>()(
  persist(
    (set, get) => ({
      intervenants: INITIAL_INTERVENANTS,

      addIntervenant: (data) => {
        const newIntervenant: Intervenant = { id: 'i' + uid(), ...data, dossiers: [] };
        set(s => ({ intervenants: [newIntervenant, ...s.intervenants] }));
      },

      removeIntervenant: (id) => {
        set(s => ({ intervenants: s.intervenants.filter(i => i.id !== id) }));
      },

      updateIntervenant: (id, data) => {
        set(s => ({ intervenants: s.intervenants.map(i => i.id === id ? { ...i, ...data } : i) }));
      },

      addDossier: (intervenantId, dossier) => {
        const newDossier: IntervenantDossier = {
          id: 'd' + uid(),
          name: dossier.name,
          date: dossier.date,
          statut: dossier.statut ?? 'A CLASSER',
          items: [],
          rajoute: dossier.rajoute ?? true,
        };
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId ? { ...i, dossiers: [newDossier, ...i.dossiers] } : i
          ),
        }));
      },

      removeDossier: (intervenantId, dossierId) => {
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? { ...i, dossiers: i.dossiers.filter(d => (d.id ?? d.name) !== dossierId) }
              : i
          ),
        }));
      },

      updateIntervenantDossierStatut: (intervenantId, dossierName, statut) => {
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? { ...i, dossiers: i.dossiers.map(d => d.name === dossierName ? { ...d, statut } : d) }
              : i
          ),
        }));
      },

      markDossierVu: (intervenantId, dossierId) => {
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? {
                  ...i,
                  dossiers: i.dossiers.map(d =>
                    (d.id ?? d.name) === dossierId ? { ...d, rajoute: false } : d
                  ),
                }
              : i
          ),
        }));
      },

      addDossierItem: (intervenantId, dossierId, item) => {
        const newItem: DossierItem = {
          id: 'it' + uid(),
          name: item.name,
          statut: item.statut ?? 'EN COURS',
          addedAt: new Date().toISOString(),
        };
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? {
                  ...i,
                  dossiers: i.dossiers.map(d =>
                    (d.id ?? d.name) === dossierId
                      ? { ...d, items: [...(d.items ?? []), newItem] }
                      : d
                  ),
                }
              : i
          ),
        }));
      },

      removeDossierItem: (intervenantId, dossierId, itemId) => {
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? {
                  ...i,
                  dossiers: i.dossiers.map(d =>
                    (d.id ?? d.name) === dossierId
                      ? { ...d, items: (d.items ?? []).filter(it => it.id !== itemId) }
                      : d
                  ),
                }
              : i
          ),
        }));
      },

      updateDossierItemStatut: (intervenantId, dossierId, itemId, statut) => {
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? {
                  ...i,
                  dossiers: i.dossiers.map(d =>
                    (d.id ?? d.name) === dossierId
                      ? {
                          ...d,
                          items: (d.items ?? []).map(it =>
                            it.id === itemId ? { ...it, statut } : it
                          ),
                        }
                      : d
                  ),
                }
              : i
          ),
        }));
      },

      reset: () => set({
        intervenants: INITIAL_INTERVENANTS,
      }),
    }),
    { name: 'avra-intervenant-store' }
  )
);
