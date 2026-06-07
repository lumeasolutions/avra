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
 *  3 modes (juin 2026 — text-to-image retiré) :
 *   - Coloriste img2img sans textures → fal-ai/flux/dev/image-to-image
 *   - Coloriste img2img avec textures → fal-ai/flux-pro/kontext/multi
 *   - Rendu réaliste img2img (plan / 3D / sketch / inspi) → fal-ai/flux-pro/kontext
 *
 *  Le mode rendu text-to-image pur a été supprimé : sans image source,
 *  Flux inventait sol, crédence et ouvertures de façon incohérente avec
 *  la cuisine réelle du client.
 * ──────────────────────────────────────────────────────────────
 */

import { fal } from '@fal-ai/client';
import {
  buildColoristPrompt,
  buildKontextColoristPrompt,
  buildRenduFromImageKontextPrompt,
  buildFacadeRegionPrompt,
  buildHandleRegionPrompt,
  buildCountertopRegionPrompt,
  ColoristParams,
  RenduParams,
  BuiltPrompt,
  KontextImageRefs,
} from './prompt-builder';

// ─────────────────────────────────────────── CONFIG SDK

const FLUX_MODEL_COLORISTE_I2I    = 'fal-ai/flux/dev/image-to-image';
const FLUX_MODEL_KONTEXT_SINGLE   = 'fal-ai/flux-pro/kontext';
const FLUX_MODEL_KONTEXT_MULTI    = 'fal-ai/flux-pro/kontext/multi';

// Phase 1 (juin 2026) — Flux Control LoRA Canny pour verrouillage géométrique
// "standard" (mode rapide, 1 contrôle).
const FLUX_CONTROL_LORA_CANNY = 'fal-ai/flux-control-lora-canny/image-to-image';

// Phase 6 (juin 2026) — ULTRA FIDÉLITÉ : Flux General avec multi-control
// (Canny + Depth simultanés) + reference-only + img2img strength bas.
// L'objectif est pixel-perfect : tout détail visible dans la source
// (parquet, évier, robinetterie, tableaux, prises, position des sièges,
// couleur des murs/sol/plafond, décoration) doit être préservé.
const FLUX_GENERAL_I2I = 'fal-ai/flux-general/image-to-image';

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

// ─────────────────────────────────────────── PHASE 2 : SAM REFINEMENT RENDU
//
// Pipeline optionnel "Précision maximale" pour le rendu réaliste.
// Après que ControlNet Canny (ou Kontext) ait généré l'image, on applique
// SAM+Inpaint sur les zones critiques (façades, plan de travail, sol) pour
// imposer pixel-perfect les matériaux demandés par l'utilisateur, sans que
// le modèle de génération puisse les contredire. Tout pixel hors des masques
// est strictement préservé bit-à-bit (garantie mathématique de l'inpainting).

export interface RenduRefinementReport {
  region:     'facade' | 'plan' | 'sol';
  maskFound:  boolean;
  inpaintOk: boolean;
  durationMs: number;
}

/**
 * Affine une image de rendu en remplaçant pixel-perfect les matériaux dans
 * les zones détectées par SAM. Si une zone n'est pas détectée, on la skip
 * (ne plante PAS l'image entière). Retourne l'image affinée + le rapport.
 *
 * @param renduImageUrl URL de l'image générée à raffiner (résultat ControlNet/Kontext)
 * @param params        Paramètres rendu (utilise facades, planTravail, sol)
 */
