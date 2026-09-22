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
  /** Dossier client du RDV (rattachement réel, plus seulement dans le titre). */
  dossierId?: string;
  /** Adresse du RDV (sur place). */
  location?: string;
  /** Lien de visio (Google Meet, Zoom, Teams, WhatsApp…). */
  visioUrl?: string;
  /** Invitation envoyée au client (écrite par le serveur, lecture seule ici). */
  invite?: PlanningInvite;
}

export interface PlanningInvite {
  to: string;
  name?: string;
  titre: string;
  sentAt: string;
  sequence: number;
  status: 'ENVOYEE' | 'ANNULEE';
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
/** Id de dossier connu du serveur (cuid) — les dossiers locaux (« d… ») n'y sont pas. */
const _serverDossierId = (id?: string) => (id && /^c[a-z0-9]{20,}$/.test(id) ? id : undefined);
/** Champs « lieu » envoyés en colonnes (flux agenda, rattachement au dossier). */
function _placeFields(e: any, withProject = true): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof e.location === 'string') out.location = e.location.trim().slice(0, 300);
  const pid = withProject ? _serverDossierId(e.dossierId) : undefined;
  if (pid) out.projectId = pid;
  return out;
}

// Sauvegardes en cours par RDV : permet d'attendre que le serveur ait la
// dernière version (id réel, horaire à jour) avant d'envoyer l'invitation.
const _pending = new Map<string, Promise<unknown>>();
const _realIds = new Map<string, string>();
function _track(id: string, p: Promise<unknown>) {
  const prev = _pending.get(id) ?? Promise.resolve();
  const next = prev.then(() => p, () => p);
  _pending.set(id, next);
  void next.finally(() => { if (_pending.get(id) === next) _pending.delete(id); });
}
/**
 * Attend la fin des sauvegardes d'un RDV et renvoie son id serveur
 * (null si le RDV n'a pas pu être enregistré).
 */
export async function attendreRdvEnregistre(id: string): Promise<string | null> {
  for (let i = 0; i < 4; i++) {
    const p = _pending.get(id);
    if (p) { try { await p; } catch { /* erreur gérée par l'appelant */ } }
    const real = _realIds.get(id);
    if (real && real !== id) { id = real; continue; }
    if (!_pending.get(id)) break;
  }
  return _isLocalId(id) ? null : id;
}

async function _persistEvent(calendarType: 'GESTION' | 'PERSONAL', e: any, payload: Record<string, unknown>): Promise<string | null> {
  try {
    const { api } = await import('@/lib/api');
    const { startAt, endAt } = _eventDates(e);
    const post = (withProject: boolean) => api('/events', {
      method: 'POST',
      body: JSON.stringify({
        calendarType,
        type: _planningTypeToEventType(e.type),
        title: (e.client || e.title || e.type || 'Intervention').toString().slice(0, 200),
        startAt, endAt,
        ...(calendarType === 'PERSONAL' ? _placeFields(e, withProject) : {}),
        description: JSON.stringify({ k: calendarType === 'GESTION' ? 'gest' : 'perso', ...payload }),
      }),
    });
    let created: any;
    try {
      created = await post(true);
    } catch (err) {
      // Dossier refusé par le serveur (ex. supprimé entre-temps) : on enregistre
      // le RDV sans rattachement plutôt que de le perdre.
      if (calendarType !== 'PERSONAL' || !_placeFields(e).projectId) throw err;
      created = await post(false);
    }
    return created?.id ?? null;
  } catch { return null; }
}
async function _deleteEvent(id: string): Promise<void> {
  if (_isLocalId(id)) return;
  try { const { api } = await import('@/lib/api'); await api(`/events/${id}`, { method: 'DELETE' }); } catch { /* noop */ }
}
/** Persiste une MISE À JOUR d'event (déplacement / édition) au backend.
 *  Sans ça, déplacer ou éditer un RDV ne se sauvait pas : le local (Zustand)
 *  affichait le changement toute la session, mais un rechargement dur le
 *  perdait (resync depuis la table Event inchangée). Bug 08/2026. */
async function _updateEvent(
  id: string, calendarType: 'GESTION' | 'PERSONAL', e: any, payload: Record<string, unknown>,
): Promise<void> {
  if (_isLocalId(id)) return; // pas encore persisté (POST initial en vol) — rien à mettre à jour
  try {
    const { api } = await import('@/lib/api');
    const { startAt, endAt } = _eventDates(e);
    const put = (withProject: boolean) => api(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: _planningTypeToEventType(e.type),
        title: (e.client || e.title || e.type || 'Intervention').toString().slice(0, 200),
        startAt, endAt,
        ...(calendarType === 'PERSONAL' ? _placeFields(e, withProject) : {}),
        description: JSON.stringify({ k: calendarType === 'GESTION' ? 'gest' : 'perso', ...payload }),
      }),
    });
    try {
      await put(true);
    } catch (err) {
      if (calendarType !== 'PERSONAL' || !_placeFields(e).projectId) throw err;
      await put(false);
    }
  } catch { /* noop */ }
}

