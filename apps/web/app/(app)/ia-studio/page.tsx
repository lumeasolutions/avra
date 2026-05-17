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
  /** Texture data URL importée par l'utilisateur, par élément (mode manuel uniquement). */
  facadeTextureDataUrl?: string;
  poigneeTextureDataUrl?: string;
  planTextureDataUrl?: string;
  numImages?: number;
}): Promise<{ imageUrl: string | null; imageUrls?: string[]; error?: string }> {
  const res = await fetch('/api/ia/coloriste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // Même protection que callRenduAPI : fallback gracieux sur réponses non-JSON
  // (timeout Vercel, plain text "An error occurred", HTML error page).
  const text = await res.text();
  try {
    return JSON.parse(text) as { imageUrl: string | null; imageUrls?: string[]; error?: string };
  } catch {
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
}

async function callRenduAPI(params: {
  facades: string; planTravail: string; style: StyleType;
  lightingStyle: LightingType; roomSize: RoomSizeType;
  /** Optionnel : description du sol (parquet, carrelage, béton ciré...) */
  sol?: string;
  /** Optionnel : description des murs (peinture, papier peint, lambris...) */
  murs?: string;
  numImages?: number;
}): Promise<{ imageUrl: string | null; imageUrls?: string[]; error?: string }> {
  const res = await fetch('/api/ia/rendu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // FIX 05/05/2026 : Vercel peut renvoyer du texte natif (non-JSON) en cas
  // de timeout / memory limit / erreur infrastructure → on parse avec
  // fallback gracieux pour éviter "Unexpected token A is not valid JSON"
  // qui ne dit rien à l'utilisateur.
  const text = await res.text();
  try {
    return JSON.parse(text) as { imageUrl: string | null; imageUrls?: string[]; error?: string };
  } catch {
    // Réponse non-JSON (timeout Vercel, plain text "An error occurred", HTML error page, etc.)
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
async function compressImageToDataUrl(file: File, maxSide: number = 1280): Promise<string> {
  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload  = () => resolve(i);
      i.onerror = () => reject(new Error('Image illisible (format non supporté ?)'));
      i.src = objectUrl;
    });

    // Calcul du facteur d'échelle pour respecter maxSide sur le côté le plus long
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > maxSide ? maxSide / longest : 1;
    const w = Math.round(img.naturalWidth  * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible');
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(objectUrl);

    // JPEG q=0.85 : bon compromis qualité / taille (~5-8x plus petit que PNG)
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    // Fallback gracieux : on renvoie le data URL brut sans compression
    console.warn('[compressImage] fallback brut:', err);
    return fileToDataUrl(file);
  }
}

/* ─── Estimations affichées (données statiques, pas besoin du serveur) ─── */
function estimateCost(module: 'coloriste' | 'rendu'): string {
  return module === 'coloriste' ? '~0,10 €' : '~0,06 €';
}
function estimateDuration(module: 'coloriste' | 'rendu'): string {
  // Kontext Max prend un peu plus de temps que Flux Dev (vs ~5s avant)
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
interface Item   { id:string; module:Module; prompt:string; dossier:string; ts:string; color:string; imageUrl?:string; imageUrls?:string[] }

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

const LOADING_STEPS_COLOR = [
  'Analyse du prompt et des couleurs',
  'Construction du prompt béton',
  'Segmentation façades · poignées · plan de travail',
  'Application de la teinte sélectionnée',
  'Rendu des reflets et de la matière',
  'Finalisation du visuel',
];
const LOADING_STEPS_RENDU = [
  'Analyse de vos paramètres de style',
  'Construction du prompt photoréaliste',
  'Placement des sources lumineuses',
  'Application des textures et matériaux',
  'Calcul du rendu photoréaliste',
  'Optimisation qualité finale',
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
function ResultCard({ item, accentColor, onSave, onRegenerate, icon: Icon }: {
  item: Item; accentColor: string;
  onSave: () => void; onRegenerate: () => void;
  icon: React.ElementType;
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

      {/* Image générée ou mock */}
      <div className="overflow-hidden rounded-2xl" style={{border:`1.5px solid ${accentColor}28`}}>
        {mainUrl && !mainUrl.includes('placehold') ? (
          <Image src={mainUrl} alt="Rendu IA" width={600} height={400} loading="lazy" className="w-full object-cover rounded-2xl" unoptimized />
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
  const allDossiers    = [...dossiers, ...dossiersSignes];
  const currentUser    = useAuthStore(s => s.user);
  const userName       = currentUser ? (currentUser.firstName ?? currentUser.email.split('@')[0]) : 'Utilisateur';

  /* État global */
  const [tab,          setTab]          = useState<Module>('coloriste');
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
  // Limite 1 Mo par fichier. Si défini, remplace visuellement le fond plat de
  // la pastille par l'image, et est cité dans le prompt fal.ai côté serveur.
  const [facadeTexture,  setFacadeTexture]  = useState<string | null>(null);
  const [poigneeTexture, setPoigneeTexture] = useState<string | null>(null);
  const [planTexture,    setPlanTexture]    = useState<string | null>(null);
  const [colorLight,   setColorLight]   = useState<LightingType>('naturelle');
  const [colorLoading, setColorLoading] = useState(false);
  const [colorResult,  setColorResult]  = useState<Item|null>(null);
  const [colorError,   setColorError]   = useState<string|null>(null);

  /* ── RENDU — état */
  // planFile : retiré — Flux Pro Ultra ignore toute image source (text-to-image pur).
  // L'ancien drop "Plan WinnerFlex" promettait une lecture qui n'arrivait jamais.
  const [rendStyle,    setRendStyle]    = useState<StyleType>('contemporain');
  const [rendLight,    setRendLight]    = useState<LightingType>('naturelle');
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

  /* ── Couleurs modifiées manuellement (pour détecter si l'utilisateur a changé qqch) */
  const [colorsModified, setColorsModified] = useState(false);

  /* ── Nombre de variantes a generer (1-4) */
  const [colorNumVariants, setColorNumVariants] = useState<1|2|4>(1);
  const [rendNumVariants,  setRendNumVariants]  = useState<1|2|4>(1);

  /* Preview photo */
  useEffect(() => {
    if (!photoFile) { setPhotoURL(null); return; }
    const u = URL.createObjectURL(photoFile);
    setPhotoURL(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

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
    setter: (v: string | null) => void,
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
      setter(dataUrl);
      setPreset(null);
      setColorsModified(true);
    } catch {
      alert('Impossible de lire le fichier. Réessayez.');
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
        facadeTextureDataUrl:  preset ? undefined : (facadeTexture  ?? undefined),
        poigneeTextureDataUrl: preset ? undefined : (poigneeTexture ?? undefined),
        planTextureDataUrl:    preset ? undefined : (planTexture    ?? undefined),
        numImages:          colorNumVariants,
      });

      if (result.error) { setColorError(result.error); setColorLoading(false); return; }

      const desc = preset ? `${preset.name} — ${preset.desc}` : `Façades ${facadeCol} ${facadeFinish}`;
      setColorResult({
        id: uid(), module: 'coloriste', prompt: desc, dossier: dossierName,
        ts: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
        color: preset?.facade ?? facadeCol,
        imageUrl: result.imageUrl ?? undefined,
        imageUrls: result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []),
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

  const saveColor = () => {
    if (!colorResult) return;
    setGallery(p => [colorResult, ...p]);
    addLog({ user:userName, action:'Coloriste IA', target:`${dossierName} — "${colorResult.prompt.slice(0,40)}"`, icon:'🎨' });
    setColorResult(null);
  };

  /* ── Rendu : lancer */
  const runRendu = async () => {
    if (!rendFacades.trim()) return;
    setRendLoading(true); setRendResult(null); setRendError(null);

    try {
      const result = await callRenduAPI({
        facades:      rendFacades || 'Façades modernes, finitions haut de gamme',
        planTravail:  rendPlan    || 'quartz blanc mat',
        sol:          rendSol.trim() || undefined,
        murs:         rendMurs.trim() || undefined,
        style:        rendStyle,
        lightingStyle:rendLight,
        roomSize:     rendSize,
        numImages:    rendNumVariants,
      });

      if (result.error) { setRendError(result.error); setRendLoading(false); return; }

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
                        texture: facadeTexture,  setTexture: setFacadeTexture },
                      { key:'poignee', label:'Poignées',    val:poigneeCol, set:setPoigneeCol,
                        finishVal: poigneeFinish, setFinish: setPoigneeFinish,
                        finishOptional: true,
                        texture: poigneeTexture, setTexture: setPoigneeTexture },
                      { key:'plan',    label:'Plan travail',val:planCol,    set:setPlanCol,
                        finishVal: planFinish, setFinish: setPlanFinish,
                        finishOptional: true,
                        texture: planTexture,    setTexture: setPlanTexture },
                    ] as const).map(({key, label, val, set, finishVal, setFinish, finishOptional, texture, setTexture}) => (
                      <div key={key} className="flex-1 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#304035]/45 mb-2">{label}</p>
                        <div className="relative mx-auto w-14 h-14">
                          {/* Le color picker reste cliquable même quand une texture
                              est définie : on permet à l'utilisateur de garder
                              une couleur de fallback en mémoire. */}
                          <input type="color" value={val}
                            onChange={e => { (set as (v:string)=>void)(e.target.value); setPreset(null); setColorsModified(true); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className="w-14 h-14 rounded-2xl border-2 border-[#304035]/10 shadow-md cursor-pointer hover:scale-105 transition-transform duration-200"
                            style={
                              texture
                                ? { background: `url(${texture}) center/cover` }
                                : { background: val }
                            } />
                          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-[#304035]/12 shadow">
                            <Paintbrush className="h-3 w-3 text-[#304035]/50" />
                          </div>
                          {/* Bouton "X" pour retirer la texture, visible uniquement
                              quand une texture est active. Au clic : retour à la
                              couleur plate. */}
                          {texture && (
                            <button
                              type="button"
                              onClick={() => (setTexture as (v: string | null) => void)(null)}
                              className="absolute -top-1 -right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[#dc2626] text-white shadow hover:scale-110 transition-transform"
                              aria-label={`Retirer la texture ${label}`}
                              title="Retirer la texture"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Bouton import texture : déclenche le file picker.
                            Utilise un <label> pour garder l'input file natif
                            mais invisible. Limite 1 Mo (cf handleTextureUpload). */}
                        <label
                          className="mt-2 inline-flex items-center justify-center gap-1 cursor-pointer rounded-full bg-[#a67749]/10 hover:bg-[#a67749]/20 px-2 py-0.5 text-[9px] font-bold text-[#a67749] transition-colors"
                          title={texture ? 'Remplacer la texture importée' : 'Importer une image de texture (max 1 Mo)'}
                        >
                          <Upload className="h-2.5 w-2.5" />
                          {texture ? 'Changer' : 'Texture'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleTextureUpload(e, setTexture as (v: string | null) => void)}
                          />
                        </label>

                        <p className="text-[9px] font-mono text-[#304035]/35 mt-1">
                          {texture ? 'Texture importée' : val.toUpperCase()}
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
                    ))}
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

                {/* Sélecteur variantes */}
                <div>
                  <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-2">Nombre de variantes</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([1,2,4] as const).map(n => (
                      <button key={n} onClick={() => setColorNumVariants(n)}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 py-2 transition-all ${
                          colorNumVariants === n
                            ? 'border-[#a67749] bg-[#a67749]/8 shadow-sm'
                            : 'border-[#304035]/12 bg-white hover:border-[#a67749]/40'
                        }`}>
                        <span className={`text-base font-black ${colorNumVariants === n ? 'text-[#a67749]' : 'text-[#304035]/60'}`}>{n}</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#304035]/45">{n === 1 ? 'image' : 'images'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimation coût */}
                <div className="flex items-center justify-between rounded-xl bg-[#304035]/4 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[#a67749]" />
                    <span className="text-xs font-semibold text-[#304035]/70">Coût estimé · Flux Kontext Max</span>
                  </div>
                  <span className="text-xs font-black text-[#304035]">~{(0.10 * colorNumVariants).toFixed(2).replace('.', ',')} € · {estimateDuration('coloriste')}</span>
                </div>
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
                      <p className="text-xs text-[#304035]/50 mt-0.5">Flux Kontext Max · Édition multi-image…</p>
                    </div>
                  </div>
                  <ProgressBar steps={LOADING_STEPS_COLOR} color="#a67749" />
                </div>
              )}

              {/* Résultat */}
              {colorResult && !colorLoading && (
                <ResultCard
                  item={colorResult}
                  accentColor="#a67749"
                  icon={Paintbrush}
                  onSave={saveColor}
                  onRegenerate={runColor}
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

              {/* Mini historique coloriste */}
              {gallery.filter(g=>g.module==='coloriste').length > 0 && (
                <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/40 mb-3">
                    Historique ({gallery.filter(g=>g.module==='coloriste').length})
                  </p>
                  <div className="space-y-2">
                    {gallery.filter(g=>g.module==='coloriste').slice(0,5).map(item => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#304035]/6 p-2.5 hover:bg-[#f5eee8]/40 transition-colors">
                        <div className="h-9 w-9 shrink-0 rounded-xl shadow-sm" style={{background:item.color}} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#304035] truncate">{item.prompt}</p>
                          <p className="text-[10px] text-[#304035]/40 mt-0.5">{item.dossier} · {item.ts}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════ MODULE RENDU RÉALISTE */}
        {tab === 'rendu' && (
          <div className="fu grid gap-6 lg:grid-cols-[1fr_380px]">

            {/* ── Panneau gauche */}
            <div className="space-y-4">

              {/* Bloc "Import Plan WinnerFlex" retiré : Flux Pro Ultra est un
                  modèle text-to-image pur qui ignore toute image source. L'ancien
                  drop promettait une lecture du plan qui n'arrivait jamais.
                  Pour réintroduire une dépendance au plan, il faudra basculer
                  sur un modèle Kontext ou ControlNet (cf flux-api.ts). */}

              {/* SÉLECTEURS STRUCTURÉS — zéro textarea libre */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#5b9bd5]" />
                  <p className="font-bold text-[#304035]">Style et ambiance</p>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#10b981]/80 bg-[#10b981]/8 px-2 py-0.5 rounded-full">Prompt auto</span>
                </div>

                <ChipSelector<StyleType>
                  label="Style de cuisine"
                  value={rendStyle}
                  onChange={setRendStyle}
                  accent="#5b9bd5"
                  options={[
                    { value:'contemporain',  label:'Contemporain',  icon:Monitor },
                    { value:'classique',     label:'Classique',     icon:Building2 },
                    { value:'industriel',    label:'Industriel',    icon:Layers },
                    { value:'scandinave',    label:'Scandinave',    icon:Home },
                    { value:'haussmannien',  label:'Haussmannien',  icon:Award },
                  ]}
                />

                <ChipSelector<LightingType>
                  label="Source lumineuse"
                  value={rendLight}
                  onChange={setRendLight}
                  accent="#5b9bd5"
                  options={[
                    { value:'naturelle', label:'Naturelle', icon:Sun },
                    { value:'spots',     label:'LED spots',  icon:Lamp },
                    { value:'mixte',     label:'Mixte',      icon:Monitor },
                  ]}
                />

                {/* "Taille de la cuisine" retiré : peu pertinent quand un plan
                    WinnerFlex est uploadé (qui dicte déjà les proportions
                    exactes), et dilue le prompt sinon. La proportion par défaut
                    est 'moyenne' côté serveur. */}
              </div>

              {/* Façades et plan — champs courts ciblés */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#5b9bd5]" />
                  <p className="font-bold text-[#304035]">Matériaux</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Façades & couleurs</p>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Plan de travail</p>
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

              {/* Options qualité — informatif (toujours actifs sur Flux Pro Ultra) */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-4 w-4 text-[#5b9bd5]" />
                  <p className="font-bold text-[#304035]">Qualité & format</p>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#10b981]/80 bg-[#10b981]/8 px-2 py-0.5 rounded-full">Inclus automatiquement</span>
                </div>
                <p className="text-xs text-[#304035]/50 mb-3">Tous ces réglages sont activés par défaut sur Flux 1.1 Pro Ultra.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon:Star,   label:'4K Ultra HD',    desc:'Print & présentation' },
                    { icon:Eye,    label:'Lumière réelle', desc:'Simulation jour/nuit' },
                    { icon:Award,  label:'Anti-aliasing',  desc:'Rendu professionnel'  },
                  ].map(({icon:I,label,desc}) => (
                    <div key={label} className="flex flex-col items-center text-center rounded-xl border border-[#5b9bd5]/15 bg-gradient-to-b from-[#5b9bd5]/5 to-white p-3.5">
                      <I className="h-5 w-5 text-[#5b9bd5] mb-2" />
                      <p className="text-xs font-bold text-[#304035] leading-tight">{label}</p>
                      <p className="text-[10px] text-[#304035]/40 mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dossier + CTA */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <DossierPicker />

                {/* Sélecteur variantes */}
                <div>
                  <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest mb-2">Nombre de variantes</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([1,2,4] as const).map(n => (
                      <button key={n} onClick={() => setRendNumVariants(n)}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 py-2 transition-all ${
                          rendNumVariants === n
                            ? 'border-[#5b9bd5] bg-[#5b9bd5]/8 shadow-sm'
                            : 'border-[#304035]/12 bg-white hover:border-[#5b9bd5]/40'
                        }`}>
                        <span className={`text-base font-black ${rendNumVariants === n ? 'text-[#5b9bd5]' : 'text-[#304035]/60'}`}>{n}</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#304035]/45">{n === 1 ? 'image' : 'images'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimation coût */}
                <div className="flex items-center justify-between rounded-xl bg-[#304035]/4 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[#5b9bd5]" />
                    <span className="text-xs font-semibold text-[#304035]/70">Coût estimé · Flux 1.1 Pro Ultra</span>
                  </div>
                  <span className="text-xs font-black text-[#304035]">~{(0.06 * rendNumVariants).toFixed(2).replace('.', ',')} € · {estimateDuration('rendu')}</span>
                </div>
                {!rendLoading && !rendFacades.trim() && (
                  <p className="text-[11px] text-[#304035]/55 text-center">
                    Décrivez les façades pour activer le bouton.
                  </p>
                )}
                <button onClick={runRendu}
                  disabled={rendLoading || !rendFacades.trim()}
                  className="relative w-full overflow-hidden rounded-2xl py-4 font-black text-white shadow-lg hover:shadow-xl active:scale-[.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{background:'linear-gradient(135deg,#5b9bd5 0%,#3a78b5 100%)'}}>
                  <span className="relative flex items-center justify-center gap-2.5 text-sm tracking-wide">
                    {rendLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Génération du rendu…</>
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

              {/* Mini historique rendu */}
              {gallery.filter(g=>g.module==='rendu').length > 0 && (
                <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/40 mb-3">
                    Rendus générés ({gallery.filter(g=>g.module==='rendu').length})
                  </p>
                  <div className="space-y-2">
                    {gallery.filter(g=>g.module==='rendu').slice(0,5).map(item => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#304035]/6 p-2.5 hover:bg-[#f5eee8]/40 transition-colors">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5b9bd5]/10">
                          <Wand2 className="h-4 w-4 text-[#5b9bd5]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#304035] truncate">{item.prompt}</p>
                          <p className="text-[10px] text-[#304035]/40 mt-0.5">{item.dossier} · {item.ts}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    <Image src={item.imageUrl} alt={item.prompt} width={300} height={200} loading="lazy" className="w-full aspect-video object-cover" />
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
