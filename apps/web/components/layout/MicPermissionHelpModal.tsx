'use client';

/**
 * MicPermissionHelpModal — modale d'aide quand l'utilisateur a bloqué le
 * micro pour le site et qu'il faut le ré-autoriser.
 *
 * Pourquoi : sans cette modale, l'erreur "Accès micro refusé" ne donnait
 * que un texte technique vague, et l'utilisateur lambda ne savait pas que
 * l'icône cadenas en haut à gauche de la barre d'URL Chrome est la cle.
 *
 * Cette modale propose une procédure visuelle pas-à-pas avec :
 *  - Une illustration de l'icône cadenas dans le navigateur
 *  - 3 étapes numérotées
 *  - Bouton "Réessayer" qui relance la demande de permission
 *  - Détection navigateur (Chrome / Edge / Safari / Firefox) pour adapter
 */

import { useEffect, useMemo, useState } from 'react';
import { Lock, Mic, RefreshCw, X, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
}

type BrowserKind = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

function detectBrowser(): BrowserKind {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('chrome/')) return 'chrome';
  if (ua.includes('safari/')) return 'safari';
  return 'other';
}

export function MicPermissionHelpModal({ open, onClose, onRetry }: Props) {
  const [retrying, setRetrying] = useState(false);
  const browser = useMemo<BrowserKind>(() => detectBrowser(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Demande explicite de getUserMedia pour redéclencher le prompt natif
      // (si le user a juste mis "Allow" dans le 🔒 mais pas encore relancé l'app)
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      onRetry();
      onClose();
    } catch {
      // Toujours bloqué — on garde la modale ouverte
    } finally {
      setRetrying(false);
    }
  };

  /**
   * Reload bypass cache. Souvent obligatoire après avoir changé une
   * permission Chrome — le navigateur garde l'ancien état en cache JS
   * sinon, et même si l'utilisateur a cliqué "Autoriser" dans le 🔒,
   * la page courante voit toujours "denied".
   */
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Instructions adaptées par navigateur
  const steps =
    browser === 'firefox'
      ? [
          'En haut à gauche de la barre d\'adresse, cherche l\'icône 🎤 BARRÉE ou un cadenas',
          'Clique dessus → "Autorisations" → trouve "Utiliser le micro" → Autoriser',
          'Reviens ici et clique "Réessayer le micro"',
        ]
      : browser === 'safari'
        ? [
            'Dans le menu Safari (en haut) → Réglages pour ce site web…',
            'Trouve "Microphone" → choisis "Autoriser"',
            'Reviens ici et clique "Réessayer le micro"',
          ]
        : [
            'En haut à gauche de la barre d\'adresse, clique sur l\'icône 🔒 (ou ⓘ)',
            'Trouve "Microphone" → bascule sur "Autoriser"',
            'Recharge la page si demandé, puis clique "Réessayer le micro"',
          ];

  return (
    <>
      <style>{`
        @keyframes mphFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mphReveal {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes mphPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes mphArrow {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(-6px); }
        }
        .mph-bg {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(8, 12, 10, 0.78);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: mphFade 0.25s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .mph-card {
          width: 100%; max-width: 480px;
          background: #fff;
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.4), 0 8px 24px rgba(48,64,53,0.18);
          animation: mphReveal 0.42s cubic-bezier(0.34, 1.42, 0.64, 1);
          overflow: hidden;
        }
        .mph-head {
          position: relative;
          padding: 22px 24px 18px;
          background: linear-gradient(135deg, #2a3a30 0%, #4a6358 100%);
          color: #fff;
        }
        .mph-head-icon {
          width: 52px; height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(220,38,38,0.4);
          margin-bottom: 12px;
          animation: mphPulse 2.5s ease-in-out infinite;
        }
        .mph-title { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; }
        .mph-subtitle { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.72); line-height: 1.4; }
        .mph-close {
          position: absolute; top: 14px; right: 14px;
          width: 32px; height: 32px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease;
        }
        .mph-close:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

        /* Illustration du browser bar */
        .mph-illustration {
          margin: 18px 24px 0;
          padding: 14px 16px;
          background: linear-gradient(180deg, #f5eee8 0%, #fbf8f3 100%);
          border-radius: 14px;
          border: 1px solid rgba(48,64,53,0.08);
          position: relative;
        }
        .mph-browser-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px;
          background: #fff;
          border-radius: 999px;
          border: 1px solid rgba(48,64,53,0.1);
          box-shadow: 0 2px 6px rgba(48,64,53,0.06);
        }
        .mph-lock-icon {
          flex-shrink: 0;
          width: 28px; height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(245,158,11,0.5);
          animation: mphPulse 1.6s ease-in-out infinite;
          ring: 2px solid rgba(245,158,11,0.3);
          position: relative;
        }
        .mph-lock-icon::after {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px solid rgba(245,158,11,0.5);
          border-radius: 12px;
          animation: mphPulse 1.6s ease-in-out infinite;
        }
        .mph-arrow {
          color: #f59e0b; flex-shrink: 0;
          animation: mphArrow 1.4s ease-in-out infinite;
          font-weight: 800; font-size: 14px;
        }
        .mph-url {
          flex: 1;
          font-size: 11.5px; color: rgba(48,64,53,0.55);
          font-family: 'Courier New', monospace;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mph-illustration-label {
          margin-top: 10px;
          text-align: center;
          font-size: 11.5px; color: #b45309; font-weight: 700;
        }

        /* Steps */
        .mph-steps {
          padding: 18px 24px 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .mph-step {
          display: flex; gap: 12px;
          padding: 12px 14px;
          background: linear-gradient(135deg, #fbf8f3 0%, #fff 100%);
          border-radius: 12px;
          border: 1px solid rgba(48,64,53,0.08);
        }
        .mph-step-num {
          flex-shrink: 0;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a67749, #c89665);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800;
          box-shadow: 0 3px 8px rgba(166,119,73,0.3);
        }
        .mph-step-text {
          flex: 1;
          font-size: 13px; line-height: 1.5;
          color: #1a1614;
          font-weight: 500;
        }

        /* Footer */
        .mph-foot {
          padding: 18px 24px 22px;
          margin-top: 14px;
          display: flex; gap: 10px; justify-content: flex-end;
          border-top: 1px solid rgba(48,64,53,0.06);
          background: rgba(48,64,53,0.02);
        }
        .mph-btn {
          padding: 10px 18px; border-radius: 11px;
          font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.18s ease;
          border: none; font-family: inherit;
          display: inline-flex; align-items: center; gap: 7px;
        }
        .mph-btn-cancel {
          background: rgba(48,64,53,0.06);
          color: #1a1614;
        }
        .mph-btn-cancel:hover { background: rgba(48,64,53,0.12); }
        .mph-btn-retry {
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
          color: #fff;
          box-shadow: 0 6px 16px rgba(34,197,94,0.35);
        }
        .mph-btn-retry:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(34,197,94,0.45);
        }
        .mph-btn-retry:disabled { opacity: 0.6; cursor: wait; }
        .mph-btn-reload {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: #fff;
          box-shadow: 0 6px 16px rgba(59,130,246,0.35);
        }
        .mph-btn-reload:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(59,130,246,0.45);
        }
        .mph-tip {
          margin: 14px 24px 0;
          padding: 11px 14px;
          background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
          border: 1px solid rgba(245,158,11,0.4);
          border-radius: 10px;
          font-size: 11.5px; line-height: 1.5;
          color: #78350f;
          display: flex; flex-direction: column; gap: 3px;
        }
        .mph-tip strong { font-weight: 800; color: #92400e; }

        @keyframes mphSpin { to { transform: rotate(360deg); } }
        .mph-spin { animation: mphSpin 0.85s linear infinite; }
      `}</style>

      <div className="mph-bg" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="mph-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="mph-head">
            <button type="button" className="mph-close" onClick={onClose} aria-label="Fermer">
              <X style={{ width: 16, height: 16 }} />
            </button>
            <div className="mph-head-icon">
              <Mic style={{ width: 26, height: 26, color: '#fff' }} />
            </div>
            <h2 className="mph-title">Le micro est bloqué</h2>
            <p className="mph-subtitle">
              Votre navigateur a refusé l'accès au micro pour AVRA. Voici comment le réautoriser en 3 étapes.
            </p>
          </div>

          {/* Illustration de la barre d'adresse */}
          <div className="mph-illustration">
            <div className="mph-browser-bar">
              <span className="mph-arrow">←</span>
              <div className="mph-lock-icon">
                <Lock style={{ width: 14, height: 14 }} />
              </div>
              <div className="mph-url">avra-kappa.vercel.app</div>
            </div>
            <div className="mph-illustration-label">
              ↑ Cliquez sur cette icône en haut de votre navigateur
            </div>
          </div>

          {/* Steps */}
          <div className="mph-steps">
            {steps.map((text, i) => (
              <div key={i} className="mph-step">
                <div className="mph-step-num">{i + 1}</div>
                <div className="mph-step-text">{text}</div>
              </div>
            ))}
          </div>

          {/* Tip si déjà activé */}
          <div className="mph-tip">
            <strong>Déjà activé mais ça ne marche toujours pas ?</strong>
            <span>
              Chrome garde l'ancien état en mémoire après un changement de permission.
              <strong> Cliquez "Recharger la page"</strong> pour forcer la prise en compte.
            </span>
          </div>

          {/* Footer */}
          <div className="mph-foot">
            <button type="button" className="mph-btn mph-btn-cancel" onClick={onClose}>
              Plus tard
            </button>
            <button
              type="button"
              className="mph-btn mph-btn-retry"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? (
                <>
                  <RefreshCw className="mph-spin" style={{ width: 14, height: 14 }} />
                  Vérification…
                </>
              ) : (
                <>
                  <Check style={{ width: 14, height: 14 }} />
                  Réessayer
                </>
              )}
            </button>
            <button
              type="button"
              className="mph-btn mph-btn-reload"
              onClick={handleReload}
              title="Recharge la page pour forcer Chrome à prendre en compte la nouvelle permission"
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
