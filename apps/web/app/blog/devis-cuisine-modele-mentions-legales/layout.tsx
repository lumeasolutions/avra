import type { Metadata } from 'next';

const TITLE = "Devis cuisine 2026 : modèle et mentions obligatoires";
const DESC = "Les 14 mentions légales obligatoires sur un devis de cuisine en 2026, un modèle conforme et les pièges qui coûtent une signature.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'devis cuisine',
    'modèle devis cuisine',
    'mentions légales devis',
    'devis cuisiniste obligatoire',
    'exemple devis cuisine',
    'devis cuisine PDF',
    'devis cuisine 2026',
    'mentions obligatoires devis artisan',
    'devis cuisine professionnel',
    'comment faire un devis cuisine',
  ],
  alternates: { canonical: '/blog/devis-cuisine-modele-mentions-legales' },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://avra-app.fr/blog/devis-cuisine-modele-mentions-legales',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    publishedTime: '2026-04-25T08:00:00.000Z',
    modifiedTime: '2026-05-01T08:00:00.000Z',
    authors: ['AVRA'],
    tags: ['Devis', 'Réglementation', 'Cuisiniste', 'Modèle'],
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'Devis cuisine 2026 — Modèle et mentions légales — Guide AVRA',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
