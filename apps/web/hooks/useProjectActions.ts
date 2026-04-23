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
