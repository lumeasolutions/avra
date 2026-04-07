
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import Link from 'next/link';
import { MapPin, ChefHat, Zap, BarChart3, Users, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel cuisiniste Paris — ERP & IA pour cuisinistes en Île-de-France',
  description: 'AVRA est le logiciel N°1 pour les cuisinistes parisiens. Gérez vos dossiers, devis, planning et générez des rendus IA en 10s. Essai gratuit 14j.',
  alternates: { canonical: 'https://avra.fr/cuisiniste-paris' },
  openGraph: {
    title: 'Logiciel cuisiniste Paris — ERP & IA pour cuisinistes en Île-de-France',
    description: 'AVRA est le logiciel N°1 pour les cuisinistes parisiens. Gérez vos dossiers, devis, planning et générez des rendus IA en 10s. Essai gratuit 14j.',
    url: 'https://avra.fr/cuisiniste-paris',
  },
};

export default function CuisinisteParis() {
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
            Logiciel cuisiniste Paris — Gérez vos projets cuisine en Île-de-France
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px', lineHeight: 1.65 }}>
            AVRA vous permet de gérer l'intégralité de vos projets cuisines : de la prospection client à la facturation finale. Devis, planning, rendus IA et conformité e-facture 2026 intégrés.
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

      {/* Marché cuisiniste Paris */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché de la cuisine à Paris : un secteur haut de gamme en pleine effervescence
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', lineHeight: 1.8, maxWidth: '800px' }}>
            Paris concentre plus de 3 000 cuisinistes et entreprises de cuisine en Île-de-France. Le marché parisien est réputé pour sa clientèle très exigeante : appartements haussmanniens à rénover, résidences de prestige, projets de décoration intérieure haut de gamme. Les cuisinistes parisiens doivent exceller en conception, en qualité d'exécution et en service client pour se démarquer. AVRA répond à ces exigences en centralisant la gestion de projets complexes et en offrant des rendus IA photo-réalistes pour impressionner les clients les plus exigeants.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px',
            marginTop: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>3 000+</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Cuisinistes en région Île-de-France</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>18 500€</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Budget moyen cuisine parisienne</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+8%</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Croissance marché sur 3 ans</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi AVRA */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Pourquoi les cuisinistes parisiens choisissent AVRA
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
                <ChefHat size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Rendus IA en 10 secondes</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Générez des rendus photo-réalistes de vos cuisines en quelques clics. Présentez des visuels bluffants à vos clients pour signer plus rapidement.
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Gestion complète du projet</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Devis, commandes fournisseurs, planning de pose, facturation : tout centralisé dans une seule application. Zéro perte d'information.
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
                <BarChart3 size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Suivi de rentabilité</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Maîtrisez vos marges par projet. Comparez le devis initial aux heures réelles et évitez les dépassements.
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
                <Shield size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Conforme e-facture 2026</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                La facturation électronique est déjà intégrée. Soyez prêt dès maintenant pour la réforme 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Fonctionnalités clés pour cuisinistes
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Plans de cuisine et nomenclatures</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Associez vos plans de cuisine à chaque dossier. Gérez les nomenclatures de composants directement dans AVRA.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Commandes fournisseurs</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Passez vos commandes auprès de vos fournisseurs et suivez les délais de livraison en temps réel.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Planning de pose</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Planifiez les poses avec vos installateurs et gérez les contraintes de chantier facilement.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Rendus IA</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Générez des rendus photo-réalistes de cuisines équipées pour vos présentations clients.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Facturation et devis</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Créez des devis professionnels et des factures en quelques secondes avec modèles personnalisables.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Suivi analytique</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Tableaux de bord avec KPIs en temps réel : marges, rentabilité par client, temps moyen de projet.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Conformité e-facture */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>
            Prêt pour l'e-facture obligatoire 2026
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '24px', lineHeight: 1.8, maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            La facturation électronique devient obligatoire en janvier 2026 pour tous les artisans. AVRA est déjà conforme à cette réforme. Vos factures sont générées au format électronique reconnu par Chorus Pro. Aucun travail supplémentaire, aucune mise à jour à faire.
          </p>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>
              Avec AVRA, vous êtes en avance sur la réglementation et vous gagnez du temps sur votre gestion administrative.
            </p>
            <a href="/blog/e-facture-2026">
              <span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                Lire notre guide complet sur l'e-facture
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section style={{ padding: '80px 5%', background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>
            Prêt à transformer votre gestion de projet ?
          </h2>

          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Rejoignez les 500+ cuisinistes, menuisiers et architectes d'intérieur qui font confiance à AVRA.
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
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ede5dd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9f6f0'; }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Lyon</p>
              </div>
            </a>

            <a href="/cuisiniste-marseille" style={{ textDecoration: 'none' }}>
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
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Marseille</p>
              </div>
            </a>

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
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ede5dd'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9f6f0'; }}
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Paris</p>
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
          name: 'AVRA - Logiciel cuisiniste Paris',
          description: 'ERP & IA pour cuisinistes à Paris et Île-de-France',
          url: 'https://avra.fr/cuisiniste-paris',
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
              name: 'Cuisiniste',
              item: 'https://avra.fr/metiers#cuisiniste'
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: 'Paris',
              item: 'https://avra.fr/cuisiniste-paris'
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
