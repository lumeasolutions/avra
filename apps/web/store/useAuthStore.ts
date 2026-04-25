import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Vide les localStorage keys des stores qui contiennent des données purement
 * locales (UI prefs, sessions assistant, historique view-only).
 *
 * IMPORTANT — Ce qui N'EST PAS vidé :
 *  - `avra-dossier-store` → contient les sous-dossiers/notes/docs locaux qui
 *    ne sont pas (encore) en base. Les vider au logout = perdre du travail
 *    quand l'utilisateur se reconnecte. Le sync (`useDataSync`) reconcilie
 *    avec le backend à la prochaine connexion.
 *  - `avra-planning-store`, `avra-facturation-store`, `avra-intervenant-store`,
 *    `avra-stock-store` → idem, contenus métier qui doivent survivre logout.
 *
 * On vide UNIQUEMENT les stores éphémères (UI/historique/assistant). Pour
 * éviter une fuite cross-utilisateur sur appareil partagé, `useDataSync`
 * détecte le changement de userId à la connexion et reset si nécessaire.
 */
function clearEphemeralStores() {
  if (typeof localStorage === 'undefined') return;
  const ephemeralKeys = [
    'avra-assistant-store',
    'avra-history-store',
    'avra-ui-store',
  ];
  ephemeralKeys.forEach((key) => localStorage.removeItem(key));
}

/**
 * Vide TOUS les stores applicatifs — utilisé uniquement quand un utilisateur
 * différent se connecte sur le même navigateur (détecté côté useDataSync).
 */
export function clearAllAppStoresHard() {
  if (typeof localStorage === 'undefined') return;
  const storeKeys = [
    'avra-dossier-store',
    'avra-planning-store',
    'avra-facturation-store',
    'avra-intervenant-store',
    'avra-stock-store',
    'avra-assistant-store',
    'avra-history-store',
    'avra-config-store',
    'avra-ui-store',
  ];
  storeKeys.forEach((key) => localStorage.removeItem(key));
}

export type Profession = 'architecte' | 'menuisier' | 'cuisiniste' | null;

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  workspaceId: string;
  workspaceName?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  profession: Profession;
  _hasHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  setProfession: (p: Profession) => void;
  /**
   * TEMPORARY DEV ONLY — bypass de la garde pour permettre aux admins de
   * switcher de portail sans recréer de compte. À retirer avant la GA en
   * même temps que <DevPortalSwitcher />.
   */
  _devForceProfession: (p: Profession) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      profession: null,
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),

      setAuth: (token, user) => {
        // token peut être vide quand l'auth se fait via cookie HttpOnly
        // On stocke quand même l'utilisateur pour identifier la session
        set({ token: token || null, user });
      },

      setProfession: (p) => {
        // Le portail est définitif — on ne peut le changer qu'une seule fois (à l'inscription)
        const current = get().profession;
        if (current && p !== null) return; // Déjà défini, on bloque
        set({ profession: p });
      },

      // TEMPORARY DEV ONLY — voir DevPortalSwitcher
      _devForceProfession: (p) => set({ profession: p }),

      logout: () => {
        // Appelle l'API backend pour purger les cookies HttpOnly (access + refresh)
        // côté serveur. Fire-and-forget : même en cas d'échec réseau, on nettoie
        // l'état local pour éviter de rester coincé dans une session morte.
        if (typeof window !== 'undefined') {
          fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
        }
        if (typeof document !== 'undefined') {
          document.cookie = 'logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
        }
        // On NE vide PAS les stores métier (dossiers/planning/factu/...) :
        // ils sont conservés pour permettre à l'utilisateur de retrouver son
        // travail à la prochaine connexion. Si un *autre* utilisateur se
        // connecte sur ce navigateur, useDataSync détecte le userId différent
        // et purge alors via clearAllAppStoresHard().
        clearEphemeralStores();
        // Mémorise le dernier userId connecté pour permettre la détection
        // multi-utilisateur côté useDataSync.
        if (typeof localStorage !== 'undefined') {
          const u = get().user;
          if (u?.id) localStorage.setItem('avra-last-user-id', u.id);
        }
        // On garde `profession` en localStorage : c'est une préférence durable.
        set({ token: null, user: null });
      },

      isAuthenticated: () => {
        // Vérifie le token Zustand (mode démo) ou le cookie logged_in (mode production HttpOnly)
        if (get().token) return true;
        if (typeof document !== 'undefined') {
          return document.cookie.includes('logged_in=true');
        }
        return false;
      },
    }),
    {
      name: 'avra-auth',
      partialize: (state) => ({ token: state.token, user: state.user, profession: state.profession }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setHasHydrated(true);

        // "Rester connecté" — si l'utilisateur a décoché la case, on vérifie
        // si la session est toujours active. sessionStorage est effacé à la
        // fermeture du navigateur/PWA mais survit aux rechargements de page.
        // Si sessionStorage est vide et avra-remember=false → déconnexion.
        if (typeof window !== 'undefined') {
          const remember = localStorage.getItem('avra-remember');
          const sessionActive = sessionStorage.getItem('avra-session-active');
          if (remember === 'false' && !sessionActive) {
            state.logout();
          }
        }
      },
    },
  ),
);
