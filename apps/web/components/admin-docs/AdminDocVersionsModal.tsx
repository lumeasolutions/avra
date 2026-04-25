'use client';

/**
 * AdminDocVersionsModal — Affiche l'historique des versions d'un document.
 * Permet de remplacer la version courante par un nouvel upload.
 *
 * Sécurité : seul le doc racine est conservé en "version courante" dans la
 * liste principale ; les versions précédentes restent accessibles via cet
 * historique (et téléchargeables pour traçabilité).
 */

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, History, FileText, User } from 'lucide-react';
import type { AdminDoc, AdminDocVersion } from '@/store/useAdminDocsStore';
import { formatBytes } from '@/store/useAdminDocsStore';

export interface AdminDocVersionsProps {
  open: boolean;
  doc: AdminDoc | null;
  fetchVersions: (documentId: string) => Promise<AdminDocVersion[]>;
  onUploadNewVersion: (file: File) => Promise<void>;
  onDownload: (id: string, filename: string) => Promise<void>;
  onClose: () => void;
}

export function AdminDocVersionsModal({
  open, doc, fetchVersions, onUploadNewVersion, onDownload, onClose,
}: AdminDocVersionsProps) {
  const [versions, setVersions] = useState<AdminDocVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVersions(doc.id)
      .then((v) => { if (!cancelled) setVersions(v); })
      .catch(() => { if (!cancelled) setError('Erreur chargement historique'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, doc, fetchVersions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !uploading) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, uploading, onClose]);

  if (!open || !doc) return null;

  const handleFile = async (file: File) => {
    setUploading(true); setError(null);
    try {
      await onUploadNewVersion(file);
      const v = await fetchVersions(doc.id);
      setVersions(v);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur upload nouvelle version');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes adsvFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes adsvRise { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .adsv-bg {
          position: fixed; inset: 0; z-index: 95;
          background: rgba(8,12,10,0.7);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: adsvFade 0.2s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .adsv-card {
          width: 100%; max-width: 600px;
          background: #fff;
          border-radius: 22px;
          border: 1px solid rgba(48,64,53,0.1);
          overflow: hidden;
          animation: adsvRise 0.3s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
          max-height: calc(100vh - 48px);
          display: flex; flex-direction: column;
        }
        .adsv-head {
          flex-shrink: 0;
          padding: 16px 20px;
          background: linear-gradient(135deg, #304035 0%, #3d5244 100%);
          color: #fff;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .adsv-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
        .adsv-head p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.55); }
        .adsv-close {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease; flex-shrink: 0;
        }
        .adsv-close:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }

        .adsv-upload {
          margin: 16px 20px 8px;
          padding: 12px 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fff8ef 0%, #fff 100%);
          border: 1px dashed rgba(166,119,73,0.4);
          display: flex; align-items: center; gap: 12px;
        }
        .adsv-upload-info { flex: 1; }
        .adsv-upload-info h4 { margin: 0; font-size: 13px; font-weight: 700; color: #1a1614; }
        .adsv-upload-info p { margin: 2px 0 0; font-size: 11px; color: rgba(48,64,53,0.55); }
        .adsv-upload-btn {
          padding: 8px 14px; border-radius: 10px;
          background: #a67749; color: #fff;
          border: none; cursor: pointer;
          font-size: 12px; font-weight: 700;
          display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.16s ease;
        }
        .adsv-upload-btn:hover:not(:disabled) {
          background: #c08a5a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(166,119,73,0.35);
        }
        .adsv-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .adsv-list { flex: 1; overflow-y: auto; padding: 8px 20px 20px; }
        .adsv-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(48,64,53,0.08);
          background: #fff;
          margin-bottom: 6px;
          transition: all 0.16s ease;
        }
        .adsv-row:hover { border-color: rgba(48,64,53,0.2); transform: translateX(2px); }
        .adsv-row-current { border-color: rgba(34,197,94,0.4); background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%); }
        .adsv-icon {
          width: 36px; height: 36px; border-radius: 9px;
          background: rgba(166,119,73,0.1); color: #a67749;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; flex-shrink: 0;
        }
        .adsv-icon-current { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; }
        .adsv-info { flex: 1; min-width: 0; }
        .adsv-name { font-size: 13px; font-weight: 700; color: #1a1614; line-height: 1.2; }
        .adsv-meta { font-size: 11px; color: rgba(48,64,53,0.55); margin-top: 2px; display: flex; gap: 10px; flex-wrap: wrap; }
        .adsv-dl {
          padding: 6px 10px; border-radius: 8px;
          background: transparent; color: rgba(48,64,53,0.55);
          border: 1px solid rgba(48,64,53,0.12);
          cursor: pointer; transition: all 0.16s ease;
          font-size: 11px; font-weight: 700;
        }
        .adsv-dl:hover { background: rgba(48,64,53,0.05); color: #1a1614; }
        .adsv-empty {
          text-align: center; padding: 32px 16px;
          color: rgba(48,64,53,0.4); font-size: 12px;
        }
        .adsv-error {
          margin: 8px 20px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #991b1b; font-size: 12px;
        }
      `}</style>

      <div className="adsv-bg" onClick={() => { if (!uploading) onClose(); }}>
        <div className="adsv-card" onClick={(e) => e.stopPropagation()}>
          <div className="adsv-head">
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3>Historique des versions</h3>
              <p>{doc.title}</p>
            </div>
            <button type="button" className="adsv-close" onClick={onClose} disabled={uploading} aria-label="Fermer">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {error && <div className="adsv-error" role="alert">{error}</div>}

          <div className="adsv-upload">
            <Upload style={{ width: 18, height: 18, color: '#a67749', flexShrink: 0 }} />
            <div className="adsv-upload-info">
              <h4>Ajouter une nouvelle version</h4>
              <p>Le fichier remplacera la version courante. L'historique est conservé.</p>
            </div>
            <input
              type="file"
              id="adsv-file"
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <label
              htmlFor="adsv-file"
              className="adsv-upload-btn"
              style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.5 : 1 }}
            >
              {uploading ? (
                <>
                  <Loader2 style={{ width: 14, height: 14, animation: 'adsv-spin 0.9s linear infinite' }} />
                  Upload…
                </>
              ) : (
                <>
                  <Upload style={{ width: 14, height: 14 }} />
                  Choisir
                </>
              )}
            </label>
            <style>{`@keyframes adsv-spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          <div className="adsv-list">
            {loading ? (
              <div className="adsv-empty">
                <Loader2 style={{ width: 20, height: 20, animation: 'adsv-spin 0.9s linear infinite', display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />
                Chargement…
              </div>
            ) : versions.length === 0 ? (
              <div className="adsv-empty">
                <History style={{ width: 24, height: 24, color: 'rgba(48,64,53,0.2)', marginBottom: 8 }} />
                <div>Aucun historique</div>
              </div>
            ) : (
              [...versions].reverse().map((v, idx) => {
                const isCurrent = idx === 0; // après reverse, l'index 0 = version la plus récente
                const author = v.createdBy.firstName || v.createdBy.lastName
                  ? `${v.createdBy.firstName ?? ''} ${v.createdBy.lastName ?? ''}`.trim()
                  : v.createdBy.email;
                return (
                  <div key={v.id} className={`adsv-row${isCurrent ? ' adsv-row-current' : ''}`}>
                    <div className={`adsv-icon${isCurrent ? ' adsv-icon-current' : ''}`}>v{v.version}</div>
                    <div className="adsv-info">
                      <div className="adsv-name">
                        {v.storedFile.originalName} {isCurrent && <span style={{ color: '#16a34a', fontSize: 10, marginLeft: 6 }}>● COURANTE</span>}
                      </div>
                      <div className="adsv-meta">
                        <span><FileText style={{ width: 10, height: 10, verticalAlign: '-1px', marginRight: 3 }} />{formatBytes(v.storedFile.sizeBytes)}</span>
                        <span><User style={{ width: 10, height: 10, verticalAlign: '-1px', marginRight: 3 }} />{author}</span>
                        <span>{new Date(v.createdAt).toLocaleDateString('fr-FR')} · {new Date(v.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="adsv-dl"
                      onClick={() => onDownload(v.id, v.storedFile.originalName)}
                    >
                      Télécharger
                    </button>
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
