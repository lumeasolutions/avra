
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import Link from 'next/link';
import { MapPin, Palette, Zap, Users, TrendingUp, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel cuisiniste Marseille — Gérez vos projets cuisine en PACA',
  description: 'AVRA simplifie la gestion de vos cuisines à Marseille. Devis, planning, rendus IA et facturation e-conformité. Essai gratuit 14 jours.',
  alternates: { canonical: 'https://avra.fr/cuisiniste-marseille' },
  openGraph: {
    title: 'Logiciel cuisiniste Marseille — Gérez vos projets cuisine en PACA',
    description: 'AVRA simplifie la gestion de vos cuisines à Marseille. Devis, planning, rendus IA et facturation e-conformité.',
    url: 'https://avra.fr/cuisiniste-marseille',
  },
};

export default function CuisinisteMarseille() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      {/* Breadcrumb */}
      <nav className="breadcrumb-nav container" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
        <a href="/" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Accueil</a>
        <span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <a href="/metiers" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Métiers</a>
        <span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <a href="/metiers#cuisiniste" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Cuisiniste</a>
        <span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <span style={{ color: '#1e2b22', fontSize: '0.95rem', fontWeight: 600 }}>Marseille</span>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '80px 5%', background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <MapPin size={20} color="#c9a96e" />
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Provence-Alpes-Côte d'Azur</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800, lineHeight: 1.15 }}>
            Logiciel cuisiniste Marseille — Solution pro pour la région PACA
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px', lineHeight: 1.65 }}>
            Marseille offre un marché diversifié pour les cuisinistes : résidences bord de mer, rénovations urbaines et projets commerciaux. AVRA est votre assistant pour gérer cette complexité sans surcharge administrative.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <a href="/register">
              <button style={{
                padding: '14px 32px',
                background: '#1e2b22',
                color: '#f9f6f0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#253029'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1e2b22'; }}
              >
                Essai gratuit 14 jours
              </button>
            </a>
            <a href="/fonctionnalites">
              <button style={{
                padding: '14px 32px',
                background: 'transparent',
                color: '#1e2b22',
                border: '2px solid #1e2b22',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e2b22'; e.currentTarget.style.color = '#f9f6f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1e2b22'; }}
              >
                Voir fonctionnalités
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Marché cuisiniste Marseille */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché hétérogène de la cuisine à Marseille et en Provence-Alpes-Côte d'Azur
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', lineHeight: 1.8, maxWidth: '800px' }}>
            Marseille et la région PACA rassemblent environ 1 200 cuisinistes professionnels. Le marché marseillais est caractérisé par une grande diversité de clientèle : résidences secondaires luxueuses, appartements de standing, commerces de proximité, hôtels et restaurants. Les cuisinistes doivent s'adapter à des projets très variés, avec des calendriers souvent imprévisibles et des attentes clients hétérogènes. AVRA offre la flexibilité nécessaire pour gérer cette variabilité tout en maintenant la qualité et les délais.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px',
            marginTop: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>1 200+</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Cuisinistes en région PACA</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>14 200€</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Budget moyen cuisine Marseille</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+9%</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Croissance marché sur 3 ans</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi AVRA */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Pourquoi les cuisinistes marseillais choisissent AVRA
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            <div className="reveal" style={{
              padding: '32px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(30,43,34,0.12)',
              border: '1px solid rgba(201,169,110,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <Palette size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Flexibilité maximale</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Adaptez AVRA à vos processus uniques. Personnalisez les champs, les templates et les workflows selon votre méthode.
              </p>
            </div>

            <div className="reveal" style={{
              padding: '32px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(30,43,34,0.12)',
              border: '1px solid rgba(201,169,110,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <Zap size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Intégration facile</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Migrez facilement vos données existantes. AVRA s'intègre avec vos outils actuels sans perturbation.
              </p>
            </div>

            <div className="reveal" style={{
              padding: '32px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(30,43,34,0.12)',
              border: '1px solid rgba(201,169,110,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <Users size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Support réactif</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Notre équipe support est basée en France et répond sous 24h. Chat en direct disponible en jour ouvrable.
              </p>
            </div>

            <div className="reveal" style={{
              padding: '32px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(30,43,34,0.12)',
              border: '1px solid rgba(201,169,110,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <Award size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Qualité prouvée</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Plusde 500 professionnels de l'agencement nous font confiance. Certifications ISO et conformités garanties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Fonctionnalités clés pour cuisinistes méditerranéens
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Gestion multi-projets</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Gérez plusieurs cuisines en parallèle avec des équipes différentes et des fournisseurs distincts.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Portail client</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Donnez accès à vos clients pour qu'ils suivent l'avancement de leur cuisine en temps réel.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Documents et signatures</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Signature numérique intégrée pour les devis et contrats. Conforme légalement.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Mobile app</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Accédez à AVRA en mobilité. iOS et Android pour gérer votre activité en chantier.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Notifications proactives</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Alertes pour délais fournisseurs, dates de pose, factures impayées et dépassements de budget.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Export et rapports</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Générez des rapports PDF personnalisés pour votre comptable ou vos investisseurs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Conformité e-facture */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>
            Conforme e-facture et régulations 2026
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '24px', lineHeight: 1.8, maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            AVRA respecte toutes les obligations e-facture 2026. Vos factures sont automatiquement au format Factur-X, archivées légalement et prêtes à transmettre à Chorus Pro. Aucun risque de non-conformité.
          </p>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>
              Soyez en avance sur vos concurrents. AVRA c'est la garantie de conformité.
            </p>
            <a href="/blog/e-facture-2026">
              <span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                Consulter le guide e-facture complet
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section style={{ padding: '80px 5%', background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>
            Modernisez votre gestion cuisine dès maintenant
          </h2>

          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Rejoignez les leaders de l'agencement marseillais qui ont choisi AVRA.
          </p>

          <a href="/register">
            <button style={{
              padding: '16px 40px',
              background: '#c9a96e',
              color: '#1e2b22',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.05rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#d4b882'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#c9a96e'; }}
            >
              Commencer mon essai gratuit
            </button>
          </a>
        </div>
      </section>

      {/* Autres villes */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>
            Aussi disponible pour les métiers proches
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px'
          }}>
            <a href="/menuisier-bordeaux" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '24px',
                background: '#f9f6f0',
                borderRadius: '8px',
                border: '1px solid rgba(201,169,110,0.15)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ede5dd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9f6f0'; }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Bordeaux</p>
              </div>
            </a>

            <a href="/agencement-toulouse" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '24px',
                background: '#f9f6f0',
                borderRadius: '8px',
                border: '1px solid rgba(201,169,110,0.15)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ede5dd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9f6f0'; }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel agencement Toulouse</p>
              </div>
            </a>

            <a href="/agencement-nantes" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '24px',
                background: '#f9f6f0',
                borderRadius: '8px',
                border: '1px solid rgba(201,169,110,0.15)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ede5dd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9f6f0'; }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel agencement Nantes</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <Footer />

      {/* JSON-LD LocalBusiness */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'AVRA - Logiciel cuisiniste Marseille',
          description: 'ERP & IA pour cuisinistes à Marseille et PACA',
          url: 'https://avra.fr/cuisiniste-marseille',
          addressLocality: 'Marseille',
          addressRegion: 'Provence-Alpes-Côte d\'Azur',
          addressCountry: 'FR',
          areaServed: ['Marseille', 'Provence-Alpes-Côte d\'Azur'],
          priceRange: '€€',
          serviceType: 'Logiciel de gestion de projet'
        })}
      </script>

      {/* JSON-LD BreadcrumbList */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Accueil',
              item: 'https://avra.fr/'
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Métiers',
              item: 'https://avra.fr/metiers'
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: 'Cuisiniste',
              item: 'https://avra.fr/metiers#cuisiniste'
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: 'Marseille',
              item: 'https://avra.fr/cuisiniste-marseille'
            }
          ]
        })}
      </script>

      <style jsx>{`
        .breadcrumb-nav {
          font-size: 0.95rem;
          color: #6b7c70;
        }
        .breadcrumb-nav a {
          color: #6b7c70;
          text-decoration: none;
          transition: color 0.3s ease;
        }
        .breadcrumb-nav a:hover {
          color: #c9a96e;
        }
        .reveal {
          opacity: 0;
          transform: translateY(20px);
          animation: revealAnim 0.8s ease forwards;
        }
        @keyframes revealAnim {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
