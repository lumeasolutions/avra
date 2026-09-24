/**
 * google-segment.ts — Detection des zones d'une cuisine par segmentation Gemini.
 *
 * POURQUOI (audit du 24/09/2026)
 * ------------------------------
 * Pour changer la couleur de plusieurs elements en UNE seule generation sans
 * que rien d'autre ne bouge, il faut savoir OU se trouve chaque element. Or
 * aucun modele de generation d'image de Google n'accepte de masque en entree :
 * la preservation y est 100 % textuelle, et les retours terrain sur des
 * cuisines montrent des portes qui se deplacent et des meubles reconstruits.
 * La garantie doit donc venir de NOUS : on genere, puis on ne garde les pixels
 * generes qu'a l'interieur des masques. Ce fichier produit ces masques.
 *
 * ⚠️  MODELE DIFFERENT DE CELUI QUI GENERE. La doc Google est explicite :
 *     « Image segmentation capabilities (returning pixel-level masks for
 *     objects) are not supported in Gemini 3 Pro or Gemini 3 Flash. For
 *     workloads requiring built-in image segmentation, we recommend continuing
 *     to use Gemini 2.5 Flash with thinking turned off. »
 *     On appelle donc gemini-2.5-flash ici, et gemini-3.1-flash-image pour le
 *     rendu. Le surcout est negligeable : moins de 0,002 $ par segmentation.
 *
 * ⚠️  FORMAT DE SORTIE INCERTAIN. La documentation de Google se contredit — une
 *     page decrit le masque comme un polygone de coordonnees normalisees
 *     0-1000, une autre comme un PNG en base64, et le forum officiel rapporte
 *     des jetons « <seg_4><seg_20> » inexploitables, sans reponse de l'editeur.
 *     On ne parie donc sur aucun format : `analyserFormat()` observe ce qui
 *     arrive reellement et le nomme, pour qu'un echec soit lisible plutot que
 *     silencieux.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODELE = process.env.GOOGLE_SEGMENT_MODEL || 'gemini-2.5-flash';
const TIMEOUT_MS = 90_000;

/** Les zones d'une cuisine, dans la langue du modele. */
export const ZONES_CUISINE: Array<{ id: string; libelle: string; fr: string }> = [
  { id: 'facadesBas', libelle: 'the base cabinet fronts (doors and drawer fronts below the countertop)', fr: 'Meubles bas' },
  { id: 'facadesHaut', libelle: 'the wall cabinet fronts (doors above the countertop)', fr: 'Meubles hauts' },
  { id: 'ilot', libelle: 'the kitchen island front panel', fr: 'Îlot' },
  { id: 'poignees', libelle: 'the handles and pulls on the cabinet fronts', fr: 'Poignées' },
  { id: 'planTravail', libelle: 'the countertop work surface', fr: 'Plan de travail' },
  { id: 'credence', libelle: 'the backsplash between the countertop and the wall cabinets', fr: 'Crédence' },
];

export interface ZoneDetectee {
  label: string;
  /** [ymin, xmin, ymax, xmax], normalise 0-1000 — convention Google. */
  box_2d: [number, number, number, number];
  /** Brut, tel que renvoye : le format varie (cf. en-tete). */
  mask: unknown;
}

export interface ResultatSegmentation {
  ok: boolean;
  zones: ZoneDetectee[];
  /** Ce qu'on a REELLEMENT recu comme masque, observe et nomme. */
  formatMasque: 'polygone' | 'png-base64' | 'jetons-seg' | 'booleens' | 'absent' | 'inconnu';
  /** Extrait du masque brut, tronque — pour diagnostiquer sans noyer les logs. */
  apercuMasque?: string;
  brut?: string;
  error?: string;
}

