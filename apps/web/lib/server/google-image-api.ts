/**
 * google-image-api.ts — 2e moteur du module « Rendu Réaliste », pour comparer.
 *
 * POURQUOI CE FICHIER (24/09/2026)
 * --------------------------------
 * Le Rendu Réaliste tourne sur MyArchitectAI. Sept essais mesurés sur une
 * cuisine photoréaliste ont montré deux défauts que la consigne ne corrige
 * pas, parce qu'ils sont structurels :
 *
 *   1. MATIÈRE INFIDÈLE. /change-textures reçoit un échantillon réel et
 *      réinvente le motif : veines de marbre sorties en grille de lignes
 *      droites sur un plan de travail, veines dorées au lieu de blanches sur
 *      une crédence, craquelures inventées sur un béton parfaitement uni. La
 *      consigne interdit pourtant tout cela explicitement.
 *   2. NETTETÉ. Les sorties sont en 1K. Recollées dans une source 4K, la zone
 *      modifiée perd 68 à 84 % de netteté (variance du laplacien, mesurée).
 *
 * Gemini 3.1 Flash Image attaque les deux : conditionnement par images de
 * référence en natif (jusqu'à 14), et sortie jusqu'en 4K. On le branche donc
 * sur un onglet JUMEAU du Rendu Réaliste — même interface, même photo, mêmes
 * champs — pour comparer à l'identique plutôt qu'à l'estime.
 *
 * ⚠️  DEUX FORMES DE REQUÊTE. La documentation publique donne deux formats
 *     contradictoires (POST /v1beta/interactions avec `input[]`/`response_format`,
 *     et le classique models/{id}:generateContent avec `contents[].parts[]`).
 *     N'ayant pas pu tester avant de livrer (clé absente), on tente les deux
 *     dans l'ordre et on remonte l'erreur BRUTE de chacune — plutôt que de
 *     parier sur un nom de champ et de perdre un cycle de déploiement.
 *
 * ⚙️  Une seule variable pour activer : GOOGLE_AI_API_KEY.
 *     Sans elle → mode démo (renvoie l'image source), comme MyArchitectAI.
 */

import type { ArchitectParams, ArchitectResult } from './myarchitect-api';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Modèle surchargeable sans redéploiement, au cas où l'id bouge (preview). */
const MODELE = process.env.GOOGLE_IMAGE_MODEL || 'gemini-3.1-flash-image';

/** 2K par défaut ; 4K quand l'utilisateur coche « Haute définition ». */
export type TailleImage = '1K' | '2K' | '4K';

const TIMEOUT_MS = 180_000;

