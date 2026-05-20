/**
 * Store Planning — planning événements et gestion de chantier
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface PlanningEvent {
  id: string;
  day: number;
  /** Heure de début (entier 0-23). Toujours requis pour rétrocompat. */
  startHour: number;
  /** Minute de début (0, 15, 30, 45) — granularité quart d'heure.
   *  Optionnel : si absent, on considère 0 (event commence à pile l'heure). */
  startMinute?: number;
  /** Durée en heures (entier ou décimal). Rétrocompat. */
  duration: number;
  /** Durée en minutes (multiple de 15). Si défini, override `duration`. */
  durationMinutes?: number;
  title: string;
  color: string;
  type?: string;
  weekOffset?: number;
}

export interface GestEvent {
  id: string;
  day: number;
  startHour: number;
  /** Minute de début (0, 15, 30, 45) — quart d'heure. Optionnel. */
  startMinute?: number;
  duration: number;
  /** Durée en minutes — override `duration` si défini. */
  durationMinutes?: number;
  type: string;
  client: string;
  weekOffset: number;
  /** ID de l'intervenant assigne (optionnel — pas tous les events ont un intervenant). */
  intervenantId?: string;
  /** Nom snapshot au moment de la creation pour preserver l'affichage si l'intervenant est supprime apres. */
  intervenantName?: string;
  /** Type/specialite snapshot (POSEUR, PLOMBIER, etc.). */
  intervenantType?: string;
}

/**
 * Métier custom ajouté manuellement par l'utilisateur dans le planning gestion
 * (demande asso 19/05/2026 : "+ pouvoir rajouter manuellement un métier si besoin").
 *
 * Persisté localStorage avec le reste du store. Le `key` est généré à la
 * création (slug du label en majuscules + suffixe random pour unicité), il
 * sert d'identifiant dans GestEvent.type et de cle de map dans le composant.
 */
export interface CustomInterventionType {
  /** Identifiant stable, ex "CUSTOM_TAPISSIER_3F2A1B". */
  key: string;
  /** Libellé affiché à l'utilisateur, ex "Tapissier d'art". */
  label: string;
  /** Couleur hex utilisée pour le bullet de légende et le fond d'event. */
  color: string;
  /** Emoji icon (1-2 chars). */
  icon: string;
  /** Timestamp création (utile pour tri). */
  createdAt: number;
}

// Données initiales — vides. Les vraies données viennent de l'API via useDataSync.
const INITIAL_EVENTS: PlanningEvent[] = [];
const INITIAL_GEST_EVENTS: GestEvent[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

interface PlanningState {
  // Data
  planningEvents: PlanningEvent[];
  gestEvents: GestEvent[];
  /** Métiers custom ajoutés manuellement par l'utilisateur (planning gestion). */
  customInterventionTypes: CustomInterventionType[];

  // Planning actions
  addPlanningEvent: (event: Omit<PlanningEvent, 'id'>) => void;
  /** Met à jour un événement existant (drag&drop, édition). */
  updatePlanningEvent: (id: string, patch: Partial<Omit<PlanningEvent, 'id'>>) => void;
  deletePlanningEvent: (id: string) => void;

  // Gestion actions
  addGestEvent: (event: Omit<GestEvent, 'id'>) => void;
  /** Met à jour un événement existant (drag&drop, édition). */
  updateGestEvent: (id: string, patch: Partial<Omit<GestEvent, 'id'>>) => void;
  deleteGestEvent: (id: string) => void;

  // Métier custom actions
  addCustomInterventionType: (data: Omit<CustomInterventionType, 'key' | 'createdAt'>) => CustomInterventionType;
  deleteCustomInterventionType: (key: string) => void;

  // Reset
  reset: () => void;
}

export const usePlanningStore = create<PlanningState>()(
  persist(
    (set, get) => ({
      planningEvents: INITIAL_EVENTS,
      gestEvents: INITIAL_GEST_EVENTS,
      customInterventionTypes: [],

      addPlanningEvent: (event) => {
        const newEvent = { ...event, id: 'ev' + uid() };
        set(s => ({ planningEvents: [...s.planningEvents, newEvent] }));
      },

      updatePlanningEvent: (id, patch) => {
        set(s => ({
          planningEvents: s.planningEvents.map(e =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        }));
      },

      deletePlanningEvent: (id) => {
        set(s => ({ planningEvents: s.planningEvents.filter(e => e.id !== id) }));
      },

      addGestEvent: (event) => {
        const newEvent = { ...event, id: 'gev' + uid() };
        set(s => ({ gestEvents: [...s.gestEvents, newEvent] }));
      },

      updateGestEvent: (id, patch) => {
        set(s => ({
          gestEvents: s.gestEvents.map(e =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        }));
      },

      deleteGestEvent: (id) => {
        set(s => ({ gestEvents: s.gestEvents.filter(e => e.id !== id) }));
      },

      // ── Métiers custom (planning gestion) ───────────────────────────────
      addCustomInterventionType: (data) => {
        // Slug pour la clé : labelmajuscules + 6 chars random (collision-safe)
        const slug = data.label
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 30);
        const key = `CUSTOM_${slug || 'METIER'}_${uid()}`;
        const newType: CustomInterventionType = {
          key,
          label: data.label,
          color: data.color,
          icon: data.icon,
          createdAt: Date.now(),
        };
        set(s => ({ customInterventionTypes: [...s.customInterventionTypes, newType] }));
        return newType;
      },

      deleteCustomInterventionType: (key) => {
        set(s => ({ customInterventionTypes: s.customInterventionTypes.filter(t => t.key !== key) }));
      },

      reset: () => set({
        planningEvents: INITIAL_EVENTS,
        gestEvents: INITIAL_GEST_EVENTS,
        customInterventionTypes: [],
      }),
    }),
    { name: 'avra-planning-store' }
  )
);
