import type { Metadata } from 'next';

const TITLE = "Logiciel menuisier 2026 : le guide pour bien choisir";
const DESC = "Les 10 fonctions qui comptent vraiment, le comparatif des solutions et une méthode de choix en une semaine, pour les ateliers de menuiserie.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'logiciel menuisier',
    'ERP menuisier',
    'logiciel agencement bois',
    'logiciel atelier menuiserie',
    'devis menuisier logiciel',
    'gestion menuiserie',
    'logiciel professionnel menuisier 2026',
    'planning chantier menuisier',
    'facturation menuisier',
    'logiciel pose menuiserie',
  ],
  alternates: { canonical: '/blog/logiciel-menuisier-2026' },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://avra-app.fr/blog/logiciel-menuisier-2026',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    publishedTime: '2026-04-30T08:00:00.000Z',
    modifiedTime: '2026-05-01T08:00:00.000Z',
    authors: ['AVRA'],
    tags: ['Logiciels', 'Guide', 'Menuisier', 'ERP'],
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: "Logiciel menuisier 2026 — Guide AVRA" }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/opengraph-image.png'] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
