'use client';

/**
 * ColoristeClickSelect — sélection au CLIC (SAM2) pour le module Coloriste ✨.
 *
 * L'utilisateur clique sur une surface de la photo ; on appelle /api/ia/segment-point
 * (SAM2) qui segmente l'objet EXACT sous le clic et renvoie l'URL d'un masque
 * (blanc = zone sélectionnée). On superpose ce masque en direct. Cliquer d'autres
 * points ajoute des surfaces ; le mode « Retirer » enlève une zone.
 *
 * Bien plus fiable que la détection par mot-clé et que le lasso : les contours
 * suivent les vrais bords de l'objet.
 *
 * Sortie (onChange) : { maskUrl, sourceUrl } prêt pour /api/ia/coloriste-textures
 * (mode 'points'). La source est uploadée une seule fois puis réutilisée.
 */

import { useRef, useEffect, useState, useCallback, type PointerEvent as ReactPointerEvent, type CSSProperties } from 'react';
import { MousePointerClick, Minus, Undo2, Trash2, Loader2 } from 'lucide-react';

const MAX_DIM = 1280;

/** #RRGGBB → [r,g,b] (fallback teal AVRA). */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [47, 158, 143];
}

export interface ClickSelectResult { maskUrl: string; sourceUrl: string }
interface Point { x: number; y: number; label: 0 | 1 }

interface Props {
  file: File;
  accent?: string;
  onChange: (result: ClickSelectResult | null) => void;
}

