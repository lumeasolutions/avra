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
  { cle: 'facades', libelle: 'the cabinet fronts (all of them)' },
  { cle: 'facadesBas', libelle: 'the base cabinet fronts only' },
  { cle: 'facadesHaut', libelle: 'the wall/upper cabinet fronts only' },
  { cle: 'planTravail', libelle: 'every countertop surface, including the island and the back counter' },
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

export function buildGooglePrompt(params: ArchitectParams, avecEchantillon: boolean): string {
  const changements: string[] = [];
  for (const { cle, libelle } of CHAMPS) {
    const v = params[cle];
    if (typeof v === 'string' && v.trim()) changements.push(`${libelle} → ${v.trim()}`);
  }
  if (params.cooktop && COOKTOP[params.cooktop]) {
    changements.push(`the cooktop → ${COOKTOP[params.cooktop]}`);
  }

  const lieu = params.mode === 'exterior' ? 'building' : 'room';
  const phrases: string[] = [
    `This is a photograph of a real ${lieu}. Return the same photograph, from the same camera position, with the same framing.`,
    'Every wall, opening, window, cabinet, appliance, accessory, plant and object stays exactly where it is, at exactly the same size and shape.',
    'Do not add anything that is not already visible. Do not remove anything. Do not invent niches, shelves, glass fronts, decorations or openings.',
  ];

  if (changements.length > 0) {
    phrases.push(`Change only these finishes, each one applied only to the element it names: ${changements.join('; ')}.`);
    phrases.push('Everything not listed above keeps its current colour, material and finish, untouched.');
  }

  if (avecEchantillon) {
    // Le point qui fait échouer MyArchitectAI : le motif est réinventé au lieu
    // d'être recopié. On l'attaque de front, et sur les deux axes (échelle ET
    // absence de motif inventé sur un échantillon uni).
    phrases.push(
      'The second image is a physical material sample supplied by the manufacturer. '
      + 'Reproduce it exactly: same colour, same pattern, same finish. '
      + 'Keep the pattern at its real-world scale — veins, grain, joints and speckles must not be enlarged, '
      + 'stretched, stylised or turned into a regular grid. '
      + 'If the sample is plain and uniform, the result must stay plain and uniform: invent no veins, no cracks, no stains.',
    );
  }

  if (params.ambiance && params.ambiance.trim()) {
    phrases.push(`Lighting atmosphere: ${params.ambiance.trim()}. Change the light only — never the geometry or the materials.`);
  }

  phrases.push('Photorealistic, sharp, fine material detail.');
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
  const prompt = buildGooglePrompt(params, echantillons.length > 0);

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
  const images = [source, ...echantillons.slice(0, 13)];
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
