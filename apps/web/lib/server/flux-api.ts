/**
 * ──────────────────────────────────────────────────────────────
 *  AVRA IA Studio — Flux API Client
 *  Appel REST natif vers fal.ai (sans SDK externe)
 *  Système de retry intelligent sur 3 niveaux de prompt
 *  Zéro dépendance supplémentaire — FAL_KEY dans .env.local
 * ──────────────────────────────────────────────────────────────
 *
 *  Modèles utilisés :
 *  - Rendu réaliste  : fal-ai/flux-pro/v1.1-ultra  (meilleure qualité)
 *  - Coloriste       : fal-ai/flux/dev              (img2img, rapide)
 *
 *  Variable d'env requise : FAL_KEY (dans .env.local)
 * ──────────────────────────────────────────────────────────────
 */

import {
  buildColoristPrompt,
  buildKontextColoristPrompt,
  buildRenduPrompt,
  getBestFallback,
  ColoristParams,
  RenduParams,
  BuiltPrompt,
  KontextImageRefs,
} from './prompt-builder';

// ─────────────────────────────────────────── TYPES

export interface GenerationResult {
  success:   boolean;
  imageUrl:  string | null;
  imageUrls: string[];
  prompt:    BuiltPrompt;
  attempts:  number;
  durationMs:number;
  error?:    string;
}

export interface FluxInput {
  prompt:           string;
  negative_prompt?: string;
  num_images:       number;
  image_size:       string;
  output_format:    string;
  seed:             number;
  safety_tolerance?: number;
  image_url?:       string;
  strength?:        number;
}

// ─────────────────────────────────────────── CONFIG

const FLUX_MODEL_RENDU            = 'fal-ai/flux-pro/v1.1-ultra';
const FLUX_MODEL_COLORISTE        = 'fal-ai/flux/dev'; // legacy, plus utilisé
const FLUX_MODEL_KONTEXT_MULTI    = 'fal-ai/flux-pro/kontext/max/multi';

// Timeouts ajustés pour rester sous la limite Vercel Pro (300s par fonction
// serverless). Budget cible :
//   - 1ère tentative : 90s max (polling jusqu'à 80s + marge réseau)
//   - 2ème tentative : 90s max
//   - Total worst-case : ~180s, + upload + Supabase copy = ~220s
// On garde 80s de marge avant que Vercel ne kill la fonction (504).
const MAX_ATTEMPTS        = 2;       // 1 retry au lieu de 2 (le 3ème ne sauve quasi jamais)
const TIMEOUT_MS          = 90_000;  // 90s max par tentative (avant: 120s)
const POLL_INTERVAL_MS    = 2_000;   // sonde le résultat toutes les 2s
const POLL_MAX_ATTEMPTS   = 40;      // 40 × 2s = 80s max de polling (avant: 120s)

// ─────────────────────────────────────────── FAL API CLIENT

/**
 * Soumet une génération à fal.ai (mode asynchrone) et retourne l'imageUrl.
 * Gestion complète : submit → poll → extract.
 */
