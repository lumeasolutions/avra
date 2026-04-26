'use client';

/**
 * DateButoireValidationModal — modale "wahou" qui force la saisie des dates
 * butoires pour CHAQUE sous-dossier signé avant de valider le projet.
 *
 * Sans dates butoires, l'équipe perd la traçabilité des deadlines projet.
 * Cette modale est BLOQUANTE : le bouton "Valider le projet" reste désactivé
 * tant qu'au moins une date manque.
 *
 * Effet wahou :
 *  - Entrée scale 0.85 → 1.02 → 1 avec rebond cubic-bezier
 *  - Backdrop blur progressif + radial gradient sombre
 *  - Halo doré rotatif derrière le header + sparkles animés
 *  - Icône calendar dans un cercle qui pulse en boucle
 *  - Barre de progression dorée qui se remplit au fur et à mesure
 *  - Bouton "Valider" avec shimmer + glow quand tout est rempli
 *  - Bouton "Pré-remplir" pour suggérer des dates intelligentes (workflow type)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  X, Calendar, Sparkles, AlertTriangle, Check, Loader2,
  AlertCircle, Wand2, FileCheck,
} from 'lucide-react';

export interface DateButoireValidationProps {
  open: boolean;
  /** Liste des labels de sous-dossiers signés à dater. */
  signedSubfolders: string[];
  /** Date d'aujourd'hui pré-formatée (passée par le parent pour SSR-safe). */
  loading?: boolean;
  /** Appelé avec un Record<label, date> (format YYYY-MM-DD) quand tout OK. */
  onConfirm: (dates: Record<string, string>) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Suggestions de délais par défaut pour les sous-dossiers signés courants.
 * Délai en jours depuis aujourd'hui. Override possible si label inconnu (J+30).
 */
const DEFAULT_DELAYS: Record<string, number> = {
  'DOSSIER AVANT VENTE':   0,
  'PROJET VERSION 3':      7,
  'RELEVE DE MESURES':    10,
  'SUIVI DE CHANTIER':    14,
  'PLAN TECHNIQUE DCE':   30,
  'PERMIS DE CONSTRUIRE': 30,
  'COMMANDES':            45,
  'LIVRAISONS':           90,
  'FICHE DE POSE':        95,
  'RECEPTION CHANTIER':  120,
  'SAV':                 180,
};

