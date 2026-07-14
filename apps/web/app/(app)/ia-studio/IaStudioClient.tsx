'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  Sparkles, Loader2, Plus, X, Check, Upload,
  Paintbrush, Wand2, Camera, FileImage,
  Palette, RotateCcw, Eye, Zap, Star,
  ChevronRight, ArrowRight, Layers, Clock,
  Image as ImageIcon, CheckCircle2, ScanLine,
  Lightbulb, Target, Award, AlertTriangle,
  Sun, Lamp, Monitor, Home, Building2,
  Download, Maximize2,
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

/**
 * Petit bouton « Importer ma texture » sous une catégorie matériau (Rendu).
 * Convertit l'image en data URL compressée. Quand une texture est posée, le
 * moteur la réplique fidèlement (Kontext multi). 100 % optionnel.
 */
function TextureUpload({ value, onPick, onClear }: { value: string | null; onPick: (d: string) => void; onClear: () => void }) {
  return (
    <div className="mt-2">
      {value ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#5b9bd5]/30 bg-[#5b9bd5]/5 px-2 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="texture importée" className="h-8 w-8 rounded object-cover border border-[#304035]/15" />
          <span className="text-[10px] font-semibold text-[#304035]/70">Texture importée</span>
          <button type="button" onClick={onClear} className="text-[10px] font-bold text-[#b91c1c] hover:underline">Retirer</button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-full border border-dashed border-[#5b9bd5]/40 bg-[#5b9bd5]/5 px-3 py-1 text-[10px] font-semibold text-[#304035]/65 hover:border-[#5b9bd5]/70 hover:bg-[#5b9bd5]/10 transition-all">
          <Upload className="h-3 w-3" /> Importer ma texture
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.currentTarget.value = '';
              if (!f) return;
              try { onPick(await compressImageToDataUrl(f, 1024)); } catch { /* ignore */ }
            }}
          />
        </label>
      )}
    </div>
  );
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
  /** Curseur « Réalisme ↔ Fidélité » 0-100 (défaut 60). */
  realism?: number;
  /** Option « Haute résolution » : agrandit le rendu final (~4K). */
  highRes?: boolean;
  numImages?: number;
  /** Textures importées par l'utilisateur (data URLs) — optionnelles. */
  facadeTextureDataUrl?: string;
  planTextureDataUrl?: string;
  solTextureDataUrl?: string;
  murTextureDataUrl?: string;
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

/* ─── IA Architect (MyArchitectAI) : appel de la route /api/ia/architect ─── */
async function callArchitectAPI(params: {
  mode: 'interior' | 'exterior';
  facades?: string; facadesBas?: string; facadesHaut?: string;
  planTravail?: string; sol?: string; murs?: string;
  poignees?: string; credence?: string; evier?: string; cooktop?: 'induction' | 'gas' | 'downdraft';
  ambiance?: string; highRes?: boolean;
  referenceImageDataUrl: string;
  projectId?: string | null;
}): Promise<{ imageUrl: string | null; imageUrls?: string[]; error?: string; engine?: string }> {
  const res = await fetch('/api/ia/architect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // Même protection défensive que callRenduAPI/callColoristAPI : on parse
  // prudemment et on coerce tout `error` non-string (enveloppe Vercel) → évite
  // le crash React #31 "Objects are not valid as a React child".
  const text = await res.text();
  let parsed: { imageUrl?: string | null; imageUrls?: string[]; error?: unknown; message?: unknown; engine?: string } | null = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }

  const coerceError = (e: unknown): string | undefined => {
    if (e == null) return undefined;
    if (typeof e === 'string') return e;
    if (typeof e === 'object') {
      const obj = e as Record<string, unknown>;
      return (typeof obj.message === 'string' ? obj.message : undefined)
        ?? (typeof obj.error === 'string' ? obj.error : undefined)
        ?? 'Erreur serveur';
    }
    return String(e);
  };

  if (parsed) {
    const errorMessage = coerceError(parsed.error) ?? (!res.ok ? coerceError(parsed.message) : undefined);
    return {
      imageUrl:  typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null,
      imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter(u => typeof u === 'string') as string[] : undefined,
      error:     errorMessage,
      engine:    typeof parsed.engine === 'string' ? parsed.engine : undefined,
    };
  }

  let message = 'Le serveur n\'a pas pu générer le rendu.';
  if (res.status === 504)       message = 'Le rendu a pris trop de temps (timeout). Réessayez.';
  else if (res.status === 502)  message = 'Service de rendu momentanément indisponible. Réessayez dans une minute.';
  else if (res.status === 429)  message = 'Trop de générations dans la dernière heure. Patientez un peu.';
  else if (res.status === 401)  message = 'Session expirée — reconnectez-vous.';
  else if (res.status === 400)  message = 'Image ou paramètres invalides. Vérifiez le format de l\'image.';
  return { imageUrl: null, error: message };
}

/* ─── Coloriste MyArchitectAI : appel de /api/ia/coloriste-architect ─── */
async function callColoristeArchitectAPI(params: {
  facadeHex: string; poigneeHex: string; planHex: string;
  facadeFinish: FinishType; lightingStyle: LightingType;
  poigneeFinish?: FinishType; planFinish?: FinishType;
  handleMaterial?: string; countertopMaterial?: string;
  sourceImageDataUrl: string; projectId?: string | null;
}): Promise<{ imageUrl: string | null; imageUrls?: string[]; error?: string }> {
  const res = await fetch('/api/ia/coloriste-architect', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  });
  const text = await res.text();
  let parsed: { imageUrl?: string | null; imageUrls?: string[]; error?: unknown; message?: unknown } | null = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  const coerce = (e: unknown): string | undefined => {
    if (e == null) return undefined;
    if (typeof e === 'string') return e;
    if (typeof e === 'object') { const o = e as Record<string, unknown>; return (typeof o.message === 'string' ? o.message : undefined) ?? (typeof o.error === 'string' ? o.error : undefined) ?? 'Erreur serveur'; }
    return String(e);
  };
  if (parsed) {
    return {
      imageUrl:  typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null,
      imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter(u => typeof u === 'string') as string[] : undefined,
      error:     coerce(parsed.error) ?? (!res.ok ? coerce(parsed.message) : undefined),
    };
  }
  let message = 'Le serveur n\'a pas pu coloriser.';
  if (res.status === 504) message = 'La colorisation a pris trop de temps. Réessayez.';
  else if (res.status === 502) message = 'Service de rendu momentanément indisponible. Réessayez.';
  else if (res.status === 429) message = 'Trop de générations dans la dernière heure. Patientez un peu.';
  else if (res.status === 401) message = 'Session expirée — reconnectez-vous.';
  else if (res.status === 400) message = 'Photo ou paramètres invalides.';
  return { imageUrl: null, error: message };
}

/* ─── Coloriste ✨ (MyArchitectAI /change-textures) : appel de /api/ia/coloriste-textures ─── */
async function callColoristeTexturesAPI(params: {
  facadeHex: string; poigneeHex: string; planHex: string;
  facadeFinish: FinishType; lightingStyle: LightingType;
  poigneeFinish?: FinishType; planFinish?: FinishType;
  handleMaterial?: string; countertopMaterial?: string;
  sourceImageDataUrl: string; projectId?: string | null;
}): Promise<{ imageUrl: string | null; imageUrls?: string[]; error?: string }> {
  const res = await fetch('/api/ia/coloriste-textures', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  });
  const text = await res.text();
  let parsed: { imageUrl?: string | null; imageUrls?: string[]; error?: unknown; message?: unknown } | null = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  const coerce = (e: unknown): string | undefined => {
    if (e == null) return undefined;
    if (typeof e === 'string') return e;
    if (typeof e === 'object') { const o = e as Record<string, unknown>; return (typeof o.message === 'string' ? o.message : undefined) ?? (typeof o.error === 'string' ? o.error : undefined) ?? 'Erreur serveur'; }
    return String(e);
  };
  if (parsed) {
    return {
      imageUrl:  typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null,
      imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter(u => typeof u === 'string') as string[] : undefined,
      error:     coerce(parsed.error) ?? (!res.ok ? coerce(parsed.message) : undefined),
    };
  }
  let message = 'Le serveur n\'a pas pu coloriser.';
  if (res.status === 504) message = 'La colorisation a pris trop de temps. Réessayez.';
  else if (res.status === 502) message = 'Service de rendu momentanément indisponible. Réessayez.';
  else if (res.status === 429) message = 'Trop de générations dans la dernière heure. Patientez un peu.';
  else if (res.status === 401) message = 'Session expirée — reconnectez-vous.';
  else if (res.status === 400) message = 'Photo ou paramètres invalides.';
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

/* ─── Helper : déclenche le téléchargement local de l'image générée.
 *  On passe par le proxy SAME-ORIGIN /api/ia/download : le navigateur ne peut
 *  pas récupérer l'image distante directement (CSP `connect-src` n'autorise
 *  pas *.supabase.co, et un <a download> cross-origin ignore le nom de
 *  fichier). Le proxy va chercher l'image côté serveur et la renvoie en
 *  pièce jointe. Comme la route est same-origin, l'attribut `download` est
 *  respecté et le clic synchrone évite toute popup bloquée. ─── */
