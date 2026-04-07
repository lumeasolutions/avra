'use client';

export default function NewsletterForm() {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <input
        type="email"
        placeholder="votre@email.fr"
        style={{
          flex: 1,
          minWidth: '200px',
          padding: '12px 16px',
          border: '1px solid rgba(30,43,34,0.2)',
          borderRadius: '8px',
          fontSize: '1rem',
          fontFamily: 'inherit'
        }}
      />
      <button
        style={{
          padding: '12px 32px',
          background: '#1e2b22',
          color: '#f9f6f0',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#253029'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#1e2b22'}
      >
        S'inscrire
      </button>
    </div>
  );
}
