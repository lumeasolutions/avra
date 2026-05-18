/**
 * ──────────────────────────────────────────────────────────────
 *  AVRA IA Studio — Client fal.ai (refonte SDK 18/05/2026)
 *
 *  Avant : 300 lignes de client REST fait main (upload 2-step,
 *  submit + polling, retries 3 niveaux). Result : timeouts à 250s
 *  systématiquement alors que le playground marchait en 1.71s.
 *
 *  Maintenant : on utilise le SDK officiel `@fal-ai/client` qui
 *  gère pour nous :
 *   - Auth (FAL_KEY → header)
 *   - Upload (fal.storage.upload)
 *   - Submit + polling (fal.subscribe)
 *   - Retries internes raisonnables
 *
 *  3 modes :
 *   - Coloriste img2img sans textures → fal-ai/flux/dev/image-to-image
 *   - Coloriste img2img avec textures → fal-ai/flux-pro/kontext/multi
 *   - Rendu réaliste text-to-image    → fal-ai/flux-pro/v1.1-ultra
 * ──────────────────────────────────────────────────────────────
 */

import { fal } from '@fal-ai/client';
import {
  buildColoristPrompt,
  buildKontextColoristPrompt,
  buildRenduPrompt,
  ColoristParams,
  RenduParams,
  BuiltPrompt,
  KontextImageRefs,
} from './prompt-builder';

// ─────────────────────────────────────────── CONFIG SDK

const FLUX_MODEL_RENDU            = 'fal-ai/flux-pro/v1.1-ultra';
const FLUX_MODEL_COLORISTE_I2I    = 'fal-ai/flux/dev/image-to-image';
const FLUX_MODEL_KONTEXT_SINGLE   = 'fal-ai/flux-pro/kontext';
const FLUX_MODEL_KONTEXT_MULTI    = 'fal-ai/flux-pro/kontext/multi';

let isConfigured = false;
function ensureConfigured() {
  if (isConfigured) return;
  const credentials = process.env.FAL_KEY;
  if (!credentials) throw new Error('FAL_KEY manquante dans les variables d\'environnement');
  fal.config({ credentials });
  isConfigured = true;
}

// ─────────────────────────────────────────── TYPES

export interface GenerationResult {
  success:    boolean;
  imageUrl:   string | null;
  imageUrls:  string[];
  prompt:     BuiltPrompt;
  attempts:   number;
  durationMs: number;
  error?:     string;
}

// ─────────────────────────────────────────── HELPERS

/** Convertit un data URI base64 en Blob pour le SDK */
function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Format data URI invalide');
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  // Node Buffer est compatible Uint8Array — Blob l'accepte
  return new Blob([buffer], { type: mime });
}

/**
 * Si l'input est déjà une URL https, on la passe directement.
 * Si c'est un data URI, on l'upload via fal.storage (le SDK gère le
 * 2-step upload et l'auth pour nous).
 */
export async function ensureHttpsUrl(input: string): Promise<string> {
  if (input.startsWith('https://') || input.startsWith('http://')) return input;
  if (input.startsWith('data:')) {
    ensureConfigured();
    const blob = dataUrlToBlob(input);
    const t0 = Date.now();
    const url = await fal.storage.upload(blob);
    console.log(`[fal.storage] upload OK en ${Date.now() - t0}ms → ${url}`);
    return url;
  }
  throw new Error('URL d\'image invalide (attendu: https:// ou data:<mime>;base64,...)');
}

/** Extrait les URLs d'image depuis la réponse du SDK */
function extractImageUrls(data: unknown): string[] {
  const d = data as { images?: Array<{ url?: string }>; image?: { url?: string } };
  if (Array.isArray(d?.images) && d.images.length > 0) {
    return d.images.map(i => i?.url).filter((u): u is string => typeof u === 'string');
  }
  if (d?.image?.url) return [d.image.url];
  return [];
}

// ─────────────────────────────────────────── COLORISTE IMG2IMG (Flux Dev)

/**
 * Coloriste sans textures : Flux Dev image-to-image dédié.
 * ~5-15s en moyenne, $0.025 / image.
 */
