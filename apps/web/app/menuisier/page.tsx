import type { Metadata } from 'next';
import {
  FileCheck,
  Package,
  Clock,
  DollarSign,
  Check,
  Hammer,
  Layers,
  AlertCircle,
  BarChart3,
  Package2,
  Quote,
} from 'lucide-react';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import '../(marketing)/marketing.css';

export const metadata: Metadata = {
  title: 'Logiciel menuisier — Devis, planning et facturation pour menuisiers',
  description:
    'AVRA gère tout pour les menuisiers : devis de menuiserie, suivi de chantier, gestion de stock bois et matériaux, facturation conforme e-facture 2026. Essai 14j.',
  alternates: { canonical: 'https://avra.fr/menuisier' },
  openGraph: {
    title: 'Logiciel menuisier — AVRA',
    description: 'Devis, planning, stock et facturation pour menuisiers. Solution complète.',
    url: 'https://avra.fr/menuisier',
  },
};

export default function MenuisierPage() {

  return (
    <>
      <Nav />
      <ScrollReveal />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AVRA — Logiciel menuisier',
            description:
              'ERP + IA SaaS pour les professionnels de agencement intérieur — menuiserie, gestion de stock, facturation',
            url: 'https://avra.fr/menuisier',
            applicationCategory: 'BusinessApplication',
            targetAudience: {
              '@type': 'Audience',
              audienceType: 'menuisier',
            },
            operatingSystem: 'Cloud',
            offers: {
              '@type': 'Offer',
              priceCurrency: 'EUR',
              price: '0',
              pricingModel: 'Freemium',
            },
          }),
        }}
      />

      {/* Hero */}
      <section
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '76px',
          background: 'linear-gradient(135deg, var(--green-deep) 0%, var(--green) 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 5%', width: '100%' }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Pour les menuisiers
          </div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            L&apos;ERP des menuisiers modernes
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.15rem',
              maxWidth: 600,
              margin: '0 auto 2rem',
            }}
          >
            Devis, planning de chantier, gestion de stock bois et matériaux, facturation e-facture. Enfin un logiciel
            pensé pour votre réalité.
          </p>
          <a href="/register">
            <button className="btn-primary">Commencer l&apos;essai gratuit 14 jours →</button>
          </a>
        </div>
      </section>

      {/* Problèmes typiques */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Vos défis quotidiens</div>
            <h2 style={{ marginBottom: '1rem' }}>Les menuisiers nous disent</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
              Les mêmes frustrations reviennent dans tous les ateliers. AVRA résout tout ça.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                icon: FileCheck,
                title: 'Les devis menuiserie sont trop complexes',
                desc: 'Chaque projet est unique. Calculer les dimensions, les matériaux, les délais... C&apos;est long et source d&apos;erreurs.',
              },
              {
                icon: Package,
                title: 'Vous avez des ruptures de stock',
                desc: 'Vous ne savez jamais vraiment combien de bois, de quincaillerie vous avez. Les arrêts de chantier faute de matériaux coûtent cher.',
              },
              {
                icon: Clock,
                title: 'Suivre les heures réelles est impossible',
                desc: 'Vous facturez au forfait, mais vous ne savez pas si vous la couvrez. Impossible de comparer au devis.',
              },
              {
                icon: DollarSign,
                title: 'La facturation e-facture 2026 vous stresse',
                desc: 'La conformité légale c&apos;est du chinois. Vous avez peur de mal faire et de vous faire pénaliser.',
              },
            ].map((problem, i) => {
              const Icon = problem.icon;
              return (
                <div
                  key={i}
                  className="reveal card"
                  style={{
                    padding: '2rem',
                    background: '#f9f6f0',
                    border: '1px solid rgba(48,64,53,.12)',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--gold)' }}>
                    <Icon size={40} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>{problem.title}</h3>
                  <p style={{ fontSize: '.95rem', color: 'var(--text-muted)', margin: 0 }}>
                    {problem.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solutions AVRA */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--cream-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Solutions AVRA pour menuisiers</div>
            <h2 style={{ marginBottom: '1rem' }}>Tout pour votre atelier</h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-muted)',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              5 outils pensés pour les menuisiers, du devis à la facturation.
            </p>
          </div>

          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            {[
              {
                icon: FileCheck,
                title: 'Devis menuiserie précis',
                desc: 'Templates spécialisés menuiserie. Ajoutez vos codes articles, matériaux standards, options sur mesure. Générez un devis professionnel en 10 minutes.',
                features: [
                  'Templates menuiserie',
                  'Bibliothèque articles',
                  'Calcul automatique délais',
                  'Historique devis',
                ],
              },
              {
                icon: Package2,
                title: 'Gestion de stock intégrée',
                desc: 'Bois, quincaillerie, vis, peintures : suivez en temps réel ce que vous avez. Alertes rupture de stock et suggestions de réapprovisionnement.',
                features: [
                  'Inventaire catégorisé',
                  'Alertes rupture',
                  'Fournisseurs préférés',
                  'Historique mouvements',
                ],
              },
              {
                icon: Clock,
                title: 'Suivi heures et marges',
                desc: 'Enregistrez les heures passées par projet. Comparez au devis initial. Détectez les écarts et améliorez votre rentabilité projet par projet.',
                features: [
                  'Chrono par projet',
                  'Comparaison devis/réel',
                  'Analyse marges',
                  'Rapports mensuel',
                ],
              },
              {
                icon: BarChart3,
                title: 'Facturation e-facture conforme',
                desc: 'AVRA génère vos factures conformes e-facture 2026. Plus besoin de vous poser la question de la légalité. C&apos;est intégré.',
                features: [
                  'Conformité e-facture',
                  'Numérotation légale',
                  'Archivage automatique',
                  'Rappels paiement',
                ],
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="reveal">
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div
                      style={{
                        flex: '0 0 auto',
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(201, 169, 110, 0.12)',
                        borderRadius: 12,
                        color: 'var(--gold)',
                      }}
                    >
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '.5rem' }}>{feature.title}</h3>
                      <p
                        style={{
                          fontSize: '0.95rem',
                          color: 'var(--text-muted)',
                          margin: 0,
                          marginBottom: '1rem',
                        }}
                      >
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                    }}
                  >
                    {feature.features.map((f, j) => (
                      <li key={j} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <Check
                          size={18}
                          strokeWidth={2.5}
                          style={{
                            flex: '0 0 auto',
                            marginTop: '2px',
                            color: 'var(--green)',
                          }}
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planning de chantier */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div
            className="grid-2col"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            <div className="reveal">
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(201, 169, 110, 0.1) 0%, rgba(74, 99, 80, 0.05) 100%)',
                  borderRadius: 20,
                  padding: '2rem',
                  border: '1px solid rgba(48,64,53,.12)',
                  minHeight: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ fontSize: '4rem' }}>
                  <Layers size={60} strokeWidth={1} style={{ margin: '0 auto', opacity: 0.3 }} />
                </div>
              </div>
            </div>
            <div className="reveal">
              <div className="section-label" style={{ marginBottom: '1.5rem' }}>Planning & coordination</div>
              <h2 style={{ marginBottom: '1.5rem' }}>Maîtrisez votre calendrier de chantier</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Planifiez tous les chantiers en simultané. Gérez les contraintes, les imprévus, les équipes. Chaque menuisier voit ses missions du jour.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Calendrier équipe centralisé',
                  'Alertes de conflits de planning',
                  'Notification pour chaque équipier',
                  'Historique des réalisations',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <Check
                      size={20}
                      strokeWidth={2.5}
                      style={{
                        flex: '0 0 auto',
                        marginTop: '2px',
                        color: 'var(--green)',
                      }}
                    />
                    <span style={{ fontSize: '1rem', color: 'var(--text)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Gestion fournisseurs */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--cream-light)' }}>
        <div className="container">
          <div
            className="grid-2col"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            <div className="reveal">
              <div className="section-label" style={{ marginBottom: '1.5rem' }}>Stock & Fournisseurs</div>
              <h2 style={{ marginBottom: '1.5rem' }}>Catalogue matériaux centralisé</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Tous vos fournisseurs bois et matériaux menuiserie au même endroit. Commandes directes, suivi des délais, alertes rupture.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Carnet fournisseurs menuiserie',
                  'Comparaison prix fournisseurs',
                  'Gestion commandes groupées',
                  'Suivi livraisons en temps réel',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <Check
                      size={20}
                      strokeWidth={2.5}
                      style={{
                        flex: '0 0 auto',
                        marginTop: '2px',
                        color: 'var(--green)',
                      }}
                    />
                    <span style={{ fontSize: '1rem', color: 'var(--text)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal">
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(201, 169, 110, 0.1) 0%, rgba(74, 99, 80, 0.05) 100%)',
                  borderRadius: 20,
                  padding: '2rem',
                  border: '1px solid rgba(48,64,53,.12)',
                  minHeight: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ fontSize: '4rem' }}>
                  <AlertCircle size={60} strokeWidth={1} style={{ margin: '0 auto', opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignage */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--green-deep)' }}>
        <div className="container">
          <div
            className="reveal"
            style={{
              maxWidth: 700,
              margin: '0 auto',
              background: 'rgba(255,255,255,.05)',
              borderRadius: 20,
              padding: '3rem',
              border: '1px solid rgba(201,169,110,.2)',
              textAlign: 'center',
            }}
          >
            <Quote size={40} style={{ margin: '0 auto 1.5rem', color: 'var(--gold)' }} />
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                color: 'rgba(255,255,255,.9)',
                fontSize: '1.1rem',
                marginBottom: '2rem',
                lineHeight: 1.7,
              }}
            >
              La gestion de stock intégrée m&apos;a évité 3 arrêts de chantier faute de matériaux. Et le suivi des marges
              m&apos;a révélé que je sous-facturais certains travaux de finition. En 3 mois, mon CA a augmenté de 28%.
            </p>
            <div>
              <div
                style={{
                  fontSize: '.95rem',
                  fontWeight: 600,
                  color: 'var(--gold)',
                  marginBottom: '.25rem',
                }}
              >
                Julien T.
              </div>
              <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)' }}>
                Menuisier-agenceur, Nantes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'linear-gradient(135deg, var(--green-deep) 0%, var(--green) 100%)' }}>
        <div className="container">
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
              Doublez votre capacité sans embaucher ?
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,.75)',
                fontSize: '1.05rem',
                marginBottom: '2.5rem',
              }}
            >
              14 jours d&apos;essai gratuit. Pas de carte bancaire. Pas de contrat.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/register">
                <button className="btn-primary">Essai gratuit 14 jours →</button>
              </a>
              <a href="/comment-ca-marche">
                <button className="btn-secondary">Voir comment ça marche</button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Internal links */}
      <section
        style={{
          padding: '80px 5%',
          background: 'var(--white)',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h3>Découvrez aussi AVRA pour les autres métiers</h3>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              { href: '/cuisiniste', label: 'Cuisiniste' },
              { href: '/architecte-interieur', label: 'Architecte d&apos;intérieur' },
              { href: '/agenceur', label: 'Agenceur' },
              { href: '/metiers', label: 'Tous les métiers' },
            ].map((link) => (
              <a key={link.href} href={link.href}>
                <button
                  className="btn-outline"
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                  }}
                >
                  {link.label}
                </button>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
