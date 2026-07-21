'use client';

/**
 * ColoristeMaskCanvas — outil de sélection au pinceau pour le module Coloriste ✨.
 *
 * MyArchitectAI /change-textures exige un `mask` (image noir/blanc de la zone à
 * retexturer). Ce composant laisse l'utilisateur PEINDRE la surface (façades,
 * plan, poignées…) directement sur la photo, puis produit :
 *   - `maskDataUrl`   : PNG noir (garder) + blanc (zone à changer), taille = source.
 *   - `sourceDataUrl` : la photo redimensionnée aux MÊMES dimensions que le masque
 *                       (indispensable pour que l'API aligne masque et image).
 *
 * Conception : Pointer Events (doigt + souris + stylet, mobile = desktop), un
 * canvas masque hors-écran (traits blancs opaques sur transparent = vérité) et un
 * canvas visible qui affiche la photo + un surlignage translucide de la sélection.
 */

import { useRef, useEffect, useState, useCallback, type PointerEvent as ReactPointerEvent, type CSSProperties } from 'react';
import { Brush, Eraser, Undo2, Trash2, FlipHorizontal2 } from 'lucide-react';

const MAX_DIM = 1280;

export interface MaskResult { maskDataUrl: string; sourceDataUrl: string }

interface Props {
  file: File;
  accent?: string;
  onChange: (result: MaskResult | null) => void;
}

