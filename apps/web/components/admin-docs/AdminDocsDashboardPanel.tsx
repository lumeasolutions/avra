'use client';

/**
 * AdminDocsDashboardPanel — panel flottant centré, version "wahou".
 * Affiche les KPIs admin docs : total, espace utilisé, répartition par
 * catégorie, alertes d'expiration (à J-30 et expirés), dernier upload.
 *
 * Cohérent visuellement avec les Dashboards des dossiers : aura lumineuse,
 * animation reveal cubic-bezier, header gradient + halos rotatifs, sparkles.
 */

import { useEffect } from 'react';
import {
  X, LayoutDashboard, AlertTriangle, Clock, FileText,
  Building2, Shield, Package, Users, Briefcase, FolderOpen,
  Calendar, Database,
} from 'lucide-react';
import type { AdminStats } from '@/store/useAdminDocsStore';
import { formatBytes } from '@/store/useAdminDocsStore';

const CAT_ICONS: Record<string, React.ElementType> = {
  Juridique: Building2,
  Assurances: Shield,
  Fournisseurs: Package,
  RH: Users,
  Divers: Briefcase,
};

const CAT_COLORS: Record<string, string> = {
  Juridique: '#4a7ec0',
  Assurances: '#22c55e',
  Fournisseurs: '#a67749',
  RH: '#c04aa3',
  Divers: '#6b7280',
};

export interface AdminDocsDashboardProps {
  open: boolean;
  stats: AdminStats | null;
  loading: boolean;
  onClose: () => void;
  onCategoryClick?: (category: string) => void;
  onDocClick?: (id: string) => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400_000);
}

