'use client';

/**
 * /dossiers-perdus — ancienne page, remplacée par Paramètres → Dossiers perdus.
 *
 * Les dossiers perdus sont réservés à l'administrateur (décision du
 * 05/10/2026) ; cette page restait ouverte à tous. Elle redirige désormais :
 * l'admin vers le panneau des Paramètres (qui a son bouton Restaurer), les
 * autres vers leurs dossiers.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDossierPermissions } from '@/hooks/useDossierPermissions';

export default function DossiersPerdusPage() {
  const router = useRouter();
  const { isAdmin } = useDossierPermissions();
  useEffect(() => {
    router.replace(isAdmin ? '/parametres?section=perdus' : '/dossiers');
  }, [isAdmin, router]);
  return null;
}
