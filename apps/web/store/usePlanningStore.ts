/**
 * Store Planning — planning événements et gestion de chantier
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface PlanningEvent {
  id: string;
  day: number;
  startHour: number;
  duration: number;
  title: string;
  color: string;
  type?: string;
  weekOffset?: number;
}

export interface GestEvent {
  id: string;
  day: number;
  startHour: number;
  duration: number;
  type: string;
  client: string;
  weekOffset: number;
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
  deletePlanningEvent: (id: string) => void;

  // Gestion actions
  addGestEvent: (event: Omit<GestEvent, 'id'>) => void;
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

      deletePlanningEvent: (id) => {
        set(s => ({ planningEvents: s.planningEvents.filter(e => e.id !== id) }));
      },

      addGestEvent: (event) => {
        const newEvent = { ...event, id: 'gev' + uid() };
        set(s => ({ gestEvents: [...s.gestEvents, newEvent] }));
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
