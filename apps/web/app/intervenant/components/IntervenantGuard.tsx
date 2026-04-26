'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Garde d'accès au portail intervenant.
 *
 * Différence avec AppGuard (côté pro) :
 *  - Vérifie auth comme AppGuard
 *  - N'impose pas la sélection profession
 *  - Si user non lié à un Intervenant côté serveur, les requêtes /intervenant-portal
 *    retourneront 403 → on laisse les pages gérer ce cas à la chargée.
 */
export function IntervenantGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    setReady(true);
    if (!token) {
      const hasCookie = typeof document !== 'undefined' && document.cookie.includes('logged_in=true');
      if (!hasCookie) {
        router.replace('/login?next=/intervenant');
      }
    }
  }, [token, router, hasHydrated]);

  if (!ready) {
    return <div style={{ minHeight: '100vh', background: '#f5eee8' }} />;
  }
  return <>{children}</>;
}
