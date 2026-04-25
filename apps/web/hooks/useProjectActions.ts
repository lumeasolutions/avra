'use client';

/**
 * useProjectActions — actions dossiers qui appellent l'API puis mettent à jour le store.
 *
 * Ces hooks remplacent l'appel direct au store quand on veut persister en base.
 * Usage: const { createProject, signProject, loseProject } = useProjectActions();
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useDossierStore, getDefaultSubfoldersForProfession } from '@/store/useDossierStore';
import { useAuthStore } from '@/store/useAuthStore';

interface CreateProjectData {
  lastName: string;
  firstName?: string;
  address?: string;
  siteAddress?: string;
  postalCode?: string;
  tva?: string;
  tauxTVA?: number;
  delaiChantier?: number;
  delaiChantierUnit?: 'days' | 'weeks';
  phone?: string;
  email?: string;
}

/**
 * Un ID est considéré "local-only" (pas encore en DB) s'il ne ressemble pas
 * à un cuid (prefix 'c' + 24 chars alphanumeric) ni à un UUID.
 * Tous les IDs générés par le store Zustand commencent par 'd', 's', 'p', etc.
 * suivi de 8 chars, ou sont les démos figées (d1..d9, s1..s4, p1..p3).
 */
const isLocalOnlyId = (id: string): boolean => {
  if (!id) return true;
  // cuid v1 : commence par 'c', 25 chars, [0-9a-z]
  if (/^c[0-9a-z]{24}$/.test(id)) return false;
  // cuid v2 ou UUID v4 : 36 chars avec tirets
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return false;
  return true; // tout le reste = local
};

export function useProjectActions() {
  const user = useAuthStore((s) => s.user);
  const profession = useAuthStore((s) => s.profession);
  const store = useDossierStore();

  /**
   * Crée un dossier de manière fiable :
   *  - En mode démo : création locale uniquement (acceptable, mode test)
   *  - En mode authentifié : appel API EN PREMIER. Si l'API échoue,
   *    on lève une erreur — on ne laisse pas de dossier orphelin local-only
   *    qui disparaîtrait au logout/login.
   *
   * Retourne l'ID réel (cuid backend ou local en mode démo).
   * Throw une Error en cas d'échec API — l'UI doit la catch et afficher
   * un message à l'utilisateur (toast / banner d'erreur).
   */
  const createProject = useCallback(
    async (data: CreateProjectData): Promise<string> => {
      // Mode démo ou pas de vraie auth → création locale uniquement
      if (user?.id === 'demo' || !user?.workspaceId) {
        return store.addDossier({ ...data, profession });
      }

      // 1. Appel API EN PREMIER pour obtenir un vrai cuid avant tout local
      let result: { id: string };
      try {
        result = await api<{ id: string }>('/projects/with-client', {
          method: 'POST',
          body: JSON.stringify({
            clientType: 'PARTICULIER',
            firstName: data.firstName || '',
            lastName: data.lastName,
            email: data.email || undefined,
            phone: data.phone || undefined,
            name: `Cuisine ${data.lastName}`,
            tradeType: 'CUISINISTE',
          }),
        });
      } catch (err: any) {
        const msg = err?.message ?? 'Erreur réseau';
        console.error('[ProjectActions] API create failed:', err);
        // Throw : pas de dossier orphelin. L'UI doit afficher l'erreur.
        throw new Error(`Impossible de créer le dossier : ${msg}`);
      }

      if (!result?.id) {
        throw new Error('Réponse API invalide : id manquant');
      }

      // 2. Une fois le backend OK, on ajoute en local avec le vrai ID.
      //    On utilise une variante de addDossier qui force l'ID fourni.
      const realId = result.id;
      // addDossier ne permet pas de forcer un ID — on l'ajoute manuellement
      // dans le store en réutilisant la même structure.
      useDossierStore.setState((s) => {
        // Évite les doublons si la même création est appelée 2 fois (StrictMode)
        if (s.dossiers.some((d) => d.id === realId)) return s;
        return {
          dossiers: [
            ...s.dossiers,
            {
              id: realId,
              name: data.lastName,
              firstName: data.firstName,
              address: data.address,
              siteAddress: data.siteAddress,
              postalCode: data.postalCode,
              tva: data.tva,
              tauxTVA: data.tauxTVA,
              delaiChantier: data.delaiChantier,
              delaiChantierUnit: data.delaiChantierUnit,
              phone: data.phone,
              email: data.email,
              status: 'EN COURS' as const,
              createdAt: new Date().toLocaleDateString('fr-FR'),
              subfolders: getDefaultSubfoldersForProfession(profession),
              notes: '',
            },
          ],
        };
      });
      return realId;
    },
    [user, store, profession],
  );

  /**
   * Signe un dossier : appelle l'API puis met à jour le store.
   */
  const signProject = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update local
      store.signerDossier(id);

      if (user?.id === 'demo' || !user?.workspaceId) return;

      // Éviter d'appeler l'API pour les IDs de démo
      if (isLocalOnlyId(id)) return;

      try {
        await api(`/projects/${id}/sign`, { method: 'POST' });
      } catch (err) {
        console.warn('[ProjectActions] API sign failed:', err);
      }
    },
    [user, store],
  );

  /**
   * Marque un dossier comme perdu.
   */
  const loseProject = useCallback(
    async (id: string, reason: string): Promise<void> => {
      // Optimistic update local
      store.perdreDossier(id, reason);

      if (user?.id === 'demo' || !user?.workspaceId) return;

      if (isLocalOnlyId(id)) return;

      try {
        await api(`/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            lifecycleStatus: 'PERDU',
          }),
        });
      } catch (err) {
        console.warn('[ProjectActions] API lose failed:', err);
      }
    },
    [user, store],
  );

  /**
   * Met à jour le statut d'un dossier.
   */
  const updateProjectStatus = useCallback(
    async (id: string, status: string): Promise<void> => {
      store.updateDossierStatus(id, status as any);

      if (user?.id === 'demo' || !user?.workspaceId) return;
      if (isLocalOnlyId(id)) return;

      const priorityMap: Record<string, string> = {
        'URGENT': 'URGENT',
        'EN COURS': 'MEDIUM',
        'FINITION': 'LOW',
        'A VALIDER': 'LOW',
      };

      try {
        await api(`/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ priority: priorityMap[status] || 'MEDIUM' }),
        });
      } catch (err) {
        console.warn('[ProjectActions] API update status failed:', err);
      }
    },
    [user, store],
  );

  return {
    createProject,
    signProject,
    loseProject,
    updateProjectStatus,
  };
}
