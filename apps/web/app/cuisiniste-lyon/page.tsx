
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import BetaBanner from '../(marketing)/components/BetaBanner';
import Link from 'next/link';
import { MapPin, Lightbulb, Zap, BarChart3, TrendingUp, Settings } from 'lucide-react';
import '../(marketing)/marketing.css';

export const metadata: Metadata = {
  title: 'Logiciel cuisiniste Lyon — Solution complète pour cuisinistes à Lyon',
  description: 'AVRA vous permet de gérer vos cuisines à Lyon de la conception à la facturation. Devis, planning, rendus IA et e-facture 2026. Demandez une démo.',
  alternates: { canonical: 'https://avra.fr/cuisiniste-lyon' },
  openGraph: {
    title: 'Logiciel cuisiniste Lyon — Solution complète pour cuisinistes à Lyon',
    description: 'AVRA vous permet de gérer vos cuisines à Lyon de la conception à la facturation. Devis, planning, rendus IA et e-facture 2026.',
    url: 'https://avra.fr/cuisiniste-lyon',
  },
};

export default function CuisinistelyOn() {
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
        <a href="/metiers#cuisiniste" style={{ color: '#6b7c70', fontSize: '0.95rem' }}>Cuisiniste</a>
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
            Logiciel cuisiniste Lyon — ERP & IA pour pros de la cuisine à Lyon
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px', lineHeight: 1.65 }}>
            Lyon offre un marché dynamique pour les cuisinistes. AVRA vous aide à tirer le meilleur parti de votre entreprise : gestion optimisée, rendus IA bluffants et facturation conforme dès le départ.
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

      {/* Marché cuisiniste Lyon */}
      <section className="section-pad" style={{ background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché dynamique de la cuisine à Lyon et en Rhône-Alpes
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', lineHeight: 1.8, maxWidth: '800px' }}>
            Lyon et la région Rhône-Alpes accueillent plus de 1 600 cuisinistes professionnels. Le marché lyonnais se caractérise par des clients résidentiels de classe moyenne à aisée, ainsi que des projets commerciaux (restaurants, hôtels, espaces de travail). Les cuisinistes lyonnais doivent maîtriser les délais, gérer efficacement leurs stocks de composants et offrir un excellent rapport qualité-prix. AVRA centralise la gestion administrative pour que vous vous concentriez sur la qualité de vos réalisations.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px',
            marginTop: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>1 600+</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Cuisinistes en région Rhône-Alpes</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>12 800€</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Budget moyen cuisine lyonnaise</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+12%</div>
              <p style={{ fontSize: '1rem', color: '#6b7c70' }}>Croissance marché sur 3 ans</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi AVRA */}
      <section className="section-pad" style={{ background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Pourquoi les cuisinistes lyonnais choisissent AVRA
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
                <Lightbulb size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Efficacité maximale</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Passez moins de temps sur l'administratif et plus de temps sur vos chantiers. Les devis se créent en 2 minutes.
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Gestion des stocks intégrée</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Suivez vos composants cuisine en temps réel et évitez les ruptures de stock qui impactent votre planning.
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Visibility complète</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Tableaux de bord qui montrent votre situation en temps réel : revenus, marges, projets en cours, délais.
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
                <Settings size={32} color="#c9a96e" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Outil adaptable</h3>
              </div>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>
                Configurez AVRA selon votre flux de travail. Vos processus, votre terminology, vos fournisseurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section className="section-pad" style={{ background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Fonctionnalités clés pour cuisinistes lyonnais
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Devis professionnels</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Templates modèles, signature numérique intégrée, suivi d'acceptation automatisé.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Gestion des fournisseurs</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Listez vos fournisseurs préférés, gérez les tarifs et automatisez les commandes.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Suivi planning</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Calendrier partagé, notifications de délais proches, gestion des équipes d'installation.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Rendus photo-réalistes</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Générez des images 3D haute définition en quelques secondes pour impressionner vos clients.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Facturation et comptabilité</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Factures conformes e-facture 2026, intégration comptable, export pour votre expert.
              </p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Reporting et analytics</h3>
              <p style={{ color: '#6b7c70', lineHeight: 1.65 }}>Graphiques de performance, analyse des marges, tendances de vos ventes trimestrielles.</p>
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
            À partir de janvier 2026, toutes les entreprises (sauf micro-entrepreneurs) devront émettre des factures électroniques via Chorus Pro. AVRA gère déjà cette obligation : vos factures sont générées en format Factur-X, prêtes à être envoyées. Zéro migration, zéro travail supplémentaire.
          </p>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>
              Vous serez conforme dès le premier jour. Aucune refonte à prévoir.
            </p>
            <a href="/blog/e-facture-2026">
              <span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                Tout savoir sur la réforme e-facture
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="section-pad" style={{ background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>
            Transformez votre gestion de projet cuisine
          </h2>

          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Les cuisinistes lyonnais gagnent en moyenne 8 heures par semaine en temps administratif avec AVRA.
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
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Paris</p>
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
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Marseille</p>
              </div>
            </a>

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
              >
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Lyon</p>
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
          name: 'AVRA - Logiciel cuisiniste Lyon',
          description: 'ERP & IA pour cuisinistes à Lyon et Rhône-Alpes',
          url: 'https://avra.fr/cuisiniste-lyon',
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
              name: 'Cuisiniste',
              item: 'https://avra.fr/metiers#cuisiniste'
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: 'Lyon',
              item: 'https://avra.fr/cuisiniste-lyon'
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
