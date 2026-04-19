'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0e1810 0%, #1a2b1e 40%, #0e1810 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, -apple-system, sans-serif',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        500
      </div>
      <h1
        style={{
          color: '#fff',
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '12px',
        }}
      >
        Une erreur est survenue
      </h1>
      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1rem',
          marginBottom: '36px',
          maxWidth: '400px',
        }}
      >
        Quelque chose s&apos;est mal passé. Veuillez réessayer ou revenir à l&apos;accueil.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '12px 28px',
            background: 'rgba(201,169,110,0.1)',
            border: '1px solid rgba(201,169,110,0.3)',
            color: '#C9A96E',
            fontWeight: 700,
            borderRadius: '12px',
            fontSize: '0.95rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Réessayer
        </button>
        <Link
          href="/"
          style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
            color: '#0e1810',
            fontWeight: 700,
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.95rem',
            boxShadow: '0 8px 24px rgba(201,169,110,0.35)',
          }}
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
