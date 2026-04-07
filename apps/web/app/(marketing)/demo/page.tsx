import type { Metadata } from 'next';
import DemoClient from './DemoClient';

export const metadata: Metadata = {
  title: 'Demander une démo AVRA — Gratuite, sans engagement, 30 minutes',
  description:
    "Réservez une démo personnalisée d'AVRA. Un expert vous montre comment gérer vos dossiers, facturation et IA en 30 minutes. Gratuit et sans engagement.",
  alternates: { canonical: 'https://avra.fr/demo' },
  openGraph: {
    title: 'Demander une démo AVRA',
    description: 'Démo gratuite en 30 minutes, personnalisée, sans engagement.',
    url: 'https://avra.fr/demo',
  },
};

export default function DemoPage() {
  return <DemoClient />;
}
