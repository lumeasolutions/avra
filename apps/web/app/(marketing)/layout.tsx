import type { Metadata } from 'next';
import './marketing.css';
import { MarketingChatWrapper } from '@/components/layout/MarketingChatWrapper';
import BetaBanner from './components/BetaBanner';
// CookieBanner, Plausible et GoogleAnalytics sont desormais montes dans le
// layout RACINE via @/app/components/PublicAnalytics, pour couvrir aussi la
// homepage et les pages SEO geo qui sont a la racine de app/.

// Perf : ISR 1h pour les pages marketing (au lieu de force-dynamic qui re-SSR à chaque requête).
// Le contenu marketing est quasi-statique, 1h de cache = TTFB ~50ms via le CDN Vercel.
export const revalidate = 3600;

// `template: '%s'` doit rester aligne sur celui du layout racine : le suffixe
// « | AVRA » etait ajoute a des titres qui contenaient deja la marque, d'ou des
// doublons et un debordement au-dela des ~60 caracteres affiches par Google.
// La marque est desormais portee page par page, la ou elle apporte vraiment.
export const metadata: Metadata = {
  title: {
    default: 'Logiciel de gestion pour cuisinistes et menuisiers | AVRA',
    template: '%s',
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
      <BetaBanner />
      {children}
      <MarketingChatWrapper />
    </div>
  );
}