function downloadImageFromUrl(url: string, filename: string): void {
  const href = `/api/ia/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
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
type Module = 'coloriste' | 'rendu' | 'architect' | 'coloriste-archi' | 'coloriste-tex';
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
// Étapes réelles du pipeline IA Architect (moteur MyArchitectAI)
const LOADING_STEPS_ARCHITECT = [
  'Préparation de votre image source',
  'Construction du prompt fidélité',
  'Rendu photoréaliste',
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

/** Compteur de temps écoulé (mm:ss) — affiché pendant une génération pour
 *  montrer que ça AVANCE vraiment (le Rendu prend 1 à 3 min ; sans repère
 *  l'utilisateur croit que c'est figé et ferme la page avant la fin). */
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return <>{mm}:{ss.toString().padStart(2, '0')}</>;
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
  const isMock = !mainUrl || mainUrl.includes('placehold');

  // Téléchargement local du visuel (≠ « Sauvegarder » qui l'attache au dossier).
  const [zoom, setZoom] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const safeTs   = item.ts.replace(/\D/g, '') || '0';
  const fileName = `Avra-${item.module}-${safeTs}.jpg`;
  const handleDownload = async () => {
    if (isMock || !mainUrl) return;
    setDownloading(true);
    await downloadImageFromUrl(mainUrl, fileName);
    setDownloading(false);
  };

  // Lightbox : Échap pour fermer + blocage du scroll de fond pendant l'ouverture.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [zoom]);

  return (
    <>
    <div className="sr rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
          <p className="font-black text-[#304035]">{allUrls.length > 1 ? `${allUrls.length} variantes prêtes !` : 'Résultat prêt !'}</p>
        </div>
      </div>

      {/* Grand aperçu — slider avant/après (coloriste) ou image plein cadre.
          Cliquable pour agrandir en plein écran (lightbox). */}
      <div className="group relative overflow-hidden rounded-2xl bg-[#f5eee8]/50" style={{border:`1.5px solid ${accentColor}28`}}>
        {!isMock ? (
          beforeUrl ? (
            <div className="relative">
              <BeforeAfterSlider beforeUrl={beforeUrl} afterUrl={mainUrl!} />
              <button type="button"
                onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
                onClick={() => setZoom(true)}
                className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black/70 transition-colors"
                title="Voir le résultat en grand">
                <Maximize2 className="h-3.5 w-3.5" />Agrandir
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setZoom(true)}
              className="block w-full cursor-zoom-in" title="Cliquez pour agrandir le résultat">
              <Image src={mainUrl!} alt="Résultat IA" width={1200} height={800} unoptimized
                className="w-full h-auto max-h-[62vh] object-contain" />
              <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm px-3 py-1.5 text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="h-3.5 w-3.5" />Agrandir
              </span>
            </button>
          )
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

      {/* Actions : Télécharger (local) mis en avant, puis Sauvegarder (dossier) + Régénérer */}
      <div className="space-y-2.5">
        {!isMock && (
          <button onClick={handleDownload} disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-[.98] transition-all disabled:opacity-60 disabled:cursor-wait"
            style={{background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`}}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? 'Téléchargement…' : "Télécharger l'image"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={onSave}
            className="flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors hover:bg-[#f5eee8]"
            style={{borderColor:`${accentColor}55`, color:accentColor}}>
            <Plus className="h-4 w-4" />Sauvegarder
          </button>
          <button onClick={onRegenerate}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#304035]/12 py-3 text-sm font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors">
            <RotateCcw className="h-4 w-4" />Régénérer
          </button>
        </div>
      </div>
    </div>

    {/* Lightbox plein écran — rendu via un portal sur <body> pour échapper au
        containing-block créé par les ancêtres animés : la classe .fu applique
        un transform résiduel (animation fadeUp + fill-mode:both), ce qui
        « capturait » le position:fixed et le confinait à la grille au lieu du
        viewport (overlay décalé, boutons cachés sous le panneau Assistant). */}
    {zoom && !isMock && mainUrl && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 fi"
        onClick={() => setZoom(false)} role="dialog" aria-modal="true">
        <div className="relative max-h-[92vh] max-w-[92vw]" onClick={e => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mainUrl} alt="Résultat agrandi"
            className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain shadow-2xl" />
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={handleDownload} disabled={downloading}
              className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#304035] shadow-lg hover:bg-[#f5eee8] transition-colors disabled:opacity-60"
              title="Télécharger l'image">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Télécharger
            </button>
            <button onClick={() => setZoom(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#304035] shadow-lg hover:bg-[#f5eee8] transition-colors"
              title="Fermer (Échap)" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )}
    </>
  );
}

/** Galerie des visuels sauvegardés (coloriste + rendu) — réutilisée dans
 *  chaque module, côte à côte avec l'historique. */
