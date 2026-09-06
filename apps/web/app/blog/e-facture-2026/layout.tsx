import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "E-facturation 2026 : ce que l'agencement doit savoir",
  description: "Calendrier, Factur-X, norme EN 16931, PDP, sanctions : le guide de la facture électronique 2026 pour cuisinistes, menuisiers et agenceurs.",
  alternates: { canonical: "/blog/e-facture-2026" },
  openGraph: {
    title: "E-facturation 2026 : ce que l'agencement doit savoir",
    description: "Calendrier, Factur-X, norme EN 16931, PDP, sanctions : le guide de la facture électronique 2026 pour cuisinistes, menuisiers et agenceurs.",
    url: "https://avra-app.fr/blog/e-facture-2026",
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: "Guide e-facture 2026 pour les pros de l'agencement",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "E-facturation 2026 : ce que l'agencement doit savoir",
    description: "Calendrier, Factur-X, norme EN 16931, PDP, sanctions : le guide de la facture électronique 2026 pour cuisinistes, menuisiers et agenceurs.",
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
