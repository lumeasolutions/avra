import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import '../(marketing)/marketing.css';
import { GLOSSARY, ALPHA_INDEX, AVAILABLE_LETTERS, ALL_TERMS, TOTAL_TERMS } from './data';
import GlossarySearch from './GlossarySearch';

const TITLE = "Glossaire de l'agencement : 80 termes du métier";
const DESC = "80 termes de l'agencement intérieur expliqués simplement : caisson, façade, chant, plinthe, Factur-X… Le vocabulaire des pros de la cuisine et du bois.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'glossaire agencement',
    'glossaire cuisiniste',
    'glossaire menuisier',
    'definition caisson',
    'definition facade cuisine',
    'definition Blumotion',
    'lexique cuisine',
    'lexique menuiserie',
    "definition devis cuisine",
    "definition Factur-X",
  ],
  alternates: { canonical: 'https://avra-app.fr/glossaire' },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://avra-app.fr/glossaire',
    siteName: 'AVRA',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: "Glossaire de l'agencement intérieur — AVRA" }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/opengraph-image.png'] },
};

export const revalidate = 86400; // 24h — contenu quasi-statique

export default function GlossairePage() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <header
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, rgba(201,169,110,0.18), transparent 60%), linear-gradient(180deg, #1e2b22 0%, #15201a 100%)',
          color: '#f9f6f0',
          paddingTop: '88px',
          paddingBottom: '64px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(201,169,110,0.14)',
              border: '1px solid rgba(201,169,110,0.35)',
              color: '#e8c97a',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            Glossaire metier · {TOTAL_TERMS} termes
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif',
              fontSize: 'clamp(2.2rem, 5.6vw, 4rem)',
              lineHeight: 1.08,
              fontWeight: 800,
              margin: '0 0 20px',
              letterSpacing: '-0.02em',
              maxWidth: 880,
            }}
          >
            Le dictionnaire de l'agencement intérieur
          </h1>
          <p
            style={{
              fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)',
              lineHeight: 1.55,
              color: 'rgba(249,246,240,0.78)',
              maxWidth: 760,
              margin: 0,
            }}
          >
            {TOTAL_TERMS} termes essentiels du métier de cuisiniste, menuisier et architecte d'intérieur — définis simplement, sans jargon, par des professionnels du secteur. Mis à jour pour 2026.
          </p>
        </div>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: '-120px',
            top: '-120px',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,169,110,0.18), transparent 70%)',
            filter: 'blur(40px)',
            zIndex: 1,
          }}
        />
      </header>

      {/* BODY */}
      <main style={{ background: '#f9f6f0', paddingTop: 48, paddingBottom: 64 }}>
        <div className="container">
          <GlossarySearch
            glossary={GLOSSARY}
            alphaIndex={ALPHA_INDEX}
            availableLetters={AVAILABLE_LETTERS}
          />
        </div>
      </main>

      <Footer />

      {/* JSON-LD : DefinedTermSet (norme Google pour les glossaires) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            '@id': 'https://avra-app.fr/glossaire',
            name: "Glossaire de l'agencement intérieur",
            description: DESC,
            inLanguage: 'fr-FR',
            url: 'https://avra-app.fr/glossaire',
            hasDefinedTerm: ALL_TERMS.map((t) => ({
              '@type': 'DefinedTerm',
              '@id': `https://avra-app.fr/glossaire#${t.id}`,
              name: t.term,
              description: t.definition,
              inDefinedTermSet: 'https://avra-app.fr/glossaire',
              url: `https://avra-app.fr/glossaire#${t.id}`,
            })),
          }),
        }}
      />

      {/* JSON-LD : BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://avra-app.fr/' },
              { '@type': 'ListItem', position: 2, name: 'Glossaire', item: 'https://avra-app.fr/glossaire' },
            ],
          }),
        }}
      />
    </>
  );
}
