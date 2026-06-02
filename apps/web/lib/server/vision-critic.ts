/**
 * Phase 4 — Auto-validation du résultat IA via GPT-4o-mini Vision.
 *
 * Reçoit l'URL de l'image source et l'URL du rendu généré. Demande à
 * GPT-4o-mini de comparer les deux et de retourner un score de fidélité
 * géométrique entre 0 et 1, plus la liste des dérives détectées.
 *
 * Utilisé dans la route /api/ia/rendu pour décider si on relance avec une
 * seed différente (auto-retry invisible). Le coût est négligeable
 * (~0,5 cent par check, latence ~2-4s avec gpt-4o-mini).
 */

export interface FidelityReport {
  /** Score de fidélité géométrique entre 0 (très divergent) et 1 (parfait). */
  fidelity: number;
  /** Liste des dérives détectées (ex: "added window", "changed floor material"). */
  issues:   string[];
  /** True si on doit relancer la génération avec une autre seed. */
  shouldRetry: boolean;
  /** Indique si l'appel vision a réussi. False → on garde le résultat tel quel. */
  ok: boolean;
}

// Mode ultra fidélité (juin 2026) : on monte à gpt-4o (pas mini) pour avoir
// une analyse Vision beaucoup plus précise des détails fins (prises,
// tableaux, robinetterie, position des sièges). gpt-4o-mini ratait des
// dérives subtiles. Coût +0.015€/check mais on récupère 10-15% de fidélité
// perçue. Override via env OPENAI_VISION_MODEL si besoin.
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
// Seuil 0.92 : on ne tolère QUE des différences trivialement cosmétiques.
// Dès qu'un détail fin diverge (un tableau déplacé, une prise inventée,
// une robinetterie différente), le retry se déclenche.
const FIDELITY_THRESHOLD = 0.92;

/**
 * Compare l'image source et le rendu IA, retourne un score de fidélité.
 * Échec silencieux : si l'API échoue ou répond mal, on retourne ok:false
 * et la route caller garde le résultat tel quel (pas de retry).
 *
 * Budget temps recommandé côté caller : ~5s max (timeout interne 8s).
 */
export async function assessRenduFidelity(
  sourceImageUrl: string,
  resultImageUrl: string,
): Promise<FidelityReport> {
  const fallback: FidelityReport = {
    fidelity: 1, issues: [], shouldRetry: false, ok: false,
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.warn('[vision-critic] OPENAI_API_KEY absente — assessment skip');
    return fallback;
  }

  const prompt = [
    'You are an EXTREMELY STRICT pixel-perfect-fidelity judge for architectural interior renderings.',
    'You will receive two images:',
    '- IMAGE A: the original source (3D render, CAD plan, sketch or photo)',
    '- IMAGE B: an AI-generated photorealistic version of that source',
    '',
    'Your job: detect EVERY deviation between A and B — architectural, material, decorative, fixture, electrical. Compare element-by-element. Be ruthlessly strict.',
    '',
    'Output a single JSON object (no markdown, no code fences):',
    '{',
    '  "fidelity": <0-1 number>,',
    '  "issues": [<short strings describing each deviation>]',
    '}',
    '',
    'CRITICAL DEVIATIONS — each one brings score down by AT LEAST 0.15:',
    '',
    'Architecture:',
    '- Window added/removed/moved/resized — count each one separately',
    '- Door added/removed/moved',
    '- Wall position or color changed',
    '- Ceiling color, height or shape changed',
    '- Floor material changed (parquet → tile, etc.) or plank/tile orientation changed',
    '',
    'Fixtures & appliances:',
    '- Sink shape changed (single → double bowl, etc.) or moved',
    '- Faucet/robinetterie style changed or moved',
    '- Oven, stovetop, fridge, microwave, hood, dishwasher: moved or resized',
    '- Light switches added/removed/moved',
    '- Electrical outlets (prises) added/removed/moved — count each',
    '- Light fixtures (pendants, spots) added/removed/moved',
    '',
    'Cabinets:',
    '- Any cabinet added/removed/resized/moved',
    '- Door splits, drawer fronts, open shelves changed',
    '- Handles/knobs added/removed/moved or style changed',
    '',
    'Surfaces & materials:',
    '- Backsplash/crédence material or pattern changed without explicit request',
    '- Countertop shape, edge profile or material changed',
    '- Wall paint color changed',
    '',
    'Decoration (THIS IS CRITICAL — most often missed):',
    '- Paintings/photos/art on walls: added, removed, moved, or subject changed',
    '- Plants, vases, pots: added, removed, moved, species changed',
    '- Books, bottles, fruits, utensils on counter: added or removed',
    '- Bar stools/tabourets/chaises hautes: count changed, position changed, style changed, height changed',
    '- Rugs/mats: added/removed/moved',
    '- Clocks, mirrors, decorative objects: added/removed/moved',
    '- Appliances on counter (coffee machine, kettle, toaster, knife block): added/removed/moved',
    '',
    'Score scale (very strict):',
    '- 1.00 = perfect, no detectable deviation, looks like the same room photographed',
    '- 0.95 = trivially cosmetic difference only (slightly warmer lighting tone, slight softening)',
    '- 0.90 = ONE minor element with subtle drift (e.g. fruit bowl position shifted slightly)',
    '- 0.80 = one notable deviation (one painting moved, one stool added, etc.)',
    '- 0.65 = multiple noticeable deviations OR one critical structural change',
    '- 0.40 = many deviations across the image',
    '- 0.10 = completely different room',
    '',
    'DO NOT penalize: realistic textures, softer shadows, natural lighting, glass reflections, slight gloss — these are normal 3D→photo transformations.',
    'DO penalize: any added/removed/moved physical element, any changed material that the user did not request.',
    '',
    'Respond ONLY with the JSON object. Be exhaustive in the issues array.',
  ].join('\n');

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 300,
        temperature: 0,
        // response_format json_object pour parsing fiable
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: sourceImageUrl, detail: 'low' } },
              { type: 'image_url', image_url: { url: resultImageUrl, detail: 'low' } },
            ],
          },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[vision-critic] HTTP ${res.status}`);
      return fallback;
    }

    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return fallback;

    const parsed = JSON.parse(content) as { fidelity?: number; issues?: unknown };
    const fidelity = typeof parsed.fidelity === 'number'
      ? Math.max(0, Math.min(1, parsed.fidelity))
      : 1;
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.filter((x): x is string => typeof x === 'string').slice(0, 8)
      : [];

    return {
      fidelity,
      issues,
      shouldRetry: fidelity < FIDELITY_THRESHOLD,
      ok: true,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.warn(`[vision-critic] échec: ${err instanceof Error ? err.message : err}`);
    return fallback;
  }
}
