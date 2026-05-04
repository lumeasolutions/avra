'use client';

/**
 * DocThumbnail — Vignette visuelle d'un document de sous-dossier.
 *
 * Comportement par type :
 *  - Image avec dataUrl (legacy local) : affichage direct
 *  - Image avec docId (backend) : fetch signed URL au montage et affichage
 *  - PDF : RENDU DE LA PREMIÈRE PAGE via pdfjs-dist (vignette canvas)
 *    avec fallback sur le rectangle rouge stylé si le rendu échoue
 *  - Word/Excel/autres : icône typée par MIME, fond coloré
 *  - Placeholder (pas de docId ni dataUrl) : icône grise neutre
 *
 * Le composant est défensif : tout échec réseau retombe gracieusement sur
 * une icône typée. Aucun crash ne casse la grille.
 *
 * Performance : pdfjs-dist est chargé en lazy import → impact 0 sur le bundle
 * initial. Le rendu canvas est mis en cache via blob URL pour éviter de
 * re-télécharger le PDF à chaque montage. Cache mémoire process-wide
 * (Map<docId, blobUrl>) — vidé naturellement quand l'onglet ferme.
 */

import { useEffect, useState, useRef } from 'react';
import { FileText, ImageIcon, FileSpreadsheet, FileSignature, File as FileIcon } from 'lucide-react';
import type { DocumentFile } from '@/store/useDossierStore';
import { getDocSignedUrl } from '@/lib/dossier-docs-api';

/**
 * Cache mémoire process-wide des thumbnails PDF déjà rendus.
 * Clé : docId (ou dataUrl preview pour les PDFs locaux).
 * Valeur : data URL PNG de la 1ère page rendue.
 */
const PDF_THUMBNAIL_CACHE = new Map<string, string>();

/**
 * Rendu lazy de la 1ère page d'un PDF en data URL PNG via pdfjs-dist.
 * Retourne null si échec (corrompu, non-PDF déguisé, network error…).
 */
