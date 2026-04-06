/**
 * Store Intervenants — poseurs, électriciens, maçons, etc.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface Intervenant {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  dossiers: { name: string; statut: 'A CLASSER' | 'CLASSE' }[];
}

// Données initiales — vides. Les vraies données viennent de l'API via useDataSync.
const INITIAL_INTERVENANTS: Intervenant[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

interface IntervenantState {
  // Data
  intervenants: Intervenant[];

  // Actions
  addIntervenant: (data: { type: string; name: string; phone: string; email: string; notes?: string }) => void;
  removeIntervenant: (id: string) => void;
  updateIntervenant: (id: string, data: Partial<Omit<Intervenant, 'id' | 'dossiers'>>) => void;
  updateIntervenantDossierStatut: (intervenantId: string, dossierName: string, statut: 'A CLASSER' | 'CLASSE') => void;

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

      updateIntervenantDossierStatut: (intervenantId, dossierName, statut) => {
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? { ...i, dossiers: i.dossiers.map(d => d.name === dossierName ? { ...d, statut } : d) }
              : i
          )
        }));
      },

      reset: () => set({
        intervenants: INITIAL_INTERVENANTS,
      }),
    }),
    { name: 'avra-intervenant-store' }
  )
);