async function callFalApi(model: string, input: Record<string, unknown>): Promise<string[]> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error('FAL_KEY manquante dans les variables d\'environnement');
  }

  const headers = {
    'Authorization': `Key ${falKey}`,
    'Content-Type':  'application/json',
  };

  // ── 1. Soumettre la génération ───────────────────────────────
  const submitRes = await fetch(`https://queue.fal.run/${model}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ input }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => 'unknown');
    throw new Error(`FAL submit error ${submitRes.status}: ${errText}`);
  }

  const submitData = (await submitRes.json()) as {
    request_id?: string;
    status?:     string;
    images?:     Array<{ url: string }>;
    image?:      { url: string };
  };

  // Si sync_mode=true était actif, l'image peut être directement dans la réponse
  const directUrls = extractUrls(submitData);
  if (directUrls.length) return directUrls;

  const requestId = submitData.request_id;
  if (!requestId) {
    throw new Error('FAL: pas de request_id dans la réponse de soumission');
  }

  // ── 2. Polling du résultat ───────────────────────────────────
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(
      `https://queue.fal.run/${model}/requests/${requestId}`,
      { headers }
    );

    if (!pollRes.ok) {
      // Erreur temporaire — on continue à sonder
      continue;
    }

    const pollData = (await pollRes.json()) as {
      status?:  string;
      images?:  Array<{ url: string }>;
      image?:   { url: string };
      url?:     string;
      error?:   string;
    };

    if (pollData.status === 'FAILED' || pollData.error) {
      throw new Error(`FAL generation failed: ${pollData.error ?? 'unknown'}`);
    }

    const urls = extractUrls(pollData);
    if (urls.length) return urls;

    // status 'IN_PROGRESS' ou 'IN_QUEUE' → on continue
  }

  throw new Error(`FAL timeout: aucun résultat après ${POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/** Extrait toutes les URLs d'image (1-4) depuis les différents formats de réponse FAL */
function extractUrls(data: any): string[] {
  if (Array.isArray(data?.images) && data.images.length) {
    return data.images.map((i: any) => i?.url).filter(Boolean);
  }
  if (data?.image?.url) return [data.image.url];
  if (data?.url)        return [data.url];
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────── FAL STORAGE UPLOAD
// Flux Kontext et la plupart des modèles fal.ai préfèrent des URLs HTTPS
// publiques. Les data URIs peuvent fonctionner sur certains modèles mais :
// - elles gonflent le payload Vercel (4,5 Mo max par requête en plan Pro)
// - elles ne sont pas garanties par Kontext
// Solution : on upload chaque image vers fal-cdn-v3 et on récupère une URL
// HTTPS éphémère qu'on passe à Kontext. Process en 2 étapes :
//   1) POST /storage/upload/initiate → { upload_url, file_url }
//   2) PUT {upload_url} avec le binaire → renvoie 200
// On utilise ensuite file_url dans image_urls[].

const FAL_REST_API_URL = 'https://rest.alpha.fal.ai';

interface FalUploadInitiateResponse {
  upload_url: string;
  file_url:   string;
}

/**
 * Upload un fichier (data URI base64) vers fal-cdn-v3 et renvoie l'URL HTTPS.
 * Pour les data URIs uniquement — si l'entrée est déjà une https URL, voir
 * `ensureHttpsUrl` qui passe directement.
 *
 * @param dataUrl  data URI au format "data:image/jpeg;base64,..."
 * @returns URL HTTPS publique éphémère
 */
async function uploadToFalStorage(dataUrl: string): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error('FAL_KEY manquante');

  // Parse "data:<mime>;base64,<payload>"
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Format data URI invalide (attendu: data:<mime>;base64,...)');
  const contentType = match[1];
  const base64Body  = match[2];
  const binary      = Buffer.from(base64Body, 'base64');

  const ext = contentType.split('/')[1]?.split('+')[0] ?? 'bin';
  const filename = `avra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const t0 = Date.now();

  // 1) Initiate
  const initRes = await fetch(
    `${FAL_REST_API_URL}/storage/upload/initiate?storage_type=fal-cdn-v3`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ content_type: contentType, file_name: filename }),
    },
  );
  if (!initRes.ok) {
    const errText = await initRes.text().catch(() => 'unknown');
    throw new Error(`Fal storage initiate ${initRes.status}: ${errText}`);
  }
  const init = (await initRes.json()) as FalUploadInitiateResponse;
  if (!init.upload_url || !init.file_url) {
    throw new Error('Fal storage initiate: upload_url/file_url manquant dans la réponse');
  }

  // 2) PUT le binaire vers l'URL signée
  const putRes = await fetch(init.upload_url, {
    method:  'PUT',
    headers: { 'Content-Type': contentType },
    body:    binary,
  });
  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => 'unknown');
    throw new Error(`Fal storage PUT ${putRes.status}: ${errText}`);
  }

  console.log(`[FAL storage] upload ${filename} (${(binary.length / 1024).toFixed(0)} Ko) en ${Date.now() - t0}ms → ${init.file_url}`);
  return init.file_url;
}

