'use client';

import { useAssistantStore } from '@/store/useAssistantStore';
import { AssistantPanel } from './AssistantPanel';

const OWL_B64 = "/nouveaulogochouette.png";

export function AssistantFAB() {
  const open = useAssistantStore(s => s.open);
  const toggle = useAssistantStore(s => s.toggle);
  const setOpen = useAssistantStore(s => s.setOpen);

  return (
    <>
      <style>{`
        @keyframes fabAurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217,179,138,0.55), 0 12px 40px rgba(48,64,53,0.45), 0 0 30px rgba(166,119,73,0.35); }
          50%      { box-shadow: 0 0 0 18px rgba(217,179,138,0),    0 12px 40px rgba(48,64,53,0.45), 0 0 50px rgba(166,119,73,0.55); }
        }
        @keyframes fabRing {
          0%   { transform: scale(1);   opacity: 0.85; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes fabFloat {
          0%, 100% { transform: translateY(0px)  rotate(0deg); }
          33%      { transform: translateY(-5px) rotate(-3deg); }
          66%      { transform: translateY(-3px) rotate(3deg); }
        }
        @keyframes fabSpin {
          from { transform: rotate(0deg) scale(1); }
          to   { transform: rotate(360deg) scale(1); }
        }
        @keyframes fabGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.03); }
        }
        @keyframes fabSparkle {
          0%   { transform: translate(-50%,-50%) scale(0) rotate(0deg); opacity: 0; }
          50%  { transform: translate(-50%,-50%) scale(1) rotate(180deg); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(0) rotate(360deg); opacity: 0; }
        }
        @keyframes fabOwlBob {
          0%, 100% { transform: translateY(0)   scale(1); }
          50%      { transform: translateY(-2px) scale(1.05); }
        }
        .avra-fab {
          background: linear-gradient(135deg, #2d5a30 0%, #4aa350 25%, #a67749 55%, #d9b38a 80%, #2d5a30 100%);
          background-size: 300% 300%;
          animation:
            fabAurora 6s ease-in-out infinite,
            fabPulse 2.8s ease-in-out infinite,
            fabFloat 4.5s ease-in-out infinite;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .avra-fab:hover {
          transform: scale(1.14) translateY(-3px) !important;
        }
        .avra-fab:active {
          transform: scale(0.92) !important;
        }
        .avra-fab-ring  { animation: fabRing 2.8s ease-out infinite; }
        .avra-fab-ring2 { animation: fabRing 2.8s ease-out 0.9s infinite; }
        .avra-fab-ring3 { animation: fabRing 2.8s ease-out 1.8s infinite; }
        .avra-fab-open  { animation: fabSpin 0.4s cubic-bezier(0.34,1.56,0.64,1) both !important; }
        .avra-label     { animation: fabGlow 2.8s ease-in-out infinite; }
        .avra-owl-img   { animation: fabOwlBob 3s ease-in-out infinite; }
        .avra-sparkle {
          position: absolute; top: 50%; left: 50%;
          width: 6px; height: 6px;
          background: radial-gradient(circle, #fff 0%, #d9b38a 50%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          filter: blur(0.3px);
        }
        .avra-sparkle-1 { animation: fabSparkle 2.4s ease-in-out infinite;       --tx: 28px; --ty: -22px; }
        .avra-sparkle-2 { animation: fabSparkle 2.4s ease-in-out 0.6s infinite;  --tx: -26px; --ty: -18px; }
        .avra-sparkle-3 { animation: fabSparkle 2.4s ease-in-out 1.2s infinite;  --tx: 22px; --ty: 24px; }
        .avra-sparkle-4 { animation: fabSparkle 2.4s ease-in-out 1.8s infinite;  --tx: -24px; --ty: 20px; }
      `}</style>

      {/* Panneau flottant */}
      <AssistantPanel open={open} onClose={() => setOpen(false)} />

      {/* Bouton FAB */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

        {/* Label tooltip */}
        {!open && (
          <div className="avra-label" style={{
            background: 'linear-gradient(135deg, #2d5a30, #4aa350 45%, #a67749)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            padding: '6px 14px',
            borderRadius: 20,
            boxShadow: '0 6px 20px rgba(48,64,53,0.35), 0 0 20px rgba(166,119,73,0.3)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            textTransform: 'uppercase',
          }}>
            ✨ Assistant AVRA
          </div>
        )}

        {/* Rings pulsants + sparkles */}
        <div style={{ position: 'relative', width: 68, height: 68 }}>
          {!open && (
            <>
              <div className="avra-fab-ring" style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                border: '2px solid rgba(217,179,138,0.7)',
                pointerEvents: 'none',
              }} />
              <div className="avra-fab-ring2" style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                border: '2px solid rgba(74,163,80,0.5)',
                pointerEvents: 'none',
              }} />
              <div className="avra-fab-ring3" style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                border: '2px solid rgba(166,119,73,0.4)',
                pointerEvents: 'none',
              }} />

              {/* Étincelles flottantes */}
              <span className="avra-sparkle avra-sparkle-1" style={{ transform: 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))' }} />
              <span className="avra-sparkle avra-sparkle-2" style={{ transform: 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))' }} />
              <span className="avra-sparkle avra-sparkle-3" style={{ transform: 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))' }} />
              <span className="avra-sparkle avra-sparkle-4" style={{ transform: 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))' }} />
            </>
          )}

          {/* Bouton principal */}
          <button
            onClick={() => toggle()}
            className={`avra-fab${open ? ' avra-fab-open' : ''}`}
            aria-label="Ouvrir l'assistant AVRA"
            style={{
              width: 68, height: 68,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              padding: 0,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Halo radial intérieur */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35) 0%, transparent 55%)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 1,
            }} />

            {/* Reflet verre en haut */}
            <div style={{
              position: 'absolute', top: 3, left: 8, right: 8, height: 22,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)',
              borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              pointerEvents: 'none',
              zIndex: 2,
            }} />

            {/* Logo chouette (le bon) */}
            <img
              src={OWL_B64}
              alt="AVRA"
              className="avra-owl-img"
              style={{
                width: 44, height: 44,
                objectFit: 'contain',
                position: 'relative', zIndex: 3,
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45)) drop-shadow(0 0 8px rgba(217,179,138,0.4)) brightness(1.12) saturate(1.1)',
              }}
            />

            {/* Indicateur ouvert (X) */}
            {open && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 4,
                backdropFilter: 'blur(2px)',
              }}>
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
