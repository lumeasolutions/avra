'use client';

/**
 * REST 14/07/2026 — L'ancienne page /dashboard (vue pilotage autonome) faisait
 * DOUBLON avec le vrai tableau de bord accessible depuis le menu, à savoir le
 * portail métier /portail-{profession}. Elle n'était liée nulle part (accessible
 * seulement par URL directe) et prêtait à confusion.
 *
 * On la remplace par une simple redirection vers le portail métier de
 * l'utilisateur — il n'existe donc plus qu'UN seul tableau de bord.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const profession = useAuthStore((s) => s.profession);

  useEffect(() => {
    const target = profession ? `/portail-${profession}` : '/dossiers';
    router.replace(target);
  }, [profession, router]);

  return (
    <div className="text-center py-16 text-[#304035]/50">
      Redirection vers votre tableau de bord…
    </div>
  );
}
