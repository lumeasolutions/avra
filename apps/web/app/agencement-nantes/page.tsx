
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import Link from 'next/link';
import { MapPin, Building2, Zap, DollarSign, Users, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel agencement Nantes — Gérez vos projets en Pays de la Loire',
  description: 'AVRA aide les agenceurs nantais à piloter leurs chantiers, budgets clients et facturation. E-facture 2026 intégrée. Essai gratuit.',
  alternates: { canonical: 'https://avra.fr/agencement-nantes' },
  openGraph: {
    title: 'Logiciel agencement Nantes — Gérez vos projets en Pays de la Loire',
    description: 'AVRA aide les agenceurs nantais à piloter leurs chantiers, budgets clients et facturation.',
    url: 'https://avra.fr/agencement-nantes',
  },
};

export default function AgencementNantes() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      <nav className="breadcrumb-nav container" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
        <a href="/">Accueil</a><span>/</span><a href="/metiers">Métiers</a><span>/</span><a href="/metiers#agenceur">Agenceur</a><span>/</span><span style={{ fontWeight: 600 }}>Nantes</span>
      </nav>

      <section style={{ padding: '80px 5%', background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}><MapPin size={20} color="#c9a96e" /><span style={{ fontSize: '1rem', fontWeight: 600, color: '#c9a96e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pays de la Loire</span></div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800 }}>
            Logiciel agencement Nantes — ERP pour pros de l'agencement en Pays de la Loire
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '700px' }}>
            Nantes se développe rapidement. Les agenceurs locaux gèrent des projets de plus grande envergure avec des clients corporate. AVRA offre la flexibilité et la performance nécessaires.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/register"><button style={{ padding: '14px 32px', background: '#1e2b22', color: '#f9f6f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#253029'} onMouseLeave={(e) => e.currentTarget.style.background = '#1e2b22'}>Essai gratuit 14 jours</button></a>
            <a href="/fonctionnalites"><button style={{ padding: '14px 32px', background: 'transparent', color: '#1e2b22', border: '2px solid #1e2b22', borderRadius: '8px', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#1e2b22'; e.currentTarget.style.color = '#f9f6f0'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1e2b22'; }}>Voir fonctionnalités</button></a>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22' }}>
            Le marché dynamique de l'agencement à Nantes et Pays de la Loire
          </h2>

          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '32px', maxWidth: '800px' }}>
            Nantes et la région Pays de la Loire regroupent environ 820 agenceurs professionnels. La ville connaît une croissance rapide avec des projets d'envergure : centres commerciaux, bureaux modernes, hôtels d'affaires. Les agenceurs nantais doivent gérer des projets plus complexes, coordonner plusieurs équipes et satisfaire des clients de haut niveau. AVRA est votre allié pour scaler votre entreprise d'agencement.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>820+</div><p style={{ color: '#6b7c70' }}>Agenceurs en Pays de la Loire</p></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>32 000€</div><p style={{ color: '#6b7c70' }}>Budget moyen projet Nantes</p></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c9a96e', marginBottom: '12px' }}>+10%</div><p style={{ color: '#6b7c70' }}>Croissance marché annuelle</p></div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>Pourquoi les agenceurs nantais choisissent AVRA</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><Building2 size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Scalabilité</h3></div>
              <p style={{ color: '#6b7c70' }}>Grandissez avec AVRA. Du projet unique à 50 chantiers simultanés, la plateforme s'adapte.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><Zap size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Performance</h3></div>
              <p style={{ color: '#6b7c70' }}>Infrastructure cloud ultra-rapide. Uptime 99.9% garanti. Disponible 24/7.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><DollarSign size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>ROI rapide</h3></div>
              <p style={{ color: '#6b7c70' }}>Payback moyen 3 mois. Gain 5-8 heures par semaine sur l'administratif.</p>
            </div>

            <div className="reveal" style={{ padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(30,43,34,0.12)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><Shield size={32} color="#c9a96e" /><h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e2b22' }}>Sécurité</h3></div>
              <p style={{ color: '#6b7c70' }}>Données chiffrées, RGPD compliant, audit sécurité annuel.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '48px', color: '#1e2b22', textAlign: 'center' }}>Fonctionnalités pour agenceurs nantais</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Dashboard centralisé</h3><p style={{ color: '#6b7c70' }}>Vue d'ensemble de tous les projets avec statuts, budgets, délais.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Portail partenaires</h3><p style={{ color: '#6b7c70' }}>Donnez accès à vos sous-traitants sans les laisser voir tout le projet.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Suivi budgets</h3><p style={{ color: '#6b7c70' }}>Budget vs réel par ligne. Alertes immédiate si dépassement.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Rapports client</h3><p style={{ color: '#6b7c70' }}>Tableaux de bord partageables, photos de chantier, avancement visuel.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Appels d'offres</h3><p style={{ color: '#6b7c70' }}>Répondez rapidement aux AOF grâce à vos dossiers de présentation.</p></div>
            <div className="reveal" style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', border: '1px solid rgba(201,169,110,0.15)' }}><h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>Facturation e-conforme</h3><p style={{ color: '#6b7c70' }}>Format Factur-X automatique. Conformité 2026 garantie.</p></div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>Conforme e-facture 2026</h2>
          <p style={{ fontSize: '1.1rem', color: '#6b7c70', marginBottom: '24px', textAlign: 'center', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
            AVRA gère votre conformité e-facture dès maintenant. Factures automatiquement au format Factur-X. Zéro migration à prévoir.
          </p>
          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '12px', border: '2px solid rgba(201,169,110,0.25)', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px' }}>Soyez prêt pour la réforme sans aucun effort.</p>
            <a href="/blog/e-facture-2026"><span style={{ color: '#c9a96e', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Guide complet e-facture 2026</span></a>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#1e2b22' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)', marginBottom: '24px', color: '#f9f6f0' }}>Prêt à développer votre entreprise d'agencement ?</h2>
          <p style={{ fontSize: '1.2rem', color: 'rgba(249,246,240,0.85)', marginBottom: '32px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Les agenceurs nantais doublent leur capacité projets avec AVRA.
          </p>
          <a href="/register"><button style={{ padding: '16px 40px', background: '#c9a96e', color: '#1e2b22', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#d4b882'} onMouseLeave={(e) => e.currentTarget.style.background = '#c9a96e'}>Démarrer l'essai gratuit</button></a>
        </div>
      </section>

      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', color: '#1e2b22', textAlign: 'center' }}>Aussi disponible dans d'autres régions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <a href="/agencement-toulouse" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#ede5dd'} onMouseLeave={(e) => e.currentTarget.style.background = '#f9f6f0'}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel agencement Toulouse</p></div></a>
            <a href="/menuisier-lyon" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#ede5dd'} onMouseLeave={(e) => e.currentTarget.style.background = '#f9f6f0'}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel menuisier Lyon</p></div></a>
            <a href="/cuisiniste-lyon" style={{ textDecoration: 'none' }}><div style={{ padding: '24px', background: '#f9f6f0', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.15)', textAlign: 'center', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#ede5dd'} onMouseLeave={(e) => e.currentTarget.style.background = '#f9f6f0'}><p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22' }}>Logiciel cuisiniste Lyon</p></div></a>
          </div>
        </div>
      </section>

      <Footer />

      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'AVRA - Logiciel agencement Nantes', description: 'ERP pour agenceurs à Nantes et Pays de la Loire', url: 'https://avra.fr/agencement-nantes', addressLocality: 'Nantes', addressRegion: 'Pays de la Loire', addressCountry: 'FR', areaServed: ['Nantes', 'Pays de la Loire'], priceRange: '€€', serviceType: 'Logiciel de gestion de projet' })}</script>

      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://avra.fr/' }, { '@type': 'ListItem', position: 2, name: 'Métiers', item: 'https://avra.fr/metiers' }, { '@type': 'ListItem', position: 3, name: 'Agenceur', item: 'https://avra.fr/metiers#agenceur' }, { '@type': 'ListItem', position: 4, name: 'Nantes', item: 'https://avra.fr/agencement-nantes' }] })}</script>

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
