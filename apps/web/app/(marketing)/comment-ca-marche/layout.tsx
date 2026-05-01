import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Comment ça marche — AVRA, l'ERP des pros de l'agencement',
  description: 'Decouvrez en 4 etapes comment AVRA transforme la gestion de vos chantiers : creation de dossier, generation IA de devis, planning automatique et suivi facturation. Demo gratuite.',
  alternates: { canonical: '/comment-ca-marche' },
  openGraph: {
    title: 'Comment ça marche — AVRA, l'ERP des pros de l'agencement',
    description: 'Decouvrez en 4 etapes comment AVRA transforme la gestion de vos chantiers : creation de dossier, generation IA de devis, planning automatique et suivi facturation. Demo gratuite.',
    url: 'https://avra-app.fr/comment-ca-marche',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'AVRA - Comment ca marche en 4 etapes',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comment ça marche — AVRA, l'ERP des pros de l'agencement',
    description: 'Decouvrez en 4 etapes comment AVRA transforme la gestion de vos chantiers : creation de dossier, generation IA de devis, planning automatique et suivi facturation. Demo gratuite.',
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
