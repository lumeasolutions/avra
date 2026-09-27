import type { Metadata } from 'next';

const TITRE = 'Relevé de mesures cuisine : la checklist complète du métré';
const DESCRIPTION =
  "Cotes à trois hauteurs, équerrage, faux aplombs, réseaux, accès au chantier : la méthode "
  + "de relevé qui évite les reprises, et les dix erreurs qui coûtent une journée de pose.";
const URL = 'https://avra-app.fr/blog/releve-de-mesures-cuisine-checklist';
const IMAGE = 'https://avra-app.fr/images/blog/releve-de-mesures-cuisine.jpg';

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog/releve-de-mesures-cuisine-checklist' },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    images: [{ url: IMAGE, width: 1200, height: 630, alt: 'Relevé de mesures au télémètre laser dans une cuisine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITRE,
    description: DESCRIPTION,
    images: [IMAGE],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
