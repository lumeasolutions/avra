'use client';

/**
 * useProjectActions — actions dossiers qui appellent l'API puis mettent à jour le store.
 *
 * Ces hooks remplacent l'appel direct au store quand on veut persister en base.
 * Usage: const { createProject, signProject, loseProject } = useProjectActions();
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useDossierStore, getDefaultSubfoldersForProfession, type ValidatedOptionSelection, type DossierProfession } from '@/store/useDossierStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useConfigStore } from '@/store/useConfigStore';
import { resolveVendeurName } from '@/lib/vendeur-name';

interface CreateProjectData {
  lastName: string;
  firstName?: string;
  /** Type de projet saisi par le pro (Cuisine, Dressing, Chambre, Salle de bain…).
   *  Devient le préfixe du nom du dossier. Vide → nom = juste le client (plus de
   *  « Cuisine » forcé). */
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
  const members = useConfigStore((s) => s.members);
  const store = useDossierStore();

  // ── Multi-vendeur (26/05/2026) — résout le nom du vendeur à attribuer
  //    automatiquement à un nouveau dossier. Source unique : resolveVendeurName
  //    (match email non ambigu, sinon prénom+nom, sinon partie locale email).
  const resolveCurrentVendeurName = useCallback(
    (): string | undefined => resolveVendeurName(user, members),
    [user, members],
  );

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
        return store.addDossier({ ...data, profession, vendeurName: resolveCurrentVendeurName(), vendeurUserId: user?.id });
      }

      // Nom + métier dérivés de la profession (avant : toujours "Cuisine …" / CUISINISTE,
      // ce qui étiquetait à tort les projets menuisier/architecte comme cuisiniste).
      const tradeType =
        profession === 'menuisier' ? 'MENUISIER'
        : profession === 'architecte' ? 'ARCHITECTE_INTERIEUR'
        : 'CUISINISTE';
      // Nom du dossier = nom du client, point. Retour cofondatrice (sept. 2026) :
      // « il ne faut pas qu'il y ai écrit cuisines/dressings/chambres peu importe
      // devant les noms » — un même client peut avoir toute la maison à aménager,
      // préfixer par un type de pièce n'a donc pas de sens. Le prénom est stocké
      // à part et affiché à la suite du nom par l'interface.
      const projectName = data.lastName.trim();

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
            name: projectName,
            tradeType,
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
              // Même nom que celui envoyé à l'API (« <Type> <Client> » ou juste
              // le client) — avant : data.lastName seul -> le type etait perdu.
              name: projectName,
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
              // Multi-vendeur (26/05/2026) — auto-assign à la création
              vendeurName: resolveCurrentVendeurName(),
              // Phase 2 — lien structuré vers le User créateur (vendeurUserId).
              vendeurUserId: user?.id,
              // FIX P0 (22/07/2026) — sans ce champ, le dossier restait
              // profession: undefined en local (le tradeType envoyé a l'API
              // etait correct, mais l'ajout optimiste local ne le portait pas).
              // belongsToProfession() traite profession manquante comme
              // "visible partout" -> fuite immediate du dossier fraichement
              // cree vers les 2 autres portails jusqu'au prochain reload
              // (seul useDataSync recalculait profession depuis tradeType).
              profession: profession as DossierProfession,
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
   *
   * @param selectedOptions Liste optionnelle des options sélectionnées par
   *  l'utilisateur (modale "Choisir option à valider"). Si non fourni, le
   *  store retombe sur le fallback historique (dernière option trouvée).
   */
  const signProject = useCallback(
    async (id: string, selectedOptions?: ValidatedOptionSelection[]): Promise<void> => {
      // Optimistic update local — on passe la profession pour que le store
      // construise les bons sous-dossiers signés (MENUISIER en a une liste
      // dédiée, voir buildSignedSubfoldersForProfession dans useDossierStore).
      store.signerDossier(id, profession, selectedOptions);

      if (user?.id === 'demo' || !user?.workspaceId) return;

      // Éviter d'appeler l'API pour les IDs de démo
      if (isLocalOnlyId(id)) return;

      try {
        await api(`/projects/${id}/sign`, {
          method: 'POST',
          // Transmet la selection au back pour qu'il puisse en garder trace
          // si besoin (le back peut ignorer si pas encore implémenté côté DB).
          body: selectedOptions && selectedOptions.length > 0
            ? JSON.stringify({ validatedOptions: selectedOptions })
            : undefined,
        });
      } catch (err) {
        console.warn('[ProjectActions] API sign failed:', err);
      }
    },
    [user, store, profession],
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
            // La raison n'etait envoyee nulle part : elle vivait dans le
            // navigateur et disparaissait a la premiere resynchronisation,
            // remplacee par « Raison non specifiee ».
            lostReason: reason.slice(0, 500),
          }),
        });
      } catch (err) {
        console.warn('[ProjectActions] API lose failed:', err);
      }
    },
    [user, store],
  );

  /**
   * Restaure un dossier perdu : le remet en actif (lifecycleStatus DRAFT).
   * La resync (useDataSync) le replace ensuite dans "Dossiers en cours".
   */
  const restoreLostProject = useCallback(
    async (id: string): Promise<void> => {
      // On récupère le vendeur AVANT de restaurer (restaurerDossierPerdu retire
      // l'entrée perdue). Le snapshot le porte ; on re-persiste ce vendeur au
      // backend pour qu'une resync ultérieure ne le remette pas à vide.
      const perdu = useDossierStore.getState().dossiersPerdus.find((d) => d.id === id);
      const vendeurName = (perdu?._snapshot as any)?.vendeurName ?? perdu?.vendeurName;

      store.restaurerDossierPerdu(id);

      if (user?.id === 'demo' || !user?.workspaceId) return;
      if (isLocalOnlyId(id)) return;

      try {
        await api(`/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            lifecycleStatus: 'DRAFT',
            ...(vendeurName ? { vendeurName } : {}),
          }),
        });
      } catch (err) {
        console.warn('[ProjectActions] API restore failed:', err);
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

  /**
   * Renomme un dossier (nom complet du projet, ex. « Dressing Tillard »).
   * Met à jour le store local puis persiste via PUT /projects/:id. En cas
   * d'échec API, throw pour que l'UI informe et rétablisse si besoin.
   */
  const renameProject = useCallback(
    async (id: string, name: string): Promise<void> => {
      const nm = name.trim();
      if (!nm) throw new Error('Le nom ne peut pas être vide');
      // Démo / ID local : pas d'API, on met à jour le local uniquement.
      if (user?.id === 'demo' || !user?.workspaceId || isLocalOnlyId(id)) {
        store.renameDossier(id, nm);
        return;
      }
      // API d'abord (source de vérité), puis local -> pas de désync si l'API échoue.
      await api(`/projects/${id}`, { method: 'PUT', body: JSON.stringify({ name: nm }) });
      store.renameDossier(id, nm);
    },
    [user, store],
  );

  /**
   * Supprime définitivement un dossier (DB + store local).
   * En cas d'échec API, throw une Error que l'UI doit catcher pour informer
   * l'utilisateur (la suppression locale est tentée même sur échec API pour
   * éviter qu'un dossier "fantôme" reste affiché).
   */
  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      // Mode démo ou ID local : suppression locale uniquement, pas d'API
      if (user?.id === 'demo' || !user?.workspaceId || isLocalOnlyId(id)) {
        store.deleteDossier(id);
        return;
      }

      try {
        await api(`/projects/${id}`, { method: 'DELETE' });
      } catch (err: any) {
        // On retire quand même du store local pour ne pas laisser un fantôme.
        // L'utilisateur saura via l'erreur que la DB peut être désynchronisée.
        store.deleteDossier(id);
        const msg = err?.message ?? 'Erreur réseau';
        throw new Error(`Suppression API échouée : ${msg} (dossier retiré localement)`);
      }
      store.deleteDossier(id);
    },
    [user, store],
  );

  /**
   * Toggle "Dossier terminé" : appelle POST /projects/:id/terminate
   * et met à jour le store local en optimistic. Réversible (un second
   * appel rouvre le dossier).
   */
  const terminateProject = useCallback(
    async (id: string, terminated: boolean): Promise<void> => {
      // Optimistic update local — toggleDossierTermine bascule juste l'état
      // courant, donc on l'appelle uniquement si l'état cible diffère du
      // store. Comme on n'a pas accès au state ici sans selector dédié, on
      // l'appelle systématiquement et on s'appuie sur le fait que la modale
      // ne s'ouvre que pour des cards où l'état change reellement.
      store.toggleDossierTermine(id);

      if (user?.id === 'demo' || !user?.workspaceId) return;
      if (isLocalOnlyId(id)) return;

      try {
        await api(`/projects/${id}/terminate`, {
          method: 'POST',
          body: JSON.stringify({ terminated }),
        });
      } catch (err) {
        // RESILIENCE (28/05/2026) : l'archivage (terminated/archivedAt) est
        // aujourd'hui une feature CLIENT-SIDE — l'etat vit dans le store local
        // (persiste via Zustand + preserve au reload par useDataSync). Le
        // backend ne possede pas encore les colonnes terminated/terminatedAt
        // (l'endpoint /terminate renvoie 500 — cf. VAGUE 2 backend stats).
        // On NE rollback PLUS l'optimistic update : sinon marquer "termine"
        // echouerait silencieusement (le dossier reapparaitrait aussitot).
        // Quand le backend aura les colonnes, l'appel reussira et tout sera
        // synchronise. En attendant on garde l'etat local et on log.
        console.warn('[ProjectActions] API terminate failed (archivage conserve en local):', err);
      }
    },
    [user, store],
  );

  return {
    createProject,
    signProject,
    loseProject,
    restoreLostProject,
    updateProjectStatus,
    renameProject,
    deleteProject,
    terminateProject,
  };
}
