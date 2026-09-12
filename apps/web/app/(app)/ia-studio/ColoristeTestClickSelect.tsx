'use client';

/**
 * ColoristeTestClickSelect — sélection de zone pour le module « Remplacer une
 * matière » (voir ColoristeClickSelect.tsx pour le composant original du
 * Coloriste ✨, INTACT et non modifié).
 *
 * UN SEUL MASQUE, QUATRE OUTILS (refonte 12/09/2026)
 * ---------------------------------------------------
 * Historique : le composant avait deux MODES exclusifs — « Clic (auto) » (SAM2)
 * et « Pinceau (manuel) ». Basculer de l'un à l'autre effaçait la sélection, et
 * le clic auto a fini désactivé (30/07/2026) parce que SAM2 regroupe toute la
 * surface visuellement continue sous le clic : cliquer une façade sélectionnait
 * l'îlot, les meubles bas et la colonne d'un coup. Les points « Retirer » ne
 * réglaient rien puisqu'ils relançaient simplement SAM2 sur un nouvel ensemble
 * de points. Il ne restait donc que le pinceau, et tout se peignait à la main.
 *
 * MyArchitectAI recommande exactement l'inverse dans son guide d'édition :
 * « The magic wand tool isn't pixel-perfect, so we recommend using it in
 * combination with the paint brush tool. Use the magic wand to select most of
 * the area, then fine-tune with the paint brush tool. »
 *
 * Les outils écrivent désormais TOUS dans le même masque `maskRef` :
 *   • Baguette — un clic, SAM2, et le résultat est AJOUTÉ au masque existant.
 *     Son débordement cesse d'être bloquant : la gomme l'efface en deux traits
 *     au lieu d'obliger à repartir de zéro.
 *   • Pinceau / Gomme — ajout et retrait à main levée, taille réglable.
 *   • Rectangle — un glisser pour couvrir une rangée entière de meubles.
 * Un historique de 12 états permet d'annuler n'importe quelle opération.
 *
 * Le masque composé part toujours en mode 'manual' : le serveur ne le dilate
 * pas (l'utilisateur maîtrise ses bords) mais lui applique le même
 * adoucissement, puis la recomposition pixel-safe de coloriste-test-compositor.
 */

import { useRef, useEffect, useState, useCallback, type PointerEvent as ReactPointerEvent, type CSSProperties } from 'react';
import { Wand2, Undo2, Trash2, Loader2, Paintbrush, Eraser, Square } from 'lucide-react';

const MAX_DIM = 1280;
/** Nombre d'états conservés pour l'annulation. ~1 Mo par état en 1280×720. */
const HISTORY_MAX = 12;

export type ClickSelectResult =
  | { mode: 'auto'; maskUrl: string; sourceUrl: string }
  | { mode: 'manual'; maskDataUrl: string };

type Tool = 'wand' | 'draw' | 'erase' | 'rect';