/**
 * Si `input` est déjà une URL https://, on la passe directe.
 * Si c'est un data URI, on l'upload vers fal storage et on renvoie l'URL HTTPS.
 * Tout autre format = erreur.
 */
export async function ensureHttpsUrl(input: string): Promise<string> {
  if (input.startsWith('https://') || input.startsWith('http://')) return input;
  if (input.startsWith('data:')) return uploadToFalStorage(input);
  throw new Error('URL d\'image invalide (attendu: https:// ou data:<mime>;base64,...)');
}

// ─────────────────────────────────────────── CORE ENGINE

async function callFlux(
  built: BuiltPrompt,
  model: string,
  sourceImageUrl?: string,
  numImages: number = 1,
): Promise<string[]> {
  const input: FluxInput = {
    prompt:           built.prompt,
    negative_prompt:  built.negative,
    num_images:       Math.min(Math.max(numImages, 1), 4),
    image_size:       'landscape_16_9',
    output_format:    'jpeg',
    seed:             built.seed,
    safety_tolerance: 2,
  };
  if (sourceImageUrl) {
    input.image_url = sourceImageUrl;
    input.strength = 0.85;
  }

  return callFalApi(model, input as unknown as Record<string, unknown>);
}

// ─────────────────────────────────────────── RETRY ENGINE