export function AdminDocsDashboardPanel({
  open, stats, loading, onClose, onCategoryClick, onDocClick,
}: AdminDocsDashboardProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const total = stats?.total ?? 0;
  const totalAllVersions = stats?.totalAllVersions ?? 0;
  const totalBytes = stats?.totalBytes ?? 0;
  const expiringSoon = stats?.expiringSoon ?? [];
  const expired = stats?.expired ?? [];
  const byCategory = stats?.byCategory ?? {};
  const latest = stats?.latest;

  const totalAlerts = expiringSoon.length + expired.length;

  return (
    <>
      <style>{`
        @keyframes addbFade {
          from { opacity: 0; backdrop-filter: blur(0); -webkit-backdrop-filter: blur(0); }
          to   { opacity: 1; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        }
        @keyframes addbReveal {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.84) rotate(-1deg); filter: blur(7px); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.02) rotate(0); filter: blur(0); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0); filter: blur(0); }
        }
        @keyframes addbHaloRot { to { transform: rotate(360deg); } }
        @keyframes addbAura {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes addbSparkle {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          15%  { opacity: 1; }
          50%  { transform: translateY(-10px) scale(1.1); opacity: 0.85; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-26px) scale(0.85); opacity: 0; }
        }
        @keyframes addbStagger {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes addbWarnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
          50%      { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
        }

        .addb-bg {
          position: fixed; inset: 0; z-index: 70;
          background: radial-gradient(ellipse at center, rgba(48,64,53,0.62) 0%, rgba(8,12,10,0.85) 75%);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: addbFade 0.3s ease-out;
        }
        .addb-aura {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: min(840px, calc(100vw - 24px));
          height: 70vh; max-height: 760px;
          z-index: 75;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 30% 20%, rgba(217,179,138,0.4), transparent 55%),
            radial-gradient(ellipse at 70% 80%, rgba(74,163,80,0.32), transparent 55%);
          filter: blur(40px);
          animation: addbAura 4s ease-in-out infinite;
          border-radius: 50%;
        }
        .addb-panel {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 80;
          width: min(740px, calc(100vw - 32px));
          max-height: min(86vh, 800px);
          overflow: hidden;
          background: #fff;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow:
            0 0 0 1px rgba(48,64,53,0.06),
            0 36px 90px rgba(0,0,0,0.45),
            0 10px 26px rgba(48,64,53,0.2),
            inset 0 1px 0 rgba(255,255,255,0.9);
          animation: addbReveal 0.5s cubic-bezier(0.34, 1.42, 0.64, 1);
          display: flex; flex-direction: column;
        }
        .addb-head {
          position: relative; overflow: hidden;
          padding: 20px 22px 22px;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 55%, #4a6552 100%);
          color: #fff;
        }
        .addb-head::before, .addb-head::after {
          content: ''; position: absolute; pointer-events: none;
          border-radius: 50%;
        }
        .addb-head::before {
          top: -50%; left: -8%; width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(217,179,138,0.42) 0%, rgba(217,179,138,0.1) 40%, transparent 70%);
          animation: addbHaloRot 18s linear infinite;
        }
        .addb-head::after {
          bottom: -38%; right: -6%; width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(74,163,80,0.25) 0%, transparent 60%);
          animation: addbHaloRot 24s linear infinite reverse;
        }
        .addb-spark {
          position: absolute; width: 4px; height: 4px;
          border-radius: 50%; background: #d9b38a;
          box-shadow: 0 0 8px rgba(217,179,138,0.9), 0 0 14px rgba(217,179,138,0.4);
          animation: addbSparkle 3.6s ease-in-out infinite;
          pointer-events: none;
        }
        .addb-row {
          position: relative; z-index: 1;
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px;
        }
        .addb-title-block { display: flex; align-items: center; gap: 12px; }
        .addb-title-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          color: #d9b38a;
        }
        .addb-title h3 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
        .addb-title p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.6); }
        .addb-close {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
          position: relative; z-index: 2;
        }
        .addb-close:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }

        /* KPI strip dans le header */
        .addb-kpis {
          position: relative; z-index: 1;
          margin-top: 16px;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
          animation: addbStagger 0.5s ease-out 0.1s both;
        }
        .addb-kpi {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 14px; padding: 12px 14px;
          backdrop-filter: blur(6px);
        }
        .addb-kpi-num {
          font-size: 22px; font-weight: 800; color: #fff; line-height: 1;
          letter-spacing: -0.02em;
        }
        .addb-kpi-num-warn { color: #fdba74; text-shadow: 0 0 14px rgba(253,186,116,0.45); }
        .addb-kpi-num-danger { color: #fca5a5; text-shadow: 0 0 14px rgba(252,165,165,0.45); }
        .addb-kpi-num-ok { color: #86efac; text-shadow: 0 0 14px rgba(134,239,172,0.4); }
        .addb-kpi-label {
          font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.6); font-weight: 700; margin-top: 5px;
        }

        /* Body */
        .addb-body {
          flex: 1; overflow-y: auto;
          padding: 16px 18px 20px;
          background: linear-gradient(180deg, #fbf8f3 0%, #fff 30%);
        }
        .addb-section {
          animation: addbStagger 0.5s ease-out both;
          margin-bottom: 16px;
        }
        .addb-section:nth-child(1) { animation-delay: 0.18s; }
        .addb-section:nth-child(2) { animation-delay: 0.28s; }
        .addb-section:nth-child(3) { animation-delay: 0.38s; }

        .addb-section-head {
          display: flex; align-items: center; gap: 8px;
          font-size: 10.5px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(48,64,53,0.55);
          margin: 8px 4px;
        }
        .addb-section-count {
          font-size: 10px; padding: 2px 8px; border-radius: 999px;
          background: rgba(48,64,53,0.08); color: rgba(48,64,53,0.7);
          font-weight: 700;
        }
        .addb-section-count-warn { background: rgba(220,38,38,0.12); color: #b91c1c; }

        /* Catégories */
        .addb-cats {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 8px;
        }
        .addb-cat {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: #fff;
          border: 1px solid rgba(48,64,53,0.08);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: left;
        }
        .addb-cat:hover {
          border-color: var(--cat-color, rgba(48,64,53,0.3));
          box-shadow: 0 4px 14px rgba(48,64,53,0.08);
          transform: translateY(-1px);
        }
        .addb-cat-icon {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .addb-cat-info { min-width: 0; flex: 1; }
        .addb-cat-name { font-size: 12px; font-weight: 700; color: #1a1614; line-height: 1.1; }
        .addb-cat-count { font-size: 11px; color: rgba(48,64,53,0.5); margin-top: 2px; }

        /* Alertes */
        .addb-alert {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.16s ease;
        }
        .addb-alert:hover { transform: translateX(2px); }
        .addb-alert-warn {
          background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
          border: 1px solid rgba(249,115,22,0.25);
        }
        .addb-alert-warn:hover { border-color: rgba(249,115,22,0.5); }
        .addb-alert-danger {
          background: linear-gradient(135deg, #fef2f2 0%, #fff 100%);
          border: 1px solid rgba(220,38,38,0.28);
        }
        .addb-alert-danger:hover { border-color: rgba(220,38,38,0.55); }
        .addb-alert-icon {
          width: 32px; height: 32px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .addb-alert-icon-warn { background: linear-gradient(135deg,#fb923c,#ea580c); color:#fff; }
        .addb-alert-icon-danger {
          background: linear-gradient(135deg,#dc2626,#b91c1c); color:#fff;
          animation: addbWarnPulse 2.4s ease-in-out infinite;
        }
        .addb-alert-name { font-size: 13px; font-weight: 700; color: #1a1614; line-height: 1.2; }
        .addb-alert-meta { font-size: 11px; margin-top: 2px; font-weight: 600; }
        .addb-alert-meta-warn { color: #c2410c; }
        .addb-alert-meta-danger { color: #991b1b; }
        .addb-alert-date {
          font-family: 'Courier New', monospace;
          font-size: 11px; font-weight: 700;
          padding: 4px 9px; border-radius: 8px;
          flex-shrink: 0;
        }
        .addb-alert-date-warn { background: rgba(249,115,22,0.12); color: #c2410c; }
        .addb-alert-date-danger { background: rgba(220,38,38,0.12); color: #991b1b; }

        /* Footer info */
        .addb-foot {
          font-size: 11px; color: rgba(48,64,53,0.5);
          padding: 10px 14px;
          background: rgba(48,64,53,0.04);
          border-radius: 10px;
          display: flex; gap: 14px;
          flex-wrap: wrap;
        }
        .addb-foot strong { color: #1a1614; font-weight: 700; }

        .addb-empty {
          text-align: center;
          padding: 28px 16px;
          color: rgba(48,64,53,0.4);
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .addb-kpis { grid-template-columns: repeat(2, 1fr); }
          .addb-cats { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="addb-bg" onClick={onClose} aria-hidden="true" />
      <div className="addb-aura" aria-hidden="true" />

      <aside
        className="addb-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Tableau de bord administratif"
      >
        <div className="addb-head">
          {/* Sparkles */}
          {[
            { left: '12%', bottom: '14%', delay: '0s' },
            { left: '32%', bottom: '60%', delay: '0.7s' },
            { left: '54%', bottom: '20%', delay: '1.4s' },
            { left: '78%', bottom: '50%', delay: '0.4s' },
            { left: '88%', bottom: '12%', delay: '2.1s' },
            { left: '20%', bottom: '78%', delay: '1.8s' },
          ].map((p, i) => (
            <span key={i} className="addb-spark" style={{ left: p.left, bottom: p.bottom, animationDelay: p.delay }} />
          ))}

          <div className="addb-row">
            <div className="addb-title-block">
              <div className="addb-title-icon"><LayoutDashboard style={{ width: 20, height: 20 }} /></div>
              <div className="addb-title">
                <h3>Tableau de bord administratif</h3>
                <p>Vue d'ensemble · Sécurité · Conformité</p>
              </div>
            </div>
            <button type="button" className="addb-close" onClick={onClose} aria-label="Fermer">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* KPIs principaux */}
          <div className="addb-kpis">
            <div className="addb-kpi">
              <div className="addb-kpi-num">{loading ? '—' : total}</div>
              <div className="addb-kpi-label">Documents</div>
            </div>
            <div className="addb-kpi">
              <div className="addb-kpi-num">{loading ? '—' : formatBytes(totalBytes)}</div>
              <div className="addb-kpi-label">Espace utilisé</div>
            </div>
            <div className="addb-kpi">
              <div className={`addb-kpi-num ${expiringSoon.length > 0 ? 'addb-kpi-num-warn' : 'addb-kpi-num-ok'}`}>
                {loading ? '—' : expiringSoon.length}
              </div>
              <div className="addb-kpi-label">Expirent ≤ 30 j</div>
            </div>
            <div className="addb-kpi">
              <div className={`addb-kpi-num ${expired.length > 0 ? 'addb-kpi-num-danger' : 'addb-kpi-num-ok'}`}>
                {loading ? '—' : expired.length}
              </div>
              <div className="addb-kpi-label">Expirés</div>
            </div>
          </div>
        </div>

        <div className="addb-body">
          {/* Alertes prioritaires */}
          {totalAlerts > 0 && (
            <div className="addb-section">
              <div className="addb-section-head">
                <AlertTriangle style={{ width: 12, height: 12, color: '#dc2626' }} />
                Alertes
                <span className="addb-section-count addb-section-count-warn">{totalAlerts}</span>
              </div>
              {expired.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="addb-alert addb-alert-danger"
                  onClick={() => onDocClick?.(d.id)}
                  style={{ width: '100%', border: 'none', textAlign: 'left' }}
                >
                  <div className="addb-alert-icon addb-alert-icon-danger">
                    <AlertTriangle style={{ width: 16, height: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="addb-alert-name">{d.title}</div>
                    <div className="addb-alert-meta addb-alert-meta-danger">
                      Expiré depuis le {fmtDate(d.expiresAt)} · à renouveler
                    </div>
                  </div>
                  <div className="addb-alert-date addb-alert-date-danger">PÉRIMÉ</div>
                </button>
              ))}
              {expiringSoon.map((d) => {
                const days = daysUntil(d.expiresAt);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className="addb-alert addb-alert-warn"
                    onClick={() => onDocClick?.(d.id)}
                    style={{ width: '100%', border: 'none', textAlign: 'left' }}
                  >
                    <div className="addb-alert-icon addb-alert-icon-warn">
                      <Clock style={{ width: 16, height: 16 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="addb-alert-name">{d.title}</div>
                      <div className="addb-alert-meta addb-alert-meta-warn">
                        Expire le {fmtDate(d.expiresAt)} · {days} jour{days > 1 ? 's' : ''} restants
                      </div>
                    </div>
                    <div className="addb-alert-date addb-alert-date-warn">{`J-${days}`}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Catégories */}
          <div className="addb-section">
            <div className="addb-section-head">
              <FolderOpen style={{ width: 12, height: 12 }} />
              Répartition par catégorie
            </div>
            {Object.keys(byCategory).length === 0 ? (
              <div className="addb-empty">Aucun document pour l'instant.</div>
            ) : (
              <div className="addb-cats">
                {Object.entries(byCategory).map(([cat, count]) => {
                  const Icon = CAT_ICONS[cat] ?? Briefcase;
                  const color = CAT_COLORS[cat] ?? '#6b7280';
                  return (
                    <button
                      key={cat}
                      type="button"
                      className="addb-cat"
                      onClick={() => onCategoryClick?.(cat)}
                      style={{ ['--cat-color' as any]: color, border: 'none', borderTop: `1px solid rgba(48,64,53,0.08)` }}
                    >
                      <span
                        className="addb-cat-icon"
                        style={{ background: color }}
                      >
                        <Icon style={{ width: 16, height: 16 }} />
                      </span>
                      <div className="addb-cat-info">
                        <div className="addb-cat-name">{cat}</div>
                        <div className="addb-cat-count">{count} document{count > 1 ? 's' : ''}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer infos */}
          <div className="addb-section">
            <div className="addb-foot">
              {latest && (
                <span>
                  <Calendar style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                  Dernier upload : <strong>{latest.title}</strong> ({fmtDate(latest.createdAt)})
                </span>
              )}
              <span>
                <Database style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                Total versions stockées : <strong>{totalAllVersions}</strong>
              </span>
              <span>
                <FileText style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                Espace utilisé : <strong>{formatBytes(totalBytes)}</strong>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
