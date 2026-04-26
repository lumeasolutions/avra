'use client';

/**
 * DocThumbnail — Vignette visuelle d'un document de sous-dossier.
 *
 * Comportement par type :
 *  - Image avec dataUrl (legacy local) : affichage direct
 *  - Image avec docId (backend) : fetch signed URL au montage et affichage
 *  - PDF : représentation symbolique (rectangle rouge stylé "PDF")
 *  - Word/Excel/autres : icône typée par MIME, fond coloré
 *  - Placeholder (pas de docId ni dataUrl) : icône grise neutre
 *
 * Le composant est défensif : tout échec réseau retombe gracieusement sur
 * une icône typée. Aucun crash ne casse la grille.
 */

import { useEffect, useState } from 'react';
import { FileText, ImageIcon, FileSpreadsheet, FileSignature, File as FileIcon } from 'lucide-react';
import type { DocumentFile } from '@/store/useDossierStore';
import { getDocSignedUrl } from '@/lib/dossier-docs-api';

interface Props {
  doc: DocumentFile;
  dossierId: string;
  /** Hauteur fixe en px (la largeur s'adapte au container parent). */
  height?: number;
}

/** Détecte le bucket de type pour appliquer la bonne couleur/icône. */
type Bucket = 'image' | 'pdf' | 'word' | 'excel' | 'csv' | 'text' | 'other';

function bucketOf(mime?: string, name?: string): Bucket {
  const m = (mime ?? '').toLowerCase();
  const n = (name ?? '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return 'word';
  if (m.includes('excel') || m.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx')) return 'excel';
  if (m === 'text/csv' || n.endsWith('.csv')) return 'csv';
  if (m === 'text/plain' || n.endsWith('.txt')) return 'text';
  return 'other';
}

const BUCKET_STYLE: Record<Bucket, { bg: string; ring: string; tag: string; tagText: string; Icon: React.ElementType; iconColor: string }> = {
  image: { bg: 'linear-gradient(135deg, #f3e8ff, #f5d0fe)', ring: 'rgba(168, 85, 247, 0.25)', tag: '#a855f7', tagText: 'IMG', Icon: ImageIcon, iconColor: '#7e22ce' },
  pdf:   { bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', ring: 'rgba(220, 38, 38, 0.28)', tag: '#dc2626', tagText: 'PDF', Icon: FileText, iconColor: '#b91c1c' },
  word:  { bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', ring: 'rgba(37, 99, 235, 0.28)', tag: '#2563eb', tagText: 'DOC', Icon: FileSignature, iconColor: '#1d4ed8' },
  excel: { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', ring: 'rgba(22, 163, 74, 0.28)', tag: '#16a34a', tagText: 'XLS', Icon: FileSpreadsheet, iconColor: '#15803d' },
  csv:   { bg: 'linear-gradient(135deg, #ecfccb, #d9f99d)', ring: 'rgba(101, 163, 13, 0.28)', tag: '#65a30d', tagText: 'CSV', Icon: FileSpreadsheet, iconColor: '#4d7c0f' },
  text:  { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', ring: 'rgba(71, 85, 105, 0.28)', tag: '#475569', tagText: 'TXT', Icon: FileText, iconColor: '#334155' },
  other: { bg: 'linear-gradient(135deg, #f5eee8, #ede4d8)', ring: 'rgba(48, 64, 53, 0.18)', tag: '#a67749', tagText: 'FILE', Icon: FileIcon, iconColor: '#7c5a32' },
};

export function DocThumbnail({ doc, dossierId, height = 120 }: Props) {
  const bucket = bucketOf(doc.type, doc.name);
  const style = BUCKET_STYLE[bucket];
  const [imgUrl, setImgUrl] = useState<string | null>(doc.dataUrl ?? null);
  const [imgFailed, setImgFailed] = useState(false);

  // Fetch URL signée pour les images stockées côté backend
  useEffect(() => {
    if (bucket !== 'image') return;
    if (doc.dataUrl) return; // déjà disponible
    if (!doc.docId) return; // placeholder local sans contenu
    let cancelled = false;
    (async () => {
      try {
        const { signedUrl } = await getDocSignedUrl(dossierId, doc.docId!);
        if (!cancelled) setImgUrl(signedUrl);
      } catch {
        if (!cancelled) setImgFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [bucket, doc.docId, doc.dataUrl, dossierId]);

  const showImage = bucket === 'image' && imgUrl && !imgFailed;

  return (
    <div
      className="dt-wrap"
      style={{
        height,
        background: showImage ? '#f5eee8' : style.bg,
        border: `1px solid ${style.ring}`,
      }}
    >
      <style>{`
        .dt-wrap {
          position: relative;
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .dt-wrap:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(48,64,53,0.14); }
        .dt-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .dt-icon-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .dt-icon-bg {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(48, 64, 53, 0.08);
          backdrop-filter: blur(6px);
        }
        .dt-tag {
          position: absolute; top: 8px; right: 8px;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 9px; font-weight: 800;
          letter-spacing: 0.08em;
          color: #fff;
          backdrop-filter: blur(4px);
        }
        .dt-fallback-text {
          position: absolute; bottom: 6px; left: 8px; right: 8px;
          font-size: 10px; color: rgba(48,64,53,0.55);
          text-align: center;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
      `}</style>

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="dt-img"
          src={imgUrl!}
          alt={doc.name}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="dt-icon-wrap">
          <div className="dt-icon-bg">
            <style.Icon style={{ width: 28, height: 28, color: style.iconColor }} />
          </div>
        </div>
      )}

      <span className="dt-tag" style={{ background: style.tag }}>{style.tagText}</span>
    </div>
  );
}
