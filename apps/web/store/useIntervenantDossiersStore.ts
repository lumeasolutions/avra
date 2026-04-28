/**
 * Store IntervenantDossiers — sync backend des dossiers/items de classement.
 *
 * Pattern :
 *  - load() au mount via useDataSync (ou explicit refresh)
 *  - mutations en optimistic update + invalidation au resultat API
 *  - rollback sur erreur reseau
 *
 * Pas de persist localStorage : l'API est source de verite.
 */
import { create } from 'zustand';
import {
  IntervenantDossier, IntervenantDossierItem,
  DossierStatut, DossierItemStatut,
  listAllDossiers, createDossier as apiCreate, updateDossier as apiUpdate,
  markDossierVu as apiMarkVu, deleteDossier as apiDelete,
  createDossierItem as apiCreateItem, updateDossierItem as apiUpdateItem,
  deleteDossierItem as apiDeleteItem,
} from '@/lib/intervenant-dossiers-api';

interface State {
  dossiers: IntervenantDossier[];
  loading: boolean;
  error: string | null;

  // Loaders
  loadAll: () => Promise<void>;

  // Selectors
  getByIntervenant: (intervenantId: string) => IntervenantDossier[];
  getDossier: (dossierId: string) => IntervenantDossier | undefined;

  // Dossiers
  addDossier: (intervenantId: string, name: string, date?: string) => Promise<IntervenantDossier | null>;
  renameDossier: (dossierId: string, name: string) => Promise<void>;
  setDossierStatut: (dossierId: string, statut: DossierStatut) => Promise<void>;
  toggleDossierStatut: (dossierId: string) => Promise<void>;
  markVu: (dossierId: string) => Promise<void>;
  removeDossier: (dossierId: string) => Promise<void>;

  // Items
  addItem: (dossierId: string, name: string, statut?: DossierItemStatut) => Promise<IntervenantDossierItem | null>;
  setItemStatut: (itemId: string, statut: DossierItemStatut) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

export const useIntervenantDossiersStore = create<State>((set, get) => ({
  dossiers: [],
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const list = await listAllDossiers();
      const arr = Array.isArray(list) ? list : (Array.isArray((list as any)?.data) ? (list as any).data : []);
      set({ dossiers: arr, loading: false });
    } catch (e: any) {
      const msg = String(e?.message ?? '').toLowerCase();
      if (msg.includes('unauthorized') || msg.includes('expir')) {
        set({ dossiers: [], loading: false });
      } else {
        set({ loading: false, error: e?.message ?? 'Erreur chargement' });
      }
    }
  },

  getByIntervenant: (intervenantId) =>
    get().dossiers.filter(d => d.intervenantId === intervenantId),

  getDossier: (dossierId) => get().dossiers.find(d => d.id === dossierId),

  addDossier: async (intervenantId, name, date) => {
    try {
      const d = await apiCreate({ intervenantId, name, date });
      set(s => ({ dossiers: [d, ...s.dossiers] }));
      return d;
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur creation dossier' });
      return null;
    }
  },

  renameDossier: async (dossierId, name) => {
    try {
      const updated = await apiUpdate(dossierId, { name });
      set(s => ({ dossiers: s.dossiers.map(d => d.id === dossierId ? updated : d) }));
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur renommage' });
    }
  },

  setDossierStatut: async (dossierId, statut) => {
    // Optimistic
    set(s => ({ dossiers: s.dossiers.map(d => d.id === dossierId ? { ...d, statut } : d) }));
    try {
      const updated = await apiUpdate(dossierId, { statut });
      set(s => ({ dossiers: s.dossiers.map(d => d.id === dossierId ? updated : d) }));
    } catch {
      // Rollback : reload all
      get().loadAll();
    }
  },

  toggleDossierStatut: async (dossierId) => {
    const current = get().dossiers.find(d => d.id === dossierId);
    if (!current) return;
    const next: DossierStatut = current.statut === 'CLASSE' ? 'A_CLASSER' : 'CLASSE';
    return get().setDossierStatut(dossierId, next);
  },

  markVu: async (dossierId) => {
    set(s => ({ dossiers: s.dossiers.map(d => d.id === dossierId ? { ...d, rajoute: false } : d) }));
    try {
      const updated = await apiMarkVu(dossierId);
      set(s => ({ dossiers: s.dossiers.map(d => d.id === dossierId ? updated : d) }));
    } catch { /* fire-and-forget : optimistic stay */ }
  },

  removeDossier: async (dossierId) => {
    const before = get().dossiers;
    set(s => ({ dossiers: s.dossiers.filter(d => d.id !== dossierId) }));
    try { await apiDelete(dossierId); }
    catch {
      // Rollback
      set({ dossiers: before });
    }
  },

  addItem: async (dossierId, name, statut) => {
    try {
      const it = await apiCreateItem(dossierId, { name, statut });
      set(s => ({
        dossiers: s.dossiers.map(d =>
          d.id === dossierId ? { ...d, items: [...d.items, it] } : d
        ),
      }));
      return it;
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur creation item' });
      return null;
    }
  },

  setItemStatut: async (itemId, statut) => {
    // Optimistic
    set(s => ({
      dossiers: s.dossiers.map(d => ({
        ...d,
        items: d.items.map(it => it.id === itemId ? { ...it, statut } : it),
      })),
    }));
    try { await apiUpdateItem(itemId, { statut }); }
    catch { get().loadAll(); }
  },

  removeItem: async (itemId) => {
    const before = get().dossiers;
    set(s => ({
      dossiers: s.dossiers.map(d => ({
        ...d,
        items: d.items.filter(it => it.id !== itemId),
      })),
    }));
    try { await apiDeleteItem(itemId); }
    catch { set({ dossiers: before }); }
  },
}));
