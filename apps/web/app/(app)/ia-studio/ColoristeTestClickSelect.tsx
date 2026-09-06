'use client';

/**
 * ColoristeTestClickSelect — sélection de zone pour le module « Coloriste
 * test » (5e onglet IA Studio, isolé — voir ColoristeClickSelect.tsx pour le
 * composant original du Coloriste ✨, INTACT et non modifié).
 *
 * DEUX MODES DE SÉLECTION :
 *
 *   1. CLIC (auto, SAM2) — même base que ColoristeClickSelect : clic → SAM2 →
 *      aperçu du masque à fort contraste (cyan + bordure magenta). Rapide,
 *      mais SAM2 regroupe automatiquement toute la zone visuellement continue
 *      de même couleur/matière sous le clic (ex: îlot + meubles bas + colonne
 *      d'une cuisine unie) — il n'y a pas de frontière visuelle à détecter
 *      entre ces surfaces, donc un simple point ne peut pas les séparer de
 *      façon fiable, même avec des points « Retirer » (retour utilisateur,
 *      30/07/2026 : toute la cuisine recolorée au lieu d'une seule zone).
 *
 *   2. PINCEAU (manuel, nouveau — 30/07/2026) — l'utilisateur peint lui-même
 *      la zone exacte à main levée, indépendamment de ce que SAM2 croit être
 *      « un objet ». Garantit une précision totale quel que soit le
 *      regroupement visuel des surfaces. Le masque peint est envoyé tel quel
 *      au serveur (même convention que le masque SAM2 : blanc = zone
 *      sélectionnée) via `maskDataUrl` — /api/ia/coloriste-test le traite
 *      alors SANS dilatation (déjà précis) mais avec le même adoucissement
 *      des bords (feather) que le mode auto.
 *
 * Dans les deux cas : aperçu à fort contraste (cyan + bordure magenta,
 * indépendant de la photo et de l'accent du module) et garantie de
 * compositing pixel-safe côté serveur (voir coloriste-test-compositor.ts).
 */

import { useRef, useEffect, useState, useCallback, type PointerEvent as ReactPointerEvent, type CSSProperties } from 'react';
import { MousePointerClick, Minus, Undo2, Trash2, Loader2, ShieldCheck, Paintbrush, Eraser } from 'lucide-react';

const MAX_DIM = 1280;

export type ClickSelectResult =
  | { mode: 'auto'; maskUrl: string; sourceUrl: string }
  | { mode: 'manual'; maskDataUrl: string };

interface Point { x: number; y: number; label: 0 | 1 }

/**
 * Construit un calque de surbrillance à fort contraste (cyan plein + bordure
 * magenta électrique) à partir d'un masque binaire brut (0/1 par pixel).
 * Couleurs fixes, indépendantes de la photo et de l'accent du module — pour
 * rester lisibles sur n'importe quel intérieur (retour utilisateur juillet
 * 2026 : un calque teinté avec l'accent du module se fondait dans certaines
 * photos). Partagé entre le mode clic (masque SAM2) et le mode pinceau
 * (masque peint à la main).
 */
function buildHighContrastOverlay(selected: Uint8Array, w: number, h: number): HTMLCanvasElement {
  const oc = document.createElement('canvas');
  oc.width = w; oc.height = h;
  const octx = oc.getContext('2d')!;
  const id = octx.createImageData(w, h);
  const d = id.data;
  const bw = Math.max(2, Math.round(w / 350));
  const isBorder = (x: number, y: number): boolean => {
    const p = y * w + x;
    if (!selected[p]) return false;
    const coords: Array<[number, number]> = [
      [x - bw, y], [x + bw, y], [x, y - bw], [x, y + bw],
    ];
    for (const [nx, ny] of coords) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true;
      if (!selected[ny * w + nx]) return true;
    }
    return false;
  };
  const FILL: [number, number, number] = [0, 225, 255];     // cyan électrique
  const BORDER: [number, number, number] = [255, 0, 170];   // magenta électrique
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (!selected[p]) { d[i + 3] = 0; continue; }
      const border = isBorder(x, y);
      const [r, g, b] = border ? BORDER : FILL;
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
      d[i + 3] = border ? 255 : 130;
    }
  }
  octx.putImageData(id, 0, 0);
  return oc;
}

interface Props {
  file: File;
  accent?: string;
  onChange: (result: ClickSelectResult | null) => void;
}

/** Réutilise la route EXISTANTE /api/ia/segment-point (SAM2 générique, non modifiée). */
/** Mode « Clic (auto) » (SAM2) — désactivé en beta. Voir le commentaire dans le JSX. */
const SHOW_CLICK_AUTO_MODE = false;

