import Link from 'next/link';

export default function NotFound() {
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
        404
      </div>
      <h1
        style={{
          color: '#fff',
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '12px',
        }}
      >
        Page introuvable
      </h1>
      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1rem',
          marginBottom: '36px',
          maxWidth: '420px',
        }}
      >
        La page que vous recherchez n&apos;existe pas ou a été déplacée. AVRA est en bêta privée — lancement public en juillet 2026.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
        <Link
          href="/rejoindre"
          style={{
            padding: '12px 28px',
            background: 'transparent',
            color: '#e8c97a',
            fontWeight: 700,
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.95rem',
            border: '1px solid rgba(232,201,122,0.4)',
          }}
        >
          🌱 Rejoindre la bêta
        </Link>
      </div>
    </div>
  );
}
