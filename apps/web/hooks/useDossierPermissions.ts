'use client';

/**
 * useDossierPermissions — droits modifier/supprimer sur les dossiers.
 *
 * Règle métier (juin 2026) :
 *   - ADMIN / OWNER  → peut modifier ET supprimer TOUS les dossiers.
 *   - VENDEUR (MEMBER) → peut modifier/supprimer UNIQUEMENT ses propres
 *     dossiers (ceux dont `vendeurName` correspond à son nom). Il peut voir
 *     et télécharger tous les dossiers, mais pas modifier/supprimer ceux des
 *     autres.
 *   - Dossier sans vendeur attribué → réservé à l'admin.
 *
 * L'attribution se fait par `vendeurName` (le frontend n'a pas le vendeurUserId).
 * On résout le nom du vendeur connecté exactement comme à la création d'un
 * dossier (`resolveCurrentVendeurName` dans useProjectActions) : d'abord via le
 * membre d'équipe correspondant à l'email, sinon prénom+nom, sinon partie locale
 * de l'email.
 *
 * NB sécurité : tant que le cycle de vie des dossiers vit côté client
 * (Zustand/localStorage), ce gating est une règle d'INTERFACE. Le durcissement
 * serveur (ownership sur les endpoints + CRUD dossier serveur) est un chantier
 * distinct.
 */

import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConfigStore } from '@/store/useConfigStore';

/** Forme minimale d'un dossier pour le contrôle d'accès. */
export interface DossierLike {
  vendeurName?: string | null;
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

export function useDossierPermissions() {
  const user = useAuthStore((s) => s.user);
  const members = useConfigStore((s) => s.members);

  const isAdmin = !!user && (user.role === 'ADMIN' || user.role === 'OWNER');

  // Nom du vendeur connecté (même résolution qu'à la création d'un dossier).
  const myVendeurName = useMemo<string | undefined>(() => {
    if (!user) return undefined;
    if (user.email) {
      const m = members.find((mb) => norm(mb.email) === norm(user.email));
      if (m?.name?.trim()) return m.name.trim();
    }
    const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (full) return full;
    if (user.email) {
      const local = user.email.split('@')[0]?.trim();
      if (local) return local;
    }
    return undefined;
  }, [user, members]);

  /** Le dossier appartient-il au vendeur connecté ? */
  const isOwnDossier = useCallback(
    (d?: DossierLike | null): boolean => {
      if (!d || !d.vendeurName) return false;
      return !!myVendeurName && norm(d.vendeurName) === norm(myVendeurName);
    },
    [myVendeurName],
  );

  /** Peut-on modifier/supprimer ce dossier ? (admin = tout, vendeur = les siens) */
  const canEditDossier = useCallback(
    (d?: DossierLike | null): boolean => isAdmin || isOwnDossier(d),
    [isAdmin, isOwnDossier],
  );

  return { isAdmin, myVendeurName, isOwnDossier, canEditDossier };
}
