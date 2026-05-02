'use client';

/**
 * Bouton "Tableau de bord" rond dore — anime, voyant.
 *
 * Conçu pour etre place dans un header dark (vert AVRA). Utilise sur :
 *  - /dossiers/[id] (header dossier en cours detail)
 *  - /dossiers (liste en cours)
 *  - /dossiers-signes (liste signes)
 *
 * Le CSS est scope via une classe unique pour eviter les conflits si deux
 * boutons coexistent sur la meme page.
 */
import { LayoutDashboard } from 'lucide-react';

interface Props {
  open: boolean;
  onClick: () => void;
  label?: string;
  /** ID utilise pour aria-controls (accessibilite). */
  controlsId?: string;
  /** Taille du cercle en px (defaut 64). */
  size?: number;
}

export function DashboardTriggerButton({
  open, onClick, label = 'Tableau de bord', controlsId, size = 64,
}: Props) {
  return (
    <>
      <style>{`
        @keyframes dtbAuraRotate { to { transform: rotate(360deg); } }
        @keyframes dtbPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217,179,138,.55), 0 8px 22px rgba(217,179,138,.35), inset 0 1px 0 rgba(255,255,255,.4); }
          50%      { box-shadow: 0 0 0 14px rgba(217,179,138,0),  0 8px 22px rgba(217,179,138,.45), inset 0 1px 0 rgba(255,255,255,.5); }
        }
        @keyframes dtbIconFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        @keyframes dtbSparkle {
          0%, 100% { transform: scale(.8) rotate(0deg);   opacity: 0; }
          50%      { transform: scale(1.15) rotate(180deg); opacity: 1; }
        }
        .dtb-wrap {
          position: relative; flex-shrink: 0;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .dtb-circle { position: relative; }
        .dtb-aura {
          position: absolute; inset: -6px; border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            rgba(217,179,138,0)    0deg,
            rgba(217,179,138,.7)  90deg,
            rgba(240,200,130,.95) 180deg,
            rgba(217,179,138,.7) 270deg,
            rgba(217,179,138,0) 360deg
          );
          animation: dtbAuraRotate 5s linear infinite;
          opacity: .85; filter: blur(2px); pointer-events: none;
        }
        .dtb-aura::before {
          content: ''; position: absolute; inset: 6px; border-radius: 50%;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 100%);
        }
        .dtb-btn {
          position: relative; width: 100%; height: 100%; border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #f4d6a8 0%, #d9b38a 35%, #b88c5c 100%);
          border: 2px solid rgba(255,255,255,.35);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: #2a3a30; animation: dtbPulse 2.4s ease-in-out infinite;
          transition: transform .25s cubic-bezier(.34,1.42,.64,1);
          z-index: 1; padding: 0;
        }
        .dtb-btn:hover { transform: scale(1.08); }
        .dtb-btn:active { transform: scale(.96); }
        .dtb-btn svg { animation: dtbIconFloat 2.4s ease-in-out infinite; }
        .dtb-btn.is-open {
          background: radial-gradient(circle at 30% 30%, #4a6552 0%, #2a3a30 100%);
          color: #d9b38a;
          border-color: rgba(217,179,138,.6);
        }
        .dtb-spark {
          position: absolute; width: 6px; height: 6px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 8px #fff, 0 0 14px rgba(217,179,138,.9);
          animation: dtbSparkle 2.8s ease-in-out infinite;
          pointer-events: none; z-index: 2;
        }
        .dtb-spark.s1 { top: -4px;    left: 50%;  animation-delay: 0s; }
        .dtb-spark.s2 { top: 50%;     right: -4px; animation-delay: .7s; }
        .dtb-spark.s3 { bottom: -4px; left: 30%;  animation-delay: 1.4s; }
        .dtb-spark.s4 { top: 30%;     left: -4px; animation-delay: 2.1s; }
        .dtb-label {
          font-size: 9.5px; font-weight: 700;
          color: rgba(255,255,255,.85);
          text-transform: uppercase; letter-spacing: .06em;
          white-space: nowrap; text-align: center; line-height: 1.2;
          text-shadow: 0 1px 4px rgba(0,0,0,.3);
        }
      `}</style>
      <div className="dtb-wrap" style={{ width: size }}>
        <div className="dtb-circle" style={{ width: size, height: size }}>
          <span className="dtb-aura" aria-hidden="true" />
          <span className="dtb-spark s1" aria-hidden="true" />
          <span className="dtb-spark s2" aria-hidden="true" />
          <span className="dtb-spark s3" aria-hidden="true" />
          <span className="dtb-spark s4" aria-hidden="true" />
          <button
            type="button"
            onClick={onClick}
            className={`dtb-btn${open ? ' is-open' : ''}`}
            title={`${label} — vue d'ensemble`}
            aria-expanded={open}
            aria-controls={controlsId}
          >
            <LayoutDashboard size={Math.round(size * 0.38)} strokeWidth={2.5} />
          </button>
        </div>
        <span className="dtb-label">{label}</span>
      </div>
    </>
  );
}
