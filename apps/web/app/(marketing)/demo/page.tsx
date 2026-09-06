import type { Metadata } from 'next';
import DemoClient from './DemoClient';

export const metadata: Metadata = {
  title: "Démo AVRA gratuite — 30 minutes, sans engagement",
  description:
    "On vous montre AVRA sur vos propres dossiers : devis, planning, facturation. 30 minutes en visio, sans engagement ni carte bancaire.",
  alternates: { canonical: 'https://avra-app.fr/demo' },
  openGraph: {
    title: 'Demander une démo AVRA',
    description: 'Démo gratuite en 30 minutes, personnalisée, sans engagement.',
    url: 'https://avra-app.fr/demo',

    images: ['/opengraph-image.png'],
  },
};

export default function DemoPage() {
  return <DemoClient />;
}
