import type { Metadata } from 'next';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Fonctionnalités AVRA — Toutes les features pour gérer votre activité',
  description:
    'Découvrez toutes les fonctionnalités AVRA : gestion dossiers, facturation, planning, IA Studio, stock, signature électronique, notifications, statistiques et portails partenaires.',
  alternates: { canonical: 'https://avra.fr/fonctionnalites' },
  openGraph: {
    title: 'Fonctionnalités AVRA',
    description:
      "Gestion dossiers, facturation, planning, IA Studio, stock, signature électronique et plus. Tout ce qu'il faut pour gérer vos projets d'agencement.",
    url: 'https://avra.fr/fonctionnalites',
  },
};

const features = [
  {
    id: 'dossiers',
    icon: '📁',
    title: 'Gestion des dossiers clients',
    subtitle: 'Centralisez tout sur chaque projet',
    desc: "Plus aucun document perdu, plus aucun email introuvable. Chaque dossier client regroupe plans, photos, devis, contrats, notes et historique des échanges. L'accès est instantané depuis n'importe quel appareil.",
    features: ['Dossier unifié par client', 'Historique complet des échanges', 'Tags et filtres avancés', 'Accès multi-appareils', 'Partage sécurisé avec clients', 'Archivage automatique'],
    badge: 'Essentiel',
  },
  {
    id: 'facturation',
    icon: '🧾',
    title: 'Facturation & Devis intelligents',
    subtitle: 'Du devis à la facture en 2 clics',
    desc: "Créez des devis professionnels en quelques secondes depuis vos catalogues produits. Transformez-les en factures, gérez les acomptes, suivez les paiements et relancez automatiquement les impayés.",
    features: ['Devis en 2 clics', 'Catalogues produits intégrés', 'Acomptes et soldes', 'Facturation récurrente', 'Relances automatiques', 'Conformité e-facture 2026'],
    badge: 'Populaire',
  },
  {
    id: 'ia',
    icon: '🤖',
    title: 'IA Studio — Photo-réalisme',
    subtitle: 'Vendez avant de construire',
    desc: "Générez des rendus photo-réalistes bluffants en quelques secondes grâce à FLUX Pro. Décrivez votre projet, uploadez vos plans, et obtenez des images HD à montrer à vos clients. Le taux de signature explose.",
    features: ['Rendus FLUX Pro HD', 'Génération en < 10 secondes', 'Export en haute résolution', 'Chat IA contextuel', 'Suggestions de matériaux', 'Historique des générations'],
    badge: 'IA',
  },
  {
    id: 'planning',
    icon: '📅',
    title: 'Planning & Gestion de chantiers',
    subtitle: 'Planifiez sans effort',
    desc: "Un calendrier visuel partagé avec toute votre équipe. Planifiez poses, livraisons, RDV clients et interventions SAV. Les conflits d'agenda sont détectés automatiquement.",
    features: ['Calendrier visuel partagé', 'Vue par technicien', 'Détection de conflits', 'Rappels automatiques', 'Intégration Google Calendar', 'Export planning PDF'],
    badge: 'Pro',
  },
  {
    id: 'stock',
    icon: '📦',
    title: 'Gestion de stock & fournisseurs',
    subtitle: 'Ne manquez plus de rien',
    desc: "Suivez vos matériaux, composants et commandes en temps réel. Les alertes de rupture sont automatiques. Passez vos commandes fournisseurs directement depuis AVRA.",
    features: ['Stock en temps réel', 'Alertes de rupture', 'Commandes fournisseurs', 'Codes-barres et QR codes', 'Multi-dépôts', 'Rapports de consommation'],
    badge: 'Pro',
  },
  {
    id: 'signature',
    icon: '✍️',
    title: 'Signature électronique',
    subtitle: 'Signez en quelques secondes',
    desc: "Envoyez vos devis et contrats par email ou SMS pour signature électronique. Juridiquement valable en France et UE. Vos clients signent depuis leur smartphone sans télécharger quoi que ce soit.",
    features: ['Signature juridiquement valable', 'Envoi par email ou SMS', 'Signature mobile', 'Certificat horodaté', 'Relances automatiques', 'Archivage 10 ans'],
    badge: 'Inclus',
  },
  {
    id: 'crm',
    icon: '🔄',
    title: 'Pipeline CRM visuel',
    subtitle: 'Pilotez votre activité commerciale',
    desc: "Visualisez tous vos projets en cours d'un coup d'œil avec un pipeline Kanban. De la prospection à la livraison, ne laissez plus aucune opportunité vous échapper.",
    features: ['Pipeline Kanban visuel', 'Étapes personnalisables', 'Valeur du pipeline en temps réel', 'Relances commerciales', 'Statistiques de conversion', 'Import CRM existant'],
    badge: 'CRM',
  },
  {
    id: 'stats',
    icon: '📊',
    title: 'Tableau de bord & Statistiques',
    subtitle: 'Pilotez avec les bons indicateurs',
    desc: "CA, marge, taux de conversion, délais de paiement, performance par métier... Tous vos KPIs en temps réel dans un dashboard clair et personnalisable.",
    features: ['Dashboard temps réel', 'CA et marges', 'Taux de conversion', 'Analyse par période', 'Export Excel/PDF', 'Rapports automatiques'],
    badge: 'Pro',
  },
];

