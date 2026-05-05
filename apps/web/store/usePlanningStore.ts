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

  // Reset
  reset: () => void;
}

export const usePlanningStore = create<PlanningState>()(
  persist(
    (set, get) => ({
      planningEvents: INITIAL_EVENTS,
      gestEvents: INITIAL_GEST_EVENTS,

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

      reset: () => set({
        planningEvents: INITIAL_EVENTS,
        gestEvents: INITIAL_GEST_EVENTS,
      }),
    }),
    { name: 'avra-planning-store' }
  )
);
