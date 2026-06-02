'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  Sparkles, Loader2, Plus, X, Check, Upload,
  Paintbrush, Wand2, Camera, FileImage,
  Palette, RotateCcw, Eye, Zap, Star,
  ChevronRight, ArrowRight, Layers, Clock,
  Image as ImageIcon, CheckCircle2, ScanLine,
  Lightbulb, Target, Award, AlertTriangle,
  Sun, Lamp, Monitor, Home, Building2,
} from 'lucide-react';
import { useDossierStore, useHistoryStore, useAuthStore } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';
import HistoryPanel, { type IaJobRow } from './HistoryPanel';

/* ─── Types front-end uniquement (pas d'import depuis lib/server) ─── */
type FinishType   = 'mat' | 'satiné' | 'brillant' | 'brossé' | 'bois' | 'miroir' | 'verre-mat';
type LightingType = 'naturelle' | 'spots' | 'mixte';
type RoomSizeType = 'petite' | 'moyenne' | 'grande' | 'ouverte';
type StyleType    = 'contemporain' | 'classique' | 'industriel' | 'scandinave' | 'haussmannien';

/* ─── Appels API routes (prompt + Flux restent côté serveur) ─── */
async function callColoristAPI(params: {
  facadeHex: string; poigneeHex: string; planHex: string;
  facadeFinish: FinishType; lightingStyle: LightingType;
  poigneeFinish?: FinishType; planFinish?: FinishType;
  handleMaterial?: string; countertopMaterial?: string;
  sourceImageDataUrl?: string;
  /** Texture data URL ACTIVE (utilisée en hint matière côté serveur). */
  facadeTextureDataUrl?: string;
  poigneeTextureDataUrl?: string;
  planTextureDataUrl?: string;
  /** Mode de rendu par élément (19/05/2026, demande asso) :
   *   - 'color'   : couleur seule (texture ignorée)
   *   - 'texture' : texture seule (couleur ignorée pour la matière)
   *   - 'mix'     : combinaison couleur + texture (couleur teinte la texture)
   *   Si absent : mode déduit (texture présente → 'mix' par défaut). */
  facadeColorMode?:  'color' | 'texture' | 'mix';
  poigneeColorMode?: 'color' | 'texture' | 'mix';
  planColorMode?:    'color' | 'texture' | 'mix';
  numImages?: number;
}): Promise<{ imageUrl: string | null; imageUrls?: string[]; error?: string; steps?: PipelineStep[] | null }> {
  const res = await fetch('/api/ia/coloriste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // Même protection que callRenduAPI : fallback gracieux sur réponses non-JSON
  // (timeout Vercel, plain text "An error occurred", HTML error page).
  const text = await res.text();
  let parsed: { imageUrl?: string | null; imageUrls?: string[]; error?: unknown; message?: unknown; code?: unknown; steps?: PipelineStep[] | null } | null = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }

  // Coercion défensive (BUG 18/05/2026 : Vercel renvoie parfois une enveloppe
  // {code, id, message} qu'on stockait tel quel dans colorError, ce qui faisait
  // crasher React au render — "Objects are not valid as a React child" #31).
  const coerceError = (e: unknown): string | undefined => {
    if (e == null) return undefined;
    if (typeof e === 'string') return e;
    if (typeof e === 'object' && e !== null) {
      const obj = e as Record<string, unknown>;
      const fromMessage = typeof obj.message === 'string' ? obj.message : undefined;
      const fromCode    = typeof obj.code    === 'string' ? obj.code    : undefined;
      return fromMessage ?? fromCode ?? 'Erreur serveur';
    }
    return String(e);
  };

  if (parsed) {
    // Cas standard : notre route renvoie { imageUrl, imageUrls, error: string }
    // Cas Vercel envelope (500 uncaught) : { code, id, message } sans `error`
    const errorMessage = coerceError(parsed.error) ?? (
      !res.ok ? coerceError(parsed.message) : undefined
    );
    return {
      imageUrl:  typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null,
      imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter(u => typeof u === 'string') as string[] : undefined,
      error:     errorMessage,
      steps:     Array.isArray(parsed.steps) ? parsed.steps : null,
    };
  }

  // Fallback : réponse non-JSON, on déduit du statut HTTP
  let message = 'Le serveur n\'a pas pu générer la colorisation.';
  if (res.status === 504) {
    message = 'La colorisation a pris trop de temps (timeout). Réessayez ou simplifiez la demande.';
  } else if (res.status === 502) {
    message = 'Service IA momentanément indisponible (upload images). Réessayez dans une minute.';
  } else if (res.status === 413) {
    message = 'Image fournie trop volumineuse pour le serveur.';
  } else if (res.status === 429) {
    message = 'Trop de générations dans la dernière heure. Patientez un peu.';
  } else if (res.status === 401) {
    message = 'Session expirée — reconnectez-vous.';
  } else if (res.status === 400) {
    message = 'Photo ou paramètres invalides. Vérifiez le format de l\'image.';
  } else if (text.toLowerCase().includes('an error occurred')) {
    message = 'Erreur serveur (probablement timeout fal.ai). Réessayez dans 30s.';
  }
  return { imageUrl: null, error: message };
}

async function callRenduAPI(params: {
  facades: string; planTravail: string; style: StyleType;
  lightingStyle: LightingType; roomSize: RoomSizeType;
  /** Optionnel : description du sol (parquet, carrelage, béton ciré...) */
  sol?: string;
  /** Optionnel : description des murs (peinture, papier peint, lambris...) */
  murs?: string;
  /** Image de référence OBLIGATOIRE (plan WinnerFlex, render 3D, sketch, inspi). */
  referenceImageDataUrl: string;
  /** Dimensions natives de l'image source (avant compression) — utilisées
   * comme anchor numérique dans le prompt Kontext pour forcer le respect
   * du ratio et des proportions exactes. */
  sourceWidth?: number;
  sourceHeight?: number;
  /** Phase 2 — active le refinement SAM+Inpaint après ControlNet/Kontext.
   * +20-30s de latence, +1% de fidélité matériaux. */
  maxPrecision?: boolean;
  /** Phase 5 — nombre de fois où l'utilisateur a cliqué "Régénérer" pour
   * cette image source (>0 = non satisfait du précédent rendu). */
  userRetryCount?: number;
  numImages?: number;
}): Promise<{ imageUrl: string | null; imageUrls?: string[]; error?: string }> {
  const res = await fetch('/api/ia/rendu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // FIX 05/05/2026 + 18/05/2026 : on parse défensivement et on coerce tout
  // `error` qui ne serait pas une string (Vercel envelope {code, id, message}
  // sur uncaught throws) → évite React #31 au render.
  const text = await res.text();
  let parsed: { imageUrl?: string | null; imageUrls?: string[]; error?: unknown; message?: unknown } | null = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }

  const coerceError = (e: unknown): string | undefined => {
    if (e == null) return undefined;
    if (typeof e === 'string') return e;
    if (typeof e === 'object' && e !== null) {
      const obj = e as Record<string, unknown>;
      return (typeof obj.message === 'string' ? obj.message
        : typeof obj.code === 'string'    ? obj.code
        : 'Erreur serveur');
    }
    return String(e);
  };

  if (parsed) {
    const errorMessage = coerceError(parsed.error) ?? (
      !res.ok ? coerceError(parsed.message) : undefined
    );
    return {
      imageUrl:  typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null,
      imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter(u => typeof u === 'string') as string[] : undefined,
      error:     errorMessage,
    };
  }

  // Fallback : pas du tout JSON
  let message = 'Le serveur n\'a pas pu générer le rendu.';
  if (res.status === 504 || res.status === 502) {
    message = 'Le rendu a pris trop de temps (timeout serveur). Réessayez ou simplifiez votre demande.';
  } else if (res.status === 413) {
    message = 'Image fournie trop volumineuse pour le serveur.';
  } else if (res.status === 429) {
    message = 'Trop de générations dans la dernière heure. Patientez un peu.';
  } else if (res.status === 401) {
    message = 'Session expirée — reconnectez-vous.';
  } else if (text.toLowerCase().includes('an error occurred')) {
    message = 'Erreur serveur (probablement timeout fal.ai). Réessayez dans 30s.';
  }
  return { imageUrl: null, error: message };
}

/* ─── Helper : convertit un File en data URL pour transmission JSON ─── */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresse une image côté navigateur : la redimensionne pour que son côté le
 * plus long fasse `maxSide` px, puis l'exporte en JPEG qualité 0.85.
 * Utilisé pour rester sous la limite Vercel (4,5 Mo par requête) quand on
 * envoie photo cuisine + 3 textures dans le même POST.
 *
 * Si le fichier dépasse `maxSide` × `maxSide`, on resize. Sinon on garde tel
 * quel (compression JPEG quand même pour normaliser le format).
 *
 * Fallback : si le canvas plante (HEIC iPhone, SVG, fichier corrompu), on
 * renvoie le data URL brut. Mieux qu'un crash.
 */
/** Phase 3 — analyse rapide de la qualité d'une image source (côté browser)
 *  avant envoi au serveur. Permet d'avertir l'utilisateur si l'image risque
 *  de faire dériver Kontext/ControlNet (basse résolution, contraste très
 *  faible, ratio aberrant). N'empêche pas l'envoi — l'utilisateur décide. */
interface SourceQualityCheck {
  okToSend:    boolean;
  warnings:    string[];
  width:       number;
  height:      number;
}
async function analyzeSourceImageQuality(file: File): Promise<SourceQualityCheck> {
  const out: SourceQualityCheck = { okToSend: true, warnings: [], width: 0, height: 0 };
  try {
    const objUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload  = () => resolve(i);
      i.onerror = () => reject(new Error('image illisible'));
      i.src = objUrl;
    });
    out.width  = img.naturalWidth;
    out.height = img.naturalHeight;

    // Résolution minimale recommandée : 800 px sur le côté long.
    const longest = Math.max(out.width, out.height);
    if (longest < 800) {
      out.warnings.push(`Image basse résolution (${out.width}×${out.height}). Pour un résultat fidèle, importez une image d'au moins 800 px de côté.`);
    }

    // Ratio aberrant : panoramique extrême ou bandeau très étroit.
    const ratio = out.width / out.height;
    if (ratio > 3 || ratio < 0.33) {
      out.warnings.push(`Format atypique (ratio ${ratio.toFixed(2)}). L'IA risque de mal cadrer.`);
    }

    // Contraste : on échantillonne sur un canvas 64×64 et on calcule la
    // variance de luminance. Variance < 400 ≈ image très peu contrastée
    // (sketch flou, photo très brumeuse) → Kontext interprète librement.
    try {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const cx = c.getContext('2d');
      if (cx) {
        cx.drawImage(img, 0, 0, 64, 64);
        const data = cx.getImageData(0, 0, 64, 64).data;
        let sum = 0, sumSq = 0;
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += lum; sumSq += lum * lum;
        }
        const n = data.length / 4;
        const mean = sum / n;
        const variance = sumSq / n - mean * mean;
        if (variance < 400) {
          out.warnings.push(`Image peu contrastée (variance ${Math.round(variance)}). Préférez un plan ou un rendu 3D net.`);
        }
      }
    } catch { /* canvas peut échouer sur certains navigateurs anciens — non bloquant */ }

    URL.revokeObjectURL(objUrl);
  } catch {
    out.warnings.push('Impossible d\'analyser l\'image (format non supporté ?).');
    out.okToSend = false;
  }
  return out;
}

