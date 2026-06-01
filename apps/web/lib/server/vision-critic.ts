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

const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
const FIDELITY_THRESHOLD = 0.7; // sous ce seuil → retry

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
    'You are an architectural-fidelity judge. You will receive two images:',
    '- IMAGE A: the original source (3D render, CAD plan, sketch or photo)',
    '- IMAGE B: an AI-generated photorealistic version of that source',
    '',
    'Compare them carefully. Output a single JSON object (no markdown, no code fences) with:',
    '{',
    '  "fidelity": <0-1 number, 1 = perfect geometric fidelity>,',
    '  "issues": [<short strings: "added window", "moved cabinet", "changed floor to tile", "different camera angle", ...>]',
    '}',
    '',
    'Score guidance:',
    '- 1.0 = same room: same walls, same windows (count, position, size), same cabinet layout, same floor material, same backsplash, same camera angle.',
    '- 0.8 = minor cosmetic drift (lighting, color of an accent) but structure identical.',
    '- 0.5 = noticeable drift (different window placement, slightly different cabinet count, floor material changed without justification).',
    '- 0.2 = major drift (different room layout, hallucinated features).',
    '- 0.0 = completely different room.',
    '',
    'Ignore differences that are NORMAL transformations from 3D-look to photo (textures more realistic, shadows softer, lighting more natural). Focus on STRUCTURE.',
    '',
    'Respond ONLY with the JSON object.',
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
