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

// PublicAnalytics : monte CookieBanner + Plausible + GA4 sur les pages publiques
// uniquement (home, pages SEO geo, blog, marketing, login). Exclut les pages
// app authentifiees pour ne pas polluer les stats marketing.
const PublicAnalytics = nextDynamic(
  () => import('@/app/components/PublicAnalytics'),
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

/**
 * Version des icônes (écran d'accueil, onglet, PWA).
 *
 * iOS range les icônes dans une base indexée par URL : tant que l'adresse ne
 * change pas, le téléphone ressert son ancienne copie, même si on supprime et
 * recrée le raccourci de l'écran d'accueil. Le seul moyen fiable de forcer un
 * nouveau téléchargement est de changer l'URL.
 *
 * À incrémenter à chaque fois que le contenu des icônes change
 * (scripts/generate-icons.py), sans oublier public/manifest.json.
 *
 * v3 — septembre 2026 : chouette recadrée en carré, remplit 96 % du cadre.
 */
const ICON_VERSION = 'v=3';

export const metadata: Metadata = {
  title: {
    default: "AVRA — Logiciel d'agencement avec IA pour cuisinistes & menuisiers",
    template: '%s | AVRA',
  },
  description:
    "Dossiers, devis, facturation, planning et rendus IA dans une seule app dédiée aux pros de l'agencement : cuisinistes, menuisiers, architectes.",
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
    startupImage: `/icons/apple-touch-icon.png?${ICON_VERSION}`,
  },
  openGraph: {
    title: "AVRA — Logiciel d'agencement avec IA pour cuisinistes & menuisiers",
    description:
      "Dossiers, devis, facturation, planning et rendus IA dans une seule app dédiée aux pros de l'agencement : cuisinistes, menuisiers, architectes.",
    url: 'https://avra-app.fr',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: "AVRA - Logiciel d'agencement avec IA pour cuisinistes & menuisiers",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AVRA — Logiciel d'agencement avec IA",
    description:
      "Dossiers, devis, facturation, planning et rendus IA dans une seule app dédiée aux pros de l'agencement.",
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
      { url: `/icons/icon-192x192.png?${ICON_VERSION}`, sizes: '192x192', type: 'image/png' },
      { url: `/icons/icon-512x512.png?${ICON_VERSION}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: `/icons/apple-touch-icon.png?${ICON_VERSION}`, sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#1e2b22',
    'msapplication-TileImage': `/icons/icon-144x144.png?${ICON_VERSION}`,
    'msapplication-config': '/browserconfig.xml',
  },
  category: 'technology',
  verification: {
    google: 'CKslq_30_9juATj6U8jLMNDEEngx6u4elLdDIpwxQE8',
  },
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
var ATTEMPT_FLAG='avra_chunk_attempt';
var MAX_ATTEMPTS=4;
function killAndReload(reason){
  var n=0;try{n=parseInt(sessionStorage.getItem(ATTEMPT_FLAG)||'0',10)||0;}catch(e){}
  if(n>=MAX_ATTEMPTS)return;
  try{sessionStorage.setItem(ATTEMPT_FLAG,String(n+1));}catch(e){}
  var delay=Math.min(400*Math.pow(2,n),4000);
  Promise.resolve().then(function(){
    var p=[];
    if('serviceWorker' in navigator){p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister().catch(function(){return false});}));}).catch(function(){}));}
    if('caches' in window){p.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k).catch(function(){return false});}));}).catch(function(){}));}
    return Promise.all(p);
  }).then(function(){
    setTimeout(function(){
      var u=new URL(window.location.href);
      u.searchParams.set('_cb',String(Date.now()));
      window.location.replace(u.toString());
    },delay);
  });
}
window.addEventListener('load',function(){setTimeout(function(){try{sessionStorage.removeItem(ATTEMPT_FLAG);}catch(e){}try{if(window.history&&window.history.replaceState){var u2=new URL(window.location.href);if(u2.searchParams.has('_cb')){u2.searchParams.delete('_cb');window.history.replaceState(null,'',u2.toString());}}}catch(e){}},6000);});
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
        <PublicAnalytics />
      </body>
    </html>
  );
}
