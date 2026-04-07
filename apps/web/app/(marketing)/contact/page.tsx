import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact AVRA — Répondons à toutes vos questions',
  description:
    "Contactez l'équipe AVRA. Support technique, questions commerciales, partenariats. Réponse sous 24h. Email : contact@avra.fr",
  alternates: { canonical: 'https://avra.fr/contact' },
  openGraph: {
    title: 'Contact AVRA',
    description: "Contactez l'équipe AVRA. Réponse sous 24h.",
    url: 'https://avra.fr/contact',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
