/**
 * google-colors.ts — Changer la couleur de PLUSIEURS elements en UNE generation.
 *
 * LE BESOIN
 * ---------
 * Un cuisiniste coche « meubles hauts », « meubles bas », « plan de travail »,
 * « credence », « poignees », choisit une couleur pour chacun, et obtient une
 * seule image. Pas une generation par element : trop lent, trop cher, et
 * chaque passe supplementaire est une occasion de plus pour le moteur de
 * deplacer quelque chose.
 *
 * CE QUE L'AUDIT A ETABLI (24/09/2026)
 * ------------------------------------
 *  - Aucun modele d'image de Google n'accepte de masque en entree. La
 *    preservation y est 100 % textuelle. Aucune API commerciale, d'ailleurs,
 *    n'accepte une liste [{masque, prompt}] : partout c'est un masque, un
 *    prompt. Le multi-zones en une requete passe donc forcement par la
 *    consigne.
 *  - Google demande des CODES HEXADECIMAUX, pas des noms : « Saying "use our
 *    brand colors" won't work, but specifying hex color #184F35 for all green
 *    elements will. » Et il recommande de lier chaque code a un objet precis.
 *  - Son propre exemple montre pourtant une derive (#1A5238 rendu au lieu de
 *    #184F35). On donne donc les deux canaux — le code ET le nom courant — et
 *    on prevoit une verification de l'ecart cote appelant.
 *  - Pour une edition multi-attributs, Google recommande des ETAPES numerotees
 *    et une formulation POSITIVE (« semantic negative prompts ») : jamais « ne
 *    touche pas a X », toujours « X reste exactement tel qu'il est ».
 *
 * La garantie « rien d'autre ne bouge » ne vient donc pas d'ici : elle vient du
 * recollage sous masque, cote appelant. Ce fichier fait la meilleure demande
 * possible, il ne promet pas l'invariance.
 */

import { ratioProche } from './google-image-api';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODELE = process.env.GOOGLE_IMAGE_MODEL || 'gemini-3.1-flash-image';
const TIMEOUT_MS = 180_000;

export type TailleCouleur = '1K' | '2K' | '4K';

/** Les elements recolorisables, et comment les nommer au modele. */
export const ELEMENTS_COULEUR: Array<{ id: string; fr: string; en: string }> = [
  { id: 'facadesHaut', fr: 'Meubles hauts', en: 'the wall cabinet fronts, that is every door above the countertop' },
  { id: 'facadesBas', fr: 'Meubles bas', en: 'the base cabinet fronts, that is every door and every drawer front below the countertop' },
  { id: 'ilot', fr: 'Îlot', en: 'the front panel and the fronts of the island' },
  { id: 'planTravail', fr: 'Plan de travail', en: 'every countertop work surface, the island one as well as the back one' },
  { id: 'credence', fr: 'Crédence', en: 'the backsplash between the countertop and the wall cabinets' },
  { id: 'poignees', fr: 'Poignées', en: 'the handles and pulls on the cabinet fronts' },
];

export interface ChoixCouleur {
  id: string;
  /** Code hexadecimal vise, ex. « #1B3254 ». */
  hex: string;
  /** Nom courant, ex. « bleu nuit mat » — donne en plus du code, pas a la place. */
  nom?: string;
  /** Finition, ex. « mat », « satine », « brillant ». */
  finition?: string;
}

export interface ResultatCouleurs {
  ok: boolean;
  base64?: string;
  prompt: string;
  modele: string;
  error?: string;
}

