'use client';

/**
 * OngoingDossierDashboardModal — mini tableau de bord d'un dossier EN COURS.
 *
 * Affiche un aperçu rapide d'un dossier non-signé sans avoir à ouvrir la
 * page détaillée. Inclut : header (nom, statut, date création), KPIs
 * (sous-dossiers / documents / progression), liste des sous-dossiers avec
 * état (rempli / vide), et un lien vers la page complète du dossier.
 *
 * Design (14/07/2026) : ALIGNÉ sur le panneau « Tableau de bord » de la page
 * détail dossier (ddb-* dans app/(app)/dossiers/[id]/page.tsx). Les deux
 * tableaux de bord des dossiers en cours partagent donc le MÊME design :
 * header vert dégradé + anneau de progression + compteurs Validés / En attente
 * / Total + barre shimmer + lignes sous-dossiers. Ce composant embarque son
 * propre <style> car il vit sur la page LISTE (pas la page détail où le CSS
 * ddb-* est défini). Contenu conservé : coordonnées + « Ouvrir le dossier ».
 */

import Link from 'next/link';
import {
  X,
  LayoutDashboard,
  Check,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useDossierStore, type Dossier } from '@/store/useDossierStore';

interface Props {
  dossier: Dossier;
  onClose: () => void;
}

