import type { Metadata } from 'next';

const TITLE = "5 erreurs qui plombent la marge d'un cuisiniste";
const DESC = "Devis sous-estimés, sous-traitance non chiffrée, retards fournisseurs, SAV oublié, prix matière figés : 5 fuites de marge et comment les fermer.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'marge cuisiniste',
    'rentabilite cuisiniste',
    'erreurs cuisiniste',
    'augmenter marge cuisine',
    'comment etre rentable cuisiniste',
    'calcul marge cuisine',
    'pricing cuisiniste',
    'erreurs devis cuisine',
    'gestion atelier cuisine',
    'profit cuisiniste',
  ],
  alternates: { canonical: '/blog/5-erreurs-marge-cuisiniste' },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://avra-app.fr/blog/5-erreurs-marge-cuisiniste',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    publishedTime: '2026-05-01T08:00:00.000Z',
    modifiedTime: '2026-05-01T08:00:00.000Z',
    authors: ['AVRA'],
    tags: ['Marge', 'Rentabilite', 'Cuisiniste', 'Methodes'],
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: '5 erreurs marge cuisiniste — Guide AVRA' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/opengraph-image.png'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
