import type { Metadata } from 'next';
import '../marketing.css';

export const metadata: Metadata = {
  title: 'Témoignages — Ils ont choisi AVRA pour gérer leur activité',
  description:
    'Découvrez pourquoi cuisinistes, menuisiers et architectes d\'intérieur font confiance à AVRA pour gérer leurs dossiers, facturation et projets.',
  alternates: { canonical: 'https://avra.fr/temoignages' },
  openGraph: {
    title: 'Témoignages AVRA — Bêta testeurs satisfaits',
    description: '94% de satisfaction. Découvrez pourquoi les pros de l\'agencement choisissent AVRA.',
    url: 'https://avra.fr/temoignages',
  },
};


import { ArrowRight, Mail } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

const testimonials = [
  {
    initials: 'A.M.',
    role: 'Cuisiniste',
    location: 'Toulouse',
    exp: '11 ans',
    quote:
      'J\'ai testé AVRA en tant que bêta testeur et ça m\'a vraiment impressionné. La gestion de mes dossiers clients s\'est simplifiée du jour au lendemain. Je recommande vivement.',
    metric: '+7h gagnées par semaine',
    color: 'var(--green-mid)',
  },
  {
    initials: 'S.D.',
    role: 'Menuisier',
    location: 'Bordeaux',
    exp: '8 ans',
    quote:
      'Avant de rejoindre le programme bêta, j\'utilisais 3 outils différents. AVRA les remplace tous. C\'est incroyable de pouvoir tout faire au même endroit.',
    metric: '3 outils remplacés',
    color: 'var(--gold-dark)',
  },
  {
    initials: 'L.F.',
    role: 'Architecte d\'intérieur',
    location: 'Paris',
    exp: '6 ans',
    quote:
      'Le module IA photo-réalisme a changé la donne pour mes présentations. Même en tant que bêta testeur, les rendus étaient bluffants. Mes clients en raffolent.',
    metric: '+35% de taux de conversion',
    color: 'var(--green-light)',
  },
  {
    initials: 'B.R.',
    role: 'Agenceur',
    location: 'Lyon',
    exp: '9 ans',
    quote:
      'J\'ai participé au programme bêta pour AVRA. L\'interface est intuitive et la facturation automatique m\'a vraiment sauvé. Zéro courbe d\'apprentissage.',
    metric: '-4h de compta par semaine',
    color: 'var(--green)',
  },
  {
    initials: 'M.L.',
    role: 'Cuisiniste',
    location: 'Marseille',
    exp: '13 ans',
    quote:
      'En tant que bêta testeur, j\'ai adoré voir AVRA évoluer. Le planning partagé avec mon équipe fonctionne parfaitement. Aucune double-réservation depuis.',
    metric: '0 conflit de planning',
    color: 'var(--green-mid)',
  },
  {
    initials: 'P.G.',
    role: 'Menuisier',
    location: 'Nantes',
    exp: '19 ans',
    quote:
      'Je suis de la vieille école, mais j\'ai testé AVRA en bêta et franchement, c\'est pas compliqué du tout. L\'équipe support est impeccable.',
    metric: 'Prise en main en 1 journée',
    color: 'var(--gold-dark)',
  },
];

const stats = [
  { val: '250+', label: 'Bêta testeurs actifs' },
  { val: '94%', label: 'Taux de satisfaction' },
  { val: '6h+', label: 'Gagnées par semaine en moyenne' },
  { val: '94%', label: 'Satisfaction bêta testeurs' },
];