export function isGoogleImageEnabled(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

/* ─────────────────────────────────────────────────────────────────────────
   CONSIGNE
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Libellés des champs, dans la langue du moteur.
 *
 * On ne réutilise PAS buildArchitectPrompt() de myarchitect-api : cette
 * consigne-là est écrite pour un moteur qui RE-REND la scène à partir d'une
 * description (d'où la description /auto-prompt placée en tête, et tout
 * l'échafaudage de filtrage qu'elle impose). Gemini, lui, VOIT la photo : la
 * bonne formulation est une consigne d'édition — « garde tout, change ceci » —
 * et elle n'a besoin d'aucune description préalable. C'est précisément
 * l'avantage structurel qu'on veut mesurer.
 */
const CHAMPS: Array<{ cle: keyof ArchitectParams; libelle: string }> = [
  { cle: 'facades', libelle: 'the cabinet fronts' },
  { cle: 'facadesBas', libelle: 'the base cabinet fronts' },
  { cle: 'facadesHaut', libelle: 'the wall cabinet fronts' },
  { cle: 'planTravail', libelle: 'every countertop surface, the island as well as the back counter' },
  { cle: 'credence', libelle: 'the backsplash' },
  { cle: 'evier', libelle: 'the sink' },
  { cle: 'poignees', libelle: 'the handles and pulls' },
  { cle: 'sol', libelle: 'the floor' },
  { cle: 'murs', libelle: 'the walls' },
];

const COOKTOP: Record<string, string> = {
  induction: 'a flush induction hob',
  gas: 'a gas hob with cast-iron pan supports',
  downdraft: 'a hob with an integrated downdraft extractor',
};

/** « a, b and c » — la liste se lit comme une phrase, pas comme un tableau. */
function enumerer(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Consigne en PROSE NARRATIVE — c'est la recommandation explicite de Google
 * pour ses modèles image : « a simple list of keywords won't cut it; you need
 * to describe the scene narratively ». Ma première version énumérait
 * « élément → matière » séparés par des points-virgules : exactement la liste
 * de mots-clés qu'ils déconseillent. Réécrite en phrases.
 *
 * Pour les échantillons, Google donne une formule :
 *   [images de référence] + [instruction de relation] + [nouvelle scène]
 * avec obligation de dire ce qu'on extrait de chaque référence (« use this as
 * texture », « use this as structure »). C'est ce que fait le paragraphe
 * « material samples » ci-dessous.
 */
export function buildGooglePrompt(params: ArchitectParams, nbEchantillons: number): string {
  const changements: string[] = [];
  for (const { cle, libelle } of CHAMPS) {
    const v = params[cle];
    if (typeof v === 'string' && v.trim()) changements.push(`${libelle} in ${v.trim()}`);
  }
  if (params.cooktop && COOKTOP[params.cooktop]) {
    changements.push(`the cooktop replaced by ${COOKTOP[params.cooktop]}`);
  }

  const lieu = params.mode === 'exterior' ? 'building' : 'room';
  const elements = params.mode === 'exterior'
    ? 'every volume, opening, window, door, roofline and planting'
    : 'every wall, window, opening, cabinet, appliance, tap, plant and object';

  const phrases: string[] = [
    `The first image is a photograph of a real ${lieu}. Recreate that same photograph: the same camera position, the same framing, the same perspective, the same proportions.`,
    `In your result, ${elements} stays exactly where it is, at exactly the same size and the same shape.`,
    'Nothing new may appear — no niche, no shelf, no glass front, no decoration, no opening that is not already in the photograph — and nothing that is there may disappear.',
  ];

  if (changements.length > 0) {
    phrases.push(`What you do change is the finishes, and only those: ${enumerer(changements)}.`);
    phrases.push('Every surface not named in that sentence keeps the exact colour, material and finish it already has in the photograph.');
  }

  if (nbEchantillons > 0) {
    // Le défaut qui fait échouer MyArchitectAI : le motif est réinventé au lieu
    // d'être recopié. On l'attaque de front, sur les deux axes — échelle du
    // motif, et absence de motif inventé sur un échantillon uni.
    const pluriel = nbEchantillons > 1;
    phrases.push(
      `The ${pluriel ? `${nbEchantillons} images that follow the photograph are` : 'second image is a'} `
      + `photograph${pluriel ? 's' : ''} of ${pluriel ? 'physical material samples' : 'a physical material sample'} `
      + `supplied by the manufacturer. Use ${pluriel ? 'them' : 'it'} as the texture for the finishes listed above, `
      + `${pluriel ? 'each sample matching the finishes in the order they are named' : 'applied to the finish it corresponds to'}.`,
    );
    phrases.push(
      'Reproduce each sample exactly: the same colour, the same pattern, the same finish, at its real-world scale. '
      + 'Veins, grain, joints and speckles must keep the size and the density they have in the sample — '
      + 'do not enlarge them, do not stretch them, do not stylise them, and never turn them into a regular grid of straight lines. '
      + 'If a sample is plain and uniform, the result must stay plain and uniform: invent no veins, no cracks and no stains.',
    );
  }

  if (params.ambiance && params.ambiance.trim()) {
    phrases.push(`Light the ${lieu} with ${params.ambiance.trim()}. Change the light alone — never the geometry, never the materials.`);
  }

  phrases.push(`The result is a photorealistic photograph of that ${lieu}, sharp, with fine material detail.`);
  return phrases.join(' ');
}

/* ─────────────────────────────────────────────────────────────────────────
   APPEL
   ───────────────────────────────────────────────────────────────────────── */

interface ImageEntree {
  base64: string;
  mime: string;
}

/** Ratio le plus proche parmi ceux acceptés, pour ne pas recadrer la photo. */
export function ratioProche(largeur: number, hauteur: number): string {
  const acceptes: Array<[string, number]> = [
    ['1:1', 1], ['3:2', 1.5], ['2:3', 2 / 3], ['3:4', .75], ['4:3', 4 / 3],
    ['4:5', .8], ['5:4', 1.25], ['9:16', .5625], ['16:9', 16 / 9], ['21:9', 21 / 9],
  ];
  const r = largeur / hauteur;
  return acceptes.reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a))[0];
}

