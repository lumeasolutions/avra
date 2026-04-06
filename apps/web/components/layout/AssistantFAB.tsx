'use client';

import Image from 'next/image';
import { useAssistantStore } from '@/store/useAssistantStore';
import { AssistantPanel } from './AssistantPanel';

const OWL_B64 = "/images/assistant-fab-1.png";

export function AssistantFAB() {
  const open = useAssistantStore(s => s.open);
  const toggle = useAssistantStore(s => s.toggle);
  const setOpen = useAssistantStore(s => s.setOpen);

  return (
    <>
      <style>{`
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,163,80,0.7), 0 8px 32px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 14px rgba(74,163,80,0), 0 8px 32px rgba(0,0,0,0.3); }
        }
        @keyframes fabRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes fabFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-4px) rotate(-3deg); }
          66% { transform: translateY(-2px) rotate(2deg); }
        }
        @keyframes fabSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fabGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .avra-fab {
          animation: fabPulse 2.5s ease-in-out infinite, fabFloat 4s ease-in-out infinite;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
        }
        .avra-fab:hover {
          transform: scale(1.12) translateY(-2px) !important;
          animation: fabFloat 4s ease-in-out infinite !important;
        }
        .avra-fab:active {
          transform: scale(0.93) !important;
        }
        .avra-fab-ring {
          animation: fabRing 2.5s ease-out infinite;
        }
        .avra-fab-ring2 {
          animation: fabRing 2.5s ease-out 0.8s infinite;
        }
        .avra-fab-open {
          animation: fabSpin 0.35s cubic-bezier(0.34,1.56,0.64,1) both !important;
        }
        .avra-label {
          animation: fabGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Panneau flottant */}
      <AssistantPanel open={open} onClose={() => setOpen(false)} />

      {/* Bouton FAB */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

        {/* Label tooltip */}
        {!open && (
          <div className="avra-label" style={{
            background: 'linear-gradient(135deg, #2d5a30, #4aa350)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '5px 12px',
            borderRadius: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'Segoe UI, Arial, sans-serif',
          }}>
            Assistant AVRA
          </div>
        )}

        {/* Rings pulsants */}
        <div style={{ position: 'relative', width: 64, height: 64 }}>
          {!open && (
            <>
              <div className="avra-fab-ring" style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                border: '2px solid rgba(74,163,80,0.6)',
                pointerEvents: 'none',
              }} />
              <div className="avra-fab-ring2" style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                border: '2px solid rgba(74,163,80,0.4)',
                pointerEvents: 'none',
              }} />
            </>
          )}

          {/* Bouton principal */}
          <button
            onClick={() => toggle()}
            className={`avra-fab${open ? ' avra-fab-open' : ''}`}
            style={{
              width: 64, height: 64,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              overflow: 'hidden',
              position: 'relative',
              background: 'linear-gradient(145deg, #3a7a3e, #2d5a30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Fond SVG texture verte */}
            <svg
              viewBox="0 0 64 64"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.7 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="fab-grain">
                  <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
                  <feColorMatrix type="saturate" values="0"/>
                  <feBlend in="SourceGraphic" mode="overlay" result="blend"/>
                  <feComposite in="blend" in2="SourceGraphic" operator="in"/>
                </filter>
                <radialGradient id="fab-glow" cx="50%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#6fcf73" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#1a3d1e" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <rect width="64" height="64" fill="url(#fab-glow)"/>
              <rect width="64" height="64" filter="url(#fab-grain)" opacity="0.35"/>
            </svg>

            {/* Reflet blanc en haut */}
            <div style={{
              position: 'absolute', top: 4, left: 8, right: 8, height: 20,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
              borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              pointerEvents: 'none',
            }} />

            {/* Logo hibou */}
            <img
              src={OWL_B64}
              alt="AVRA"
              style={{
                width: 38, height: 38,
                objectFit: 'contain',
                position: 'relative', zIndex: 2,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4)) brightness(1.15)',
              }}
            />

            {/* Indicateur ouvert */}
            {open && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 3,
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
