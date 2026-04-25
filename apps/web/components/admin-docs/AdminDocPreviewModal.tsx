'use client';

/**
 * AdminDocPreviewModal — prévisualisation inline d'un doc admin.
 *
 * Sécurité :
 *  - On utilise uniquement la route serveur `/api/v1/documents/admin/:id/preview`
 *    qui sert le fichier avec un CSP `default-src 'none'; sandbox`.
 *  - Le body est servi en `inline` avec X-Content-Type-Options: nosniff.
 *  - On ne fait JAMAIS confiance au mimeType retourné côté client : on
 *    n'affiche que les types whitelisted (PDF, image).
 *
 * UX :
 *  - PDF dans un <iframe> sandboxé (pas d'exec scripts, pas de top-nav)
 *  - Images dans un <img> avec zoom click (1x ↔ 1.6x)
 *  - Texte plain en <pre>
 *  - Loader pendant le fetch, fallback si type non supporté
 */

import { useEffect, useState } from 'react';
import { X, Download, Maximize2, Minimize2, FileText, AlertTriangle } from 'lucide-react';

export interface AdminDocPreviewProps {
  open: boolean;
  documentId: string | null;
  title: string;
  mimeType: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function AdminDocPreviewModal({
  open,
  documentId,
  title,
  mimeType,
  onClose,
  onDownload,
}: AdminDocPreviewProps) {
  const [zoomed, setZoomed] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset à chaque changement de doc
  useEffect(() => {
    setZoomed(false);
    setTextContent(null);
    setError(null);
  }, [documentId]);

  // Charge le texte plain via fetch (les autres types sont rendus par l'iframe/img)
  useEffect(() => {
    if (!open || !documentId) return;
    if (mimeType !== 'text/plain') return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/v1/documents/admin/${encodeURIComponent(documentId)}/preview`, {
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error('Aperçu indisponible');
        return r.text();
      })
      .then((t) => { if (!cancelled) { setTextContent(t.slice(0, 100_000)); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [open, documentId, mimeType]);

  // Escape pour fermer
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

  if (!open || !documentId) return null;

  const isPdf = mimeType === 'application/pdf';
  const isImg = mimeType.startsWith('image/');
  const isText = mimeType === 'text/plain';
  const supported = isPdf || isImg || isText;

  const previewUrl = `/api/v1/documents/admin/${encodeURIComponent(documentId)}/preview`;

  return (
    <>
      <style>{`
        @keyframes adpFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes adpRise { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .adp-backdrop {
          position: fixed; inset: 0; z-index: 90;
          background: rgba(8, 12, 10, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: adpFade 0.2s ease-out;
          display: flex; flex-direction: column;
        }
        .adp-bar {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px;
          background: linear-gradient(180deg, rgba(48,64,53,0.95) 0%, rgba(48,64,53,0.85) 100%);
          color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .adp-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .adp-title-text { min-width: 0; }
        .adp-title-text h3 { margin: 0; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adp-title-text p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.5); }
        .adp-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .adp-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s ease;
        }
        .adp-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }
        .adp-btn-primary {
          background: #a67749; border-color: #a67749; color: white;
          padding: 0 16px; width: auto; gap: 6px; font-size: 12px; font-weight: 700;
        }
        .adp-btn-primary:hover { background: #c08a5a; border-color: #c08a5a; }
        .adp-stage {
          flex: 1; overflow: auto;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: adpRise 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .adp-iframe {
          width: 100%; height: 100%;
          background: #fff;
          border: none;
          border-radius: 8px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .adp-img {
          max-width: 100%; max-height: 100%;
          object-fit: contain;
          cursor: zoom-in;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          border-radius: 8px;
        }
        .adp-img.zoomed { transform: scale(1.6); cursor: zoom-out; }
        .adp-text {
          background: #fff; color: #1a1614;
          padding: 24px; border-radius: 12px;
          font-family: 'Courier New', monospace;
          font-size: 13px; line-height: 1.55;
          max-width: 800px; max-height: 100%; overflow: auto;
          white-space: pre-wrap; word-break: break-all;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .adp-fallback {
          color: rgba(255,255,255,0.6);
          text-align: center;
          background: rgba(255,255,255,0.05);
          padding: 48px 32px; border-radius: 16px;
          border: 1px dashed rgba(255,255,255,0.15);
          max-width: 420px;
        }
        .adp-fallback svg { color: rgba(255,255,255,0.35); margin: 0 auto 14px; }
        .adp-fallback h4 { margin: 0 0 8px; color: #fff; font-size: 16px; }
        .adp-fallback p { margin: 0 0 18px; font-size: 13px; line-height: 1.5; }
      `}</style>

      <div
        className="adp-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={`Aperçu de ${title}`}
      >
        <div className="adp-bar">
          <div className="adp-title">
            <FileText style={{ width: 18, height: 18, color: '#d9b38a', flexShrink: 0 }} />
            <div className="adp-title-text">
              <h3>{title}</h3>
              <p>{mimeType}</p>
            </div>
          </div>
          <div className="adp-actions">
            {isImg && (
              <button
                type="button"
                className="adp-btn"
                onClick={() => setZoomed((z) => !z)}
                title={zoomed ? 'Réduire' : 'Zoom'}
                aria-label={zoomed ? 'Réduire' : 'Zoom'}
              >
                {zoomed ? <Minimize2 style={{ width: 16, height: 16 }} /> : <Maximize2 style={{ width: 16, height: 16 }} />}
              </button>
            )}
            {onDownload && (
              <button type="button" className="adp-btn adp-btn-primary" onClick={onDownload}>
                <Download style={{ width: 14, height: 14 }} />
                Télécharger
              </button>
            )}
            <button type="button" className="adp-btn" onClick={onClose} aria-label="Fermer">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        <div className="adp-stage">
          {!supported && (
            <div className="adp-fallback">
              <AlertTriangle style={{ width: 36, height: 36 }} />
              <h4>Aperçu indisponible</h4>
              <p>Le format <strong>{mimeType}</strong> ne peut pas être affiché en ligne.<br />Téléchargez le fichier pour le consulter.</p>
              {onDownload && (
                <button type="button" className="adp-btn adp-btn-primary" onClick={onDownload}>
                  <Download style={{ width: 14, height: 14 }} />
                  Télécharger
                </button>
              )}
            </div>
          )}

          {supported && isPdf && (
            <iframe
              className="adp-iframe"
              src={previewUrl}
              title={`Aperçu PDF de ${title}`}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          )}

          {supported && isImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`adp-img${zoomed ? ' zoomed' : ''}`}
              src={previewUrl}
              alt={title}
              onClick={() => setZoomed((z) => !z)}
            />
          )}

          {supported && isText && (
            <pre className="adp-text">
              {loading ? 'Chargement…' : (error ?? textContent ?? '')}
            </pre>
          )}
        </div>
      </div>
    </>
  );
}
