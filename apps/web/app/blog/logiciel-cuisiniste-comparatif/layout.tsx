import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Logiciel cuisiniste : comparatif 2026 des 7 meilleures solutions",
  description: "Comparatif ind\u00e9pendant des principaux logiciels de gestion pour cuisinistes en 2026 : AVRA, WinnerFlex, KitchenDraw, Optimea, ProgeCAD. Prix, IA, e-facture, support.",
  alternates: { canonical: "/blog/logiciel-cuisiniste-comparatif" },
  openGraph: {
    title: "Logiciel cuisiniste : comparatif 2026 des 7 meilleures solutions",
    description: "Comparatif ind\u00e9pendant des principaux logiciels de gestion pour cuisinistes en 2026 : AVRA, WinnerFlex, KitchenDraw, Optimea, ProgeCAD. Prix, IA, e-facture, support.",
    url: "https://avra-app.fr/blog/logiciel-cuisiniste-comparatif",
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: "Comparatif logiciels cuisiniste 2026",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Logiciel cuisiniste : comparatif 2026 des 7 meilleures solutions",
    description: "Comparatif ind\u00e9pendant des principaux logiciels de gestion pour cuisinistes en 2026 : AVRA, WinnerFlex, KitchenDraw, Optimea, ProgeCAD. Prix, IA, e-facture, support.",
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
