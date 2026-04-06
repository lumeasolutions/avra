import type { Metadata } from 'next';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

export const metadata: Metadata = {
  title: "Témoignages — Ce que disent nos 2 400 clients AVRA",
  description:
    "Découvrez les retours d'expérience de cuisinistes, menuisiers et architectes d'intérieur qui utilisent AVRA au quotidien. 98% de satisfaction, +8h gagnées par semaine en moyenne.",
  alternates: { canonical: 'https://avra.fr/temoignages' },
  openGraph: {
    title: "Témoignages AVRA — 2 400 professionnels satisfaits",
    description: "98% de satisfaction. Découvrez pourquoi les pros de l'agencement choisissent AVRA.",
    url: 'https://avra.fr/temoignages',
  },
};

const testimonials = [
  {
    name: 'Sophie Lemaire',
    initials: 'SL',
    role: 'Cuisiniste',
    location: 'Lyon',
    exp: '12 ans',
    stars: 5,
    quote: "AVRA a transformé notre façon de travailler. On a gagné 8 heures par semaine sur l'administratif, et nos clients adorent les rendus IA — ça fait vraiment la différence pour décrocher les chantiers.",
    metric: '+8h/semaine économisées',
    color: 'var(--green-mid)',
  },
  {
    name: 'Marc Dubois',
    initials: 'MD',
    role: 'Menuisier-agenceur',
    location: 'Bordeaux',
    exp: '8 ans',
    stars: 5,
    quote: "J'ai essayé 4 logiciels avant AVRA. C'est le seul qui comprend vraiment les besoins d'un menuisier. Le pipeline CRM et la gestion de stock sont parfaits pour mon activité.",
    metric: '4 logiciels remplacés',
    color: 'var(--gold-dark)',
  },
  {
    name: 'Amélie Fontaine',
    initials: 'AF',
    role: "Architecte d'intérieur",
    location: 'Paris',
    exp: '6 ans',
    stars: 5,
    quote: "L'IA photo-réalisme a changé la donne pour mes présentations clients. Je montre les rendus en rendez-vous et le taux de signature a augmenté de 40%. Impensable avant AVRA.",
    metric: '+40% de taux de signature',
    color: 'var(--green-light)',
  },
  {
    name: 'Thomas Renard',
    initials: 'TR',
    role: 'Cuisiniste',
    location: 'Toulouse',
    exp: '15 ans',
    stars: 5,
    quote: "La facturation automatique m'a sauvé la vie. Avant je passais mes soirées sur les devis et factures. Maintenant c'est 10 minutes par jour. Je peux enfin me concentrer sur mes clients.",
    metric: '-3h de compta/semaine',
    color: 'var(--green)',
  },
  {
    name: 'Nathalie Petit',
    initials: 'NP',
    role: 'Agenceur',
    location: 'Marseille',
    exp: '10 ans',
    stars: 5,
    quote: "Le planning partagé avec mon équipe de 4 personnes, c'est une révolution. Plus de double-réservations, plus de confusion. Tout le monde sait où on en est en temps réel.",
    metric: '0 conflit de planning depuis 8 mois',
    color: 'var(--green-mid)',
  },
  {
    name: 'Pierre Moreau',
    initials: 'PM',
    role: 'Menuisier',
    location: 'Nantes',
    exp: '20 ans',
    stars: 5,
    quote: "Je suis de la vieille école — j'avais peur du numérique. Mais AVRA est tellement simple que je l'ai appris en une journée. Ma secrétaire et moi travaillons dessus depuis 2 ans maintenant.",
    metric: 'Prise en main en 1 journée',
    color: 'var(--gold-dark)',
  },
  {
    name: 'Claire Bernard',
    initials: 'CB',
    role: "Architecte d'intérieur",
    location: 'Lille',
    exp: '4 ans',
    stars: 5,
    quote: "La signature électronique intégrée, c'est mon outil préféré. Mes clients signent depuis leur téléphone le jour même du RDV. Le délai entre devis et accord est passé de 2 semaines à 2 jours.",
    metric: '2 semaines → 2 jours de délai signature',
    color: 'var(--green-light)',
  },
  {
    name: 'Julien Lefort',
    initials: 'JL',
    role: 'Cuisiniste',
    location: 'Strasbourg',
    exp: '9 ans',
    stars: 5,
    quote: "Le support AVRA est exceptionnel. À chaque question, j'ai une réponse en moins d'une heure. Ce niveau de service, je ne l'ai jamais vu chez un éditeur de logiciel.",
    metric: "Support réactif < 1h",
    color: 'var(--green)',
  },
  {
    name: 'Isabelle Roux',
    initials: 'IR',
    role: 'Agenceur',
    location: 'Nice',
    exp: '7 ans',
    stars: 5,
    quote: "Le tableau de bord me donne une vision claire de mon activité que je n'avais jamais eue. Je sais exactement où j'en suis, ce qui rentre, ce qui est en retard. Je pilote mon entreprise.",
    metric: 'Visibilité à 360° sur l\'activité',
    color: 'var(--gold-dark)',
  },
];

