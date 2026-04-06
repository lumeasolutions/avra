'use client';

/**
 * useProjectActions — actions dossiers qui appellent l'API puis mettent à jour le store.
 *
 * Ces hooks remplacent l'appel direct au store quand on veut persister en base.
 * Usage: const { createProject, signProject, loseProject } = useProjectActions();
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useDossierStore } from '@/store/useDossierStore';
import { useAuthStore } from '@/store/useAuthStore';

interface CreateProjectData {
  lastName: string;
  firstName?: string;
  address?: string;
  siteAddress?: string;
  postalCode?: string;
  tva?: string;
  phone?: string;
  email?: string;
}

export function useProjectActions() {
  const user = useAuthStore((s) => s.user);
  const store = useDossierStore();

  /**
   * Crée un dossier : appelle l'API puis met à jour le store local.
   * En mode demo ou si l'API échoue, crée uniquement en local.
   */
  const createProject = useCallback(
    async (data: CreateProjectData): Promise<string> => {
      // Mode démo ou pas de vraie auth → création locale uniquement
      if (user?.id === 'demo' || !user?.workspaceId) {
        return store.addDossier(data);
      }

      // Optimistic update local d'abord
      const localId = store.addDossier(data);

      try {
        // Appel API pour persister en base
        const result = await api<{ id: string }>('/projects/with-client', {
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

        // Mettre à jour l'ID local avec l'ID réel de la base
        if (result?.id && result.id !== localId) {
          useDossierStore.setState((s) => ({
            dossiers: s.dossiers.map((d) =>
              d.id === localId ? { ...d, id: result.id } : d,
            ),
          }));
          return result.id;
        }
        return localId;
      } catch (err) {
        console.warn('[ProjectActions] API create failed, keeping local:', err);
        return localId;
      }
    },
    [user, store],
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
      if (['d1','d2','d3','d4','d5','d6','d7','d8','d9'].includes(id)) return;

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

      if (['d1','d2','d3','d4','d5','d6','d7','d8','d9'].includes(id)) return;

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
      if (['d1','d2','d3','d4','d5','d6','d7','d8','d9'].includes(id)) return;

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