async function compressImageToDataUrl(file: File, maxSide: number = 2048): Promise<string> {
  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload  = () => resolve(i);
      i.onerror = () => reject(new Error('Image illisible (format non supporté ?)'));
      i.src = objectUrl;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight);

    // BYPASS COMPRESSION si l'image est déjà sous maxSide ET pèse <3 Mo —
    // recompresser en JPEG quand pas nécessaire écrase des détails fins
    // (lignes de plans WinnerFlex, contours de meubles), ce qui faisait
    // dériver Kontext. La limite Vercel body est 4.5 Mo → 3 Mo = marge sûre.
    if (longest <= maxSide && file.size <= 3 * 1024 * 1024) {
      URL.revokeObjectURL(objectUrl);
      return fileToDataUrl(file);
    }

    // Sinon redimensionnement uniquement si nécessaire (longest > maxSide).
    const scale = longest > maxSide ? maxSide / longest : 1;
    const w = Math.round(img.naturalWidth  * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible');
    // imageSmoothing high quality pour préserver les contours fins (Canny-friendly).
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(objectUrl);

    // JPEG q=0.92 (au lieu de 0.85) : préserve les contours fins indispensables
    // au pipeline Canny/ControlNet et au respect strict des proportions par Kontext.
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    // Fallback gracieux : on renvoie le data URL brut sans compression
    console.warn('[compressImage] fallback brut:', err);
    return fileToDataUrl(file);
  }
}

/* ─── Reporting transparent du pipeline SAM (par région) ─── */
interface PipelineStep {
  region:     'facade' | 'poignee' | 'plan';
  maskFound:  boolean;
  inpaintOk:  boolean;
  durationMs: number;
}

/* ─── Estimations affichées (données statiques, pas besoin du serveur) ─── */
function estimateCost(module: 'coloriste' | 'rendu'): string {
  // Coloriste utilise désormais flux-pro/kontext (single) ou /kontext/multi
  // (multi-image) selon le nombre d'inputs — plus rapide que /max/multi et
  // moins cher (~$0.04-0.06 / image vs $0.10).
  return module === 'coloriste' ? '~0,05 €' : '~0,06 €';
}
function estimateDuration(module: 'coloriste' | 'rendu'): string {
  return module === 'coloriste' ? '10–20 sec' : '10–20 sec';
}

/* ─────────────────────────────────────────── ANIMATIONS */
const CSS = `
@keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn   { from{opacity:0} to{opacity:1} }
@keyframes slideR   { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
@keyframes shimmer  { 0%,100%{opacity:.5} 50%{opacity:1} }
@keyframes spin     { to{transform:rotate(360deg)} }
@keyframes pulse2   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:.85} }
@keyframes bar      { from{width:0%} to{width:100%} }
@keyframes glow     { 0%,100%{box-shadow:0 0 0 0 rgba(166,119,73,0)} 50%{box-shadow:0 0 28px 6px rgba(166,119,73,0.22)} }
@keyframes dotPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
.fu  { animation:fadeUp  .4s cubic-bezier(.16,1,.3,1) both }
.fi  { animation:fadeIn  .3s ease both }
.sr  { animation:slideR  .35s cubic-bezier(.16,1,.3,1) both }
.sh  { animation:shimmer 1.6s ease-in-out infinite }
.gl  { animation:glow   2.5s ease-in-out infinite }
.p2  { animation:pulse2 1.8s ease-in-out infinite }
.dp  { animation:dotPulse 1.2s ease-in-out infinite }
.d1  { animation-delay:.06s } .d2 { animation-delay:.12s } .d3 { animation-delay:.18s }
.d4  { animation-delay:.24s } .d5 { animation-delay:.30s }
`;

/* ─────────────────────────────────────────── TYPES */
type Module = 'coloriste' | 'rendu';
interface Preset { name:string; facade:string; poignee:string; plan:string; desc:string; mood:string; finish:FinishType; handleMaterial:string; countertopMaterial:string }
interface Item   { id:string; module:Module; prompt:string; dossier:string; ts:string; color:string; imageUrl?:string; imageUrls?:string[]; steps?: PipelineStep[] | null }

const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

/* ─────────────────────────────────────────── DONNÉES */
const PRESETS: Preset[] = [
  { name:'Noir Absolu',    facade:'#111111', poignee:'#C0C0C0', plan:'#F2EBE0', desc:'Inox brossé · Marbre blanc',      mood:'Luxe contemporain',      finish:'mat',     handleMaterial:'brushed stainless steel handles',     countertopMaterial:'white Calacatta marble countertop' },
  { name:'Blanc Satiné',   facade:'#F5F3EF', poignee:'#C8A050', plan:'#1A1A1A', desc:'Or poli · Ardoise noire',          mood:'Élégance classique',     finish:'satiné',  handleMaterial:'polished gold handles',               countertopMaterial:'black slate countertop' },
  { name:'Chêne Fumé',     facade:'#7A5C3A', poignee:'#6A5040', plan:'#E8E0D0', desc:'Cuir · Quartz crème',              mood:'Chaleur naturelle',      finish:'bois',    handleMaterial:'dark leather pull handles',           countertopMaterial:'cream quartz countertop' },
  { name:'Gris Ardoise',   facade:'#3D3D3D', poignee:'#909090', plan:'#FAFAFA', desc:'Inox mat · Blanc neige',           mood:'Sobre & moderne',        finish:'mat',     handleMaterial:'matte nickel bar handles',            countertopMaterial:'bright white quartz countertop' },
  { name:'Sauge Premium',  facade:'#6B8F71', poignee:'#B07848', plan:'#D4C9A8', desc:'Cuivre · Pierre calcaire',         mood:'Nature raffinée',        finish:'satiné',  handleMaterial:'antique copper handles',              countertopMaterial:'limestone beige countertop' },
  { name:'Bleu Nuit',      facade:'#1B3254', poignee:'#D4A855', plan:'#EDE8DC', desc:'Laiton · Travertin clair',         mood:'Prestige & profondeur',  finish:'mat',     handleMaterial:'warm brass bar handles',              countertopMaterial:'travertine ivory countertop' },
  { name:'Terracotta',     facade:'#C4602A', poignee:'#2C2C2C', plan:'#F0EAD8', desc:'Noir mat · Bois clair',            mood:'Soleil méditerranéen',   finish:'mat',     handleMaterial:'matte graphite black handles',        countertopMaterial:'light oak wood countertop' },
  { name:'Béton Ciré',     facade:'#8A8A82', poignee:'#5A5A5A', plan:'#2A2A2A', desc:'Graphite · Ardoise noire',         mood:'Industriel chic',        finish:'brossé',  handleMaterial:'dark pewter grey bar handles',        countertopMaterial:'charcoal anthracite countertop' },
];

// Pipeline Kontext (mai 2026 v4) : édition image guidée par instruction.
// 3 vraies étapes côté serveur, on les surface ici pour l'UI.
const LOADING_STEPS_COLOR = [
  'Upload de votre photo vers fal-cdn',
  'Construction du prompt impératif',
  'Édition guidée par Flux Kontext',
  'Sauvegarde du résultat',
];
// Étapes réelles du pipeline rendu (19/05/2026, mode Flux Pro Ultra premium)
const LOADING_STEPS_RENDU = [
  'Analyse de vos paramètres',
  'Construction du prompt premium photoréaliste',
  'Génération Flux Pro Ultra (Hasselblad émulation)',
  'Optimisation finale et sauvegarde',
];

/* ─────────────────────────────────────────── COMPOSANTS */

