'use client';

/**
 * ComparePhotosModal — Outil de comparaison visuelle de 2 images. Générique via
 * la prop `variant` : 'photos' (v2, état des lieux avant/après) ou 'plans' (v3,
 * deux versions d'un plan — cotes, cloisons, implantation).
 * Base FIABLE : les 2 images côte à côte + un slider avant/après. Couche
 * ASSISTANCE : l'IA (gpt-4o vision) liste les écarts visibles — l'humain valide
 * (avertissement affiché, fallback si l'IA échoue). Route : /api/ia/compare-photos
 * (le champ `mode` sélectionne le prompt photos ou plans).
 */
import { useCallback, useRef, useState } from 'react';
import { GitCompare, X, ImagePlus, Sparkles, AlertTriangle, Loader2, Columns2, MoveHorizontal, Plus, Minus, ShieldAlert, Wand2, RefreshCw } from 'lucide-react';

type DiffType = 'ajout' | 'manquant' | 'degradation' | 'modification' | 'autre';
interface Diff { zone: string; description: string; type: DiffType; gravite: 'faible' | 'moyenne' | 'elevee' }

const TYPE_CFG: Record<DiffType, { label: string; color: string; bg: string; border: string }> = {
  ajout:        { label: 'Ajout',        color: '#16a34a', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)' },
  manquant:     { label: 'Manquant',     color: '#dc2626', bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.28)' },
  degradation:  { label: 'Dégradation',  color: '#ea580c', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)' },
  modification: { label: 'Modification', color: '#2563eb', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)' },
  autre:        { label: 'Autre',        color: 'rgba(48,64,53,0.6)', bg: 'rgba(48,64,53,0.05)', border: 'rgba(48,64,53,0.15)' },
};
const GRAVITE_COLOR: Record<Diff['gravite'], string> = { faible: 'rgba(48,64,53,0.4)', moyenne: '#ea580c', elevee: '#dc2626' };

/** Variantes de l'outil : photos (état des lieux) ou plans (cotes / implantation). */
export type CompareImageVariant = 'photos' | 'plans';
interface VariantCfg {
  apiMode: 'photos' | 'plans';
  title: string; subtitle: string;
  slotA: string; slotB: string;
  importLabel: string; accept: string;
  tagA: string; tagB: string;
  aiButton: string; aiCount: (n: number) => string;
  emptyHint: React.ReactNode; warn: React.ReactNode;
}
const VARIANT: Record<CompareImageVariant, VariantCfg> = {
  photos: {
    apiMode: 'photos',
    title: 'Comparer deux photos',
    subtitle: "État des lieux avant / après — l'IA repère, vous validez.",
    slotA: 'Photo A (avant / référence)',
    slotB: 'Photo B (après / comparée)',
    importLabel: 'Importer une photo', accept: 'image/*',
    tagA: 'A · avant', tagB: 'B · après',
    aiButton: "Repérer les différences avec l'IA",
    aiCount: (n) => `${n} différence${n > 1 ? 's' : ''} repérée${n > 1 ? 's' : ''} par l'IA`,
    emptyHint: <>Importez les <b>deux photos</b> (A avant, B après) pour lancer la comparaison.</>,
    warn: <>L'IA vous <b>assiste</b> : elle peut manquer ou inventer une différence. <b>Vérifiez toujours vous-même</b> avec les photos avant de conclure (ex. facturation d'une dégradation).</>,
  },
  plans: {
    apiMode: 'plans',
    title: 'Comparer deux plans',
    subtitle: "Deux versions d'un plan (cotes, cloisons, implantation) — l'IA repère les écarts, vous validez.",
    slotA: 'Plan A (version de référence)',
    slotB: 'Plan B (version comparée)',
    importLabel: 'Importer un plan (image ou PDF)', accept: 'image/*,application/pdf,.pdf',
    tagA: 'A · réf.', tagB: 'B · comparé',
    aiButton: "Repérer les écarts avec l'IA",
    aiCount: (n) => `${n} écart${n > 1 ? 's' : ''} repéré${n > 1 ? 's' : ''} par l'IA`,
    emptyHint: <>Importez les <b>deux plans</b> (A référence, B comparé). <b>PDF accepté</b> (on lit la 1<sup>re</sup> page) ou image (JPG / PNG).</>,
    warn: <>L'IA vous <b>assiste</b> : elle peut manquer ou mal lire une cote. <b>Vérifiez toujours vous-même</b> sur les plans avant de conclure (ex. une cote ou une cloison qui change).</>,
  },
};

