'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';

const ROOT_PAGES = ['/dossiers', '/dossiers-signes', '/planning', '/planning-gestion', '/stock', '/ia-photo-realisme', '/statistiques', '/facturation', '/intervenants', '/historique', '/parametres'];

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [clicked, setClicked] = useState(false);

  const isRoot = ROOT_PAGES.some(p => pathname === p);
  if (isRoot) return null;

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => router.back(), 320);
  };

  return (
    <>
      <style>{`
        @keyframes bbPulse {
          0%   { transform: translateY(-50%) scale(1); }
          30%  { transform: translateY(-50%) scale(1.35); }
          60%  { transform: translateY(-50%) scale(0.92); }
          80%  { transform: translateY(-50%) scale(1.08); }
          100% { transform: translateY(-50%) scale(1); }
        }
        @keyframes bbRing1 {
          0%   { transform: translateY(-50%) scale(1); opacity: 0.5; }
          100% { transform: translateY(-50%) scale(2.8); opacity: 0; }
        }
        @keyframes bbRing2 {
          0%   { transform: translateY(-50%) scale(1); opacity: 0.3; }
          100% { transform: translateY(-50%) scale(2.2); opacity: 0; }
        }
        @keyframes bbSpin {
          0%   { transform: rotate(0deg) translateX(-1px); }
          100% { transform: rotate(-360deg) translateX(-1px); }
        }
        @keyframes bbFloat {
          0%, 100% { top: calc(50% - 2px); }
          50%       { top: calc(50% + 2px); }
        }
        @keyframes bbGlow {
          0%, 100% { box-shadow: 0 0 12px 3px rgba(48,64,53,0.25), 0 2px 8px rgba(48,64,53,0.15); }
          50%       { box-shadow: 0 0 22px 8px rgba(48,64,53,0.35), 0 4px 16px rgba(48,64,53,0.2); }
        }

        .bb-btn {
          position: fixed;
          left: 396px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 35;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3d5244, #304035);
          border: 2px solid rgba(255,255,255,0.18);
          box-shadow: 0 0 12px 3px rgba(48,64,53,0.25), 0 2px 8px rgba(48,64,53,0.15), inset 0 1px 0 rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          animation: bbFloat 3s ease-in-out infinite, bbGlow 3s ease-in-out infinite;
          transition: background 0.2s;
        }
        .bb-btn:hover {
          background: linear-gradient(135deg, #4a6358, #3d5244);
          box-shadow: 0 0 24px 8px rgba(48,64,53,0.4), 0 4px 20px rgba(48,64,53,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .bb-btn:hover .bb-icon {
          animation: bbSpin 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .bb-btn.clicked {
          animation: bbPulse 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        .bb-ring {
          position: fixed;
          left: 396px;
          top: 50%;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 34;
        }
        .bb-ring1 {
          border: 2px solid rgba(48,64,53,0.4);
          animation: bbRing1 1.8s ease-out infinite;
        }
        .bb-ring2 {
          border: 2px solid rgba(48,64,53,0.25);
          animation: bbRing2 1.8s ease-out infinite 0.4s;
        }

        .bb-label {
          position: fixed;
          left: 450px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 35;
          background: #304035;
          color: white;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 5px 10px;
          border-radius: 20px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transform: translateY(-50%) translateX(-6px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          box-shadow: 0 2px 8px rgba(48,64,53,0.2);
        }
        .bb-btn:hover ~ .bb-label {
          opacity: 1;
          transform: translateY(-50%) translateX(0px);
        }

        .bb-icon {
          color: white;
          width: 20px;
          height: 20px;
          transition: color 0.15s;
        }
      `}</style>

      {/* Anneaux pulsants */}
      <div className="bb-ring bb-ring1" />
      <div className="bb-ring bb-ring2" />

      {/* Bouton principal */}
      <button
        className={`bb-btn ${clicked ? 'clicked' : ''}`}
        onClick={handleClick}
        title="Retour"
      >
        <ChevronLeft className="bb-icon" />
      </button>

      {/* Label au hover */}
      <span className="bb-label">Retour</span>
    </>
  );
}
