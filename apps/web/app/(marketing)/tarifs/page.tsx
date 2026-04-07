import type { Metadata } from 'next';
import TarifsClient from './TarifsClient';

export const metadata: Metadata = {
  title: 'Tarifs AVRA — À partir de 49€/mois, essai gratuit 14 jours sans CB',
  description:
    "Tarifs simples et transparents. Solo 49€, Pro 89€, Équipe 149€. 14 jours d'essai gratuit sans carte bancaire. Conforme e-facture 2026.",
  alternates: { canonical: 'https://avra.fr/tarifs' },
  openGraph: {
    title: 'Tarifs AVRA — Transparent & sans engagement',
    description: "À partir de 49€/mois. 14 jours d'essai gratuit. Conformité e-facture 2026 incluse.",
    url: 'https://avra.fr/tarifs',
  },
};

export default function TarifsPage() {
  return <TarifsClient />;
}
