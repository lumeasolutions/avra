/**
 * retouch-instruction.ts — Construction de la consigne d'édition « Retouche photo ».
 *
 * L'endpoint /edit-by-prompt de MyArchitectAI applique UNE modification décrite
 * en langage naturel. Le risque : une consigne floue (« change le truc du haut »)
 * → édition ratée. Ce module transforme l'intention utilisateur en une consigne
 * PROPRE, ATOMIQUE, en anglais, toujours suffixée d'un « keep everything else
 * identical » (préservation du reste : niche, égouttoir, meubles non touchés).
 *
 * Deux voies :
 *   1. Retouche GUIDÉE (zone + matière) → consigne déterministe, aucune IA requise,
 *      donc zéro risque de mauvaise formulation.
 *   2. Texte LIBRE → reformulé/traduit par gpt-4o-mini (déjà dans la stack). Si la
 *      demande est trop vague, on renvoie null pour que l'UI repose une question
 *      au lieu de lancer (et facturer) une retouche ratée. Fallback sans IA si la
 *      clé OpenAI est absente.
 */

/** Zones ciblables en retouche guidée → localisation anglaise précise. */
const ZONE_EN: Record<string, string> = {
  'meubles-bas':    'only the base / lower kitchen cabinet fronts (the units standing on the floor)',
  'meubles-hauts':  'only the wall / upper kitchen cabinet fronts (the units mounted high on the wall)',
  'toutes-facades': 'all the kitchen cabinet fronts, both the base units and the wall units',
  'plan':           'only the countertop / worktop surface',
  'credence':       'only the backsplash',
  'sol':            'only the floor',
  'murs':           'only the walls',
  'poignees':       'only the cabinet door handles and knobs',
  'evier':          'only the kitchen sink (keep its exact shape and position, do not make it stainless steel unless asked)',
};

const KEEP_REST =
  'Change ONLY the color and material of the requested element(s): keep their exact shape, size, geometry, edges, contours and position strictly unchanged. ' +
  'Keep everything else in the image exactly identical: the layout, the camera angle, the existing lighting, shadows and reflections, every other surface, and all objects and accessories. ' +
  'Do NOT add, remove, move or invent anything — in particular do NOT add any spotlights, recessed ceiling lights, LED strip lights, lamps, light fixtures, glows, plants, decor, furniture or extra objects.';

/** Vrai si la matière ressemble à une couleur unie/mate (→ interdire le veinage). */
function looksPlain(material: string): boolean {
  const m = material.toLowerCase();
  const hasPattern = /(marbre|marble|vein|calacatta|granit|granite|bois|wood|chêne|chene|noyer|effet|motif|carrel|zellige|terrazzo|pierre|stone)/.test(m);
  return !hasPattern;
}

/** Retouche GUIDÉE : zone + matière → consigne déterministe (aucune IA). */
export function buildStructuredInstruction(zone: string, material: string): string | null {
  const loc = ZONE_EN[zone];
  const mat = material.trim();
  if (!loc || !mat) return null;
  const antiVeining =
    (zone === 'plan' || zone === 'credence' || zone === 'murs') && looksPlain(mat)
      ? ' Keep this surface perfectly uniform and smooth, with no veining, no marbling, no speckles and no stone-like pattern.'
      : '';
  return `Change ${loc} to exactly ${mat}.${antiVeining} ${KEEP_REST}`;
}

/** Retouche GUIDÉE MULTIPLE : plusieurs zone+matière → UNE consigne combinée. */
export function buildStructuredInstructionMulti(
  changes: Array<{ zone: string; material: string }>,
): string | null {
  // Dédoublonnage par zone (le dernier gagne) : on ne veut jamais deux ordres
  // contradictoires sur la même zone dans une consigne combinée.
  const byZone = new Map<string, { zone: string; material: string }>();
  for (const c of changes) {
    if (ZONE_EN[c.zone] && c.material?.trim()) {
      byZone.set(c.zone, { zone: c.zone, material: c.material.trim() });
    }
  }
  const valid = Array.from(byZone.values());
  if (valid.length === 0) return null;
  if (valid.length === 1) return buildStructuredInstruction(valid[0].zone, valid[0].material);
  const parts = valid.map((c) => {
    const loc = ZONE_EN[c.zone];
    const mat = c.material.trim();
    const antiVeining =
      (c.zone === 'plan' || c.zone === 'credence' || c.zone === 'murs') && looksPlain(mat)
        ? ' (keep this surface perfectly uniform, no veining, no marbling and no pattern)'
        : '';
    return `${loc} must become exactly ${mat}${antiVeining}`;
  });
  return `Apply all of these changes to the image at the same time: ${parts.join('; ')}. ${KEEP_REST}`;
}

const SYSTEM_PROMPT = `You convert a French kitchen-render retouch request into ONE precise image-editing instruction in English for an image-editing model.

Rules:
- Preserve EVERY change the user asks for. If several changes are requested, combine them into ONE instruction that applies them all at the same time (e.g. "change the worktop to black AND the handles to brass").
- Be specific about WHICH element changes (e.g. "the upper wall cabinets", "the worktop", "the backsplash").
- The changes must be color/material ONLY. Instruct to keep the exact same shape, size, geometry and position of the edited element — only its color and material change.
- NEVER add new elements. Do not add spotlights, recessed lights, LED strips, lamps, light fixtures, plants, decor, furniture or any object, even if it would look nicer. Preserve the existing lighting, shadows and reflections.
- If a plain or matte colour is requested for a countertop, backsplash or wall, add that it must stay uniform with no veining or pattern.
- ALWAYS end with: "Change only the color and material, keep the exact shape and geometry of the edited element, and keep everything else in the image exactly identical — do not add, remove or invent anything else (no added lights, spotlights, objects or decor)."
- If the request is too vague to know which element to change or what to do, output exactly: UNCLEAR
- Output ONLY the instruction text, no quotes, no explanation.`;

/** Texte LIBRE → consigne propre via gpt-4o-mini. null = trop vague (reposer une question). */
export async function reformulateFreeText(freeText: string): Promise<string | null> {
  const raw = freeText.trim();
  if (!raw) return null;

  const fallback = `${raw}. ${KEEP_REST}`;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallback; // pas d'IA dispo → best effort

  const model = process.env.OPENAI_MODEL_CHEAP || 'gpt-4o-mini';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: raw },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const out = data?.choices?.[0]?.message?.content?.trim();
    if (!out) return fallback;
    if (/^unclear/i.test(out)) return null;
    return out;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
