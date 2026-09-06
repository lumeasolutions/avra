import type { Metadata } from 'next';

const TITLE = "Choisir son ERP de cuisiniste : le guide 2026";
const DESC = "12 critères de sélection, comparatif des solutions, pièges à éviter et checklist : la méthode pour choisir son ERP de cuisiniste en 2026.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'logiciel cuisiniste',
    'ERP cuisiniste',
    'choisir logiciel cuisiniste',
    'logiciel gestion cuisine',
    'CRM cuisiniste',
    'logiciel devis cuisine',
    'meilleur logiciel cuisiniste 2026',
    'logiciel pour cuisiniste',
    'gestion projet cuisine',
    'logiciel professionnel cuisine',
  ],
  alternates: { canonical: '/blog/comment-choisir-erp-cuisiniste' },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://avra-app.fr/blog/comment-choisir-erp-cuisiniste',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    publishedTime: '2026-04-28T08:00:00.000Z',
    modifiedTime: '2026-05-01T08:00:00.000Z',
    authors: ['AVRA'],
    tags: ['Logiciels', 'Guide', 'Cuisiniste', 'ERP'],
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'Comment choisir son ERP de cuisiniste — Guide AVRA',
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
