import type { Metadata } from 'next';
import Script from 'next/script';
import './marketing.css';
import { MarketingChatWrapper } from '@/components/layout/MarketingChatWrapper';
import BetaBanner from './components/BetaBanner';
// CookieBanner, Plausible et GoogleAnalytics sont desormais montes dans le
// layout RACINE via @/app/components/PublicAnalytics, pour couvrir aussi la
// homepage et les pages SEO geo qui sont a la racine de app/.

// Perf : ISR 1h pour les pages marketing (au lieu de force-dynamic qui re-SSR à chaque requête).
// Le contenu marketing est quasi-statique, 1h de cache = TTFB ~50ms via le CDN Vercel.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    default: "AVRA — Logiciel d'agencement avec IA pour cuisinistes & menuisiers",
    template: '%s | AVRA',
  },
  description:
    "AVRA centralise dossiers clients, facturation, planning, stock et IA photo-réalisme en une seule app. Conçu pour cuisinistes, menuisiers et architectes d'intérieur.",
  metadataBase: new URL('https://avra-app.fr'),
  openGraph: {
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-mkt style={{
      background: '#ffffff',
      color: '#1e2b22',
      minHeight: '100vh',
      fontFamily: 'var(--font-dm-sans, "DM Sans"), system-ui, sans-serif',
      paddingTop: '36px', // espace pour le BetaBanner fixé en haut
    }}>
      {/* SEO — Donnees structurees schema.org (Organization + WebSite + SoftwareApplication) */}
      <Script
        id="ld-organization"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'AVRA',
            legalName: 'Lumea Solutions',
            url: 'https://avra-app.fr',
            logo: 'https://avra-app.fr/icons/icon-512x512.png',
            description: "AVRA, l'ERP nouvelle generation des professionnels de l'agencement (cuisinistes, menuisiers, architectes d'interieur, agenceurs).",
            foundingDate: '2026',
            areaServed: { '@type': 'Country', name: 'France' },
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: 'contact@avra-app.fr',
              availableLanguage: ['French'],
            },
          }),
        }}
      />
      <Script
        id="ld-website"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            url: 'https://avra-app.fr',
            name: 'AVRA',
            inLanguage: 'fr-FR',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://avra-app.fr/search?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <Script
        id="ld-softwareapp"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AVRA',
            applicationCategory: 'BusinessApplication',
            applicationSubCategory: 'ERP',
            operatingSystem: 'Web',
            url: 'https://avra-app.fr',
            description: "Logiciel de gestion tout-en-un pour cuisinistes, menuisiers et architectes d'interieur : dossiers, devis, facturation electronique 2026, IA photo-realiste, planning, signature, paiement.",
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EUR',
              availability: 'https://schema.org/PreOrder',
              description: 'Beta privee jusqu\'au lancement public en janvier 2027',
            },
            inLanguage: 'fr-FR',
            featureList: [
              'Gestion de dossiers clients',
              'Facturation electronique conforme 2026',
              'IA photo-realisme et coloriste',
              'Planning et planning-gestion',
              'Signature electronique',
              'Stock et catalogue produits',
              'Statistiques et tableau de bord',
              'Portails partenaires intervenants',
            ],
            publisher: {
              '@type': 'Organization',
              name: 'Lumea Solutions',
              url: 'https://avra-app.fr',
            },
          }),
        }}
      />
      <BetaBanner />
      {children}
      <MarketingChatWrapper />
    </div>
  );
}