export async function generateColoristImage(
  params: ColoristParams,
  sourceImageUrl: string,
  numImages: number = 1,
): Promise<GenerationResult> {
  ensureConfigured();
  const tStart = Date.now();
  const built = buildColoristPrompt(params, 'standard');

  try {
    console.log(`[fal.subscribe] ${FLUX_MODEL_COLORISTE_I2I} promptLen=${built.prompt.length}`);
    const result = await fal.subscribe(FLUX_MODEL_COLORISTE_I2I, {
      input: {
        image_url:  sourceImageUrl,
        prompt:     built.prompt,
        strength:   0.85,
        num_images: Math.min(Math.max(numImages, 1), 4),
        seed:       built.seed,
        output_format: 'jpeg',
      },
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    console.log(`[fal.subscribe] ${FLUX_MODEL_COLORISTE_I2I} OK en ${Date.now() - tStart}ms (${urls.length} URL)`);
    return {
      success:    urls.length > 0,
      imageUrl:   urls[0] ?? null,
      imageUrls:  urls,
      prompt:     built,
      attempts:   1,
      durationMs: Date.now() - tStart,
      error:      urls.length === 0 ? 'fal.ai n\'a pas retourné d\'image' : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[fal.subscribe] ${FLUX_MODEL_COLORISTE_I2I} ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
    return {
      success:    false,
      imageUrl:   null,
      imageUrls:  [],
      prompt:     built,
      attempts:   1,
      durationMs: Date.now() - tStart,
      error:      message,
    };
  }
}

// ─────────────────────────────────────────── COLORISTE KONTEXT (avec textures)

/**
 * Coloriste avec textures uploadées : Kontext (single ou multi selon nb d'images).
 * Plus lent (~30-60s) mais comprend les références visuelles.
 */
export async function generateColoristImageKontext(
  params: ColoristParams,
  sourceKitchenUrl: string,
  textureUrls: { facade?: string; poignee?: string; plan?: string },
  numImages: number = 1,
): Promise<GenerationResult> {
  ensureConfigured();
  const tStart = Date.now();

  const imageUrls: string[] = [sourceKitchenUrl];
  const refs: KontextImageRefs = {
    hasFacadeTexture:  !!textureUrls.facade,
    hasPoigneeTexture: !!textureUrls.poignee,
    hasPlanTexture:    !!textureUrls.plan,
  };
  if (textureUrls.facade)  imageUrls.push(textureUrls.facade);
  if (textureUrls.poignee) imageUrls.push(textureUrls.poignee);
  if (textureUrls.plan)    imageUrls.push(textureUrls.plan);

  const built  = buildKontextColoristPrompt(params, refs, 'standard');
  const isSingle = imageUrls.length === 1;
  const model = isSingle ? FLUX_MODEL_KONTEXT_SINGLE : FLUX_MODEL_KONTEXT_MULTI;

  try {
    console.log(`[fal.subscribe] ${model} images=${imageUrls.length}`);
    const input: Record<string, unknown> = {
      prompt:        built.prompt,
      num_images:    Math.min(Math.max(numImages, 1), 4),
      seed:          built.seed,
      output_format: 'jpeg',
      aspect_ratio:  '16:9',
    };
    if (isSingle) input.image_url = imageUrls[0];
    else          input.image_urls = imageUrls;

    // Le SDK type les inputs strictement par modèle (FluxKontextInput vs
    // FluxKontextMultiInput). On a un union legitime à runtime selon
    // isSingle, donc on cast — c'est plus propre que de dupliquer le code.
    const result = await fal.subscribe(model, { input: input as never, logs: false });
    const urls = extractImageUrls(result.data);
    console.log(`[fal.subscribe] ${model} OK en ${Date.now() - tStart}ms (${urls.length} URL)`);
    return {
      success:    urls.length > 0,
      imageUrl:   urls[0] ?? null,
      imageUrls:  urls,
      prompt:     built,
      attempts:   1,
      durationMs: Date.now() - tStart,
      error:      urls.length === 0 ? 'fal.ai n\'a pas retourné d\'image' : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[fal.subscribe] ${model} ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
    return {
      success:    false,
      imageUrl:   null,
      imageUrls:  [],
      prompt:     built,
      attempts:   1,
      durationMs: Date.now() - tStart,
      error:      message,
    };
  }
}

// ─────────────────────────────────────────── RENDU RÉALISTE (Flux Pro Ultra)

/**
 * Rendu réaliste text-to-image (sans photo source).
 * Flux Pro Ultra : qualité maximale, ~10-20s, $0.06 / image.
 */
export async function generateRenduImage(
  params: RenduParams,
  numImages: number = 1,
): Promise<GenerationResult> {
  ensureConfigured();
  const tStart = Date.now();
  const built = buildRenduPrompt(params, 'standard');

  try {
    console.log(`[fal.subscribe] ${FLUX_MODEL_RENDU} text2img promptLen=${built.prompt.length}`);
    // Flux Pro Ultra n'accepte pas `negative_prompt` (contrairement à Flux Pro
    // standard) — le SDK type le refuse. Le NEGATIVE_PROMPT du prompt-builder
    // est conservé pour les autres modèles ou un futur switch.
    const result = await fal.subscribe(FLUX_MODEL_RENDU, {
      input: {
        prompt:           built.prompt,
        num_images:       Math.min(Math.max(numImages, 1), 4),
        seed:             built.seed,
        output_format:    'jpeg',
        aspect_ratio:     '16:9',
        safety_tolerance: '2',
      },
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    console.log(`[fal.subscribe] ${FLUX_MODEL_RENDU} OK en ${Date.now() - tStart}ms (${urls.length} URL)`);
    return {
      success:    urls.length > 0,
      imageUrl:   urls[0] ?? null,
      imageUrls:  urls,
      prompt:     built,
      attempts:   1,
      durationMs: Date.now() - tStart,
      error:      urls.length === 0 ? 'fal.ai n\'a pas retourné d\'image' : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[fal.subscribe] ${FLUX_MODEL_RENDU} ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
    return {
      success:    false,
      imageUrl:   null,
      imageUrls:  [],
      prompt:     built,
      attempts:   1,
      durationMs: Date.now() - tStart,
      error:      message,
    };
  }
}

// ─────────────────────────────────────────── HELPERS PUBLICS

export function estimateCost(module: 'coloriste' | 'rendu'): string {
  return module === 'coloriste' ? '~0,05 €' : '~0,06 €';
}

export function estimateDuration(module: 'coloriste' | 'rendu'): string {
  return module === 'coloriste' ? '10–20 sec' : '10–20 sec';
}
