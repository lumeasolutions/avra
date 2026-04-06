import type { Metadata } from 'next';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Métiers — AVRA adapté à chaque professionnel de l\'agencement',
  description:
    "AVRA s'adapte au quotidien des cuisinistes, menuisiers, architectes d'intérieur et agenceurs. Découvrez les fonctionnalités spécifiques à votre métier.",
  alternates: { canonical: 'https://avra.fr/metiers' },
  openGraph: {
    title: 'Métiers — AVRA pour chaque professionnel de l\'agencement',
    description: "Cuisiniste, menuisier, architecte d'intérieur, agenceur : AVRA s'adapte à votre métier.",
    url: 'https://avra.fr/metiers',
  },
};

const metiers = [
  {
    id: 'cuisiniste',
    icon: '🍳',
    title: 'Cuisiniste',
    subtitle: 'De la conception à la pose',
    tagline: 'Le logiciel conçu pour votre atelier cuisine',
    desc: "En tant que cuisiniste, vous jonchez entre devis sur mesure, plans de cuisine complexes, commandes fournisseurs et poses chez vos clients. AVRA centralise tout ça dans une interface pensée pour votre réalité.",
    features: [
      { icon: '📐', title: 'Plans & nomenclatures', desc: 'Associez vos plans de cuisine à chaque dossier. Gérez les nomenclatures de composants directement dans l\'app.' },
      { icon: '🏭', title: 'Commandes fournisseurs', desc: 'Passez vos commandes auprès de vos fournisseurs cuisine et suivez les délais de livraison en temps réel.' },
      { icon: '📅', title: 'Planning de pose', desc: 'Planifiez les poses avec vos installateurs. Gérez les contraintes de chantier et les imprévus facilement.' },
      { icon: '🤖', title: 'Rendus IA cuisine', desc: 'Générez des rendus photo-réalistes de cuisines équipées pour vos présentations clients. Vendez avant de fabriquer.' },
    ],
    stats: [{ val: '+35%', label: 'CA moyen après 6 mois' }, { val: '-6h', label: 'Tâches admin/semaine' }, { val: '92%', label: 'Taux renouvellement' }],
    testimonial: { text: "AVRA m'a permis de passer de 8 à 15 cuisines par mois sans embaucher. Le gain de temps sur l'administratif est énorme.", author: 'Pierre M.', role: 'Cuisiniste indépendant, Bordeaux' },
    color: 'var(--gold)',
    bg: 'var(--green-deep)',
  },
  {
    id: 'menuisier',
    icon: '🪚',
    title: 'Menuisier',
    subtitle: 'Meubles, agencements & sur-mesure',
    tagline: 'Gérez votre atelier et vos chantiers depuis une seule app',
    desc: "Menuisier, vous créez des meubles sur mesure, des agencements complets, des escaliers ou des portes. Vos projets sont complexes, votre planning est serré. AVRA vous libère du temps pour créer.",
    features: [
      { icon: '📋', title: 'Dossiers chantier', desc: 'Centralisez plans, photos de chantier, bons de livraison et PV de réception par projet.' },
      { icon: '🪵', title: 'Gestion matières premières', desc: 'Suivez votre stock de bois, quincaillerie et matériaux. Évitez les ruptures sur chantier.' },
      { icon: '⏱️', title: 'Suivi heures & marges', desc: 'Enregistrez les heures passées par projet et comparez au devis initial. Maîtrisez votre rentabilité.' },
      { icon: '📸', title: 'Book photos & portfolio', desc: 'Constituez votre portfolio de réalisations directement dans AVRA pour alimenter vos présentations clients.' },
    ],
    stats: [{ val: '+28%', label: 'Chiffre d\'affaires' }, { val: '15min', label: 'Pour créer un devis' }, { val: '4.9/5', label: 'Satisfaction clients' }],
    testimonial: { text: "La gestion de stock intégrée m'a évité 3 arrêts de chantier faute de matériaux. Et le suivi des marges m'a révélé que je sous-facturais certains travaux.", author: 'Julien T.', role: 'Menuisier-agenceur, Nantes' },
    color: 'var(--green-light)',
    bg: 'var(--cream-light)',
  },
  {
    id: 'architecte',
    icon: '🏛️',
    title: "Architecte d'intérieur",
    subtitle: 'Design, coordination & suivi de projet',
    tagline: "La plateforme de l'architecte d'intérieur moderne",
    desc: "Vous orchestrez des projets complexes avec plusieurs corps de métier, gérez les attentes exigeantes de vos clients et suivez des budgets serrés. AVRA devient votre outil de pilotage central.",
    features: [
      { icon: '🎨', title: 'Moodboards & rendus IA', desc: "Créez des planches d'ambiance et générez des rendus IA directement dans l'app. Impressionnez vos clients dès le premier rendez-vous." },
      { icon: '💰', title: 'Suivi de budget', desc: 'Suivez en temps réel les dépenses vs budget prévu par poste. Anticipez les dépassements avant qu\'ils arrivent.' },
      { icon: '🤝', title: 'Coordination artisans', desc: "Centralisez les devis et plannings de chaque intervenant. Coordinateur-né, AVRA gère les dépendances entre corps de métier." },
      { icon: '📄', title: 'Contrats & honoraires', desc: 'Gérez vos contrats de maîtrise d\'œuvre, vos notes d\'honoraires et votre facturation au pourcentage ou au forfait.' },
    ],
    stats: [{ val: '+45%', label: 'Projets gérés simultanément' }, { val: '100%', label: 'Clients satisfaits' }, { val: '-40%', label: 'Temps coordination' }],
    testimonial: { text: "L'IA photo-réalisme a complètement changé mes présentations clients. Je montre des rendus bluffants en réunion et le taux de signature a explosé.", author: 'Amélie F.', role: "Architecte d'intérieur, Paris" },
    color: 'var(--gold)',
    bg: 'var(--green-deep)',
  },
  {
    id: 'agenceur',
    icon: '🏢',
    title: 'Agenceur',
    subtitle: 'Espaces commerciaux & retail',
    tagline: 'La solution pour les projets d\'agencement à grande échelle',
    desc: "Vous aménagez des commerces, des bureaux, des espaces retail. Vos projets impliquent de nombreux intervenants, des délais serrés et des clients qui exigent un reporting régulier. AVRA est taillé pour ça.",
    features: [
      { icon: '🗺️', title: 'Gestion multi-sites', desc: 'Suivez plusieurs chantiers en simultané sur une même interface. Vue globale ou zoom par projet, à vous de choisir.' },
      { icon: '📊', title: 'Reporting client', desc: "Générez des rapports d'avancement professionnels pour vos clients corporate. Tableaux de bord partageables en 1 clic." },
      { icon: '🔗', title: 'Portail partenaires', desc: "Donnez accès à vos sous-traitants et artisans à leur partie du projet via un portail dédié, sans leur donner accès à tout." },
      { icon: '📋', title: 'Appels d\'offres', desc: 'Répondez rapidement aux appels d\'offres avec des dossiers de présentation générés automatiquement depuis vos réalisations.' },
    ],
    stats: [{ val: '3×', label: 'Plus de projets gérés' }, { val: '0', label: 'Réunion de coordination évitée' }, { val: '99%', label: 'Livrés dans les délais' }],
    testimonial: { text: "Avec AVRA, on a pu doubler notre capacité de projets simultanés sans embaucher de chef de projet supplémentaire. Le ROI a été immédiat.", author: 'Nathalie P.', role: 'Agenceur, Marseille' },
    color: 'var(--green-light)',
    bg: 'var(--cream-light)',
  },
];

