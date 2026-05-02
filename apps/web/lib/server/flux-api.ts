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
  buildRenduPrompt,
  getBestFallback,
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
  prompt:           string;
  negative_prompt?: string;
  num_images:       number;
  image_size:       string;
  output_format:    string;
  seed:             number;
  safety_tolerance?: number;
}

// ─────────────────────────────────────────── CONFIG

const FLUX_MODEL_RENDU    = 'fal-ai/flux-pro/v1.1-ultra';
const FLUX_MODEL_COLORISTE = 'fal-ai/flux/dev';
const MAX_ATTEMPTS        = 3;
const TIMEOUT_MS          = 120_000; // 2 min max par tentative
const POLL_INTERVAL_MS    = 2_000;   // sonde le résultat toutes les 2s
const POLL_MAX_ATTEMPTS   = 60;      // 60 × 2s = 2 min max de polling

// ─────────────────────────────────────────── FAL API CLIENT

/**
 * Soumet une génération à fal.ai (mode asynchrone) et retourne l'imageUrl.
 * Gestion complète : submit → poll → extract.
 */
async function callFalApi(model: string, input: FluxInput): Promise<string> {
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
  const directUrl = extractUrl(submitData);
  if (directUrl) return directUrl;

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

    const url = extractUrl(pollData);
    if (url) return url;

    // status 'IN_PROGRESS' ou 'IN_QUEUE' → on continue
  }

  throw new Error(`FAL timeout: aucun résultat après ${POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/** Extrait l'URL d'image depuis les différents formats de réponse FAL */
function extractUrl(data: any): string | null {
  if (data?.images?.[0]?.url) return data.images[0].url;
  if (data?.image?.url)       return data.image.url;
  if (data?.url)              return data.url;
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────── CORE ENGINE

async function callFlux(built: BuiltPrompt, model: string): Promise<string> {
  const input: FluxInput = {
    prompt:           built.prompt,
    negative_prompt:  built.negative,
    num_images:       1,
    image_size:       'landscape_16_9',
    output_format:    'jpeg',
    seed:             built.seed,
    safety_tolerance: 2,
  };

  return callFalApi(model, input);
}

// ─────────────────────────────────────────── RETRY ENGINE

async function generateWithRetry(
  levels: Array<'standard' | 'simplified' | 'minimal'>,
  buildPrompt: (level: 'standard' | 'simplified' | 'minimal') => BuiltPrompt,
  fallbackPrompt: BuiltPrompt,
  model: string,
  startTime: number,
): Promise<GenerationResult> {
  let attempts   = 0;
  let lastError  = '';

  for (const level of levels) {
    attempts++;
    const built = buildPrompt(level);

    try {
      const imageUrl = await Promise.race([
        callFlux(built, model),
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
      console.warn(`[FAL] Tentative ${attempts} (${level}) échouée:`, lastError);
      if (attempts < MAX_ATTEMPTS) {
        await sleep(1000 * attempts);
      }
    }
  }

  // Fallback absolu — prompt validé manuellement
  attempts++;
  try {
    const imageUrl = await callFlux(fallbackPrompt, model);
    return {
      success:    true,
      imageUrl,
      prompt:     fallbackPrompt,
      attempts,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      success:    false,
      imageUrl:   null,
      prompt:     fallbackPrompt,
      attempts,
      durationMs: Date.now() - startTime,
      error:      `Échec après ${attempts} tentatives. Dernière erreur: ${lastError}`,
    };
  }
}

// ─────────────────────────────────────────── EXPORTS PUBLICS

/**
 * Coloriste IA — change les couleurs/finitions d'une cuisine.
 * Modèle : FLUX Dev (img2img rapide, optimisé colorisation)
 */
export async function generateColoristImage(
  params: ColoristParams
): Promise<GenerationResult> {
  return generateWithRetry(
    ['standard', 'simplified', 'minimal'],
    (level) => buildColoristPrompt(params, level),
    getBestFallback(params),
    FLUX_MODEL_COLORISTE,
    Date.now(),
  );
}

/**
 * Rendu réaliste IA — génère un visuel photoréaliste de cuisine.
 * Modèle : FLUX Pro 1.1 Ultra (meilleure qualité)
 */
export async function generateRenduImage(
  params: RenduParams
): Promise<GenerationResult> {
  return generateWithRetry(
    ['standard', 'simplified', 'minimal'],
    (level) => buildRenduPrompt(params, level),
    getBestFallback(params),
    FLUX_MODEL_RENDU,
    Date.now(),
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
