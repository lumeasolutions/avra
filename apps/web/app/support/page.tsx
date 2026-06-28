/**
 * /support — Portail SUPPORT AVRA (back-office fondateurs)
 *
 * Accès réservé aux 2 comptes support (vérifié côté serveur dans chaque route
 * /api/support/*). La page elle-même ne charge aucune donnée sans ce contrôle :
 * sans autorisation, l'API renvoie 401 et l'UI affiche « accès refusé ».
 *
 * V1 : recherche client, fiche 360° (profil, compteurs, dossiers en lecture
 * seule), journal d'audit. Impersonation complète (« se connecter comme ») = V2.
 */

import type { Metadata } from 'next';
import SupportClient from './SupportClient';

export const metadata: Metadata = {
  title: 'Support — AVRA',
  description: 'Back-office support AVRA',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function SupportPage() {
  return <SupportClient />;
}