function extraireBase64(json: unknown): string | null {
  // Les deux formes de réponse documentées, plus la forme candidates[] classique.
  const j = json as Record<string, any>;
  const direct = j?.interaction?.output_image?.data ?? j?.output_image?.data;
  if (typeof direct === 'string' && direct.length > 100) return direct;

  const parts = j?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const p of parts) {
      const d = p?.inlineData?.data ?? p?.inline_data?.data;
      if (typeof d === 'string' && d.length > 100) return d;
    }
  }
  return null;
}

function messageErreur(json: unknown, statut: number): string {
  const j = json as Record<string, any>;
  const m = j?.error?.message ?? j?.message;
  return typeof m === 'string' && m ? `${statut} — ${m}` : `HTTP ${statut}`;
}

async function poster(chemin: string, corps: unknown, cle: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${chemin}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle },
      body: JSON.stringify(corps),
      signal: ctrl.signal,
    });
    const texte = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(texte); } catch { /* corps non-JSON */ }
    return { ok: res.ok, statut: res.status, json, texte };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Génère un rendu avec Gemini 3.1 Flash Image.
 *
 * @param source        photo/plan source (base64 + mime)
 * @param echantillons  échantillons de matière fournis par l'utilisateur (0 à 13)
 * @param taille        résolution de sortie demandée
 * @param ratio         ratio d'aspect de la source, pour ne pas la recadrer
 */
export async function generateGoogleRender(
  params: ArchitectParams,
  source: ImageEntree,
  echantillons: ImageEntree[],
  taille: TailleImage,
  ratio: string,
): Promise<ArchitectResult & { base64?: string }> {
  // Google annonce « up to 10 images of objects with high-fidelity ». Au-delà,
  // la fidélité de chaque référence n'est plus garantie — or c'est exactement
  // ce qu'on vient chercher. On plafonne donc à 10 images AU TOTAL, photo
  // comprise : 9 échantillons. (Le chiffre de 14 cité ailleurs concerne le
  // nombre de références mélangeables, pas le régime haute fidélité.)
  const retenus = echantillons.slice(0, 9);
  const prompt = buildGooglePrompt(params, retenus.length);

  if (!isGoogleImageEnabled()) {
    return {
      success: true,
      imageUrls: [],
      base64: source.base64,
      prompt: `${prompt} [MODE DÉMO — GOOGLE_AI_API_KEY non configurée]`,
      endpoint: 'mock',
      upscaled: false,
    };
  }
  const cle = process.env.GOOGLE_AI_API_KEY as string;
  const images = [source, ...retenus];
  const echecs: string[] = [];

  // ── Forme A : /v1beta/interactions (format « input[] / response_format »)
  const a = await poster('/interactions', {
    model: MODELE,
    input: [
      { type: 'text', text: prompt },
      ...images.map(i => ({ type: 'image', mime_type: i.mime, data: i.base64 })),
    ],
    response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: ratio, image_size: taille },
  }, cle);
  const b64a = a.ok ? extraireBase64(a.json) : null;
  if (b64a) {
    return { success: true, imageUrls: [], base64: b64a, prompt, endpoint: `google/${MODELE}/interactions`, upscaled: taille === '4K' };
  }
  echecs.push(`interactions: ${a.ok ? 'réponse sans image' : messageErreur(a.json, a.statut)}`);

  // ── Forme B : models/{id}:generateContent (format historique)
  const b = await poster(`/models/${MODELE}:generateContent`, {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        ...images.map(i => ({ inline_data: { mime_type: i.mime, data: i.base64 } })),
      ],
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: ratio, imageSize: taille },
    },
  }, cle);
  const b64b = b.ok ? extraireBase64(b.json) : null;
  if (b64b) {
    return { success: true, imageUrls: [], base64: b64b, prompt, endpoint: `google/${MODELE}/generateContent`, upscaled: taille === '4K' };
  }
  echecs.push(`generateContent: ${b.ok ? 'réponse sans image' : messageErreur(b.json, b.statut)}`);

  return {
    success: false,
    imageUrls: [],
    prompt,
    endpoint: `google/${MODELE}`,
    upscaled: false,
    error: `Le moteur Google n'a renvoyé aucune image. ${echecs.join(' | ')}`,
  };
}
