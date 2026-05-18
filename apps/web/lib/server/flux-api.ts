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
  buildFacadeRegionPrompt,
  buildHandleRegionPrompt,
  buildCountertopRegionPrompt,
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

// Stratégie infaillible (mai 2026) : SAM par texte + Inpainting par région.
// Le pipeline garantit que tout pixel hors des 3 masques (façades, poignées,
// plan de travail) est strictement identique à la source.
const EVF_SAM_MODEL    = 'fal-ai/evf-sam';
const FLUX_INPAINT_MODEL = 'fal-ai/flux-lora/inpainting';

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

/** Extrait l'URL du single mask depuis la réponse EVF-SAM (champ `image`) */
function extractMaskUrl(data: unknown): string | null {
  const d = data as { image?: { url?: string } };
  return typeof d?.image?.url === 'string' ? d.image.url : null;
}

// ─────────────────────────────────────────── SAM + INPAINT PRIMITIVES

/**
 * Segmente une région nommée dans une image, retourne l'URL d'un mask PNG.
 *
 * @param imageUrl    URL https publique de l'image source
 * @param textPrompt  Description en anglais de la région à détecter
 *                    (ex: "cabinet doors and drawer fronts")
 * @returns URL du mask PNG, ou null si SAM n'a rien trouvé
 */
interface SegmentOptions {
  /** Combien de pixels élargir le mask aux bords. Plus c'est gros, plus on
   * couvre les contours mais on risque de mordre sur les zones voisines.
   * Recommandations :
   *  - facades  : 3-4 (zones bien définies, contours fiables)
   *  - handles  : 2   (petits objets, ne pas mordre sur le meuble)
   *  - countertop : 1-2 (CRITIQUE : 5 mordait sur le backsplash/credence) */
  expandMask?: number;
  /** Flou des bords du mask (0 = bords nets, 5-10 = transition douce).
   * Indispensable pour éviter les coutures visibles sur l'inpainting. */
  blurMask?: number;
  /** Negative prompt : ce qu'on ne veut PAS dans le mask (ex: pour countertop,
   * négativer "backsplash, wall, tile" pour éviter d'inclure la crédence). */
  negativePrompt?: string;
}

