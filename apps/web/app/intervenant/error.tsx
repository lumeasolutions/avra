'use client';

/**
 * Error boundary de segment pour le portail intervenant.
 * Fallback localisé (mobile-first) au lieu de l'écran 500 global.
 */
import { useEffect } from 'react';
import Link from 'next/link';

export default function IntervenantSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[intervenant segment error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '32px 20px',
        textAlign: 'center',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a2a1e', margin: 0 }}>
        Une erreur est survenue
      </h1>
      <p style={{ color: '#6b7280', maxWidth: 360, margin: 0 }}>
        Impossible d&apos;afficher cette page. Réessayez.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '12px 28px',
            background: '#3D5449',
            color: '#fff',
            fontWeight: 600,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Réessayer
        </button>
        <Link
          href="/intervenant"
          style={{
            padding: '12px 28px',
            background: 'rgba(61,84,73,0.1)',
            color: '#3D5449',
            fontWeight: 600,
            borderRadius: 12,
            textDecoration: 'none',
          }}
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
