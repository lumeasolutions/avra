
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import Link from 'next/link';
import { MapPin, FileText, Clock, Hammer, BarChart3, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel menuisier Paris — Devis, planning et facturation pour menuisiers parisiens',
  description: 'AVRA aide les menuisiers parisiens à gérer devis, planning de chantier, facturation et conformité e-facture 2026. Essai gratuit.',
  alternates: { canonical: 'https://avra.fr/menuisier-paris' },
  openGraph: {
    title: 'Logiciel menuisier Paris — Devis, planning et facturation pour menuisiers parisiens',
    description: 'AVRA aide les menuisiers parisiens à gérer devis, planning de chantier, facturation et conformité e-facture 2026.',
    url: 'https://avra.fr/menuisier-paris',
  },
};

export default function MenuisierParis() {
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
        <a href="/metiers#menuisier" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Menuisier</a>
        <span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <span style={{ color: '#1e2b22', fontSize: '0.95rem', fontWeight: 600 }}>Paris</span>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '80px 5%', background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <MapPin size={20} color="#c9a96e" />
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Île-de-France</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800, lineHeight: 1.15 }}>
            Logiciel menuisier Paris — L'ERP des menuisiers d'Île-de-France
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px', lineHeight: 1.65 }}>
            Devis, planning, suivi de chantier, gestion des matériaux et facturation e-conformité. AVRA simplifie la vie des menuisiers parisiens.
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

      {/* Marché menuisier Paris */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché de la menuiserie à Paris : tradition et modernité
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', lineHeight: 1.8, maxWidth: '800px' }}>
            L'Île-de-France compte plus de 4 500 menuisiers, du petit atelier au groupe multi-établissement. Le marché parisien est dominé par la rénovation d'appartements haussmanniens, les agencements sur-mesure et les projets d'architecture intérieure haut de gamme. Les menuisiers parisiens font face à des clients très exigeants, des délais serrés et une forte concurrence. AVRA vous aide à optimiser chaque projet pour maximiser vos marges.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px',
            marginTop: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>4 500+</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Menuisiers en Île-de-France</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>8 500€</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Ticket moyen menuiserie Paris</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+5%</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Croissance marché annuelle</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi AVRA */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Pourquoi les menuisiers parisiens choisissent AVRA
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
                <FileText size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Devis en 2 minutes</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Templates pré-configurés et calculs automatiques. Créez des devis professionnels en quelques clics.
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
                <Clock size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Planning optimisé</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Gérez vos chantiers avec vue calendrier. Évitez les chevauchements et optimisez votre équipe.
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
                <Hammer size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Suivi de marges</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Comparez heures estimées vs réelles. Contrôlez votre profitabilité par projet et par client.
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
                <CheckCircle size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Conformité garantie</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                E-facture 2026 intégrée. Archivage légal automatisé. Zéro risque de non-conformité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Fonctionnalités essentielles pour menuisiers
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Dossiers de chantier</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Plans, photos avant/après, documents de réception, bons de livraison. Tout centralisé par projet.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Gestion de stock</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Suivi bois, quincaillerie, vernis. Alertes rupture de stock automatiques.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Suivi heures d'atelier</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Enregistrez temps réel par ouvrier et par projet. Analysez votre productivité.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Portfolio photos</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Constituez votre book photos directement dans AVRA. Présentez vos réalisations aux clients.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Facturation complète</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Factures électroniques, acomptes, frais de chantier. Conforme e-facture 2026.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Reporting financier</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>CA mensuel, marges par projet, trésorerie prévisionnelle. Export pour comptable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Conformité e-facture */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>
            Prêt pour la facturation électronique 2026
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '24px', lineHeight: 1.8, maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            À partir de janvier 2026, la facturation électronique devient obligatoire. Avec AVRA, vos factures sont déjà au format Factur-X reconnu par Chorus Pro. Aucune migration supplémentaire à prévoir.
          </p>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>
              Soyez conforme dès aujourd'hui. AVRA gère déjà l'e-facture.
            </p>
            <a href="/blog/e-facture-2026">
              <span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                Lire le guide complet e-facture 2026
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section style={{ padding: '80px 5%', background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>
            Simplifiez votre gestion menuiserie
          </h2>

          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Les menuisiers parisiens gagnent 6h par semaine en moyenne avec AVRA.
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
              Démarrer mon essai gratuit
            </button>
          </a>
        </div>
      </section>

      {/* Autres villes */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>
            Aussi disponible dans les villes proches
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px'
          }}>
            <a href="/menuisier-lyon" style={{ textDecoration: 'none' }}>
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
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Lyon</p>
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
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ede5dd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9f6f0'; }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Bordeaux</p>
              </div>
            </a>

            <a href="/cuisiniste-paris" style={{ textDecoration: 'none' }}>
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
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Paris</p>
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
          name: 'AVRA - Logiciel menuisier Paris',
          description: 'ERP pour menuisiers à Paris et Île-de-France',
          url: 'https://avra.fr/menuisier-paris',
          addressLocality: 'Paris',
          addressRegion: 'Île-de-France',
          addressCountry: 'FR',
          areaServed: ['Paris', 'Île-de-France'],
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
              name: 'Paris',
              item: 'https://avra.fr/menuisier-paris'
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
