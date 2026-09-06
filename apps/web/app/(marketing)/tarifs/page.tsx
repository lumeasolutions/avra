import type { Metadata } from 'next';
import TarifsClient from './TarifsClient';

export const metadata: Metadata = {
  title: "Tarifs AVRA — 149 €/mois tout inclus, sans engagement",
  description:
    "Un seul abonnement, tous les modules compris : 149 €/mois, ou 130 €/mois en annuel. 1 showroom, 4 utilisateurs. Démo gratuite sur demande.",
  alternates: { canonical: 'https://avra-app.fr/tarifs' },
  openGraph: {
    title: 'Tarifs AVRA — 149€/mois tout inclus',
    description: "1 showroom, 4 utilisateurs, toutes les fonctionnalités. Démo sur demande — Bêta privée, lancement janvier 2027.",
    url: 'https://avra-app.fr/tarifs',

    images: ['/opengraph-image.png'],
  },
};

export default function TarifsPage() {
  return <TarifsClient />;
}