/** Champs d'un RDV du planning classique stockés dans la description JSON. */
function _persoPayload(e: PlanningEvent): Record<string, unknown> {
  return {
    title: e.title, color: e.color, type: e.type,
    duration: e.duration, durationMinutes: e.durationMinutes, startMinute: e.startMinute,
    dossierId: e.dossierId || undefined,
    location: e.location?.trim() || undefined,
    visioUrl: e.visioUrl?.trim() || undefined,
  };
}

/** Crée un type custom : clé = CUSTOM_<LABEL_EN_MAJUSCULES>_<8 car. aléatoires> (unique). */
function _newCustomType(
  data: Omit<CustomInterventionType, 'key' | 'createdAt'>,
  fallback: string,
): CustomInterventionType {
  const slug = data.label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return {
    key: `CUSTOM_${slug || fallback}_${uid()}`,
    label: data.label,
    color: data.color,
    icon: data.icon,
    createdAt: Date.now(),
  };
}

/** Pousse les types custom vers le serveur (rubrique `planningTypes` des réglages). */
let _typesTimer: ReturnType<typeof setTimeout> | null = null;
function _pushCustomTypes(get: () => PlanningState): void {
  if (typeof window === 'undefined') return;
  if (_typesTimer) clearTimeout(_typesTimer);
  _typesTimer = setTimeout(async () => {
    const s = get();
    try {
      const { saveSettings } = await import('@/lib/settings-api');
      await saveSettings({
        planningTypes: {
          rdv: s.customRdvTypes ?? [],
          metiers: s.customInterventionTypes ?? [],
          updatedAt: s.customTypesUpdatedAt || Date.now(),
        },
      });
    } catch (e: any) {
      console.warn('[planning] synchro des types custom échouée, gardés en local:', e?.message || e);
    }
  }, 500);
}

interface PlanningState {
  // Data
  planningEvents: PlanningEvent[];
  gestEvents: GestEvent[];
  /** Métiers custom ajoutés manuellement par l'utilisateur (planning gestion). */
  customInterventionTypes: CustomInterventionType[];
  /**
   * Types de RDV ajoutés manuellement dans le Planning (retour cofondatrice
   * 21/09/2026 : « pouvoir rajouter manuellement un type de RDV »). Même forme
   * que les métiers custom du planning gestion.
   */
  customRdvTypes: CustomInterventionType[];
  /** Horodatage (ms) de la dernière modification locale des types custom. */
  customTypesUpdatedAt: number;

  // Planning actions
  /** Ajoute un RDV ; renvoie son id provisoire (cf. attendreRdvEnregistre). */
  addPlanningEvent: (event: Omit<PlanningEvent, 'id'>) => string;
  /** Met à jour un événement existant (drag&drop, édition). */
  updatePlanningEvent: (id: string, patch: Partial<Omit<PlanningEvent, 'id'>>) => void;
  deletePlanningEvent: (id: string) => void;
  /** Met à jour localement l'état d'envoi (après l'appel serveur d'invitation). */
  _setInvite: (id: string, invite: PlanningInvite) => void;

  // Gestion actions
  addGestEvent: (event: Omit<GestEvent, 'id'>) => void;
  /** Met à jour un événement existant (drag&drop, édition). */
  updateGestEvent: (id: string, patch: Partial<Omit<GestEvent, 'id'>>) => void;
  deleteGestEvent: (id: string) => void;

  // Métier custom actions
  addCustomInterventionType: (data: Omit<CustomInterventionType, 'key' | 'createdAt'>) => CustomInterventionType;
  deleteCustomInterventionType: (key: string) => void;
  addCustomRdvType: (data: Omit<CustomInterventionType, 'key' | 'createdAt'>) => CustomInterventionType;
  deleteCustomRdvType: (key: string) => void;
  /** Applique les types custom du serveur (ou pousse les locaux s'ils sont plus récents). */
  _hydrateCustomTypes: (server?: { rdv?: any[]; metiers?: any[]; updatedAt?: number }) => void;

  // Reset
  reset: () => void;
}

