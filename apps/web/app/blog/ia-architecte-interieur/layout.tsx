import type { Metadata } from 'next';

const TITLE = "IA pour architectes d'intérieur : 7 outils qui changent vraiment le métier en 2026";
const DESC = "Les outils d'intelligence artificielle qui révolutionnent l'architecture d'intérieur en 2026 : photo-réalisme, coloriste IA, génération de moodboards, reconnaissance de plans. Avis d'experts et cas d'usage concrets.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "IA architecte d'intérieur",
    "intelligence artificielle décoration",
    "logiciel architecte d'intérieur 2026",
    "IA design d'intérieur",
    "photo réaliste IA décoration",
    "moodboard IA",
    "rendu 3D IA",
    "outil IA architecte",
    "architecte d'intérieur logiciel",
    "IA aménagement intérieur",
  ],
  alternates: { canonical: '/blog/ia-architecte-interieur' },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://avra-app.fr/blog/ia-architecte-interieur',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    publishedTime: '2026-04-22T08:00:00.000Z',
    modifiedTime: '2026-05-01T08:00:00.000Z',
    authors: ['AVRA'],
    tags: ['IA', 'Architecture intérieure', 'Outils', 'Métier'],
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: "IA pour architectes d'intérieur — Guide AVRA",
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
