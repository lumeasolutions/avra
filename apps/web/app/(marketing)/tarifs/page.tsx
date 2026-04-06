import type { Metadata } from 'next';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Tarifs AVRA — Pricing transparent et abordable',
  description:
    'Plans simples et transparents pour tous. Starter 49€/mois, Pro 89€/mois avec IA, Enterprise sur devis. 14 jours gratuit, sans engagement, sans carte bancaire.',
  alternates: { canonical: 'https://avra.fr/tarifs' },
  openGraph: {
    title: 'Tarifs AVRA — Pricing transparent',
    description: 'Starter 49€, Pro 89€, Enterprise sur devis. Essai 14 jours gratuit. Sans engagement.',
    url: 'https://avra.fr/tarifs',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'PriceSpecification',
  priceCurrency: 'EUR',
  price: '49',
};

const plans = [
  {
    name: 'Starter',
    price: '49',
    period: '/mois',
    desc: 'Pour les indépendants qui démarrent leur digitalisation.',
    badge: null,
    cta: 'Commencer l\'essai gratuit',
    features: [
      { label: 'Dossiers clients illimités', included: true },
      { label: 'Devis & Facturation', included: true },
      { label: 'Signature électronique', included: true },
      { label: 'Planning basique', included: true },
      { label: '3 utilisateurs', included: true },
      { label: 'Support email', included: true },
      { label: 'IA Photo-réalisme', included: false },
      { label: 'Gestion de stock avancée', included: false },
      { label: 'Pipeline CRM', included: false },
      { label: 'Statistiques avancées', included: false },
      { label: 'API & Intégrations', included: false },
      { label: 'Support prioritaire', included: false },
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '89',
    period: '/mois',
    desc: "Pour les entreprises qui veulent tout : IA, CRM et automatisations avancées.",
    badge: '⭐ Le plus populaire',
    cta: 'Essayer Pro gratuitement',
    features: [
      { label: 'Dossiers clients illimités', included: true },
      { label: 'Devis & Facturation', included: true },
      { label: 'Signature électronique', included: true },
      { label: 'Planning avancé + équipe', included: true },
      { label: 'Utilisateurs illimités', included: true },
      { label: 'Support email + chat', included: true },
      { label: 'IA Photo-réalisme (200 générations/mois)', included: true },
      { label: 'Gestion de stock avancée', included: true },
      { label: 'Pipeline CRM visuel', included: true },
      { label: 'Statistiques & Tableaux de bord', included: true },
      { label: 'API & Intégrations', included: false },
      { label: 'Support prioritaire', included: false },
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Sur devis',
    period: '',
    desc: 'Pour les grandes structures, réseaux de franchisés et groupements professionnels.',
    badge: null,
    cta: 'Contacter les ventes',
    ctaHref: 'mailto:enterprise@avra.fr',
    features: [
      { label: 'Tout du plan Pro', included: true },
      { label: 'IA illimitée', included: true },
      { label: 'Multi-agences / franchises', included: true },
      { label: 'SSO & SAML', included: true },
      { label: 'SLA garanti 99.9%', included: true },
      { label: 'Onboarding dédié', included: true },
      { label: 'API complète & Webhooks', included: true },
      { label: 'Support prioritaire 24/7', included: true },
      { label: 'Formation sur site', included: true },
      { label: 'Personnalisation sur mesure', included: true },
      { label: 'Conformité RGPD renforcée', included: true },
      { label: 'Compte Manager dédié', included: true },
    ],
    highlighted: false,
  },
];

const comparison = [
  { feature: 'Dossiers clients', starter: 'Illimités', pro: 'Illimités', enterprise: 'Illimités' },
  { feature: 'Utilisateurs', starter: '3', pro: 'Illimités', enterprise: 'Illimités' },
  { feature: 'Facturation', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Signature électronique', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'IA Photo-réalisme', starter: '✗', pro: '200/mois', enterprise: 'Illimitée' },
  { feature: 'Pipeline CRM', starter: '✗', pro: '✓', enterprise: '✓' },
  { feature: 'Gestion de stock', starter: 'Basique', pro: 'Avancée', enterprise: 'Avancée + Multi-dépôts' },
  { feature: 'Statistiques', starter: 'Basiques', pro: 'Avancées', enterprise: 'Personnalisées' },
  { feature: 'Support', starter: 'Email', pro: 'Email + Chat', enterprise: '24/7 + Manager dédié' },
  { feature: 'API', starter: '✗', pro: '✗', enterprise: '✓' },
];

export default function TarifsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section style={{
        minHeight: '50vh', display: 'flex', alignItems: 'center',
        paddingTop: '76px', background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 5%' }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Tarifs transparents</div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            Un prix juste, sans mauvaises surprises
          </h1>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.15rem', maxWidth: 560, margin: '0 auto 2rem' }}>
            Commencez gratuitement pendant 14 jours. Aucune carte bancaire requise. Changez de plan à tout moment.
          </p>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,.1)', borderRadius: 40, padding: '6px', gap: '4px' }}>
            <button style={{ padding: '8px 20px', borderRadius: 36, background: 'var(--gold)', color: 'var(--green-deep)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.88rem' }}>Mensuel</button>
            <button style={{ padding: '8px 20px', borderRadius: 36, background: 'transparent', color: 'rgba(255,255,255,.75)', border: 'none', cursor: 'pointer', fontSize: '.88rem' }}>Annuel (−20%)</button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px', alignItems: 'start' }}>
            {plans.map((plan) => (
              <div key={plan.name} className="reveal" style={{
                background: plan.highlighted ? 'var(--green-deep)' : 'var(--white)',
                borderRadius: 20, padding: '2.5rem',
                border: plan.highlighted ? '2px solid var(--gold)' : '1px solid var(--border)',
                boxShadow: plan.highlighted ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
                transform: plan.highlighted ? 'scale(1.03)' : 'none',
                position: 'relative',
              }}>
                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg,var(--gold-light),var(--gold))',
                    color: 'var(--green-deep)', padding: '6px 20px', borderRadius: 20,
                    fontSize: '.8rem', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: plan.highlighted ? 'var(--white)' : 'var(--text)', marginBottom: '.5rem' }}>{plan.name}</h3>
                  <p style={{ fontSize: '.9rem', color: plan.highlighted ? 'rgba(255,255,255,.6)' : 'var(--text-muted)', marginBottom: '1.5rem' }}>{plan.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    {plan.period ? (
                      <>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: plan.highlighted ? 'var(--gold)' : 'var(--text)' }}>{plan.price}€</span>
                        <span style={{ color: plan.highlighted ? 'rgba(255,255,255,.5)' : 'var(--text-muted)', fontSize: '1rem' }}>{plan.period}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: plan.highlighted ? 'var(--gold)' : 'var(--text)' }}>{plan.price}</span>
                    )}
                  </div>
                </div>

                <a href={plan.ctaHref || '/register'} style={{ display: 'block', marginBottom: '2rem' }}>
                  <button style={{
                    width: '100%', padding: '14px', borderRadius: 12, cursor: 'pointer',
                    background: plan.highlighted ? 'linear-gradient(135deg,var(--gold-light),var(--gold))' : 'transparent',
                    color: plan.highlighted ? 'var(--green-deep)' : 'var(--green)',
                    border: plan.highlighted ? 'none' : '1.5px solid var(--border)',
                    fontWeight: 600, fontSize: '.95rem',
                    transition: 'var(--transition)',
                  }}>
                    {plan.cta}
                  </button>
                </a>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((f) => (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        background: f.included ? (plan.highlighted ? 'rgba(201,169,110,.2)' : 'rgba(74,99,80,.12)') : 'transparent',
                        border: `1.5px solid ${f.included ? (plan.highlighted ? 'var(--gold)' : 'var(--green-light)') : 'rgba(0,0,0,.15)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.6rem',
                        color: f.included ? (plan.highlighted ? 'var(--gold)' : 'var(--green-light)') : 'rgba(0,0,0,.25)',
                      }}>
                        {f.included ? '✓' : '✗'}
                      </div>
                      <span style={{
                        fontSize: '.88rem',
                        color: f.included
                          ? (plan.highlighted ? 'rgba(255,255,255,.9)' : 'var(--text)')
                          : (plan.highlighted ? 'rgba(255,255,255,.25)' : 'var(--text-muted)'),
                        textDecoration: f.included ? 'none' : 'none',
                        opacity: f.included ? 1 : 0.5,
                      }}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section" style={{ background: 'var(--cream-light)' }}>
        <div className="container">
          <div className="section-centered" style={{ marginBottom: '3rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Comparatif détaillé</div>
            <h2 className="section-title">Toutes les fonctionnalités en détail</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '16px 20px', background: 'var(--green-deep)', color: 'var(--white)', borderRadius: '12px 0 0 0', fontSize: '.9rem' }}>Fonctionnalité</th>
                  {['Starter', 'Pro', 'Enterprise'].map((p, i, arr) => (
                    <th key={p} style={{
                      textAlign: 'center', padding: '16px 20px',
                      background: p === 'Pro' ? 'var(--gold)' : 'var(--green-deep)',
                      color: p === 'Pro' ? 'var(--green-deep)' : 'var(--white)',
                      borderRadius: i === arr.length - 1 ? '0 12px 0 0' : '0',
                      fontSize: '.9rem', fontWeight: 700,
                    }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} style={{ background: i % 2 === 0 ? 'var(--white)' : 'var(--cream-light)' }}>
                    <td style={{ padding: '14px 20px', fontSize: '.9rem', color: 'var(--text)', fontWeight: 500 }}>{row.feature}</td>
                    {[row.starter, row.pro, row.enterprise].map((val, j) => (
                      <td key={j} style={{
                        textAlign: 'center', padding: '14px 20px', fontSize: '.88rem',
                        color: val === '✗' ? 'var(--text-muted)' : (val === '✓' ? 'var(--green-light)' : 'var(--text)'),
                        fontWeight: val === '✓' || val === '✗' ? 700 : 400,
                      }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Garanties */}
      <section className="section section-centered">
        <div className="container" style={{ maxWidth: 800 }}>
          <h2 style={{ marginBottom: '3rem' }}>Toutes nos garanties</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '24px' }}>
            {[
              { icon: '🆓', label: '14 jours gratuits' },
              { icon: '💳', label: 'Sans carte bancaire' },
              { icon: '🔓', label: 'Sans engagement' },
              { icon: '📤', label: 'Données exportables' },
              { icon: '🔒', label: 'Hébergement France' },
              { icon: '💬', label: 'Support inclus' },
            ].map((g) => (
              <div key={g.label} className="card reveal" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>{g.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--text)' }}>{g.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section-centered" style={{ background: 'linear-gradient(135deg,var(--green-deep),var(--green))' }}>
        <div className="container">
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>Commencez gratuitement dès maintenant</h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 500, margin: '0 auto 2.5rem' }}>
            14 jours d&apos;accès complet au plan Pro. Aucune carte bancaire. Aucun engagement.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register"><button className="btn-primary">Démarrer l&apos;essai gratuit →</button></a>
            <a href="mailto:enterprise@avra.fr"><button className="btn-secondary">Parler à un expert</button></a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
