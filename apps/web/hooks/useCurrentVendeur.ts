'use client';

/**
 * useCurrentVendeur — résout le nom du vendeur correspondant à l'utilisateur
 * connecté. Priorité de résolution :
 *   1. UserMember du config store dont l'email matche celui du auth user
 *      (permet de garder firstName/lastName cohérents avec l'équipe configurée)
 *   2. firstName + lastName du auth.user
 *   3. Partie locale de l'email (avant @)
 *   4. undefined si pas connecté
 *
 * Architecture multi-vendeur 26/05/2026.
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConfigStore } from '@/store/useConfigStore';
import { resolveVendeurName } from '@/lib/vendeur-name';

export function useCurrentVendeurName(): string | undefined {
  const user = useAuthStore((s) => s.user);
  const members = useConfigStore((s) => s.members);
  return useMemo(() => resolveVendeurName(user, members), [user, members]);
}

/** Helper synchrone — utile dans des contextes hors composants (events, etc.). */
export function getCurrentVendeurNameFromStores(): string | undefined {
  return resolveVendeurName(
    useAuthStore.getState().user,
    useConfigStore.getState().members,
  );
}