export default function MetiersPage() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section style={{
        minHeight: '55vh', display: 'flex', alignItems: 'center',
        paddingTop: '76px', background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 5%' }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Conçu pour votre métier</div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            AVRA s&apos;adapte à chaque professionnel de l&apos;agencement
          </h1>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.15rem', maxWidth: 600, margin: '0 auto 2rem' }}>
            Pas un logiciel généraliste adapté à la va-vite. AVRA a été pensé avec des professionnels de chaque métier pour répondre à leurs vrais besoins.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {metiers.map((m) => (
              <a key={m.id} href={`#${m.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', background: 'rgba(255,255,255,.1)',
                borderRadius: 40, border: '1px solid rgba(255,255,255,.2)',
                color: 'rgba(255,255,255,.9)', fontSize: '.9rem', fontWeight: 500,
                transition: 'var(--transition)',
              }}>
                {m.icon} {m.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Metiers sections */}
      {metiers.map((m, i) => {
        const isDark = m.bg === 'var(--green-deep)';
        return (
          <div key={m.id} id={m.id}>
            {/* Header du métier */}
            <section style={{ padding: '80px 5% 0', background: isDark ? 'var(--green-deep)' : 'var(--white)' }}>
              <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
                  <div className="reveal" style={{ order: i % 2 === 0 ? 1 : 2 }}>
                    <div className="section-label">{m.icon} {m.subtitle}</div>
                    <h2 style={{ color: isDark ? 'var(--white)' : 'var(--text)', marginBottom: '1rem' }}>{m.tagline}</h2>
                    <p style={{ color: isDark ? 'rgba(255,255,255,.75)' : 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem' }}>{m.desc}</p>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '2rem' }}>
                      {m.stats.map((s) => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)' }}>{s.val}</div>
                          <div style={{ fontSize: '.8rem', color: isDark ? 'rgba(255,255,255,.5)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <a href="/register"><button className={isDark ? 'btn-primary' : 'btn-outline'}>{`Essayer pour les ${m.title}s →`}</button></a>
                  </div>

                  {/* Testimonial card */}
                  <div className="reveal" style={{ order: i % 2 === 0 ? 2 : 1 }}>
                    <div style={{
                      background: isDark ? 'rgba(255,255,255,.05)' : 'var(--cream-light)',
                      borderRadius: 20, padding: '2rem',
                      border: `1px solid ${isDark ? 'rgba(201,169,110,.2)' : 'var(--border)'}`,
                    }}>
                      <div style={{ fontSize: '2rem', color: 'var(--gold)', marginBottom: '1rem' }}>&ldquo;</div>
                      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: isDark ? 'rgba(255,255,255,.9)' : 'var(--text)', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{m.testimonial.text}</p>
                      <div style={{ fontSize: '.88rem', color: isDark ? 'var(--gold)' : 'var(--text-muted)', fontWeight: 600 }}>{m.testimonial.author}</div>
                      <div style={{ fontSize: '.8rem', color: isDark ? 'rgba(255,255,255,.4)' : 'var(--text-muted)' }}>{m.testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Features du métier */}
            <section style={{ padding: '60px 5% 80px', background: isDark ? 'var(--green-deep)' : 'var(--white)' }}>
              <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px' }}>
                  {m.features.map((f) => (
                    <div key={f.title} className="reveal" style={{
                      padding: '1.5rem', borderRadius: 16,
                      background: isDark ? 'rgba(255,255,255,.05)' : 'var(--cream-light)',
                      border: `1px solid ${isDark ? 'rgba(201,169,110,.12)' : 'var(--border)'}`,
                    }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '.75rem' }}>{f.icon}</div>
                      <h4 style={{ color: isDark ? 'var(--white)' : 'var(--text)', marginBottom: '.5rem', fontSize: '1rem' }}>{f.title}</h4>
                      <p style={{ fontSize: '.88rem', color: isDark ? 'rgba(255,255,255,.6)' : 'var(--text-muted)', margin: 0 }}>{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Separator */}
            {i < metiers.length - 1 && (
              <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,var(--gold),transparent)' }} />
            )}
          </div>
        );
      })}

      {/* CTA final */}
      <section className="section section-centered" style={{ background: 'linear-gradient(135deg,var(--green-deep),var(--green))' }}>
        <div className="container">
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Votre métier, notre priorité</div>
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>Quel que soit votre métier, AVRA est fait pour vous</h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 540, margin: '0 auto 2.5rem' }}>
            Rejoignez les 2 400+ professionnels de l&apos;agencement qui ont choisi AVRA pour digitaliser leur activité.
            14 jours d&apos;essai gratuit, sans carte bancaire.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register"><button className="btn-primary">Commencer l&apos;essai gratuit →</button></a>
            <a href="/temoignages"><button className="btn-secondary">Lire les témoignages</button></a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
