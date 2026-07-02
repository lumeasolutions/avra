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
  'Keep everything else in the image exactly identical: the layout, the camera angle, every other surface, all objects and accessories, and do not add, remove, move or invent anything else.';

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

const SYSTEM_PROMPT = `You convert a French kitchen-render retouch request into ONE precise, atomic image-editing instruction in English for an image-editing model.

Rules:
- Describe ONLY the single change requested. If several changes are asked, keep only the main one.
- Be specific about WHICH element changes (e.g. "the upper wall cabinets", "the worktop", "the backsplash").
- If a plain or matte colour is requested for a countertop, backsplash or wall, add that it must stay uniform with no veining or pattern.
- ALWAYS end with: "Keep everything else in the image exactly identical, do not add, remove or invent anything else."
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
