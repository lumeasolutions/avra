'use client';

/**
 * AdminDocShareModal — création et gestion de liens de partage temporaires.
 *
 * Sécurité :
 *  - Tokens 192 bits (24 bytes hex) générés côté serveur via crypto.randomBytes
 *  - Expiration borné serveur entre 1h et 168h (7 jours)
 *  - Chaque création/révocation est auditée
 *  - Le lien est shown ONCE (pas re-fetched depuis le serveur) — le user le copie
 *  - Le bouton de partage est visible côté ADMIN/OWNER uniquement (déjà gaté
 *    par le `@Roles('OWNER', 'ADMIN')` côté controller)
 */

import { useState, useEffect } from 'react';
import { X, Link2, Copy, Check, Trash2, Clock, Plus } from 'lucide-react';
import type { AdminDoc, AdminDocShare } from '@/store/useAdminDocsStore';

const PRESETS: Array<{ label: string; hours: number }> = [
  { label: '1 heure',  hours: 1 },
  { label: '24 heures', hours: 24 },
  { label: '3 jours',  hours: 72 },
  { label: '7 jours',  hours: 168 },
];

export interface AdminDocShareProps {
  open: boolean;
  doc: AdminDoc | null;
  fetchShares: (documentId: string) => Promise<AdminDocShare[]>;
  createShare: (documentId: string, expiresInHours: number) => Promise<AdminDocShare | null>;
  revokeShare: (shareId: string) => Promise<void>;
  onClose: () => void;
}

function buildShareUrl(token: string): string {
  if (typeof window === 'undefined') return token;
  return `${window.location.origin}/api/v1/documents/shared/${encodeURIComponent(token)}`;
}

function formatRemaining(expiresAt: string | null): string {
  if (!expiresAt) return 'Permanent';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expiré';
  const hours = Math.round(ms / 3600_000);
  if (hours < 24) return `${hours}h restantes`;
  const days = Math.round(hours / 24);
  return `${days} jour${days > 1 ? 's' : ''} restants`;
}

