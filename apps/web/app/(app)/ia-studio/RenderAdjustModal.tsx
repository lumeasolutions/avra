'use client';

/**
 * RenderAdjustModal — retouche NON DESTRUCTIVE d'un rendu IA déjà généré.
 *
 * Réglages instantanés (aucun appel IA, gratuit) : exposition, contraste,
 * saturation, chaleur (température), teinte, vignette + presets. Le rendu
 * d'origine n'est jamais modifié ; on exporte une NOUVELLE image retouchée.
 *
 * Aperçu : filtres CSS sur l'image + calques (chaleur/teinte en soft-light,
 * vignette en dégradé radial), le tout isolé (isolation) pour que les calques
 * ne se mélangent qu'à l'image.
 * Export : on refait EXACTEMENT le même rendu sur un <canvas> (ctx.filter +
 * compositing identique) et on télécharge en JPEG. L'image est récupérée via
 * le proxy same-origin /api/ia/download pour éviter un canvas « tainted ».
 */

import { useEffect, useState, useCallback } from 'react';
import { X, RotateCcw, Download, Loader2, SlidersHorizontal, Sun, Contrast, Droplet, Thermometer, Palette, Aperture } from 'lucide-react';

export interface Adjustments {
  exposure: number;    // -60..60  -> brightness
  contrast: number;    // -60..60  -> contrast
  saturation: number;  // -100..100 -> saturate
  temperature: number; // -100..100 (froid..chaud)
  tint: number;        // -100..100 (vert..magenta)
  vignette: number;    // 0..100
}

const DEFAULTS: Adjustments = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, vignette: 0 };

const PRESETS: { name: string; a: Adjustments }[] = [
  { name: 'Neutre',     a: DEFAULTS },
  { name: 'Chaleureux', a: { exposure: 4,  contrast: 6,  saturation: 8,  temperature: 35,  tint: 0,  vignette: 8 } },
  { name: 'Froid',      a: { exposure: 2,  contrast: 6,  saturation: 4,  temperature: -30, tint: 0,  vignette: 6 } },
  { name: 'Éclatant',   a: { exposure: 6,  contrast: 18, saturation: 22, temperature: 6,   tint: 0,  vignette: 6 } },
  { name: 'Doux',       a: { exposure: 6,  contrast: -12,saturation: -6, temperature: 8,   tint: 0,  vignette: 0 } },
  { name: 'Showroom',   a: { exposure: 8,  contrast: 12, saturation: 12, temperature: 12,  tint: -2, vignette: 12 } },
];

function filterString(a: Adjustments): string {
  const b = 1 + a.exposure / 100;
  const c = 1 + a.contrast / 100;
  const s = 1 + a.saturation / 100;
  return `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)}) saturate(${s.toFixed(3)})`;
}
function warmthOverlay(t: number): { color: string; alpha: number } | null {
  if (!t) return null;
  const alpha = (Math.abs(t) / 100) * 0.5;
  return { color: t > 0 ? 'rgb(255,150,40)' : 'rgb(40,150,255)', alpha };
}
function tintOverlay(t: number): { color: string; alpha: number } | null {
  if (!t) return null;
  const alpha = (Math.abs(t) / 100) * 0.4;
  return { color: t > 0 ? 'rgb(230,60,200)' : 'rgb(80,210,90)', alpha };
}

const SLIDERS: { key: keyof Adjustments; label: string; min: number; max: number; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { key: 'exposure',    label: 'Exposition / Lumière', min: -60, max: 60, icon: Sun },
  { key: 'contrast',    label: 'Contraste',            min: -60, max: 60, icon: Contrast },
  { key: 'saturation',  label: 'Saturation',           min: -100, max: 100, icon: Droplet },
  { key: 'temperature', label: 'Chaleur (température)', min: -100, max: 100, icon: Thermometer },
  { key: 'tint',        label: 'Teinte (vert ↔ magenta)', min: -100, max: 100, icon: Palette },
  { key: 'vignette',    label: 'Vignette',             min: 0, max: 100, icon: Aperture },
];

