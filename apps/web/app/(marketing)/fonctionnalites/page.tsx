import type { Metadata } from 'next';
import {
  FolderOpen,
  Receipt,
  Sparkles,
  Calendar,
  Package,
  PenLine,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Fonctionnalités AVRA — ERP complet pour cuisinistes et menuisiers',
  description:
    'Découvrez les 8 modules AVRA : gestion dossiers, facturation conforme e-facture 2026, IA photo-réalisme FLUX Pro, planning, stock, signature électronique, statistiques et portails partenaires.',
  alternates: { canonical: 'https://avra.fr/fonctionnalites' },
  openGraph: {
    title: 'Fonctionnalités AVRA — Gestion complète',
    description:
      'Gestion dossiers, facturation e-facture 2026, IA Studio, planning, stock, signature électronique, statistiques et portails partenaires.',
    url: 'https://avra.fr/fonctionnalites',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AVRA',
  applicationCategory: 'BusinessApplication',
  featureList: [
    'Gestion des dossiers clients',
    'Facturation et devis intelligents',
    'IA Studio photo-réalisme',
    'Planning et gestion de chantiers',
    'Gestion de stock',
    'Signature électronique',
    'Pipeline CRM visuel',
    'Tableau de bord et statistiques',
  ],
  offers: {
    '@type': 'Offer',
    price: '49',
    priceCurrency: 'EUR',
  },
};

const features = [
  {
    id: 'dossiers',
    icon: FolderOpen,
    title: 'Gestion des dossiers clients',
    subtitle: 'Centralisez tout sur chaque projet',
    desc: "Plus aucun document perdu, plus aucun email introuvable. Chaque dossier client regroupe plans, photos, devis, contrats, notes et historique des échanges. L'accès est instantané depuis n'importe quel appareil.",
    features: [
      'Dossier unifié par client',
      'Historique complet des échanges',
      'Tags et filtres avancés',
      'Accès multi-appareils',
      'Partage sécurisé avec clients',
      'Archivage automatique',
    ],
    badge: 'Essentiel',
  },
  {
    id: 'facturation',
    icon: Receipt,
    title: 'Facturation & Devis intelligents',
    subtitle: 'Du devis à la facture en 2 clics',
    desc: 'Créez des devis professionnels en quelques secondes depuis vos catalogues produits. Transformez-les en factures, gérez les acomptes, suivez les paiements et relancez automatiquement les impayés.',
    features: [
      'Devis en 2 clics',
      'Catalogues produits intégrés',
      'Acomptes et soldes',
      'Facturation récurrente',
      'Relances automatiques',
      'Conformité e-facture 2026',
    ],
    badge: 'Populaire',
  },
  {
    id: 'ia',
    icon: Sparkles,
    title: 'IA Studio — Photo-réalisme',
    subtitle: 'Vendez avant de construire',
    desc: 'Générez des rendus photo-réalistes bluffants en quelques secondes grâce à FLUX Pro. Décrivez votre projet, uploadez vos plans, et obtenez des images HD à montrer à vos clients.',
    features: [
      'Rendus FLUX Pro HD',
      'Génération en < 10 secondes',
      'Export en haute résolution',
      'Chat IA contextuel',
      'Suggestions de matériaux',
      'Historique des générations',
    ],
    badge: 'IA',
  },
  {
    id: 'planning',
    icon: Calendar,
    title: 'Planning & Gestion de chantiers',
    subtitle: 'Planifiez sans effort',
    desc: "Un calendrier visuel partagé avec toute votre équipe. Planifiez poses, livraisons, RDV clients et interventions SAV. Les conflits d'agenda sont détectés automatiquement.",
    features: [
      'Calendrier visuel partagé',
      'Vue par technicien',
      'Détection de conflits',
      'Rappels automatiques',
      'Intégration Google Calendar',
      'Export planning PDF',
    ],
    badge: 'Pro',
  },
  {
    id: 'stock',
    icon: Package,
    title: 'Gestion de stock & fournisseurs',
    subtitle: 'Ne manquez plus de rien',
    desc: 'Suivez vos matériaux, composants et commandes en temps réel. Les alertes de rupture sont automatiques. Passez vos commandes fournisseurs directement depuis AVRA.',
    features: [
      'Stock en temps réel',
      'Alertes de rupture',
      'Commandes fournisseurs',
      'Codes-barres et QR codes',
      'Multi-dépôts',
      'Rapports de consommation',
    ],
    badge: 'Pro',
  },
  {
    id: 'signature',
    icon: PenLine,
    title: 'Signature électronique',
    subtitle: 'Signez en quelques secondes',
    desc: 'Envoyez vos devis et contrats par email ou SMS pour signature électronique. Juridiquement valable en France et UE. Vos clients signent depuis leur smartphone.',
    features: [
      'Signature juridiquement valable',
      'Envoi par email ou SMS',
      'Signature mobile',
      'Certificat horodaté',
      'Relances automatiques',
      'Archivage 10 ans',
    ],
    badge: 'Inclus',
  },
  {
    id: 'crm',
    icon: Users,
    title: 'Pipeline CRM visuel',
    subtitle: 'Pilotez votre activité commerciale',
    desc: "Visualisez tous vos projets en cours d'un coup d'œil avec un pipeline Kanban. De la prospection à la livraison, ne laissez plus aucune opportunité vous échapper.",
    features: [
      'Pipeline Kanban visuel',
      'Étapes personnalisables',
      'Valeur du pipeline en temps réel',
      'Relances commerciales',
      'Statistiques de conversion',
      'Import CRM existant',
    ],
    badge: 'CRM',
  },
  {
    id: 'stats',
    icon: BarChart3,
    title: 'Tableau de bord & Statistiques',
    subtitle: 'Pilotez avec les bons indicateurs',
    desc: 'CA, marge, taux de conversion, délais de paiement, performance par métier... Tous vos KPIs en temps réel dans un dashboard clair et personnalisable.',
    features: [
      'Dashboard temps réel',
      'CA et marges',
      'Taux de conversion',
      'Analyse par période',
      'Export Excel/PDF',
      'Rapports automatiques',
    ],
    badge: 'Pro',
  },
];

export default function FonctionnalitesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '76px',
          background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 5%' }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            8 modules complets
          </div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Tout ce dont vous avez besoin pour gérer votre activité
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.2rem',
              maxWidth: 600,
              margin: '0 auto 2rem',
            }}
          >
            Gestion dossiers, facturation e-facture 2026, IA photo-réalisme, planning, stock,
            signature électronique, CRM et statistiques dans une seule application.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register">
              <button className="btn-primary">
                <ArrowRight size={18} />
                Essai gratuit 14 jours
              </button>
            </a>
            <a href="/tarifs">
              <button className="btn-secondary">Voir les tarifs</button>
            </a>
          </div>
        </div>
      </section>

      {/* Nav rapide */}
      <section
        style={{
          background: 'var(--cream-dark)',
          padding: '24px 5%',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {features.map((f) => (
            <a
              key={f.id}
              href={`#${f.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: 'var(--white)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: '.88rem',
                color: 'var(--text)',
                fontWeight: 500,
                transition: 'var(--transition)',
              }}
            >
              <f.icon size={16} />
              {f.title.split('—')[0].trim()}
            </a>
          ))}
        </div>
      </section>

      {/* Features détaillées */}
      {features.map((f, i) => {
        const IconComponent = f.icon;
        return (
          <section
            key={f.id}
            id={f.id}
            className="section"
            style={{
              background: i % 2 === 0 ? 'var(--white)' : 'var(--cream-light)',
            }}
          >
            <div
              className="container"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '80px',
                alignItems: 'center',
              }}
            >
              <div
                className="reveal"
                style={{ order: i % 2 !== 0 ? 2 : 1 }}
              >
                <div className="section-label">{f.badge}</div>
                <h2 className="section-title">{f.title}</h2>
                <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
                  {f.desc}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '2rem',
                  }}
                >
                  {f.features.map((feat) => (
                    <div
                      key={feat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <CheckCircle
                        size={18}
                        style={{
                          color: 'var(--green-light)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '.9rem',
                          color: 'var(--text)',
                        }}
                      >
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
                <a href="/register">
                  <button className="btn-outline">
                    Essayer gratuitement
                    <ArrowRight size={16} />
                  </button>
                </a>
              </div>

              <div
                className="reveal"
                style={{
                  order: i % 2 !== 0 ? 1 : 2,
                  background:
                    i % 2 === 0
                      ? 'linear-gradient(135deg,var(--cream-dark),var(--cream))'
                      : 'linear-gradient(135deg,var(--green-deep),var(--green))',
                  borderRadius: 20,
                  padding: '2.5rem',
                  border: `1px solid ${i % 2 === 0 ? 'var(--border)' : 'rgba(201,169,110,.2)'}`,
                  minHeight: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  textAlign: 'center',
                }}
              >
                <IconComponent
                  size={80}
                  style={{
                    color:
                      i % 2 === 0
                        ? 'var(--green)'
                        : 'var(--gold)',
                    marginBottom: '1.5rem',
                  }}
                />
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color:
                      i % 2 === 0
                        ? 'var(--text)'
                        : 'var(--white)',
                    marginBottom: '.5rem',
                  }}
                >
                  {f.subtitle}
                </div>
                <div className="badge badge-gold">
                  {f.badge}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* e-facture 2026 */}
      <section
        className="section section-centered"
        style={{
          background: 'var(--green-deep)',
        }}
      >
        <div className="container" style={{ maxWidth: 700 }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Conformité légale
          </div>
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Conforme e-facture 2026
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.1rem',
              marginBottom: '2rem',
            }}
          >
            Toutes vos factures sont automatiquement conformes à la nouvelle norme e-facture
            obligatoire en 2026. AVRA génère le format structuré UBL/XML exigé par l'administration.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Receipt size={18} />
              En savoir plus sur e-facture
            </button>
          </div>
        </div>
      </section>

      {/* Comparatif avant/après */}
      <section className="section">
        <div className="container">
          <div className="section-centered" style={{ marginBottom: '3rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
              Transformation
            </div>
            <h2 className="section-title">
              Avant et après AVRA
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 600,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px 20px',
                      background: 'var(--green-deep)',
                      color: 'var(--white)',
                      borderRadius: '12px 0 0 0',
                      fontSize: '.9rem',
                    }}
                  >
                    Tâche
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px 20px',
                      background: 'var(--green-deep)',
                      color: 'var(--white)',
                      fontSize: '.9rem',
                    }}
                  >
                    Avant AVRA
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px 20px',
                      background: 'var(--gold)',
                      color: 'var(--green-deep)',
                      borderRadius: '0 12px 0 0',
                      fontSize: '.9rem',
                      fontWeight: 700,
                    }}
                  >
                    Avec AVRA
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    task: 'Créer un devis',
                    before: '30 min (Excel + traitement)',
                    after: '2 min (templates)',
                  },
                  {
                    task: 'Générer une facture',
                    before: '15 min (saisie manuelle)',
                    after: '30 sec (auto depuis devis)',
                  },
                  {
                    task: 'Planifier une intervention',
                    before: '10 min (appels/emails)',
                    after: '2 min (calendrier partagé)',
                  },
                  {
                    task: 'Suivre un dossier client',
                    before: 'Multiple sources (emails, disque)',
                    after: 'Centralisé dans AVRA',
                  },
                  {
                    task: 'Obtenir un rendu pour le client',
                    before: '2-3 jours (agence externe)',
                    after: '< 10 sec (IA)',
                  },
                ].map((row, i) => (
                  <tr
                    key={row.task}
                    style={{
                      background:
                        i % 2 === 0 ? 'var(--white)' : 'var(--cream-light)',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '.9rem',
                        color: 'var(--text)',
                        fontWeight: 600,
                      }}
                    >
                      {row.task}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '.88rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {row.before}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '.88rem',
                        color: 'var(--green-light)',
                        fontWeight: 600,
                      }}
                    >
                      {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        className="section section-centered"
        style={{
          background:
            'linear-gradient(135deg,var(--green-deep),var(--green))',
        }}
      >
        <div className="container">
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Prêt à transformer votre activité ?
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,.75)',
              maxWidth: 520,
              margin: '0 auto 2.5rem',
            }}
          >
            14 jours d&apos;accès complet à toutes les fonctionnalités Pro, sans carte bancaire.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a href="/register">
              <button
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Commencer l&apos;essai gratuit
                <ArrowRight size={18} />
              </button>
            </a>
            <a href="/tarifs">
              <button className="btn-secondary">
                Comparer les plans
              </button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
