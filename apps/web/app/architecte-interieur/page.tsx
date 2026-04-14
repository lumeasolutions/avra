import type { Metadata } from 'next';
import {
  Folder,
  TrendingUp,
  Users,
  FileText,
  Check,
  Pencil,
  PaletteIcon,
  DollarSign,
  Eye,
  Share2,
  Quote,
} from 'lucide-react';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import '../(marketing)/marketing.css';

export const metadata: Metadata = {
  title: 'Logiciel architecte d\'intérieur — Dossiers clients, IA et facturation',
  description:
    'AVRA pour architectes d\'intérieur : gestion des projets, dossiers clients, rendus IA photo-réalistes FLUX Pro, facturation et signature électronique.',
  alternates: { canonical: 'https://avra.fr/architecte-interieur' },
  openGraph: {
    title: 'Logiciel architecte d\'intérieur — AVRA',
    description:
      'Dossiers clients, rendus IA, suivi de budget et facturation honoraires. Pour architectes d\'intérieur.',
    url: 'https://avra.fr/architecte-interieur',
  },
};

export default function ArchitecteInteriorPage() {

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
            name: 'AVRA — Logiciel architecte d\'intérieur',
            description:
              'ERP + IA SaaS pour architectes d\'intérieur — gestion de projets, dossiers clients, rendus IA, facturation',
            url: 'https://avra.fr/architecte-interieur',
            applicationCategory: 'BusinessApplication',
            targetAudience: {
              '@type': 'Audience',
              audienceType: 'architecte d\'intérieur',
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
            Pour les architectes d&apos;intérieur
          </div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Le logiciel qui valorise votre créativité
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.15rem',
              maxWidth: 600,
              margin: '0 auto 2rem',
            }}
          >
            Dossiers clients centralisés, rendus IA photo-réalistes, suivi budgétaire, coordination artisans et
            facturation honoraires. Concentrez-vous sur le design.
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
            <h2 style={{ marginBottom: '1rem' }}>Les architectes d&apos;intérieur nous confient</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
              AVRA résout les vrais problèmes des architectes d&apos;intérieur modernes.
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
                icon: Folder,
                title: 'Vos dossiers clients sont éparpillés',
                desc: 'Plans dans Drive, photos dans Photos, devis dans Outlook, contrats imprimés... Impossible de retrouver rapidement ce qu&apos;il faut.',
              },
              {
                icon: TrendingUp,
                title: 'Présenter des rendus clients est trop long',
                desc: 'Vous passez 2-3 jours à créer des rendus pour chaque client. Les clients attendront rarement. Vous perdez des signatures.',
              },
              {
                icon: DollarSign,
                title: 'Suivre le budget est un casse-tête',
                desc: 'Vous estimez un budget au démarrage mais impossible de suivre les dépenses réelles vs prévisions. Les dépassements vous surprennent.',
              },
              {
                icon: Users,
                title: 'Coordonner les artisans est stressant',
                desc: 'Devis du carreleur, devis du plombier, devis du menuisier... Synchroniser 5-6 corps de métier sur un même projet, c&apos;est du cauchemar.',
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
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Solutions AVRA pour architectes d&apos;intérieur</div>
            <h2 style={{ marginBottom: '1rem' }}>Votre allié digital</h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-muted)',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              5 outils pour centraliser votre activité et impressionner vos clients.
            </p>
          </div>

          <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            {[
              {
                icon: Folder,
                title: 'Dossiers clients centralisés',
                desc: 'Un dossier par projet. Plans, photos moodboard, contrats, devis artisans, factures, PV de réception. Retrouvez n&apos;importe quoi en 10 secondes.',
                features: [
                  'Structure dossier standar',
                  'Stockage illimité',
                  'Versionning des plans',
                  'Partage contrôlé client',
                ],
              },
              {
                icon: PaletteIcon,
                title: 'Rendus IA photo-réalistes',
                desc: 'Générez des rendus bluffants en 10 secondes avec FLUX Pro. Testez plusieurs coloris, matériaux. Montrez-les au client le jour même de la visite.',
                features: [
                  'Génération 360° views',
                  'Variations coloris/matériaux',
                  'Export haute résolution',
                  'Partage direct client',
                ],
              },
              {
                icon: DollarSign,
                title: 'Suivi de budget précis',
                desc: 'Budget global par projet. Chaque devis artisan rentre dedans. Vous voyez l&apos;écart en temps réel. Les dépassements sont impossibles.',
                features: [
                  'Budget par poste',
                  'Comparaison budget/réel',
                  'Alertes dépassement',
                  'Rapports clients',
                ],
              },
              {
                icon: FileText,
                title: 'Contrats & signature électronique',
                desc: 'Contrats de maîtrise d&apos;œuvre, notes d&apos;honoraires, avenants. Signature électronique Legit intégrée. Plus de paperasse.',
                features: [
                  'Templates contrats',
                  'e-signature légale',
                  'Numérotation auto',
                  'Archivage sécurisé',
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
              <div className="section-label" style={{ marginBottom: '1.5rem' }}>IA Studio</div>
              <h2 style={{ marginBottom: '1.5rem' }}>Présentez des rendus photo-réalistes en 10 secondes</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Montrez à vos clients le rendu final avant même la signature du contrat. C&apos;est un game-changer pour les architectes.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Taux de signature augmente de 45%',
                  'Moins d&apos;allers-retours avec le client',
                  'Testez plusieurs variantes',
                  'Impression & portfolio direct',
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
                  <PaletteIcon size={60} strokeWidth={1} style={{ margin: '0 auto', opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portail client */}
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
                  <Share2 size={60} strokeWidth={1} style={{ margin: '0 auto', opacity: 0.3 }} />
                </div>
              </div>
            </div>
            <div className="reveal">
              <div className="section-label" style={{ marginBottom: '1.5rem' }}>Portail client</div>
              <h2 style={{ marginBottom: '1.5rem' }}>Client toujours dans la boucle</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Donnez accès à vos clients à leur dossier projet. Ils voient l&apos;avancement, validez les décisions en ligne, reçoivent les mises à jour.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Portail client sécurisé',
                  'Suivi d&apos;avancement en temps réel',
                  'Validation décisions en ligne',
                  'Notifications automatiques',
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
              L&apos;IA photo-réalisme a complètement changé mes présentations clients. Je montre des rendus bluffants
              en réunion et le taux de signature a explosé. Plus besoin de passer 3 jours à créer des rendus.
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
                Amélie F.
              </div>
              <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)' }}>
                Architecte d&apos;intérieur, Paris
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
              Passez plus de temps à créer, moins à administratif
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