export function RenderAdjustModal({
  open, imageUrl, accent = '#8a6cc2', onClose,
}: {
  open: boolean;
  imageUrl: string | null;
  accent?: string;
  onClose: () => void;
}) {
  const [a, setA] = useState<Adjustments>(DEFAULTS);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setA(DEFAULTS); setError(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const isDirty = (Object.keys(DEFAULTS) as (keyof Adjustments)[]).some(k => a[k] !== DEFAULTS[k]);

  const exportImage = useCallback(async () => {
    if (!imageUrl) return;
    setExporting(true); setError(null);
    try {
      const res = await fetch(`/api/ia/download?url=${encodeURIComponent(imageUrl)}&name=render.jpg`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('img')); img.src = objUrl; });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('ctx');

      ctx.filter = filterString(a);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      const warm = warmthOverlay(a.temperature);
      if (warm) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = warm.alpha; ctx.fillStyle = warm.color; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      const tnt = tintOverlay(a.tint);
      if (tnt) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = tnt.alpha; ctx.fillStyle = tnt.color; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

      if (a.vignette > 0) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const inner = Math.min(canvas.width, canvas.height) * 0.30;
        const outer = Math.max(canvas.width, canvas.height) * 0.72;
        const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${(a.vignette / 100) * 0.6})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      URL.revokeObjectURL(objUrl);
      await new Promise<void>((resolve) => {
        canvas.toBlob((b) => {
          if (b) {
            const u = URL.createObjectURL(b);
            const link = document.createElement('a');
            link.href = u; link.download = `Avra-retouche-${Date.now()}.jpg`;
            document.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(u), 4000);
          }
          resolve();
        }, 'image/jpeg', 0.95);
      });
    } catch {
      setError("Impossible d'exporter l'image retouchée. Réessayez.");
    } finally {
      setExporting(false);
    }
  }, [imageUrl, a]);

  if (!open || !imageUrl) return null;

  const warm = warmthOverlay(a.temperature);
  const tnt = tintOverlay(a.tint);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15,23,18,0.62)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#304035]/8" style={{ background: `linear-gradient(135deg, ${accent}14, #fff)` }}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" style={{ color: accent }} />
            <p className="font-bold text-[#304035] text-sm">Ajuster le rendu — lumière, chaleur, contraste…</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#304035]/8 text-[#304035]/50 hover:text-[#304035]" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          {/* Aperçu live */}
          <div>
            <div style={{ position: 'relative', isolation: 'isolate', borderRadius: 14, overflow: 'hidden', background: '#111', border: `1.5px solid ${accent}28` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Aperçu retouché" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '58vh', objectFit: 'contain', filter: filterString(a) }} />
              {warm && <div style={{ position: 'absolute', inset: 0, background: warm.color, opacity: warm.alpha, mixBlendMode: 'soft-light', pointerEvents: 'none' }} />}
              {tnt && <div style={{ position: 'absolute', inset: 0, background: tnt.color, opacity: tnt.alpha, mixBlendMode: 'soft-light', pointerEvents: 'none' }} />}
              {a.vignette > 0 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${(a.vignette / 100) * 0.6}) 100%)` }} />
              )}
            </div>
            <p className="mt-2 text-[11px] text-[#304035]/45">Le rendu d'origine reste intact — tu télécharges une version retouchée.</p>
          </div>

          {/* Contrôles */}
          <div className="space-y-4">
            {/* Presets */}
            <div>
              <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-2">Ambiances</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => setA(p.a)}
                    className="rounded-full border px-3 py-1.5 text-xs font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors"
                    style={{ borderColor: `${accent}44` }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              {SLIDERS.map(({ key, label, min, max, icon: Ic }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#304035]/75">
                      <Ic className="h-3.5 w-3.5" style={{ color: accent }} /> {label}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-[#304035]/55">{a[key] > 0 ? `+${a[key]}` : a[key]}</span>
                  </div>
                  <input type="range" min={min} max={max} value={a[key]}
                    onChange={(e) => setA((s) => ({ ...s, [key]: Number(e.target.value) }))}
                    className="w-full" style={{ accentColor: accent }} />
                </div>
              ))}
            </div>

            {error && <p className="text-xs font-medium text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setA(DEFAULTS)} disabled={!isDirty}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#304035]/15 px-3 py-2.5 text-xs font-bold text-[#304035]/70 hover:bg-[#f5eee8] disabled:opacity-40 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
              </button>
              <button type="button" onClick={exportImage} disabled={exporting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-[.98] transition-all disabled:opacity-60 disabled:cursor-wait"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? 'Export…' : 'Télécharger la version retouchée'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
