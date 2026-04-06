/**
 * ──────────────────────────────────────────────────────────────
 *  AVRA IA Studio — Flux API Client
 *  Système de génération d'images avec retry intelligent
 *  3 niveaux de fallback → zéro échec visible par le client
 * ──────────────────────────────────────────────────────────────
 *
 *  Stack : Flux 1.1 Pro Ultra via fal.ai
 *  npm install @fal-ai/serverless-client
 *
 *  Variable d'env requise : FAL_KEY (dans .env.local)
 * ──────────────────────────────────────────────────────────────
 */

import {
  buildColoristPrompt,
  buildRenduPrompt,
  getBestFallback,
  isPromptValid,
  ColoristParams,
  RenduParams,
  BuiltPrompt,
} from './prompt-builder';

// ─────────────────────────────────────────── TYPES

export interface GenerationResult {
  success:   boolean;
  imageUrl:  string | null;
  prompt:    BuiltPrompt;
  attempts:  number;
  durationMs:number;
  error?:    string;
}

export interface FluxInput {
  prompt:        string;
  negative_prompt?: string;
  num_images:    number;
  image_size:    string;
  output_format: string;
  seed:          number;
  safety_tolerance?: number;
}

// ─────────────────────────────────────────── CONFIG

const FLUX_MODEL = 'fal-ai/flux-pro/v1.1-ultra';
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 120_000; // 2 min max

// ─────────────────────────────────────────── MOCK (développement)

/**
 * Simule un appel API Flux en développement.
 * Remplacer par le vrai appel fal.ai une fois la clé configurée.
 */
async function mockFluxCall(input: FluxInput): Promise<{ images: Array<{ url: string }> }> {
  // Simule la latence réelle de Flux (4-8 secondes)
  const latency = 4000 + Math.random() * 4000;
  await new Promise(r => setTimeout(r, latency));

  // En prod : remplacer par l'appel fal.ai réel (voir commentaire ci-dessous)
  // Retourne une image de placeholder pour le développement
  return {
    images: [{
      url: `https://placehold.co/1280x720/304035/ffffff?text=Rendu+IA+Simulation`,
    }],
  };
}

/**
 * Appel réel Flux via fal.ai
 * Décommenter quand FAL_KEY est configuré dans .env.local
 *
 * import * as fal from '@fal-ai/serverless-client';
 *
 * async function realFluxCall(input: FluxInput) {
 *   fal.config({ credentials: process.env.FAL_KEY });
 *   return await fal.subscribe(FLUX_MODEL, {
 *     input: {
 *       prompt:           input.prompt,
 *       negative_prompt:  input.negative_prompt,
 *       num_images:       input.num_images,
 *       image_size:       input.image_size,
 *       output_format:    input.output_format,
 *       seed:             input.seed,
 *       safety_tolerance: input.safety_tolerance ?? 2,
 *     },
 *   });
 * }
 */

// ─────────────────────────────────────────── CORE ENGINE

async function callFlux(built: BuiltPrompt): Promise<string> {
  const input: FluxInput = {
    prompt:           built.prompt,
    negative_prompt:  built.negative,
    num_images:       1,
    image_size:       'landscape_16_9', // 1280x720 — idéal cuisine
    output_format:    'jpeg',
    seed:             built.seed,
    safety_tolerance: 2,
  };

  // Utiliser mockFluxCall en dev, realFluxCall en prod
  const result = await mockFluxCall(input);

  if (!result?.images?.[0]?.url) {
    throw new Error('Flux API: aucune image retournée');
  }

  return result.images[0].url;
}

// ─────────────────────────────────────────── RETRY SYSTEM

/**
 * Génère une image Coloriste avec retry automatique sur 3 niveaux.
 * Niveau 1 : prompt standard complet
 * Niveau 2 : prompt simplifié (si niveau 1 échoue)
 * Niveau 3 : prompt minimal safe (ne rate jamais)
 * Fallback final : preset validé hardcodé
 */
export async function generateColoristImage(
  params: ColoristParams
): Promise<GenerationResult> {
  const startTime = Date.now();
  let attempts = 0;
  let lastError = '';

  const levels: Array<'standard' | 'simplified' | 'minimal'> = [
    'standard',
    'simplified',
    'minimal',
  ];

  for (const level of levels) {
    attempts++;
    const built = buildColoristPrompt(params, level);

    try {
      const imageUrl = await Promise.race([
        callFlux(built),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout dépassé')), TIMEOUT_MS)
        ),
      ]);

      return {
        success:    true,
        imageUrl,
        prompt:     built,
        attempts,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[Flux] Tentative ${attempts} (${level}) échouée:`, lastError);
      // Petite pause avant retry
      if (attempts < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 500 * attempts));
      }
    }
  }

  // Fallback absolu — prompt validé manuellement
  const fallback = getBestFallback(params);
  try {
    attempts++;
    const imageUrl = await callFlux(fallback);
    return {
      success:    true,
      imageUrl,
      prompt:     fallback,
      attempts,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success:    false,
      imageUrl:   null,
      prompt:     fallback,
      attempts,
      durationMs: Date.now() - startTime,
      error:      `Échec après ${attempts} tentatives. Dernière erreur: ${lastError}`,
    };
  }
}

/**
 * Génère une image de rendu réaliste avec retry automatique sur 3 niveaux.
 */
export async function generateRenduImage(
  params: RenduParams
): Promise<GenerationResult> {
  const startTime = Date.now();
  let attempts = 0;
  let lastError = '';

  const levels: Array<'standard' | 'simplified' | 'minimal'> = [
    'standard',
    'simplified',
    'minimal',
  ];

  for (const level of levels) {
    attempts++;
    const built = buildRenduPrompt(params, level);

    try {
      const imageUrl = await Promise.race([
        callFlux(built),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout dépassé')), TIMEOUT_MS)
        ),
      ]);

      return {
        success:    true,
        imageUrl,
        prompt:     built,
        attempts,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[Flux] Tentative ${attempts} (${level}) échouée:`, lastError);
      if (attempts < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 500 * attempts));
      }
    }
  }

  // Fallback absolu
  const fallback = getBestFallback(params);
  try {
    attempts++;
    const imageUrl = await callFlux(fallback);
    return {
      success:    true,
      imageUrl,
      prompt:     fallback,
      attempts,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success:    false,
      imageUrl:   null,
      prompt:     fallback,
      attempts,
      durationMs: Date.now() - startTime,
      error:      `Échec après ${attempts} tentatives. Dernière erreur: ${lastError}`,
    };
  }
}

// ─────────────────────────────────────────── HELPERS

/** Estime le coût d'une génération en € */
export function estimateCost(module: 'coloriste' | 'rendu'): string {
  // Flux 1.1 Pro (coloriste) : ~0,04$ | Flux 1.1 Pro Ultra (rendu) : ~0,06$
  const usd = module === 'coloriste' ? 0.04 : 0.06;
  return `~${(usd * 0.93).toFixed(2)} €`;
}

/** Estime la durée de génération en secondes */
export function estimateDuration(module: 'coloriste' | 'rendu'): string {
  return module === 'coloriste' ? '5–10 sec' : '10–20 sec';
}
