import type { Metadata } from 'next';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: "AVRA — ERP + IA pour les professionnels de l'agencement",
  description:
    "AVRA est l'ERP et assistant IA N°1 pour les cuisinistes, menuisiers, architectes d'intérieur. Gérez vos projets sans friction avec facturation, planning, dossiers et rendus IA.",
  alternates: { canonical: 'https://avra.fr/accueil' },
  openGraph: {
    title: "AVRA — ERP + IA pour les professionnels de l'agencement",
    description:
      "Gérez vos projets d'agencement sans friction. Dossiers, facturation, planning, IA, stock et signature électronique.",
    url: 'https://avra.fr/accueil',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AVRA',
  description: "ERP et assistant IA pour les professionnels de l'agencement intérieur",
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', priceCurrency: 'EUR', price: '49' },
  author: { '@type': 'Organization', name: 'Luméa', url: 'https://avra.fr' },
};

export default function AccueilPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <ScrollReveal />

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: '76px', overflow: 'hidden',
        background: '#1a2820',
      }}>
        {/* Background logo */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url(/nouveaulogoA.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.18,
        }} />
        {/* Overlay gradient pour lisibilité */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(135deg, rgba(26,40,32,0.85) 0%, rgba(48,64,53,0.7) 100%)',
        }} />

        {/* ── Bannière logos ── */}
        <div style={{
          position: 'relative', zIndex: 2, width: '100%',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(201,169,110,0.12) 50%, rgba(0,0,0,0.45) 100%)',
          borderBottom: '1px solid rgba(201,169,110,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '48px',
          padding: '18px 5%',
        }}>
          <img src="/nouveaulogoA.png" alt="AVRA Logo" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
          <div style={{ width: 1, height: 48, background: 'rgba(201,169,110,0.35)' }} />
          <img src="/nouveaulogochouette.png" alt="AVRA Chouette" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
        </div>

        <div className="hero-grid" style={{
          position: 'relative', zIndex: 2,
          maxWidth: 1200, margin: '0 auto', padding: '60px 5%',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px',
          alignItems: 'center', width: '100%',
        }}>
          <div>
            <div className="section-label">N°1 de l&apos;agencement intérieur</div>
            <h1 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: 'clamp(2.2rem,4vw,3.6rem)', fontFamily: 'var(--font-display, "Playfair Display", Georgia, serif)', lineHeight: 1.15 }}>Le logiciel qui libère les pros de l&apos;agencement</h1>
            <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.2rem', marginBottom: '2rem', maxWidth: 500, lineHeight: 1.6 }}>
              Dossiers clients, facturation, planning, stock et IA photo-réalisme —
              tout en une seule app pensée pour les cuisinistes, menuisiers et architectes d&apos;intérieur.
            </p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <a href="/comment-ca-marche"><button className="btn-primary">Demander une démo →</button></a>
              <a href="/comment-ca-marche"><button className="btn-secondary">Voir comment ça marche</button></a>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              {[
                ['2 400+', 'Professionnels'],
                ['98%', 'Satisfaction'],
                ['+40%', 'Taux de conversion'],
              ].map(([num, label]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{num}</div>
                  <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(255,255,255,.1), rgba(201,169,110,.05))',
            borderRadius: 20, padding: '2rem',
            border: '1px solid rgba(201,169,110,.2)',
            backdropFilter: 'blur(20px)',
          }}>
            <div className="mockup-header" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
              <div style={{ flex: 1, height: 28, background: 'rgba(255,255,255,.08)', borderRadius: 6, marginLeft: 8 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Dossiers actifs', val: '47', delta: '+12%', color: '#4a6350' },
                { label: 'CA du mois', val: '84 200 €', delta: '+18%', color: '#c9a96e' },
                { label: 'Devis en attente', val: '12', delta: '-3', color: '#304035' },
                { label: 'Rendus IA générés', val: '234', delta: 'cette semaine', color: '#3d5244' },
              ].map((card) => (
                <div key={card.label} style={{
                  background: 'rgba(255,255,255,.07)', borderRadius: 12,
                  padding: '16px', border: '1px solid rgba(201,169,110,.12)',
                }}>
                  <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>{card.val}</div>
                  <div style={{ fontSize: '.78rem', color: 'var(--gold)', marginTop: 4 }}>{card.delta}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '14px', border: '1px solid rgba(201,169,110,.1)' }}>
              <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>Pipeline clients</div>
              {[
                { name: 'Cuisine Dubois', stage: 'Devis envoyé', pct: 60 },
                { name: 'Dressing Martin', stage: 'En fabrication', pct: 80 },
                { name: 'Salon Perret', stage: 'Pose planifiée', pct: 95 },
              ].map((p) => (
                <div key={p.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.75)' }}>{p.name}</span>
                    <span style={{ fontSize: '.75rem', color: 'var(--gold)' }}>{p.stage}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: 'linear-gradient(90deg,var(--gold-dark),var(--gold))', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAND ── */}
      <section style={{ padding: '32px 5%', background: 'var(--cream-dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Ils font confiance à AVRA
          </span>
          {['Cuisinistes', 'Menuisiers', 'Architectes d\'intérieur', 'Agenceurs', 'Décorateurs'].map((m) => (
            <div key={m} style={{
              padding: '8px 20px', background: 'var(--white)', borderRadius: 8,
              border: '1px solid var(--border)', fontSize: '.9rem', color: 'var(--text)',
              fontWeight: 500, boxShadow: 'var(--shadow-sm)',
            }}>{m}</div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="section">
        <div className="container">
          <div className="section-centered" style={{ marginBottom: '4rem' }}>
            <div className="section-label">Fonctionnalités</div>
            <h2 className="section-title">Tout ce dont vous avez besoin, rien de plus</h2>
            <p className="section-subtitle">AVRA remplace 6 outils différents par une seule interface pensée pour votre métier.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '24px' }}>
            {[
              {
                icon: '📁',
                title: 'Dossiers clients centralisés',
                desc: 'Toutes les infos, documents, photos et échanges d\'un dossier en un seul endroit. Fini les fichiers éparpillés.',
                badge: 'Essentiel',
              },
              {
                icon: '🧾',
                title: 'Facturation intelligente',
                desc: 'Devis, acomptes, factures et avoirs générés en 2 clics. Conformes à la réglementation française.',
                badge: 'Populaire',
              },
              {
                icon: '🤖',
                title: 'IA Photo-réalisme',
                desc: 'Générez des rendus photo-réalistes de cuisines et d\'aménagements directement depuis vos plans et descriptions.',
                badge: 'IA',
              },
              {
                icon: '📅',
                title: 'Planning & chantiers',
                desc: 'Planifiez poses, livraisons et interventions avec un calendrier visuel partagé avec votre équipe.',
                badge: 'Pro',
              },
              {
                icon: '📦',
                title: 'Gestion de stock',
                desc: 'Suivez vos matériaux, composants et commandes fournisseurs. Alertes de rupture automatiques.',
                badge: 'Pro',
              },
              {
                icon: '✍️',
                title: 'Signature électronique',
                desc: 'Faites signer vos devis et contrats en ligne en quelques secondes. Juridiquement valable.',
                badge: 'Inclus',
              },
            ].map((f) => (
              <div key={f.title} className="card reveal">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2rem' }}>{f.icon}</span>
                  <span className="badge badge-gold">{f.badge}</span>
                </div>
                <h3 style={{ marginBottom: '.75rem', fontSize: '1.15rem' }}>{f.title}</h3>
                <p style={{ fontSize: '.95rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IA SECTION ── */}
      <section className="section" style={{ background: 'var(--green-deep)' }}>
        <div className="container grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div style={{ color: 'var(--white)' }} className="reveal">
            <div className="section-label">Intelligence Artificielle</div>
            <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>L&apos;IA qui transforme vos projets</h2>
            <p style={{ color: 'rgba(255,255,255,.75)', marginBottom: '2rem' }}>
              Décrivez votre projet en quelques mots, et AVRA génère des rendus photo-réalistes en quelques secondes.
              Présentez des visuels bluffants à vos clients avant même de commencer.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {[
                'Rendus FLUX Pro ultra-réalistes',
                'Chat IA contextuel sur chaque dossier',
                'Suggestions automatiques de matériaux',
                'Export HD pour présentations clients',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(201,169,110,.2)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', color: 'var(--gold)', flexShrink: 0 }}>✓</div>
                  <span style={{ color: 'rgba(255,255,255,.85)', fontSize: '.95rem' }}>{item}</span>
                </div>
              ))}
            </div>
            <a href="/fonctionnalites#ia"><button className="btn-primary">Découvrir l&apos;IA AVRA →</button></a>
          </div>
          <div className="reveal" style={{
            background: 'linear-gradient(135deg,rgba(201,169,110,.12),rgba(48,64,53,.5))',
            borderRadius: 20, padding: '2rem', border: '1px solid rgba(201,169,110,.2)',
          }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(201,169,110,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
              <div>
                <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '.9rem' }}>Assistant AVRA</div>
                <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.75rem' }}>Basé sur Claude AI</div>
              </div>
            </div>
            {[
              { who: 'user', text: 'Génère un rendu d\'une cuisine moderne blanc et bois avec îlot central.' },
              { who: 'ai', text: 'Rendu en cours de génération... ✨ Image créée en 4 secondes. Souhaitez-vous une version avec éclairage tamisé ?' },
            ].map((msg, i) => (
              <div key={i} style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: '12px',
                background: msg.who === 'user' ? 'rgba(255,255,255,.07)' : 'rgba(201,169,110,.12)',
                border: `1px solid ${msg.who === 'user' ? 'rgba(255,255,255,.1)' : 'rgba(201,169,110,.2)'}`,
                textAlign: msg.who === 'user' ? 'right' : 'left',
              }}>
                <p style={{ color: 'rgba(255,255,255,.9)', fontSize: '.88rem', margin: 0 }}>{msg.text}</p>
              </div>
            ))}
            <div style={{ height: 80, background: 'rgba(201,169,110,.08)', borderRadius: 12, border: '1px dashed rgba(201,169,110,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'rgba(201,169,110,.6)', fontSize: '.85rem' }}>📸 Rendu photo-réaliste généré</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PIPELINE CRM ── */}
      <section className="section" style={{ background: 'var(--cream-light)' }}>
        <div className="container grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div className="reveal" style={{
            background: 'var(--white)', borderRadius: 20, padding: '2rem',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--text)' }}>Pipeline Projets</div>
            {[
              { stage: '📋 Prospect', count: 8, color: '#6b7c70' },
              { stage: '💬 Devis envoyé', count: 12, color: '#c9a96e' },
              { stage: '✅ Accepté', count: 6, color: '#4a6350' },
              { stage: '🔨 En cours', count: 9, color: '#304035' },
              { stage: '🎉 Livré', count: 47, color: '#1e2b22' },
            ].map((s) => (
              <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: '0 0 140px', fontSize: '.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.stage}</div>
                <div style={{ flex: 1, height: 24, background: 'var(--cream-dark)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, s.count * 2)}%`,
                    background: s.color, borderRadius: 6, transition: 'width .8s ease',
                  }} />
                </div>
                <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text)', width: 24, textAlign: 'right' }}>{s.count}</span>
              </div>
            ))}
          </div>
          <div className="reveal">
            <div className="section-label">CRM intégré</div>
            <h2 className="section-title">Visualisez votre pipeline d&apos;un coup d&apos;œil</h2>
            <p style={{ marginBottom: '2rem' }}>
              De la première prise de contact à la livraison finale, suivez chaque projet en temps réel.
              Relances automatiques, rappels et historique complet de chaque client.
            </p>
            <a href="/fonctionnalites#crm"><button className="btn-outline">En savoir plus sur le CRM →</button></a>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="section section-centered">
        <div className="container" style={{ maxWidth: 800 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--gold)' }}>&ldquo;</div>
          <blockquote style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text)', marginBottom: '2rem', lineHeight: 1.5 }}>
            AVRA a transformé notre façon de travailler. On a gagné 8 heures par semaine sur l&apos;administratif,
            et nos clients adorent les rendus IA — ça fait vraiment la différence pour décrocher les chantiers.
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--green-mid),var(--green-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', fontWeight: 700, fontSize: '1.1rem' }}>SL</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Sophie L.</div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Cuisiniste — Lyon &bull; 12 ans d&apos;expérience</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="section section-centered" style={{ background: 'linear-gradient(135deg,var(--green-deep),var(--green))' }}>
        <div className="container">
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Prêt à transformer votre activité ?</div>
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>Prêt à transformer votre activité ?</h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 560, margin: '0 auto 2.5rem' }}>
            Découvrez comment AVRA simplifie votre quotidien. Rejoignez les 2 400+ professionnels qui font confiance à AVRA.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/comment-ca-marche"><button className="btn-primary">Demander une démo →</button></a>
            <a href="/tarifs"><button className="btn-secondary">Voir les tarifs</button></a>
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '.85rem', color: 'rgba(255,255,255,.4)' }}>
            ✓ Sans engagement &nbsp;&nbsp; ✓ Configuration en 5 min &nbsp;&nbsp; ✓ Support inclus
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
