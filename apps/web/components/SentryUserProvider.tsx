'use client';

/**
 * SentryUserProvider — attribue chaque erreur Sentry à l'utilisateur connecté.
 *
 * Sans ceci, les erreurs remontées dans Sentry ne portent aucune identité, donc
 * impossible de savoir QUEL client a planté. On pose ici l'identité (id + email)
 * dès que la session est connue, et on la retire à la déconnexion.
 *
 * Conséquence : le portail support peut ensuite filtrer les erreurs par client
 * (cf. /api/support/errors?email=...).
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuthStore } from '@/store/useAuthStore';

export function SentryUserProvider() {
  const userId = useAuthStore((s) => s.user?.id);
  const email = useAuthStore((s) => s.user?.email);

  useEffect(() => {
    try {
      if (email) {
        Sentry.setUser({ id: userId, email });
      } else {
        Sentry.setUser(null);
      }
    } catch {
      /* Sentry non initialisé (DSN absent) : on ignore silencieusement. */
    }
  }, [userId, email]);

  return null;
}
