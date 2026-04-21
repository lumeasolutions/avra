
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import BetaBanner from '../(marketing)/components/BetaBanner';
import Link from 'next/link';
import { MapPin, Briefcase, TrendingUp, Home, AlertCircle, Layers } from 'lucide-react';
import '../(marketing)/marketing.css';

export const metadata: Metadata = {
  title: 'Logiciel menuisier Lyon — ERP menuiserie complet pour Lyon et la région',
  description: 'AVRA est le logiciel ERP pour menuisiers lyonnais. Devis, planning, stock, facturation e-conformité. Demandez une démo.',
  alternates: { canonical: 'https://avra.fr/menuisier-lyon' },
  openGraph: {
    title: 'Logiciel menuisier Lyon — ERP menuiserie complet pour Lyon et la région',
    description: 'AVRA est le logiciel ERP pour menuisiers lyonnais. Devis, planning, stock, facturation e-conformité.',
    url: 'https://avra.fr/menuisier-lyon',
  },
};

export default function MenuisierLyon() {
  return (
    <>
      <BetaBanner />
      <Nav />
      <ScrollReveal />

      {/* Breadcrumb */}
      <nav className="breadcrumb-nav container" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
        <a href="/" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Accueil</a>
        <span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <a href="/metiers" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Métiers</a>
        <span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <a href="/metiers#menuisier" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Menuisier</a>
        <span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <span style={{ color: '#1e2b22', fontSize: '0.95rem', fontWeight: 600 }}>Lyon</span>
      </nav>

      {/* Hero Section */}
      <section className="section-pad" style={{ background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <MapPin size={20} color="#c9a96e" />
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Auvergne-Rhône-Alpes</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800, lineHeight: 1.15 }}>
            Logiciel menuisier Lyon — Gérez votre menuiserie à Lyon
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px', lineHeight: 1.65 }}>
            Lyon offre un marché dynamique pour les menuisiers. AVRA vous aide à optimiser votre flux de travail, de la prospection à la pose finale.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
            <a href="/demo">
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
              >
                Demander une démo
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
              >
                Voir fonctionnalités
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Marché menuisier Lyon */}
      <section className="section-pad" style={{ background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché de la menuiserie à Lyon et en Rhône-Alpes
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', lineHeight: 1.8, maxWidth: '800px' }}>
            La région Rhône-Alpes compte plus de 2 200 menuisiers professionnels. Lyon et ses environs offrent un marché mature avec des clients résidentiels attachés à la qualité et des projets commerciaux réguliers. Les menuisiers lyonnais doivent gérer l'atelier et le chantier de façon coordonnée pour rester compétitifs. AVRA offre la visibilité nécessaire pour optimiser chaque étape de vos réalisations.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px',
            marginTop: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>2 200+</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Menuisiers en Rhône-Alpes</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>7 800€</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Ticket moyen menuiserie Lyon</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+7%</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Croissance marché annuelle</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi AVRA */}
      <section className="section-pad" style={{ background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Pourquoi les menuisiers lyonnais choisissent AVRA
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
                <Briefcase size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Atelier & chantier connectés</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Synchronisez facilement les commandes atelier avec le planning chantier. Zéro délai perdu.
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
                <TrendingUp size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Rentabilité suivie</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Chiffrez vos projets avec précision et suivez vos marges en temps réel.
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
                <Home size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Portfolio en ligne</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Constituez votre book de réalisations pour séduire les nouveaux clients.
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
                <AlertCircle size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Alertes pertinentes</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Notifications pour délais approchants, factures impayées, ruptures de stock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section className="section-pad" style={{ background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Fonctionnalités essentielles pour menuisiers lyonnais
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Devis professionnel</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Modèles personnalisés, calculs automatiques, signature numérique intégrée.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Planning visual</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Calendrier drag & drop pour planifier chantiers et atelier en simultané.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Gestion matériaux</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Stock centralisé avec alertes. Évitez les ruptures de production.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Suivi d'équipe</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Enregistrez heures ouvriers, compétences et disponibilités.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Facturation e-conforme</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Factures électroniques format Factur-X prêtes pour Chorus Pro.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Analyse financière</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Tableaux de bord avec CA, marges, trésorerie. Export comptable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Conformité e-facture */}
      <section className="section-pad" style={{ background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>
            Conforme à la facturation électronique 2026
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '24px', lineHeight: 1.8, maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            AVRA intègre déjà la facturation électronique obligatoire en 2026. Vos factures sont générées au format Factur-X automatiquement. Zéro travail supplémentaire pour vous adapter.
          </p>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>
              Anticipez la réforme sans migration longue et coûteuse.
            </p>
            <a href="/blog/e-facture-2026">
              <span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                Lire notre guide complet
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="section-pad" style={{ background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>
            Faites le pas vers la modernité
          </h2>

          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Menuisiers lyonnais, découvrez comment AVRA simplifie votre quotidien.
          </p>

          <a href="/demo">
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
            >
              Demander une démo
            </button>
          </a>
        </div>
      </section>

      {/* Autres villes */}
      <section className="section-pad" style={{ background: '#ffffff' }}>
        <div className="container">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>
            Aussi disponible dans les villes proches
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px'
          }}>
            <a href="/menuisier-paris" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '24px',
                background: '#f9f6f0',
                borderRadius: '8px',
                border: '1px solid rgba(201,169,110,0.15)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Paris</p>
              </div>
            </a>

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
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Bordeaux</p>
              </div>
            </a>

            <a href="/cuisiniste-lyon" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '24px',
                background: '#f9f6f0',
                borderRadius: '8px',
                border: '1px solid rgba(201,169,110,0.15)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Lyon</p>
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
          name: 'AVRA - Logiciel menuisier Lyon',
          description: 'ERP pour menuisiers à Lyon et Rhône-Alpes',
          url: 'https://avra.fr/menuisier-lyon',
          addressLocality: 'Lyon',
          addressRegion: 'Auvergne-Rhône-Alpes',
          addressCountry: 'FR',
          areaServed: ['Lyon', 'Auvergne-Rhône-Alpes'],
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
              name: 'Menuisier',
              item: 'https://avra.fr/metiers#menuisier'
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: 'Lyon',
              item: 'https://avra.fr/menuisier-lyon'
            }
          ]
        })}
      </script>

      <style>{`
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