export default function FonctionnalitesPage() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center',
        paddingTop: '76px', background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 5%' }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Fonctionnalités complètes
          </div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Tout ce qu&apos;il vous faut, dans une seule app
          </h1>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.2rem', maxWidth: 600, margin: '0 auto 2rem' }}>
            8 modules intégrés, pensés pour les professionnels de l&apos;agencement intérieur.
            Sans formation longue, sans complexité inutile.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register"><button className="btn-primary">Essai gratuit 14 jours →</button></a>
            <a href="/tarifs"><button className="btn-secondary">Voir les tarifs</button></a>
          </div>
        </div>
      </section>

      {/* Nav rapide */}
      <section style={{ background: 'var(--cream-dark)', padding: '24px 5%', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {features.map((f) => (
            <a key={f.id} href={`#${f.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: 'var(--white)', borderRadius: 8,
              border: '1px solid var(--border)', fontSize: '.88rem', color: 'var(--text)',
              fontWeight: 500, transition: 'var(--transition)',
            }}>
              {f.icon} {f.title.split('—')[0].trim()}
            </a>
          ))}
        </div>
      </section>

      {/* Features détaillées */}
      {features.map((f, i) => (
        <section
          key={f.id}
          id={f.id}
          className="section"
          style={{ background: i % 2 === 0 ? 'var(--white)' : 'var(--cream-light)' }}
        >
          <div className="container" style={{
            display: 'grid',
            gridTemplateColumns: i % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
            gap: '80px', alignItems: 'center',
          }}>
            <div className={`reveal ${i % 2 !== 0 ? '' : ''}`} style={{ order: i % 2 !== 0 ? 2 : 1 }}>
              <div className="section-label">{f.badge}</div>
              <h2 className="section-title">{f.title}</h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>{f.desc}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
                {f.features.map((feat) => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(74,99,80,.15)', border: '1.5px solid var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', color: 'var(--green-light)', flexShrink: 0 }}>✓</div>
                    <span style={{ fontSize: '.9rem', color: 'var(--text)' }}>{feat}</span>
                  </div>
                ))}
              </div>
              <a href="/register"><button className="btn-outline">Essayer gratuitement →</button></a>
            </div>
            <div className="reveal" style={{
              order: i % 2 !== 0 ? 1 : 2,
              background: i % 2 === 0 ? 'linear-gradient(135deg,var(--cream-dark),var(--cream))' : 'linear-gradient(135deg,var(--green-deep),var(--green))',
              borderRadius: 20, padding: '2.5rem',
              border: `1px solid ${i % 2 === 0 ? 'var(--border)' : 'rgba(201,169,110,.2)'}`,
              minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', textAlign: 'center',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: i % 2 === 0 ? 'var(--text)' : 'var(--white)', marginBottom: '.5rem' }}>{f.subtitle}</div>
              <div className="badge badge-gold">{f.badge}</div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA final */}
      <section className="section section-centered" style={{ background: 'linear-gradient(135deg,var(--green-deep),var(--green))' }}>
        <div className="container">
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>Prêt à tout essayer gratuitement ?</h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 520, margin: '0 auto 2.5rem' }}>
            14 jours d&apos;accès complet à toutes les fonctionnalités Pro, sans carte bancaire.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register"><button className="btn-primary">Commencer l&apos;essai gratuit →</button></a>
            <a href="/tarifs"><button className="btn-secondary">Comparer les plans</button></a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