export function isRecolorEnabled(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

/** « a, b et c » — une liste qui se lit, pas un tableau. */
function enumerer(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * La consigne : etapes numerotees, formulation positive, un code hexa par
 * element, et l'enumeration explicite de ce qui reste identique.
 */
export function buildPromptCouleurs(choix: ChoixCouleur[]): string {
  const connus = choix
    .map(c => ({ ...c, def: ELEMENTS_COULEUR.find(e => e.id === c.id) }))
    .filter(c => c.def && /^#[0-9a-f]{6}$/i.test(c.hex));

  const etapes = connus.map((c, i) => {
    const finition = c.finition ? `, in a ${c.finition} finish` : '';
    const nom = c.nom ? ` (${c.nom})` : '';
    return `${i + 1}. Repaint ${c.def!.en} in the exact colour ${c.hex.toUpperCase()}${nom}${finition}.`;
  });

  // Ce qui n'est PAS repeint, nomme element par element. Lecon mesuree le
  // 24/09 sur le Rendu Realiste : une interdiction NOMMEE est respectee
  // (+86 % de fidelite sur une scene), une interdiction generale ne l'est pas.
  const intacts = ELEMENTS_COULEUR
    .filter(e => !connus.some(c => c.id === e.id))
    .map(e => e.en);

  const phrases: string[] = [
    'This is a photograph of a real kitchen. Produce the same photograph again, repainted.',
    'You are repainting surfaces, not redesigning the kitchen: the camera does not move, the framing does not change, '
    + 'and every cabinet, drawer, appliance, tap, window and object keeps exactly the shape, the size and the place it has in this photograph.',
    `Apply these colour changes, and only these: ${etapes.join(' ')}`,
    'Each colour goes only on the surface its step names, edge to edge, with no colour spilling onto a neighbouring surface.',
  ];

  if (intacts.length > 0) {
    phrases.push(`${enumerer(intacts)} keep the exact colour, material and finish they already have in the photograph.`);
  }

  phrases.push(
    'Everything else in the room stays exactly as it is: the walls, the ceiling, the floor, the worktop objects, '
    + 'the plants, the light fittings and the view through the windows.',
  );
  phrases.push(
    'Keep the lighting of the photograph: the same daylight, the same shadows under the cabinets, the same reflections. '
    + 'The repainted surfaces keep their own shading — a door in shadow stays in shadow, in the new colour.',
  );
  phrases.push('The result is a photograph, sharp, with the grain and the finish of real painted surfaces.');

  return phrases.join(' ');
}

function extraireImage(json: unknown): string | null {
  const j = json as Record<string, any>;
  const parts = j?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const p of parts) {
      const d = p?.inlineData?.data ?? p?.inline_data?.data;
      if (typeof d === 'string' && d.length > 100) return d;
    }
  }
  const direct = j?.interaction?.output_image?.data;
  return typeof direct === 'string' && direct.length > 100 ? direct : null;
}

/**
 * Une seule generation, quel que soit le nombre d'elements coches.
 */
export async function recolorerAvecGoogle(
  sourceBase64: string,
  mime: string,
  choix: ChoixCouleur[],
  taille: TailleCouleur,
  largeur: number,
  hauteur: number,
): Promise<ResultatCouleurs> {
  const prompt = buildPromptCouleurs(choix);

  if (!isRecolorEnabled()) {
    return { ok: true, base64: sourceBase64, prompt: `${prompt} [MODE DÉMO]`, modele: 'mock' };
  }

  const ratio = ratioProche(largeur, hauteur);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/models/${MODELE}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_AI_API_KEY as string },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: sourceBase64 } }],
        }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: ratio, imageSize: taille },
        },
      }),
      signal: ctrl.signal,
    });

    const texte = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(texte); } catch { /* corps inattendu */ }

    const b64 = res.ok ? extraireImage(json) : null;
    if (b64) return { ok: true, base64: b64, prompt, modele: MODELE };

    console.error('[google-colors] échec', res.status, texte.slice(0, 400));
    const brut = texte.toLowerCase();
    const message = brut.includes('quota') || brut.includes('rate limit')
      ? 'Quota de rendus atteint pour le moment. Réessayez dans quelques minutes.'
      : 'La recolorisation n\'a pas abouti. Réessayez dans un instant.';
    return { ok: false, prompt, modele: MODELE, error: message };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false, prompt, modele: MODELE,
      error: aborted ? 'La recolorisation a dépassé le délai.' : 'Recolorisation impossible.',
    };
  } finally {
    clearTimeout(t);
  }
}
