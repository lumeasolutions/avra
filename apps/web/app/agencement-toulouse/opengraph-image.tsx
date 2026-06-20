import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AVRA — Logiciel pour Agenceurs Toulouse';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * OpenGraph image dynamique pour la page geo /agencement-toulouse.
 * Generee a la volee par Next sur le edge — affichee sur LinkedIn,
 * Twitter, Facebook, WhatsApp lors du partage du lien.
 *
 * Booste fortement le CTR vs un OG generique (etudes 2024 : +30 a 40%
 * de clics sur LinkedIn quand l'image est specifique a la page).
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            'radial-gradient(120% 100% at 0% 0%, rgba(201,169,110,0.22), transparent 60%), linear-gradient(135deg, #1e2b22 0%, #15201a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
          color: '#f9f6f0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Bandeau or */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #c9a96e, #e8c97a, #c9a96e)',
          }}
        />

        {/* Header — logo + region */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 }}>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: '0.04em',
              color: '#f9f6f0',
            }}
          >
            AVRA
          </div>
          <div
            style={{
              padding: '10px 22px',
              borderRadius: 999,
              background: 'rgba(201,169,110,0.14)',
              border: '1px solid rgba(201,169,110,0.4)',
              color: '#e8c97a',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            OCCITANIE
          </div>
        </div>

        {/* Titre principal */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: 32,
              color: '#c9a96e',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            Logiciel pour agenceurs
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              marginBottom: 28,
            }}
          >
            Toulouse
          </div>
          <div
            style={{
              fontSize: 28,
              color: 'rgba(249,246,240,0.85)',
              lineHeight: 1.4,
              maxWidth: 880,
            }}
          >
            Devis, planning, IA photo-réalisme, facturation
            électronique 2026 — tout en une seule app pensée pour les
            agenceurs Occitanie.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 32 }}>
          <div
            style={{
              padding: '12px 28px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #e8c97a, #c9a96e)',
              color: '#1e2b22',
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            avra-app.fr
          </div>
          <div style={{ fontSize: 18, color: 'rgba(249,246,240,0.7)' }}>
            Bêta privée · Lancement janvier 2027
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