export function OngoingDossierDashboardModal({ dossier, onClose }: Props) {
  // Validation par étape : même source que le tableau de bord des dossiers
  // SIGNÉS (map echeancesValidees, persistée via dossierBoard) -> les cases
  // cochées tiennent en base et se synchronisent entre appareils.
  const echeancesValidees = useDossierStore((s) => s.echeancesValidees);
  const setEcheanceValidee = useDossierStore((s) => s.setEcheanceValidee);
  const validees = echeancesValidees[dossier.id] ?? {};
  const isValidated = (label: string) => validees[label] === true;

  const subfolders = dossier.subfolders ?? [];
  const NEST = ' ▸ ';
  // Regroupement au niveau PARENT : un sous-dossier imbriqué (ex. "X ▸ Y") est
  // compté dans son parent, jamais affiché comme une entrée séparée.
  const topSubfolders = subfolders.filter((sf) => {
    if (sf.label.includes(NEST)) return false;
    // Masque les boîtes système « Reçu / Documents intervenants ».
    const low = sf.label.trim().toLowerCase();
    return !((low.includes('reçu') && low.includes('intervenant')) || low.includes('documents intervenant'));
  });
  const folderDocCount = (label: string) =>
    subfolders.reduce(
      (sum, sf) =>
        sf.label === label || sf.label.startsWith(label + NEST)
          ? sum + (sf.documents?.length ?? 0)
          : sum,
      0,
    );

  const totalSubs = topSubfolders.length;
  const validatedSubs = topSubfolders.filter((sf) => isValidated(sf.label));
  const pendingSubs = topSubfolders.filter((sf) => !isValidated(sf.label));
  const progressPct = totalSubs > 0 ? Math.round((validatedSubs.length / totalSubs) * 100) : 0;
  const allDone = totalSubs > 0 && pendingSubs.length === 0;

  return (
    <>
      <style>{`
        @keyframes odbFadeBg {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        }
        @keyframes odbReveal {
          0%   { opacity: 0; transform: scale(0.82) rotate(-1deg); filter: blur(8px); }
          60%  { opacity: 1; transform: scale(1.02) rotate(0); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) rotate(0); filter: blur(0); }
        }
        @keyframes odbHaloRotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes odbRowIn {
          from { opacity: 0; transform: translateX(-14px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes odbRingPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
        @keyframes odbWarnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.55); }
          50%      { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
        }
        @keyframes odbShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes odbCountUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .odb-backdrop {
          position: fixed; inset: 0;
          background: radial-gradient(ellipse at center, rgba(48, 64, 53, 0.65) 0%, rgba(8, 12, 10, 0.85) 75%);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          z-index: 70;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: odbFadeBg 0.32s ease-out;
        }
        .odb-panel {
          width: min(620px, calc(100vw - 32px));
          max-height: min(88vh, 820px);
          overflow: hidden;
          background: #fff;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow:
            0 0 0 1px rgba(48, 64, 53, 0.06),
            0 40px 100px rgba(0, 0, 0, 0.45),
            0 12px 30px rgba(48, 64, 53, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          animation: odbReveal 0.55s cubic-bezier(0.34, 1.42, 0.64, 1);
          display: flex; flex-direction: column;
        }
        .odb-header {
          position: relative;
          padding: 20px 22px 24px;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 55%, #4a6552 100%);
          color: #fff;
          overflow: hidden;
        }
        .odb-header::before {
          content: '';
          position: absolute; top: -50%; left: -10%;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(217, 179, 138, 0.42) 0%, rgba(217, 179, 138, 0.1) 40%, transparent 70%);
          animation: odbHaloRotate 18s linear infinite;
          pointer-events: none;
        }
        .odb-header::after {
          content: '';
          position: absolute; bottom: -40%; right: -10%;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(74, 163, 80, 0.25) 0%, transparent 60%);
          animation: odbHaloRotate 24s linear infinite reverse;
          pointer-events: none;
        }
        .odb-header-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; position: relative; z-index: 1;
        }
        .odb-title-block { display: flex; align-items: center; gap: 12px; }
        .odb-title-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          color: #d9b38a;
        }
        .odb-title h3 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
        .odb-title p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.62); }
        .odb-close {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .odb-close:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }

        .odb-progress-block { margin-top: 16px; position: relative; z-index: 1; }
        .odb-progress-flex { display: flex; align-items: center; gap: 20px; margin-bottom: 14px; }
        .odb-circle-wrap {
          position: relative; width: 104px; height: 104px; flex-shrink: 0;
          animation: odbCountUp 0.6s ease-out 0.4s both;
        }
        .odb-circle-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .odb-circle-pct { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
        .odb-circle-pct-inner { display: inline-flex; align-items: center; gap: 1px; line-height: 1; transform: translateX(-3px); }
        .odb-circle-num { font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.04em; line-height: 1; text-shadow: 0 1px 8px rgba(217, 179, 138, 0.6); }
        .odb-circle-unit { font-size: 12px; color: rgba(255,255,255,0.72); font-weight: 700; line-height: 1; margin-left: 2px; align-self: flex-start; margin-top: 2px; }

        .odb-progress-stats { display: flex; flex: 1; gap: 14px; animation: odbCountUp 0.6s ease-out 0.55s both; }
        .odb-stats-row { flex: 1; display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
        .odb-stat-num { font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; }
        .odb-stat-ok { color: #86efac; text-shadow: 0 0 12px rgba(134, 239, 172, 0.4); }
        .odb-stat-warn { color: #fdba74; text-shadow: 0 0 12px rgba(253, 186, 116, 0.4); }
        .odb-stat-total { color: rgba(255,255,255,0.95); }
        .odb-stat-label { font-size: 9.5px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-top: 4px; }
        .odb-stat-divider { width: 1px; height: 32px; align-self: center; background: rgba(255,255,255,0.12); }

        .odb-progress-bar {
          height: 8px; border-radius: 999px;
          background: rgba(255,255,255,0.1); overflow: hidden; position: relative;
          border: 1px solid rgba(255,255,255,0.08);
          animation: odbCountUp 0.6s ease-out 0.7s both;
        }
        .odb-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #d9b38a 0%, #f0c785 50%, #d9b38a 100%);
          background-size: 200% 100%;
          animation: odbShimmer 2.4s linear infinite;
          border-radius: 999px;
          transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 12px rgba(217, 179, 138, 0.5);
        }
        .odb-all-done-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 999px;
          background: rgba(34, 197, 94, 0.18); border: 1px solid rgba(34, 197, 94, 0.45);
          color: #86efac; font-size: 11px; font-weight: 700; margin-top: 8px;
          position: relative; z-index: 1;
        }

        .odb-body { flex: 1; overflow-y: auto; padding: 14px 16px 18px; background: linear-gradient(180deg, #fbf8f3 0%, #fff 30%); }

        .odb-contact {
          display: flex; flex-wrap: wrap; gap: 6px 16px;
          padding: 10px 12px; margin-bottom: 12px;
          border-radius: 12px; background: rgba(48,64,53,0.04);
          border: 1px solid rgba(48,64,53,0.06);
          font-size: 11px; color: rgba(48,64,53,0.6);
        }
        .odb-contact span { display: inline-flex; align-items: center; gap: 5px; }

        .odb-section-title {
          font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(48, 64, 53, 0.45); margin: 4px 4px 8px;
          display: flex; align-items: center; gap: 6px;
        }
        .odb-section-title:not(:first-child) { margin-top: 16px; }

        .odb-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 14px;
          background: #fff; border: 1px solid rgba(48, 64, 53, 0.08);
          margin-bottom: 8px; transition: all 0.15s ease;
          animation: odbRowIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .odb-row-validated { background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%); border-color: rgba(34, 197, 94, 0.25); }
        .odb-row-pending   { background: linear-gradient(135deg, #fff7ed 0%, #fff 100%); border-color: rgba(249, 115, 22, 0.28); }
        .odb-icon-circle { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .odb-icon-validated { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; animation: odbRingPulse 2.5s ease-in-out infinite; }
        .odb-icon-pending   { background: linear-gradient(135deg, #fb923c, #ea580c); color: #fff; animation: odbWarnPulse 2.5s ease-in-out infinite; }
        .odb-row-label { flex: 1; min-width: 0; font-size: 13px; font-weight: 700; color: #1a1614; }
        .odb-row-meta { font-size: 11px; color: rgba(48, 64, 53, 0.5); margin-top: 2px; font-weight: 500; }
        .odb-row-date { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; flex-shrink: 0; }
        .odb-row-date-ok { background: rgba(34, 197, 94, 0.12); color: #15803d; }
        .odb-row-date-warn { background: rgba(249, 115, 22, 0.12); color: #c2410c; }

        .odb-validate-btn {
          display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
          padding: 7px 13px; border-radius: 9px; border: none; cursor: pointer;
          font-size: 11.5px; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 3px 10px rgba(34, 197, 94, 0.3);
          transition: filter 0.15s ease, transform 0.15s ease;
        }
        .odb-validate-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .odb-unvalidate-btn {
          display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
          padding: 6px 11px; border-radius: 9px; cursor: pointer;
          font-size: 11px; font-weight: 700;
          border: 1px solid rgba(48, 64, 53, 0.15); background: #fff; color: rgba(48, 64, 53, 0.55);
          transition: all 0.15s ease;
        }
        .odb-unvalidate-btn:hover { border-color: rgba(220, 38, 38, 0.4); color: #dc2626; }

        .odb-empty { padding: 32px 16px; text-align: center; color: rgba(48, 64, 53, 0.4); font-size: 13px; border: 1px dashed rgba(48,64,53,0.15); border-radius: 12px; }

        .odb-footer {
          padding: 14px 22px; border-top: 1px solid rgba(48,64,53,0.08);
          background: #fafaf8; display: flex; justify-content: space-between; align-items: center; gap: 10px;
        }
        .odb-btn-secondary {
          padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(48,64,53,0.15);
          background: #fff; font-size: 12px; font-weight: 600; color: #304035; cursor: pointer;
        }
        .odb-btn-primary {
          padding: 8px 16px; border-radius: 10px;
          background: linear-gradient(135deg, #304035, #4a6358);
          font-size: 12px; font-weight: 700; color: #fff; text-decoration: none;
          display: inline-flex; align-items: center; gap: 6px;
          box-shadow: 0 4px 14px rgba(48,64,53,0.25);
        }
      `}</style>

      <div className="odb-backdrop" onClick={onClose}>
        <div className="odb-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Tableau de bord du dossier">
          {/* Header vert dégradé + anneau + compteurs */}
          <div className="odb-header">
            <div className="odb-header-row">
              <div className="odb-title-block">
                <div className="odb-title-icon"><LayoutDashboard className="h-5 w-5" /></div>
                <div className="odb-title">
                  <h3>Tableau de bord</h3>
                  <p>{dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''} · {totalSubs} sous-dossier{totalSubs > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button type="button" className="odb-close" onClick={onClose} aria-label="Fermer le tableau de bord">
                <X className="h-4 w-4" />
              </button>
            </div>

            {totalSubs > 0 && (
              <div className="odb-progress-block">
                <div className="odb-progress-flex">
                  <div className="odb-circle-wrap">
                    <svg viewBox="0 0 100 100" className="odb-circle-svg" aria-hidden="true">
                      <defs>
                        <linearGradient id="odbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f0c785" />
                          <stop offset="50%" stopColor="#d9b38a" />
                          <stop offset="100%" stopColor="#c89a64" />
                        </linearGradient>
                        <filter id="odbGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="2" result="b" />
                          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke="url(#odbGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="264"
                        strokeDashoffset={264 - (264 * progressPct) / 100}
                        transform="rotate(-90 50 50)"
                        filter="url(#odbGlow)"
                        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
                      />
                    </svg>
                    <div className="odb-circle-pct">
                      <span className="odb-circle-pct-inner">
                        <span className="odb-circle-num">{progressPct}</span>
                        <span className="odb-circle-unit">%</span>
                      </span>
                    </div>
                  </div>

                  <div className="odb-progress-stats">
                    <div className="odb-stats-row">
                      <span className="odb-stat-num odb-stat-ok">{validatedSubs.length}</span>
                      <span className="odb-stat-label">Validés</span>
                    </div>
                    <div className="odb-stat-divider" />
                    <div className="odb-stats-row">
                      <span className="odb-stat-num odb-stat-warn">{pendingSubs.length}</span>
                      <span className="odb-stat-label">En attente</span>
                    </div>
                    <div className="odb-stat-divider" />
                    <div className="odb-stats-row">
                      <span className="odb-stat-num odb-stat-total">{totalSubs}</span>
                      <span className="odb-stat-label">Total</span>
                    </div>
                  </div>
                </div>

                <div className="odb-progress-bar">
                  <div className="odb-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                {allDone && (
                  <div className="odb-all-done-badge">
                    <Check className="h-3 w-3" />
                    Dossier complet — tous les sous-dossiers validés
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Body — coordonnées + sous-dossiers */}
          <div className="odb-body">
            {/* Coordonnées rapides (contenu propre à ce tableau de bord) */}
            {(dossier.phone || dossier.email || dossier.address || dossier.createdAt) && (
              <div className="odb-contact">
                {dossier.createdAt && <span><Calendar size={11} /> Créé le {dossier.createdAt}</span>}
                {dossier.phone && <span><Phone size={11} /> {dossier.phone}</span>}
                {dossier.email && <span><Mail size={11} /> {dossier.email}</span>}
                {dossier.address && <span><MapPin size={11} /> {dossier.address}</span>}
              </div>
            )}

            {totalSubs === 0 ? (
              <div className="odb-empty">Ce dossier ne contient pas encore de sous-dossier.</div>
            ) : (
              <>
                {pendingSubs.length > 0 && (
                  <>
                    <div className="odb-section-title">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      En attente · {pendingSubs.length}
                    </div>
                    {pendingSubs.map((sf, i) => {
                      const docsCount = folderDocCount(sf.label);
                      return (
                        <div key={`p-${sf.label}`} className="odb-row odb-row-pending" style={{ animationDelay: `${i * 60}ms` }}>
                          <div className="odb-icon-circle odb-icon-pending"><AlertTriangle className="h-4 w-4" /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="odb-row-label">{sf.label}</div>
                            <div className="odb-row-meta">
                              {docsCount === 0 ? 'Vide · à compléter' : `${docsCount} document${docsCount > 1 ? 's' : ''}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="odb-validate-btn"
                            onClick={() => setEcheanceValidee(dossier.id, sf.label, true)}
                            title="Marquer cette étape comme validée"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Valider
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}

                {validatedSubs.length > 0 && (
                  <>
                    <div className="odb-section-title">
                      <Check className="h-3 w-3 text-green-600" />
                      Validés · {validatedSubs.length}
                    </div>
                    {validatedSubs.map((sf, i) => (
                      <div key={`v-${sf.label}`} className="odb-row odb-row-validated" style={{ animationDelay: `${(pendingSubs.length + i) * 60}ms` }}>
                        <div className="odb-icon-circle odb-icon-validated"><Check className="h-4 w-4" strokeWidth={3} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="odb-row-label">{sf.label}</div>
                          <div className="odb-row-meta">Validé{sf.date ? ` le ${sf.date}` : ''}</div>
                        </div>
                        <button
                          type="button"
                          className="odb-unvalidate-btn"
                          onClick={() => setEcheanceValidee(dossier.id, sf.label, false)}
                          title="Annuler la validation"
                        >
                          <X className="h-3 w-3" /> Annuler
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer — Fermer + Ouvrir le dossier (fonction propre à ce modal) */}
          <div className="odb-footer">
            <button onClick={onClose} className="odb-btn-secondary">Fermer</button>
            <Link href={`/dossiers/${dossier.id}`} className="odb-btn-primary">
              Ouvrir le dossier <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
