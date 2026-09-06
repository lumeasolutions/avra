import type { Metadata } from 'next';
import RejoindreClient from './RejoindreClient';

export const metadata: Metadata = {
  title: "Rejoindre la bêta privée AVRA — liste d'attente",
  description:
    "AVRA est en bêta privée jusqu'au lancement de janvier 2027. Inscrivez-vous sur la liste d'attente pour faire partie des premiers testeurs.",
  robots: { index: true, follow: true },
  alternates: { canonical: '/rejoindre' },
};

export default function RejoindrePage() {
  return <RejoindreClient />;
}
