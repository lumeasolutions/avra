/**
 * Store Planning — planning événements et gestion de chantier
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORE_VERSION, preservingMigrate } from './persistVersioning';

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

// ── Persistance serveur des créneaux (sinon ils disparaissent au resync) ──
function _weekMonday(d = new Date()): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // 0 = lundi
  x.setDate(x.getDate() - dow);
  return x;
}
function _eventDates(e: { day: number; startHour: number; startMinute?: number; weekOffset?: number; duration: number; durationMinutes?: number }): { startAt: string; endAt: string } {
  const mon = _weekMonday();
  const day = Math.min(7, Math.max(1, e.day || 1));
  const start = new Date(mon);
  start.setDate(mon.getDate() + (e.weekOffset || 0) * 7 + (day - 1));
  start.setHours(e.startHour || 0, e.startMinute || 0, 0, 0);
  const mins = e.durationMinutes ?? Math.round((e.duration || 1) * 60);
  const end = new Date(start.getTime() + Math.max(15, mins) * 60000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
function _planningTypeToEventType(t?: string): string {
  const s = (t || '').toUpperCase();
  if (s.includes('LIVR')) return 'LIVRAISON';
  if (s.includes('POSE') || s.includes('INSTALL')) return 'INSTALLATION';
  if (s.includes('CHANTIER') || s.includes('SUIVI') || s.includes('MESURE') || s.includes('RELEV')) return 'VISITE_CHANTIER';
  if (s.includes('REUNION') || s.includes('RÉUNION')) return 'REUNION';
  if (s.includes('RDV') || s.includes('CLIENT')) return 'RDV_CLIENT';
  return 'AUTRE';
}
const _isLocalId = (id: string) => id.startsWith('gev') || id.startsWith('ev');
async function _persistEvent(calendarType: 'GESTION' | 'PERSONAL', e: any, payload: Record<string, unknown>): Promise<string | null> {
  try {
    const { api } = await import('@/lib/api');
    const { startAt, endAt } = _eventDates(e);
    const created: any = await api('/events', {
      method: 'POST',
      body: JSON.stringify({
        calendarType,
        type: _planningTypeToEventType(e.type),
        title: (e.client || e.title || e.type || 'Intervention').toString().slice(0, 200),
        startAt, endAt,
        description: JSON.stringify({ k: calendarType === 'GESTION' ? 'gest' : 'perso', ...payload }),
      }),
    });
    return created?.id ?? null;
  } catch { return null; }
}
async function _deleteEvent(id: string): Promise<void> {
  if (_isLocalId(id)) return;
  try { const { api } = await import('@/lib/api'); await api(`/events/${id}`, { method: 'DELETE' }); } catch { /* noop */ }
}

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
        const tempId = 'ev' + uid();
        const newEvent = { ...event, id: tempId };
        set(s => ({ planningEvents: [...s.planningEvents, newEvent] }));
        void _persistEvent('PERSONAL', newEvent, {
          title: event.title, color: event.color, type: event.type,
          duration: event.duration, durationMinutes: event.durationMinutes, startMinute: event.startMinute,
        }).then((realId) => {
          if (realId) set(s => ({ planningEvents: s.planningEvents.map(e => e.id === tempId ? { ...e, id: realId } : e) }));
        });
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
        void _deleteEvent(id);
      },

      addGestEvent: (event) => {
        const tempId = 'gev' + uid();
        const newEvent = { ...event, id: tempId };
        set(s => ({ gestEvents: [...s.gestEvents, newEvent] }));
        void _persistEvent('GESTION', newEvent, {
          type: event.type, client: event.client, duration: event.duration,
          durationMinutes: event.durationMinutes, startMinute: event.startMinute,
          intervenantId: event.intervenantId, intervenantName: event.intervenantName, intervenantType: event.intervenantType,
        }).then((realId) => {
          if (realId) set(s => ({ gestEvents: s.gestEvents.map(e => e.id === tempId ? { ...e, id: realId } : e) }));
        });
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
        void _deleteEvent(id);
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
    {
      name: 'avra-planning-store',
      version: STORE_VERSION,
      migrate: preservingMigrate<PlanningState>(),
    }
  )
);
