import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DemandeType } from '@/lib/demandes-api';

/**
 * Templates de demandes — stockes en localStorage.
 *
 * Permet au pro de reutiliser des modeles courants (titre + notes + type)
 * sans avoir a tout retaper. Templates par defaut + custom du user.
 */

export interface DemandeTemplate {
  id: string;
  /** Nom court du template (visible dans la liste) */
  name: string;
  type: DemandeType;
  title: string;
  notes?: string;
  /** Createurs de templates (pas modifiable pour les defaults) */
  builtin?: boolean;
}

const DEFAULT_TEMPLATES: DemandeTemplate[] = [
  {
    id: 'pose-cuisine',
    name: 'Pose cuisine standard',
    type: 'POSE',
    title: 'Pose cuisine — ',
    notes: "Adresse du chantier :\nCode d'acces :\nContact sur place :\nDuree estimee :\nMateriel necessaire :",
    builtin: true,
  },
  {
    id: 'mesure-rapide',
    name: 'Prise de mesure',
    type: 'MESURE',
    title: 'Prise de mesure — ',
    notes: "Type de piece :\nPlans existants : oui / non\nContraintes particulieres :\nCreneaux disponibles :",
    builtin: true,
  },
  {
    id: 'sav-defaut',
    name: 'SAV — defaut produit',
    type: 'SAV',
    title: 'SAV — ',
    notes: "Description du probleme :\nDate d'installation :\nProduit concerne :\nGravite (urgent/normal) :\nPhotos jointes : oui / non",
    builtin: true,
  },
  {
    id: 'livraison-standard',
    name: 'Livraison sur chantier',
    type: 'LIVRAISON',
    title: 'Livraison — ',
    notes: "Adresse :\nCreneau souhaite :\nContact reception :\nAcces (camion 19t / 12t / utilitaire) :\nDecharger sur place : oui / non",
    builtin: true,
  },
];

interface State {
  templates: DemandeTemplate[];
  addTemplate: (t: Omit<DemandeTemplate, 'id' | 'builtin'>) => DemandeTemplate;
  removeTemplate: (id: string) => void;
  reset: () => void;
}

export const useDemandeTemplatesStore = create<State>()(
  persist(
    (set, get) => ({
      templates: DEFAULT_TEMPLATES,
      addTemplate: (t) => {
        const newTpl: DemandeTemplate = {
          id: 'tpl-' + Math.random().toString(36).slice(2, 10),
          ...t,
          builtin: false,
        };
        set({ templates: [newTpl, ...get().templates] });
        return newTpl;
      },
      removeTemplate: (id) => {
        const list = get().templates.filter((t) => t.id !== id || t.builtin);
        set({ templates: list });
      },
      reset: () => set({ templates: DEFAULT_TEMPLATES }),
    }),
    { name: 'avra-demande-templates' },
  ),
);
