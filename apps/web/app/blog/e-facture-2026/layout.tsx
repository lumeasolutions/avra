import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'E-facturation 2026 : tout ce que les pros de l'agencement doivent savoir',
  description: 'Le guide complet sur l'obligation de facture electronique 2026 pour cuisinistes, menuisiers et agenceurs. Calendrier, normes (Factur-X, EN 16931), PDP, sanctions et solutions.',
  alternates: { canonical: '/blog/e-facture-2026' },
  openGraph: {
    title: 'E-facturation 2026 : tout ce que les pros de l'agencement doivent savoir',
    description: 'Le guide complet sur l'obligation de facture electronique 2026 pour cuisinistes, menuisiers et agenceurs. Calendrier, normes (Factur-X, EN 16931), PDP, sanctions et solutions.',
    url: 'https://avra-app.fr/blog/e-facture-2026',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'Guide e-facture 2026 pour les pros de l'agencement',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'E-facturation 2026 : tout ce que les pros de l'agencement doivent savoir',
    description: 'Le guide complet sur l'obligation de facture electronique 2026 pour cuisinistes, menuisiers et agenceurs. Calendrier, normes (Factur-X, EN 16931), PDP, sanctions et solutions.',
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