export function ColoristeClickSelect({ file, accent = '#2f9e8f', onChange }: Props) {
  const dispRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null); // overlay teinté (zone sélectionnée uniquement)
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const sourceDataUrlRef = useRef<string | null>(null); // photo capée (1er appel)
  const sourceUrlRef = useRef<string | null>(null);      // URL réutilisable (appels suivants)
  const pointsRef = useRef<Point[]>([]);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<'add' | 'remove'>('add');
  const [count, setCount] = useState(0); // nb de points (pour rerender des boutons)

  // ── Rendu : photo + overlay du masque + points ────────────────────────────
  const redraw = useCallback(() => {
    const disp = dispRef.current, img = imgRef.current;
    if (!disp || !img) return;
    const ctx = disp.getContext('2d');
    if (!ctx) return;
    const { w, h } = dimsRef.current;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    // Overlay = zone sélectionnée uniquement (déjà teinté + alpha, construit au
    // chargement du masque). On le pose tel quel.
    const ov = overlayRef.current;
    if (ov) ctx.drawImage(ov, 0, 0);
    // Marqueurs de points
    const r = Math.max(5, Math.round(w / 130));
    for (const p of pointsRef.current) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = p.label === 1 ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(2, r / 3);
      ctx.fill();
      ctx.stroke();
    }
  }, [accent]);

  // ── Chargement image + capture de la source capée ─────────────────────────
  useEffect(() => {
    let dead = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (dead) return;
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      dimsRef.current = { w, h };
      imgRef.current = img;
      // Source capée → dataURL (1er appel SAM2, dimensions = coordonnées des clics)
      const cap = document.createElement('canvas');
      cap.width = w; cap.height = h;
      const cctx = cap.getContext('2d');
      if (cctx) { cctx.drawImage(img, 0, 0, w, h); sourceDataUrlRef.current = cap.toDataURL('image/jpeg', 0.9); }
      sourceUrlRef.current = null;
      pointsRef.current = [];
      overlayRef.current = null;
      setCount(0);
      setError(null);
      const disp = dispRef.current;
      if (disp) { disp.width = w; disp.height = h; }
      setReady(true);
      redraw();
      onChange(null);
    };
    img.src = url;
    return () => { dead = true; URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // ── Appel SAM2 pour l'ensemble courant de points ──────────────────────────
  const runSegment = useCallback(async (pts: Point[]) => {
    if (pts.length === 0) { overlayRef.current = null; onChange(null); redraw(); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ia/segment-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: pts,
          sourceUrl: sourceUrlRef.current ?? undefined,
          sourceImageDataUrl: sourceUrlRef.current ? undefined : sourceDataUrlRef.current,
        }),
      });
      const data = await res.json().catch(() => null) as { maskUrl?: string; sourceUrl?: string; error?: string } | null;
      if (data?.sourceUrl) sourceUrlRef.current = data.sourceUrl;
      if (!res.ok || !data?.maskUrl) {
        setError(data?.error || 'La sélection n\'a rien détecté ici.');
        setLoading(false);
        return;
      }
      const maskUrl = data.maskUrl;
      const sourceUrl = data.sourceUrl ?? sourceUrlRef.current!;
      // On charge le masque VIA le proxy same-origin (/api/ia/download) pour
      // pouvoir LIRE ses pixels sans souci de CORS, puis on construit un overlay
      // qui ne teinte QUE le blanc (= zone sélectionnée). Masque blanc/noir opaque.
      const mimg = new Image();
      mimg.onload = () => {
        const { w, h } = dimsRef.current;
        const oc = document.createElement('canvas'); oc.width = w; oc.height = h;
        const octx = oc.getContext('2d');
        if (octx) {
          octx.drawImage(mimg, 0, 0, w, h);
          try {
            const id = octx.getImageData(0, 0, w, h);
            const d = id.data;
            const [ar, ag, ab] = hexToRgb(accent);
            for (let i = 0; i < d.length; i += 4) {
              const selected = (d[i] + d[i + 1] + d[i + 2]) / 3 > 128; // blanc = sélection
              d[i] = ar; d[i + 1] = ag; d[i + 2] = ab; d[i + 3] = selected ? 140 : 0;
            }
            octx.putImageData(id, 0, 0);
            overlayRef.current = oc;
          } catch {
            overlayRef.current = null; // lecture impossible → pas d'overlay (mais génération OK)
          }
        }
        redraw();
      };
      mimg.src = `/api/ia/download?url=${encodeURIComponent(maskUrl)}&name=mask.png`;
      onChange({ maskUrl, sourceUrl });
    } catch {
      setError('Connexion interrompue. Réessayez.');
    }
    setLoading(false);
  }, [onChange, redraw]);

  // ── Géométrie clic → pixel image ──────────────────────────────────────────
  const getPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const disp = dispRef.current;
    if (!disp) return { x: 0, y: 0 };
    const rect = disp.getBoundingClientRect();
    const { w, h } = dimsRef.current;
    return {
      x: (e.clientX - rect.left) * (w / Math.max(1, rect.width)),
      y: (e.clientY - rect.top) * (h / Math.max(1, rect.height)),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready || loading) return;
    e.preventDefault();
    const p = getPos(e);
    const pt: Point = { x: p.x, y: p.y, label: addMode === 'add' ? 1 : 0 };
    pointsRef.current = [...pointsRef.current, pt];
    setCount(pointsRef.current.length);
    redraw();
    void runSegment(pointsRef.current);
  };

  const undo = () => {
    if (loading || pointsRef.current.length === 0) return;
    pointsRef.current = pointsRef.current.slice(0, -1);
    setCount(pointsRef.current.length);
    redraw();
    void runSegment(pointsRef.current);
  };
  const clearAll = () => {
    if (loading) return;
    pointsRef.current = [];
    overlayRef.current = null;
    setCount(0);
    setError(null);
    redraw();
    onChange(null);
  };

  const toolBtn = (active: boolean): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${active ? accent : 'rgba(48,64,53,0.15)'}`,
    background: active ? accent : '#fff',
    color: active ? '#fff' : 'rgba(48,64,53,0.75)',
  });

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', background: '#f5eee8', border: '1px solid rgba(48,64,53,0.1)' }}>
        <canvas
          ref={dispRef}
          onPointerDown={onPointerDown}
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: loading ? 'wait' : 'crosshair' }}
        />
        {count === 0 && !loading && (
          <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(26,42,30,0.72)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, pointerEvents: 'none' }}>
            👆 Cliquez sur la surface à changer
          </div>
        )}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,42,30,0.82)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 999 }}>
              <Loader2 size={14} className="animate-spin" /> Détection…
            </span>
          </div>
        )}
      </div>

      {error && (
        <p style={{ margin: '8px 2px 0', fontSize: 11, color: '#c0392b', fontWeight: 600 }}>{error}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={() => setAddMode('add')} style={toolBtn(addMode === 'add')}>
          <MousePointerClick size={14} /> Ajouter
        </button>
        <button type="button" onClick={() => setAddMode('remove')} style={toolBtn(addMode === 'remove')}>
          <Minus size={14} /> Retirer
        </button>
        <button type="button" onClick={undo} disabled={loading || count === 0} style={{ ...toolBtn(false), marginLeft: 'auto', opacity: (loading || count === 0) ? 0.5 : 1 }}>
          <Undo2 size={14} /> Annuler
        </button>
        <button type="button" onClick={clearAll} disabled={loading} style={{ ...toolBtn(false), opacity: loading ? 0.5 : 1 }}>
          <Trash2 size={14} /> Effacer
        </button>
      </div>
    </div>
  );
}
