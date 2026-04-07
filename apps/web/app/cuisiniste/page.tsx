import type { Metadata } from 'next';
import {
  Clock,
  FileX,
  Users,
  TrendingDown,
  Check,
  ChefHat,
  Ruler,
  Truck,
  Calendar,
  Sparkles,
  Quote,
} from 'lucide-react';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import '../(marketing)/marketing.css';

export const metadata: Metadata = {
  title: 'Logiciel cuisiniste — Gérez vos projets cuisine de A à Z avec AVRA',
  description:
    'AVRA est le logiciel pensé pour les cuisinistes : devis sur mesure, plans, commandes fournisseurs, planification des poses, rendus IA FLUX Pro. Essai gratuit 14j.',
  alternates: { canonical: 'https://avra.fr/cuisiniste' },
  openGraph: {
    title: 'Logiciel cuisiniste — AVRA',
    description: 'Devis, plans, commandes fournisseurs, poses et rendus IA. Tout pour les cuisinistes.',
    url: 'https://avra.fr/cuisiniste',
  },
};

export default function CuisinistePage() {

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
            name: 'AVRA — Logiciel cuisiniste',
            description:
              'ERP + IA SaaS pour les professionnels de agencement intérieur — cuisine, menuiserie, architecture',
            url: 'https://avra.fr/cuisiniste',
            applicationCategory: 'BusinessApplication',
            targetAudience: {
              '@type': 'Audience',
              audienceType: 'cuisiniste',
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
            Pour les cuisinistes
          </div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Le logiciel qui libère les cuisinistes des tâches administratives
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.15rem',
              maxWidth: 600,
              margin: '0 auto 2rem',
            }}
          >
            Devis, plans, commandes fournisseurs, planning de pose et rendus IA. Tout ce dont vous avez besoin pour
            gérer une cuisine de A à Z.
          </p>
          <a href="/register">
            <button className="btn-primary">Commencer l&apos;essai gratuit 14 jours →</button>
          </a>
        </div>
      </section>

      {/* Problèmes typiques */}
      <section style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Vos défis quotidiens</div>
            <h2 style={{ marginBottom: '1rem' }}>Vous reconnaissez-vous ?</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
              Les cuisinistes nous disent tous la même chose. Voilà ce qu&apos;AVRA résout.
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
                icon: Clock,
                title: 'Vous perdez des heures sur les devis',
                desc: 'Chaque devis cuisine est sur-mesure. Entre les calculs de matériaux, les plans, les délais, c&apos;est un casse-tête.',
              },
              {
                icon: FileX,
                title: 'Vos commandes fournisseurs sont éparpillées',
                desc: 'Emails, appels, SMS... Vous jonchez pour savoir qui a commandé quoi et quand ça arrive.',
              },
              {
                icon: Users,
                title: 'Coordonner les poses est un cauchemar',
                desc: 'Installateurs, électriciens, plombiers... Synchroniser tout le monde sur le planning de chantier est stressant.',
              },
              {
                icon: TrendingDown,
                title: 'Vous ne savez pas si vous gagnez de l&apos;argent',
                desc: 'Impossible de suivre les heures réelles vs les devis. Vous sous-facturez probablement.',
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
                  <div
                    style={{
                      fontSize: '2.5rem',
                      marginBottom: '1rem',
                      color: 'var(--gold)',
                    }}
                  >
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
      <section style={{ padding: '100px 5%', background: 'var(--cream-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Solutions AVRA pour cuisinistes</div>
            <h2 style={{ marginBottom: '1rem' }}>Votre allié digital</h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-muted)',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              5 fonctionnalités pensées spécifiquement pour les cuisinistes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            {[
              {
                icon: Ruler,
                title: 'Devis & Plans de cuisine',
                desc: 'Générez des devis professionnels en 5 minutes. Associez vos plans de cuisine, nomenclatures de composants et options clients. Personnalisez chaque devis à votre image.',
                features: [
                  'Templates de devis cuisinistes',
                  'Plans de cuisine intégrés',
                  'Nomenclatures automatiques',
                  'Historique des devis',
                ],
              },
              {
                icon: Truck,
                title: 'Commandes fournisseurs centralisées',
                desc: 'Plus de devis fournisseurs perdus. Passez vos commandes directement dans AVRA, recevez les rappels de délai et suivez les livraisons en temps réel.',
                features: [
                  'Carnet fournisseurs cuisine',
                  'Suivi des délais',
                  'Alertes de livraison',
                  'Historique commandes',
                ],
              },
              {
                icon: Calendar,
                title: 'Planning de pose intelligent',
                desc: 'Planifiez chaque pose sur le calendrier d&apos;équipe. Gérez les conflits de timing, synchronisez les sous-traitants (électriciens, plombiers).',
                features: [
                  'Calendrier équipe intégré',
                  'Gestion des installateurs',
                  'Alertes de conflits',
                  'Récapitulatif chantier',
                ],
              },
              {
                icon: Sparkles,
                title: 'Rendus IA FLUX Pro',
                desc: 'Montrez à vos clients le rendu photo-réaliste de leur cuisine avant la pose. Vendez mieux, réduisez les insatisfactions, accélérez la signature du bon de commande.',
                features: [
                  'Génération de rendus IA',
                  'Personnalisation coloris',
                  '360° et plan 3D',
                  'Partage client direct',
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

      {/* IA Studio */}
      <section style={{ padding: '100px 5%', background: 'var(--white)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            <div className="reveal">
              <div className="section-label" style={{ marginBottom: '1.5rem' }}>IA Studio</div>
              <h2 style={{ marginBottom: '1.5rem' }}>Vendez avant de construire</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Montrez à vos clients des rendus photo-réalistes de leur cuisine équipée en 10 secondes. Ce petit geste
                change tout :
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Augmente le taux de signature de 35%',
                  'Réduit les insatisfactions client',
                  'Accélère la prise de décision',
                  'Permet de tester plusieurs coloris',
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
                  <Sparkles size={60} strokeWidth={1} style={{ margin: '0 auto', opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Témoignage */}
      <section style={{ padding: '100px 5%', background: 'var(--green-deep)' }}>
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
              AVRA m&apos;a permis de passer de 8 à 15 cuisines par mois sans embaucher. Le gain de temps sur
              l&apos;administratif est énorme. Les rendus IA, c&apos;est une vraie révolution pour convaincre les clients.
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
                Pierre M.
              </div>
              <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)' }}>
                Cuisiniste indépendant, Bordeaux
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section style={{ padding: '100px 5%', background: 'linear-gradient(135deg, var(--green-deep) 0%, var(--green) 100%)' }}>
        <div className="container">
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
              Prêt à transformer votre cuisine en entreprise moderne ?
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
              { href: '/menuisier', label: 'Menuisier' },
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
