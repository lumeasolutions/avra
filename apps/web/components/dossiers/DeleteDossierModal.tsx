'use client';

/**
 * DeleteDossierModal — modale de confirmation soignée pour la suppression
 * d'un dossier client. Conçue pour être visuellement marquante (animations,
 * gradient, glow doré inversé en rouge) afin que l'utilisateur prenne
 * conscience de l'irréversibilité.
 *
 * Props :
 *  - open : visibilité de la modale
 *  - dossierName : nom affiché dans la confirmation
 *  - dossierFirstName : prénom optionnel
 *  - itemsCount : nombre de sous-dossiers (pour le warning sur la perte)
 *  - loading : état pendant l'appel API
 *  - error : message d'erreur à afficher
 *  - onConfirm : appelé quand l'utilisateur confirme
 *  - onCancel : appelé quand l'utilisateur annule (Escape, clic backdrop, X)
 */

import { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  dossierName: string;
  dossierFirstName?: string;
  itemsCount: number;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDossierModal({
  open,
  dossierName,
  dossierFirstName,
  itemsCount,
  loading,
  error,
  onConfirm,
  onCancel,
}: Props) {
  // Fermeture clavier (Escape) — uniquement si pas en cours de loading
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    // Bloque le scroll body pendant l'ouverture pour éviter le décalage
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const fullName = [dossierFirstName, dossierName].filter(Boolean).join(' ');

  return (
    <>
      <style>{`
        @keyframes ddmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ddmRise {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ddmGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35), 0 18px 48px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0), 0 18px 48px rgba(0,0,0,0.4); }
        }
        @keyframes ddmIconShake {
          0%, 100% { transform: rotate(0); }
          25%      { transform: rotate(-7deg); }
          50%      { transform: rotate(0); }
          75%      { transform: rotate(7deg); }
        }
        @keyframes ddmShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .ddm-backdrop {
          position: fixed; inset: 0;
          z-index: 100;
          background: radial-gradient(ellipse at center, rgba(40, 12, 12, 0.6) 0%, rgba(0, 0, 0, 0.78) 80%);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: ddmFadeIn 0.2s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }

        .ddm-card {
          position: relative;
          width: 100%; max-width: 460px;
          background: linear-gradient(180deg, #fffaf3 0%, #fff 60%);
          border-radius: 24px;
          border: 1px solid rgba(220, 38, 38, 0.18);
          overflow: hidden;
          animation: ddmRise 0.32s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45), 0 4px 16px rgba(220, 38, 38, 0.18);
        }

        .ddm-header-band {
          height: 6px;
          background: linear-gradient(90deg, #dc2626 0%, #f97316 50%, #dc2626 100%);
          background-size: 200% 100%;
          animation: ddmShimmer 3s ease-in-out infinite;
        }

        .ddm-icon-wrap {
          width: 72px; height: 72px;
          margin: 24px auto 12px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff 0%, #fee 60%, #fcc 100%);
          border: 2px solid rgba(220, 38, 38, 0.45);
          display: flex; align-items: center; justify-content: center;
          animation: ddmGlow 2.4s ease-in-out infinite;
        }
        .ddm-icon-wrap svg { animation: ddmIconShake 1.6s ease-in-out infinite; }

        .ddm-close {
          position: absolute; top: 14px; right: 14px;
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(48, 64, 53, 0.1);
          background: rgba(255, 255, 255, 0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(48, 64, 53, 0.55);
          transition: all 0.18s ease;
        }
        .ddm-close:hover {
          background: rgba(220, 38, 38, 0.08);
          color: #dc2626;
          border-color: rgba(220, 38, 38, 0.3);
        }
        .ddm-close:disabled { opacity: 0.4; cursor: not-allowed; }

        .ddm-title {
          font-size: 22px; font-weight: 800;
          color: #1a1614;
          text-align: center;
          letter-spacing: -0.02em;
          margin: 0 24px 6px;
        }
        .ddm-subtitle {
          font-size: 13px;
          color: rgba(48, 64, 53, 0.65);
          text-align: center;
          margin: 0 32px 18px;
          line-height: 1.55;
        }
        .ddm-name-pill {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(48, 64, 53, 0.08);
          color: #1a1614;
          border-radius: 999px;
          font-weight: 700;
          font-size: 13px;
        }

        .ddm-body {
          padding: 0 24px 4px;
        }
        .ddm-warn-box {
          display: flex; gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          background: linear-gradient(135deg, #fff5f5 0%, #fef0e8 100%);
          border: 1px solid rgba(220, 38, 38, 0.2);
          color: #7c2d12;
          font-size: 12.5px;
          line-height: 1.5;
          margin-bottom: 4px;
        }
        .ddm-warn-icon {
          flex-shrink: 0;
          color: #dc2626;
          margin-top: 1px;
        }

        .ddm-error {
          margin: 12px 0 0;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 12px;
          font-weight: 500;
        }

        .ddm-actions {
          display: flex; gap: 10px;
          padding: 18px 24px 22px;
          margin-top: 8px;
        }
        .ddm-btn {
          flex: 1;
          padding: 12px 18px;
          border-radius: 14px;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          letter-spacing: 0.01em;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px;
        }
        .ddm-btn-cancel {
          background: rgba(48, 64, 53, 0.06);
          color: #1a1614;
          border: 1px solid rgba(48, 64, 53, 0.1);
        }
        .ddm-btn-cancel:hover:not(:disabled) {
          background: rgba(48, 64, 53, 0.1);
          transform: translateY(-1px);
        }
        .ddm-btn-confirm {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          box-shadow: 0 6px 18px rgba(220, 38, 38, 0.35);
        }
        .ddm-btn-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(220, 38, 38, 0.45);
        }
        .ddm-btn-confirm:active:not(:disabled) { transform: translateY(0); }
        .ddm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .ddm-spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="ddm-backdrop"
        onClick={() => { if (!loading) onCancel(); }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ddm-title"
      >
        <div
          className="ddm-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ddm-header-band" />

          <button
            type="button"
            className="ddm-close"
            onClick={onCancel}
            disabled={loading}
            aria-label="Fermer"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>

          <div className="ddm-icon-wrap">
            <Trash2 style={{ width: 32, height: 32, color: '#dc2626' }} />
          </div>

          <h2 id="ddm-title" className="ddm-title">
            Supprimer ce dossier&nbsp;?
          </h2>
          <p className="ddm-subtitle">
            Souhaitez-vous vraiment supprimer le dossier de{' '}
            <span className="ddm-name-pill">{fullName || 'Sans nom'}</span>{' '}
            ?<br />
            Cette action est <strong>définitive</strong> et ne peut pas être annulée.
          </p>

          <div className="ddm-body">
            <div className="ddm-warn-box">
              <AlertTriangle className="ddm-warn-icon" style={{ width: 16, height: 16 }} />
              <div>
                <strong>Tout sera supprimé</strong>
                {itemsCount > 0 && (
                  <>
                    {' '}: les <strong>{itemsCount} sous-dossier{itemsCount > 1 ? 's' : ''}</strong>,
                    leurs documents, notes et historique de validation associés.
                  </>
                )}
                {itemsCount === 0 && ' : ce dossier ne contient pas encore de sous-dossier, mais il sera retiré définitivement.'}
              </div>
            </div>

            {error && <div className="ddm-error" role="alert">{error}</div>}
          </div>

          <div className="ddm-actions">
            <button
              type="button"
              className="ddm-btn ddm-btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              className="ddm-btn ddm-btn-confirm"
              onClick={onConfirm}
              disabled={loading}
              autoFocus
            >
              {loading ? (
                <>
                  <Loader2 className="ddm-spin" style={{ width: 16, height: 16 }} />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 style={{ width: 15, height: 15 }} />
                  Oui, supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
