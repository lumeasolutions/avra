import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: "Contact AVRA — une question ? réponse sous 24 h",
  description:
    "Une question sur AVRA, une demande de démo ou un besoin particulier ? Écrivez-nous, on répond sous 24 h ouvrées.",
  alternates: { canonical: 'https://avra-app.fr/contact' },
  openGraph: {
    title: 'Contact AVRA',
    description: "Contactez l'équipe AVRA. Réponse sous 24h.",
    url: 'https://avra-app.fr/contact',

    images: ['/opengraph-image.png'],
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