async function renderPdfFirstPageThumbnail(pdfUrl: string, maxWidth = 320): Promise<string | null> {
  try {
    // Lazy import pour ne pas alourdir le bundle initial
    const pdfjsLib = await import('pdfjs-dist');
    // Worker servi en LOCAL depuis /public (copié via scripts/copy-pdf-worker.js
    // au prebuild + postinstall). Avant on pointait sur cdnjs.cloudflare.com mais
    // la CSP `script-src 'self'` bloquait le worker → silent fail → fallback icône.
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, disableAutoFetch: true, disableStream: true });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // On dimensionne le viewport pour avoir une largeur de maxWidth (haute déf retina).
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / baseViewport.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const dataUrl = canvas.toDataURL('image/png');

    // Free up memory
    page.cleanup();
    pdf.destroy();

    return dataUrl;
  } catch (err) {
    // PDF corrompu, network 403, worker init failed, etc.
    // eslint-disable-next-line no-console
    console.warn('[DocThumbnail] PDF render failed, fallback to icon:', err);
    return null;
  }
}

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
  // Pour les PDFs : data URL de la 1ère page rendue via pdfjs-dist
  const [pdfThumbDataUrl, setPdfThumbDataUrl] = useState<string | null>(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  // Pour les Office (Word/Excel/PowerPoint) : signed URL pour iframe scaled
  const [officeUrl, setOfficeUrl] = useState<string | null>(null);
  const [officeFailed, setOfficeFailed] = useState(false);
  const renderTriggeredRef = useRef(false);

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

  // Rendu thumbnail PDF (1ère page) au montage — utilise le cache process-wide.
  useEffect(() => {
    if (bucket !== 'pdf') return;
    if (renderTriggeredRef.current) return; // évite double-fetch en strict mode dev
    if (!doc.docId && !doc.dataUrl) return; // placeholder pur, pas de contenu

    const cacheKey = doc.docId ?? doc.dataUrl ?? '';
    const cached = PDF_THUMBNAIL_CACHE.get(cacheKey);
    if (cached) {
      setPdfThumbDataUrl(cached);
      return;
    }

    let cancelled = false;
    renderTriggeredRef.current = true;
    setPdfRendering(true);

    (async () => {
      try {
        // Récupère l'URL source du PDF (signed pour backend, dataUrl pour legacy)
        let pdfUrl: string;
        if (doc.dataUrl) {
          pdfUrl = doc.dataUrl;
        } else {
          const { signedUrl } = await getDocSignedUrl(dossierId, doc.docId!);
          pdfUrl = signedUrl;
        }

        const dataUrl = await renderPdfFirstPageThumbnail(pdfUrl, 320);
        if (cancelled) return;
        if (dataUrl) {
          PDF_THUMBNAIL_CACHE.set(cacheKey, dataUrl);
          setPdfThumbDataUrl(dataUrl);
        }
      } finally {
        if (!cancelled) setPdfRendering(false);
      }
    })();

    return () => { cancelled = true; };
  }, [bucket, doc.docId, doc.dataUrl, dossierId]);

  // Fetch signed URL pour les Office (Word/Excel/PowerPoint) — utilisé par
  // l'iframe Office Online viewer en mode mini (thumbnail).
  useEffect(() => {
    if (bucket !== 'word' && bucket !== 'excel') return;
    if (!doc.docId) return; // placeholder local sans contenu
    let cancelled = false;
    (async () => {
      try {
        const { signedUrl } = await getDocSignedUrl(dossierId, doc.docId!);
        if (!cancelled) setOfficeUrl(signedUrl);
      } catch {
        if (!cancelled) setOfficeFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [bucket, doc.docId, dossierId]);

  const showImage = bucket === 'image' && imgUrl && !imgFailed;
  const showPdfThumb = bucket === 'pdf' && pdfThumbDataUrl !== null;
  const showOfficeThumb = (bucket === 'word' || bucket === 'excel') && officeUrl && !officeFailed;

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
        .dt-pdf-thumb {
          width: 100%; height: 100%;
          object-fit: cover; object-position: top center;
          display: block;
          background: #fff;
        }
        /* Office Online viewer en thumbnail :
           on rend l'iframe à sa taille native (1000x750) et on la scale à 25%
           pour rentrer dans 250x187. overflow:hidden cache le surplus.
           pointer-events:none → l'utilisateur ne peut pas cliquer dans
           l'iframe Microsoft (le clic doit ouvrir la grande modale parente). */
        .dt-office-thumb-wrap {
          position: absolute; inset: 0;
          background: #fff;
          overflow: hidden;
          pointer-events: none;
        }
        .dt-office-thumb-frame {
          position: absolute; top: 0; left: 0;
          width: 1000px; height: 750px;
          border: 0;
          transform: scale(0.25);
          transform-origin: top left;
        }
        .dt-icon-bg-loading {
          background: rgba(255, 255, 255, 0.85);
        }
        .dt-pdf-spinner {
          width: 22px; height: 22px;
          border: 2px solid rgba(220, 38, 38, 0.18);
          border-top-color: #dc2626;
          border-radius: 50%;
          animation: dtSpin 0.85s linear infinite;
        }
        @keyframes dtSpin { to { transform: rotate(360deg); } }
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
      ) : showPdfThumb ? (
        // Rendu de la 1ère page du PDF via pdfjs-dist (canvas → data URL)
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="dt-pdf-thumb"
          src={pdfThumbDataUrl!}
          alt={`Aperçu de ${doc.name}`}
          loading="lazy"
        />
      ) : pdfRendering ? (
        <div className="dt-icon-wrap">
          <div className="dt-icon-bg dt-icon-bg-loading">
            <span className="dt-pdf-spinner" />
          </div>
        </div>
      ) : showOfficeThumb ? (
        // Rendu Word/Excel via Office Online viewer en iframe scaled.
        // L'iframe est rendue à sa taille native (~800px) puis transformée
        // pour rentrer dans le thumbnail. pointer-events: none → l'utilisateur
        // ne peut pas interagir avec l'iframe (le clic sur la carte parent
        // garde son rôle de "ouvrir la grande modale").
        <div className="dt-office-thumb-wrap">
          <iframe
            className="dt-office-thumb-frame"
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(officeUrl!)}`}
            title={`Aperçu de ${doc.name}`}
            scrolling="no"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
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
