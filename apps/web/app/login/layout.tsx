import type { Metadata } from 'next';

// SEO 06/09/2026 — /login remontait 62 impressions sur 3 mois : une page de
// connexion qui apparait dans la SERP consomme du budget de crawl et attire
// des visiteurs qui n'ont pas de compte. On la desindexe par balise plutot que
// par robots.txt, pour que Google puisse effectivement LIRE le noindex.
export const metadata: Metadata = {
  title: 'Connexion — AVRA',
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
