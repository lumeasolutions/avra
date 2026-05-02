'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;

    // Marquer comme prêt dès que l'hydration est faite
    setReady(true);

    if (pathname === '/login') return;

    if (!token) {
      const hasCookie = typeof document !== 'undefined' && document.cookie.includes('logged_in=true');
      if (!hasCookie) {
        router.replace('/login');
      }
    }
  }, [token, pathname, router, hasHydrated]);

  // Tant que Zustand n'a pas réhydraté, on montre le layout vide
  // (pas de spinner lourd, juste le fond pour éviter le flash blanc)
  if (!ready) {
    return <div style={{ minHeight: '100vh', background: '#f5eee8' }} />;
  }

  return <>{children}</>;
}
