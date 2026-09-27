import type { Metadata } from 'next';

const TITRE = 'TVA cuisine : 10 %, 5,5 % ou 20 % ? Le guide ligne par ligne';
const DESCRIPTION =
  "Meubles, électroménager, pose, plan de travail : quel taux de TVA sur quelle ligne de devis. "
  + "Fin de l'attestation, mention obligatoire, gros équipements exclus et cas chiffrés.";
const URL = 'https://avra-app.fr/blog/tva-cuisine-10-ou-20';
const IMAGE = 'https://avra-app.fr/images/blog/tva-cuisine-10-ou-20.jpg';

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog/tva-cuisine-10-ou-20' },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    images: [{ url: IMAGE, width: 1200, height: 630, alt: 'Devis de cuisine et calcul de TVA' }],
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
