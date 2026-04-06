import { create } from 'zustand';

interface AssistantState {
  open: boolean;
  setOpen: (val: boolean) => void;
  toggle: () => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  open: false,
  setOpen: (val) => set({ open: val }),
  toggle: () => set({ open: !get().open }),
}));