export default function TemoignagesPage() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section
        style={{
          minHeight: '55vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '76px',
          background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 780,
            margin: '0 auto',
            padding: '60px 5%',
          }}
        >
          <div
            className="section-label"
            style={{ margin: '0 auto 1.5rem' }}
          >
            Ils nous font confiance
          </div>
          <h1
            style={{
              color: 'var(--white)',
              marginBottom: '1.5rem',
            }}
          >
            Ils ont choisi AVRA pour gérer leur activité
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.15rem',
              maxWidth: 560,
              margin: '0 auto 2rem',
            }}
          >
            Cuisinistes, menuisiers, architectes d&apos;intérieur, agenceurs — découvrez
            comment AVRA simplifie leur quotidien.
          </p>
          {/* Stars */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '1rem',
            }}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                style={{
                  fontSize: '1.5rem',
                  color: 'var(--gold)',
                }}
              >
                ★
              </span>
            ))}
            <span
              style={{
                color: 'rgba(255,255,255,.7)',
                fontSize: '1rem',
                marginLeft: 4,
              }}
            >
              4.8/5 — 250+ bêta testeurs
            </span>
          </div>
        </div>
      </section>

      {/* Transparent note */}
      <section
        style={{
          background: 'linear-gradient(135deg,var(--gold-light),var(--gold))',
          padding: '24px 5%',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="container" style={{ maxWidth: 700 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: '1.5rem',
                flexShrink: 0,
              }}
            >
              ℹ️
            </div>
            <div>
              <h4
                style={{
                  color: 'var(--green-deep)',
                  marginBottom: '.5rem',
                }}
              >
                Transparence
              </h4>
              <p
                style={{
                  color: 'var(--text)',
                  fontSize: '.95rem',
                  margin: 0,
                }}
              >
                AVRA est en cours de lancement. Ces témoignages proviennent de nos bêta testeurs qui
                ont testé le logiciel avant le lancement officiel. Nous valorisons l\'authenticité et la
                transparence, c\'est pourquoi vous voyez les vrais retours de nos premiers utilisateurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          background: 'var(--cream-dark)',
          padding: '48px 5%',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          className="container stats-band-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: '32px',
            textAlign: 'center',
          }}
        >
          {stats.map((s) => (
            <div key={s.label} className="reveal">
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.8rem',
                  fontWeight: 800,
                  color: 'var(--gold)',
                  marginBottom: '.25rem',
                }}
              >
                {s.val}
              </div>
              <div
                style={{
                  fontSize: '.9rem',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials grid */}
      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(320px,1fr))',
              gap: '24px',
            }}
          >
            {testimonials.map((t) => (
              <div
                key={t.initials}
                className="card reveal"
                style={{
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '1rem',
                  }}
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: '.9rem',
                        color: 'var(--gold)',
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <blockquote
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    fontStyle: 'italic',
                    color: 'var(--text)',
                    lineHeight: 1.65,
                    marginBottom: '1.5rem',
                  }}
                >
                  "{t.quote}"
                </blockquote>
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--cream-light)',
                    borderRadius: 8,
                    marginBottom: '1.5rem',
                    borderLeft: '3px solid var(--gold)',
                    fontSize: '.85rem',
                    color: 'var(--gold-dark)',
                    fontWeight: 600,
                  }}
                >
                  Résultat: {t.metric}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg,${t.color},var(--green-light))`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--white)',
                      fontWeight: 700,
                      fontSize: '.9rem',
                      flexShrink: 0,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '.95rem',
                        color: 'var(--text)',
                      }}
                    >
                      {t.initials}
                    </div>
                    <div
                      style={{
                        fontSize: '.8rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {t.role} — {t.location} •{' '}
                      {t.exp} d&apos;expérience
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soyez parmi les premiers */}
      <section
        className="section section-centered"
        style={{
          background: 'var(--cream-light)',
        }}
      >
        <div className="container" style={{ maxWidth: 700 }}>
          <h2 style={{ marginBottom: '1.5rem' }}>
            Soyez parmi les premiers
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
            }}
          >
            Rejoignez la liste d&apos;attente. En
            tant que bêta testeur, vous bénéficierez d&apos;une réduction spéciale
            à vie et d&apos;un support prioritaire.
          </p>

          <form
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '2rem',
            }}
          >
            <input
              type="email"
              placeholder="Votre email"
              style={{
                padding: '14px 20px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                fontSize: '.95rem',
                minWidth: 250,
                fontFamily: 'var(--font-body)',
              }}
              required
            />
            <button
              type="submit"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Rejoindre la liste
              <ArrowRight size={16} />
            </button>
          </form>

          <p
            style={{
              fontSize: '.85rem',
              color: 'var(--text-muted)',
            }}
          >
            Pas de spam, pas de surprises. Nous vous enverrons juste les mises à jour
            importantes.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        className="section section-centered"
        style={{
          background:
            'linear-gradient(135deg,var(--green-deep),var(--green))',
        }}
      >
        <div className="container">
          <h2
            style={{
              color: 'var(--white)',
              marginBottom: '1.5rem',
            }}
          >
            Prêt à rejoindre la communauté ?
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,.75)',
              maxWidth: 520,
              margin: '0 auto 2.5rem',
            }}
          >
            Découvrez comment AVRA transforme votre activité. Commencez dès aujourd&apos;hui.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a href="/comment-ca-marche">
              <button
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Demander une démo
                <ArrowRight size={18} />
              </button>
            </a>
            <a href="/tarifs">
              <button className="btn-secondary">
                Voir les tarifs
              </button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
