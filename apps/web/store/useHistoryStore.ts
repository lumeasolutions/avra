/**
 * Store History — logs d'activité et relances
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface HistoryLog {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: string;
}

export interface Relance {
  id: string;
  dossierId: string;
  type: 'date_butoire' | 'acompte' | 'confirmation' | 'dossier_vente';
  message: string;
  dateCreated: string;
  dateNextRelance: string;
  status: 'active' | 'resolved' | 'snoozed';
}

// Données initiales — vides. Les logs et relances sont générés dynamiquement.
const INITIAL_LOGS: HistoryLog[] = [];
const INITIAL_RELANCES: Relance[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

const now = () => {
  const d = new Date();
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

interface HistoryState {
  // Data
  historyLogs: HistoryLog[];
  relances: Relance[];

  // Log actions
  addLog: (log: Omit<HistoryLog, 'id' | 'time'>) => void;

  // Relance actions
  addRelance: (relance: Omit<Relance, 'id'>) => void;
  resolveRelance: (id: string) => void;
  snoozeRelance: (id: string, days: number) => void;
  getActiveRelances: () => Relance[];
  checkAndCreateRelances: (dossiersSignes: any[]) => void;

  // Reset
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      historyLogs: INITIAL_LOGS,
      relances: INITIAL_RELANCES,

      addLog: (log) => {
        const newLog: HistoryLog = { ...log, id: 'l' + uid(), time: now() };
        set(s => ({ historyLogs: [newLog, ...s.historyLogs.slice(0, 49)] }));
      },

      addRelance: (relance) => {
        const newRelance: Relance = { ...relance, id: 'rel' + uid() };
        set(s => ({ relances: [newRelance, ...s.relances] }));
      },

      resolveRelance: (id) => {
        set(s => ({
          relances: s.relances.map(r => r.id === id ? { ...r, status: 'resolved' as const } : r),
        }));
      },

      snoozeRelance: (id, days) => {
        const today = new Date();
        const nextDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
        const dateNextRelance = nextDate.toLocaleDateString('fr-FR');
        set(s => ({
          relances: s.relances.map(r =>
            r.id === id ? { ...r, status: 'snoozed' as const, dateNextRelance } : r
          ),
        }));
      },

      getActiveRelances: () => {
        return get().relances.filter(r => r.status === 'active');
      },

      checkAndCreateRelances: (dossiersSignes) => {
        const today = new Date();
        const existingRelances = get().relances;

        dossiersSignes.forEach((dossier: any) => {
          // Check for overdue date butoires
          if (dossier.dateButoires) {
            Object.entries(dossier.dateButoires).forEach(([key, dateStr]: [string, any]) => {
              if (dateStr) {
                const [day, month, year] = dateStr.split('/').map(Number);
                const dueDateObj = new Date(year, month - 1, day);
                if (dueDateObj < today && !existingRelances.some(r => r.dossierId === dossier.id && r.type === 'date_butoire' && r.status === 'active')) {
                  const fieldLabel = key.replace(/([A-Z])/g, ' $1').toLowerCase();
                  get().addRelance({
                    dossierId: dossier.id,
                    type: 'date_butoire',
                    message: `Date butoir ${fieldLabel} dépassée — ${dossier.name}`,
                    dateCreated: today.toLocaleDateString('fr-FR'),
                    dateNextRelance: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
                    status: 'active',
                  });
                }
              }
            });
          }

          // Check for no deposit in last 2 weeks
          const signedDate = new Date(dossier.signedDate.split('/').reverse().join('-'));
          const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
          if (signedDate < twoWeeksAgo && !existingRelances.some(r => r.dossierId === dossier.id && r.type === 'dossier_vente' && r.status === 'active')) {
            get().addRelance({
              dossierId: dossier.id,
              type: 'dossier_vente',
              message: `Pas de dépôt depuis 2 semaines — ${dossier.name}`,
              dateCreated: today.toLocaleDateString('fr-FR'),
              dateNextRelance: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
              status: 'active',
            });
          }

          // Check for confirmations > 1 week
          if (dossier.confirmations) {
            dossier.confirmations.forEach((conf: any) => {
              const commandDate = new Date(conf.dateButoir.split('/').reverse().join('-'));
              const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              if (commandDate < oneWeekAgo && !conf.validee && !existingRelances.some(r => r.dossierId === dossier.id && r.type === 'confirmation' && r.status === 'active')) {
                get().addRelance({
                  dossierId: dossier.id,
                  type: 'confirmation',
                  message: `Confirmation fournisseur ${conf.fournisseur} en attente — ${dossier.name}`,
                  dateCreated: today.toLocaleDateString('fr-FR'),
                  dateNextRelance: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
                  status: 'active',
                });
              }
            });
          }
        });
      },

      reset: () => set({
        historyLogs: INITIAL_LOGS,
        relances: INITIAL_RELANCES,
      }),
    }),
    { name: 'avra-history-store' }
  )
);