async function generateWithRetry(
  levels: Array<'standard' | 'simplified' | 'minimal'>,
  buildPrompt: (level: 'standard' | 'simplified' | 'minimal') => BuiltPrompt,
  fallbackPrompt: BuiltPrompt,
  model: string,
  startTime: number,
  sourceImageUrl?: string,
  numImages: number = 1,
): Promise<GenerationResult> {
  let attempts   = 0;
  let lastError  = '';

  for (const level of levels) {
    attempts++;
    const built = buildPrompt(level);

    try {
      const imageUrls = await Promise.race([
        callFlux(built, model, sourceImageUrl, numImages),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout dépassé')), TIMEOUT_MS)
        ),
      ]);

      return {
        success:    true,
        imageUrl:   imageUrls[0] ?? null,
        imageUrls,
        prompt:     built,
        attempts,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[FAL] Tentative ${attempts} (${level}) échouée:`, lastError);
      if (attempts < MAX_ATTEMPTS) {
        await sleep(1000 * attempts);
      }
    }
  }

  // Fallback absolu — prompt validé manuellement
  attempts++;
  try {
    const imageUrls = await callFlux(fallbackPrompt, model, undefined, 1);
    return {
      success:    true,
      imageUrl:   imageUrls[0] ?? null,
      imageUrls,
      prompt:     fallbackPrompt,
      attempts,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success:    false,
      imageUrl:   null,
      imageUrls:  [],
      prompt:     fallbackPrompt,
      attempts,
      durationMs: Date.now() - startTime,
      error:      `Échec après ${attempts} tentatives. Dernière erreur: ${lastError}`,
    };
  }
}

// ─────────────────────────────────────────── KONTEXT MULTI ENGINE
// Flux Kontext Max Multi : édition image guidée par instructions + références.
// Contrairement à Flux Dev (1 seule image_url), Kontext accepte un tableau
// d'images via le champ `image_urls`. Convention AVRA :
//   image_urls[0] = photo cuisine source (obligatoire, c'est elle qu'on édite)
//   image_urls[1+] = échantillons textures importées par l'user

async function callKontextMulti(
  built: BuiltPrompt,
  imageUrls: string[],
  numImages: number = 1,
): Promise<string[]> {
  if (imageUrls.length === 0) {
    throw new Error('Kontext Multi: au moins une image (la photo source) est requise');
  }
  const input = {
    prompt:           built.prompt,
    image_urls:       imageUrls,
    num_images:       Math.min(Math.max(numImages, 1), 4),
    output_format:    'jpeg',
    seed:             built.seed,
    safety_tolerance: '2',
    aspect_ratio:     '16:9',
    guidance_scale:   3.5,
  };
  console.log(`[Kontext] callFal model=${FLUX_MODEL_KONTEXT_MULTI} level=${built.level} promptLen=${built.prompt.length} images=${imageUrls.length}`);
  const tStart = Date.now();
  try {
    const urls = await callFalApi(FLUX_MODEL_KONTEXT_MULTI, input);
    console.log(`[Kontext] fal OK en ${Date.now() - tStart}ms, ${urls.length} URL(s) retournée(s)`);
    return urls;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Kontext] fal ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
    throw err;
  }
}

/**
 * Retry engine spécifique Kontext : essaie standard → simplified → minimal,
 * tout en gardant les mêmes image_urls. Pas de fallback "from scratch" car
 * Kontext doit éditer la photo source — si toutes les tentatives échouent
 * on retourne l'erreur (l'utilisateur saura qu'il faut réessayer).
 */
async function generateKontextWithRetry(
  params: ColoristParams,
  refs: KontextImageRefs,
  imageUrls: string[],
  numImages: number,
): Promise<GenerationResult> {
  const startTime = Date.now();
  const levels: Array<'standard' | 'simplified' | 'minimal'> = ['standard', 'simplified', 'minimal'];
  let attempts = 0;
  let lastError = '';

  for (const level of levels) {
    attempts++;
    const built = buildKontextColoristPrompt(params, refs, level);
    try {
      const resultUrls = await Promise.race([
        callKontextMulti(built, imageUrls, numImages),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout dépassé')), TIMEOUT_MS)
        ),
      ]);
      return {
        success:    true,
        imageUrl:   resultUrls[0] ?? null,
        imageUrls:  resultUrls,
        prompt:     built,
        attempts,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[Kontext] Tentative ${attempts} (${level}) échouée:`, lastError);
      if (attempts < MAX_ATTEMPTS) await sleep(1000 * attempts);
    }
  }

  return {
    success:    false,
    imageUrl:   null,
    imageUrls:  [],
    prompt:     buildKontextColoristPrompt(params, refs, 'minimal'),
    attempts,
    durationMs: Date.now() - startTime,
    error:      `Échec après ${attempts} tentatives. Dernière erreur: ${lastError}`,
  };
}

// ─────────────────────────────────────────── EXPORTS PUBLICS

/**
 * Coloriste IA (nouvelle implémentation Kontext Multi).
 *
 * @param params           Paramètres couleurs/finitions/matériaux
 * @param sourceKitchenUrl Photo de cuisine de référence (data URL ou https) — OBLIGATOIRE
 * @param textureUrls      Textures par élément { facade?, poignee?, plan? } — toutes optionnelles
 * @param numImages        Nombre de variantes (1–4)
 */
