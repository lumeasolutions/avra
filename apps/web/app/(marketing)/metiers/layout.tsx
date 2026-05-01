import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Logiciel sur mesure pour cuisiniste, menuisier, architecte et agenceur',
  description: 'AVRA propose un ERP adapte a chaque metier de l'agencement : cuisiniste, menuisier, architecte d'interieur, agenceur. 4 portails specialises, 1 seule plateforme.',
  alternates: { canonical: '/metiers' },
  openGraph: {
    title: 'Logiciel sur mesure pour cuisiniste, menuisier, architecte et agenceur',
    description: 'AVRA propose un ERP adapte a chaque metier de l'agencement : cuisiniste, menuisier, architecte d'interieur, agenceur. 4 portails specialises, 1 seule plateforme.',
    url: 'https://avra-app.fr/metiers',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'AVRA pour tous les metiers de l'agencement',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Logiciel sur mesure pour cuisiniste, menuisier, architecte et agenceur',
    description: 'AVRA propose un ERP adapte a chaque metier de l'agencement : cuisiniste, menuisier, architecte d'interieur, agenceur. 4 portails specialises, 1 seule plateforme.',
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
