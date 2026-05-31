/**
 * useAssistantStore — état de l'assistant AVRA (l'owl 🦉).
 *
 * - `open` / `seedPrompt` : pilotent l'ouverture du panel + prompt initial
 * - `messages` / `appendMessage` / etc. : conversation persistée localStorage
 *
 * Pourquoi persister les messages ? Sans ça, le state du chat vit dans
 * AssistantPanel via useState. Quand l'utilisateur navigue (Tableau de bord
 * → Réseaux sociaux → IA), le panel est démonté/remonté et la conversation
 * est perdue → frustrant. Avec persistance, ça survit aux navigations,
 * reloads et fermetures d'onglet — comme ChatGPT.
 *
 * Limite à 100 messages (anti-saturation localStorage : ~5 Mo de quota).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AssistantPendingAction {
  // create_devis/create_facture ajoutes le 28/05/2026 (volet 4 assistant)
  type: 'navigate' | 'create_dossier' | 'create_devis' | 'create_facture' | 'info';
  label: string;
  target?: string;
  data?: any;
}

export interface AssistantMessage {
  role: 'user' | 'ai';
  text: string;
  action?: AssistantPendingAction;
  /** ISO date — utile pour debug et display timestamps si besoin. */
  ts?: string;
}

const MAX_MESSAGES = 100;

interface AssistantState {
  // ─── UI state (volatile) ───────────────────────────────────────────────
  open: boolean;
  /** Prompt pré-rempli poussé depuis une autre page. Consommé une seule fois. */
  seedPrompt: string | null;

  // ─── Conversation persistée ────────────────────────────────────────────
  messages: AssistantMessage[];
  /** ISO du dernier reset — pour afficher "Conversation depuis : …" si besoin. */
  startedAt: string;

  // ─── Actions UI ────────────────────────────────────────────────────────
  setOpen: (val: boolean) => void;
  toggle: () => void;
  openWithPrompt: (prompt: string) => void;
  consumeSeedPrompt: () => string | null;

  // ─── Actions conversation ──────────────────────────────────────────────
  setMessages: (
    msgs: AssistantMessage[] | ((prev: AssistantMessage[]) => AssistantMessage[]),
  ) => void;
  appendMessage: (msg: AssistantMessage) => void;
  /** Ré-écrit le dernier message AI en cours de stream (token par token). */
  appendStreamingChunk: (chunk: string) => void;
  /** Reset complet de la conversation (avec un message d'accueil optionnel). */
  resetConversation: (initialMessage?: AssistantMessage) => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      // UI volatile
      open: false,
      seedPrompt: null,

      // Conversation persistée
      messages: [],
      startedAt: new Date().toISOString(),

      // ─ UI ─
      setOpen: (val) => set({ open: val }),
      toggle: () => set({ open: !get().open }),
      openWithPrompt: (prompt) => {
        set({ open: true, seedPrompt: prompt });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('avra:assistant-seed', { detail: { prompt } }));
        }
      },
      consumeSeedPrompt: () => {
        const p = get().seedPrompt;
        if (p) set({ seedPrompt: null });
        return p;
      },

      // ─ Conversation ─
      setMessages: (msgs) =>
        set((s) => {
          const next = typeof msgs === 'function' ? msgs(s.messages) : msgs;
          const trimmed = next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
          return { messages: trimmed };
        }),

      appendMessage: (msg) =>
        set((s) => {
          const stamped: AssistantMessage = { ts: new Date().toISOString(), ...msg };
          const next = [...s.messages, stamped];
          const trimmed = next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
          return { messages: trimmed };
        }),

      appendStreamingChunk: (chunk) =>
        set((s) => {
          if (s.messages.length === 0) return s;
          const last = s.messages[s.messages.length - 1];
          if (last.role !== 'ai') return s;
          const next = [...s.messages];
          next[next.length - 1] = { ...last, text: last.text + chunk };
          return { messages: next };
        }),

      resetConversation: (initialMessage) =>
        set({
          messages: initialMessage
            ? [{ ts: new Date().toISOString(), ...initialMessage }]
            : [],
          startedAt: new Date().toISOString(),
        }),
    }),
    {
      name: 'avra-assistant',
      version: 1,
      // Ne persister QUE ce qui doit survivre au reload (pas open / seedPrompt)
      partialize: (state) => ({
        messages: state.messages,
        startedAt: state.startedAt,
      }),
    },
  ),
);
