'use client';

import { useEffect } from 'react';
import { useAuthStore, Profession } from '@/store/useAuthStore';

/**
 * Protège une page portail : si l'utilisateur a un portail défini différent,
 * il est redirigé vers son propre portail.
 */
export function usePortailGuard(expectedPortail: Profession) {
  const profession = useAuthStore((s) => s.profession);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!profession) return; // Pas encore de portail défini, laisser passer
    if (profession !== expectedPortail) {
      window.location.replace(`/portail-${profession}`);
    }
  }, [profession, hasHydrated, expectedPortail]);
}
