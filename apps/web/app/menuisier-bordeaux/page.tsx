
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import Link from 'next/link';
import { MapPin, Briefcase, Zap, BarChart3, Users, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel menuisier Bordeaux — Solution complète pour menuisiers en Gironde',
  description: 'AVRA aide les menuisiers bordelais à gérer leurs devis, planning, stock et facturation. Conforme e-facture 2026. Essai gratuit.',
  alternates: { canonical: 'https://avra.fr/menuisier-bordeaux' },
  openGraph: {
    title: 'Logiciel menuisier Bordeaux — Solution complète pour menuisiers en Gironde',
    description: 'AVRA aide les menuisiers bordelais à gérer leurs devis, planning, stock et facturation.',
    url: 'https://avra.fr/menuisier-bordeaux',
  },
};

export default function MenuisierBordeaux() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      {/* Breadcrumb */}
      <nav className="breadcrumb-nav container" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
        <a href="/" style={{ color: '#6b7c70' }}>Accueil</a><span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <a href="/metiers" style={{ color: '#6b7c70' }}>Métiers</a><span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <a href="/metiers#menuisier" style={{ color: '#6b7c70' }}>Menuisier</a><span style={{ color: '#6b7c70', margin: '0 8px' }}>/</span>
        <span style={{ color: '#1e2b22', fontWeight: 600 }}>Bordeaux</span>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 5%', background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <MapPin size={20} color="#c9a96e" />
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nouvelle-Aquitaine</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800 }}>
            Logiciel menuisier Bordeaux — ERP & devis pour menuisiers en Nouvelle-Aquitaine
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px' }}>
            Bordeaux offre un marché riche pour les menuisiers : villes en développement, rénovations prestigieuses et demande commerciale en hausse. AVRA simplifie la gestion de vos projets.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/register"><button style={{ padding: '14px 32px', background: '#1e2b22', color: '#f9f6f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#253029'} onMouseLeave={(e) => e.currentTarget.style.background = '#1e2b22'}>Essai gratuit 14 jours</button></a>
            <a href="/fonctionnalites"><button style={{ padding: '14px 32px', background: 'transparent', color: '#1e2b22', border: '2px solid #1e2b22', borderRadius: '8px', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#1e2b22'; e.currentTarget.style.color = '#f9f6f0'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1e2b22'; }}>Voir fonctionnalités</button></a>
          </div>
        </div>
      </section>

      {/* Marché */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché dynamique de la menuiserie en Nouvelle-Aquitaine
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', lineHeight: 1.8, maxWidth: '800px' }}>
            La région Nouvelle-Aquitaine compte environ 1 800 menuisiers. Bordeaux et ses alentours connaissent une croissance importante avec des projets résidentiels et commerciaux nombreux. Les menuisiers bordelais bénéficient d'un marché en expansion mais font face à une concurrence croissante. AVRA vous aide à faire la différence en optimisant votre productivité et votre service client.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>1 800+</div><p style={{ color: '#6b7c70' }}>Menuisiers en Nouvelle-Aquitaine</p></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>8 200€</div><p style={{ color: '#6b7c70' }}>Ticket moyen Bordeaux</p></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+11%</div><p style={{ color: '#6b7c70' }}>Croissance sur 3 ans</p></div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Pourquoi les menuisiers bordelais choisissent AVRA
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><Briefcase size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Déploiement rapide</h3></div>
              <p style={{ color: '#6b7c70' }}>Onboarding en moins d'une journée. Commencez immédiatement sans formation longue.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><Zap size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Performance garantie</h3></div>
              <p style={{ color: '#6b7c70' }}>Cloud ultra-rapide, disponibilité 99.9%, backup automatiques quotidiens.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><BarChart3 size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>ROI prouvé</h3></div>
              <p style={{ color: '#6b7c70' }}>Nos clients gagnent 6h/semaine en administration et +15% de CA en 6 mois.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><Shield size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Sécurité premium</h3></div>
              <p style={{ color: '#6b7c70' }}>Chiffrement bout-en-bout, conformité RGPD, audit sécurité annuel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>
            Fonctionnalités pour menuisiers bordelais
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Devis sur mesure</h3><p style={{ color: '#6b7c70' }}>Templates adaptables avec votre logo, conditions de vente, branding complet.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Calendrier projet</h3><p style={{ color: '#6b7c70' }}>Vue calendrier intuitive, chevauchement de projets impossibles, notifications.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Inventaire temps réel</h3><p style={{ color: '#6b7c70' }}>Suivi bois, matériel, consommables avec alertes automatiques.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Factures e-conformes</h3><p style={{ color: '#6b7c70' }}>Format Factur-X automatique, transmission Chorus Pro intégrée.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Rapports financiers</h3><p style={{ color: '#6b7c70' }}>Marges, CA par client, prévisionnel trésorerie, exports comptables.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Mobile complet</h3><p style={{ color: '#6b7c70' }}>App iOS/Android pour gérer depuis le chantier. Tout synchronisé.</p></div>
          </div>
        </div>
      </section>

      {/* E-facture */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>Conforme e-facture 2026</h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '24px', textAlign: 'center', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
            AVRA génère vos factures au format Factur-X d'ores et déjà. Vous serez conforme en janvier 2026 sans aucune action supplémentaire.
          </p>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>Une conformité garantie sans complexité.</p>
            <a href="/blog/e-facture-2026"><span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>En savoir plus sur l'e-facture 2026</span></a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 5%', background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>Prêt à transformer votre menuiserie ?</h2>

          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Rejoignez les menuisiers bordelais qui gagnent du temps et de l'argent avec AVRA.
          </p>

          <a href="/register"><button style={{ padding: '16px 40px', background: '#c9a96e', color: '#1e2b22', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#d4b882'} onMouseLeave={(e) => e.currentTarget.style.background = '#c9a96e'}>Démarrer l'essai gratuit</button></a>
        </div>
      </section>

      {/* Autres villes */}
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>Aussi disponible dans les villes proches</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <a href="/menuisier-paris" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#ede5dd'} onMouseLeave={(e) => e.currentTarget.style.background = '#f9f6f0'}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Paris</p></div></a>
            <a href="/menuisier-lyon" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#ede5dd'} onMouseLeave={(e) => e.currentTarget.style.background = '#f9f6f0'}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Lyon</p></div></a>
            <a href="/agencement-toulouse" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#ede5dd'} onMouseLeave={(e) => e.currentTarget.style.background = '#f9f6f0'}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel agencement Toulouse</p></div></a>
          </div>
        </div>
      </section>

      <Footer />

      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'AVRA - Logiciel menuisier Bordeaux', description: 'ERP pour menuisiers à Bordeaux et Nouvelle-Aquitaine', url: 'https://avra.fr/menuisier-bordeaux', addressLocality: 'Bordeaux', addressRegion: 'Nouvelle-Aquitaine', addressCountry: 'FR', areaServed: ['Bordeaux', 'Nouvelle-Aquitaine'], priceRange: '€€', serviceType: 'Logiciel de gestion de projet' })}</script>

      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://avra.fr/' }, { '@type': 'ListItem', position: 2, name: 'Métiers', item: 'https://avra.fr/metiers' }, { '@type': 'ListItem', position: 3, name: 'Menuisier', item: 'https://avra.fr/metiers#menuisier' }, { '@type': 'ListItem', position: 4, name: 'Bordeaux', item: 'https://avra.fr/menuisier-bordeaux' }] })}</script>

      <style>{`
        .breadcrumb-nav { font-size: 0.95rem; color: #6b7c70; }
        .breadcrumb-nav a { color: #6b7c70; text-decoration: none; transition: color 0.3s ease; }
        .breadcrumb-nav a:hover { color: #c9a96e; }
        .reveal { opacity: 0; transform: translateY(20px); animation: revealAnim 0.8s ease forwards; }
        @keyframes revealAnim { to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
