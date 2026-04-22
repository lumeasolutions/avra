/**
 * /portail-admin — Dashboard admin AVRA (bêta privée)
 *
 * Accès protégé : seuls les emails dans BETA_ADMIN_EMAILS peuvent
 * accéder aux données via les routes API /api/admin/waitlist et /api/admin/demo-requests.
 *
 * Fonctionnalités :
 * - Vue tabulaire waitlist (email, nom, métier, date, source)
 * - Vue tabulaire demandes de démo (+ statut + téléphone)
 * - Compteurs en temps réel
 * - Export CSV pour les deux listes
 */

import type { Metadata } from 'next';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Administration — AVRA',
  description: 'Dashboard admin bêta privée AVRA',
  robots: { index: false, follow: false },
};

export default function PortailAdminPage() {
  return <AdminDashboardClient />;
}
