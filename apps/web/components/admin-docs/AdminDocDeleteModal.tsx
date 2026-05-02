'use client';

/**
 * AdminDocDeleteModal — modale de suppression "wahou".
 *
 * Supporte le mode SINGLE (un seul doc nommé) et BULK (N docs sélectionnés).
 * Animation : icône poubelle qui pulse + se secoue, glow rouge intense,
 * shimmer au-dessus, autoFocus sur le bouton de confirmation pour réponse
 * clavier rapide (Enter pour valider).
 */

import { useEffect } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export interface AdminDocDeleteProps {
  open: boolean;
  /** Mode SINGLE : titre du doc à supprimer. Mode BULK : null. */
  singleTitle: string | null;
  /** Mode BULK : nombre de docs à supprimer. */
  bulkCount: number;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminDocDeleteModal({
  open,
  singleTitle,
  bulkCount,
  loading,
  error,
  onConfirm,
  onCancel,
}: AdminDocDeleteProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const isBulk = singleTitle === null;
  const headerLabel = isBulk
    ? `Supprimer ${bulkCount} document${bulkCount > 1 ? 's' : ''} ?`
    : 'Supprimer ce document ?';

  return (
    <>
      <style>{`
        @keyframes addmFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes addmRise {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes addmGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45), 0 18px 48px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 0 0 14px rgba(220, 38, 38, 0), 0 18px 48px rgba(0,0,0,0.4); }
        }
        @keyframes addmShake {
          0%, 100% { transform: rotate(0); }
          25%      { transform: rotate(-7deg); }
          50%      { transform: rotate(0); }
          75%      { transform: rotate(7deg); }
        }
        @keyframes addmShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .addm-bg {
          position: fixed; inset: 0; z-index: 100;
          background: radial-gradient(ellipse at center, rgba(60, 18, 18, 0.7) 0%, rgba(0,0,0,0.85) 80%);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: addmFade 0.2s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .addm-card {
          width: 100%; max-width: 480px;
          background: linear-gradient(180deg, #fffaf3 0%, #fff 60%);
          border-radius: 24px;
          border: 1px solid rgba(220, 38, 38, 0.2);
          overflow: hidden;
          animation: addmRise 0.34s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.5), 0 6px 20px rgba(220, 38, 38, 0.22);
          position: relative;
        }
        .addm-band {
          height: 6px;
          background: linear-gradient(90deg, #dc2626 0%, #f97316 50%, #dc2626 100%);
          background-size: 200% 100%;
          animation: addmShimmer 3s ease-in-out infinite;
        }
        .addm-icon {
          width: 76px; height: 76px;
          margin: 26px auto 14px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff 0%, #fee 60%, #fcc 100%);
          border: 2px solid rgba(220, 38, 38, 0.5);
          display: flex; align-items: center; justify-content: center;
          animation: addmGlow 2.4s ease-in-out infinite;
        }
        .addm-icon svg { animation: addmShake 1.6s ease-in-out infinite; color: #dc2626; }
        .addm-close {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(48,64,53,0.1);
          background: rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(48,64,53,0.55);
          transition: all 0.18s ease;
        }
        .addm-close:hover { background: rgba(220,38,38,0.08); color: #dc2626; border-color: rgba(220,38,38,0.3); }
        .addm-close:disabled { opacity: 0.4; cursor: not-allowed; }
        .addm-h2 {
          font-size: 22px; font-weight: 800;
          color: #1a1614; text-align: center;
          letter-spacing: -0.02em;
          margin: 0 28px 6px;
        }
        .addm-sub {
          font-size: 13px; color: rgba(48,64,53,0.65);
          text-align: center; margin: 0 32px 18px;
          line-height: 1.55;
        }
        .addm-pill {
          display: inline-block; padding: 4px 12px;
          background: rgba(48,64,53,0.08); color: #1a1614;
          border-radius: 999px; font-weight: 700; font-size: 13px;
          max-width: 80%; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; vertical-align: middle;
        }
        .addm-warn {
          margin: 0 24px;
          display: flex; gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          background: linear-gradient(135deg, #fff5f5 0%, #fef0e8 100%);
          border: 1px solid rgba(220, 38, 38, 0.22);
          color: #7c2d12;
          font-size: 12.5px; line-height: 1.5;
        }
        .addm-warn-icon { flex-shrink: 0; color: #dc2626; margin-top: 1px; }
        .addm-error {
          margin: 12px 24px 0;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #991b1b; font-size: 12px; font-weight: 500;
        }
        .addm-actions {
          display: flex; gap: 10px;
          padding: 18px 24px 22px; margin-top: 14px;
        }
        .addm-btn {
          flex: 1; padding: 12px 18px; border-radius: 14px;
          font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease; border: none;
          letter-spacing: 0.01em;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px;
        }
        .addm-cancel {
          background: rgba(48,64,53,0.06); color: #1a1614;
          border: 1px solid rgba(48,64,53,0.1);
        }
        .addm-cancel:hover:not(:disabled) {
          background: rgba(48,64,53,0.1); transform: translateY(-1px);
        }
        .addm-confirm {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          box-shadow: 0 6px 18px rgba(220,38,38,0.35);
        }
        .addm-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(220,38,38,0.45);
        }
        .addm-confirm:active:not(:disabled) { transform: translateY(0); }
        .addm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .addm-spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="addm-bg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addm-h2"
        onClick={() => { if (!loading) onCancel(); }}
      >
        <div className="addm-card" onClick={(e) => e.stopPropagation()}>
          <div className="addm-band" />
          <button
            type="button"
            className="addm-close"
            onClick={onCancel}
            disabled={loading}
            aria-label="Fermer"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>

          <div className="addm-icon">
            <Trash2 style={{ width: 32, height: 32 }} />
          </div>

          <h2 id="addm-h2" className="addm-h2">{headerLabel}</h2>

          <p className="addm-sub">
            {isBulk ? (
              <>
                Vous êtes sur le point de supprimer <strong>{bulkCount}</strong> document{bulkCount > 1 ? 's' : ''}{' '}
                administratif{bulkCount > 1 ? 's' : ''}. Cette action est <strong>définitive</strong>.
              </>
            ) : (
              <>
                Document : <span className="addm-pill">{singleTitle}</span><br />
                Cette action est <strong>définitive</strong> et ne peut pas être annulée.
              </>
            )}
          </p>

          <div className="addm-warn">
            <AlertTriangle className="addm-warn-icon" style={{ width: 16, height: 16 }} />
            <div>
              <strong>Tout sera supprimé</strong> : le fichier dans le stockage,
              ses métadonnées (description, tags, dates), ses versions liées et
              les liens de partage actifs. Une trace est conservée dans le journal d'audit.
            </div>
          </div>

          {error && <div className="addm-error" role="alert">{error}</div>}

          <div className="addm-actions">
            <button
              type="button"
              className="addm-btn addm-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              className="addm-btn addm-confirm"
              onClick={onConfirm}
              disabled={loading}
              autoFocus
            >
              {loading ? (
                <>
                  <Loader2 className="addm-spin" style={{ width: 16, height: 16 }} />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 style={{ width: 15, height: 15 }} />
                  {isBulk ? `Supprimer ${bulkCount}` : 'Oui, supprimer'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