function suggestDate(label: string): string {
  const days = DEFAULT_DELAYS[label] ?? 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtFr(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dayDelta(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400_000);
}

export function DateButoireValidationModal({
  open, signedSubfolders, loading, onConfirm, onCancel,
}: DateButoireValidationProps) {
  const [dates, setDates] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setDates({});
    setError(null);
  }, [open]);

  // Escape ferme (sauf pendant submit)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, submitting, loading, onCancel]);

  const filledCount = useMemo(
    () => signedSubfolders.filter(l => !!dates[l]).length,
    [signedSubfolders, dates],
  );
  const total = signedSubfolders.length;
  const allFilled = total > 0 && filledCount === total;
  const progressPct = total === 0 ? 0 : Math.round((filledCount / total) * 100);

  const today = new Date().toISOString().slice(0, 10);

  const handlePrefill = () => {
    const next: Record<string, string> = {};
    for (const label of signedSubfolders) {
      next[label] = suggestDate(label);
    }
    setDates(next);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!allFilled) {
      setError('Toutes les dates butoires doivent être renseignées avant la validation.');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      await onConfirm(dates);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la validation');
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes dbvFade {
          from { opacity: 0; backdrop-filter: blur(0); -webkit-backdrop-filter: blur(0); }
          to   { opacity: 1; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        }
        @keyframes dbvReveal {
          0%   { opacity: 0; transform: scale(0.86) rotate(-1deg); filter: blur(8px); }
          60%  { opacity: 1; transform: scale(1.02) rotate(0); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) rotate(0); filter: blur(0); }
        }
        @keyframes dbvHaloRot { to { transform: rotate(360deg); } }
        @keyframes dbvIconPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217, 179, 138, 0.55); }
          50%      { box-shadow: 0 0 0 14px rgba(217, 179, 138, 0); }
        }
        @keyframes dbvSparkle {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          15%  { opacity: 1; }
          50%  { transform: translateY(-12px) scale(1.15); opacity: 0.85; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-30px) scale(0.85); opacity: 0; }
        }
        @keyframes dbvShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes dbvRowIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .dbv-bg {
          position: fixed; inset: 0; z-index: 90;
          background: radial-gradient(ellipse at center, rgba(48,64,53,0.65) 0%, rgba(8,12,10,0.88) 75%);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          animation: dbvFade 0.32s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .dbv-card {
          width: 100%; max-width: 620px;
          max-height: min(90vh, 820px);
          background: #fff;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow:
            0 0 0 1px rgba(48,64,53,0.06),
            0 40px 100px rgba(0,0,0,0.5),
            0 12px 30px rgba(48,64,53,0.22),
            inset 0 1px 0 rgba(255,255,255,0.9);
          animation: dbvReveal 0.55s cubic-bezier(0.34, 1.42, 0.64, 1);
          display: flex; flex-direction: column;
          overflow: hidden;
        }

        .dbv-head {
          position: relative; overflow: hidden; flex-shrink: 0;
          padding: 22px 24px 24px;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 55%, #4a6552 100%);
          color: #fff;
        }
        .dbv-head::before, .dbv-head::after {
          content: ''; position: absolute; pointer-events: none;
          border-radius: 50%;
        }
        .dbv-head::before {
          top: -45%; left: -8%; width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(217,179,138,0.42) 0%, rgba(217,179,138,0.1) 40%, transparent 70%);
          animation: dbvHaloRot 18s linear infinite;
        }
        .dbv-head::after {
          bottom: -38%; right: -6%; width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(74,163,80,0.25) 0%, transparent 60%);
          animation: dbvHaloRot 24s linear infinite reverse;
        }
        .dbv-spark {
          position: absolute; width: 4px; height: 4px;
          border-radius: 50%; background: #d9b38a;
          box-shadow: 0 0 8px rgba(217,179,138,0.9), 0 0 14px rgba(217,179,138,0.4);
          animation: dbvSparkle 3.6s ease-in-out infinite;
          pointer-events: none;
        }

        .dbv-row { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .dbv-titles { display: flex; align-items: center; gap: 14px; }
        .dbv-icon {
          width: 52px; height: 52px; border-radius: 16px;
          background: radial-gradient(circle at 30% 30%, #f4d6a8 0%, #d9b38a 50%, #b88c5c 100%);
          color: #2a3a30; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          animation: dbvIconPulse 2.4s ease-in-out infinite;
          box-shadow: 0 6px 18px rgba(217,179,138,0.4);
        }
        .dbv-titles h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
        .dbv-titles p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.65); }

        .dbv-close {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .dbv-close:hover:not(:disabled) { background: rgba(255,255,255,0.22); transform: rotate(90deg); }
        .dbv-close:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Progression */
        .dbv-progress { position: relative; z-index: 1; margin-top: 18px; }
        .dbv-progress-stats {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 8px;
        }
        .dbv-progress-pct {
          font-size: 24px; font-weight: 800; color: #fff;
          letter-spacing: -0.02em; line-height: 1;
        }
        .dbv-progress-pct.complete { color: #86efac; text-shadow: 0 0 14px rgba(134,239,172,0.5); }
        .dbv-progress-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.6); font-weight: 700;
        }
        .dbv-progress-bar {
          height: 8px; border-radius: 999px;
          background: rgba(255,255,255,0.12);
          overflow: hidden; border: 1px solid rgba(255,255,255,0.08);
        }
        .dbv-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #d9b38a 0%, #f0c785 50%, #d9b38a 100%);
          background-size: 200% 100%;
          animation: dbvShimmer 2.4s linear infinite;
          border-radius: 999px;
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 12px rgba(217,179,138,0.5);
        }
        .dbv-progress-fill.complete {
          background: linear-gradient(90deg, #22c55e 0%, #86efac 50%, #22c55e 100%);
          background-size: 200% 100%;
          box-shadow: 0 0 14px rgba(134,239,172,0.7);
        }

        /* Body — liste sous-dossiers */
        .dbv-body {
          flex: 1; overflow-y: auto;
          padding: 18px 22px;
          background: linear-gradient(180deg, #fbf8f3 0%, #fff 100%);
        }
        .dbv-warn {
          display: flex; gap: 10px;
          padding: 12px 14px;
          margin-bottom: 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
          border: 1px solid rgba(249,115,22,0.25);
          color: #9a3412;
          font-size: 12.5px; line-height: 1.5;
        }
        .dbv-warn-icon { color: #ea580c; flex-shrink: 0; margin-top: 1px; }

        .dbv-prefill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; margin-bottom: 14px;
          border-radius: 10px;
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          border: 1px solid rgba(166,119,73,0.3);
          color: #7c4f1d; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.18s ease;
        }
        .dbv-prefill:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(166,119,73,0.25);
          border-color: #a67749;
        }
        .dbv-prefill:disabled { opacity: 0.5; cursor: not-allowed; }

        .dbv-list { display: flex; flex-direction: column; gap: 8px; }
        .dbv-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(48,64,53,0.1);
          transition: all 0.16s ease;
          animation: dbvRowIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .dbv-item:hover { border-color: rgba(166,119,73,0.4); }
        .dbv-item.filled {
          background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%);
          border-color: rgba(34,197,94,0.3);
        }
        .dbv-item-bullet {
          width: 28px; height: 28px; border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800;
          background: rgba(48,64,53,0.08);
          color: rgba(48,64,53,0.55);
          border: 1px solid rgba(48,64,53,0.1);
          transition: all 0.2s ease;
        }
        .dbv-item.filled .dbv-item-bullet {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff; border-color: #16a34a;
          box-shadow: 0 4px 10px rgba(34,197,94,0.3);
        }
        .dbv-item-label {
          flex: 1; min-width: 0;
          font-size: 13px; font-weight: 700;
          color: #1a1614;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dbv-item-input {
          flex-shrink: 0; width: 165px;
          padding: 8px 10px;
          border: 1px solid rgba(48,64,53,0.15);
          border-radius: 8px;
          background: #fff;
          font-size: 12px; color: #1a1614;
          font-family: inherit;
          transition: all 0.16s ease;
        }
        .dbv-item-input:focus {
          outline: none;
          border-color: #a67749;
          box-shadow: 0 0 0 3px rgba(166,119,73,0.18);
        }
        .dbv-item.filled .dbv-item-input { border-color: rgba(34,197,94,0.4); background: #fff; }
        .dbv-item-delta {
          flex-shrink: 0;
          font-size: 10.5px; font-weight: 700;
          color: rgba(48,64,53,0.55);
          font-family: 'Courier New', monospace;
          min-width: 50px; text-align: right;
        }
        .dbv-item.filled .dbv-item-delta { color: #16a34a; }

        /* Footer */
        .dbv-foot {
          flex-shrink: 0;
          display: flex; gap: 10px; justify-content: flex-end;
          padding: 16px 22px;
          border-top: 1px solid rgba(48,64,53,0.08);
          background: rgba(48,64,53,0.02);
        }
        .dbv-error {
          flex: 1;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #b91c1c; font-weight: 600;
          margin-right: 10px;
        }

        .dbv-btn {
          padding: 11px 22px; border-radius: 12px;
          font-size: 13px; font-weight: 800;
          cursor: pointer; transition: all 0.2s ease; border: none;
          display: inline-flex; align-items: center; gap: 8px;
          letter-spacing: 0.01em;
        }
        .dbv-cancel {
          background: rgba(48,64,53,0.05); color: #1a1614;
          border: 1px solid rgba(48,64,53,0.1);
        }
        .dbv-cancel:hover:not(:disabled) { background: rgba(48,64,53,0.1); }

        .dbv-confirm {
          background: linear-gradient(135deg, rgba(48,64,53,0.6) 0%, rgba(48,64,53,0.5) 100%);
          color: rgba(255,255,255,0.7);
          cursor: not-allowed;
          position: relative; overflow: hidden;
        }
        .dbv-confirm.ready {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #fff; cursor: pointer;
          box-shadow: 0 8px 22px rgba(34,197,94,0.4);
          animation: dbvIconPulse 2s ease-in-out infinite;
        }
        .dbv-confirm.ready:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(34,197,94,0.5);
        }
        .dbv-confirm.ready::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%);
          transform: translateX(-100%);
          animation: dbv-shine 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes dbv-shine {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        .dbv-confirm:disabled, .dbv-confirm:disabled:hover {
          background: linear-gradient(135deg, rgba(48,64,53,0.5) 0%, rgba(48,64,53,0.4) 100%);
          color: rgba(255,255,255,0.7);
          cursor: not-allowed;
          box-shadow: none;
          transform: none; animation: none;
        }
        .dbv-confirm.submitting { animation: none; cursor: wait; }
        .dbv-spin { animation: dbv-spin 0.9s linear infinite; }
        @keyframes dbv-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="dbv-bg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dbv-h2"
        onClick={() => { if (!submitting && !loading) onCancel(); }}
      >
        <div className="dbv-card" onClick={(e) => e.stopPropagation()}>
          <div className="dbv-head">
            {/* Sparkles */}
            {[
              { left: '14%', bottom: '18%', delay: '0s' },
              { left: '36%', bottom: '60%', delay: '0.7s' },
              { left: '58%', bottom: '24%', delay: '1.4s' },
              { left: '82%', bottom: '50%', delay: '0.4s' },
              { left: '92%', bottom: '14%', delay: '2.1s' },
              { left: '24%', bottom: '78%', delay: '1.8s' },
            ].map((p, i) => (
              <span key={i} className="dbv-spark" style={{ left: p.left, bottom: p.bottom, animationDelay: p.delay }} />
            ))}

            <div className="dbv-row">
              <div className="dbv-titles">
                <div className="dbv-icon"><Calendar style={{ width: 26, height: 26 }} /></div>
                <div>
                  <h2 id="dbv-h2">Dates butoires obligatoires</h2>
                  <p>Renseignez les échéances avant de valider le projet</p>
                </div>
              </div>
              <button
                type="button"
                className="dbv-close"
                onClick={onCancel}
                disabled={submitting || loading}
                aria-label="Fermer"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="dbv-progress">
              <div className="dbv-progress-stats">
                <span className={`dbv-progress-pct${allFilled ? ' complete' : ''}`}>{progressPct}%</span>
                <span className="dbv-progress-label">{filledCount} / {total} dates renseignées</span>
              </div>
              <div className="dbv-progress-bar">
                <div className={`dbv-progress-fill${allFilled ? ' complete' : ''}`} style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>

          <div className="dbv-body">
            <div className="dbv-warn">
              <AlertTriangle className="dbv-warn-icon" style={{ width: 16, height: 16 }} />
              <div>
                Sans dates butoires, l'équipe perd la traçabilité des deadlines projet.
                <strong> La validation est bloquée tant que toutes les dates ne sont pas saisies.</strong>
              </div>
            </div>

            <button
              type="button"
              className="dbv-prefill"
              onClick={handlePrefill}
              disabled={submitting || loading}
              title="Remplit avec des délais standards (modifiables ensuite)"
            >
              <Wand2 style={{ width: 12, height: 12 }} />
              <Sparkles style={{ width: 11, height: 11 }} />
              Pré-remplir avec des délais standards
            </button>

            <div className="dbv-list">
              {signedSubfolders.map((label, i) => {
                const value = dates[label] ?? '';
                const isFilled = !!value;
                const delta = isFilled ? dayDelta(value) : 0;
                return (
                  <div
                    key={label}
                    className={`dbv-item${isFilled ? ' filled' : ''}`}
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <div className="dbv-item-bullet">
                      {isFilled ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
                    </div>
                    <span className="dbv-item-label" title={label}>{label}</span>
                    {isFilled && (
                      <span className="dbv-item-delta">
                        {delta === 0 ? "aujourd'hui" : delta > 0 ? `J+${delta}` : `J${delta}`}
                      </span>
                    )}
                    <input
                      type="date"
                      className="dbv-item-input"
                      min={today}
                      value={value}
                      onChange={(e) => setDates((s) => ({ ...s, [label]: e.target.value }))}
                      disabled={submitting || loading}
                      aria-label={`Date butoire pour ${label}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dbv-foot">
            {error && (
              <div className="dbv-error" role="alert">
                <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            )}
            <button
              type="button"
              className="dbv-btn dbv-cancel"
              onClick={onCancel}
              disabled={submitting || loading}
            >
              Annuler
            </button>
            <button
              type="button"
              className={`dbv-btn dbv-confirm${allFilled ? ' ready' : ''}${submitting ? ' submitting' : ''}`}
              onClick={handleSubmit}
              disabled={!allFilled || submitting || loading}
            >
              {submitting || loading ? (
                <>
                  <Loader2 className="dbv-spin" style={{ width: 14, height: 14 }} />
                  Validation…
                </>
              ) : (
                <>
                  <FileCheck style={{ width: 14, height: 14 }} />
                  {allFilled ? 'Valider le projet' : `Encore ${total - filledCount} date${total - filledCount > 1 ? 's' : ''}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