export function isSegmentEnabled(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

/**
 * Nomme le format du masque a partir de ce qui arrive, sans rien presupposer.
 */
export function analyserFormat(mask: unknown): ResultatSegmentation['formatMasque'] {
  if (mask == null || mask === '') return 'absent';
  if (typeof mask === 'string') {
    if (mask.includes('<seg_') || mask.includes('start_of_mask')) return 'jetons-seg';
    if (mask.startsWith('data:image') || /^[A-Za-z0-9+/=\s]{200,}$/.test(mask)) return 'png-base64';
    return 'inconnu';
  }
  if (Array.isArray(mask)) {
    const p = mask[0];
    if (Array.isArray(p) && p.length === 2 && typeof p[0] === 'number') return 'polygone';
    if (typeof p === 'boolean' || Array.isArray(p) && typeof p[0] === 'boolean') return 'booleens';
    return 'inconnu';
  }
  return 'inconnu';
}

/** Le premier bloc JSON d'une reponse, que le modele l'ait entoure de texte ou non. */
function extraireJson(texte: string): unknown | null {
  const nettoye = texte.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const debut = nettoye.search(/[[{]/);
  if (debut < 0) return null;
  const ouvrant = nettoye[debut];
  const fermant = ouvrant === '[' ? ']' : '}';
  const fin = nettoye.lastIndexOf(fermant);
  if (fin <= debut) return null;
  try {
    return JSON.parse(nettoye.slice(debut, fin + 1));
  } catch {
    return null;
  }
}

/**
 * Demande les masques des zones voulues, en UN seul appel.
 *
 * Le prompt reprend mot pour mot la formulation recommandee par Google, qui
 * impose les trois cles box_2d / mask / label — s'en ecarter fait varier le
 * format de sortie.
 */
export async function segmenterZones(
  imageBase64: string,
  mime: string,
  zones: Array<{ id: string; libelle: string }> = ZONES_CUISINE,
  /** Surchargeable : les identifiants Google bougent, et on doit pouvoir
   *  essayer plusieurs candidats sans redeployer a chaque fois. */
  modele: string = MODELE,
): Promise<ResultatSegmentation> {
  if (!isSegmentEnabled()) {
    return { ok: false, zones: [], formatMasque: 'absent', error: 'GOOGLE_AI_API_KEY non configurée.' };
  }

  const liste = zones.map(z => z.libelle).join(', ');
  const prompt =
    `Give the segmentation masks for ${liste}. `
    + 'Output a JSON list of segmentation masks where each entry contains the 2D bounding box in the key '
    + '"box_2d", the segmentation mask in key "mask", and the text label in the key "label". '
    + 'Use these exact labels, one entry per element, and omit an entry entirely if that element is not '
    + `visible in the photograph: ${zones.map(z => z.id).join(', ')}.`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/models/${modele}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_AI_API_KEY as string },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: imageBase64 } }],
        }],
        generationConfig: {
          // « For better results, disable thinking by setting the thinking
          //   level to minimal » — recommandation Google pour la segmentation.
          thinkingConfig: { thinkingBudget: 0 },
          // Les poignees sont de petits objets : Google recommande d'augmenter
          // la resolution d'analyse « when the task requires understanding
          //  intricate details ».
          mediaResolution: 'MEDIA_RESOLUTION_HIGH',
          responseMimeType: 'application/json',
        },
      }),
      signal: ctrl.signal,
    });

    const texte = await res.text();
    if (!res.ok) {
      console.error('[google-segment] HTTP', res.status, texte.slice(0, 400));
      return {
        ok: false, zones: [], formatMasque: 'absent',
        // On remonte le message de Google : un 404 sur un modele present dans
        // la liste veut souvent dire « ce modele n'expose pas generateContent ».
        brut: texte.slice(0, 400),
        error: `Segmentation refusée (${res.status}).`,
      };
    }

    let sortie = '';
    try {
      const j = JSON.parse(texte);
      const parts = j?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) sortie = parts.map((p: { text?: string }) => p?.text ?? '').join('');
    } catch { /* corps inattendu */ }

    const json = extraireJson(sortie);
    if (!Array.isArray(json)) {
      return {
        ok: false, zones: [], formatMasque: 'absent',
        brut: sortie.slice(0, 600),
        error: 'Le modèle n\'a pas renvoyé de liste JSON exploitable.',
      };
    }

    const zonesDetectees = (json as Record<string, unknown>[])
      .filter(z => Array.isArray(z.box_2d) && (z.box_2d as unknown[]).length === 4)
      .map(z => ({
        label: String(z.label ?? ''),
        box_2d: (z.box_2d as number[]).slice(0, 4) as [number, number, number, number],
        mask: z.mask,
      }));

    const premier = zonesDetectees.find(z => z.mask != null)?.mask;
    const apercu = typeof premier === 'string'
      ? premier.slice(0, 120)
      : JSON.stringify(premier ?? null).slice(0, 200);

    return {
      ok: zonesDetectees.length > 0,
      zones: zonesDetectees,
      formatMasque: analyserFormat(premier),
      apercuMasque: apercu,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false, zones: [], formatMasque: 'absent',
      error: aborted ? 'La détection des zones a dépassé le délai.' : 'Détection des zones impossible.',
    };
  } finally {
    clearTimeout(t);
  }
}
