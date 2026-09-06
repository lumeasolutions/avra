import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "AVRA par métier : cuisiniste, menuisier, architecte",
  description: "AVRA s'adapte à votre métier. Ce que change le logiciel selon que vous êtes cuisiniste, agenceur, menuisier ou architecte d'intérieur.",
  alternates: { canonical: "/metiers" },
  openGraph: {
    title: "Logiciel sur mesure pour cuisiniste, menuisier, architecte et agenceur",
    description: "AVRA propose un ERP adapt\u00e9 \u00e0 chaque m\u00e9tier de l'agencement : cuisiniste, menuisier, architecte d'int\u00e9rieur, agenceur. 4 portails sp\u00e9cialis\u00e9s, 1 seule plateforme.",
    url: "https://avra-app.fr/metiers",
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: "AVRA pour tous les m\u00e9tiers de l'agencement",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Logiciel sur mesure pour cuisiniste, menuisier, architecte et agenceur",
    description: "AVRA propose un ERP adapt\u00e9 \u00e0 chaque m\u00e9tier de l'agencement : cuisiniste, menuisier, architecte d'int\u00e9rieur, agenceur. 4 portails sp\u00e9cialis\u00e9s, 1 seule plateforme.",
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