/**
 * Construit un calque de surbrillance à fort contraste (cyan plein + bordure
 * magenta électrique) à partir d'un masque binaire brut (0/1 par pixel).
 * Couleurs fixes, indépendantes de la photo et de l'accent du module — pour
 * rester lisibles sur n'importe quel intérieur (retour utilisateur juillet
 * 2026 : un calque teinté avec l'accent du module se fondait dans certaines
 * photos).
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

export function ColoristeTestClickSelect({ file, accent = '#a67749', onChange }: Props) {
  const dispRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const sourceDataUrlRef = useRef<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);

  /** LE masque unique : 1 = sélectionné. Tous les outils écrivent dedans. */
  const maskRef = useRef<Uint8Array | null>(null);
  const historyRef = useRef<Uint8Array[]>([]);
  const drawingRef = useRef(false);
  /** Rectangle en cours de tracé (aperçu), en pixels image. */
  const rectRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('wand');
  const [brushSize, setBrushSize] = useState(45);
  const [hasSelection, setHasSelection] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;
  const toolRef = useRef(tool);
  toolRef.current = tool;

  /* ── Masque : accès, historique ──────────────────────────────────────── */

  const ensureMask = useCallback((): Uint8Array => {
    const { w, h } = dimsRef.current;
    if (!maskRef.current || maskRef.current.length !== w * h) {
      maskRef.current = new Uint8Array(w * h);
    }
    return maskRef.current;
  }, []);

  /** Photographie l'état courant AVANT une opération, pour pouvoir l'annuler. */
  const pushHistory = useCallback(() => {
    const m = maskRef.current;
    const { w, h } = dimsRef.current;
    historyRef.current.push(m ? new Uint8Array(m) : new Uint8Array(w * h));
    if (historyRef.current.length > HISTORY_MAX) historyRef.current.shift();
    setCanUndo(true);
  }, []);

  /* ── Rendu : photo + surbrillance du masque + aperçu du rectangle ────── */

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
      // réellement appliqué côté serveur avant génération.
      ctx.save();
      ctx.filter = 'blur(1.2px)';
      ctx.drawImage(ov, 0, 0);
      ctx.restore();
    }

    const r = rectRef.current;
    if (r) {
      const x = Math.min(r.x0, r.x1), y = Math.min(r.y0, r.y1);
      const rw = Math.abs(r.x1 - r.x0), rh = Math.abs(r.y1 - r.y0);
      ctx.save();
      ctx.fillStyle = 'rgba(0,225,255,0.22)';
      ctx.fillRect(x, y, rw, rh);
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = Math.max(2, Math.round(w / 400));
      ctx.setLineDash([Math.max(6, w / 120), Math.max(4, w / 180)]);
      ctx.strokeRect(x, y, rw, rh);
      ctx.restore();
    }
  }, []);

  /** Reconstruit la surbrillance et notifie le parent. Throttlé à une frame. */
  const refreshOverlay = useCallback(() => {
    const { w, h } = dimsRef.current;
    const m = maskRef.current;
    overlayRef.current = m ? buildHighContrastOverlay(m, w, h) : null;
    redraw();
  }, [redraw]);

  const scheduleOverlayRebuild = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      refreshOverlay();
    });
  }, [refreshOverlay]);

  /** Encode le masque courant en PNG et le transmet au parent. */
  const commitMask = useCallback(() => {
    const { w, h } = dimsRef.current;
    const mask = maskRef.current;
    if (!mask) { setHasSelection(false); onChange(null); return; }
    let any = false;
    for (let i = 0; i < mask.length; i++) { if (mask[i]) { any = true; break; } }
    if (!any) { setHasSelection(false); onChange(null); return; }
    setHasSelection(true);

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

  /* ── Chargement de l'image ───────────────────────────────────────────── */

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
      maskRef.current = null;
      historyRef.current = [];
      overlayRef.current = null;
      rectRef.current = null;
      setHasSelection(false);
      setCanUndo(false);
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

  /* ── Baguette : SAM2 sur un point, AJOUTÉ au masque existant ─────────── */

  const runWand = useCallback(async (x: number, y: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ia/segment-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [{ x, y, label: 1 }],
          sourceUrl: sourceUrlRef.current ?? undefined,
          sourceImageDataUrl: sourceUrlRef.current ? undefined : sourceDataUrlRef.current,
        }),
      });
      const data = await res.json().catch(() => null) as { maskUrl?: string; sourceUrl?: string; error?: string } | null;
      if (data?.sourceUrl) sourceUrlRef.current = data.sourceUrl;
      if (!res.ok || !data?.maskUrl) {
        setError(data?.error || 'La baguette n\'a rien détecté ici. Utilisez le pinceau.');
        setLoading(false);
        return;
      }
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
            const mask = ensureMask();
            // UNION avec l'existant : la baguette complète le masque, elle ne
            // le remplace pas. C'est ce qui permet d'enchaîner baguette,
            // pinceau et gomme sur une même sélection.
            for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
              if ((d[i] + d[i + 1] + d[i + 2]) / 3 > 128) mask[p] = 1;
            }
          } catch {
            setError('Sélection illisible. Utilisez le pinceau.');
          }
        }
        refreshOverlay();
        commitMask();
        setLoading(false);
      };
      mimg.onerror = () => { setError('Sélection illisible. Utilisez le pinceau.'); setLoading(false); };
      mimg.src = `/api/ia/download?url=${encodeURIComponent(data.maskUrl)}&name=mask.png`;
      return;
    } catch {
      setError('Connexion interrompue. Réessayez.');
    }
    setLoading(false);
  }, [ensureMask, refreshOverlay, commitMask]);

  /* ── Pinceau / gomme ─────────────────────────────────────────────────── */

  const paintAt = useCallback((x: number, y: number) => {
    const { w, h } = dimsRef.current;
    if (!w || !h) return;
    const mask = ensureMask();
    const rad = brushSizeRef.current;
    const val = toolRef.current === 'erase' ? 0 : 1;
    const r2 = rad * rad;
    const minX = Math.max(0, Math.floor(x - rad)), maxX = Math.min(w - 1, Math.ceil(x + rad));
    const minY = Math.max(0, Math.floor(y - rad)), maxY = Math.min(h - 1, Math.ceil(y + rad));
    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const dx = xx - x, dy = yy - y;
        if (dx * dx + dy * dy <= r2) mask[yy * w + xx] = val;
      }
    }
  }, [ensureMask]);

  /* ── Rectangle ───────────────────────────────────────────────────────── */

  const fillRect = useCallback((r: { x0: number; y0: number; x1: number; y1: number }) => {
    const { w, h } = dimsRef.current;
    const mask = ensureMask();
    const x0 = Math.max(0, Math.floor(Math.min(r.x0, r.x1)));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(r.x0, r.x1)));
    const y0 = Math.max(0, Math.floor(Math.min(r.y0, r.y1)));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(r.y0, r.y1)));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) mask[yy * w + xx] = 1;
    }
  }, [ensureMask]);

  /* ── Géométrie clic → pixel image ────────────────────────────────────── */

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

    if (tool === 'wand') {
      pushHistory();
      void runWand(p.x, p.y);
      return;
    }
    if (tool === 'rect') {
      pushHistory();
      drawingRef.current = true;
      rectRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      try { (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }
    pushHistory();
    drawingRef.current = true;
    try { (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    paintAt(p.x, p.y);
    scheduleOverlayRebuild();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const p = getPos(e);
    if (tool === 'rect') {
      const r = rectRef.current;
      if (r) { r.x1 = p.x; r.y1 = p.y; redraw(); }
      return;
    }
    paintAt(p.x, p.y);
    scheduleOverlayRebuild();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try { (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (tool === 'rect') {
      const r = rectRef.current;
      rectRef.current = null;
      if (r && Math.abs(r.x1 - r.x0) > 2 && Math.abs(r.y1 - r.y0) > 2) fillRect(r);
      refreshOverlay();
    }
    commitMask();
  };

  /* ── Annuler / effacer ───────────────────────────────────────────────── */

  const undo = () => {
    if (loading || historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    maskRef.current = prev;
    setCanUndo(historyRef.current.length > 0);
    refreshOverlay();
    commitMask();
  };

  const clearAll = () => {
    if (loading) return;
    pushHistory();
    maskRef.current = null;
    overlayRef.current = null;
    rectRef.current = null;
    setHasSelection(false);
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

  const aide: Record<Tool, string> = {
    wand: 'Cliquez sur une surface : la baguette la détecte et l\'ajoute à votre sélection. Si elle déborde, corrigez à la gomme — inutile de tout refaire.',
    draw: 'Peignez la zone à changer. Débordez légèrement sur les bords : le moteur rend un meilleur résultat ainsi.',
    erase: 'Effacez ce qui a été sélectionné en trop.',
    rect: 'Glissez pour couvrir d\'un coup une rangée entière de meubles, puis affinez à la gomme.',
  };

  return (
    <div>
      {/* Outils — tous écrivent dans LE MÊME masque (refonte 12/09/2026). */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => setTool('wand')} style={{ ...toolBtn(tool === 'wand'), flex: '1 1 0', justifyContent: 'center' }}>
          <Wand2 size={14} /> Baguette
        </button>
        <button type="button" onClick={() => setTool('rect')} style={{ ...toolBtn(tool === 'rect'), flex: '1 1 0', justifyContent: 'center' }}>
          <Square size={14} /> Rectangle
        </button>
        <button type="button" onClick={() => setTool('draw')} style={{ ...toolBtn(tool === 'draw'), flex: '1 1 0', justifyContent: 'center' }}>
          <Paintbrush size={14} /> Pinceau
        </button>
        <button type="button" onClick={() => setTool('erase')} style={{ ...toolBtn(tool === 'erase'), flex: '1 1 0', justifyContent: 'center' }}>
          <Eraser size={14} /> Gomme
        </button>
      </div>

      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(48,64,53,0.55)', fontWeight: 600 }}>
        {aide[tool]}
      </p>

      {/* Le canevas était en width:100% sans limite de hauteur : sur une carte
          large la photo s'étalait, et un canevas de 1280 px affiché à ~1150 px
          CSS se retrouvait agrandi près de deux fois sur un écran haute densité
          — d'où le flou. On le borne donc, centré, en préservant son ratio. */}
      <div style={{
        position: 'relative',
        // Le cadre epouse l'image au lieu de s'etirer sur toute la carte :
        // une photo verticale bornee en hauteur ne fait plus que ~470 px de
        // large, et un conteneur pleine largeur laissait de grandes bandes
        // vides de chaque cote (et reléguait le badge loin de la photo).
        width: 'fit-content', maxWidth: '100%', margin: '0 auto',
        borderRadius: 14, overflow: 'hidden', background: '#f5eee8',
        border: '1px solid rgba(48,64,53,0.1)', display: 'flex', justifyContent: 'center',
      }}>
        <canvas
          ref={dispRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            width: 'auto', height: 'auto',
            maxWidth: '100%', maxHeight: 'min(68vh, 620px)',
            display: 'block', touchAction: 'none',
            cursor: loading ? 'wait' : 'crosshair',
          }}
        />
        {!hasSelection && !loading && (
          <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(26,42,30,0.72)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, pointerEvents: 'none' }}>
            {tool === 'wand' ? '✨ Cliquez sur la surface à changer'
              : tool === 'rect' ? '▭ Glissez sur la zone à changer'
                : tool === 'erase' ? '🧽 Effacez le trop-plein'
                  : '🖌️ Peignez la zone à changer'}
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
        {(tool === 'draw' || tool === 'erase') && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'rgba(48,64,53,0.7)' }}>
            Taille
            <input
              type="range" min={15} max={220} step={5} value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ width: 110, accentColor: accent }}
            />
          </label>
        )}
        <button type="button" onClick={undo} disabled={loading || !canUndo}
          style={{ ...toolBtn(false), marginLeft: 'auto', opacity: (loading || !canUndo) ? 0.5 : 1 }}>
          <Undo2 size={14} /> Annuler
        </button>
        <button type="button" onClick={clearAll} disabled={loading}
          style={{ ...toolBtn(false), opacity: loading ? 0.5 : 1 }}>
          <Trash2 size={14} /> Tout effacer
        </button>
      </div>
    </div>
  );
}