/** Compresse une image (max 1600px, JPEG 0.85) → data URL (payload IA raisonnable). */
function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r); height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Impossible de préparer l'image. Réessayez.")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        // Toujours ré-encoder en JPEG compressé : jamais renvoyer le fichier brut
        // (evite un HEIC illisible + un payload trop lourd pour l'analyse IA).
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error("Format d'image non supporté (HEIC ?). Convertissez la photo en JPG ou PNG."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

const isPdfFile = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

/** Rend la 1re page d'un PDF (ex. plan) en data URL JPEG, via pdfjs (même worker
 * que les aperçus dossier). Permet de comparer un plan PDF directement. */
async function pdfFirstPageToDataUrl(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  const buf = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: new Uint8Array(buf), disableAutoFetch: true, disableStream: true });
  const pdf = await task.promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 1600 / base.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const url = canvas.toDataURL('image/jpeg', 0.85);
  page.cleanup();
  return url;
}

/** Slider avant/après (drag horizontal). */
function BeforeAfter({ a, b, tagA, tagB }: { a: string; b: string; tagA: string; tagB: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const move = useCallback((clientX: number) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);
  return (
    <div
      ref={ref}
      onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (dragging.current) move(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', userSelect: 'none', touchAction: 'none', background: '#000', cursor: 'ew-resize' }}
    >
      {/* B (après) en fond */}
      <img src={b} alt="B" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
      {/* A (avant) clippé */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={a} alt="A" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
      </div>
      {/* poignée */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2, background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.5)', transform: 'translateX(-1px)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 30, height: 30, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          <MoveHorizontal size={15} color="#304035" />
        </div>
      </div>
      <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{tagA}</span>
      <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{tagB}</span>
    </div>
  );
}

/** Emplacement d'upload d'une photo. */
function Slot({ label, url, onPick, onClear, importLabel, accept }: { label: string; url: string | null; onPick: (f: File) => void; onClear: () => void; importLabel: string; accept: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
      {url ? (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(48,64,53,0.12)', aspectRatio: '4/3', background: '#f5f5f2' }}>
          <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <button onClick={onClear} title="Retirer" style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, aspectRatio: '4/3', borderRadius: 12, border: '1.5px dashed rgba(166,119,73,0.4)', background: 'rgba(166,119,73,0.04)', cursor: 'pointer', color: '#a67749', fontSize: 12, fontWeight: 700 }}>
          <ImagePlus size={22} />
          {importLabel}
          <input type="file" accept={accept} className="hidden" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
        </label>
      )}
    </div>
  );
}

export function ComparePhotosModal({ onClose, variant = 'photos' }: { onClose: () => void; variant?: CompareImageVariant }) {
  const cfg = VARIANT[variant];
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [view, setView] = useState<'slider' | 'cote'>('slider');
  const [loading, setLoading] = useState(false);
  const [diffs, setDiffs] = useState<Diff[] | null>(null);
  const [resume, setResume] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pick = async (which: 'a' | 'b', file: File) => {
    const pdf = isPdfFile(file);
    try {
      const url = pdf ? await pdfFirstPageToDataUrl(file) : await fileToCompressedDataUrl(file);
      if (which === 'a') setImgA(url); else setImgB(url);
      setDiffs(null); setError(null); // reset analyse quand on change un document
    } catch { setError(pdf ? "Impossible de lire ce PDF (protégé ou corrompu ?)." : "Impossible de charger cette image."); }
  };

  const analyse = async () => {
    if (!imgA || !imgB) return;
    setLoading(true); setError(null); setDiffs(null); setResume('');
    try {
      const res = await fetch('/api/ia/compare-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageA: imgA, imageB: imgB, mode: cfg.apiMode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || "L'analyse IA a échoué."); return; }
      setDiffs(Array.isArray(data.differences) ? data.differences : []);
      setResume(typeof data.resume === 'string' ? data.resume : '');
    } catch {
      setError('Erreur réseau pendant l\'analyse.');
    } finally {
      setLoading(false);
    }
  };

  const both = !!imgA && !!imgB;

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,17,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 62 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 880, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(48,64,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'linear-gradient(135deg, #2a3a30 0%, #3d5244 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(217,179,138,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GitCompare size={18} color="#d9b38a" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>{cfg.title}</h2>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>{cfg.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ padding: 7, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {/* Upload des 2 photos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Slot label={cfg.slotA} importLabel={cfg.importLabel} accept={cfg.accept} url={imgA} onPick={(f) => pick('a', f)} onClear={() => { setImgA(null); setDiffs(null); setError(null); setResume(''); }} />
            <Slot label={cfg.slotB} importLabel={cfg.importLabel} accept={cfg.accept} url={imgB} onPick={(f) => pick('b', f)} onClear={() => { setImgB(null); setDiffs(null); setError(null); setResume(''); }} />
          </div>

          {both && (
            <>
              {/* Bascule vue */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 10px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(48,64,53,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Comparaison visuelle</span>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'inline-flex', background: 'rgba(48,64,53,0.06)', borderRadius: 9, padding: 3, gap: 2 }}>
                  {([['slider', 'Avant / après', MoveHorizontal], ['cote', 'Côte à côte', Columns2]] as const).map(([m, lbl, Ic]) => (
                    <button key={m} onClick={() => setView(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: view === m ? '#fff' : 'transparent', color: view === m ? '#304035' : 'rgba(48,64,53,0.5)', boxShadow: view === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                      <Ic size={13} />{lbl}
                    </button>
                  ))}
                </div>
              </div>

              {view === 'slider' ? (
                <BeforeAfter a={imgA!} b={imgB!} tagA={cfg.tagA} tagB={cfg.tagB} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[[cfg.tagA, imgA!], [cfg.tagB, imgB!]].map(([lbl, u]) => (
                    <div key={lbl} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', background: '#000', border: '1px solid rgba(48,64,53,0.1)' }}>
                      <img src={u} alt={lbl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{lbl}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Analyse IA */}
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={analyse}
                  disabled={loading}
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? 'rgba(48,64,53,0.15)' : 'linear-gradient(135deg, #a67749 0%, #c89665 100%)', color: '#fff', fontSize: 13.5, fontWeight: 800, boxShadow: loading ? 'none' : '0 4px 12px rgba(166,119,73,0.3)' }}
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Analyse en cours…</> : diffs ? <><RefreshCw size={16} /> Relancer l'analyse IA</> : <><Wand2 size={16} /> {cfg.aiButton}</>}
                </button>

                {error && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <ShieldAlert size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>{error} La comparaison visuelle ci-dessus reste disponible.</p>
                  </div>
                )}

                {diffs && !error && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Sparkles size={14} color="#a67749" />
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#304035' }}>
                        {diffs.length === 0 ? 'Aucun écart net repéré' : cfg.aiCount(diffs.length)}
                      </span>
                    </div>
                    {resume && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(48,64,53,0.6)', fontStyle: 'italic' }}>{resume}</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {diffs.map((d, i) => {
                        const cfg = TYPE_CFG[d.type] ?? TYPE_CFG.autre;
                        return (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <span style={{ fontSize: 9.5, fontWeight: 800, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#304035' }}>{d.description}</div>
                              <div style={{ fontSize: 11, color: 'rgba(48,64,53,0.5)', marginTop: 1 }}>{d.zone}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: GRAVITE_COLOR[d.gravite] ?? 'rgba(48,64,53,0.4)', textTransform: 'uppercase', flexShrink: 0 }}>{d.gravite}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Avertissement humain — toujours visible */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)' }}>
                  <AlertTriangle size={15} color="#ea580c" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 11.5, color: '#9a4a12', lineHeight: 1.4 }}>
                    {cfg.warn}
                  </p>
                </div>
              </div>
            </>
          )}

          {!both && (
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12.5, color: 'rgba(48,64,53,0.5)' }}>
              {cfg.emptyHint}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(48,64,53,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: '#fafaf8' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(48,64,53,0.45)' }}>
            <Plus size={11} color="#16a34a" /> ajout &nbsp; <Minus size={11} color="#dc2626" /> manquant
          </span>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#304035', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
