import type { Metadata, Viewport } from 'next';

// SEO 06/09/2026 — /login remontait 62 impressions sur 3 mois : une page de
// connexion qui apparait dans la SERP consomme du budget de crawl et attire
// des visiteurs qui n'ont pas de compte. On la desindexe par balise plutot que
// par robots.txt, pour que Google puisse effectivement LIRE le noindex.
export const metadata: Metadata = {
  title: 'Connexion — AVRA',
  robots: { index: false, follow: true },
};

// La photo passe sous l'encoche et la barre d'état du téléphone (les marges
// de l'écran utilisent env(safe-area-inset-*)), et la barre du navigateur
// prend la couleur de la nuit de la photo.
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#0f1612',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
