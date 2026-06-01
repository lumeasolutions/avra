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
// Seuil durci (juin 2026) : 0.85 au lieu de 0.7. Observation prod : avec 0.7,
// Vision notait 0.80 sur des rendus avec fenêtre ajoutée + crédence changée,
// donc PAS de retry et l'utilisateur recevait une image clairement dérivée.
// À 0.85, le retry se déclenche sur la moindre dérive structurelle perçue.
const FIDELITY_THRESHOLD = 0.85;

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
    'You are a STRICT architectural-fidelity judge. You will receive two images:',
    '- IMAGE A: the original source (3D render, CAD plan, sketch or photo)',
    '- IMAGE B: an AI-generated photorealistic version of that source',
    '',
    'Your job: detect EVERY structural or material deviation between A and B, then score the fidelity. Be ruthlessly strict — when in doubt, lower the score.',
    '',
    'Output a single JSON object (no markdown, no code fences):',
    '{',
    '  "fidelity": <0-1 number>,',
    '  "issues": [<short strings>]',
    '}',
    '',
    'CRITICAL DEVIATIONS — each one of these brings score down by AT LEAST 0.20:',
    '- A window was ADDED where there was a wall in A',
    '- A window was REMOVED that existed in A',
    '- A window CHANGED POSITION or SIZE',
    '- The backsplash/crédence material was CHANGED (e.g. pink tile → grey unchanged was not requested)',
    '- The floor material was CHANGED (e.g. concrete → desert sand)',
    '- A cabinet was ADDED or REMOVED or RESIZED',
    '- Camera angle / framing CHANGED noticeably',
    '- An outdoor scene appears in B that was not visible in A',
    '- New decorative objects appeared that were not in A',
    '',
    'Score scale (be strict):',
    '- 1.00 = perfect, no detectable deviation',
    '- 0.90 = trivial cosmetic difference (slightly different lighting tone)',
    '- 0.80 = one minor cosmetic drift, no structural change',
    '- 0.70 = one material changed without explicit user request OR one minor structural element off',
    '- 0.50 = one CRITICAL deviation (added window, changed backsplash, etc.)',
    '- 0.30 = multiple CRITICAL deviations',
    '- 0.10 = completely different room',
    '',
    'DO NOT penalize: normal 3D→photo transformation (more realistic textures, softer shadows, natural lighting). Focus ONLY on STRUCTURE and MATERIALS the user did not request to change.',
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
