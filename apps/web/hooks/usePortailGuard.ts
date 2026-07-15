'use client';

import { useEffect } from 'react';
import { useAuthStore, Profession, isMultiMetierEmail } from '@/store/useAuthStore';

/**
 * Protège une page portail : si l'utilisateur a un portail défini différent,
 * il est redirigé vers son propre portail.
 *
 * EXCEPTION : les comptes multi-métier (fondateurs) peuvent visiter n'importe
 * quel portail — on ne les redirige jamais.
 */
export function usePortailGuard(expectedPortail: Profession) {
  const profession = useAuthStore((s) => s.profession);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const email = useAuthStore((s) => s.user?.email);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isMultiMetierEmail(email)) return; // Accès libre à tous les portails
    if (!profession) return; // Pas encore de portail défini, laisser passer
    if (profession !== expectedPortail) {
      window.location.replace(`/portail-${profession}`);
    }
  }, [profession, hasHydrated, expectedPortail, email]);
}