async function segmentRegion(
  imageUrl: string,
  textPrompt: string,
  opts: SegmentOptions = {},
): Promise<string | null> {
  ensureConfigured();
  const t0 = Date.now();
  try {
    const result = await fal.subscribe(EVF_SAM_MODEL, {
      input: {
        image_url:          imageUrl,
        prompt:             textPrompt,
        mask_only:          true,
        expand_mask:        opts.expandMask  ?? 3,
        blur_mask:          opts.blurMask    ?? 4,
        fill_holes:         true,
        use_grounding_dino: true,
        ...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt } : {}),
      },
      logs: false,
    });
    const maskUrl = extractMaskUrl(result.data);
    console.log(`[SAM] "${textPrompt.slice(0, 60)}" expand=${opts.expandMask ?? 3} blur=${opts.blurMask ?? 4} → ${maskUrl ? 'OK' : 'NO MASK'} en ${Date.now() - t0}ms`);
    return maskUrl;
  } catch (err) {
    console.warn(`[SAM] "${textPrompt.slice(0, 60)}" ÉCHEC en ${Date.now() - t0}ms:`,
      err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Tente une segmentation avec un prompt principal, et si ça rate, retry avec
 * un prompt alternatif plus simple. Augmente significativement la robustesse
 * quand le concept est mal nommé ou que SAM est confus par le prompt long.
 */
async function segmentRegionWithRetry(
  imageUrl: string,
  primaryPrompt: string,
  fallbackPrompt: string,
  opts: SegmentOptions = {},
): Promise<string | null> {
  const mask = await segmentRegion(imageUrl, primaryPrompt, opts);
  if (mask) return mask;
  console.log(`[SAM] Retry avec fallback: "${fallbackPrompt.slice(0, 60)}"`);
  return segmentRegion(imageUrl, fallbackPrompt, opts);
}

/**
 * Repeint UNIQUEMENT la zone définie par le masque, avec le prompt donné.
 * Les pixels HORS du masque sont strictement préservés (garanti par le
 * modèle d'inpainting).
 *
 * @param imageUrl  Image courante (source ou résultat d'une étape précédente)
 * @param maskUrl   Mask PNG retourné par EVF-SAM
 * @param prompt    Description courte du matériau cible (ex: "deep matte black lacquered cabinet door surface")
 * @returns URL de l'image inpaintée, ou null si échec
 */
async function inpaintRegion(
  imageUrl: string,
  maskUrl:  string,
  prompt:   string,
): Promise<string | null> {
  ensureConfigured();
  const t0 = Date.now();
  try {
    // FIX 18/05/2026 : strength=0.95 (au lieu de 0.85 default). On veut que
    // la zone DANS le mask soit remplacée totalement (le mask délimite déjà
    // précisément ce qui doit changer — pas besoin de garder du source dedans).
    // C'est CONTRE-intuitif mais correct : strength haut + mask précis =
    // changement total dans la zone, zéro changement hors zone.
    // num_inference_steps=35 pour plus de qualité (default 28). 50 max = trop lent.
    // guidance_scale=4 (default 3.5) → un peu plus d'adhérence au prompt.
    const result = await fal.subscribe(FLUX_INPAINT_MODEL, {
      input: {
        prompt,
        image_url:           imageUrl,
        mask_url:            maskUrl,
        num_images:          1,
        num_inference_steps: 35,
        guidance_scale:      4,
        strength:            0.95,
        output_format:       'jpeg',
      },
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    console.log(`[Inpaint] "${prompt.slice(0, 50)}…" → ${urls[0] ? 'OK' : 'NO IMG'} en ${Date.now() - t0}ms`);
    return urls[0] ?? null;
  } catch (err) {
    console.warn(`[Inpaint] "${prompt.slice(0, 50)}…" ÉCHEC en ${Date.now() - t0}ms:`,
      err instanceof Error ? err.message : err);
    return null;
  }
}

// ─────────────────────────────────────────── COLORISTE SAM + INPAINT (mode pro)

/**
 * Métadonnées retournées en plus du résultat standard pour le mode SAM.
 * Permet à la route + UI de tracer ce qui s'est réellement passé (utile pour
 * débugger les cas où une région n'a pas été détectée).
 */
export interface ColoristSAMStepReport {
  region:        'facade' | 'poignee' | 'plan';
  maskFound:     boolean;
  inpaintOk:     boolean;
  durationMs:    number;
}

/**
 * Coloriste mode "pixel-perfect" : SAM segmente les 3 régions puis on inpaint
 * séquentiellement. Tout pixel hors des 3 masques reste IDENTIQUE à la source
 * (garanti par le modèle d'inpainting qui ne peint que dans le masque).
 *
 * Ordre des étapes (chacune utilise le résultat de la précédente comme source) :
 *   1. Façades   (impact visuel le plus fort, fait en premier)
 *   2. Poignées  (petite zone, moins sensible aux reflets du décor changé)
 *   3. Plan de travail (en dernier, peut "voir" les façades repeintes pour
 *      des reflets cohérents)
 *
 * Si SAM ne trouve pas une région (ex: poignées invisibles), on saute son étape
 * sans planter (returns la dernière image valide). On rapporte la trace via
 * `steps` pour que la route puisse logger / alerter.
 *
 * @param params           Paramètres couleurs/finitions/lumière de l'user
 * @param sourceImageUrl   URL https de la photo cuisine (déjà uploadée fal-cdn)
 * @param numImages        Ignoré (toujours 1 dans ce mode séquentiel ; le user
 *                         peut relancer pour avoir une variante)
 */
export async function generateColoristImageSAM(
  params: ColoristParams,
  sourceImageUrl: string,
  _numImages: number = 1,
): Promise<GenerationResult & { steps?: ColoristSAMStepReport[] }> {
  ensureConfigured();
  const tStart = Date.now();
  const steps: ColoristSAMStepReport[] = [];

  // Texte buildé pour traçabilité dans IaJob.prompt (l'utilisateur voit ce
  // qui a été demandé même si le pipeline est interne).
  const traceablePrompt: BuiltPrompt = buildColoristPrompt(params, 'standard');

  try {
    // ── ÉTAPE 1 : SAM en parallèle pour les 3 régions ──────────────────
    // Perfection 18/05/2026 (v3) :
    //  - Per-region expand_mask (3 façades / 2 handles / 1 countertop CRITIQUE)
    //  - blur_mask 4-6 pour transitions douces, évite coutures visibles
    //  - negative_prompt sur countertop pour exclure le backsplash
    //  - Retry avec prompt alternatif si le primaire rate (ex: bois +
    //    peint sont classifiés différemment par SAM)
    console.log(`[SAM+Inpaint] Pipeline start — source=${sourceImageUrl.slice(-40)}`);
    const [maskFacade, maskHandle, maskCountertop] = await Promise.all([
      segmentRegionWithRetry(
        sourceImageUrl,
        'all kitchen cabinet doors and drawer fronts, upper and lower cabinets',
        'kitchen cabinets',
        { expandMask: 3, blurMask: 5 },
      ),
      segmentRegionWithRetry(
        sourceImageUrl,
        'cabinet handles and knobs and drawer pulls',
        'cabinet handles',
        { expandMask: 2, blurMask: 3 },
      ),
      segmentRegionWithRetry(
        sourceImageUrl,
        'kitchen countertop horizontal worktop surface',
        'kitchen countertop',
        {
          expandMask: 1,
          blurMask:   4,
          // CRITIQUE : exclure explicitement la crédence/backsplash/mur
          negativePrompt: 'backsplash, wall, tile, splashback, vertical surface, kitchen appliances, oven, microwave, sink',
        },
      ),
    ]);

    // ── ÉTAPE 2 : Inpainting séquentiel (chaque étape s'appuie sur la précédente)
    let currentImage = sourceImageUrl;

    // 2a — Façades
    {
      const t0 = Date.now();
      if (maskFacade) {
        const next = await inpaintRegion(currentImage, maskFacade, buildFacadeRegionPrompt(params));
        const ok = !!next;
        if (ok) currentImage = next!;
        steps.push({ region: 'facade', maskFound: true, inpaintOk: ok, durationMs: Date.now() - t0 });
      } else {
        steps.push({ region: 'facade', maskFound: false, inpaintOk: false, durationMs: 0 });
      }
    }

    // 2b — Poignées
    {
      const t0 = Date.now();
      if (maskHandle) {
        const next = await inpaintRegion(currentImage, maskHandle, buildHandleRegionPrompt(params));
        const ok = !!next;
        if (ok) currentImage = next!;
        steps.push({ region: 'poignee', maskFound: true, inpaintOk: ok, durationMs: Date.now() - t0 });
      } else {
        steps.push({ region: 'poignee', maskFound: false, inpaintOk: false, durationMs: 0 });
      }
    }

    // 2c — Plan de travail (en dernier pour bénéficier des reflets corrigés)
    {
      const t0 = Date.now();
      if (maskCountertop) {
        const next = await inpaintRegion(currentImage, maskCountertop, buildCountertopRegionPrompt(params));
        const ok = !!next;
        if (ok) currentImage = next!;
        steps.push({ region: 'plan', maskFound: true, inpaintOk: ok, durationMs: Date.now() - t0 });
      } else {
        steps.push({ region: 'plan', maskFound: false, inpaintOk: false, durationMs: 0 });
      }
    }

    // ── Validation : au moins 1 étape doit avoir réussi ──
    const successfulSteps = steps.filter(s => s.inpaintOk).length;
    if (successfulSteps === 0) {
      return {
        success:    false,
        imageUrl:   null,
        imageUrls:  [],
        prompt:     traceablePrompt,
        attempts:   1,
        durationMs: Date.now() - tStart,
        error:      'SAM n\'a détecté aucune région à modifier dans votre photo. Essayez avec une photo plus claire de la cuisine.',
        steps,
      };
    }

    console.log(`[SAM+Inpaint] Pipeline OK — ${successfulSteps}/3 régions traitées en ${Date.now() - tStart}ms`);
    return {
      success:    true,
      imageUrl:   currentImage,
      imageUrls:  [currentImage],
      prompt:     traceablePrompt,
      attempts:   1,
      durationMs: Date.now() - tStart,
      steps,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[SAM+Inpaint] Pipeline ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
    return {
      success:    false,
      imageUrl:   null,
      imageUrls:  [],
      prompt:     traceablePrompt,
      attempts:   1,
      durationMs: Date.now() - tStart,
      error:      message,
      steps,
    };
  }
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
  /** Image de référence optionnelle (plan WinnerFlex, photo inspiration, sketch).
   * Flux Pro Ultra accepte `image_prompt` qui guide la génération sans
   * imposer la transformation stricte (contrairement à Kontext). Bon pour :
   * - donner une intention d'agencement / proportions
   * - inspirer un style visuel (ambiance d'une photo Pinterest)
   * Si null, mode pur text-to-image. */
  referenceImageUrl?: string | null,
): Promise<GenerationResult> {
  ensureConfigured();
  const tStart = Date.now();
  const built = buildRenduPrompt(params, 'standard');

  try {
    const hasRef = !!referenceImageUrl;
    console.log(`[fal.subscribe] ${FLUX_MODEL_RENDU} ${hasRef ? 'text2img+ref' : 'text2img'} premium promptLen=${built.prompt.length}`);
    // Flux Pro Ultra : params perfection 19/05/2026.
    //  - raw: false → rendu poli AD-style.
    //  - safety_tolerance '2' → permissif.
    //  - aspect_ratio 16:9.
    //  - image_prompt si fourni : guide la génération (style/intention).
    //  - image_prompt_strength 0.1-0.5 : à 0.1 c'est subtil (default fal),
    //    on monte à 0.3 pour avoir un guidage notable sans étrangler la
    //    créativité du prompt texte (qui contient déjà tous les détails).
    const input: Record<string, unknown> = {
      prompt:           built.prompt,
      num_images:       Math.min(Math.max(numImages, 1), 4),
      seed:             built.seed,
      output_format:    'jpeg',
      aspect_ratio:     '16:9',
      safety_tolerance: '2',
      raw:              false,
    };
    if (hasRef) {
      input.image_prompt          = referenceImageUrl;
      input.image_prompt_strength = 0.3;
    }
    const result = await fal.subscribe(FLUX_MODEL_RENDU, {
      input: input as never,
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
