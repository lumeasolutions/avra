import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Comment marche AVRA : du devis à la facture en 5 étapes",
  description: "Compte créé, configuration guidée, données importées, premier dossier : les 5 étapes pour démarrer, sans jargon. Démo gratuite de 30 minutes.",
  alternates: { canonical: "/comment-ca-marche" },
  openGraph: {
    title: "Comment \u00e7a marche \u2014 AVRA, l'ERP des pros de l'agencement",
    description: "D\u00e9couvrez en 4 \u00e9tapes comment AVRA transforme la gestion de vos chantiers : cr\u00e9ation de dossier, g\u00e9n\u00e9ration IA de devis, planning automatique et suivi facturation. D\u00e9mo gratuite.",
    url: "https://avra-app.fr/comment-ca-marche",
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: "AVRA - Comment \u00e7a marche en 4 \u00e9tapes",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Comment \u00e7a marche \u2014 AVRA, l'ERP des pros de l'agencement",
    description: "D\u00e9couvrez en 4 \u00e9tapes comment AVRA transforme la gestion de vos chantiers : cr\u00e9ation de dossier, g\u00e9n\u00e9ration IA de devis, planning automatique et suivi facturation. D\u00e9mo gratuite.",
    images: ['/opengraph-image.png'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
