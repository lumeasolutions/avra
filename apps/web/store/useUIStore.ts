/**
 * Store UI — états d'interface (modales, alertes, sidebar, etc.)
 */
import { create } from 'zustand';

// Types
export type AlertSeverity = 'error' | 'warning' | 'info' | 'clock';

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  text: string;
  dossierId?: string;
  dismissed: boolean;
  createdAt: string;
}

// Données initiales — vides. Les alertes sont générées dynamiquement par l'app.
const INITIAL_ALERTS: AlertItem[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

const now = () => {
  const d = new Date();
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

interface UIState {
  // Data
  alerts: AlertItem[];

  // UI State
  sidebarOpen: boolean;
  modalOpen: string | null; // nom de la modale ouverte

  // Alert actions
  addAlert: (alert: Omit<AlertItem, 'id' | 'createdAt' | 'dismissed'>) => void;
  dismissAlert: (id: string) => void;

  // UI actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (name: string) => void;
  closeModal: () => void;

  // Reset
  reset: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  alerts: INITIAL_ALERTS,
  sidebarOpen: true,
  modalOpen: null,

  addAlert: (alert) => {
    const newAlert: AlertItem = { ...alert, id: 'a' + uid(), dismissed: false, createdAt: now() };
    set(s => ({ alerts: [newAlert, ...s.alerts.slice(0, 19)] }));
  },

  dismissAlert: (id) => {
    set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, dismissed: true } : a) }));
  },

  toggleSidebar: () => {
    set(s => ({ sidebarOpen: !s.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  openModal: (name) => {
    set({ modalOpen: name });
  },

  closeModal: () => {
    set({ modalOpen: null });
  },

  reset: () => set({
    alerts: INITIAL_ALERTS,
    sidebarOpen: true,
    modalOpen: null,
  }),
}));
