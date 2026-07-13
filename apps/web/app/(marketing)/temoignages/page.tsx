import type { Metadata } from 'next';
import '../marketing.css';

export const metadata: Metadata = {
  title: 'Témoignages — Ils ont choisi AVRA pour gérer leur activité',
  description:
    'AVRA se construit avec ses premiers utilisateurs — cuisinistes, menuisiers et architectes d\'intérieur. Découvrez le programme bêta.',
  alternates: { canonical: 'https://avra-app.fr/temoignages' },
  openGraph: {
    title: 'Témoignages AVRA — Programme bêta',
    description: 'AVRA se construit avec ses premiers utilisateurs. Découvrez le programme bêta pour cuisinistes, menuisiers et architectes d\'intérieur.',
    url: 'https://avra-app.fr/temoignages',

    images: ['/opengraph-image.png'],
  },
};


import { ArrowRight, Mail } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

// JUR 13/07/2026 — Faux témoignages nominatifs + stats de satisfaction
// fabriqués retirés (bêta privée : aucun avis réel publiable ; risque DGCCRF
// « faux avis » art. L.121-4 c. conso). La page présente désormais le
// programme bêta honnêtement, sans avis ni métrique inventés.
//
// Les capacités mises en avant sont des faits produit vérifiables, pas des
// retours utilisateurs.
const capabilities = [
  { val: 'Tout-en-un', label: 'Dossiers, devis, factures, chantiers, SAV' },
  { val: 'IA', label: 'Extraction de documents & rendus visuels' },
  { val: 'Bêta', label: 'Tarif fondateur pour les premiers inscrits' },
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
            Programme bêta
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
          <div
            style={{
              display: 'inline-block',
              color: 'rgba(255,255,255,.85)',
              fontSize: '1rem',
              padding: '8px 18px',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: '100px',
            }}
          >
            Programme bêta ouvert — inscriptions en cours
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
                AVRA est en cours de lancement. Nous avons choisi de ne pas afficher de
                témoignages tant que nos premiers utilisateurs n&apos;ont pas suffisamment de recul :
                par souci d&apos;authenticité, cette page ne publiera que de vrais retours, vérifiés,
                au fur et à mesure du programme bêta.
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
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: '32px',
            textAlign: 'center',
          }}
        >
          {capabilities.map((s) => (
            <div key={s.label} className="reveal">
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
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

      {/* Témoignages — à venir (aucun avis fabriqué) */}
      <section className="section">
        <div className="container" style={{ maxWidth: 720, textAlign: 'center' }}>
          <div
            className="card reveal"
            style={{ padding: '48px 32px' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💬</div>
            <h2 style={{ marginBottom: '1rem' }}>
              Les premiers retours arrivent bientôt
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-muted)',
                lineHeight: 1.7,
                margin: '0 auto',
                maxWidth: 560,
              }}
            >
              AVRA est en bêta privée. Plutôt que d&apos;afficher des avis inventés, nous
              publierons ici les vrais témoignages de nos utilisateurs dès qu&apos;ils auront
              assez de recul. Vous voulez en faire partie&nbsp;? Rejoignez la liste
              d&apos;attente ci-dessous.
            </p>
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
            <input aria-label="Votre email"
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
