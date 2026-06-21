'use client';

/**
 * Error boundary de segment pour l'espace applicatif (app).
 * Avant : un crash dans le dashboard remontait jusqu'à l'error.tsx GLOBAL
 * (écran 500 plein écran). Ici on offre un fallback localisé + "Réessayer"
 * (reset) sans perdre toute la navigation.
 */
import { useEffect } from 'react';
import Link from 'next/link';

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible dans la console / capté par Sentry (qui hooke console.error).
    console.error('[app segment error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a2b1e', margin: 0 }}>
        Une erreur est survenue
      </h1>
      <p style={{ color: '#6b7280', maxWidth: 420, margin: 0 }}>
        Cette section n&apos;a pas pu s&apos;afficher. Vous pouvez réessayer ou
        revenir au tableau de bord.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            background: '#1a2b1e',
            color: '#fff',
            fontWeight: 600,
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Réessayer
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: '10px 24px',
            background: 'rgba(26,43,30,0.08)',
            color: '#1a2b1e',
            fontWeight: 600,
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