export function ColoristeMaskCanvas({ file, accent = '#2f9e8f', onChange }: Props) {
  const dispRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null); // hors-écran : traits blancs sur transparent
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const paintingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const tmpRef = useRef<HTMLCanvasElement | null>(null); // canvas de teinte réutilisé (évite les réallocs)
  const rafRef = useRef<number | null>(null);

  const [brush, setBrush] = useState(48);
  const [mode, setMode] = useState<'brush' | 'eraser'>('brush');
  const [hasStrokes, setHasStrokes] = useState(false);
  const [ready, setReady] = useState(false);
  // Sens du masque : false = zone peinte À CHANGER (blanc) ; true = inversé
  // (zone peinte GARDÉE). Selon la convention de l'API, l'un des deux est le bon.
  const [invert, setInvert] = useState(false);

  // ── Rendu du canvas visible : photo + surlignage teal de la sélection ──────
  const render = useCallback(() => {
    const disp = dispRef.current, img = imgRef.current, mc = maskRef.current;
    if (!disp || !img || !mc) return;
    const ctx = disp.getContext('2d');
    if (!ctx) return;
    const { w, h } = dimsRef.current;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    // Teinte accent là où le masque est peint (source-in sur une copie du masque).
    // Canvas de teinte réutilisé (pas de réalloc à chaque frame).
    let tmp = tmpRef.current;
    if (!tmp || tmp.width !== w || tmp.height !== h) {
      tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      tmpRef.current = tmp;
    }
    const tctx = tmp.getContext('2d');
    if (tctx) {
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, w, h);
      tctx.drawImage(mc, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      tctx.fillStyle = accent;
      tctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.45;
      ctx.drawImage(tmp, 0, 0);
      ctx.globalAlpha = 1;
    }
  }, [accent]);

  // Rendu throttlé (rAF) — fluide même en peignant vite sur mobile.
  const requestRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; render(); });
  }, [render]);

  // Annule le rAF en attente au démontage.
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  // ── Chargement de l'image + init des canvas à chaque changement de fichier ──
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
      const mc = document.createElement('canvas');
      mc.width = w; mc.height = h;
      maskRef.current = mc;
      undoRef.current = [];
      const disp = dispRef.current;
      if (disp) { disp.width = w; disp.height = h; }
      setHasStrokes(false);
      setReady(true);
      render();
      onChange(null);
    };
    img.src = url;
    return () => { dead = true; URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // ── Géométrie : coord. écran → coord. canvas ───────────────────────────────
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

  const strokeTo = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const mc = maskRef.current;
    const ctx = mc?.getContext('2d');
    if (!mc || !ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brush;
    ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    requestRender();
  };

  // ── Émet {mask, source} si non vide, sinon null ────────────────────────────
  // `inv` = sens du masque. Par défaut on lit l'état `invert` ; le bouton passe
  // la valeur cible directement pour ré-émettre sans attendre le re-render.
  const emit = (inv: boolean = invert) => {
    const mc = maskRef.current, img = imgRef.current;
    if (!mc || !img) { onChange(null); return; }
    const { w, h } = dimsRef.current;
    const mctx = mc.getContext('2d');
    if (!mctx) { onChange(null); return; }
    const data = mctx.getImageData(0, 0, w, h).data;
    let painted = false;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 10) { painted = true; break; } }
    if (!painted) { setHasStrokes(false); onChange(null); return; }
    setHasStrokes(true);
    const me = document.createElement('canvas'); me.width = w; me.height = h;
    const mectx = me.getContext('2d');
    // Source exportée aux mêmes dimensions.
    const se = document.createElement('canvas'); se.width = w; se.height = h;
    const sectx = se.getContext('2d');
    if (!mectx || !sectx) { onChange(null); return; }
    if (inv) {
      // Inversé : fond BLANC + zone peinte NOIRE (zone peinte = gardée).
      mectx.fillStyle = '#fff';
      mectx.fillRect(0, 0, w, h);
      const blk = document.createElement('canvas'); blk.width = w; blk.height = h;
      const bctx = blk.getContext('2d');
      if (bctx) {
        bctx.drawImage(mc, 0, 0);
        bctx.globalCompositeOperation = 'source-in';
        bctx.fillStyle = '#000';
        bctx.fillRect(0, 0, w, h);
        mectx.drawImage(blk, 0, 0);
      }
    } else {
      // Normal : fond NOIR + zone peinte BLANCHE (zone peinte = à changer).
      mectx.fillStyle = '#000';
      mectx.fillRect(0, 0, w, h);
      mectx.drawImage(mc, 0, 0);
    }
    sectx.drawImage(img, 0, 0, w, h);
    onChange({
      maskDataUrl: me.toDataURL('image/png'),
      sourceDataUrl: se.toDataURL('image/jpeg', 0.9),
    });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    e.preventDefault();
    try { dispRef.current?.setPointerCapture(e.pointerId); } catch { /* noop */ }
    const mc = maskRef.current;
    const ctx = mc?.getContext('2d');
    if (mc && ctx) {
      undoRef.current.push(ctx.getImageData(0, 0, mc.width, mc.height));
      if (undoRef.current.length > 8) undoRef.current.shift();
    }
    paintingRef.current = true;
    const p = getPos(e);
    lastRef.current = p;
    strokeTo(p, p);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!paintingRef.current) return;
    e.preventDefault();
    const p = getPos(e);
    strokeTo(lastRef.current ?? p, p);
    lastRef.current = p;
  };
  const onPointerUp = () => {
    if (!paintingRef.current) return;
    paintingRef.current = false;
    lastRef.current = null;
    emit();
  };

  const undo = () => {
    const mc = maskRef.current;
    const ctx = mc?.getContext('2d');
    const snap = undoRef.current.pop();
    if (mc && ctx && snap) { ctx.putImageData(snap, 0, 0); render(); emit(); }
  };
  const clearAll = () => {
    const mc = maskRef.current;
    const ctx = mc?.getContext('2d');
    if (mc && ctx) {
      ctx.clearRect(0, 0, mc.width, mc.height);
      undoRef.current = [];
      setHasStrokes(false);
      render();
      onChange(null);
    }
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
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
        />
        {!hasStrokes && (
          <div style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(26,42,30,0.72)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, pointerEvents: 'none' }}>
            ✏️ Peignez la surface à changer
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={() => setMode('brush')} style={toolBtn(mode === 'brush')}>
          <Brush size={14} /> Pinceau
        </button>
        <button type="button" onClick={() => setMode('eraser')} style={toolBtn(mode === 'eraser')}>
          <Eraser size={14} /> Gomme
        </button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'rgba(48,64,53,0.7)' }}>
          Taille
          <input type="range" min={10} max={140} value={brush} onChange={(e) => setBrush(Number(e.target.value))}
            style={{ accentColor: accent, width: 110 }} />
        </label>
        <button
          type="button"
          onClick={() => { const nv = !invert; setInvert(nv); emit(nv); }}
          style={{ ...toolBtn(invert), marginLeft: 'auto' }}
          title="Si la mauvaise zone change, cliquez ici pour inverser la sélection."
        >
          <FlipHorizontal2 size={14} /> {invert ? 'Zone inversée' : 'Inverser'}
        </button>
        <button type="button" onClick={undo} style={toolBtn(false)}>
          <Undo2 size={14} /> Annuler
        </button>
        <button type="button" onClick={clearAll} style={toolBtn(false)}>
          <Trash2 size={14} /> Effacer
        </button>
      </div>
      <p style={{ margin: '8px 2px 0', fontSize: 11, color: 'rgba(48,64,53,0.55)', lineHeight: 1.4 }}>
        Astuce : si c'est la <strong>mauvaise surface</strong> qui change dans le résultat,
        cliquez sur <strong>« Inverser »</strong> puis relancez.
      </p>
    </div>
  );
}