export async function generateColoristImageKontext(
  params: ColoristParams,
  sourceKitchenUrl: string,
  textureUrls: { facade?: string; poignee?: string; plan?: string },
  numImages: number = 1,
): Promise<GenerationResult> {
  const t0 = Date.now();

  // Construction de la liste {input → kind} dans l'ordre fixe attendu par le prompt.
  // image_urls[0] = source kitchen, puis textures éventuelles (facade, poignee, plan).
  const refs: KontextImageRefs = {
    hasFacadeTexture:  !!textureUrls.facade,
    hasPoigneeTexture: !!textureUrls.poignee,
    hasPlanTexture:    !!textureUrls.plan,
  };
  const rawInputs: Array<{ url: string; kind: string }> = [
    { url: sourceKitchenUrl, kind: 'source' },
  ];
  if (textureUrls.facade)  rawInputs.push({ url: textureUrls.facade,  kind: 'texture-facade' });
  if (textureUrls.poignee) rawInputs.push({ url: textureUrls.poignee, kind: 'texture-poignee' });
  if (textureUrls.plan)    rawInputs.push({ url: textureUrls.plan,    kind: 'texture-plan' });

  // Conversion data URI → URL https en parallèle (upload fal-cdn-v3 pour chaque
  // image qui n'est pas déjà sur internet). Si une seule upload échoue, on
  // remonte l'erreur immédiatement — pas la peine de continuer.
  console.log(`[Kontext] préparation ${rawInputs.length} image(s) (${rawInputs.map(i => i.kind).join(', ')})`);
  let imageUrls: string[];
  try {
    imageUrls = await Promise.all(rawInputs.map(async ({ url, kind }) => {
      const tUp = Date.now();
      const httpsUrl = await ensureHttpsUrl(url);
      const isData = url.startsWith('data:');
      console.log(`[Kontext] ${kind} ${isData ? 'uploadée' : 'déjà https'} en ${Date.now() - tUp}ms`);
      return httpsUrl;
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Kontext] échec upload fal-cdn-v3:', message);
    return {
      success:    false,
      imageUrl:   null,
      imageUrls:  [],
      prompt:     buildKontextColoristPrompt(params, refs, 'minimal'),
      attempts:   0,
      durationMs: Date.now() - t0,
      error:      `Impossible d'uploader vos images vers fal.ai (${message}). Réessayez ou réduisez la taille.`,
    };
  }

  console.log(`[Kontext] génération start ${imageUrls.length} image(s), variants=${numImages}`);
  const result = await generateKontextWithRetry(params, refs, imageUrls, numImages);
  console.log(`[Kontext] génération end success=${result.success} attempts=${result.attempts} totalMs=${Date.now() - t0}`);
  return result;
}

/**
 * @deprecated remplacée par generateColoristImageKontext. Conservée temporairement
 * au cas où l'on veuille revenir à Flux Dev (moins cher, mais textures ignorées).
 */
export async function generateColoristImage(
  params: ColoristParams,
  sourceImageUrl?: string,
  numImages: number = 1,
): Promise<GenerationResult> {
  return generateWithRetry(
    ['standard', 'simplified', 'minimal'],
    (level) => buildColoristPrompt(params, level),
    getBestFallback(params),
    FLUX_MODEL_COLORISTE,
    Date.now(),
    sourceImageUrl,
    numImages,
  );
}

/**
 * Rendu réaliste IA — génère un visuel photoréaliste de cuisine.
 * Modèle : FLUX Pro 1.1 Ultra (text-to-image pur, ignore toute image source).
 * Pour utiliser une image de référence (ex: plan WinnerFlex), il faut basculer
 * sur un modèle ControlNet ou Kontext — pas le cas ici.
 */
export async function generateRenduImage(
  params: RenduParams,
  numImages: number = 1,
): Promise<GenerationResult> {
  return generateWithRetry(
    ['standard', 'simplified', 'minimal'],
    (level) => buildRenduPrompt(params, level),
    getBestFallback(params),
    FLUX_MODEL_RENDU,
    Date.now(),
    undefined,
    numImages,
  );
}

// ─────────────────────────────────────────── HELPERS

/** Estime le coût d'une génération en € */
export function estimateCost(module: 'coloriste' | 'rendu'): string {
  const usd = module === 'coloriste' ? 0.04 : 0.06;
  return `~${(usd * 0.93).toFixed(2)} €`;
}

/** Estime la durée de génération en secondes */
export function estimateDuration(module: 'coloriste' | 'rendu'): string {
  return module === 'coloriste' ? '5–10 sec' : '10–20 sec';
}
