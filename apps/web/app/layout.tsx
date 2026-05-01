import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import nextDynamic from 'next/dynamic';

// Perf : on supprime `force-dynamic` pour autoriser la pré-génération statique
// + ISR par segment (marketing = 1h, app = dynamique via 'use client').
// Le bug useContext(PathnameContext) de Next.js 14 est neutralisé par
// `pages/_error.tsx` qui court-circuite le fallback error boundary.

const ServiceWorkerRegistration = nextDynamic(
  () => import('@/app/components/ServiceWorkerRegistration'),
  { ssr: false }
);

// 29/04/2026 — Auto-reload sur chunk JS introuvable post-deploy.
// Catche les erreurs `Loading chunk failed` / 404 sur /_next/static/chunks/
// et fait un reload avec cache-buster (max 1× par minute via sessionStorage).
const ChunkErrorReloader = nextDynamic(
  () => import('@/app/components/ChunkErrorReloader'),
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
  authors: [{ name: 'AVRA', url: 'https://avra-app.fr' }],
  creator: 'AVRA',
  publisher: 'AVRA',
  metadataBase: new URL('https://avra-app.fr'),
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
    url: 'https://avra-app.fr',
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
        {/* Auto-reload sur chunk JS 404 — exécuté AVANT hydration React,
            sinon le ChunkErrorReloader ne peut pas catcher car il dépend
            du bundle qui contient le chunk failed. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
var SW_FLAG='avra_sw_purged_at';
var CHUNK_FLAG='avra_chunk_reloaded_at';
var COOLDOWN=600000;
function killAndReload(reason){
  try{var last=sessionStorage.getItem(CHUNK_FLAG);if(last&&Date.now()-parseInt(last,10)<60000)return;sessionStorage.setItem(CHUNK_FLAG,String(Date.now()));}catch(e){}
  Promise.resolve().then(function(){
    var p=[];
    if('serviceWorker' in navigator){p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister().catch(function(){return false});}));}).catch(function(){}));}
    if('caches' in window){p.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k).catch(function(){return false});}));}).catch(function(){}));}
    return Promise.all(p);
  }).then(function(){
    var u=new URL(window.location.href);
    u.searchParams.set('_cb',String(Date.now()));
    window.location.replace(u.toString());
  });
}
// Kill-switch proactif : si on détecte un SW enregistré OU des caches encore présents,
// on les supprime UNE fois (cooldown 10 min) sans reload pour préparer la prochaine
// navigation propre. Cela limite la persistence des anciens SW.
(function(){try{
  var lastPurge=sessionStorage.getItem(SW_FLAG);
  if(lastPurge&&Date.now()-parseInt(lastPurge,10)<COOLDOWN)return;
  if(!('serviceWorker' in navigator)&&!('caches' in window))return;
  Promise.resolve().then(function(){
    var p=[];
    if('serviceWorker' in navigator){p.push(navigator.serviceWorker.getRegistrations().then(function(rs){if(rs.length>0){sessionStorage.setItem(SW_FLAG,String(Date.now()));return Promise.all(rs.map(function(r){return r.unregister().catch(function(){return false});}));}}).catch(function(){}));}
    if('caches' in window){p.push(caches.keys().then(function(ks){if(ks.length>0){sessionStorage.setItem(SW_FLAG,String(Date.now()));return Promise.all(ks.map(function(k){return caches.delete(k).catch(function(){return false});}));}}).catch(function(){}));}
    return Promise.all(p);
  });
}catch(e){}})();
window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='SCRIPT'){var s=t.src||'';if(s.indexOf('/_next/static/chunks/')!==-1){killAndReload('script-404');return;}}var m=(e&&e.message||'').toLowerCase();if(m.indexOf('loading chunk')!==-1||m.indexOf('chunkloaderror')!==-1||m.indexOf("mime type ('text/plain')")!==-1){killAndReload('runtime');}},true);
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;var m=(typeof r==='string'?r:(r&&r.message))||'';m=m.toLowerCase();if(m.indexOf('loading chunk')!==-1||m.indexOf('chunkloaderror')!==-1){killAndReload('rejection');}});
}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${playfairDisplay.variable} min-h-screen`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
        {children}
        <ChunkErrorReloader />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
