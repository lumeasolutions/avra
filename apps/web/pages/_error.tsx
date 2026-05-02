/**
 * Custom pages router error page — overrides Next.js default _error.js
 * to prevent useContext(null) SSR errors during static prerendering.
 * The App Router handles errors via app/error.tsx and app/not-found.tsx.
 */
function Error({ statusCode }: { statusCode?: number }) {
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
        color: '#fff',
      }}
    >
      <div
        style={{
          fontSize: '5rem',
          fontWeight: 900,
          color: '#C9A96E',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        {statusCode || 'Erreur'}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: '24px' }}>
        {statusCode === 404
          ? 'Cette page est introuvable.'
          : 'Une erreur est survenue.'}
      </p>
      <a
        href="/"
        style={{
          padding: '12px 32px',
          background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
          color: '#0e1810',
          fontWeight: 700,
          borderRadius: '12px',
          textDecoration: 'none',
          fontSize: '0.95rem',
        }}
      >
        Retour à l&apos;accueil
      </a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