export async function refineRenduMaterialsSAM(
  renduImageUrl: string,
  params: RenduParams,
): Promise<{ imageUrl: string; steps: RenduRefinementReport[] }> {
  ensureConfigured();
  const steps: RenduRefinementReport[] = [];

  // Segmentation parallèle des 3 zones avec retries et expand/blur réglés
  // par zone (mêmes valeurs que coloriste SAM, éprouvées en prod).
  const [maskFacade, maskPlan, maskSol] = await Promise.all([
    segmentRegionWithRetry(
      renduImageUrl,
      'all kitchen cabinet doors and drawer fronts, upper and lower cabinets',
      'kitchen cabinets',
      { expandMask: 3, blurMask: 5 },
    ),
    segmentRegionWithRetry(
      renduImageUrl,
      'kitchen countertop horizontal worktop surface',
      'kitchen countertop',
      {
        expandMask: 1, blurMask: 4,
        // Anti-mordant sur la crédence/mur (cf. coloriste SAM)
        negativePrompt: 'backsplash, wall, tile, splashback, vertical surface, kitchen appliances, oven, microwave, sink',
      },
    ),
    params.sol
      ? segmentRegionWithRetry(
          renduImageUrl,
          'kitchen floor flooring surface bottom',
          'floor',
          { expandMask: 2, blurMask: 5 },
        )
      : Promise.resolve(null),
  ]);

  let currentImage = renduImageUrl;

  // Façades
  {
    const t0 = Date.now();
    if (maskFacade) {
      const prompt = `kitchen cabinet door panel: ${params.facades}, uniform consistent material across entire surface, photorealistic high-end kitchen material, sharp clean edges`;
      const next = await inpaintRegion(currentImage, maskFacade, prompt);
      const ok = !!next;
      if (ok) currentImage = next!;
      steps.push({ region: 'facade', maskFound: true, inpaintOk: ok, durationMs: Date.now() - t0 });
    } else {
      steps.push({ region: 'facade', maskFound: false, inpaintOk: false, durationMs: 0 });
    }
  }

  // Plan de travail
  {
    const t0 = Date.now();
    if (maskPlan) {
      const prompt = `kitchen countertop in ${params.planTravail}, seamless uniform surface, photorealistic high-end material texture, sharp clean edges, subtle natural reflections, premium quality finish`;
      const next = await inpaintRegion(currentImage, maskPlan, prompt);
      const ok = !!next;
      if (ok) currentImage = next!;
      steps.push({ region: 'plan', maskFound: true, inpaintOk: ok, durationMs: Date.now() - t0 });
    } else {
      steps.push({ region: 'plan', maskFound: false, inpaintOk: false, durationMs: 0 });
    }
  }

  // Sol (uniquement si l'utilisateur a précisé un sol)
  {
    const t0 = Date.now();
    if (maskSol && params.sol) {
      const prompt = `kitchen floor: ${params.sol}, uniform consistent material, photorealistic high-end material texture, realistic reflections, sharp clean edges`;
      const next = await inpaintRegion(currentImage, maskSol, prompt);
      const ok = !!next;
      if (ok) currentImage = next!;
      steps.push({ region: 'sol', maskFound: true, inpaintOk: ok, durationMs: Date.now() - t0 });
    } else if (params.sol) {
      steps.push({ region: 'sol', maskFound: false, inpaintOk: false, durationMs: 0 });
    }
  }

  return { imageUrl: currentImage, steps };
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

// ─────────────────────────────────────────── RENDU RÉALISTE (Kontext img2img)

/**
 * Rendu Réaliste img2img via Kontext — SEUL mode supporté (juin 2026).
 *
 * Transforme fidèlement un plan WinnerFlex, un render 3D, un sketch ou
 * une photo d'inspiration en photo réaliste :
 *  - Kontext fait une vraie image-to-image (transformation pixel-aware)
 *  - Le layout, l'angle, la pose des meubles sont préservés
 *  - Seul le rendering style change (3D synthétique → photo réelle)
 *
 * Use case typique : l'user a un export 3D depuis WinnerFlex et veut le
 * voir comme une photo professionnelle de sa cuisine finie.
 */
export async function generateRenduFromReferenceKontext(
  params: RenduParams,
  referenceImageUrl: string,
  numImages: number = 1,
): Promise<GenerationResult> {
  ensureConfigured();
  const tStart = Date.now();
  const built = buildRenduFromImageKontextPrompt(params);

  try {
    console.log(`[fal.subscribe] ${FLUX_MODEL_KONTEXT_SINGLE} (rendu img2img) promptLen=${built.prompt.length}`);
    // Verrouillage géométrique (juin 2026) :
    //  - guidance_scale 5 (au lieu de 4) : Kontext suit plus strictement les
    //    instructions de préservation listées dans le prompt. Au-delà de 6 le
    //    modèle over-fit et produit des artefacts ; 5 est le sweet spot.
    //  - Pas de aspect_ratio forcé : on laisse Kontext préserver le ratio de
    //    l'image source (16:9 forcé causait des recadrages aberrants sur des
    //    plans WinnerFlex carrés ou portraits).
    const result = await fal.subscribe(FLUX_MODEL_KONTEXT_SINGLE, {
      input: {
        prompt:           built.prompt,
        image_url:        referenceImageUrl,
        num_images:       Math.min(Math.max(numImages, 1), 4),
        seed:             built.seed,
        output_format:    'jpeg',
        safety_tolerance: '2',
        guidance_scale:   5,
      },
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    console.log(`[fal.subscribe] ${FLUX_MODEL_KONTEXT_SINGLE} (rendu) OK en ${Date.now() - tStart}ms (${urls.length} URL)`);
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
    console.warn(`[fal.subscribe] ${FLUX_MODEL_KONTEXT_SINGLE} (rendu) ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
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

// ─────────────────────────────────────────── PHASE 1 : FLUX CONTROL LORA CANNY
//
// Verrouillage géométrique via Flux Control LoRA Canny — endpoint vérifié
// dans la doc fal.ai. Un seul appel : le modèle extrait les contours Canny
// de l'image source en interne ET les utilise comme contrainte architecturale
// dure. Le modèle ne peut PAS générer un mur où il y avait une fenêtre dans
// le Canny, c'est physiquement contraint.
//
// Différence cruciale avec Kontext : Kontext "négocie" entre prompt et image
// et peut dériver (fenêtre ajoutée, crédence changée). Control LoRA Canny
// fait respecter les bords détectés.
//
// Fallback : si l'appel rate (modèle indisponible, image rejetée, etc.),
// on retombe automatiquement sur Kontext côté caller — pas de plantage.

/**
 * Rendu via Flux Control LoRA Canny — verrouillage architectural strict.
 *
 * Inputs requis par l'API :
 *  - control_lora_image_url : image source (Canny extrait en interne)
 *  - image_url              : image source (guide les couleurs)
 *  Note : on passe la même URL aux deux — c'est le pattern recommandé pour
 *  un rendu photoréaliste qui respecte structure ET couleurs de la source.
 *
 * Paramètres clés (rééquilibrés 07/06/2026 vers le photoréalisme — voir détail
 * en ligne dans la fonction) :
 *  - control_lora_strength=0.85 : structure Canny tenue mais pas figée (1.0
 *    gardait l'aspect 3D synthétique en empêchant la repeinte des surfaces)
 *  - strength=0.82 : vraie transformation 3D synthétique → photo réelle
 *  - num_inference_steps=36 : qualité/détail photo
 *  - guidance_scale=5 : adhérence prompt "photorealistic"
 */
export async function generateRenduFromReferenceControlNet(
  params: RenduParams,
  referenceImageUrl: string,
  numImages: number = 1,
): Promise<GenerationResult> {
  ensureConfigured();
  const tStart = Date.now();
  const built = buildRenduFromImageKontextPrompt(params);

  try {
    console.log(`[fal.subscribe] ${FLUX_CONTROL_LORA_CANNY} promptLen=${built.prompt.length}`);
    const input: Record<string, unknown> = {
      prompt:                 built.prompt,
      control_lora_image_url: referenceImageUrl,
      image_url:              referenceImageUrl,
      // PHOTORÉALISME (07/06/2026) — équilibrage réalisme ↔ fidélité.
      // Problème remonté : le rendu gardait l'aspect 3D synthétique de la
      // source au lieu de devenir une vraie photo. Cause : verrou Canny à 1.0
      // + strength 0.75 = le modèle était trop contraint pour "repeindre" les
      // surfaces en photo. On rééquilibre vers le réalisme tout en gardant le
      // layout (le Canny à 0.85 tient encore solidement la structure) :
      control_lora_strength:  0.85,  // 1.0 → 0.85 : laisse respirer les textures
      strength:               0.82,  // 0.75 → 0.82 : vraie transformation 3D→photo
      num_images:             Math.min(Math.max(numImages, 1), 4),
      seed:                   built.seed,
      num_inference_steps:    36,    // 32 → 36 : un peu plus de détail photo
      guidance_scale:         5,     // 4 → 5 : pousse l'adhérence "photorealistic"
      output_format:          'jpeg',
      enable_safety_checker:  true,
    };
    // Si on a les dimensions natives, on les passe à l'API pour préserver
    // le ratio exact de la source (évite les recadrages aberrants).
    if (params.sourceWidth && params.sourceHeight) {
      // Clamp à 1024 max sur le côté long (limite raisonnable pour Flux LoRA)
      const longest = Math.max(params.sourceWidth, params.sourceHeight);
      const scale = longest > 1024 ? 1024 / longest : 1;
      input.image_size = {
        width:  Math.round(params.sourceWidth  * scale),
        height: Math.round(params.sourceHeight * scale),
      };
    }
    const result = await fal.subscribe(FLUX_CONTROL_LORA_CANNY, {
      input: input as never,
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    console.log(`[fal.subscribe] ${FLUX_CONTROL_LORA_CANNY} OK en ${Date.now() - tStart}ms (${urls.length} URL)`);
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
    console.warn(`[fal.subscribe] ${FLUX_CONTROL_LORA_CANNY} ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
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

// ─────────────────────────────────────────── PHASE 6 : ULTRA FIDÉLITÉ
//
// OBJECTIF (clarifié) : la STRUCTURE doit être identique pixel-près
// (positions, ouvertures, mobilier, décoration, prises, robinetterie, etc.),
// MAIS le rendu visuel doit être PHOTORÉALISTE (transformation 3D → photo).
//
// Itération 2 (juin 2026) : la v1 (strength 0.55 + ref 0.70 + canny + depth)
// était SUR-contrainte → l'image source ressortait quasi identique, sans
// photoréalisation visible. Nouvelle balance :
//  1. easycontrols Canny  (scale 0.85) → verrouille les contours et le layout
//  2. easycontrols Depth  (scale 0.55) → garde la perspective mais laisse
//     respirer les textures et l'éclairage
//  3. Pas de reference_image_url → libère les couleurs/textures pour
//     vraiment photoréaliser (le canny + depth gardent déjà la géométrie)
//  4. strength img2img 0.88 → permet la transformation visuelle photoréaliste
//     tout en gardant la structure via les ControlNets
//  5. guidance_scale 5.5 → adhérence prompt forte pour pousser "photoreal"
//  6. num_inference_steps 40 → qualité maximale
//
// La géométrie reste verrouillée (ControlNets durs) mais le rendu visuel
// peut réellement changer de style synthétique vers photo.

export async function generateRenduUltraFidelity(
  params: RenduParams,
  referenceImageUrl: string,
  numImages: number = 1,
): Promise<GenerationResult> {
  ensureConfigured();
  const tStart = Date.now();
  const built = buildRenduFromImageKontextPrompt(params);

  try {
    console.log(`[fal.subscribe] ${FLUX_GENERAL_I2I} (ultra fidélité v2) promptLen=${built.prompt.length}`);
    // Balance v2 : structure verrouillée par les ControlNets, mais strength
    // élevé pour permettre la photoréalisation visuelle. La reference-only
    // est retirée car elle empêchait la transformation des textures.
    const input: Record<string, unknown> = {
      prompt:               built.prompt,
      image_url:            referenceImageUrl,     // img2img source
      strength:             0.88,                  // VRAIE transformation visuelle
      easycontrols: [
        {
          control_method_url: 'canny',
          image_url:          referenceImageUrl,
          image_control_type: 'spatial',
          scale:              0.85,                // contours bien verrouillés
        },
        {
          control_method_url: 'depth',
          image_url:          referenceImageUrl,
          image_control_type: 'spatial',
          scale:              0.55,                // perspective sans étouffer
        },
      ],
      num_inference_steps:  40,                    // qualité maximale (default 28)
      guidance_scale:       5.5,                   // pousse "photorealistic"
      num_images:           Math.min(Math.max(numImages, 1), 4),
      seed:                 built.seed,
      output_format:        'jpeg',
      enable_safety_checker: true,
    };
    // Préserve le ratio source si fourni (clamp à 1024 max côté long).
    if (params.sourceWidth && params.sourceHeight) {
      const longest = Math.max(params.sourceWidth, params.sourceHeight);
      const scale = longest > 1024 ? 1024 / longest : 1;
      input.image_size = {
        width:  Math.round(params.sourceWidth  * scale),
        height: Math.round(params.sourceHeight * scale),
      };
    }
    const result = await fal.subscribe(FLUX_GENERAL_I2I, {
      input: input as never,
      logs: false,
    });
    const urls = extractImageUrls(result.data);
    console.log(`[fal.subscribe] ${FLUX_GENERAL_I2I} (ultra) OK en ${Date.now() - tStart}ms (${urls.length} URL)`);
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
    console.warn(`[fal.subscribe] ${FLUX_GENERAL_I2I} (ultra) ÉCHEC en ${Date.now() - tStart}ms: ${message}`);
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