export function AdminDocShareModal({
  open, doc, fetchShares, createShare, revokeShare, onClose,
}: AdminDocShareProps) {
  const [shares, setShares] = useState<AdminDocShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hours, setHours] = useState(24);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchShares(doc.id)
      .then((s) => { if (!cancelled) setShares(s); })
      .catch(() => { if (!cancelled) setError('Erreur chargement'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, doc, fetchShares]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !creating) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, creating, onClose]);

  if (!open || !doc) return null;

  const handleCreate = async () => {
    setCreating(true); setError(null);
    try {
      const newShare = await createShare(doc.id, hours);
      if (newShare) {
        setShares((s) => [newShare, ...s]);
        // Auto-copy
        try {
          await navigator.clipboard.writeText(buildShareUrl(newShare.token));
          setCopied(newShare.id);
          setTimeout(() => setCopied(null), 2200);
        } catch {/* noop */}
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erreur création');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (share: AdminDocShare) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(share.token));
      setCopied(share.id);
      setTimeout(() => setCopied(null), 2200);
    } catch {/* noop */}
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await revokeShare(shareId);
      setShares((s) => s.filter((x) => x.id !== shareId));
    } catch (e: any) {
      setError(e?.message ?? 'Erreur révocation');
    }
  };

  return (
    <>
      <style>{`
        @keyframes adshFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes adshRise { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .adsh-bg {
          position: fixed; inset: 0; z-index: 95;
          background: rgba(8,12,10,0.7);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: adshFade 0.2s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .adsh-card {
          width: 100%; max-width: 580px;
          background: #fff;
          border-radius: 22px;
          border: 1px solid rgba(48,64,53,0.1);
          overflow: hidden;
          animation: adshRise 0.3s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
          max-height: calc(100vh - 48px);
          display: flex; flex-direction: column;
        }
        .adsh-head {
          flex-shrink: 0;
          padding: 16px 20px;
          background: linear-gradient(135deg, #304035 0%, #3d5244 100%);
          color: #fff;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .adsh-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
        .adsh-head p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.55); }
        .adsh-close {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.85);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease;
        }
        .adsh-close:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }

        .adsh-create {
          padding: 16px 20px;
          background: linear-gradient(135deg, #fff8ef 0%, #fff 100%);
          border-bottom: 1px solid rgba(48,64,53,0.08);
        }
        .adsh-create h4 {
          margin: 0 0 10px; font-size: 12px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(48,64,53,0.55);
        }
        .adsh-presets {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
          margin-bottom: 12px;
        }
        .adsh-preset {
          padding: 10px 6px; border-radius: 10px;
          border: 1px solid rgba(48,64,53,0.12);
          background: #fff; cursor: pointer;
          font-size: 12px; font-weight: 700; color: #1a1614;
          transition: all 0.16s ease;
        }
        .adsh-preset:hover { border-color: #a67749; transform: translateY(-1px); }
        .adsh-preset.active {
          background: linear-gradient(135deg, #a67749 0%, #c08a5a 100%);
          color: #fff; border-color: #a67749;
          box-shadow: 0 4px 12px rgba(166,119,73,0.32);
        }
        .adsh-create-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px;
          background: linear-gradient(135deg, #304035 0%, #3d5244 100%);
          color: #fff; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700;
          transition: all 0.16s ease;
        }
        .adsh-create-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(48,64,53,0.32);
        }
        .adsh-create-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .adsh-list { flex: 1; overflow-y: auto; padding: 12px 20px 20px; }
        .adsh-list-head {
          font-size: 10.5px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(48,64,53,0.55);
          margin: 4px 4px 8px;
          display: flex; align-items: center; gap: 8px;
        }
        .adsh-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(48,64,53,0.08);
          background: #fff;
          margin-bottom: 6px;
          transition: all 0.16s ease;
        }
        .adsh-row:hover { border-color: rgba(48,64,53,0.2); }
        .adsh-row-icon {
          width: 32px; height: 32px; border-radius: 9px;
          background: rgba(166,119,73,0.1); color: #a67749;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .adsh-info { flex: 1; min-width: 0; }
        .adsh-token {
          font-family: 'Courier New', monospace;
          font-size: 11px; color: #1a1614;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .adsh-meta {
          font-size: 11px; color: rgba(48,64,53,0.55);
          margin-top: 2px;
        }
        .adsh-meta-expired { color: #dc2626; font-weight: 700; }
        .adsh-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .adsh-btn-icon {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid rgba(48,64,53,0.1);
          background: #fff;
          cursor: pointer; transition: all 0.16s ease;
          display: flex; align-items: center; justify-content: center;
          color: rgba(48,64,53,0.55);
        }
        .adsh-btn-icon:hover { background: rgba(48,64,53,0.05); color: #1a1614; }
        .adsh-btn-copied { background: rgba(34,197,94,0.12); color: #16a34a; border-color: rgba(34,197,94,0.4); }
        .adsh-btn-revoke:hover { background: rgba(220,38,38,0.08); color: #dc2626; border-color: rgba(220,38,38,0.3); }

        .adsh-empty {
          text-align: center; padding: 32px 16px;
          color: rgba(48,64,53,0.4); font-size: 12px;
        }
        .adsh-error {
          margin: 8px 20px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #991b1b; font-size: 12px;
        }
      `}</style>

      <div className="adsh-bg" onClick={() => { if (!creating) onClose(); }}>
        <div className="adsh-card" onClick={(e) => e.stopPropagation()}>
          <div className="adsh-head">
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3>Liens de partage sécurisés</h3>
              <p>{doc.title}</p>
            </div>
            <button type="button" className="adsh-close" onClick={onClose} disabled={creating} aria-label="Fermer">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {error && <div className="adsh-error" role="alert">{error}</div>}

          <div className="adsh-create">
            <h4>Créer un nouveau lien</h4>
            <div className="adsh-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.hours}
                  type="button"
                  className={`adsh-preset${hours === p.hours ? ' active' : ''}`}
                  onClick={() => setHours(p.hours)}
                  disabled={creating}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="adsh-create-btn"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus style={{ width: 14, height: 14 }} />
              {creating ? 'Création…' : `Générer un lien (${hours}h)`}
            </button>
          </div>

          <div className="adsh-list">
            <div className="adsh-list-head">
              <Link2 style={{ width: 11, height: 11 }} />
              Liens actifs · {shares.length}
            </div>
            {loading ? (
              <div className="adsh-empty">Chargement…</div>
            ) : shares.length === 0 ? (
              <div className="adsh-empty">Aucun lien de partage actif.</div>
            ) : (
              shares.map((s) => {
                const expired = s.expiresAt && new Date(s.expiresAt) < new Date();
                return (
                  <div key={s.id} className="adsh-row">
                    <div className="adsh-row-icon">
                      <Link2 style={{ width: 16, height: 16 }} />
                    </div>
                    <div className="adsh-info">
                      <div className="adsh-token">{buildShareUrl(s.token)}</div>
                      <div className={`adsh-meta${expired ? ' adsh-meta-expired' : ''}`}>
                        <Clock style={{ width: 10, height: 10, verticalAlign: '-1px', marginRight: 4 }} />
                        {formatRemaining(s.expiresAt)} · créé {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div className="adsh-actions">
                      <button
                        type="button"
                        className={`adsh-btn-icon${copied === s.id ? ' adsh-btn-copied' : ''}`}
                        onClick={() => handleCopy(s)}
                        title="Copier le lien"
                        aria-label="Copier"
                      >
                        {copied === s.id ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                      </button>
                      <button
                        type="button"
                        className="adsh-btn-icon adsh-btn-revoke"
                        onClick={() => handleRevoke(s.id)}
                        title="Révoquer"
                        aria-label="Révoquer"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
