
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import Link from 'next/link';
import { MapPin, Building2, TrendingUp, BarChart3, Zap, CheckSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel agencement Toulouse — Pro de l\'agencement intérieur en Occitanie',
  description: 'AVRA est la solution ERP pour agenceurs toulousains. Gérez multi-chantiers, budgets clients, facturation e-conformité. Essai gratuit 14 jours.',
  alternates: { canonical: 'https://avra.fr/agencement-toulouse' },
  openGraph: {
    title: 'Logiciel agencement Toulouse — Pro de l\'agencement intérieur en Occitanie',
    description: 'AVRA est la solution ERP pour agenceurs toulousains. Gérez multi-chantiers, budgets clients, facturation e-conformité.',
    url: 'https://avra.fr/agencement-toulouse',
  },
};

export default function AgencementToulouse() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      <nav className="breadcrumb-nav container" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
        <a href="/">Accueil</a><span>/</span><a href="/metiers">Métiers</a><span>/</span><a href="/metiers#agenceur">Agenceur</a><span>/</span><span style={{ fontWeight: 600 }}>Toulouse</span>
      </nav>

      <section style={{ padding: '80px 5%', background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}><MapPin size={20} color="#c9a96e" /><span style={{ fontSize: '1rem', fontWeight: 600, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Occitanie</span></div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800 }}>
            Logiciel agencement Toulouse — Solution complète pour agenceurs en Occitanie
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px' }}>
            Toulouse offre un marché florissant pour les agenceurs : commerces, bureaux, espaces de travail modernisés. AVRA centralise la gestion de vos projets multi-sites avec suivi budgétaire en temps réel.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/register"><button style={{ padding: '14px 32px', background: '#1e2b22', color: '#f9f6f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Essai gratuit 14 jours</button></a>
            <a href="/fonctionnalites"><button style={{ padding: '14px 32px', background: 'transparent', color: '#1e2b22', border: '2px solid #1e2b22', borderRadius: '8px', cursor: 'pointer' }}>Voir fonctionnalités</button></a>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché de l'agencement à Toulouse : secteur en croissance
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '800px' }}>
            Toulouse et la région Occitanie comptent plus de 950 agenceurs professionnels. Le marché toulousain est caractérisé par une forte demande d'agencements commerciaux, de bureaux modernes et d'espaces de coworking. Les agenceurs doivent coordonner plusieurs corps de métier, gérer des budgets clients et assurer un suivi de chantier impeccable. AVRA offre la visibilité nécessaire pour piloter plusieurs projets simultanément.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>950+</div><p style={{ color: '#6b7c70' }}>Agenceurs en Occitanie</p></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>35 000€</div><p style={{ color: '#6b7c70' }}>Budget moyen projet Toulouse</p></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+13%</div><p style={{ color: '#6b7c70' }}>Croissance marché annuelle</p></div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>Pourquoi les agenceurs toulousains choisissent AVRA</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><Building2 size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Multi-projets piloté</h3></div>
              <p style={{ color: '#6b7c70' }}>Gérez 5, 10 ou 20 chantiers en parallèle. Vue globale et zoom par projet selon vos besoins.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><BarChart3 size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Suivi budgétaire</h3></div>
              <p style={{ color: '#6b7c70' }}>Budget vs réel en temps réel par projet. Alertes dépassement immédiat.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><TrendingUp size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Portail client</h3></div>
              <p style={{ color: '#6b7c70' }}>Partagez l'avancement avec vos clients. Transparence et confiance renforcées.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><CheckSquare size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Conformité garantie</h3></div>
              <p style={{ color: '#6b7c70' }}>E-facture 2026 déjà intégré. Conformité légale automatique.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>Fonctionnalités clés pour agenceurs</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Gestion multi-sites</h3><p style={{ color: '#6b7c70' }}>Dashboard centralisé pour tous vos chantiers avec métriques en temps réel.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Appels d'offres</h3><p style={{ color: '#6b7c70' }}>Templates AOF, portfolio intégré, réponses structurées en quelques minutes.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Coordination artisans</h3><p style={{ color: '#6b7c70' }}>Portail partenaires pour chaque intervenant avec ses droits d'accès.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Reporting client</h3><p style={{ color: '#6b7c70' }}>Rapports professionnels, photos de chantier, tableaux de bord partagés.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Budget tracking</h3><p style={{ color: '#6b7c70' }}>Suivi dépenses par poste avec alertes dépassement immédiat.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Facturation e-compliant</h3><p style={{ color: '#6b7c70' }}>Format Factur-X automatique, archivage légal intégré.</p></div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>Conforme e-facture 2026</h2>
          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '24px', textAlign: 'center', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
            AVRA gère déjà votre conformité e-facture 2026. Vos factures sont au format Factur-X reconnu. Zéro travail supplémentaire.
          </p>
          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>Soyez prêt bien avant janvier 2026.</p>
            <a href="/blog/e-facture-2026"><span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Guide complet e-facture</span></a>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>Pilotez vos projets d'agencement avec AVRA</h2>
          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Les agenceurs toulousains gèrent 3x plus de projets avec AVRA.
          </p>
          <a href="/register"><button style={{ padding: '16px 40px', background: '#c9a96e', color: '#1e2b22', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Commencer l'essai gratuit</button></a>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>Aussi disponible pour d'autres métiers et villes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <a href="/agencement-nantes" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel agencement Nantes</p></div></a>
            <a href="/menuisier-bordeaux" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Bordeaux</p></div></a>
            <a href="/cuisiniste-marseille" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Marseille</p></div></a>
          </div>
        </div>
      </section>

      <Footer />

      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'AVRA - Logiciel agencement Toulouse', description: 'ERP pour agenceurs à Toulouse et Occitanie', url: 'https://avra.fr/agencement-toulouse', addressLocality: 'Toulouse', addressRegion: 'Occitanie', addressCountry: 'FR', areaServed: ['Toulouse', 'Occitanie'], priceRange: '€€', serviceType: 'Logiciel de gestion de projet' })}</script>

      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://avra.fr/' }, { '@type': 'ListItem', position: 2, name: 'Métiers', item: 'https://avra.fr/metiers' }, { '@type': 'ListItem', position: 3, name: 'Agenceur', item: 'https://avra.fr/metiers#agenceur' }, { '@type': 'ListItem', position: 4, name: 'Toulouse', item: 'https://avra.fr/agencement-toulouse' }] })}</script>

      <style>{`
        .breadcrumb-nav { font-size: 0.95rem; color: #6b7c70; }
        .breadcrumb-nav a { color: #6b7c70; text-decoration: none; transition: color 0.3s ease; }
        .breadcrumb-nav a:hover { color: #c9a96e; }
        .breadcrumb-nav span { color: #6b7c70; margin: '0 8px'; }
        .reveal { opacity: 0; transform: translateY(20px); animation: revealAnim 0.8s ease forwards; }
        @keyframes revealAnim { to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
