import type { Metadata } from 'next';
import Script from 'next/script';
import './marketing.css';
import { MarketingChatWrapper } from '@/components/layout/MarketingChatWrapper';
import BetaBanner from './components/BetaBanner';
import CookieBanner from './components/CookieBanner';

// Perf : ISR 1h pour les pages marketing (au lieu de force-dynamic qui re-SSR à chaque requête).
// Le contenu marketing est quasi-statique, 1h de cache = TTFB ~50ms via le CDN Vercel.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    default: "AVRA — Logiciel N°1 des professionnels de l'agencement",
    template: '%s | AVRA',
  },
  description:
    "AVRA centralise dossiers clients, facturation, planning, stock et IA photo-réalisme en une seule app. Conçu pour cuisinistes, menuisiers et architectes d'intérieur.",
  metadataBase: new URL('https://avra.fr'),
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
      {/* Plausible Analytics — RGPD-friendly, sans cookies */}
      <Script
        defer
        data-domain="avra.fr"
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
      <BetaBanner />
      {children}
      <MarketingChatWrapper />
      <CookieBanner />
    </div>
  );
}
