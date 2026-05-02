'use client';

/**
 * AdminDocsAuditPanel — journal d'audit des actions admin docs.
 *
 * Affiche en temps réel les opérations effectuées : qui a uploadé, supprimé,
 * remplacé, partagé, modifié quel document, quand, depuis quelle IP.
 *
 * Utile pour conformité RGPD / ISO 27001 / SOC 2 — toute manipulation est
 * traçable. Conservation 90 jours côté serveur, pruning automatique.
 */

import { useEffect, useState } from 'react';
import {
  X, Shield, Upload, Download, Trash2, RefreshCw,
  Edit3, Link2, FileText, Clock, User, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { AdminAuditEntry } from '@/store/useAdminDocsStore';

export interface AdminDocsAuditProps {
  open: boolean;
  audit: AdminAuditEntry[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  upload:               { label: 'Upload',          color: '#16a34a', Icon: Upload },
  download:             { label: 'Téléchargement',  color: '#4a7ec0', Icon: Download },
  delete:               { label: 'Suppression',     color: '#dc2626', Icon: Trash2 },
  replace:              { label: 'Nouvelle version', color: '#a855f7', Icon: RefreshCw },
  update:               { label: 'Modification',    color: '#a67749', Icon: Edit3 },
  'share-create':       { label: 'Lien créé',       color: '#0891b2', Icon: Link2 },
  'share-revoke':       { label: 'Lien révoqué',    color: '#7c3aed', Icon: Link2 },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR')} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function safeParseMeta(meta: string | null): Record<string, unknown> {
  if (!meta) return {};
  try { return JSON.parse(meta) as Record<string, unknown>; } catch { return {}; }
}

export function AdminDocsAuditPanel({
  open, audit, total, loading, page, pageSize, onPageChange, onClose,
}: AdminDocsAuditProps) {
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = filter.trim().length > 0
    ? audit.filter((a) => {
        const q = filter.toLowerCase();
        return a.documentTitle.toLowerCase().includes(q) ||
               a.userEmail.toLowerCase().includes(q) ||
               a.action.toLowerCase().includes(q);
      })
    : audit;

  return (
    <>
      <style>{`
        @keyframes adapFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes adapSlide { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .adap-bg {
          position: fixed; inset: 0; z-index: 90;
          background: rgba(8,12,10,0.5);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          animation: adapFade 0.2s ease-out;
        }
        .adap-panel {
          position: fixed; top: 0; right: 0; bottom: 0;
          z-index: 95;
          width: min(540px, 100vw);
          background: #fff;
          border-left: 1px solid rgba(48,64,53,0.1);
          box-shadow: -24px 0 60px rgba(0,0,0,0.3);
          display: flex; flex-direction: column;
          animation: adapSlide 0.32s cubic-bezier(0.22,1,0.36,1);
        }
        .adap-head {
          flex-shrink: 0;
          padding: 18px 20px;
          background: linear-gradient(135deg, #1a1614 0%, #2a2622 100%);
          color: #fff;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .adap-title { display: flex; align-items: center; gap: 10px; }
        .adap-title-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(217,179,138,0.18);
          border: 1px solid rgba(217,179,138,0.4);
          color: #d9b38a;
          display: flex; align-items: center; justify-content: center;
        }
        .adap-title h3 { margin: 0; font-size: 15px; font-weight: 800; }
        .adap-title p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.5); }
        .adap-close {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease;
        }
        .adap-close:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }

        .adap-search {
          flex-shrink: 0;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(48,64,53,0.08);
          background: rgba(48,64,53,0.02);
        }
        .adap-search-input {
          position: relative;
        }
        .adap-search-input input {
          width: 100%; padding: 8px 12px 8px 36px;
          border: 1px solid rgba(48,64,53,0.12);
          border-radius: 10px;
          font-size: 12px; color: #1a1614;
          background: #fff;
        }
        .adap-search-input input:focus { outline: none; border-color: #a67749; box-shadow: 0 0 0 3px rgba(166,119,73,0.18); }
        .adap-search-input svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(48,64,53,0.35); }

        .adap-list { flex: 1; overflow-y: auto; padding: 0; }
        .adap-row {
          display: flex; gap: 10px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(48,64,53,0.05);
          transition: background 0.16s;
        }
        .adap-row:hover { background: rgba(166,119,73,0.04); }
        .adap-icon {
          width: 32px; height: 32px; border-radius: 9px;
          color: #fff; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .adap-info { flex: 1; min-width: 0; }
        .adap-action-row {
          display: flex; align-items: baseline; gap: 6px;
          margin-bottom: 2px;
        }
        .adap-action {
          font-size: 12px; font-weight: 800;
          color: #1a1614;
        }
        .adap-doc {
          font-size: 12px; color: rgba(48,64,53,0.7);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 280px;
        }
        .adap-meta {
          display: flex; align-items: center; gap: 10px;
          font-size: 11px; color: rgba(48,64,53,0.5);
          flex-wrap: wrap;
        }
        .adap-meta-item {
          display: inline-flex; align-items: center; gap: 4px;
        }
        .adap-meta-item svg { color: rgba(48,64,53,0.35); }

        .adap-foot {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px;
          border-top: 1px solid rgba(48,64,53,0.08);
          background: rgba(48,64,53,0.02);
          font-size: 11px; color: rgba(48,64,53,0.55);
        }
        .adap-pager { display: flex; align-items: center; gap: 4px; }
        .adap-pager-btn {
          width: 26px; height: 26px; border-radius: 6px;
          border: 1px solid rgba(48,64,53,0.12);
          background: #fff;
          cursor: pointer; transition: all 0.16s ease;
          display: flex; align-items: center; justify-content: center;
          color: rgba(48,64,53,0.55);
        }
        .adap-pager-btn:hover:not(:disabled) { background: rgba(48,64,53,0.05); color: #1a1614; }
        .adap-pager-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .adap-empty {
          padding: 48px 20px; text-align: center;
          color: rgba(48,64,53,0.4); font-size: 12px;
        }
        .adap-empty svg { color: rgba(48,64,53,0.2); margin: 0 auto 12px; }

        .adap-section-day {
          padding: 8px 20px;
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(48,64,53,0.45);
          background: linear-gradient(180deg, rgba(48,64,53,0.04) 0%, transparent 100%);
          border-bottom: 1px solid rgba(48,64,53,0.05);
          position: sticky; top: 0; z-index: 1;
        }
      `}</style>

      <div className="adap-bg" onClick={onClose} aria-hidden="true" />
      <aside className="adap-panel" role="dialog" aria-modal="true" aria-label="Journal d'audit">
        <div className="adap-head">
          <div className="adap-title">
            <div className="adap-title-icon"><Shield style={{ width: 18, height: 18 }} /></div>
            <div>
              <h3>Journal d'audit</h3>
              <p>Conservation 90 jours · RGPD-conforme</p>
            </div>
          </div>
          <button type="button" className="adap-close" onClick={onClose} aria-label="Fermer">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="adap-search">
          <div className="adap-search-input">
            <Search style={{ width: 14, height: 14 }} />
            <input
              type="text"
              placeholder="Filtrer par doc, email, action…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="adap-list">
          {loading ? (
            <div className="adap-empty">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="adap-empty">
              <Shield style={{ width: 28, height: 28 }} />
              <div>{filter ? 'Aucun résultat' : 'Aucune activité enregistrée'}</div>
            </div>
          ) : (
            (() => {
              // Groupage par jour pour lisibilité
              const groups: Array<{ day: string; rows: AdminAuditEntry[] }> = [];
              for (const a of filtered) {
                const day = new Date(a.createdAt).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                });
                const last = groups[groups.length - 1];
                if (last && last.day === day) last.rows.push(a);
                else groups.push({ day, rows: [a] });
              }
              return groups.map((g) => (
                <div key={g.day}>
                  <div className="adap-section-day">{g.day}</div>
                  {g.rows.map((a) => {
                    const cfg = ACTION_LABELS[a.action] ?? { label: a.action, color: '#6b7280', Icon: FileText };
                    const Icon = cfg.Icon;
                    const meta = safeParseMeta(a.meta);
                    const ip = (meta.ip as string) || null;
                    return (
                      <div key={a.id} className="adap-row">
                        <div className="adap-icon" style={{ background: cfg.color }}>
                          <Icon style={{ width: 16, height: 16 }} />
                        </div>
                        <div className="adap-info">
                          <div className="adap-action-row">
                            <span className="adap-action" style={{ color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <span className="adap-doc">— {a.documentTitle}</span>
                          </div>
                          <div className="adap-meta">
                            <span className="adap-meta-item">
                              <User style={{ width: 10, height: 10 }} />
                              {a.userEmail}
                            </span>
                            <span className="adap-meta-item">
                              <Clock style={{ width: 10, height: 10 }} />
                              {formatTime(a.createdAt)}
                            </span>
                            {ip && <span className="adap-meta-item">IP {ip}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        <div className="adap-foot">
          <span>{total} entrée{total > 1 ? 's' : ''} totale{total > 1 ? 's' : ''}</span>
          <div className="adap-pager">
            <span style={{ marginRight: 8 }}>Page {page} / {totalPages}</span>
            <button
              type="button"
              className="adap-pager-btn"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              aria-label="Précédent"
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <button
              type="button"
              className="adap-pager-btn"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              aria-label="Suivant"
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
