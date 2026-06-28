/**
 * myarchitect-api.ts — Wrapper serveur pour l'API MyArchitectAI
 *
 * Moteur de rendu photoréaliste alternatif (≠ fal.ai/Flux). Utilisé par le
 * module « IA Architect » de l'IA Studio. MyArchitectAI transforme une image
 * source (plan, rendu 3D, sketch, photo) en rendu photoréaliste via un appel
 * HTTP simple, facturé à l'usage (~0,03 $/rendu).
 *
 * Doc officielle : https://www.myarchitectai.com/api
 * Référence API  : https://portal.myarchitectai.com/docs
 *
 * Endpoints utilisés :
 *   POST /v1/render/interior   { image, outputFormat, prompt? }       → 0,03 $
 *   POST /v1/render/exterior   { image, outputFormat, prompt? }       → 0,03 $
 *   POST /v1/upscale-4k        { image, outputFormat }                → 0,02 $
 *
 * Réponse 200 : { "output": ["https://cdn.../result.jpg", ...] }
 * Erreurs     : 400 (input invalide), 403 (clé absente/invalide), 500 (interne)
 *
 * ⚙️  Configuration : une seule variable d'environnement à poser.
 *     MYARCHITECT_API_KEY = ma_xxx   (clé créée sur portal.myarchitectai.com)
 *     Tant qu'elle est absente, le module tourne en MODE MOCK (renvoie l'image
 *     source telle quelle) pour ne jamais casser l'UI en dev / preview.
 */

const API_BASE = 'https://api.myarchitectai.com/v1';

// MyArchitectAI annonce un rendu en ~13 s ; on laisse une marge confortable.
// 120 s couvre les pics de charge sans dépasser le maxDuration Vercel (300 s).
const DEFAULT_TIMEOUT_MS = 120_000;

export type ArchitectMode = 'interior' | 'exterior';

export interface ArchitectParams {
  /** Intérieur (cuisine, pièce) ou extérieur (façade, perspective). */
  mode: ArchitectMode;
  /** Façades & couleurs (optionnel) — injecté dans le prompt si renseigné. */
  facades?: string;
  /** Plan de travail (optionnel). */
  planTravail?: string;
  /** Sol (optionnel). */
  sol?: string;
  /** Murs (optionnel). */
  murs?: string;
  /** Ambiance / consigne libre de l'utilisateur (optionnel). */
  ambiance?: string;
  /** Upscale 4K du rendu final (+0,02 $, +qq s). */
  highRes?: boolean;
}

export interface ArchitectResult {
  success: boolean;
  imageUrls: string[];
  /** Prompt effectivement envoyé (pour la traçabilité / l'historique). */
  prompt: string;
  /** Endpoint utilisé ('render/interior' | 'render/exterior' | 'mock'). */
  endpoint: string;
  /** True si un upscale 4K a été appliqué avec succès. */
  upscaled: boolean;
  error?: string;
}

/** True si la clé MyArchitectAI est configurée (sinon → mode mock). */
export function isArchitectEnabled(): boolean {
  return !!process.env.MYARCHITECT_API_KEY;
}

/**
 * Construit un prompt orienté qualité/fidélité pour réduire les erreurs de
 * rendu (objets déformés, éléments inventés, proportions fausses).
 *
 * ⚠️  Les endpoints render/interior et render/exterior n'acceptent PAS de
 * `negativePrompt` (seuls style-transfer et text-to-image le supportent). On
 * intègre donc les contraintes négatives directement dans le prompt positif —
 * c'est la bonne pratique standard pour ces modèles de diffusion.
 */
export function buildArchitectPrompt(params: ArchitectParams): string {
  const base =
    params.mode === 'exterior'
      ? 'professional architectural exterior photograph, photorealistic, accurate proportions and geometry true to the source, bright and luminous natural daylight, soft even lighting, airy well-lit atmosphere, clean materials'
      : 'professional architectural interior photograph, photorealistic, accurate proportions and geometry true to the source, bright and luminous lighting, soft even natural and artificial light, airy well-lit atmosphere, clean detailed materials';

  const materials: string[] = [];
  if (params.facades?.trim()) materials.push(`cabinet fronts: ${params.facades.trim()}`);
  if (params.planTravail?.trim()) materials.push(`countertop: ${params.planTravail.trim()}`);
  if (params.sol?.trim()) materials.push(`floor: ${params.sol.trim()}`);
  if (params.murs?.trim()) materials.push(`walls: ${params.murs.trim()}`);

  const ambiance = params.ambiance?.trim() ? params.ambiance.trim() : '';

  // Contraintes anti-dérive baked-in (faute de negativePrompt sur ces endpoints).
  const guard =
    'preserve the original layout and camera angle, no extra furniture, no added objects, no warped or deformed shapes, no distorted lines, no text, crisp clean image, sharp focus, fine high detail, high resolution, smooth surfaces, no grain, no noise, no blur, no compression artifacts';

  return [base, materials.length ? materials.join(', ') : '', ambiance, guard]
    .filter(Boolean)
    .join('. ');
}

/** Extrait les URLs depuis la réponse MyArchitectAI ({ output: [...] } ou string). */
function extractOutputs(data: unknown): string[] {
  const d = data as { output?: unknown; url?: unknown };
  if (Array.isArray(d?.output)) {
    return d.output.filter((u): u is string => typeof u === 'string' && u.length > 0);
  }
  if (typeof d?.output === 'string' && d.output.length > 0) return [d.output];
  if (typeof d?.url === 'string' && d.url.length > 0) return [d.url];
  return [];
}

