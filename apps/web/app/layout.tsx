import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { MarketingChatWrapper } from '@/components/layout/MarketingChatWrapper';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-playfair-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "AVRA — Logiciel de gestion N°1 pour les professionnels de l'agencement",
    template: '%s | AVRA',
  },
  description:
    "AVRA centralise dossiers clients, facturation, planning, stock et IA photo-réalisme en une seule app. Conçu pour cuisinistes, menuisiers et architectes d'intérieur. Essai gratuit 14 jours.",
  keywords: [
    'logiciel agencement',
    'ERP cuisiniste',
    'gestion dossiers cuisine',
    'logiciel menuisier',
    "architecte intérieur logiciel",
    'facturation agencement',
    'IA photo réalisme cuisine',
    'planning chantier',
    'logiciel gestion projet agencement',
    'devis cuisine logiciel',
  ],
  authors: [{ name: 'AVRA', url: 'https://avra-kappa.vercel.app' }],
  creator: 'AVRA',
  publisher: 'AVRA',
  metadataBase: new URL('https://avra-kappa.vercel.app'),
  alternates: { canonical: '/' },
  openGraph: {
    title: "AVRA — Le logiciel N°1 des professionnels de l'agencement",
    description:
      'Gérez dossiers, facturation, planning et IA depuis une seule app pensée pour votre métier. +2 400 professionnels font confiance à AVRA.',
    url: 'https://avra-kappa.vercel.app',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'AVRA - ERP pour les professionnels de l\'agencement',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AVRA — Logiciel N°1 de l'agencement",
    description:
      "Gérez vos projets d'agencement sans effort. Dossiers, facturation, IA, planning — tout en un.",
    creator: '@avra_app',
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#304035" />
      </head>
      <body className={`${dmSans.variable} ${playfairDisplay.variable} min-h-screen`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {children}
        <MarketingChatWrapper />
      </body>
    </html>
  );
}