export function ColoristeTestClickSelect({ file, accent = '#a67749', onChange }: Props) {
  const dispRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const sourceDataUrlRef = useRef<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const brushMaskRef = useRef<Uint8Array | null>(null); // 1 = zone peinte, taille w*h
  const drawingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selMode, setSelMode] = useState<'click' | 'brush'>('brush');
  const [addMode, setAddMode] = useState<'add' | 'remove'>('add');
  const [brushTool, setBrushTool] = useState<'draw' | 'erase'>('draw');
  const [brushSize, setBrushSize] = useState(45);
  const [count, setCount] = useState(0);       // nb de points (mode clic)
  const [brushDirty, setBrushDirty] = useState(false); // le pinceau a peint quelque chose (mode pinceau)

  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;
  const brushToolRef = useRef(brushTool);
  brushToolRef.current = brushTool;

  const hasSelection = selMode === 'click' ? count > 0 : brushDirty;

  // ── Rendu : photo + overlay du masque + points (mode clic uniquement) ─────
  const redraw = useCallback(() => {
    const disp = dispRef.current, img = imgRef.current;
    if (!disp || !img) return;
    const ctx = disp.getContext('2d');
    if (!ctx) return;
    const { w, h } = dimsRef.current;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const ov = overlayRef.current;
    if (ov) {
      // Léger flou d'aperçu : représente visuellement l'adoucissement (feather)
      // réellement appliqué côté serveur avant génération. Volontairement léger
      // (1.2px) pour ne pas noyer le contour à fort contraste.
      ctx.save();
      ctx.filter = 'blur(1.2px)';
      ctx.drawImage(ov, 0, 0);
      ctx.restore();
    }
    if (selMode === 'click') {
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
    }
  }, [selMode]);

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
      const cap = document.createElement('canvas');
      cap.width = w; cap.height = h;
      const cctx = cap.getContext('2d');
      if (cctx) { cctx.drawImage(img, 0, 0, w, h); sourceDataUrlRef.current = cap.toDataURL('image/jpeg', 0.9); }
      sourceUrlRef.current = null;
      pointsRef.current = [];
      brushMaskRef.current = null;
      overlayRef.current = null;
      setCount(0);
      setBrushDirty(false);
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

  // ── Mode CLIC : appel SAM2 pour l'ensemble courant de points ───────────────
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
      const mimg = new Image();
      mimg.onload = () => {
        const { w, h } = dimsRef.current;
        const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
        const tctx = tmp.getContext('2d');
        if (tctx) {
          tctx.drawImage(mimg, 0, 0, w, h);
          try {
            const id = tctx.getImageData(0, 0, w, h);
            const d = id.data;
            const n = w * h;
            const selected = new Uint8Array(n);
            for (let p = 0, i = 0; p < n; p++, i += 4) {
              selected[p] = (d[i] + d[i + 1] + d[i + 2]) / 3 > 128 ? 1 : 0; // blanc = sélection
            }
            overlayRef.current = buildHighContrastOverlay(selected, w, h);
          } catch {
            overlayRef.current = null; // lecture impossible → pas d'overlay (mais génération OK)
          }
        }
        redraw();
      };
      mimg.src = `/api/ia/download?url=${encodeURIComponent(maskUrl)}&name=mask.png`;
      // NB : maskUrl transmis ici est le masque BRUT SAM2. Le raffinage
      // (dilatation + feather réels, pas juste l'aperçu flouté) a lieu côté
      // serveur dans /api/ia/coloriste-test avant tout envoi au moteur.
      onChange({ mode: 'auto', maskUrl, sourceUrl });
    } catch {
      setError('Connexion interrompue. Réessayez.');
    }
    setLoading(false);
  }, [onChange, redraw]);

  // ── Mode PINCEAU : peinture à main levée dans un masque local (Uint8Array) ─
  const paintAt = useCallback((x: number, y: number) => {
    const { w, h } = dimsRef.current;
    if (!w || !h) return;
    if (!brushMaskRef.current || brushMaskRef.current.length !== w * h) {
      brushMaskRef.current = new Uint8Array(w * h);
    }
    const mask = brushMaskRef.current;
    const rad = brushSizeRef.current;
    const val = brushToolRef.current === 'erase' ? 0 : 1;
    const r2 = rad * rad;
    const minX = Math.max(0, Math.floor(x - rad)), maxX = Math.min(w - 1, Math.ceil(x + rad));
    const minY = Math.max(0, Math.floor(y - rad)), maxY = Math.min(h - 1, Math.ceil(y + rad));
    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const dx = xx - x, dy = yy - y;
        if (dx * dx + dy * dy <= r2) mask[yy * w + xx] = val;
      }
    }
  }, []);

  // Rebuild de l'overlay throttlé à une fois par frame (le pinceau peut
  // déclencher beaucoup d'événements pointermove pendant un tracé rapide).
  const scheduleOverlayRebuild = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const { w, h } = dimsRef.current;
      if (brushMaskRef.current) overlayRef.current = buildHighContrastOverlay(brushMaskRef.current, w, h);
      redraw();
    });
  }, [redraw]);

  const commitBrush = useCallback(() => {
    const { w, h } = dimsRef.current;
    const mask = brushMaskRef.current;
    if (!mask) { setBrushDirty(false); onChange(null); return; }
    let any = false;
    for (let i = 0; i < mask.length; i++) { if (mask[i]) { any = true; break; } }
    if (!any) { setBrushDirty(false); onChange(null); return; }
    setBrushDirty(true);
    const oc = document.createElement('canvas'); oc.width = w; oc.height = h;
    const octx = oc.getContext('2d');
    if (!octx) { onChange(null); return; }
    const id = octx.createImageData(w, h);
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      const v = mask[p] ? 255 : 0;
      id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    octx.putImageData(id, 0, 0);
    onChange({ mode: 'manual', maskDataUrl: oc.toDataURL('image/png') });
  }, [onChange]);

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
    if (selMode === 'brush') {
      drawingRef.current = true;
      try { (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
      paintAt(p.x, p.y);
      scheduleOverlayRebuild();
      return;
    }
    const pt: Point = { x: p.x, y: p.y, label: addMode === 'add' ? 1 : 0 };
    pointsRef.current = [...pointsRef.current, pt];
    setCount(pointsRef.current.length);
    redraw();
    void runSegment(pointsRef.current);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (selMode !== 'brush' || !drawingRef.current) return;
    e.preventDefault();
    const p = getPos(e);
    paintAt(p.x, p.y);
    scheduleOverlayRebuild();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (selMode !== 'brush') return;
    if (drawingRef.current) {
      drawingRef.current = false;
      try { (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      commitBrush();
    }
  };

  const switchMode = (m: 'click' | 'brush') => {
    if (m === selMode || loading) return;
    setSelMode(m);
    pointsRef.current = [];
    brushMaskRef.current = null;
    overlayRef.current = null;
    drawingRef.current = false;
    setCount(0);
    setBrushDirty(false);
    setError(null);
    redraw();
    onChange(null);
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
    brushMaskRef.current = null;
    overlayRef.current = null;
    setCount(0);
    setBrushDirty(false);
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
      {/* Bascule Clic auto / Pinceau manuel — MASQUÉE (sept. 2026).
          Retour cofondatrice : le clic auto (SAM2) déborde trop souvent sur
          les surfaces voisines de même teinte. On ne garde que le pinceau
          manuel, plus fiable. Repasser SHOW_CLICK_AUTO_MODE à true pour
          réactiver le choix — le code du mode clic reste en place. */}
      {SHOW_CLICK_AUTO_MODE && (
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => switchMode('click')} style={{ ...toolBtn(selMode === 'click'), flex: 1, justifyContent: 'center' }}>
          <MousePointerClick size={14} /> Clic (auto)
        </button>
        <button type="button" onClick={() => switchMode('brush')} style={{ ...toolBtn(selMode === 'brush'), flex: 1, justifyContent: 'center' }}>
          <Paintbrush size={14} /> Pinceau (manuel)
        </button>
      </div>
      )}
      {selMode === 'brush' && (
        <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(48,64,53,0.55)', fontWeight: 600 }}>
          Peignez la zone exacte à changer avec le pinceau, puis lancez la génération : seule cette zone sera modifiée, le reste de la photo reste identique.
        </p>
      )}

      <div style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', background: '#f5eee8', border: '1px solid rgba(48,64,53,0.1)' }}>
        <canvas
          ref={dispRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: loading ? 'wait' : 'crosshair' }}
        />
        {!hasSelection && !loading && (
          <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(26,42,30,0.72)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, pointerEvents: 'none' }}>
            {selMode === 'click' ? '👆 Cliquez sur la surface à changer' : '🖌️ Peignez la zone à changer'}
          </div>
        )}
        {hasSelection && !loading && (
          <div style={{ position: 'absolute', right: 10, bottom: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(26,42,30,0.78)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999, pointerEvents: 'none' }}>
            <ShieldCheck size={13} /> Le reste de la photo est protégé
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

      {selMode === 'click' ? (
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
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <button type="button" onClick={() => setBrushTool('draw')} style={toolBtn(brushTool === 'draw')}>
            <Paintbrush size={14} /> Dessiner
          </button>
          <button type="button" onClick={() => setBrushTool('erase')} style={toolBtn(brushTool === 'erase')}>
            <Eraser size={14} /> Gommer
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'rgba(48,64,53,0.7)' }}>
            Taille
            <input
              type="range" min={15} max={150} step={5} value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ width: 90, accentColor: accent }}
            />
          </label>
          <button type="button" onClick={clearAll} style={{ ...toolBtn(false), marginLeft: 'auto' }}>
            <Trash2 size={14} /> Tout effacer
          </button>
        </div>
      )}
    </div>
  );
}
