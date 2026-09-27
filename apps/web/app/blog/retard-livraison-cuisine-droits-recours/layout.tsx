import type { Metadata } from 'next';

const TITRE = 'Retard de livraison : ce que vous devez au client, ce que le fournisseur vous doit';
const DESCRIPTION =
  "Délai de 30 jours, mise en demeure, résolution du contrat, remboursement majoré jusqu'à 50 % : "
  + "le cadre légal du retard de livraison, et la méthode pour ne plus le subir.";
const URL = 'https://avra-app.fr/blog/retard-livraison-cuisine-droits-recours';
const IMAGE = 'https://avra-app.fr/images/blog/retard-livraison-cuisine.jpg';

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog/retard-livraison-cuisine-droits-recours' },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: URL,
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'article',
    images: [{ url: IMAGE, width: 1200, height: 630, alt: 'Cuisine en cours de pose, livraison incomplète' }],
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
