'use client';

/**
 * PublicAnalytics — AVRA
 *
 * Monte le CookieBanner + Plausible + GoogleAnalytics4 UNIQUEMENT sur les pages
 * publiques (homepage, pages SEO geo, blog, marketing, login). Sur les pages
 * authentifiees ((app)/* type /dashboard, /dossiers...), rien n'est charge :
 *  - pas de banner cookies (les utilisateurs internes ont deja accepte les CGU
 *    en s'inscrivant, et on ne veut pas polluer les stats avec leur usage)
 *  - pas de Plausible/GA4 (les analytics marketing doivent mesurer les
 *    visiteurs, pas les utilisateurs deja convertis).
 *
 * Pourquoi ce composant existe :
 *  La homepage `app/page.tsx` et les pages SEO geo (/cuisiniste-paris,
 *  /menuisier-lyon, etc.) sont a la RACINE de app/, donc elles n'heritent PAS
 *  du layout `app/(marketing)/layout.tsx`. Les analytics et le banner doivent
 *  donc etre montes au niveau du layout racine, mais avec un filtrage par
 *  pathname pour exclure les pages applicatives.
 */

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Routes a exclure (pages authentifiees, portails, intervenants).
// Les pages publiques (homepage `/`, pages geo `/cuisiniste-paris`, blog,
// marketing, login) ne matchent aucun de ces prefixes et sont donc trackees.
const APP_PREFIXES = [
  '/dashboard',
  '/dossiers',
  '/dossiers-signes',
  '/planning',
  '/planning-gestion',
  '/facturation',
  '/commandes',
  '/notifications',
  '/parametres',
  '/sav',
  '/signature',
  '/historique',
  '/ia-studio',
  '/assistant',
  '/admin-docs',
  '/intervenants',
  '/portail-architecte',
  '/portail-cuisiniste',
  '/portail-menuisier',
  '/portail-admin',
  '/portal-select',
  '/intervenant',
  '/invitation',
  '/epaiement',
];

const CookieBanner = dynamic(() => import('@/app/(marketing)/components/CookieBanner'), {
  ssr: false,
});
const GoogleAnalytics = dynamic(() => import('@/app/(marketing)/components/GoogleAnalytics'), {
  ssr: false,
});

// Vercel Speed Insights — mesure les Core Web Vitals reels (LCP, INP, CLS)
// sur les utilisateurs reels. Gratuit jusqu'a 10K page views/mois.
const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => ({ default: m.SpeedInsights })),
  { ssr: false },
);

export default function PublicAnalytics() {
  const pathname = usePathname() || '/';

  // Si on est sur une route applicative, on ne monte rien.
  const isAppRoute = APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (isAppRoute) return null;

  return (
    <>
      {/* Plausible Analytics — RGPD-friendly, sans cookies, sans consentement requis */}
      <Script
        defer
        data-domain="avra-app.fr"
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
      {/* Google Analytics 4 — charge UNIQUEMENT apres consentement cookies */}
      <GoogleAnalytics />
      {/* Banner RGPD */}
      <CookieBanner />
      {/* Vercel Speed Insights — Core Web Vitals reels (LCP, INP, CLS) */}
      <SpeedInsights />
    </>
  );
}