export const usePlanningStore = create<PlanningState>()(
  persist(
    (set, get) => ({
      planningEvents: INITIAL_EVENTS,
      gestEvents: INITIAL_GEST_EVENTS,
      customInterventionTypes: [],
      customRdvTypes: [],
      customTypesUpdatedAt: 0,

      addPlanningEvent: (event) => {
        const tempId = 'ev' + uid();
        const newEvent = { ...event, id: tempId };
        set(s => ({ planningEvents: [...s.planningEvents, newEvent] }));
        const p = _persistEvent('PERSONAL', newEvent, _persoPayload(newEvent)).then((realId) => {
          if (realId) {
            _realIds.set(tempId, realId);
            let current: PlanningEvent | undefined;
            set(s => ({
              planningEvents: s.planningEvents.map(e => {
                if (e.id !== tempId) return e;
                current = { ...e, id: realId };
                return current;
              }),
            }));
            // Modifié pendant l'enregistrement initial (ex. déplacé tout de suite) :
            // la mise à jour avait été ignorée faute d'id serveur → on la rejoue.
            if (current && JSON.stringify(_persoPayload(current)) + _eventDates(current).startAt
                !== JSON.stringify(_persoPayload(newEvent)) + _eventDates(newEvent).startAt) {
              const snapshot = current;
              _track(realId, _updateEvent(realId, 'PERSONAL', snapshot, _persoPayload(snapshot)));
            }
          }
        });
        _track(tempId, p);
        return tempId;
      },

      updatePlanningEvent: (id, patch) => {
        let merged: PlanningEvent | undefined;
        set(s => ({
          planningEvents: s.planningEvents.map(e => {
            if (e.id !== id) return e;
            merged = { ...e, ...patch };
            return merged;
          }),
        }));
        if (merged) {
          _track(id, _updateEvent(id, 'PERSONAL', merged, _persoPayload(merged)));
        }
      },

      deletePlanningEvent: (id) => {
        set(s => ({ planningEvents: s.planningEvents.filter(e => e.id !== id) }));
        void _deleteEvent(id);
      },

      _setInvite: (id, invite) => {
        set(s => ({ planningEvents: s.planningEvents.map(e => e.id === id ? { ...e, invite } : e) }));
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
        let merged: GestEvent | undefined;
        set(s => ({
          gestEvents: s.gestEvents.map(e => {
            if (e.id !== id) return e;
            merged = { ...e, ...patch };
            return merged;
          }),
        }));
        if (merged) {
          void _updateEvent(id, 'GESTION', merged, {
            type: merged.type, client: merged.client,
            duration: merged.duration, durationMinutes: merged.durationMinutes, startMinute: merged.startMinute,
            intervenantId: merged.intervenantId, intervenantName: merged.intervenantName, intervenantType: merged.intervenantType,
          });
        }
      },

      deleteGestEvent: (id) => {
        set(s => ({ gestEvents: s.gestEvents.filter(e => e.id !== id) }));
        void _deleteEvent(id);
      },

      // ── Métiers custom (planning gestion) ───────────────────────────────
      addCustomInterventionType: (data) => {
        const newType = _newCustomType(data, 'METIER');
        set(s => ({ customInterventionTypes: [...s.customInterventionTypes, newType], customTypesUpdatedAt: Date.now() }));
        _pushCustomTypes(get);
        return newType;
      },

      deleteCustomInterventionType: (key) => {
        set(s => ({ customInterventionTypes: s.customInterventionTypes.filter(t => t.key !== key), customTypesUpdatedAt: Date.now() }));
        _pushCustomTypes(get);
      },

      // ── Types de RDV custom (planning) ──────────────────────────────────
      addCustomRdvType: (data) => {
        const newType = _newCustomType(data, 'RDV');
        set(s => ({ customRdvTypes: [...(s.customRdvTypes ?? []), newType], customTypesUpdatedAt: Date.now() }));
        _pushCustomTypes(get);
        return newType;
      },

      deleteCustomRdvType: (key) => {
        set(s => ({ customRdvTypes: (s.customRdvTypes ?? []).filter(t => t.key !== key), customTypesUpdatedAt: Date.now() }));
        _pushCustomTypes(get);
      },

      _hydrateCustomTypes: (server) => {
        const local = get();
        const localAt = local.customTypesUpdatedAt ?? 0;
        const serverAt = server?.updatedAt ?? 0;
        const hasLocal = (local.customRdvTypes?.length ?? 0) + (local.customInterventionTypes?.length ?? 0) > 0;
        if (server && serverAt >= localAt) {
          // Le serveur est à jour (ou plus récent) → il fait foi.
          set({
            customRdvTypes: Array.isArray(server.rdv) ? server.rdv : [],
            customInterventionTypes: Array.isArray(server.metiers) ? server.metiers : [],
            customTypesUpdatedAt: serverAt,
          });
        } else if (hasLocal || localAt > serverAt) {
          // Modifs locales plus récentes (ou types créés avant la synchro) → on les pousse.
          if (!localAt) set({ customTypesUpdatedAt: Date.now() });
          _pushCustomTypes(get);
        }
      },

      reset: () => set({
        planningEvents: INITIAL_EVENTS,
        gestEvents: INITIAL_GEST_EVENTS,
        customInterventionTypes: [],
        customRdvTypes: [],
        customTypesUpdatedAt: 0,
      }),
    }),
    {
      name: 'avra-planning-store',
      version: STORE_VERSION,
      migrate: preservingMigrate<PlanningState>(),
    }
  )
);
