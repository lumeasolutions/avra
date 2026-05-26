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

export function useCurrentVendeurName(): string | undefined {
  const user = useAuthStore((s) => s.user);
  const members = useConfigStore((s) => s.members);

  return useMemo(() => {
    if (!user) return undefined;
    // 1. Match par email avec un membre configuré
    if (user.email) {
      const match = members.find(
        (m) => m.email.trim().toLowerCase() === user.email.trim().toLowerCase(),
      );
      if (match?.name?.trim()) return match.name.trim();
    }
    // 2. Reconstituer depuis firstName/lastName
    const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (full) return full;
    // 3. Partie locale de l'email
    if (user.email) {
      const local = user.email.split('@')[0]?.trim();
      if (local) return local;
    }
    return undefined;
  }, [user, members]);
}

/** Helper synchrone — utile dans des contextes hors composants (events, etc.). */
export function getCurrentVendeurNameFromStores(): string | undefined {
  const user = useAuthStore.getState().user;
  if (!user) return undefined;
  const members = useConfigStore.getState().members;
  if (user.email) {
    const match = members.find(
      (m) => m.email.trim().toLowerCase() === user.email.trim().toLowerCase(),
    );
    if (match?.name?.trim()) return match.name.trim();
  }
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (full) return full;
  if (user.email) return user.email.split('@')[0] || undefined;
  return undefined;
}