const stats = [
  { val: '2 400+', label: 'Professionnels actifs' },
  { val: '98%', label: 'Taux de satisfaction' },
  { val: '8h', label: 'Gagnées/semaine en moyenne' },
  { val: '14 j', label: 'Essai gratuit sans CB' },
];

export default function TemoignagesPage() {
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
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Ils nous font confiance</div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            2 400 professionnels ont choisi AVRA
          </h1>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.15rem', maxWidth: 560, margin: '0 auto 2rem' }}>
            Cuisinistes, menuisiers, architectes d&apos;intérieur, agenceurs — découvrez comment AVRA transforme leur quotidien.
          </p>
          {/* Stars */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}>
            {[1,2,3,4,5].map((s) => <span key={s} style={{ fontSize: '1.5rem', color: 'var(--gold)' }}>★</span>)}
            <span style={{ color: 'rgba(255,255,255,.7)', fontSize: '1rem', marginLeft: 4 }}>4.9/5 — 847 avis</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: 'var(--cream-dark)', padding: '48px 5%', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '32px', textAlign: 'center' }}>
          {stats.map((s) => (
            <div key={s.label} className="reveal">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 800, color: 'var(--gold)', marginBottom: '.25rem' }}>{s.val}</div>
              <div style={{ fontSize: '.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials grid */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '24px' }}>
            {testimonials.map((t) => (
              <div key={t.name} className="card reveal" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  {[1,2,3,4,5].map((s) => <span key={s} style={{ fontSize: '.9rem', color: 'var(--gold)' }}>★</span>)}
                </div>
                <blockquote style={{
                  fontFamily: 'var(--font-display)', fontSize: '1rem', fontStyle: 'italic',
                  color: 'var(--text)', lineHeight: 1.65, marginBottom: '1.5rem',
                }}>
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div style={{ padding: '10px 14px', background: 'var(--cream-light)', borderRadius: 8, marginBottom: '1.5rem', borderLeft: '3px solid var(--gold)', fontSize: '.85rem', color: 'var(--gold-dark)', fontWeight: 600 }}>
                  📈 {t.metric}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${t.color},var(--green-light))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', fontWeight: 700, fontSize: '.9rem', flexShrink: 0 }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text)' }}>{t.name}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{t.role} — {t.location} &bull; {t.exp} d&apos;expérience</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section-centered" style={{ background: 'linear-gradient(135deg,var(--green-deep),var(--green))' }}>
        <div className="container">
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>Rejoignez les 2 400 professionnels satisfaits</h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 520, margin: '0 auto 2.5rem' }}>
            14 jours d&apos;essai gratuit, sans carte bancaire. Commencez à transformer votre activité dès aujourd&apos;hui.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register"><button className="btn-primary">Essayer gratuitement →</button></a>
            <a href="/tarifs"><button className="btn-secondary">Voir les tarifs</button></a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
