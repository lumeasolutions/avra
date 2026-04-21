import type { Metadata } from 'next';
import {
  Building2,
  BarChart3,
  Network,
  ClipboardList,
  Check,
  Layout,
  MapPin,
  Users,
  Zap,
  Quote,
} from 'lucide-react';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import BetaBanner from '../(marketing)/components/BetaBanner';
import '../(marketing)/marketing.css';

export const metadata: Metadata = {
  title: 'Logiciel agenceur — Gestion de projets d\'agencement tout-en-un',
  description:
    'AVRA pour agenceurs : gestion de projets d\'agencement, coordination fournisseurs, suivi de chantier, devis et facturation. Solution complète.',
  alternates: { canonical: 'https://avra.fr/agenceur' },
  openGraph: {
    title: 'Logiciel agenceur — AVRA',
    description:
      'Gestion multi-sites, reporting client, portail partenaires et appels d\'offres. Pour agenceurs.',
    url: 'https://avra.fr/agenceur',
  },
};

export default function AgenceurPage() {

  return (
    <>
      <BetaBanner />
      <Nav />
      <ScrollReveal />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AVRA — Logiciel agenceur',
            description:
              'ERP + IA SaaS pour agenceurs — gestion multi-sites, coordination, reporting, appels d\'offres',
            url: 'https://avra.fr/agenceur',
            applicationCategory: 'BusinessApplication',
            targetAudience: {
              '@type': 'Audience',
              audienceType: 'agenceur',
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
            Pour les agenceurs
          </div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            La solution complète pour les agenceurs
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.15rem',
              maxWidth: 600,
              margin: '0 auto 2rem',
            }}
          >
            Gestion multi-sites, coordination fournisseurs, reporting clients professionnels, appels d&apos;offres et
            portail partenaires. Doublez votre capacité.
          </p>
          <a href="/comment-ca-marche">
            <button className="btn-primary">Demander une démo →</button>
          </a>
        </div>
      </section>

      {/* Problèmes typiques */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Vos défis quotidiens</div>
            <h2 style={{ marginBottom: '1rem' }}>Les agenceurs nous disent</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
              Coordonner plusieurs chantiers simultanés, c&apos;est complexe. AVRA simplifie tout.
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
                icon: Building2,
                title: 'Gérer plusieurs chantiers en simultané',
                desc: 'Entre 10 et 20 chantiers en cours en même temps. Impossible de suivre tout le monde avec des tableurs et emails.',
              },
              {
                icon: BarChart3,
                title: 'Les clients exigent un reporting régulier',
                desc: 'Chaque semaine, générer des rapports d&apos;avancement manuels pour 10 clients corporate. C&apos;est très chronophage.',
              },
              {
                icon: Network,
                title: 'Coordonner fournisseurs et sous-traitants',
                desc: 'Des dizaines de partenaires impliqués. Synchroniser tout le monde sur les délais et les livrables est un cauchemar.',
              },
              {
                icon: ClipboardList,
                title: 'Répondre aux appels d&apos;offres rapidement',
                desc: 'Vous avez 3 jours pour répondre. Chercher vos références, créer un dossier de présentation, c&apos;est trop long.',
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
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Solutions AVRA pour agenceurs</div>
            <h2 style={{ marginBottom: '1rem' }}>Votre outil de pilotage central</h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-muted)',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              5 fonctionnalités pensées pour les agenceurs qui gèrent des dizaines de chantiers.
            </p>
          </div>

          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            {[
              {
                icon: MapPin,
                title: 'Gestion multi-sites centralisée',
                desc: 'Suivez tous vos chantiers sur une même carte. Zoom sur un projet spécifique ou vue globale. Alertes retard en temps réel.',
                features: [
                  'Dashboard multi-projets',
                  'Suivi géographique',
                  'Alertes retard',
                  'Comparaison planning/réel',
                ],
              },
              {
                icon: BarChart3,
                title: 'Reporting client automatisé',
                desc: 'Générateur de rapports d&apos;avancement professionnels en 1 clic. Tableaux de bord, graphiques, photos de chantier. Partagez directement aux clients.',
                features: [
                  'Templates reportings',
                  'Génération automatisée',
                  'Graphiques d&apos;avancement',
                  'Export PDF',
                ],
              },
              {
                icon: Network,
                title: 'Portail partenaires sécurisé',
                desc: 'Donnez accès à vos sous-traitants et artisans à leur partie du projet. Ils reçoivent les info pertinentes sans avoir accès à vos marges.',
                features: [
                  'Accès granulaire',
                  'Notifications ciblées',
                  'Partage de plans',
                  'Validation en ligne',
                ],
              },
              {
                icon: Zap,
                title: 'Génération appels d&apos;offres',
                desc: 'Convertissez vos réalisations passées en dossiers de présentation pour appels d&apos;offres. Plus rapide, plus professionnel, plus percutant.',
                features: [
                  'Bibliothèque réalisations',
                  'Génération automatique',
                  'Personnalisation rapide',
                  'Export présentatif',
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

      {/* Coordination */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'center',
            }}
            className="grid-2col"
          >
            <div className="reveal">
              <div className="section-label" style={{ marginBottom: '1.5rem' }}>Synchronisation</div>
              <h2 style={{ marginBottom: '1.5rem' }}>Tout le monde sur la même page</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Clients, artisans, fournisseurs, équipes interne. Tout le monde voit exactement ce qu&apos;il doit voir.
                Les réunions de coordination inutiles disparaissent.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Communication centralisée par projet',
                  'Notifications ciblées par rôle',
                  'Historique des modifications',
                  'Audit trail complet',
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
                  <Users size={60} strokeWidth={1} style={{ margin: '0 auto', opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chiffres */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--green-deep)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ color: 'var(--white)', marginBottom: '1rem' }}>Les résultats parlent d&apos;eux-mêmes</h2>
            <p
              style={{
                color: 'rgba(255,255,255,.75)',
                fontSize: '1.05rem',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              Agenceurs qui utilisent AVRA rapportent
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              maxWidth: 800,
              margin: '0 auto',
            }}
          >
            {[
              { val: '3×', label: 'Plus de projets gérés en simultané' },
              { val: '-50%', label: 'De réunions de coordination' },
              { val: '+40%', label: 'De taux de signature appels d\'offres' },
              { val: '99%', label: 'Des projets livrés dans les délais' },
            ].map((stat, i) => (
              <div
                key={i}
                className="reveal"
                style={{
                  textAlign: 'center',
                  padding: '1.5rem',
                  background: 'rgba(255,255,255,.05)',
                  borderRadius: 16,
                  border: '1px solid rgba(201,169,110,.12)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    color: 'var(--gold)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {stat.val}
                </div>
                <div style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.7)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignage */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div
            className="reveal"
            style={{
              maxWidth: 700,
              margin: '0 auto',
              background: 'var(--cream-light)',
              borderRadius: 20,
              padding: '3rem',
              border: '1px solid rgba(48,64,53,.12)',
              textAlign: 'center',
            }}
          >
            <Quote size={40} style={{ margin: '0 auto 1.5rem', color: 'var(--gold)' }} />
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                color: 'var(--text)',
                fontSize: '1.1rem',
                marginBottom: '2rem',
                lineHeight: 1.7,
              }}
            >
              Avec AVRA, on a pu doubler notre capacité de projets simultanés sans embaucher de chef de projet
              supplémentaire. Le ROI a été immédiat. Nos clients corporate adorent les reportings automatisés.
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
                Nathalie P.
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
                Agenceur, Marseille
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
              Doublez votre capacité de gestion de projets
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,.75)',
                fontSize: '1.05rem',
                marginBottom: '2.5rem',
              }}
            >
              Découvrez comment AVRA peut transformer votre activité. Sans engagement.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/comment-ca-marche">
                <button className="btn-primary">Demander une démo →</button>
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
              { href: '/menuisier', label: 'Menuisier' },
              { href: '/architecte-interieur', label: 'Architecte d&apos;intérieur' },
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