/** Barre de progression animée */
function ProgressBar({ steps, color }: { steps:string[]; color:string }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (active >= steps.length - 1) return;
    const t = setTimeout(() => setActive(a => a+1), 600 + Math.random()*400);
    return () => clearTimeout(t);
  }, [active, steps.length]);
  return (
    <div className="space-y-3">
      <div className="h-1.5 w-full rounded-full bg-black/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width:`${((active+1)/steps.length)*100}%`, background:color }}
        />
      </div>
      <div className="space-y-1.5">
        {steps.map((s,i) => (
          <div key={s} className={`flex items-center gap-2.5 transition-all duration-300 ${i <= active ? 'opacity-100' : 'opacity-30'}`}>
            {i < active  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{color}} /> :
             i === active ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" style={{color}} /> :
                            <div className="h-3.5 w-3.5 rounded-full border border-current shrink-0 opacity-30" />}
            <span className={`text-xs ${i === active ? 'font-semibold text-[#304035]' : 'text-[#304035]/60'}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Zone de dépôt de fichier */
function Drop({ label, sub, onFile, file, tips, accent }:{
  label:string; sub:string; onFile:(f:File)=>void; file:File|null; tips?:string[]; accent:string
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const drop = useCallback((e:React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) onFile(f);
  }, [onFile]);
  return (
    <div>
      {label && <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-2">{label}</p>}
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e=>{e.preventDefault();setDrag(true)}}
        onDragLeave={()=>setDrag(false)}
        onDrop={drop}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 group ${
          drag  ? 'scale-[1.01] border-[#a67749] bg-[#a67749]/8' :
          file  ? 'border-[#10b981]/50 bg-[#10b981]/5' :
                  'border-[#304035]/15 bg-[#f5eee8]/40 hover:border-[#a67749]/50 hover:bg-[#a67749]/5 hover:scale-[1.005]'
        }`}
      >
        {file ? (
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#10b981]/12">
              <CheckCircle2 className="h-5 w-5 text-[#10b981]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#304035] truncate">{file.name}</p>
              <p className="text-xs text-[#304035]/45 mt-0.5">{(file.size/1024).toFixed(0)} Ko · cliquez pour remplacer</p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center px-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-3 transition-transform duration-300 group-hover:scale-110"
              style={{background:`${accent}15`}}>
              <Upload className="h-6 w-6" style={{color:accent}} />
            </div>
            <p className="text-sm font-bold text-[#304035]/70">{sub}</p>
            <p className="text-xs text-[#304035]/40 mt-1">Glissez ou cliquez · JPG PNG WEBP · max 20 Mo</p>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e=>{const f=e.target.files?.[0]; if(f) onFile(f); e.target.value='';}} />
      </div>
      {tips && !file && (
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
          {tips.map((t,i) => (
            <div key={i} className="flex items-start gap-1.5">
              <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" style={{color:accent}} />
              <p className="text-[10px] text-[#304035]/45 leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Carte préset couleur */
function PresetCard({ p, active, onClick }:{ p:Preset; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick}
      className={`group relative flex flex-col gap-2.5 rounded-2xl border-2 p-3.5 text-left transition-all duration-250 overflow-hidden ${
        active
          ? 'border-[#a67749] bg-gradient-to-br from-[#a67749]/8 to-white shadow-lg scale-[1.02]'
          : 'border-[#304035]/8 bg-white hover:border-[#a67749]/40 hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5'
      }`}
    >
      <div className="flex h-8 w-full overflow-hidden rounded-xl shadow-sm">
        <div className="flex-[3] transition-all duration-300 group-hover:flex-[3.5]" style={{background:p.facade}} />
        <div className="flex-1"                                                       style={{background:p.poignee}} />
        <div className="flex-[2] transition-all duration-300 group-hover:flex-[2.5]" style={{background:p.plan}} />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[#304035] leading-tight">{p.name}</p>
          <p className="text-[10px] text-[#304035]/50 mt-0.5">{p.desc}</p>
        </div>
        {active && <Check className="h-4 w-4 shrink-0 text-[#a67749] mt-0.5" />}
      </div>
      {active && (
        <div className="flex items-center gap-1.5 rounded-lg bg-[#a67749]/10 px-2 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[#a67749] dp" />
          <span className="text-[10px] font-bold text-[#a67749]">{p.mood}</span>
        </div>
      )}
    </button>
  );
}

/** Sélecteur de chip (boutons radio stylisés) */
function ChipSelector<T extends string>({
  label, options, value, onChange, accent = '#a67749'
}: {
  label: string;
  options: { value: T; label: string; icon?: React.ElementType }[];
  value: T;
  onChange: (v: T) => void;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                active
                  ? 'border-current text-white shadow-md scale-[1.03]'
                  : 'border-[#304035]/12 text-[#304035]/60 bg-white hover:border-current/40 hover:scale-[1.01]'
              }`}
              style={active ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, borderColor: accent } : { color: '#304035' }}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Résultat avec image réelle ou mock + miniatures variantes si plusieurs images. */
/**
 * Slider de comparaison avant/après — drag horizontal pour révéler progressivement
 * l'image AVANT en partant de la gauche. Indispensable pour vérifier d'un coup
 * d'œil que SAM+Inpaint n'a modifié QUE les façades/poignées/plan (mode coloriste).
 *
 * Pure CSS via `clip-path` : aucune dépendance externe, fluide même sur mobile.
 */
function BeforeAfterSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // % 0-100
  const [dragging, setDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, pct)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updatePosition(cx);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl select-none cursor-ew-resize"
      style={{ aspectRatio: '4/3' }}
      onMouseDown={e => { setDragging(true); updatePosition(e.clientX); }}
      onTouchStart={e => { setDragging(true); updatePosition(e.touches[0].clientX); }}
    >
      {/* Image APRÈS (en fond, pleine taille) */}
      <Image src={afterUrl} alt="Après" fill className="object-cover pointer-events-none" sizes="600px" unoptimized />

      {/* Image AVANT (clippée selon la position du curseur) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image src={beforeUrl} alt="Avant" fill className="object-cover" sizes="600px" unoptimized />
      </div>

      {/* Curseur vertical */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border-2 border-[#304035]/15">
          <ArrowRight className="h-3.5 w-3.5 text-[#304035]" style={{ transform: 'rotate(180deg)' }} />
          <ArrowRight className="h-3.5 w-3.5 text-[#304035] -ml-1" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 pointer-events-none">
        Avant
      </div>
      <div className="absolute top-2 right-2 rounded-full bg-[#a67749]/85 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 pointer-events-none">
        Après
      </div>
    </div>
  );
}

function ResultCard({ item, accentColor, onSave, onRegenerate, icon: Icon, beforeUrl }: {
  item: Item; accentColor: string;
  onSave: () => void; onRegenerate: () => void;
  icon: React.ElementType;
  /** Si fourni (cas coloriste), affiche un slider avant/après au lieu de l'image seule */
  beforeUrl?: string | null;
}) {
  const allUrls = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const mainUrl = allUrls[selectedIdx] ?? item.imageUrl;

  return (
    <div className="sr rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
          <p className="font-black text-[#304035]">{allUrls.length > 1 ? `${allUrls.length} variantes prêtes !` : 'Résultat prêt !'}</p>
        </div>
      </div>

      {/* Image générée ou mock — avec slider avant/après si beforeUrl dispo */}
      <div className="overflow-hidden rounded-2xl" style={{border:`1.5px solid ${accentColor}28`}}>
        {mainUrl && !mainUrl.includes('placehold') ? (
          beforeUrl
            ? <BeforeAfterSlider beforeUrl={beforeUrl} afterUrl={mainUrl} />
            : <Image src={mainUrl} alt="Rendu IA" width={600} height={400} loading="lazy" className="w-full object-cover rounded-2xl" unoptimized />
        ) : (
          <div className="relative flex flex-col items-center justify-center py-12 px-6 text-center"
            style={{background:`linear-gradient(145deg, ${accentColor}12, ${accentColor}28, ${accentColor}10)`}}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10"
                style={{background:`radial-gradient(circle, ${accentColor}, transparent)`}} />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-8"
                style={{background:`radial-gradient(circle, ${accentColor}, transparent)`}} />
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg mb-4"
              style={{background:`linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`}}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <p className="relative text-base font-bold" style={{color:accentColor}}>Simulation visuelle</p>
            <p className="relative text-xs text-[#304035]/50 mt-1">Connectez FAL_KEY pour l'image réelle</p>
            <div className="relative mt-4 max-w-[260px] rounded-xl bg-white/60 border border-white/80 px-3 py-2 backdrop-blur-sm">
              <p className="text-xs text-[#304035]/60 italic line-clamp-2">"{item.prompt}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Badges régions — transparence sur ce qui a réellement été modifié.
          Affiché uniquement si on a des steps (mode coloriste SAM+Inpaint). */}
      {item.steps && item.steps.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {item.steps.map(s => {
            const isOk    = s.maskFound && s.inpaintOk;
            const label   = s.region === 'facade' ? 'Façades' : s.region === 'poignee' ? 'Poignées' : 'Plan de travail';
            const tooltip = !s.maskFound ? 'Zone non détectée par l\'IA' : !s.inpaintOk ? 'Coloration échouée' : `Modifié en ${(s.durationMs/1000).toFixed(1)}s`;
            return (
              <span
                key={s.region}
                title={tooltip}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  isOk
                    ? 'border-[#10b981]/30 bg-[#10b981]/8 text-[#10b981]'
                    : 'border-[#ef4444]/30 bg-[#ef4444]/8 text-[#ef4444]'
                }`}
              >
                {isOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {label}
              </span>
            );
          })}
        </div>
      )}

      {/* Miniatures variantes */}
      {allUrls.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {allUrls.map((u, i) => (
            <button key={u + i} onClick={() => setSelectedIdx(i)}
              className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                selectedIdx === i ? 'shadow-md scale-[1.02]' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ borderColor: selectedIdx === i ? accentColor : 'transparent' }}>
              <Image src={u} alt={`Variante ${i+1}`} width={120} height={80} loading="lazy" className="w-full h-16 object-cover" unoptimized />
              <div className="absolute top-1 right-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5">{i+1}</div>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={onSave}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-[.98] transition-all"
          style={{background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`}}>
          <Plus className="h-4 w-4" />Sauvegarder
        </button>
        <button onClick={onRegenerate}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#304035]/12 py-3 text-sm font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors">
          <RotateCcw className="h-4 w-4" />Régénérer
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── PAGE */
export default function IaStudioPage() {
  const dossiers       = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const addLog         = useHistoryStore(s => s.addLog);
  // 19/05/2026 : attache l'image générée au dossier sélectionné via le store
  // Zustand (mémoire client + persist localStorage). Crée un sous-dossier
  // "RENDUS IA" s'il n'existe pas, puis y ajoute le DocumentFile.
  const addSubfolder           = useDossierStore(s => s.addSubfolder);
  const addDocumentToSubfolder = useDossierStore(s => s.addDocumentToSubfolder);
  const allDossiers    = [...dossiers, ...dossiersSignes];
  const currentUser    = useAuthStore(s => s.user);
  const userName       = currentUser ? (currentUser.firstName ?? currentUser.email.split('@')[0]) : 'Utilisateur';

  /* État global */
  const [tab,          setTab]          = useState<Module>('coloriste');
  // Bump pour forcer le rafraîchissement du HistoryPanel après une génération
  // réussie. Le panneau écoute ce nombre dans son useEffect.
  const [iaHistoryRefresh, setIaHistoryRefresh] = useState(0);

  // Handler partagé : clic sur une vignette de l'historique → ouvre l'image
  // pleine taille dans un nouvel onglet (le plus simple pour télécharger /
  // partager / envoyer par email au client). Affiner plus tard avec une
  // modale ou un mode "ré-éditer ce rendu".
  const openHistoryJob = (job: IaJobRow) => {
    const url = job.resultImageUrls?.signedUrls?.[0];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const [gallery,      setGallery]      = useState<Item[]>(() => {
    if (typeof window === 'undefined') return [];
    try { const saved = localStorage.getItem('avra-ia-gallery'); return saved ? JSON.parse(saved) : []; }
    catch { return []; }
  });
  // Persiste la galerie a chaque changement
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem('avra-ia-gallery', JSON.stringify(gallery)); } catch {}
  }, [gallery]);
  const [dossierId,    setDossierId]    = useState(allDossiers[0]?.id ?? '');
  const dossierName = allDossiers.find(d=>d.id===dossierId)?.name ?? 'Sans dossier';

  /* ── COLORISTE — état */
  const [photoFile,    setPhotoFile]    = useState<File|null>(null);
  const [photoURL,     setPhotoURL]     = useState<string|null>(null);
  const [preset,       setPreset]       = useState<Preset|null>(null);
  const [facadeCol,    setFacadeCol]    = useState('#304035');
  const [poigneeCol,   setPoigneeCol]   = useState('#a67749');
  const [planCol,      setPlanCol]      = useState('#f5f0e8');
  const [facadeFinish, setFacadeFinish] = useState<FinishType>('mat');
  // Finitions optionnelles par élément (poignées + plan travail). Null = pas
  // de finition spécifique (on garde le matériau standard du preset).
  const [poigneeFinish, setPoigneeFinish] = useState<FinishType | null>(null);
  const [planFinish,    setPlanFinish]    = useState<FinishType | null>(null);
  // Textures importées par l'utilisateur (mode manuel uniquement) — data URL.
  // 19/05/2026 (demande asso) : possibilité d'importer JUSQU'A 3 textures par
  // élément + choix du mode "Couleur / Texture / Mix" pour combiner.
  //   - mode 'color'   → utilise uniquement la couleur picker (texture ignorée)
  //   - mode 'texture' → utilise uniquement la texture active (couleur ignorée pour le rendu)
  //   - mode 'mix'     → texture active + couleur appliquée (teinte la texture)
  // Backend reçoit (colorMode, activeTextureDataUrl, colorHex) et adapte le prompt.
  const MAX_TEXTURES_PER_ELEMENT = 3;
  type ColorMode = 'color' | 'texture' | 'mix';

  const [facadeTextures,  setFacadeTextures]  = useState<string[]>([]);
  const [poigneeTextures, setPoigneeTextures] = useState<string[]>([]);
  const [planTextures,    setPlanTextures]    = useState<string[]>([]);
  const [facadeActiveTextureIdx,  setFacadeActiveTextureIdx]  = useState(0);
  const [poigneeActiveTextureIdx, setPoigneeActiveTextureIdx] = useState(0);
  const [planActiveTextureIdx,    setPlanActiveTextureIdx]    = useState(0);
  const [facadeMode,  setFacadeMode]  = useState<ColorMode>('color');
  const [poigneeMode, setPoigneeMode] = useState<ColorMode>('color');
  const [planMode,    setPlanMode]    = useState<ColorMode>('color');

  // Helpers : texture active (data URL) ou null si aucune importée
  const facadeTexture  = facadeTextures[facadeActiveTextureIdx]  ?? null;
  const poigneeTexture = poigneeTextures[poigneeActiveTextureIdx] ?? null;
  const planTexture    = planTextures[planActiveTextureIdx]      ?? null;
  const [colorLight,   setColorLight]   = useState<LightingType>('naturelle');
  const [colorLoading, setColorLoading] = useState(false);
  const [colorResult,  setColorResult]  = useState<Item|null>(null);
  const [colorError,   setColorError]   = useState<string|null>(null);

  /* ── RENDU — état */
  // Image de référence (plan WinnerFlex, photo d'inspiration, sketch).
  // Flux Pro Ultra accepte `image_prompt` : la référence guide le style/
  // l'intention sans imposer la transformation stricte (≠ Kontext).
  // Strength fixée à 0.3 côté serveur (default Ultra = 0.1, trop subtil ;
  // > 0.5 étrangle la créativité du prompt texte).
  const [rendRefFile,  setRendRefFile]  = useState<File | null>(null);
  const [rendRefURL,   setRendRefURL]   = useState<string | null>(null);
  // Sélecteurs UI retirés 19/05/2026 — valeurs fixes par défaut (alimentent
  // le prompt serveur de façon neutre, dilué automatiquement par Kontext).
  const [rendStyle]    = useState<StyleType>('contemporain');
  const [rendLight]    = useState<LightingType>('naturelle');
  // rendSize : valeur fixe en interne (le ChipSelector "Taille de la cuisine" a
  // été retiré — peu pertinent quand un plan WinnerFlex est uploadé, qui dicte
  // déjà les proportions exactes). On garde 'moyenne' comme fallback côté prompt.
  const [rendSize]                      = useState<RoomSizeType>('moyenne');
  const [rendFacades,  setRendFacades]  = useState('');
  const [rendPlan,     setRendPlan]     = useState('');
  // Nouveaux champs Sol + Murs — laissés optionnels, n'apparaissent dans le
  // prompt que si l'utilisateur les renseigne.
  const [rendSol,      setRendSol]      = useState('');
  const [rendMurs,     setRendMurs]     = useState('');
  const [rendLoading,  setRendLoading]  = useState(false);
  const [rendResult,   setRendResult]   = useState<Item|null>(null);
  const [rendError,    setRendError]    = useState<string|null>(null);
  // Phase 3 — warnings de qualité de l'image source (résolution, contraste, ratio)
  const [rendRefWarnings, setRendRefWarnings] = useState<string[]>([]);
  // Phase 2 — toggle "Précision maximale" : active le refinement SAM+Inpaint
  // après ControlNet/Kontext (+20-30s, +0.04€, gain ~+1% fidélité matériaux).
  const [rendMaxPrecision, setRendMaxPrecision] = useState(false);
  // Phase 5 — compteur "Régénérer" : s'incrémente quand l'utilisateur clique
  // sur "Régénérer" avec un rendu déjà affiché. Tracking côté serveur pour
  // analyser quels paramètres / images sources mécontentent les utilisateurs.
  const [rendUserRetry, setRendUserRetry] = useState(0);

  /* ── Couleurs modifiées manuellement (pour détecter si l'utilisateur a changé qqch) */
  const [colorsModified, setColorsModified] = useState(false);

  /* ── Nombre de variantes : verrouillé à 1 image (sélecteur retiré 19/05/2026).
     On garde le state pour le coût estimate et le call API, valeur fixe. */
  const [colorNumVariants] = useState<1|2|4>(1);
  // Rendu réaliste verrouillé à 1 image (cf. coloriste). On garde une constante
  // pour rester compatible avec l'API qui accepte un numImages.
  const rendNumVariants = 1 as const;

  /* Preview photo */
  useEffect(() => {
    if (!photoFile) { setPhotoURL(null); return; }
    const u = URL.createObjectURL(photoFile);
    setPhotoURL(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

  /* Preview image de référence rendu */
  useEffect(() => {
    if (!rendRefFile) { setRendRefURL(null); return; }
    const u = URL.createObjectURL(rendRefFile);
    setRendRefURL(u);
    return () => URL.revokeObjectURL(u);
  }, [rendRefFile]);

  /* Phase 3 — analyse qualité image source à chaque nouvel upload */
  useEffect(() => {
    if (!rendRefFile) { setRendRefWarnings([]); return; }
    let cancelled = false;
    analyzeSourceImageQuality(rendRefFile).then(result => {
      if (!cancelled) setRendRefWarnings(result.warnings);
    });
    return () => { cancelled = true; };
  }, [rendRefFile]);

  /* Phase 5 — reset du compteur "userRetry" quand l'image source change */
  useEffect(() => { setRendUserRetry(0); }, [rendRefFile]);

  /* ── Appliquer un preset */
  const applyPreset = (p: Preset) => {
    setPreset(p);
    setFacadeCol(p.facade);
    setPoigneeCol(p.poignee);
    setPlanCol(p.plan);
    setFacadeFinish(p.finish);
  };

  /* ── Coloriste : peut-on lancer ?
   * Flux Kontext édite une photo existante → la photo de cuisine est obligatoire.
   * Le reste (preset, couleurs, textures) est optionnel mais sans la photo
   * source on ne peut rien éditer. */
  const canRunColor = !!photoFile && (
    !!preset || colorsModified
    || !!facadeTexture || !!poigneeTexture || !!planTexture
  );

  /**
   * Charge une image de texture depuis un <input type=file/>, la convertit en
   * data URL et la stocke dans le state correspondant. Limite stricte à 1 Mo
   * pour ne pas saturer la mémoire React (et pour rester sous la limite Vercel
   * de payload). Affiche une alerte simple si dépassement.
   */
  const handleTextureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    addToArray: (dataUrl: string) => void,
  ) => {
    const file = e.target.files?.[0];
    // Reset le champ pour permettre de re-sélectionner le même fichier après retrait.
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Format invalide : sélectionnez une image (jpg, png, webp...).');
      return;
    }
    // Upload tolère jusqu'à 5 Mo : la compression suivante les ramène à ~100-300 Ko.
    if (file.size > 5 * 1024 * 1024) {
      alert('Image trop lourde : maximum 5 Mo.');
      return;
    }
    try {
      // Resize à 768px max pour les textures (swatch suffit largement) + JPEG 0.85.
      const dataUrl = await compressImageToDataUrl(file, 768);
      addToArray(dataUrl);
      setPreset(null);
      setColorsModified(true);
    } catch {
      alert('Impossible de lire le fichier. Réessayez.');
    }
  };

  // Helper générique pour ajouter une texture à un slot (avec limite MAX_TEXTURES)
  const makeTextureAdder = (
    textures: string[],
    setTextures: (v: string[]) => void,
    setActiveIdx: (i: number) => void,
    setMode: (m: ColorMode) => void,
    currentMode: ColorMode,
  ) => (dataUrl: string) => {
    if (textures.length >= MAX_TEXTURES_PER_ELEMENT) {
      alert(`Maximum ${MAX_TEXTURES_PER_ELEMENT} textures par élément. Retirez-en une avant d'en ajouter.`);
      return;
    }
    const next = [...textures, dataUrl];
    setTextures(next);
    setActiveIdx(next.length - 1); // active = la dernière importée
    // Si on était en mode couleur, on bascule auto en texture pour montrer
    // immédiatement le résultat de l'import.
    if (currentMode === 'color') setMode('texture');
  };

  // Helper pour retirer une texture (par index)
  const makeTextureRemover = (
    textures: string[],
    setTextures: (v: string[]) => void,
    activeIdx: number,
    setActiveIdx: (i: number) => void,
    setMode: (m: ColorMode) => void,
  ) => (idx: number) => {
    const next = textures.filter((_, i) => i !== idx);
    setTextures(next);
    // Ajuste l'index actif : décale si besoin, et bascule en mode couleur si vide
    if (next.length === 0) {
      setActiveIdx(0);
      setMode('color');
    } else if (idx === activeIdx) {
      setActiveIdx(Math.max(0, idx - 1));
    } else if (idx < activeIdx) {
      setActiveIdx(activeIdx - 1);
    }
  };

  /* ── Coloriste : lancer */
  const runColor = async () => {
    if (!canRunColor) return;
    setColorLoading(true); setColorResult(null); setColorError(null);

    try {
      // Photo de cuisine obligatoire pour Flux Kontext (édition multi-image).
      // canRunColor garantit qu'elle est présente, mais on garde le garde-fou.
      if (!photoFile) {
        setColorError('Photo de la cuisine requise pour le coloriste IA.');
        setColorLoading(false); return;
      }
      // Compression côté navigateur : resize à 1280px max côté long + JPEG 0.85.
      // Photos iPhone à 3-5 Mo descendent à ~250-400 Ko → on reste largement sous
      // la limite Vercel (4,5 Mo par requête) même avec 3 textures en plus.
      let sourceImageDataUrl: string;
      try {
        sourceImageDataUrl = await compressImageToDataUrl(photoFile, 1280);
      } catch {
        setColorError('Impossible de lire la photo. Réessayez avec un autre fichier.');
        setColorLoading(false); return;
      }

      const result = await callColoristAPI({
        facadeHex:          preset?.facade   ?? facadeCol,
        poigneeHex:         preset?.poignee  ?? poigneeCol,
        planHex:            preset?.plan     ?? planCol,
        facadeFinish:       preset?.finish   ?? facadeFinish,
        poigneeFinish:      poigneeFinish ?? undefined,
        planFinish:         planFinish ?? undefined,
        handleMaterial:     preset?.handleMaterial,
        countertopMaterial: preset?.countertopMaterial,
        lightingStyle:      colorLight,
        sourceImageDataUrl,
        // Textures importées (mode manuel uniquement — les presets gardent leurs couleurs).
        // On envoie la texture ACTIVE (active idx) + le mode par élément, pour
        // que le prompt builder côté serveur sache si on veut "couleur seule",
        // "texture seule" ou "mix" (couleur + texture).
        facadeTextureDataUrl:  preset || facadeMode === 'color'  ? undefined : (facadeTexture  ?? undefined),
        poigneeTextureDataUrl: preset || poigneeMode === 'color' ? undefined : (poigneeTexture ?? undefined),
        planTextureDataUrl:    preset || planMode === 'color'    ? undefined : (planTexture    ?? undefined),
        facadeColorMode:       preset ? undefined : facadeMode,
        poigneeColorMode:      preset ? undefined : poigneeMode,
        planColorMode:         preset ? undefined : planMode,
        numImages:          colorNumVariants,
      });

      if (result.error) { setColorError(result.error); setColorLoading(false); return; }

      // Génération OK → rafraîchir l'historique DB en parallèle (la route a déjà
      // persisté l'IaJob avec status=DONE, on lit juste la nouvelle entrée).
      setIaHistoryRefresh(n => n + 1);

      const desc = preset ? `${preset.name} — ${preset.desc}` : `Façades ${facadeCol} ${facadeFinish}`;
      setColorResult({
        id: uid(), module: 'coloriste', prompt: desc, dossier: dossierName,
        ts: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
        color: preset?.facade ?? facadeCol,
        imageUrl: result.imageUrl ?? undefined,
        imageUrls: result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []),
        steps: result.steps ?? null,
      });
    } catch (err) {
      // 05/05/2026 - message vrai en priorite pour distinguer timeout serverless (TimeoutError)
      // d'une vraie panne reseau cote utilisateur (TypeError fetch failed)
      const msg = err instanceof Error ? err.message : '';
      if (msg && !msg.includes('fetch')) {
        setColorError(msg);
      } else {
        setColorError('La génération a pris trop de temps ou la connexion s’est interrompue. Réessayez dans quelques secondes.');
      }
    }
    setColorLoading(false);
  };

  /**
   * Attache l'image IA générée au dossier sélectionné (sous-dossier "RENDUS IA").
   * Crée le sous-dossier s'il n'existe pas. Le DocumentFile pointe vers l'URL
   * signée Supabase (valable 30 jours — au-delà, on devra implémenter une copie
   * vers le bucket dossier-documents pour la conservation long terme).
   *
   * 19/05/2026 : feature critique demandée user "ca ne fonctionne pas".
   */
  const IA_SUBFOLDER_LABEL = 'RENDUS IA';
  const attachToDossier = (item: Item, moduleLabel: string) => {
    if (!dossierId || !item.imageUrl) return;
    const dossier = allDossiers.find(d => d.id === dossierId);
    if (!dossier) return;
    // Crée le sous-dossier "RENDUS IA" si absent
    const hasIaFolder = (dossier.subfolders ?? []).some(sf => sf.label === IA_SUBFOLDER_LABEL);
    if (!hasIaFolder) addSubfolder(dossierId, IA_SUBFOLDER_LABEL);
    // Pousse le document dans le sous-dossier (URL signée Supabase ia-renders)
    addDocumentToSubfolder(dossierId, IA_SUBFOLDER_LABEL, {
      name:    `${moduleLabel} — ${item.prompt.slice(0, 60)} (${item.ts}).jpg`,
      type:    'image/jpeg',
      url:     item.imageUrl,
      addedAt: new Date().toLocaleDateString('fr-FR'),
    });
  };

  const saveColor = () => {
    if (!colorResult) return;
    attachToDossier(colorResult, 'Coloriste IA');
    setGallery(p => [colorResult, ...p]);
    addLog({ user:userName, action:'Coloriste IA', target:`${dossierName} — "${colorResult.prompt.slice(0,40)}"`, icon:'🎨' });
    setColorResult(null);
  };

  /* ── Rendu : lancer */
  const runRendu = async () => {
    // Image de référence OBLIGATOIRE (juin 2026) — le mode text-to-image pur
    // a été supprimé car sans source visuelle l'IA inventait sol/crédence
    // /ouvertures de façon incohérente avec la pièce réelle du client.
    if (!rendRefFile) {
      setRendError('Importez un plan, un rendu 3D, un sketch ou une photo d\'inspiration pour générer le rendu réaliste.');
      return;
    }
    // Phase 5 — si on relance avec un rendu déjà présent, l'utilisateur
    // n'était pas satisfait : on incrémente le compteur et on l'envoie au
    // serveur pour analyse ultérieure (quelles images sources / paramètres
    // déçoivent le plus les utilisateurs).
    const isUserRetry = rendResult !== null;
    const nextRetryCount = isUserRetry ? rendUserRetry + 1 : 0;
    setRendUserRetry(nextRetryCount);
    setRendLoading(true); setRendResult(null); setRendError(null);

    try {
      // Compression côté navigateur (max 2048px, JPEG q=0.92 si redim) avec
      // bypass complet si l'image est déjà petite et légère (préserve les
      // contours fins indispensables au pipeline Canny / ControlNet).
      let referenceImageDataUrl: string;
      let sourceWidth: number | undefined;
      let sourceHeight: number | undefined;
      try {
        // Récupère les dimensions natives AVANT compression (anchor prompt).
        const dims = await new Promise<{w: number; h: number}>((resolve, reject) => {
          const objUrl = URL.createObjectURL(rendRefFile);
          const img = new window.Image();
          img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(objUrl); };
          img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('image illisible')); };
          img.src = objUrl;
        }).catch(() => null);
        if (dims) { sourceWidth = dims.w; sourceHeight = dims.h; }

        referenceImageDataUrl = await compressImageToDataUrl(rendRefFile, 2048);
      } catch {
        setRendError('Image illisible. Choisissez une autre image (PNG ou JPG).');
        setRendLoading(false);
        return;
      }
      const result = await callRenduAPI({
        facades:               rendFacades || 'Façades modernes, finitions haut de gamme',
        planTravail:           rendPlan    || 'quartz blanc mat',
        sol:                   rendSol.trim() || undefined,
        murs:                  rendMurs.trim() || undefined,
        style:                 rendStyle,
        lightingStyle:         rendLight,
        roomSize:              rendSize,
        referenceImageDataUrl,
        sourceWidth,
        sourceHeight,
        maxPrecision:          rendMaxPrecision,
        userRetryCount:        nextRetryCount,
        numImages:             rendNumVariants,
      });

      if (result.error) { setRendError(result.error); setRendLoading(false); return; }

      setIaHistoryRefresh(n => n + 1);

      setRendResult({
        id: uid(), module: 'rendu',
        prompt: rendFacades || 'Rendu photoréaliste',
        dossier: dossierName,
        ts: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
        color: '#5b9bd5',
        imageUrl: result.imageUrl ?? undefined,
        imageUrls: result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg && !msg.includes('fetch')) {
        setRendError(msg);
      } else {
        setRendError('La génération a pris trop de temps ou la connexion s’est interrompue. Réessayez dans quelques secondes.');
      }
    }
    setRendLoading(false);
  };

  const saveRendu = () => {
    if (!rendResult) return;
    attachToDossier(rendResult, 'Rendu IA');
    setGallery(p => [rendResult, ...p]);
    addLog({ user:userName, action:'Rendu Réaliste', target:`${dossierName} — "${rendResult.prompt.slice(0,40)}"`, icon:'✨' });
    setRendResult(null);
  };

  /* ── Sélecteur dossier */
  const DossierPicker = () => (
    <div>
      <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-2">Associer au dossier</p>
      <select value={dossierId} onChange={e=>setDossierId(e.target.value)}
        className="w-full rounded-xl border border-[#304035]/12 bg-white px-3.5 py-2.5 text-sm text-[#304035] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a67749]/25 transition-shadow">
        {allDossiers.length===0 ? <option value="">Aucun dossier</option>
          : allDossiers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <div className="space-y-7 pb-10">

        {/* ══════════════════════════ HEADER */}
        <PageHeader
          icon={<Sparkles className="h-7 w-7" />}
          title="IA Studio"
          subtitle="Deux intelligences · Une cuisine parfaite"
          actions={gallery.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-full border border-white/20 bg-white/15 px-4 py-2 shadow-sm">
              <div className="flex -space-x-1">
                {gallery.slice(0,3).map(item => (
                  <div key={item.id} className="h-5 w-5 rounded-full border-2 border-white shadow-sm"
                    style={{background:item.color}} />
                ))}
              </div>
              <span className="text-xs font-bold text-white/80">
                {gallery.length} visuel{gallery.length>1?'s':''} sauvegardé{gallery.length>1?'s':''}
              </span>
            </div>
          )}
        />

        {/* ══════════════════════════ TABS SÉLECTEUR */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Coloriste */}
          <button onClick={() => setTab('coloriste')}
            className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-350 ${
              tab==='coloriste'
                ? 'border-[#a67749] bg-white shadow-xl'
                : 'border-[#304035]/8 bg-white/70 hover:border-[#a67749]/30 hover:bg-white hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{background:'radial-gradient(ellipse at 20% 50%, rgba(166,119,73,.07), transparent 65%)'}} />
            {tab==='coloriste' && (
              <div className="absolute inset-0 opacity-100"
                style={{background:'radial-gradient(ellipse at 20% 50%, rgba(166,119,73,.06), transparent 65%)'}} />
            )}
            <div className="relative flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110 ${tab==='coloriste'?'scale-110':''}`}
                style={{background:tab==='coloriste'?'linear-gradient(135deg,#a67749,#8a5e35)':'linear-gradient(135deg,#a6774955,#a6774930)'}}>
                <Paintbrush className={`h-6 w-6 ${tab==='coloriste'?'text-white':'text-[#a67749]'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-[#304035] text-lg">Coloriste IA</p>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#a67749]/12 text-[#a67749]">Sur chantier</span>
                </div>
                <p className="text-sm text-[#304035]/60 leading-relaxed">
                  Changez façades, poignées et plan de travail en quelques secondes — <span className="font-semibold text-[#304035]/80">idéal devant le client</span>.
                </p>
                {tab==='coloriste' && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#a67749]">
                    <div className="h-2 w-2 rounded-full bg-[#a67749] dp" />
                    Module actif — prêt à l'emploi
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Rendu Réaliste */}
          <button onClick={() => setTab('rendu')}
            className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-350 ${
              tab==='rendu'
                ? 'border-[#5b9bd5] bg-white shadow-xl'
                : 'border-[#304035]/8 bg-white/70 hover:border-[#5b9bd5]/30 hover:bg-white hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{background:'radial-gradient(ellipse at 20% 50%, rgba(91,155,213,.06), transparent 65%)'}} />
            {tab==='rendu' && (
              <div className="absolute inset-0"
                style={{background:'radial-gradient(ellipse at 20% 50%, rgba(91,155,213,.07), transparent 65%)'}} />
            )}
            <div className="relative flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110 ${tab==='rendu'?'scale-110':''}`}
                style={{background:tab==='rendu'?'linear-gradient(135deg,#5b9bd5,#3a78b5)':'linear-gradient(135deg,#5b9bd555,#5b9bd530)'}}>
                <Wand2 className={`h-6 w-6 ${tab==='rendu'?'text-white':'text-[#5b9bd5]'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-[#304035] text-lg">Rendu Réaliste</p>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#5b9bd5]/12 text-[#5b9bd5]">Post-conception</span>
                </div>
                <p className="text-sm text-[#304035]/60 leading-relaxed">
                  Importez votre plan <span className="font-semibold text-[#304035]/80">WinnerFlex</span> et obtenez un rendu photoréaliste professionnel.
                </p>
                {tab==='rendu' && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#5b9bd5]">
                    <div className="h-2 w-2 rounded-full bg-[#5b9bd5] dp" />
                    Module actif — prêt à l'emploi
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* ══════════════════════════ MODULE COLORISTE */}
        {tab === 'coloriste' && (
          <div className="fu grid gap-6 lg:grid-cols-[1fr_380px]">

            {/* ── Panneau gauche */}
            <div className="space-y-4">

              {/* Photo */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-4 w-4 text-[#a67749]" />
                  <p className="font-bold text-[#304035]">Photo de la cuisine</p>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#a67749]/70 bg-[#a67749]/8 px-2 py-0.5 rounded-full">Optionnel</span>
                </div>
                <Drop label="" sub="Déposez une photo (chantier, showroom, catalogue)"
                  onFile={setPhotoFile} file={photoFile} accent="#a67749" />
                {photoURL && (
                  <div className="mt-3 relative rounded-xl overflow-hidden">
                    <Image src={photoURL} alt="cuisine" width={500} height={176} loading="lazy" className="w-full max-h-44 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <button onClick={() => {setPhotoFile(null); setPhotoURL(null);}}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-3">
                      <span className="rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5">Photo chargée</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Palettes */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-[#a67749]" />
                    <p className="font-bold text-[#304035]">Palettes prêtes à l'emploi</p>
                  </div>
                  <span className="text-[10px] text-[#304035]/40 font-medium">Façade · Poignée · Plan</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {PRESETS.map(p => (
                    <PresetCard key={p.name} p={p} active={preset?.name===p.name}
                      onClick={() => applyPreset(p)} />
                  ))}
                </div>

                {/* Color pickers manuels — chaque élément accepte couleur ET/OU finition.
                    L'utilisateur peut ne changer que la couleur, ne changer que la finition,
                    ou les deux. La finition pour les façades est partagée avec le chip global
                    "Finition façades" ci-dessous (source de vérité unique). */}
                <div className="mt-4 pt-4 border-t border-[#304035]/8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/40 mb-3">Ou personnalisez manuellement</p>
                  <div className="flex gap-4">
                    {([
                      { key:'facade',  label:'Façades',     val:facadeCol,  set:setFacadeCol,
                        finishVal: facadeFinish, setFinish: (v: FinishType | null) => v && setFacadeFinish(v),
                        finishOptional: false /* la facade a tjrs une finition (chip global) */,
                        textures: facadeTextures, setTextures: setFacadeTextures,
                        activeIdx: facadeActiveTextureIdx, setActiveIdx: setFacadeActiveTextureIdx,
                        mode: facadeMode, setMode: setFacadeMode },
                      { key:'poignee', label:'Poignées',    val:poigneeCol, set:setPoigneeCol,
                        finishVal: poigneeFinish, setFinish: setPoigneeFinish,
                        finishOptional: true,
                        textures: poigneeTextures, setTextures: setPoigneeTextures,
                        activeIdx: poigneeActiveTextureIdx, setActiveIdx: setPoigneeActiveTextureIdx,
                        mode: poigneeMode, setMode: setPoigneeMode },
                      { key:'plan',    label:'Plan travail',val:planCol,    set:setPlanCol,
                        finishVal: planFinish, setFinish: setPlanFinish,
                        finishOptional: true,
                        textures: planTextures, setTextures: setPlanTextures,
                        activeIdx: planActiveTextureIdx, setActiveIdx: setPlanActiveTextureIdx,
                        mode: planMode, setMode: setPlanMode },
                    ] as const).map(({key, label, val, set, finishVal, setFinish, finishOptional, textures, setTextures, activeIdx, setActiveIdx, mode, setMode}) => {
                      const activeTex = textures[activeIdx] ?? null;
                      const addTexture = makeTextureAdder(
                        textures as string[],
                        setTextures as (v: string[]) => void,
                        setActiveIdx as (i: number) => void,
                        setMode as (m: ColorMode) => void,
                        mode,
                      );
                      const removeTexture = makeTextureRemover(
                        textures as string[],
                        setTextures as (v: string[]) => void,
                        activeIdx,
                        setActiveIdx as (i: number) => void,
                        setMode as (m: ColorMode) => void,
                      );
                      // Swatch background selon le mode :
                      //  - color : couleur plate
                      //  - texture : image en cover
                      //  - mix : image + couleur en blend (multiply) pour teinter
                      const swatchStyle: React.CSSProperties = (() => {
                        if (mode === 'color' || !activeTex) return { background: val };
                        if (mode === 'texture') return { background: `url(${activeTex}) center/cover` };
                        // mix : couleur multipliée sur la texture
                        return {
                          backgroundImage: `url(${activeTex}), linear-gradient(${val}, ${val})`,
                          backgroundSize: 'cover, cover',
                          backgroundBlendMode: 'multiply',
                        };
                      })();
                      const hasTextures = textures.length > 0;
                      return (
                      <div key={key} className="flex-1 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#304035]/45 mb-2">{label}</p>

                        {/* Toggle MODE : couleur / texture / mix (19/05/2026) */}
                        <div className="inline-flex rounded-lg bg-[#304035]/5 p-0.5 mb-2 text-[8px] font-bold uppercase tracking-wider">
                          {(['color', 'texture', 'mix'] as const).map((m) => {
                            const disabled = (m === 'texture' || m === 'mix') && !hasTextures;
                            const labels: Record<ColorMode, string> = { color: 'Couleur', texture: 'Texture', mix: 'Mix' };
                            return (
                              <button
                                key={m}
                                type="button"
                                disabled={disabled}
                                onClick={() => { setMode(m); setPreset(null); setColorsModified(true); }}
                                className={`px-1.5 py-0.5 rounded-md transition-all ${
                                  mode === m
                                    ? 'bg-white shadow text-[#a67749]'
                                    : disabled
                                      ? 'text-[#304035]/20 cursor-not-allowed'
                                      : 'text-[#304035]/55 hover:text-[#304035]'
                                }`}
                                title={disabled ? 'Importez une texture pour activer ce mode' : `Mode ${labels[m]}`}
                              >
                                {labels[m]}
                              </button>
                            );
                          })}
                        </div>

                        <div className="relative mx-auto w-14 h-14">
                          {/* Color picker invisible — cliquable sur le swatch même en mode texture
                              pour mettre à jour la couleur de fallback / d'overlay mix. */}
                          <input type="color" value={val}
                            onChange={e => { (set as (v:string)=>void)(e.target.value); setPreset(null); setColorsModified(true); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className="w-14 h-14 rounded-2xl border-2 border-[#304035]/10 shadow-md cursor-pointer hover:scale-105 transition-transform duration-200"
                            style={swatchStyle} />
                          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-[#304035]/12 shadow">
                            <Paintbrush className="h-3 w-3 text-[#304035]/50" />
                          </div>
                        </div>

                        {/* Miniatures des textures importées (jusqu'à 3) + bouton + */}
                        <div className="mt-2 flex items-center justify-center gap-1 flex-wrap">
                          {textures.map((tex, idx) => (
                            <div key={idx} className="relative group">
                              <button
                                type="button"
                                onClick={() => { setActiveIdx(idx); if (mode === 'color') setMode('texture'); }}
                                className="block h-5 w-5 rounded-md border-2 overflow-hidden transition-all"
                                style={{
                                  borderColor: activeIdx === idx ? '#a67749' : 'rgba(48,64,53,0.15)',
                                  background: `url(${tex}) center/cover`,
                                  transform: activeIdx === idx ? 'scale(1.1)' : 'scale(1)',
                                }}
                                title={`Texture ${idx + 1}${activeIdx === idx ? ' (active)' : ''}`}
                                aria-label={`Texture ${idx + 1}`}
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeTexture(idx); }}
                                className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#dc2626] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow"
                                title="Retirer cette texture"
                                aria-label="Retirer texture"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </div>
                          ))}
                          {textures.length < MAX_TEXTURES_PER_ELEMENT && (
                            <label
                              className="inline-flex items-center justify-center cursor-pointer rounded-md border border-dashed border-[#a67749]/40 bg-[#a67749]/8 hover:bg-[#a67749]/15 h-5 w-5 transition-colors"
                              title={`Importer une texture (${textures.length}/${MAX_TEXTURES_PER_ELEMENT})`}
                            >
                              <Upload className="h-2.5 w-2.5 text-[#a67749]" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handleTextureUpload(e, addTexture)}
                              />
                            </label>
                          )}
                        </div>

                        <p className="text-[9px] font-mono text-[#304035]/35 mt-1">
                          {mode === 'color' || !activeTex
                            ? val.toUpperCase()
                            : mode === 'mix'
                              ? `${val.toUpperCase()} + tex.`
                              : `Texture ${activeIdx + 1}`}
                        </p>
                        {/* Finition par élément — dropdown compact. Pour façades on
                            edit le chip global, pour poignées/plan c'est optionnel. */}
                        <select
                          value={finishVal ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? null : (e.target.value as FinishType);
                            (setFinish as (v: FinishType | null) => void)(v);
                            setPreset(null);
                            setColorsModified(true);
                          }}
                          className="mt-2 w-full text-[9px] font-semibold rounded-lg border border-[#304035]/12 bg-white/80 px-1.5 py-1 text-[#304035] focus:outline-none focus:ring-1 focus:ring-[#a67749]/40"
                          aria-label={`Finition ${label}`}
                          title={`Finition ${label}`}
                        >
                          {finishOptional && <option value="">— Standard —</option>}
                          <option value="mat">Mat</option>
                          <option value="satiné">Satiné</option>
                          <option value="brillant">Brillant</option>
                          <option value="brossé">Brossé</option>
                          <option value="bois">Bois naturel</option>
                          <option value="miroir">Miroir</option>
                          <option value="verre-mat">Verre mat</option>
                        </select>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Paramètres prompt — NOUVEAUX SÉLECTEURS STRUCTURÉS */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#a67749]" />
                  <p className="font-bold text-[#304035]">Paramètres du rendu</p>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#10b981]/80 bg-[#10b981]/8 px-2 py-0.5 rounded-full">Prompt auto</span>
                </div>

                <ChipSelector<FinishType>
                  label="Finition façades"
                  value={facadeFinish}
                  onChange={v => { setFacadeFinish(v); setPreset(null); }}
                  accent="#a67749"
                  options={[
                    { value:'mat',       label:'Mat' },
                    { value:'satiné',    label:'Satiné' },
                    { value:'brillant',  label:'Brillant' },
                    { value:'brossé',    label:'Brossé' },
                    { value:'bois',      label:'Bois naturel' },
                    { value:'miroir',    label:'Miroir' },
                    { value:'verre-mat', label:'Verre mat' },
                  ]}
                />

                <ChipSelector<LightingType>
                  label="Lumière"
                  value={colorLight}
                  onChange={setColorLight}
                  accent="#a67749"
                  options={[
                    { value:'naturelle', label:'Naturelle', icon:Sun },
                    { value:'spots',     label:'LED spots',  icon:Lamp },
                    { value:'mixte',     label:'Mixte',      icon:Monitor },
                  ]}
                />

                {/* Info prompt auto */}
                <div className="flex items-start gap-2 rounded-xl bg-[#10b981]/8 border border-[#10b981]/20 p-3">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#304035]/70 leading-relaxed">
                    Le prompt est généré automatiquement depuis vos sélections — pas de texte libre, zéro raté.
                  </p>
                </div>
              </div>

              {/* Dossier + CTA */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <DossierPicker />

                {/* Sélecteur variantes retiré 19/05/2026 : le coloriste génère
                    toujours UNE image. Le state `colorNumVariants` reste à 1
                    par défaut (cf. useState initialiseur). */}

                {/* Bloc 'Coût estimé · Flux Kontext' retiré 19/05/2026 :
                    les clients n'ont pas à voir le moteur ni le coût IA. */}
                {!canRunColor && !colorLoading && (
                  <p className="text-[11px] text-[#304035]/55 text-center">
                    {!photoFile
                      ? 'Importez une photo de la cuisine puis choisissez une palette ou une texture.'
                      : 'Choisissez une palette, modifiez une couleur ou importez une texture.'}
                  </p>
                )}
                <button onClick={runColor}
                  disabled={colorLoading || !canRunColor}
                  className="relative w-full overflow-hidden rounded-2xl py-4 font-black text-white shadow-lg hover:shadow-xl active:scale-[.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{background:'linear-gradient(135deg,#a67749 0%,#8a5e35 100%)'}}>
                  {!colorLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
                  )}
                  <span className="relative flex items-center justify-center gap-2.5 text-sm tracking-wide">
                    {colorLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Génération en cours…</>
                      : <><Paintbrush className="h-4 w-4" />Appliquer les couleurs<ArrowRight className="h-4 w-4 ml-1" /></>
                    }
                  </span>
                </button>
              </div>
            </div>

            {/* ── Panneau droit */}
            <div className="space-y-4">

              {/* Erreur coloriste */}
              {colorError && !colorLoading && (
                <div className="fu rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-700">Génération échouée</p>
                    <p className="text-xs text-red-600/80 mt-0.5 leading-relaxed">{colorError}</p>
                  </div>
                  <button onClick={() => setColorError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Loading */}
              {colorLoading && (
                <div className="fu rounded-2xl bg-white border border-[#304035]/8 shadow-md p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{background:'linear-gradient(135deg,#a67749,#8a5e35)'}}>
                      <Paintbrush className="h-6 w-6 text-white sh" />
                    </div>
                    <div>
                      <p className="font-black text-[#304035]">Coloriste IA en action</p>
                      <p className="text-xs text-[#304035]/50 mt-0.5">
                        {(facadeTexture || poigneeTexture || planTexture)
                          ? 'Flux Kontext · Édition multi-image (textures)…'
                          : 'Flux Kontext · Édition guidée par instruction…'}
                      </p>
                    </div>
                  </div>
                  <ProgressBar steps={LOADING_STEPS_COLOR} color="#a67749" />
                </div>
              )}

              {/* Résultat — coloriste : avec slider avant/après pour comparer */}
              {colorResult && !colorLoading && (
                <ResultCard
                  item={colorResult}
                  accentColor="#a67749"
                  icon={Paintbrush}
                  onSave={saveColor}
                  onRegenerate={runColor}
                  beforeUrl={photoURL}
                />
              )}

              {/* État vide inspirant */}
              {!colorLoading && !colorResult && (
                <>
                  <div className="rounded-2xl border-2 border-dashed border-[#a67749]/20 bg-gradient-to-br from-[#a67749]/5 to-white p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-[#a67749]/10">
                      <Eye className="h-7 w-7 text-[#a67749]/60" />
                    </div>
                    <p className="font-bold text-[#304035] mb-1.5">Aperçu du résultat</p>
                    <p className="text-xs text-[#304035]/50 leading-relaxed">
                      Choisissez une palette ou configurez vos couleurs, puis lancez le Coloriste IA.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/40">Conseils sur chantier</p>
                    {[
                      { icon:Target,    tip:'Montrez 2–3 palettes différentes au client en direct' },
                      { icon:Zap,       tip:'Le prompt est construit automatiquement depuis vos sélections' },
                      { icon:Lightbulb, tip:'Ajustez la finition : "mat" pour moderne, "brillant" pour classique' },
                    ].map(({icon:I,tip},i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <I className="h-4 w-4 shrink-0 text-[#a67749]/60 mt-0.5" />
                        <p className="text-xs text-[#304035]/60 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Historique IA persistant (DB IaJob — partagé workspace) */}
              <HistoryPanel
                filterType="COLOR_VARIATION"
                accent="#a67749"
                refreshTrigger={iaHistoryRefresh}
                onSelect={openHistoryJob}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════ MODULE RENDU RÉALISTE */}
        {tab === 'rendu' && (
          <div className="fu grid gap-6 lg:grid-cols-[1fr_380px]">

            {/* ── Panneau gauche */}
            <div className="space-y-4">

              {/* Import image de référence — OBLIGATOIRE depuis juin 2026.
                  Le mode text-to-image pur a été retiré : sans image source,
                  l'IA inventait sol, crédence et ouvertures de façon
                  incohérente avec la cuisine réelle. On utilise désormais
                  toujours Kontext img2img pour préserver fidèlement le layout. */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5">
                <div className="flex items-center gap-2 mb-1">
                  <FileImage className="h-4 w-4 text-[#5b9bd5]" />
                  <p className="font-bold text-[#304035]">Image de référence <span className="ml-1 rounded-full bg-[#5b9bd5]/10 text-[#5b9bd5] text-[9px] font-bold px-2 py-0.5 align-middle">REQUIS</span></p>
                </div>
                <p className="text-xs text-[#304035]/50 mb-2">Plan WinnerFlex, rendu 3D, sketch ou photo d'inspiration — l'IA transforme votre image en photo réaliste tout en préservant le layout</p>
                <div className="mb-4 rounded-lg bg-[#5b9bd5]/5 border border-[#5b9bd5]/15 px-3 py-2 text-[10px] leading-relaxed text-[#304035]/65">
                  <span className="font-bold text-[#5b9bd5]">Conseil fidélité&nbsp;:</span> un plan ou un rendu 3D haute résolution donne les meilleurs résultats. Un sketch flou ou une photo Pinterest d'une autre cuisine peut faire dériver l'IA (changement de sol, fenêtre déplacée, crédence inventée).
                </div>
                <Drop label="" sub="Déposez un plan, perspective 3D, ou photo d'inspiration"
                  onFile={setRendRefFile} file={rendRefFile} accent="#5b9bd5"
                  tips={['Plan WinnerFlex export image', 'Photo Pinterest qui inspire', 'Sketch / croquis main', 'Photo cuisine ressemblante']} />
                {rendRefFile && rendRefURL && (
                  <div className="mt-3 relative rounded-xl overflow-hidden">
                    <Image src={rendRefURL} alt="Référence" width={500} height={176} loading="lazy" className="w-full max-h-44 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <button onClick={() => setRendRefFile(null)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-3">
                      <span className="rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5">Référence active</span>
                    </div>
                  </div>
                )}
                {/* Phase 3 — warnings de qualité de l'image source (n'empêchent pas l'envoi) */}
                {rendRefWarnings.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1">
                    {rendRefWarnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[10px] leading-relaxed text-amber-800">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloc "Style et ambiance" retiré 19/05/2026 : peu utile en
                  mode Kontext img2img où la photo source dicte déjà l'ambiance.
                  Les states `rendStyle` et `rendLight` gardent leurs valeurs
                  par défaut (contemporain + naturelle) qui alimentent le
                  prompt côté serveur de façon neutre. */}

              {/* Façades et plan — champs courts ciblés */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#5b9bd5]" />
                  <p className="font-bold text-[#304035]">Matériaux</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Façades & couleurs <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <input
                    value={rendFacades}
                    onChange={e => setRendFacades(e.target.value)}
                    placeholder="Ex : Chêne fumé mat, poignées laiton brossé"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/25 transition-shadow"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Chêne fumé mat', 'Noir laqué brillant', 'Blanc satiné', 'Vert sauge mat', 'Bleu nuit laqué'].map(s => (
                      <button key={s} onClick={() => setRendFacades(s)}
                        className="rounded-full border border-[#5b9bd5]/20 bg-[#5b9bd5]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#5b9bd5]/50 hover:bg-[#5b9bd5]/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Plan de travail <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <input
                    value={rendPlan}
                    onChange={e => setRendPlan(e.target.value)}
                    placeholder="Ex : Marbre Calacatta blanc, Dekton gris, quartz noir"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/25 transition-shadow"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Marbre blanc Calacatta', 'Dekton gris', 'Quartz noir', 'Pierre bleue', 'Granit anthracite'].map(s => (
                      <button key={s} onClick={() => setRendPlan(s)}
                        className="rounded-full border border-[#5b9bd5]/20 bg-[#5b9bd5]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#5b9bd5]/50 hover:bg-[#5b9bd5]/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SOL — optionnel, n'est injecté dans le prompt que si rempli */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Sol <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <input
                    value={rendSol}
                    onChange={e => setRendSol(e.target.value)}
                    placeholder="Ex : Parquet chêne contrecollé, carrelage grand format gris"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/25 transition-shadow"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Parquet chêne clair', 'Carrelage grand format gris', 'Béton ciré', 'Travertin', 'Tomettes terre cuite'].map(s => (
                      <button key={s} onClick={() => setRendSol(s)}
                        className="rounded-full border border-[#5b9bd5]/20 bg-[#5b9bd5]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#5b9bd5]/50 hover:bg-[#5b9bd5]/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MURS — optionnel, n'est injecté dans le prompt que si rempli */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Murs <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <input
                    value={rendMurs}
                    onChange={e => setRendMurs(e.target.value)}
                    placeholder="Ex : Peinture mate blanche, lambris bois, papier peint"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/25 transition-shadow"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Peinture mate blanche', 'Crédence céramique blanche', 'Lambris bois clair', 'Faïence métro blanche', 'Pierre apparente'].map(s => (
                      <button key={s} onClick={() => setRendMurs(s)}
                        className="rounded-full border border-[#5b9bd5]/20 bg-[#5b9bd5]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#5b9bd5]/50 hover:bg-[#5b9bd5]/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bloc 'Qualité & format' retiré 19/05/2026 — info inutile pour
                  le client, ces réglages sont implicites côté serveur. */}

              {/* Dossier + CTA */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <DossierPicker />

                {/* Sélecteur 'Nombre de variantes' retiré 19/05/2026 — verrouillé
                    à 1 image (cf. même choix sur coloriste). */}

                {/* Bloc 'Coût estimé' retiré 19/05/2026 — client n'a pas à voir
                    le moteur IA ni le coût. */}
                {/* Phase 6 — toggle "Ultra fidélité" (multi-control canny+depth+ref) */}
                <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-[#5b9bd5]/15 bg-[#5b9bd5]/5 p-3 hover:bg-[#5b9bd5]/8 transition-colors">
                  <input
                    type="checkbox"
                    checked={rendMaxPrecision}
                    onChange={e => setRendMaxPrecision(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#5b9bd5]/40 text-[#5b9bd5] focus:ring-2 focus:ring-[#5b9bd5]/30"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#304035]">Ultra fidélité <span className="ml-1 text-[9px] text-[#5b9bd5] font-semibold">+15-25s</span></p>
                    <p className="text-[10px] text-[#304035]/55 mt-0.5 leading-relaxed">Pixel-perfect : préserve à l'identique parquet, évier, robinetterie, prises, tableaux, décoration et position des sièges. À utiliser quand l'image source contient des détails fins à respecter strictement.</p>
                  </div>
                </label>
                <button onClick={runRendu}
                  disabled={rendLoading || !rendRefFile}
                  title={!rendRefFile ? 'Importez une image de référence (plan, rendu 3D, sketch ou inspiration)' : undefined}
                  className="relative w-full overflow-hidden rounded-2xl py-4 font-black text-white shadow-lg hover:shadow-xl active:scale-[.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{background:'linear-gradient(135deg,#5b9bd5 0%,#3a78b5 100%)'}}>
                  <span className="relative flex items-center justify-center gap-2.5 text-sm tracking-wide">
                    {rendLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Génération du rendu…</>
                      : !rendRefFile
                        ? <><FileImage className="h-4 w-4" />Importez d'abord une image de référence</>
                        : <><Wand2 className="h-4 w-4" />Générer le rendu photoréaliste<ArrowRight className="h-4 w-4 ml-1" /></>
                    }
                  </span>
                </button>
              </div>
            </div>

            {/* ── Panneau droit */}
            <div className="space-y-4">

              {/* Erreur rendu */}
              {rendError && !rendLoading && (
                <div className="fu rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-700">Génération échouée</p>
                    <p className="text-xs text-red-600/80 mt-0.5 leading-relaxed">{rendError}</p>
                  </div>
                  <button onClick={() => setRendError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Loading rendu */}
              {rendLoading && (
                <div className="fu rounded-2xl bg-white border border-[#304035]/8 shadow-md p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{background:'linear-gradient(135deg,#5b9bd5,#3a78b5)'}}>
                      <Wand2 className="h-6 w-6 text-white sh" />
                    </div>
                    <div>
                      <p className="font-black text-[#304035]">IA Rendu en action</p>
                      <p className="text-xs text-[#304035]/50 mt-0.5">Flux 1.1 Pro Ultra · Traitement avancé…</p>
                    </div>
                  </div>
                  <ProgressBar steps={LOADING_STEPS_RENDU} color="#5b9bd5" />
                </div>
              )}

              {/* Résultat rendu */}
              {rendResult && !rendLoading && (
                <ResultCard
                  item={rendResult}
                  accentColor="#5b9bd5"
                  icon={Wand2}
                  onSave={saveRendu}
                  onRegenerate={runRendu}
                />
              )}

              {/* État vide rendu */}
              {!rendLoading && !rendResult && (
                <>
                  <div className="rounded-2xl border-2 border-dashed border-[#5b9bd5]/20 bg-gradient-to-br from-[#5b9bd5]/5 to-white p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-[#5b9bd5]/10">
                      <ImageIcon className="h-7 w-7 text-[#5b9bd5]/60" />
                    </div>
                    <p className="font-bold text-[#304035] mb-1.5">Votre rendu apparaîtra ici</p>
                    <p className="text-xs text-[#304035]/50 leading-relaxed">
                      Configurez le style, la lumière et les matériaux — le prompt est construit automatiquement.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/40">WinnerFlex → Photoréalisme</p>
                    {[
                      { icon:ScanLine,  tip:'Exportez la vue 3D filaire pour les meilleurs volumes' },
                      { icon:Lightbulb, tip:'Précisez la direction de la lumière avec le sélecteur' },
                      { icon:Clock,     tip:'Comptez 10 à 20 sec pour un rendu 4K haute qualité' },
                    ].map(({icon:I,tip},i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <I className="h-4 w-4 shrink-0 text-[#5b9bd5]/60 mt-0.5" />
                        <p className="text-xs text-[#304035]/60 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Historique IA persistant (DB IaJob — partagé workspace) */}
              <HistoryPanel
                filterType="PHOTOREALISM_ENHANCE"
                accent="#5b9bd5"
                refreshTrigger={iaHistoryRefresh}
                onSelect={openHistoryJob}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════ GALERIE GLOBALE */}
        {gallery.length > 0 && (
          <div className="fu rounded-2xl bg-white border border-[#304035]/8 shadow-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#304035]/60" />
                <p className="font-black text-[#304035]">Galerie</p>
              </div>
              <span className="rounded-full bg-[#304035]/6 px-3 py-1 text-xs font-bold text-[#304035]/60">
                {gallery.length} visuel{gallery.length>1?'s':''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {gallery.map((item,i) => (
                <div key={item.id} className="fu group rounded-2xl overflow-hidden border border-[#304035]/8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-250 cursor-pointer"
                  style={{animationDelay:`${i*0.05}s`}}>
                  {item.imageUrl && !item.imageUrl.includes('placehold') ? (
                    <Image src={item.imageUrl} alt={item.prompt} width={300} height={200} loading="lazy" className="w-full aspect-video object-cover" unoptimized />
                  ) : (
                    <div className="relative flex items-center justify-center py-9"
                      style={{background:`linear-gradient(145deg,${item.color}18,${item.color}35)`}}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl shadow-md"
                        style={{background:`linear-gradient(135deg,${item.color},${item.color}bb)`}}>
                        {item.module==='coloriste'
                          ? <Paintbrush className="h-5 w-5 text-white" />
                          : <Wand2 className="h-5 w-5 text-white" />}
                      </div>
                      <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm"
                        style={{background:`${item.color}22`,color:item.color}}>
                        {item.module==='coloriste'?'Coloriste':'Rendu'}
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-[#304035] line-clamp-2 leading-relaxed">{item.prompt}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-[#304035]/40 font-medium truncate">{item.dossier}</span>
                      <span className="text-[9px] text-[#304035]/30 shrink-0 ml-1">{item.ts}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
