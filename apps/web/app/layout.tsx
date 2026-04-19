import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import nextDynamic from 'next/dynamic';

// Force all pages to be server-rendered (not statically pre-generated)
// This prevents the useContext(PathnameContext) SSR error from Next.js error boundaries
export const dynamic = 'force-dynamic';

const ServiceWorkerRegistration = nextDynamic(
  () => import('@/app/components/ServiceWorkerRegistration'),
  { ssr: false }
);

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
    "AVRA, le logiciel complet avec assistant IA dédié aux pros de l'agencement. Dossiers, devis, facturation, rendus IA et planning — tout en une seule app.",
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AVRA',
    startupImage: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: "AVRA — Logiciel N°1 des pros de l'agencement",
    description:
      "AVRA, le logiciel complet avec assistant IA dédié aux pros de l'agencement. Dossiers, devis, facturation, rendus IA et planning — tout en une seule app.",
    url: 'https://avra-kappa.vercel.app',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: "AVRA - Logiciel N°1 des professionnels de l'agencement",
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
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/avra-icon.svg', color: '#1e2b22' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#1e2b22',
    'msapplication-TileImage': '/icons/icon-144x144.png',
    'msapplication-config': '/browserconfig.xml',
  },
  category: 'technology',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#1e2b22" />
      </head>
      <body className={`${dmSans.variable} ${playfairDisplay.variable} min-h-screen`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
