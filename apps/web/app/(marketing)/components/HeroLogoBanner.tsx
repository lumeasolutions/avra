'use client';

import { useEffect, useState } from 'react';

/**
 * Bannière hero AVRA — version professionnelle et épurée.
 *
 * - Fond vert foncé uni (identique à la maquette produit)
 * - 3 éléments : logo A circulaire (gauche), mot AVRA (centre), chouette (droite)
 * - Aucun "wow effect" : pas de particules, comètes, auroras, anneaux, prismes…
 * - Animations conservées : entrée en fondu + léger flottement vertical
 */
export default function HeroLogoBanner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="hero-logo-banner"
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        marginTop: '-76px',   // remonte la bannière pour coller sous la navbar fixe (76px = hauteur nav)
        // Fond vert foncé identique à la maquette
        background: '#0f1a14',
        borderTop: '1px solid rgba(201,169,110,0.18)',
        borderBottom: '1px solid rgba(201,169,110,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0px',
        padding: '0 2%',
        flexShrink: 0,
        overflow: 'hidden',
        height: '280px',
      }}
    >
      {/* Logo A circulaire (gauche) */}
      <div
        className="hero-logo-left"
        style={{
          position: 'relative',
          width: 200,
          height: 200,
          flexShrink: 0,
          marginRight: '-100px',
          alignSelf: 'center',
          transition: 'transform 1s ease-out, opacity 1s ease-out',
          transform: mounted ? 'translate3d(0,0,0)' : 'translate3d(-40px,0,0)',
          opacity: mounted ? 1 : 0,
          zIndex: 1,
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nouveaulogoA.png"
            alt="AVRA"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Mot AVRA (centre) */}
      <div
        className="hero-logo-center"
        style={{
          position: 'relative',
          width: 1060,
          height: 280,
          flexShrink: 0,
          alignSelf: 'center',
          zIndex: 2,
          transition: 'transform 1.1s ease-out, opacity 1.1s ease-out',
          transform: mounted ? 'translate3d(0,0,0)' : 'translate3d(0,20px,0)',
          opacity: mounted ? 1 : 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nouveaulogoavra.png"
          alt="AVRA"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Chouette (droite) */}
      <div
        className="hero-logo-right"
        style={{
          position: 'relative',
          width: 200,
          height: 200,
          flexShrink: 0,
          marginLeft: '-100px',
          alignSelf: 'center',
          transition: 'transform 1s ease-out, opacity 1s ease-out',
          transform: mounted ? 'translate3d(0,0,0)' : 'translate3d(40px,0,0)',
          opacity: mounted ? 1 : 0,
          zIndex: 1,
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nouveaulogochouette.png"
            alt="AVRA Chouette"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes heroLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (max-width: 1200px) {
          .hero-logo-banner { gap: 24px !important; padding: 20px 3% !important; }
          .hero-logo-center { width: 620px !important; height: 200px !important; }
          .hero-logo-left, .hero-logo-right { width: 180px !important; height: 180px !important; }
        }
        @media (max-width: 768px) {
          .hero-logo-banner { gap: 10px !important; padding: 14px 3% !important; flex-wrap: nowrap; }
          .hero-logo-center { width: 300px !important; height: 100px !important; }
          .hero-logo-left, .hero-logo-right { width: 85px !important; height: 85px !important; }
        }
      `}</style>
    </div>
  );
}
