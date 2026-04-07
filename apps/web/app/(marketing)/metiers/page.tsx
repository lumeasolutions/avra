import type { Metadata } from 'next';
import {
  ChefHat,
  Hammer,
  Pencil,
  Layout,
  Clock,
  FileX,
  Users,
  TrendingDown,
  Check,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'AVRA pour chaque métier — Cuisiniste, Menuisier, Architecte d\'intérieur, Agenceur',
  description:
    "AVRA s'adapte à votre métier. Fonctionnalités spécifiques pour cuisinistes, menuisiers, architectes d'intérieur et agenceurs. Essai gratuit 14 jours.",
  alternates: { canonical: 'https://avra.fr/metiers' },
  openGraph: {
    title: 'AVRA pour chaque métier — Cuisiniste, Menuisier, Architecte d\'intérieur, Agenceur',
    description: "AVRA s'adapte à votre métier. Fonctionnalités spécifiques pour chaque professionnel de l'agencement.",
    url: 'https://avra.fr/metiers',
  },
};

// Icons mapping for metiers
const metierIcons = {
  cuisiniste: ChefHat,
  menuisier: Hammer,
  architecte: Pencil,
  agenceur: Layout,
};

const commonFeatures = [
  {
    icon: Check,
    title: 'Devis professionnels',
    desc: 'Générés en minutes avec vos logos et conditions.',
  },
  {
    icon: Check,
    title: 'Facturation conforme',
    desc: 'E-facture 2026 automatique.',
  },
  {
    icon: Check,
    title: 'Signature électronique',
    desc: 'Legit intégrée pour valider les contrats.',
  },
  {
    icon: Check,
    title: 'Portail client',
    desc: 'Clients voient l\'avancement en temps réel.',
  },
];

export default function MetiersPage() {

  const metiers = [
    {
      id: 'cuisiniste',
      icon: ChefHat,
      href: '/cuisiniste',
      title: 'Cuisiniste',
      subtitle: 'De la conception à la pose',
    },
    {
      id: 'menuisier',
      icon: Hammer,
      href: '/menuisier',
      title: 'Menuisier',
      subtitle: 'Meubles, agencements & sur-mesure',
    },
    {
      id: 'architecte',
      icon: Pencil,
      href: '/architecte-interieur',
      title: "Architecte d'intérieur",
      subtitle: 'Design, coordination & suivi de projet',
    },
    {
      id: 'agenceur',
      icon: Layout,
      href: '/agenceur',
      title: 'Agenceur',
      subtitle: 'Espaces commerciaux & retail',
    },
  ];

  return (
    <>
      <Nav />
      <ScrollReveal />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Métiers AVRA',
            description: 'Solutions AVRA pour cuisinistes, menuisiers, architectes d\'intérieur et agenceurs',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Logiciel cuisiniste',
                url: 'https://avra.fr/cuisiniste',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Logiciel menuisier',
                url: 'https://avra.fr/menuisier',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Logiciel architecte d\'intérieur',
                url: 'https://avra.fr/architecte-interieur',
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: 'Logiciel agenceur',
                url: 'https://avra.fr/agenceur',
              },
            ],
          }),
        }}
      />

      {/* Hero */}
      <section
        style={{
          minHeight: '55vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '76px',
          background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 5%', width: '100%' }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Conçu pour votre métier
          </div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Un logiciel pensé pour votre métier
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.15rem',
              maxWidth: 600,
              margin: '0 auto 2rem',
            }}
          >
            AVRA s&apos;adapte à chaque professionnel de l&apos;agencement intérieur. Pas un généraliste. Des solutions
            pensées avec vous.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {metiers.map((m) => {
              const Icon = m.icon;
              return (
                <a
                  key={m.id}
                  href={m.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,.1)',
                    borderRadius: 40,
                    border: '1px solid rgba(255,255,255,.2)',
                    color: 'rgba(255,255,255,.9)',
                    fontSize: '.9rem',
                    fontWeight: 500,
                    transition: 'var(--transition)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {m.title}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Métiers Cards Grid */}
      <section style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Les solutions AVRA pour chaque métier</h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-muted)',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              Cliquez sur votre métier pour découvrir les fonctionnalités pensées pour vous.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
            }}
          >
            {metiers.map((m) => {
              const Icon = m.icon;
              return (
                <a key={m.id} href={m.href}>
                  <div
                    className="reveal card"
                    style={{
                      padding: '2.5rem',
                      background: 'var(--white)',
                      border: '1px solid rgba(48,64,53,.12)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '3rem',
                        marginBottom: '1rem',
                        color: 'var(--gold)',
                      }}
                    >
                      <Icon size={48} strokeWidth={1.2} />
                    </div>
                    <h3 style={{ fontSize: '1.3rem', marginBottom: '.5rem' }}>{m.title}</h3>
                    <p
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)',
                        marginBottom: 'auto',
                        marginTop: '.5rem',
                      }}
                    >
                      {m.subtitle}
                    </p>
                    <div
                      style={{
                        marginTop: '1.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--gold)',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                      }}
                    >
                      En savoir plus →
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ce qui est commun */}
      <section style={{ padding: '100px 5%', background: 'var(--cream-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Ce qui est commun à tous</h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-muted)',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              Au-delà des fonctionnalités métier, AVRA offre à tous ces outils essentiels.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
            }}
          >
            {commonFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="reveal card"
                  style={{
                    padding: '2rem',
                    background: 'var(--white)',
                    border: '1px solid rgba(48,64,53,.12)',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--gold)' }}>
                    <Icon size={32} strokeWidth={2.5} />
                  </div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '.5rem' }}>{feature.title}</h3>
                  <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', margin: 0 }}>
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        style={{
          padding: '100px 5%',
          background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Votre métier, notre priorité
          </div>
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Quel que soit votre métier, AVRA est fait pour vous
          </h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 540, margin: '0 auto 2.5rem' }}>
            Rejoignez les 2 400+ professionnels de l&apos;agencement qui ont choisi AVRA pour digitaliser leur
            activité. 14 jours d&apos;essai gratuit, sans carte bancaire.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register">
              <button className="btn-primary">Commencer l&apos;essai gratuit →</button>
            </a>
            <a href="/temoignages">
              <button className="btn-secondary">Lire les témoignages</button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
