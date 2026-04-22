import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Nav from '../../components/Nav';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: "Merci — Vous êtes sur la liste d'attente AVRA",
  description:
    "Votre inscription est confirmée. Vous serez contacté(e) dès l'ouverture de la bêta AVRA en juillet 2026.",
  robots: { index: false, follow: false },
};

export default function MerciPage() {
  return (
    <>
      <Nav />
      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0e1810 0%, #0a110c 100%)',
          paddingTop: '120px',
          paddingBottom: '80px',
          color: '#fff',
        }}
      >
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: '0 5%',
            textAlign: 'center',
          }}
        >
          {/* Logo / icône */}
          <div
            style={{
              width: 88,
              height: 88,
              margin: '0 auto 28px',
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.04))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(201,169,110,0.35)',
              boxShadow: '0 0 40px rgba(201,169,110,0.12)',
            }}
          >
            <Image
              src="/nouveaulogochouette.png"
              alt="AVRA"
              width={60}
              height={60}
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'rgba(201, 169, 110, 0.1)',
              border: '1px solid rgba(201, 169, 110, 0.3)',
              color: '#e8c97a',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            <span>🌱</span>
            <span>Inscription confirmée</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #fff 0%, #e8c97a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Merci, c&apos;est noté !&nbsp;🎉
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.72)',
              marginBottom: '40px',
            }}
          >
            Vous êtes inscrit(e) sur la liste d&apos;attente d&apos;AVRA.
            Nous vous contacterons dès l&apos;ouverture de la bêta et au
            lancement officiel en{' '}
            <strong style={{ color: '#e8c97a' }}>juillet 2026</strong>.
          </p>

          {/* Prochaines étapes */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '40px',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#C9A96E',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              En attendant le lancement
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <NextStep
                icon="🔍"
                title="Découvrez les fonctionnalités"
                desc="Visitez notre page détaillée pour voir tout ce qu'AVRA vous permettra de faire."
                href="/fonctionnalites"
                label="Voir les fonctionnalités"
              />
              <NextStep
                icon="💬"
                title="Demandez une démo personnalisée"
                desc="Un membre de l'équipe peut vous présenter AVRA en avant-première."
                href="/demo"
                label="Demander une démo"
              />
              <NextStep
                icon="📋"
                title="Consultez nos tarifs"
                desc="Découvrez nos formules et préparez votre décision en amont du lancement."
                href="/tarifs"
                label="Voir les tarifs"
              />
            </div>
          </div>

          {/* CTA retour accueil */}
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              borderRadius: '12px',
              background: 'rgba(201, 169, 110, 0.08)',
              border: '1px solid rgba(201, 169, 110, 0.25)',
              color: '#e8c97a',
              fontSize: '0.95rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Sous-composant ───────────────────────────────────────────────────────────

function NextStep({
  icon,
  title,
  desc,
  href,
  label,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        padding: '16px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>
          {title}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 10 }}>
          {desc}
        </p>
        <Link
          href={href}
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#C9A96E',
            textDecoration: 'underline',
          }}
        >
          {label} →
        </Link>
      </div>
    </div>
  );
}
