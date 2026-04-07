import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'AVRA - ERP pour les professionnels de l\'agencement'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #1e2b22 0%, #304035 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          padding: '60px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Logo/Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: '#ffffff',
            marginBottom: 20,
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
          }}
        >
          AVRA
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 48,
            color: '#c9a96e',
            marginBottom: 30,
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          ERP + IA pour les pros de l'agencement
        </div>

        {/* Sous-texte */}
        <div
          style={{
            fontSize: 28,
            color: '#f9f6f0',
            marginBottom: 50,
            textAlign: 'center',
            opacity: 0.9,
          }}
        >
          Cuisinistes · Menuisiers · Architectes d'intérieur
        </div>

        {/* Badge */}
        <div
          style={{
            fontSize: 24,
            color: '#1e2b22',
            background: '#c9a96e',
            padding: '12px 40px',
            borderRadius: 8,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Essai gratuit 14 jours
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
