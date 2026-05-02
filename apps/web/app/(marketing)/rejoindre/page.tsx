import type { Metadata } from 'next';
import RejoindreClient from './RejoindreClient';

export const metadata: Metadata = {
  title: 'Rejoindre la bêta privée',
  description:
    "AVRA est en bêta privée jusqu'au lancement officiel en juillet 2026. Inscrivez-vous sur la liste d'attente pour être parmi les premiers professionnels à tester le logiciel.",
  robots: { index: true, follow: true },
  alternates: { canonical: '/rejoindre' },
};

export default function RejoindrePage() {
  return <RejoindreClient />;
}
