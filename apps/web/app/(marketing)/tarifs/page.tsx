import type { Metadata } from 'next';
import TarifsClient from './TarifsClient';

export const metadata: Metadata = {
  title: 'Tarifs AVRA — 149€/mois tout inclus, sans engagement',
  description:
    "Tarif simple et transparent : 149€/mois pour 1 showroom et 4 utilisateurs. Toutes les fonctionnalités incluses. Démo sur demande. Plan Entreprise sur devis pour franchises et groupes. Bêta privée — lancement juillet 2026.",
  alternates: { canonical: 'https://avra.fr/tarifs' },
  openGraph: {
    title: 'Tarifs AVRA — 149€/mois tout inclus',
    description: "1 showroom, 4 utilisateurs, toutes les fonctionnalités. Démo sur demande — Bêta privée, lancement juillet 2026.",
    url: 'https://avra.fr/tarifs',
  },
};

export default function TarifsPage() {
  return <TarifsClient />;
}