function GalleryCard({ gallery }: { gallery: Item[] }) {
  if (gallery.length === 0) return null;
  return (
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  {(item.module==='coloriste'||item.module==='coloriste-archi'||item.module==='coloriste-tex')
                    ? <Paintbrush className="h-5 w-5 text-white" />
                    : item.module==='architect'
                      ? <Building2 className="h-5 w-5 text-white" />
                      : <Wand2 className="h-5 w-5 text-white" />}
                </div>
                <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm"
                  style={{background:`${item.color}22`,color:item.color}}>
                  {item.module==='coloriste'?'Coloriste':item.module==='coloriste-archi'?'Coloriste+':item.module==='coloriste-tex'?'Coloriste ✨':item.module==='architect'?'Architect':'Rendu'}
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
  // Sauvegarde IA → dossier : sélection du dossier + des sous-dossiers (multi-choix).
  const [saveTarget, setSaveTarget] = useState<{ item: Item; action: string; icon: string; onDone: () => void } | null>(null);
  const [saveDossierId, setSaveDossierId] = useState('');
  const [saveSubfolders, setSaveSubfolders] = useState<string[]>([]);

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

  /* ── COLORISTE MyArchitectAI — état (réutilise photo + couleurs du coloriste) */
  const [colorArchLoading, setColorArchLoading] = useState(false);
  const [colorArchResult,  setColorArchResult]  = useState<Item|null>(null);
  const [colorArchError,   setColorArchError]   = useState<string|null>(null);

  /* ── COLORISTE ✨ MyArchitectAI /change-textures — état (réutilise photo + couleurs) */
  const [colorTexLoading, setColorTexLoading] = useState(false);
  const [colorTexResult,  setColorTexResult]  = useState<Item|null>(null);
  const [colorTexError,   setColorTexError]   = useState<string|null>(null);

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
  // Textures importées par l'utilisateur (data URLs) — optionnelles. Quand
  // présentes, le moteur réplique la matière réelle (Kontext multi).
  const [rendFacadeTex, setRendFacadeTex] = useState<string | null>(null);
  const [rendPlanTex,   setRendPlanTex]   = useState<string | null>(null);
  const [rendSolTex,    setRendSolTex]    = useState<string | null>(null);
  const [rendMurTex,    setRendMurTex]    = useState<string | null>(null);
  const [rendLoading,  setRendLoading]  = useState(false);
  const [rendResult,   setRendResult]   = useState<Item|null>(null);
  const [rendError,    setRendError]    = useState<string|null>(null);
  // Phase 3 — warnings de qualité de l'image source (résolution, contraste, ratio)
  const [rendRefWarnings, setRendRefWarnings] = useState<string[]>([]);
  // Phase 2 — toggle "Précision maximale" : active le refinement SAM+Inpaint
  // après ControlNet/Kontext (+20-30s, +0.04€, gain ~+1% fidélité matériaux).
  const [rendMaxPrecision, setRendMaxPrecision] = useState(false);
  // Curseur « Réalisme ↔ Fidélité » (0-100, défaut 60) — pilote l'équilibre
  // photoréalisme vs préservation du plan dans le pipeline ControlNet Canny.
  const [rendRealism, setRendRealism] = useState(60);
  // Option « Haute résolution » : agrandit le rendu final (~4K). OFF par défaut
  // (garde la vitesse en itération ; à activer pour le rendu final/client).
  const [rendHighRes, setRendHighRes] = useState(false);
  // Phase 5 — compteur "Régénérer" : s'incrémente quand l'utilisateur clique
  // sur "Régénérer" avec un rendu déjà affiché. Tracking côté serveur pour
  // analyser quels paramètres / images sources mécontentent les utilisateurs.
  const [rendUserRetry, setRendUserRetry] = useState(0);

  /* ── IA ARCHITECT (MyArchitectAI) — état */
  const [archRefFile,  setArchRefFile]  = useState<File | null>(null);
  const [archRefURL,   setArchRefURL]   = useState<string | null>(null);
  const [archMode,     setArchMode]     = useState<'interior' | 'exterior'>('interior');
  const [archFacades,     setArchFacades]     = useState('');
  const [archFacadesBas,  setArchFacadesBas]  = useState('');
  const [archFacadesHaut, setArchFacadesHaut] = useState('');
  const [archPlan,     setArchPlan]     = useState('');
  const [archSol,      setArchSol]      = useState('');
  const [archMurs,     setArchMurs]     = useState('');
  const [archPoignees, setArchPoignees] = useState('');
  const [archCredence, setArchCredence] = useState('');
  const [archEvier,    setArchEvier]    = useState('');
  const [archCooktop,  setArchCooktop]  = useState<'' | 'induction' | 'gas' | 'downdraft'>('');
  const [archAmbiance, setArchAmbiance] = useState('');
  const [archHighRes,  setArchHighRes]  = useState(false);
  const [archLoading,  setArchLoading]  = useState(false);
  const [archResult,   setArchResult]   = useState<Item | null>(null);
  const [archError,    setArchError]    = useState<string | null>(null);

  /* ── RETOUCHE PHOTO (edit-by-prompt) — édition ciblée du rendu affiché */
  const [retouchOpen,    setRetouchOpen]    = useState(false);
  const [retouchTab,     setRetouchTab]     = useState<'guided' | 'free'>('guided');
  const [retouchZone,    setRetouchZone]    = useState('');
  const [retouchMat,     setRetouchMat]     = useState('');
  const [retouchChanges, setRetouchChanges] = useState<{ zone: string; material: string }[]>([]);
  const [retouchFree,    setRetouchFree]    = useState('');
  const [retouchLoading, setRetouchLoading] = useState(false);
  const [retouchError,   setRetouchError]   = useState<string | null>(null);
  const [retouchApplied, setRetouchApplied] = useState<string | null>(null);

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

  /* Preview image de référence IA Architect */
  useEffect(() => {
    if (!archRefFile) { setArchRefURL(null); return; }
    const u = URL.createObjectURL(archRefFile);
    setArchRefURL(u);
    return () => URL.revokeObjectURL(u);
  }, [archRefFile]);

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

  /** Ouvre la modale de sauvegarde : choix du dossier + sous-dossier(s). */
  const openSaveModal = (item: Item, action: string, icon: string, onDone: () => void) => {
    if (!item.imageUrl) return;
    setSaveTarget({ item, action, icon, onDone });
    setSaveDossierId(dossierId || allDossiers[0]?.id || '');
    setSaveSubfolders([IA_SUBFOLDER_LABEL]);
  };
  /** Confirme : enregistre le visuel dans CHAQUE sous-dossier coché. */
  const confirmSave = () => {
    if (!saveTarget || !saveDossierId || saveSubfolders.length === 0) return;
    const { item, action, icon, onDone } = saveTarget;
    const dossier = allDossiers.find(d => d.id === saveDossierId);
    const dName = dossier?.name ?? 'Sans dossier';
    for (const label of saveSubfolders) {
      const exists = (dossier?.subfolders ?? []).some(sf => sf.label === label);
      if (!exists) addSubfolder(saveDossierId, label);
      addDocumentToSubfolder(saveDossierId, label, {
        name: `${action} — ${item.prompt.slice(0, 60)} (${item.ts}).jpg`,
        type: 'image/jpeg',
        url: item.imageUrl!,
        addedAt: new Date().toLocaleDateString('fr-FR'),
      });
    }
    setGallery(p => [item, ...p]);
    addLog({ user: userName, action, target: `${dName} — "${item.prompt.slice(0, 40)}"`, icon });
    onDone();
    setSaveTarget(null);
  };

  const saveColor = () => {
    if (!colorResult) return;
    openSaveModal(colorResult, 'Coloriste IA', '🎨', () => setColorResult(null));
  };

  /* ── Coloriste MyArchitectAI : lancer (même couleurs, moteur MyArchitectAI) */
  const runColoristeArchi = async () => {
    if (!photoFile) { setColorArchError('Photo de la cuisine requise.'); return; }
    setColorArchLoading(true); setColorArchResult(null); setColorArchError(null);
    try {
      let sourceImageDataUrl: string;
      try { sourceImageDataUrl = await compressImageToDataUrl(photoFile, 1280); }
      catch { setColorArchError('Impossible de lire la photo. Réessayez avec un autre fichier.'); setColorArchLoading(false); return; }
      const result = await callColoristeArchitectAPI({
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
        projectId:          dossierId || null,
      });
      if (result.error) { setColorArchError(result.error); setColorArchLoading(false); return; }
      setIaHistoryRefresh(n => n + 1);
      const desc = preset ? `${preset.name} — ${preset.desc}` : `Façades ${facadeCol} ${facadeFinish}`;
      setColorArchResult({
        id: uid(), module: 'coloriste-archi', prompt: desc, dossier: dossierName,
        ts: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
        color: preset?.facade ?? facadeCol,
        imageUrl: result.imageUrl ?? undefined,
        imageUrls: result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setColorArchError(msg && !msg.includes('fetch') ? msg : 'La génération a pris trop de temps ou la connexion s\'est interrompue. Réessayez.');
    }
    setColorArchLoading(false);
  };

  const saveColoristeArchi = () => {
    if (!colorArchResult) return;
    openSaveModal(colorArchResult, 'Coloriste IA', '🎨', () => setColorArchResult(null));
  };

  /* ── Coloriste ✨ (/change-textures) : lancer (mêmes couleurs, préserve la géométrie) */
  const runColoristeTextures = async () => {
    if (!photoFile) { setColorTexError('Photo de la cuisine requise.'); return; }
    setColorTexLoading(true); setColorTexResult(null); setColorTexError(null);
    try {
      let sourceImageDataUrl: string;
      try { sourceImageDataUrl = await compressImageToDataUrl(photoFile, 1280); }
      catch { setColorTexError('Impossible de lire la photo. Réessayez avec un autre fichier.'); setColorTexLoading(false); return; }
      const result = await callColoristeTexturesAPI({
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
        projectId:          dossierId || null,
      });
      if (result.error) { setColorTexError(result.error); setColorTexLoading(false); return; }
      setIaHistoryRefresh(n => n + 1);
      const desc = preset ? `${preset.name} — ${preset.desc}` : `Façades ${facadeCol} ${facadeFinish}`;
      setColorTexResult({
        id: uid(), module: 'coloriste-tex', prompt: desc, dossier: dossierName,
        ts: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
        color: preset?.facade ?? facadeCol,
        imageUrl: result.imageUrl ?? undefined,
        imageUrls: result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setColorTexError(msg && !msg.includes('fetch') ? msg : 'La génération a pris trop de temps ou la connexion s\'est interrompue. Réessayez.');
    }
    setColorTexLoading(false);
  };

  const saveColoristeTextures = () => {
    if (!colorTexResult) return;
    openSaveModal(colorTexResult, 'Coloriste IA', '🎨', () => setColorTexResult(null));
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
        realism:               rendRealism,
        highRes:               rendHighRes,
        userRetryCount:        nextRetryCount,
        numImages:             rendNumVariants,
        facadeTextureDataUrl:  rendFacadeTex ?? undefined,
        planTextureDataUrl:    rendPlanTex ?? undefined,
        solTextureDataUrl:     rendSolTex ?? undefined,
        murTextureDataUrl:     rendMurTex ?? undefined,
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
    openSaveModal(rendResult, 'Rendu Réaliste', '✨', () => setRendResult(null));
  };

  /* ── IA Architect (MyArchitectAI) : lancer */
  const runArchitect = async () => {
    if (!archRefFile) {
      setArchError('Importez un plan, un rendu 3D, un sketch ou une photo pour générer le rendu.');
      return;
    }
    setArchLoading(true); setArchResult(null); setArchError(null);
    try {
      let referenceImageDataUrl: string;
      try {
        referenceImageDataUrl = await compressImageToDataUrl(archRefFile, 2048);
      } catch {
        setArchError('Image illisible. Choisissez une autre image (PNG ou JPG).');
        setArchLoading(false);
        return;
      }
      const result = await callArchitectAPI({
        mode:        archMode,
        facades:     archFacades.trim() || undefined,
        facadesBas:  archMode === 'interior' ? (archFacadesBas.trim()  || undefined) : undefined,
        facadesHaut: archMode === 'interior' ? (archFacadesHaut.trim() || undefined) : undefined,
        planTravail: archPlan.trim()    || undefined,
        sol:         archSol.trim()     || undefined,
        murs:        archMurs.trim()    || undefined,
        // Champs cuisine (n'ont de sens qu'en intérieur)
        poignees:    archMode === 'interior' ? (archPoignees.trim() || undefined) : undefined,
        credence:    archMode === 'interior' ? (archCredence.trim() || undefined) : undefined,
        evier:       archMode === 'interior' ? (archEvier.trim() || undefined) : undefined,
        cooktop:     archMode === 'interior' && archCooktop ? archCooktop : undefined,
        ambiance:    archAmbiance.trim() || undefined,
        highRes:     archHighRes,
        referenceImageDataUrl,
        projectId:   dossierId || null,
      });

      if (result.error) { setArchError(result.error); setArchLoading(false); return; }

      setIaHistoryRefresh(n => n + 1);

      setArchResult({
        id: uid(), module: 'architect',
        prompt: archAmbiance.trim() || archFacades.trim() || (archMode === 'exterior' ? 'Rendu extérieur' : 'Rendu intérieur'),
        dossier: dossierName,
        ts: new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
        color: '#8a6cc2',
        imageUrl: result.imageUrl ?? undefined,
        imageUrls: result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setArchError(msg && !msg.includes('fetch')
        ? msg
        : 'La génération a pris trop de temps ou la connexion s\'est interrompue. Réessayez dans quelques secondes.');
    }
    setArchLoading(false);
  };

  const saveArchitect = () => {
    if (!archResult) return;
    openSaveModal(archResult, 'Rendu Réaliste', '🏛️', () => setArchResult(null));
  };

  /* ── RETOUCHE PHOTO : édition ciblée du rendu affiché via /api/ia/retouch */
  const urlToDataUrl = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const runRetouch = async () => {
    const srcUrl = archResult?.imageUrl;
    if (!srcUrl) return;
    const guided = retouchTab === 'guided';
    // Retouche GROUPÉE : file d'attente + la saisie courante si elle est valide,
    // le tout appliqué en UNE seule génération. Dédoublonnage par zone : si la
    // saisie courante vise une zone déjà en file, elle la remplace (pas de doublon).
    const cur = retouchZone && retouchMat.trim() ? { zone: retouchZone, material: retouchMat.trim() } : null;
    const pending = [
      ...retouchChanges.filter(c => !cur || c.zone !== cur.zone),
      ...(cur ? [cur] : []),
    ];
    if (guided && pending.length === 0) {
      setRetouchError('Choisissez une zone et indiquez la nouvelle matière/couleur.');
      return;
    }
    if (!guided && !retouchFree.trim()) {
      setRetouchError('Décrivez la retouche à appliquer.');
      return;
    }
    const prevDossier = archResult?.dossier;
    setRetouchLoading(true); setRetouchError(null); setRetouchApplied(null);
    try {
      let referenceImageDataUrl: string;
      try {
        referenceImageDataUrl = await urlToDataUrl(srcUrl);
      } catch {
        setRetouchError('Impossible de charger le rendu à retoucher. Réessayez.');
        setRetouchLoading(false);
        return;
      }
      const res = await fetch('/api/ia/retouch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImageDataUrl,
          changes:     guided ? pending : undefined,
          instruction: guided ? undefined : retouchFree.trim(),
          projectId:   dossierId || null,
        }),
      });
      const text = await res.text();
      let parsed: { imageUrl?: string; imageUrls?: string[]; instruction?: string; error?: unknown } | null = null;
      try { parsed = JSON.parse(text); } catch { parsed = null; }

      if (!res.ok || !parsed?.imageUrl) {
        const msg =
          parsed && typeof parsed.error === 'string' ? parsed.error
          : res.status === 422 ? 'Consigne trop vague — précisez quel élément changer et comment.'
          : res.status === 429 ? 'Trop de retouches cette heure. Patientez un peu.'
          : 'La retouche a échoué. Réessayez.';
        setRetouchError(msg);
        setRetouchLoading(false);
        return;
      }

      setIaHistoryRefresh(n => n + 1);
      setRetouchApplied(typeof parsed.instruction === 'string' ? parsed.instruction : null);
      // La retouche devient le nouveau rendu courant → permet d'enchaîner les retouches.
      setArchResult({
        id: uid(), module: 'architect',
        prompt: guided
          ? `Retouche : ${pending.map(c => c.material).join(', ')}`
          : `Retouche : ${retouchFree.trim()}`,
        dossier: prevDossier,
        ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        color: '#8a6cc2',
        imageUrl: parsed.imageUrl,
        imageUrls: Array.isArray(parsed.imageUrls) && parsed.imageUrls.length ? parsed.imageUrls : [parsed.imageUrl],
      });
      setRetouchMat(''); setRetouchFree(''); setRetouchZone(''); setRetouchChanges([]);
    } catch {
      setRetouchError('La retouche a pris trop de temps ou la connexion a été interrompue. Réessayez.');
    }
    setRetouchLoading(false);
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
          subtitle="Trois intelligences · Une cuisine parfaite"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
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

          {/* Coloriste ✨ (MyArchitectAI /change-textures) — nouveau module de test */}
          <button onClick={() => setTab('coloriste-tex')}
            className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-350 ${
              tab==='coloriste-tex'
                ? 'border-[#2f9e8f] bg-white shadow-xl'
                : 'border-[#304035]/8 bg-white/70 hover:border-[#2f9e8f]/30 hover:bg-white hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{background:'radial-gradient(ellipse at 20% 50%, rgba(47,158,143,.06), transparent 65%)'}} />
            {tab==='coloriste-tex' && (
              <div className="absolute inset-0"
                style={{background:'radial-gradient(ellipse at 20% 50%, rgba(47,158,143,.07), transparent 65%)'}} />
            )}
            <div className="relative flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110 ${tab==='coloriste-tex'?'scale-110':''}`}
                style={{background:tab==='coloriste-tex'?'linear-gradient(135deg,#2f9e8f,#247a6f)':'linear-gradient(135deg,#2f9e8f55,#2f9e8f30)'}}>
                <Paintbrush className={`h-6 w-6 ${tab==='coloriste-tex'?'text-white':'text-[#2f9e8f]'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-[#304035] text-lg">Coloriste ✨</p>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#2f9e8f]/12 text-[#2f9e8f]">Nouveau · Test</span>
                </div>
                <p className="text-sm text-[#304035]/60 leading-relaxed">
                  Colorisation qui <span className="font-semibold text-[#304035]/80">préserve la géométrie</span> — moteur MyArchitectAI.
                </p>
                {tab==='coloriste-tex' && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#2f9e8f]">
                    <div className="h-2 w-2 rounded-full bg-[#2f9e8f] dp" />
                    Module actif — prêt à l'emploi
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Rendu Réaliste — masqué (onglet désactivé) */}
          {false && (
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
          )}

          {/* Rendu Réaliste */}
          <button onClick={() => setTab('architect')}
            className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-350 ${
              tab==='architect'
                ? 'border-[#8a6cc2] bg-white shadow-xl'
                : 'border-[#304035]/8 bg-white/70 hover:border-[#8a6cc2]/30 hover:bg-white hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{background:'radial-gradient(ellipse at 20% 50%, rgba(138,108,194,.06), transparent 65%)'}} />
            {tab==='architect' && (
              <div className="absolute inset-0"
                style={{background:'radial-gradient(ellipse at 20% 50%, rgba(138,108,194,.07), transparent 65%)'}} />
            )}
            <div className="relative flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110 ${tab==='architect'?'scale-110':''}`}
                style={{background:tab==='architect'?'linear-gradient(135deg,#8a6cc2,#6f54a8)':'linear-gradient(135deg,#8a6cc255,#8a6cc230)'}}>
                <Building2 className={`h-6 w-6 ${tab==='architect'?'text-white':'text-[#8a6cc2]'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-[#304035] text-lg">Rendu Réaliste</p>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#8a6cc2]/12 text-[#8a6cc2]">Post-conception</span>
                </div>
                <p className="text-sm text-[#304035]/60 leading-relaxed">
                  Moteur photoréaliste dédié <span className="font-semibold text-[#304035]/80">architecture & intérieur</span> — intérieur ou extérieur.
                </p>
                {tab==='architect' && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#8a6cc2]">
                    <div className="h-2 w-2 rounded-full bg-[#8a6cc2] dp" />
                    Module actif — prêt à l'emploi
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Coloriste IA+ — masqué (onglet désactivé) */}
          {false && (
          <button onClick={() => setTab('coloriste-archi')}
            className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-350 ${
              tab==='coloriste-archi'
                ? 'border-[#2f9e8f] bg-white shadow-xl'
                : 'border-[#304035]/8 bg-white/70 hover:border-[#2f9e8f]/30 hover:bg-white hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{background:'radial-gradient(ellipse at 20% 50%, rgba(47,158,143,.06), transparent 65%)'}} />
            {tab==='coloriste-archi' && (
              <div className="absolute inset-0"
                style={{background:'radial-gradient(ellipse at 20% 50%, rgba(47,158,143,.07), transparent 65%)'}} />
            )}
            <div className="relative flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110 ${tab==='coloriste-archi'?'scale-110':''}`}
                style={{background:tab==='coloriste-archi'?'linear-gradient(135deg,#2f9e8f,#247a6f)':'linear-gradient(135deg,#2f9e8f55,#2f9e8f30)'}}>
                <Paintbrush className={`h-6 w-6 ${tab==='coloriste-archi'?'text-white':'text-[#2f9e8f]'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-[#304035] text-lg">Coloriste IA+</p>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#2f9e8f]/12 text-[#2f9e8f]">Post-conception</span>
                </div>
                <p className="text-sm text-[#304035]/60 leading-relaxed">
                  Même principe que le Coloriste, <span className="font-semibold text-[#304035]/80">moteur IA</span> — photo + couleurs.
                </p>
                {tab==='coloriste-archi' && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#2f9e8f]">
                    <div className="h-2 w-2 rounded-full bg-[#2f9e8f] dp" />
                    Module actif — prêt à l'emploi
                  </div>
                )}
              </div>
            </div>
          </button>
          )}
        </div>

        {/* ══════════════════════════ MODULE COLORISTE */}
        {tab === 'coloriste' && (
          <div className="fu space-y-6">

            {/* Ligne 1 : Photo (⅓) + Grand aperçu (⅔) — sections un peu plus hautes */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">

              {/* Photo de la cuisine — un tiers */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 flex flex-col lg:min-h-[400px]">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-4 w-4 text-[#a67749]" />
                  <p className="font-bold text-[#304035]">Photo de la cuisine</p>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#a67749]/70 bg-[#a67749]/8 px-2 py-0.5 rounded-full">Optionnel</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
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
              </div>

              {/* Grand aperçu du résultat — deux tiers */}
              <div className="space-y-4 lg:col-span-2">

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
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#a67749]/8 border border-[#a67749]/15 px-3 py-2.5">
                      <p className="text-[11px] leading-snug text-[#304035]/70">La colorisation prend en général <b className="text-[#304035]">15 à 40 s</b>. <b className="text-[#304035]">Ne ferme pas la page</b>.</p>
                      <span className="shrink-0 font-mono text-base font-black tabular-nums" style={{color:'#a67749'}}><ElapsedTimer /></span>
                    </div>
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

                {/* État vide inspirant (Conseils sur chantier retiré — 06/06/2026) */}
                {!colorLoading && !colorResult && (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#a67749]/20 bg-gradient-to-br from-[#a67749]/5 to-white p-12 text-center lg:min-h-[400px]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-[#a67749]/10">
                      <Eye className="h-7 w-7 text-[#a67749]/60" />
                    </div>
                    <p className="font-bold text-[#304035] mb-1.5">Aperçu du résultat</p>
                    <p className="text-xs text-[#304035]/50 leading-relaxed">
                      Choisissez une palette ou configurez vos couleurs, puis lancez le Coloriste IA.
                    </p>
                  </div>
                )}

              </div>{/* /grand aperçu (deux tiers) */}
            </div>{/* /ligne 1 */}

            {/* Palettes (½) + Paramètres du rendu (½) côte à côte */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">

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
                  <div className="flex flex-col sm:flex-row gap-4">
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
            </div>{/* /Palettes + Paramètres */}

            {/* Associer au dossier + Appliquer les couleurs — pleine largeur */}
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

            {/* Historique (½) + Galerie (½) côte à côte */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <HistoryPanel
                filterType="COLOR_VARIATION"
                accent="#a67749"
                refreshTrigger={iaHistoryRefresh}
                onSelect={openHistoryJob}
              />
              <GalleryCard gallery={gallery} />
            </div>

          </div>
        )}

        {/* ══════════════════════════ MODULE RENDU RÉALISTE */}
        {tab === 'rendu' && (
          <div className="fu space-y-6">

            {/* Ligne 1 : Image de référence (⅓) + Grand aperçu (⅔) — sections un peu plus hautes */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">

              {/* Image de référence — un tiers (Kontext img2img : préserve le layout) */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 flex flex-col lg:min-h-[400px]">
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

              {/* Grand aperçu du résultat — deux tiers */}
              <div className="space-y-4 lg:col-span-2">

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
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#5b9bd5]/8 border border-[#5b9bd5]/15 px-3 py-2.5">
                      <p className="text-[11px] leading-snug text-[#304035]/70">Le rendu réaliste prend <b className="text-[#304035]">1 à 3 min</b>. C'est normal — <b className="text-[#304035]">ne ferme pas la page</b>.</p>
                      <span className="shrink-0 font-mono text-base font-black tabular-nums" style={{color:'#5b9bd5'}}><ElapsedTimer /></span>
                    </div>
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

                {/* État vide rendu (tips retirés pour cohérence avec Coloriste) */}
                {!rendLoading && !rendResult && (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#5b9bd5]/20 bg-gradient-to-br from-[#5b9bd5]/5 to-white p-12 text-center lg:min-h-[400px]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-[#5b9bd5]/10">
                      <ImageIcon className="h-7 w-7 text-[#5b9bd5]/60" />
                    </div>
                    <p className="font-bold text-[#304035] mb-1.5">Votre rendu apparaîtra ici</p>
                    <p className="text-xs text-[#304035]/50 leading-relaxed">
                      Importez une image de référence et lancez le rendu photoréaliste.
                    </p>
                  </div>
                )}

              </div>{/* /grand aperçu (deux tiers) */}
            </div>{/* /ligne 1 */}

            {/* Matériaux — pleine largeur */}
            <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#5b9bd5]" />
                  <p className="font-bold text-[#304035]">Matériaux</p>
                </div>

                {/* Curseur Réalisme ↔ Fidélité du plan (07/06/2026) */}
                <div className="rounded-xl bg-[#5b9bd5]/5 border border-[#5b9bd5]/15 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/55">Style de rendu</p>
                    <span className="text-[11px] font-bold text-[#5b9bd5]">
                      {rendRealism <= 33 ? 'Fidélité du plan' : rendRealism >= 67 ? 'Photoréalisme max' : 'Équilibré'}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={rendRealism}
                    onChange={e => setRendRealism(Number(e.target.value))}
                    className="w-full cursor-pointer accent-[#5b9bd5]"
                    aria-label="Réalisme contre fidélité du plan"
                  />
                  <div className="mt-1 flex justify-between text-[9px] text-[#304035]/45">
                    <span>← Plan exact (plus 3D)</span>
                    <span>Vraie photo (léger risque de dérive) →</span>
                  </div>
                </div>

                {/* Option Haute résolution (≈4K) — agrandissement IA, +10-25s */}
                <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-[#5b9bd5]/15 bg-[#5b9bd5]/5 px-3.5 py-3 hover:bg-[#5b9bd5]/8 transition-colors">
                  <input
                    type="checkbox"
                    checked={rendHighRes}
                    onChange={e => setRendHighRes(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-[#5b9bd5]/40 text-[#5b9bd5] focus:ring-2 focus:ring-[#5b9bd5]/30"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#304035]">Haute résolution <span className="ml-1 text-[9px] text-[#5b9bd5] font-semibold">≈4K · +10-25s</span></p>
                    <p className="text-[10px] text-[#304035]/55 leading-snug mt-0.5">Agrandit le rendu final pour une image nette haute résolution. À activer pour le rendu présenté au client.</p>
                  </div>
                </label>

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
                  <TextureUpload value={rendFacadeTex} onPick={setRendFacadeTex} onClear={() => setRendFacadeTex(null)} />
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
                  <TextureUpload value={rendPlanTex} onPick={setRendPlanTex} onClear={() => setRendPlanTex(null)} />
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
                  <TextureUpload value={rendSolTex} onPick={setRendSolTex} onClear={() => setRendSolTex(null)} />
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
                  <TextureUpload value={rendMurTex} onPick={setRendMurTex} onClear={() => setRendMurTex(null)} />
                </div>
              </div>

              {/* Dossier + CTA */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
                <DossierPicker />
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

            {/* Historique (½) + Galerie (½) côte à côte */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <HistoryPanel
                filterType="PHOTOREALISM_ENHANCE"
                accent="#5b9bd5"
                refreshTrigger={iaHistoryRefresh}
                onSelect={openHistoryJob}
              />
              <GalleryCard gallery={gallery} />
            </div>

          </div>
        )}

        {/* ══════════════════════════ MODULE RENDU RÉALISTE */}
        {tab === 'architect' && (
          <div className="fu space-y-6">

            {/* Ligne 1 : Image source (⅓) + Grand aperçu (⅔) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">

              {/* Image source — un tiers */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 flex flex-col lg:min-h-[400px]">
                <div className="flex items-center gap-2 mb-1">
                  <FileImage className="h-4 w-4 text-[#8a6cc2]" />
                  <p className="font-bold text-[#304035]">Image source <span className="ml-1 rounded-full bg-[#8a6cc2]/10 text-[#8a6cc2] text-[9px] font-bold px-2 py-0.5 align-middle">REQUIS</span></p>
                </div>
                <p className="text-xs text-[#304035]/50 mb-2">Plan, rendu 3D, sketch ou photo — l'IA le transforme en photo réaliste en préservant la géométrie.</p>
                <div className="mb-4 rounded-lg bg-[#8a6cc2]/5 border border-[#8a6cc2]/15 px-3 py-2 text-[10px] leading-relaxed text-[#304035]/65">
                  <span className="font-bold text-[#8a6cc2]">Conseil&nbsp;:</span> une image nette et bien cadrée donne les meilleurs résultats. Précisez les matériaux ci-dessous pour réduire les erreurs de rendu.
                </div>
                <Drop label="" sub="Déposez un plan, perspective 3D, sketch ou photo"
                  onFile={setArchRefFile} file={archRefFile} accent="#8a6cc2"
                  tips={['Export image WinnerFlex', 'Rendu 3D ou perspective', 'Sketch / croquis main', 'Photo de la pièce']} />
                {archRefFile && archRefURL && (
                  <div className="mt-3 relative rounded-xl overflow-hidden">
                    <Image src={archRefURL} alt="Source" width={500} height={176} loading="lazy" className="w-full max-h-44 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <button onClick={() => setArchRefFile(null)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-3">
                      <span className="rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5">Source active</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grand aperçu du résultat — deux tiers */}
              <div className="space-y-4 lg:col-span-2">

                {/* Erreur */}
                {archError && !archLoading && (
                  <div className="fu rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-700">Génération échouée</p>
                      <p className="text-xs text-red-600/80 mt-0.5 leading-relaxed">{archError}</p>
                    </div>
                    <button onClick={() => setArchError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Loading */}
                {archLoading && (
                  <div className="fu rounded-2xl bg-white border border-[#304035]/8 shadow-md p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                        style={{background:'linear-gradient(135deg,#8a6cc2,#6f54a8)'}}>
                        <Building2 className="h-6 w-6 text-white sh" />
                      </div>
                      <div>
                        <p className="font-black text-[#304035]">Rendu Réaliste en action</p>
                        <p className="text-xs text-[#304035]/50 mt-0.5">Rendu photoréaliste…</p>
                      </div>
                    </div>
                    <ProgressBar steps={LOADING_STEPS_ARCHITECT} color="#8a6cc2" />
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#8a6cc2]/8 border border-[#8a6cc2]/15 px-3 py-2.5">
                      <p className="text-[11px] leading-snug text-[#304035]/70">Le rendu prend en général <b className="text-[#304035]">15 à 40 s</b>. <b className="text-[#304035]">Ne fermez pas la page</b>.</p>
                      <span className="shrink-0 font-mono text-base font-black tabular-nums" style={{color:'#8a6cc2'}}><ElapsedTimer /></span>
                    </div>
                  </div>
                )}

                {/* Résultat */}
                {archResult && !archLoading && (
                  <ResultCard
                    item={archResult}
                    accentColor="#8a6cc2"
                    icon={Building2}
                    onSave={saveArchitect}
                    onRegenerate={runArchitect}
                  />
                )}

                {/* RETOUCHE PHOTO — édition ciblée du rendu affiché */}
                {archResult && !archLoading && (
                  <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md overflow-hidden">
                    <button
                      onClick={() => { setRetouchOpen(o => !o); setRetouchError(null); }}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-[#8a6cc2]/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8a6cc2]/10">
                          <Wand2 className="h-4 w-4 text-[#8a6cc2]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#304035]">Retoucher ce rendu</p>
                          <p className="text-[11px] text-[#304035]/50 -mt-0.5">Corrige un détail sans tout régénérer</p>
                        </div>
                      </div>
                      <span className={`text-[#8a6cc2] transition-transform ${retouchOpen ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {retouchOpen && (
                      <div className="border-t border-[#304035]/8 p-5 space-y-4">
                        {/* Onglets guidé / libre */}
                        <div className="flex gap-1.5 rounded-xl bg-[#f5eee8]/50 p-1">
                          {([
                            { key: 'guided', label: 'Retouche guidée' },
                            { key: 'free',   label: 'Décrire (texte)' },
                          ] as const).map(t => (
                            <button key={t.key} onClick={() => { setRetouchTab(t.key); setRetouchError(null); }}
                              className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                                retouchTab === t.key ? 'bg-white text-[#6f54a8] shadow-sm' : 'text-[#304035]/55 hover:text-[#304035]'
                              }`}>
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {retouchTab === 'guided' ? (
                          <>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Quelle zone ?</p>
                              <div className="flex flex-wrap gap-1.5">
                                {([
                                  { key: 'meubles-bas',    label: 'Meubles bas' },
                                  { key: 'meubles-hauts',  label: 'Meubles hauts' },
                                  { key: 'toutes-facades', label: 'Toutes façades' },
                                  { key: 'plan',           label: 'Plan de travail' },
                                  { key: 'credence',       label: 'Crédence' },
                                  { key: 'sol',            label: 'Sol' },
                                  { key: 'murs',           label: 'Murs' },
                                  { key: 'poignees',       label: 'Poignées' },
                                  { key: 'evier',          label: 'Évier' },
                                ] as const).map(z => (
                                  <button key={z.key} onClick={() => setRetouchZone(z.key)}
                                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                                      retouchZone === z.key
                                        ? 'border-[#8a6cc2] bg-[#8a6cc2]/10 text-[#6f54a8]'
                                        : 'border-[#304035]/12 bg-[#f5eee8]/40 text-[#304035]/60 hover:border-[#8a6cc2]/40'
                                    }`}>
                                    {z.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Nouvelle matière / couleur</p>
                              <input
                                value={retouchMat}
                                onChange={e => setRetouchMat(e.target.value)}
                                placeholder="Ex : Blanc mat uni, noyer clair, inox brossé"
                                className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                              />
                            </div>

                            {/* Empiler plusieurs changements → tout appliquer en UNE génération */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!retouchZone || !retouchMat.trim()) {
                                  setRetouchError('Choisissez une zone et une matière avant d\'ajouter.');
                                  return;
                                }
                                setRetouchError(null);
                                setRetouchChanges(prev => [
                                  ...prev.filter(c => c.zone !== retouchZone),
                                  { zone: retouchZone, material: retouchMat.trim() },
                                ]);
                                setRetouchZone(''); setRetouchMat('');
                              }}
                              className="w-full rounded-xl border border-dashed border-[#8a6cc2]/40 py-2 text-[12px] font-bold text-[#6f54a8] hover:bg-[#8a6cc2]/5 transition-colors"
                            >
                              + Ajouter ce changement (pour tout appliquer en 1 seul rendu)
                            </button>

                            {retouchChanges.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {retouchChanges.map((c, i) => {
                                  const labels: Record<string, string> = {
                                    'meubles-bas': 'Meubles bas', 'meubles-hauts': 'Meubles hauts',
                                    'toutes-facades': 'Toutes façades', 'plan': 'Plan de travail',
                                    'credence': 'Crédence', 'sol': 'Sol', 'murs': 'Murs',
                                    'poignees': 'Poignées', 'evier': 'Évier',
                                  };
                                  return (
                                    <span key={c.zone + i} className="inline-flex items-center gap-1.5 rounded-full bg-[#8a6cc2]/10 border border-[#8a6cc2]/25 px-2.5 py-1 text-[11px] text-[#6f54a8]">
                                      {(labels[c.zone] || c.zone)} → {c.material}
                                      <button type="button" aria-label="Retirer"
                                        onClick={() => setRetouchChanges(prev => prev.filter((_, j) => j !== i))}
                                        className="text-[#6f54a8]/60 hover:text-[#6f54a8]">✕</button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Décrivez la retouche</p>
                            <textarea
                              value={retouchFree}
                              onChange={e => setRetouchFree(e.target.value)}
                              rows={2}
                              placeholder="Ex : mets les meubles hauts en blanc, garde le reste"
                              className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow resize-none"
                            />
                            <p className="mt-1.5 text-[10px] text-[#304035]/45 leading-snug">Tu peux décrire plusieurs changements d&apos;un coup (ex. « plan noir et poignées laiton ») — tout est appliqué en 1 seul rendu, le reste est préservé.</p>
                          </div>
                        )}

                        {retouchError && (
                          <div className="rounded-xl border border-red-300/40 bg-red-50/60 px-3 py-2 text-[11px] text-red-700">{retouchError}</div>
                        )}
                        {retouchApplied && !retouchError && (
                          <div className="rounded-xl border border-[#8a6cc2]/25 bg-[#8a6cc2]/[0.06] px-3 py-2 text-[11px] text-[#304035]/70">
                            <b className="text-[#6f54a8]">Appliqué :</b> {retouchApplied}
                          </div>
                        )}

                        <button onClick={runRetouch} disabled={retouchLoading}
                          className="w-full rounded-2xl py-3 font-black text-white shadow-md hover:shadow-lg active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'linear-gradient(135deg,#8a6cc2 0%,#6f54a8 100%)' }}>
                          <span className="flex items-center justify-center gap-2 text-sm">
                            {retouchLoading
                              ? <><Loader2 className="h-4 w-4 animate-spin" />Retouche en cours…</>
                              : <><Wand2 className="h-4 w-4" />{(() => {
                                  const n = retouchChanges.length + ((retouchZone && retouchMat.trim()) ? 1 : 0);
                                  return retouchTab === 'guided' && n > 1 ? `Appliquer les ${n} retouches (1 rendu)` : 'Appliquer la retouche';
                                })()}</>}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* État vide */}
                {!archLoading && !archResult && (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#8a6cc2]/20 bg-gradient-to-br from-[#8a6cc2]/5 to-white p-12 text-center lg:min-h-[400px]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-[#8a6cc2]/10">
                      <Building2 className="h-7 w-7 text-[#8a6cc2]/60" />
                    </div>
                    <p className="font-bold text-[#304035] mb-1.5">Votre rendu apparaîtra ici</p>
                    <p className="text-xs text-[#304035]/50 leading-relaxed">
                      Importez une image source et lancez le rendu.
                    </p>
                  </div>
                )}

              </div>{/* /grand aperçu */}
            </div>{/* /ligne 1 */}

            {/* Paramètres — pleine largeur */}
            <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[#8a6cc2]" />
                <p className="font-bold text-[#304035]">Paramètres du rendu</p>
              </div>

              {/* Type de rendu : intérieur / extérieur */}
              <ChipSelector<'interior' | 'exterior'>
                label="Type de rendu"
                accent="#8a6cc2"
                value={archMode}
                onChange={setArchMode}
                options={[
                  { value: 'interior', label: 'Intérieur', icon: Home },
                  { value: 'exterior', label: 'Extérieur', icon: Building2 },
                ]}
              />

              {/* Ambiance / consigne libre */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Ambiance & consigne <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                <input
                  value={archAmbiance}
                  onChange={e => setArchAmbiance(e.target.value)}
                  placeholder="Ex : lumière chaude du soir, ambiance cosy, photo professionnelle"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                />
                <p className="mt-1.5 text-[10px] text-[#304035]/45 leading-snug">Astuce fidélité : décrivez précisément les matériaux pour limiter les inventions de l'IA. Les contraintes anti-erreur (pas d'objets en trop, géométrie préservée) sont déjà appliquées automatiquement.</p>
              </div>

              {/* Option Haute résolution (4K) */}
              <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-[#8a6cc2]/15 bg-[#8a6cc2]/5 px-3.5 py-3 hover:bg-[#8a6cc2]/8 transition-colors">
                <input
                  type="checkbox"
                  checked={archHighRes}
                  onChange={e => setArchHighRes(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-[#8a6cc2]/40 text-[#8a6cc2] focus:ring-2 focus:ring-[#8a6cc2]/30"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#304035]">Haute résolution <span className="ml-1 text-[9px] text-[#8a6cc2] font-semibold">4K · +qq s</span></p>
                  <p className="text-[10px] text-[#304035]/55 leading-snug mt-0.5">Agrandit le rendu final en 4K. À activer pour le rendu présenté au client.</p>
                </div>
              </label>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Façades — toutes <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                <input
                  value={archFacades}
                  onChange={e => setArchFacades(e.target.value)}
                  placeholder="Ex : Chêne fumé mat, façade laquée blanche"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Chêne fumé mat', 'Noir laqué brillant', 'Blanc satiné', 'Vert sauge mat', 'Bleu nuit laqué'].map(s => (
                    <button key={s} onClick={() => setArchFacades(s)}
                      className="rounded-full border border-[#8a6cc2]/20 bg-[#8a6cc2]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#8a6cc2]/50 hover:bg-[#8a6cc2]/10 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {archMode === 'interior' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Meubles bas <span className="text-[#304035]/30 font-normal normal-case">(si différent)</span></p>
                    <input
                      value={archFacadesBas}
                      onChange={e => setArchFacadesBas(e.target.value)}
                      placeholder="Ex : Noyer clair"
                      className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Meubles hauts <span className="text-[#304035]/30 font-normal normal-case">(si différent)</span></p>
                    <input
                      value={archFacadesHaut}
                      onChange={e => setArchFacadesHaut(e.target.value)}
                      placeholder="Ex : Blanc mat"
                      className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                    />
                  </div>
                  <p className="sm:col-span-2 -mt-1 text-[10px] text-[#304035]/45 leading-snug">Remplissez ces deux champs pour distinguer bas et hauts (ex. bas noyer, hauts blancs). Laissez vides pour appliquer « Façades — toutes ».</p>
                </div>
              )}

              {archMode === 'interior' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Poignées <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <input
                    value={archPoignees}
                    onChange={e => setArchPoignees(e.target.value)}
                    placeholder="Ex : Laiton brossé, noir mat, inox"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Laiton brossé', 'Noir mat', 'Inox brossé', 'Chrome poli', 'Chêne', 'Sans poignée (gorge)'].map(s => (
                      <button key={s} onClick={() => setArchPoignees(s)}
                        className="rounded-full border border-[#8a6cc2]/20 bg-[#8a6cc2]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#8a6cc2]/50 hover:bg-[#8a6cc2]/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#304035]/45 leading-snug">Utile quand l’IA garde des poignées bois alors que vous voulez du métal.</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Plan de travail <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                <input
                  value={archPlan}
                  onChange={e => setArchPlan(e.target.value)}
                  placeholder="Ex : Marbre Calacatta blanc, Dekton gris, quartz noir"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Marbre blanc Calacatta', 'Dekton gris', 'Quartz noir', 'Pierre bleue', 'Granit anthracite'].map(s => (
                    <button key={s} onClick={() => setArchPlan(s)}
                      className="rounded-full border border-[#8a6cc2]/20 bg-[#8a6cc2]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#8a6cc2]/50 hover:bg-[#8a6cc2]/10 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-[#304035]/45 leading-snug">Décrivez précisément la matière (couleur + veinage) pour un rendu plus fidèle.</p>
              </div>

              {archMode === 'interior' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Crédence <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <input
                    value={archCredence}
                    onChange={e => setArchCredence(e.target.value)}
                    placeholder="Ex : Carrelage zellige blanc, inox, même matière que le plan"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Zellige blanc', 'Même pierre que le plan', 'Inox brossé', 'Carrelage métro', 'Verre laqué noir'].map(s => (
                      <button key={s} onClick={() => setArchCredence(s)}
                        className="rounded-full border border-[#8a6cc2]/20 bg-[#8a6cc2]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#8a6cc2]/50 hover:bg-[#8a6cc2]/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {archMode === 'interior' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Évier <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <input
                    value={archEvier}
                    onChange={e => setArchEvier(e.target.value)}
                    placeholder="Ex : Blanc céramique, noir composite, inox"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Blanc céramique', 'Noir composite', 'Gris anthracite', 'Inox', 'Beige sable'].map(s => (
                      <button key={s} onClick={() => setArchEvier(s)}
                        className="rounded-full border border-[#8a6cc2]/20 bg-[#8a6cc2]/5 px-2.5 py-1 text-[10px] text-[#304035]/65 hover:border-[#8a6cc2]/50 hover:bg-[#8a6cc2]/10 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#304035]/45 leading-snug">Utile quand l&apos;IA rend un évier blanc ou coloré en inox.</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Sol <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                <input
                  value={archSol}
                  onChange={e => setArchSol(e.target.value)}
                  placeholder="Ex : Parquet chêne contrecollé, carrelage grand format gris"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Murs <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                <input
                  value={archMurs}
                  onChange={e => setArchMurs(e.target.value)}
                  placeholder="Ex : Peinture mate blanche, lambris bois"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#8a6cc2]/25 transition-shadow"
                />
              </div>

              {archMode === 'interior' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50 mb-2">Type de plaque <span className="text-[#304035]/30 font-normal normal-case">(optionnel)</span></p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { key: '',          label: 'Non spécifié' },
                      { key: 'induction', label: 'Induction' },
                      { key: 'gas',       label: 'Gaz' },
                      { key: 'downdraft', label: 'Aspirante' },
                    ] as const).map(o => {
                      const active = archCooktop === o.key;
                      return (
                        <button key={o.key || 'none'} onClick={() => setArchCooktop(o.key)}
                          className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
                            active
                              ? 'border-[#8a6cc2] bg-[#8a6cc2]/10 text-[#6f54a8]'
                              : 'border-[#304035]/12 bg-[#f5eee8]/40 text-[#304035]/60 hover:border-[#8a6cc2]/40'
                          }`}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#304035]/45 leading-snug">Force le type de plaque : induction (surface lisse), gaz (brûleurs), ou aspirante (extraction centrale intégrée, sans hotte).</p>
                </div>
              )}
            </div>

            {/* Dossier + CTA */}
            <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
              <DossierPicker />
              <button onClick={runArchitect}
                disabled={archLoading || !archRefFile}
                title={!archRefFile ? 'Importez une image source (plan, rendu 3D, sketch ou photo)' : undefined}
                className="relative w-full overflow-hidden rounded-2xl py-4 font-black text-white shadow-lg hover:shadow-xl active:scale-[.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,#8a6cc2 0%,#6f54a8 100%)'}}>
                <span className="relative flex items-center justify-center gap-2.5 text-sm tracking-wide">
                  {archLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Génération du rendu…</>
                    : !archRefFile
                      ? <><FileImage className="h-4 w-4" />Importez d'abord une image source</>
                      : <><Building2 className="h-4 w-4" />Générer le rendu<ArrowRight className="h-4 w-4 ml-1" /></>
                  }
                </span>
              </button>
            </div>

            {/* Historique (½) + Galerie (½) côte à côte */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <HistoryPanel
                filterType="EDIT"
                accent="#8a6cc2"
                refreshTrigger={iaHistoryRefresh}
                onSelect={openHistoryJob}
              />
              <GalleryCard gallery={gallery} />
            </div>

          </div>
        )}

        {/* ══════════════════════════ MODULE COLORISTE IA+ */}
        {tab === 'coloriste-archi' && (
          <div className="fu space-y-6">

            <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
              {/* Photo de la cuisine */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 flex flex-col lg:min-h-[400px]">
                <div className="flex items-center gap-2 mb-1">
                  <Paintbrush className="h-4 w-4 text-[#2f9e8f]" />
                  <p className="font-bold text-[#304035]">Photo de la cuisine <span className="ml-1 rounded-full bg-[#2f9e8f]/10 text-[#2f9e8f] text-[9px] font-bold px-2 py-0.5 align-middle">REQUIS</span></p>
                </div>
                <p className="text-xs text-[#304035]/50 mb-2">Importez la photo, choisissez vos couleurs ci-dessous — l'IA recolorise la cuisine.</p>
                <Drop label="" sub="Déposez la photo de la cuisine"
                  onFile={setPhotoFile} file={photoFile} accent="#2f9e8f"
                  tips={['Photo de la cuisine existante', 'Showroom / catalogue', 'Bien éclairée et nette']} />
                {photoFile && photoURL && (
                  <div className="mt-3 relative rounded-xl overflow-hidden">
                    <Image src={photoURL} alt="Cuisine" width={500} height={176} loading="lazy" className="w-full max-h-44 object-cover" />
                    <button onClick={() => setPhotoFile(null)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Aperçu résultat */}
              <div className="space-y-4 lg:col-span-2">
                {colorArchError && !colorArchLoading && (
                  <div className="fu rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-700">Colorisation échouée</p>
                      <p className="text-xs text-red-600/80 mt-0.5 leading-relaxed">{colorArchError}</p>
                    </div>
                    <button onClick={() => setColorArchError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0"><X className="h-4 w-4" /></button>
                  </div>
                )}
                {colorArchLoading && (
                  <div className="fu rounded-2xl bg-white border border-[#304035]/8 shadow-md p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{background:'linear-gradient(135deg,#2f9e8f,#247a6f)'}}>
                        <Paintbrush className="h-6 w-6 text-white sh" />
                      </div>
                      <div>
                        <p className="font-black text-[#304035]">Coloriste IA+ en action</p>
                        <p className="text-xs text-[#304035]/50 mt-0.5">Recolorisation…</p>
                      </div>
                    </div>
                    <ProgressBar steps={LOADING_STEPS_COLOR} color="#2f9e8f" />
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#2f9e8f]/8 border border-[#2f9e8f]/15 px-3 py-2.5">
                      <p className="text-[11px] leading-snug text-[#304035]/70">Recolorisation en général <b className="text-[#304035]">15 à 40 s</b>. <b className="text-[#304035]">Ne ferme pas la page</b>.</p>
                      <span className="shrink-0 font-mono text-base font-black tabular-nums" style={{color:'#2f9e8f'}}><ElapsedTimer /></span>
                    </div>
                  </div>
                )}
                {colorArchResult && !colorArchLoading && (
                  <ResultCard item={colorArchResult} accentColor="#2f9e8f" icon={Paintbrush} onSave={saveColoristeArchi} onRegenerate={runColoristeArchi} />
                )}
                {!colorArchLoading && !colorArchResult && (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#2f9e8f]/20 bg-gradient-to-br from-[#2f9e8f]/5 to-white p-12 text-center lg:min-h-[400px]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-[#2f9e8f]/10"><Paintbrush className="h-7 w-7 text-[#2f9e8f]/60" /></div>
                    <p className="font-bold text-[#304035] mb-1.5">Votre colorisation apparaîtra ici</p>
                    <p className="text-xs text-[#304035]/50 leading-relaxed">Importez une photo, choisissez les couleurs et lancez la colorisation.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Palettes + couleurs */}
            <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
              <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-[#2f9e8f]" /><p className="font-bold text-[#304035]">Palettes & couleurs</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESETS.map(pr => (
                  <PresetCard key={pr.name} p={pr} active={preset?.name === pr.name} onClick={() => applyPreset(pr)} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Façades',        val: facadeCol,  set: setFacadeCol },
                  { label: 'Poignées',       val: poigneeCol, set: setPoigneeCol },
                  { label: 'Plan de travail',val: planCol,    set: setPlanCol },
                ] as const).map(({ label, val, set }) => (
                  <label key={label} className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50">{label}</span>
                    <span className="flex items-center gap-2 rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-2.5 py-2">
                      <input type="color" value={val} onChange={e => { set(e.target.value); setPreset(null); setColorsModified(true); }} className="h-7 w-9 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <span className="text-xs font-mono text-[#304035]/70">{val}</span>
                    </span>
                  </label>
                ))}
              </div>
              <ChipSelector<FinishType>
                label="Finition des façades" accent="#2f9e8f"
                value={facadeFinish} onChange={(v) => { setFacadeFinish(v); }}
                options={[
                  { value: 'mat', label: 'Mat' }, { value: 'satiné', label: 'Satiné' },
                  { value: 'brillant', label: 'Brillant' }, { value: 'brossé', label: 'Brossé' },
                  { value: 'bois', label: 'Bois' },
                ]}
              />
              <ChipSelector<LightingType>
                label="Éclairage" accent="#2f9e8f"
                value={colorLight} onChange={(v) => { setColorLight(v); }}
                options={[
                  { value: 'naturelle', label: 'Naturelle', icon: Sun },
                  { value: 'spots', label: 'Spots', icon: Lamp },
                  { value: 'mixte', label: 'Mixte', icon: Monitor },
                ]}
              />
            </div>

            {/* Dossier + CTA */}
            <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
              <DossierPicker />
              <button onClick={runColoristeArchi}
                disabled={colorArchLoading || !photoFile}
                title={!photoFile ? 'Importez la photo de la cuisine' : undefined}
                className="relative w-full overflow-hidden rounded-2xl py-4 font-black text-white shadow-lg hover:shadow-xl active:scale-[.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,#2f9e8f 0%,#247a6f 100%)'}}>
                <span className="relative flex items-center justify-center gap-2.5 text-sm tracking-wide">
                  {colorArchLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Colorisation…</>
                    : !photoFile
                      ? <><FileImage className="h-4 w-4" />Importez d'abord la photo</>
                      : <><Paintbrush className="h-4 w-4" />Coloriser<ArrowRight className="h-4 w-4 ml-1" /></>
                  }
                </span>
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <HistoryPanel filterType="COLOR_VARIATION" accent="#2f9e8f" refreshTrigger={iaHistoryRefresh} onSelect={openHistoryJob} />
              <GalleryCard gallery={gallery} />
            </div>

          </div>
        )}

        {tab === 'coloriste-tex' && (
          <div className="fu space-y-6">

            <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
              {/* Photo de la cuisine */}
              <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 flex flex-col lg:min-h-[400px]">
                <div className="flex items-center gap-2 mb-1">
                  <Paintbrush className="h-4 w-4 text-[#2f9e8f]" />
                  <p className="font-bold text-[#304035]">Photo de la cuisine <span className="ml-1 rounded-full bg-[#2f9e8f]/10 text-[#2f9e8f] text-[9px] font-bold px-2 py-0.5 align-middle">REQUIS</span></p>
                </div>
                <p className="text-xs text-[#304035]/50 mb-2">Importez la photo, choisissez vos couleurs — l'IA recolorise en préservant la géométrie.</p>
                <Drop label="" sub="Déposez la photo de la cuisine"
                  onFile={setPhotoFile} file={photoFile} accent="#2f9e8f"
                  tips={['Photo de la cuisine existante', 'Showroom / catalogue', 'Bien éclairée et nette']} />
                {photoFile && photoURL && (
                  <div className="mt-3 relative rounded-xl overflow-hidden">
                    <Image src={photoURL} alt="Cuisine" width={500} height={176} loading="lazy" className="w-full max-h-44 object-cover" />
                    <button onClick={() => setPhotoFile(null)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Aperçu résultat */}
              <div className="space-y-4 lg:col-span-2">
                {colorTexError && !colorTexLoading && (
                  <div className="fu rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-700">Colorisation échouée</p>
                      <p className="text-xs text-red-600/80 mt-0.5 leading-relaxed">{colorTexError}</p>
                    </div>
                    <button onClick={() => setColorTexError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0"><X className="h-4 w-4" /></button>
                  </div>
                )}
                {colorTexLoading && (
                  <div className="fu rounded-2xl bg-white border border-[#304035]/8 shadow-md p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{background:'linear-gradient(135deg,#2f9e8f,#247a6f)'}}>
                        <Paintbrush className="h-6 w-6 text-white sh" />
                      </div>
                      <div>
                        <p className="font-black text-[#304035]">Coloriste ✨ en action</p>
                        <p className="text-xs text-[#304035]/50 mt-0.5">Recolorisation (géométrie préservée)…</p>
                      </div>
                    </div>
                    <ProgressBar steps={LOADING_STEPS_COLOR} color="#2f9e8f" />
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#2f9e8f]/8 border border-[#2f9e8f]/15 px-3 py-2.5">
                      <p className="text-[11px] leading-snug text-[#304035]/70">Recolorisation en général <b className="text-[#304035]">10 à 30 s</b>. <b className="text-[#304035]">Ne ferme pas la page</b>.</p>
                      <span className="shrink-0 font-mono text-base font-black tabular-nums" style={{color:'#2f9e8f'}}><ElapsedTimer /></span>
                    </div>
                  </div>
                )}
                {colorTexResult && !colorTexLoading && (
                  <ResultCard item={colorTexResult} accentColor="#2f9e8f" icon={Paintbrush} onSave={saveColoristeTextures} onRegenerate={runColoristeTextures} />
                )}
                {!colorTexLoading && !colorTexResult && (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#2f9e8f]/20 bg-gradient-to-br from-[#2f9e8f]/5 to-white p-12 text-center lg:min-h-[400px]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-[#2f9e8f]/10"><Paintbrush className="h-7 w-7 text-[#2f9e8f]/60" /></div>
                    <p className="font-bold text-[#304035] mb-1.5">Votre colorisation apparaîtra ici</p>
                    <p className="text-xs text-[#304035]/50 leading-relaxed">Importez une photo, choisissez les couleurs et lancez la colorisation.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Palettes + couleurs */}
            <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
              <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-[#2f9e8f]" /><p className="font-bold text-[#304035]">Palettes & couleurs</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESETS.map(pr => (
                  <PresetCard key={pr.name} p={pr} active={preset?.name === pr.name} onClick={() => applyPreset(pr)} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Façades',        val: facadeCol,  set: setFacadeCol },
                  { label: 'Poignées',       val: poigneeCol, set: setPoigneeCol },
                  { label: 'Plan de travail',val: planCol,    set: setPlanCol },
                ] as const).map(({ label, val, set }) => (
                  <label key={label} className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#304035]/50">{label}</span>
                    <span className="flex items-center gap-2 rounded-xl border border-[#304035]/12 bg-[#f5eee8]/40 px-2.5 py-2">
                      <input type="color" value={val} onChange={e => { set(e.target.value); setPreset(null); setColorsModified(true); }} className="h-7 w-9 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <span className="text-xs font-mono text-[#304035]/70">{val}</span>
                    </span>
                  </label>
                ))}
              </div>
              <ChipSelector<FinishType>
                label="Finition des façades" accent="#2f9e8f"
                value={facadeFinish} onChange={(v) => { setFacadeFinish(v); }}
                options={[
                  { value: 'mat', label: 'Mat' }, { value: 'satiné', label: 'Satiné' },
                  { value: 'brillant', label: 'Brillant' }, { value: 'brossé', label: 'Brossé' },
                  { value: 'bois', label: 'Bois' },
                ]}
              />
              <ChipSelector<LightingType>
                label="Éclairage" accent="#2f9e8f"
                value={colorLight} onChange={(v) => { setColorLight(v); }}
                options={[
                  { value: 'naturelle', label: 'Naturelle', icon: Sun },
                  { value: 'spots', label: 'Spots', icon: Lamp },
                  { value: 'mixte', label: 'Mixte', icon: Monitor },
                ]}
              />
            </div>

            {/* Dossier + CTA */}
            <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-md p-5 space-y-4">
              <DossierPicker />
              <button onClick={runColoristeTextures}
                disabled={colorTexLoading || !photoFile}
                title={!photoFile ? 'Importez la photo de la cuisine' : undefined}
                className="relative w-full overflow-hidden rounded-2xl py-4 font-black text-white shadow-lg hover:shadow-xl active:scale-[.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,#2f9e8f 0%,#247a6f 100%)'}}>
                <span className="relative flex items-center justify-center gap-2.5 text-sm tracking-wide">
                  {colorTexLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Colorisation…</>
                    : !photoFile
                      ? <><FileImage className="h-4 w-4" />Importez d'abord la photo</>
                      : <><Paintbrush className="h-4 w-4" />Coloriser<ArrowRight className="h-4 w-4 ml-1" /></>
                  }
                </span>
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <HistoryPanel filterType="COLOR_VARIATION" accent="#2f9e8f" refreshTrigger={iaHistoryRefresh} onSelect={openHistoryJob} />
              <GalleryCard gallery={gallery} />
            </div>

          </div>
        )}

        {/* Galerie déplacée dans chaque module (côte à côte avec l'historique)
            via <GalleryCard/> — voir le bas des onglets Coloriste et Rendu. */}

      </div>

      {/* ── Modale : sauvegarder le visuel dans le(s) sous-dossier(s) choisi(s) ── */}
      {saveTarget && (() => {
        const sd = allDossiers.find(d => d.id === saveDossierId);
        const subs = (sd?.subfolders ?? []).map(sf => sf.label);
        const options = Array.from(new Set([IA_SUBFOLDER_LABEL, ...subs]));
        const toggle = (label: string) => setSaveSubfolders(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
        return (
          <div onClick={() => setSaveTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(26,42,30,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 24px 60px rgba(0,0,0,0.3)', maxHeight: '88vh', overflow: 'auto' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#1a2a1e' }}>Sauvegarder le visuel</h3>
              <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#6b6256' }}>Choisis le dossier et le ou les sous-dossiers où enregistrer le rendu.</p>
              {saveTarget.item.imageUrl && (
                <img src={saveTarget.item.imageUrl} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
              )}
              <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(48,64,53,0.5)', marginBottom: 6 }}>Dossier</label>
              <select value={saveDossierId} onChange={(e) => { setSaveDossierId(e.target.value); setSaveSubfolders([IA_SUBFOLDER_LABEL]); }}
                style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(48,64,53,0.18)', padding: '9px 12px', fontSize: 13.5, color: '#1a2a1e', background: '#fff', marginBottom: 16 }}>
                {allDossiers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(48,64,53,0.5)', marginBottom: 6 }}>Sous-dossier(s) — coche un ou plusieurs</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflow: 'auto', border: '1px solid rgba(48,64,53,0.1)', borderRadius: 10, padding: 8, marginBottom: 18 }}>
                {options.map(label => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', background: saveSubfolders.includes(label) ? 'rgba(166,119,73,0.10)' : 'transparent' }}>
                    <input type="checkbox" checked={saveSubfolders.includes(label)} onChange={() => toggle(label)} />
                    <span style={{ fontSize: 13, color: '#22281f' }}>{label}{label === IA_SUBFOLDER_LABEL ? ' (par défaut)' : ''}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={confirmSave} disabled={saveSubfolders.length === 0}
                  style={{ flex: 1, borderRadius: 11, border: 'none', padding: '11px', fontWeight: 800, fontSize: 13.5, color: '#fff', cursor: saveSubfolders.length ? 'pointer' : 'not-allowed', background: saveSubfolders.length ? 'linear-gradient(135deg,#1a2a1e,#3D5449)' : 'rgba(48,64,53,0.3)' }}>
                  Sauvegarder{saveSubfolders.length > 1 ? ` (${saveSubfolders.length})` : ''}
                </button>
                <button onClick={() => setSaveTarget(null)}
                  style={{ flex: 1, borderRadius: 11, border: '1px solid rgba(48,64,53,0.2)', padding: '11px', fontWeight: 700, fontSize: 13.5, color: '#1a2a1e', background: '#fff', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