interface EndpointResult {
  ok: boolean;
  outputs: string[];
  error?: string;
}

/**
 * Appel bas-niveau d'un endpoint MyArchitectAI avec timeout + gestion d'erreur.
 * Ne lève jamais : retourne toujours { ok, outputs, error } pour un contrôle
 * de flux propre côté route.
 */
async function callEndpoint(
  path: string,
  body: Record<string, unknown>,
): Promise<EndpointResult> {
  const apiKey = process.env.MYARCHITECT_API_KEY;
  if (!apiKey) {
    return { ok: false, outputs: [], error: 'Clé du moteur de rendu non configurée' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const msg =
        (parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error?: unknown }).error)
          : '') ||
        (parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message?: unknown }).message)
          : '');
      const friendly =
        res.status === 403
          ? 'Clé API du moteur de rendu invalide ou crédit épuisé.'
          : res.status === 400
            ? `Entrée refusée par le moteur de rendu${msg ? ` : ${msg}` : ''}.`
            : `Le moteur de rendu a renvoyé une erreur ${res.status}${msg ? ` : ${msg}` : ''}.`;
      return { ok: false, outputs: [], error: friendly };
    }

    const outputs = extractOutputs(parsed);
    if (outputs.length === 0) {
      return { ok: false, outputs: [], error: 'Le moteur de rendu n\'a renvoyé aucune image.' };
    }
    return { ok: true, outputs };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      outputs: [],
      error: aborted
        ? 'Le moteur de rendu a dépassé le délai d\'attente. Réessayez dans un instant.'
        : `Connexion au moteur de rendu impossible : ${err instanceof Error ? err.message : 'erreur réseau'}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Rendu intérieur photoréaliste depuis une image source (URL https). */
export function renderInterior(imageUrl: string, prompt: string): Promise<EndpointResult> {
  return callEndpoint('/render/interior', { image: imageUrl, outputFormat: 'jpg', prompt });
}

/** Rendu extérieur photoréaliste depuis une image source (URL https). */
export function renderExterior(imageUrl: string, prompt: string): Promise<EndpointResult> {
  return callEndpoint('/render/exterior', { image: imageUrl, outputFormat: 'jpg', prompt });
}

/** Upscale 4K d'une image (URL https). Non bloquant : null si échec. */
export async function upscale4k(imageUrl: string): Promise<string | null> {
  const res = await callEndpoint('/upscale-4k', { image: imageUrl, outputFormat: 'jpg' });
  return res.ok ? res.outputs[0] ?? null : null;
}

/**
 * Génération haut-niveau « IA Architect ».
 *
 * @param params   Paramètres UI (mode, matériaux, highRes…)
 * @param imageUrl URL https publique de l'image source (déjà uploadée)
 *
 * En mode mock (clé absente) : renvoie l'image source telle quelle pour que
 * l'UI reste fonctionnelle en dev/preview sans casser le pipeline.
 */
export async function generateArchitectRender(
  params: ArchitectParams,
  imageUrl: string,
): Promise<ArchitectResult> {
  const prompt = buildArchitectPrompt(params);

  // ── Mode mock : aucune clé configurée
  if (!isArchitectEnabled()) {
    return {
      success: true,
      imageUrls: [imageUrl],
      prompt: `${prompt} [MODE DÉMO — clé du moteur de rendu non configurée]`,
      endpoint: 'mock',
      upscaled: false,
    };
  }

  // ── Rendu principal
  const endpoint = params.mode === 'exterior' ? 'render/exterior' : 'render/interior';
  const result =
    params.mode === 'exterior'
      ? await renderExterior(imageUrl, prompt)
      : await renderInterior(imageUrl, prompt);

  if (!result.ok) {
    return { success: false, imageUrls: [], prompt, endpoint, upscaled: false, error: result.error };
  }

  let imageUrls = result.outputs;
  let upscaled = false;

  // ── Upscale 4K optionnel (non bloquant : on garde l'image si l'upscale rate)
  if (params.highRes && imageUrls[0]) {
    const hi = await upscale4k(imageUrls[0]);
    if (hi) {
      imageUrls = [hi, ...imageUrls.slice(1)];
      upscaled = true;
    }
  }

  return { success: true, imageUrls, prompt, endpoint, upscaled };
}


/**
 * Coloriste via MyArchitectAI — change les couleurs/finitions d'une cuisine
 * existante à partir d'un prompt déjà construit (couleurs façades/poignées/plan).
 * Utilise render/interior (l'« Edit by prompt » par surface de MyArchitectAI
 * n'est pas encore exposé en API). En mode mock : renvoie l'image source.
 *
 * @param prompt   Prompt coloriste (construit via buildColoristPrompt côté route)
 * @param imageUrl URL https publique de la photo de cuisine source
 */
export async function generateColoristeRender(
  prompt: string,
  imageUrl: string,
): Promise<ArchitectResult> {
  if (!isArchitectEnabled()) {
    return {
      success: true,
      imageUrls: [imageUrl],
      prompt: `${prompt} [MODE DÉMO — clé du moteur de rendu non configurée]`,
      endpoint: 'mock',
      upscaled: false,
    };
  }
  const res = await renderInterior(imageUrl, prompt);
  if (!res.ok) {
    return { success: false, imageUrls: [], prompt, endpoint: 'render/interior', upscaled: false, error: res.error };
  }
  return { success: true, imageUrls: res.outputs, prompt, endpoint: 'render/interior', upscaled: false };
}
