import { create } from 'zustand';

interface AssistantState {
  open: boolean;
  /** Prompt pré-rempli poussé depuis une autre page (ex: dashboard dossiers). Consommé une seule fois par le panel. */
  seedPrompt: string | null;
  setOpen: (val: boolean) => void;
  toggle: () => void;
  /** Ouvre le panel avec un prompt pré-rempli */
  openWithPrompt: (prompt: string) => void;
  /** Lu + reset par le panel dès qu'il est consommé */
  consumeSeedPrompt: () => string | null;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  open: false,
  seedPrompt: null,
  setOpen: (val) => set({ open: val }),
  toggle: () => set({ open: !get().open }),
  openWithPrompt: (prompt) => {
    set({ open: true, seedPrompt: prompt });
    // Event bus pour les consommateurs qui écoutent (panel permanent déjà ouvert)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avra:assistant-seed', { detail: { prompt } }));
    }
  },
  consumeSeedPrompt: () => {
    const p = get().seedPrompt;
    if (p) set({ seedPrompt: null });
    return p;
  },
}));
