import type { Metadata } from 'next';
import './marketing.css';

export const metadata: Metadata = {
  title: {
    default: "AVRA — Logiciel N°1 des professionnels de l'agencement",
    template: '%s | AVRA',
  },
  description:
    "AVRA centralise dossiers clients, facturation, planning, stock et IA photo-réalisme en une seule app. Conçu pour cuisinistes, menuisiers et architectes d'intérieur. Essai gratuit 14 jours.",
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
    }}>
      {children}
    </div>
  );
}
