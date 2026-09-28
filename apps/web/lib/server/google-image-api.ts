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

  /**
   * Le cadrage, attaqué de front.
   *
   * 24/09/2026 — sur les cinq essais faits en direct dans l'interface, Google
   * a recadré CINQ fois sur cinq : vue plus large, angle légèrement différent,
   * éléments qui entrent dans le champ. Le paramètre d'aspect, lui, est bien
   * respecté (1232x830 → 3:2, 1280x655 → 16:9, vérifié) : le recadrage est
   * donc un choix du modèle, pas un réglage manquant.
   *
   * Et c'est un biais assumé de l'outil : le guide de Google formule ses
   * références comme « [images] + [relation] + [NOUVELLE SCÈNE] ». Il pousse
   * à transformer, pas à préserver le point de vue. On le contre avec du
   * vocabulaire de photographe — position, focale, hauteur, lignes de fuite,
   * bords du cadre — plutôt qu'avec un « garde le cadrage » que le modèle
   * interprète librement.
   */
  const cadrage = [
    'The photograph you produce is taken from the exact same camera position as the first image:',
    'same viewpoint, same lens and focal length, same camera height, same tilt.',
    'The four edges of your image show exactly what the four edges of the first image show —',
    'nothing enters the frame that was not already visible, nothing leaves it, and you do not step back, zoom or pan.',
    'Vertical lines stay vertical, and the vanishing lines of the floor, the ceiling and the cabinet fronts',
    'converge exactly where they converge in the first image.',
  ].join(' ');

  const phrases: string[] = [];

  /**
   * La nature de la source est arbitrée par le moteur, pas par nous.
   *
   * POURQUOI ON NE DÉCIDE PLUS À SA PLACE
   * -------------------------------------
   * Deux branches manuelles cohabitaient, choisies par une case à cocher, et
   * elles ont produit les deux régressions de la semaine : la branche
   * « export 3D plat » appliquée à un rendu déjà fini l'assombrissait, et la
   * branche de préservation, posée en défaut le 27/09, renvoyait une copie —
   * « ça me ressort exactement ma 3D », 28/09.
   *
   * Une détection automatique par statistiques d'image a été mesurée le
   * 28/09 sur douze images : platitude locale, grain résiduel, entropie de
   * luminance, part de hautes lumières cramées, pic d'histogramme. Aucun de
   * ces indicateurs ne sépare un export 3D plat d'un rendu abouti — les
   * sorties du moteur, qui sont des rendus finis par construction, tombent au
   * milieu de la plage des sources. Un classifieur là-dessus se tromperait
   * sans qu'on puisse le voir.
   *
   * On décrit donc les deux cas au moteur, qui lui voit l'image, et on lui
   * laisse choisir. La contrainte de sortie est identique dans les deux cas —
   * une image plus photographique que l'entrée — ce qui rend une erreur
   * d'appréciation de sa part sans conséquence.
   */
  phrases.push(
    `The first image is ${params.mode === 'exterior' ? 'an exterior view' : 'an interior view'} of a real `
    + `${lieu} designed by a professional. It is either a flat 3D export — simplified materials, `
    + 'even lighting, no grain — or an already finished render with its own lighting. Judge which one it is, '
    + 'and treat it accordingly.',
  );
  phrases.push(
    'If it is a flat export, build the real light: directional daylight consistent with the windows you can see, '
    + 'soft shadows, contact shadows, and the falloff of a real room. '
    + 'If it is already a finished render, keep its lighting exactly as it is — same direction, same softness, '
    + 'same time of day — and correct only what is objectively wrong, such as a blown-out window or a crushed shadow.',
  );
  phrases.push(
    'In both cases the result must be visibly more photographic than the first image, and never a copy of it. '
    + 'Materials gain their real texture and grain: the figure of the wood, the weave of the fabric, '
    + 'the crystalline depth of the stone, the specularity of the metal, the softness of a matt lacquer. '
    + 'Surfaces gain believable micro-reflections and contact shadows where they meet. '
    + 'Edges are crisp, and the image has the depth of field and the micro-contrast of a real camera. '
    + 'The design does not change — its rendering quality does, and visibly so.',
  );
  /**
   * Règle d'abstention.
   *
   * Les deux essais ratés du 28/09 partaient de sources très claires, presque
   * cramées. Le moteur, faute d'information, a comblé : crédence blanche
   * devenue béton gris, suspension remplacée par un autre luminaire. On lui
   * dit donc explicitement quoi faire du manque d'information — le garder,
   * pas l'inventer.
   */
  phrases.push(
    'Where the first image is overexposed, washed out, blurred or simply lacks detail, you keep exactly what is '
    + 'there and you invent nothing to fill it. A blown-out window stays a bright window. A surface you cannot '
    + 'read stays plain, in the colour it appears to be. An object whose shape you cannot make out is redrawn as '
    + 'the same indistinct object, never replaced by a different one that you can imagine more easily. '
    + 'Missing information is not an invitation.',
  );

  phrases.push(
    'Colour is not yours to reinterpret. Every surface keeps the exact hue it has in the first image: '
    + 'a white front stays that same white, not beige, not cream, not ivory. '
    + 'You do not push the image towards yellow, orange or gold, and you add no golden hour. '
    + 'You add no lamp, no light fitting and no light source that is not already visible in the first image, '
    + 'and you remove none either.',
  );

  phrases.push(cadrage);
  phrases.push(`${elements[0].toUpperCase()}${elements.slice(1)} stays exactly where it is, at exactly the same size and the same shape.`);

  /**
   * L'enveloppe de la pièce, traitée à part.
   *
   * Demande explicite du 24/09 : murs, sol et plafond doivent être les mêmes,
   * et rien ne doit être ajouté. Sur nos cinq essais, le modèle a remplacé une
   * porte-fenêtre par une grande baie vitrée, ajouté des plantes, un panier et
   * des cadres qui ne sont dans aucun plan. On ne lui dit donc pas « ne change
   * pas la pièce » — formule qu'il interprète largement — mais on énumère
   * surface par surface, et on nomme précisément ce qu'il a l'habitude
   * d'ajouter. Une interdiction nommée se respecte mieux qu'une interdiction
   * générale.
   */
  if (params.mode === 'interior') {
    phrases.push(
      'The shell of the room is not yours to redesign. '
      + 'The walls keep their exact number, position, length and angle, and the openings in them — windows, doors, passageways — '
      + 'keep their exact position, size, shape and frame; a French door stays a French door and does not become a glazed bay. '
      + 'The ceiling keeps its exact height, its beams, its bulkheads and its spotlights. '
      + 'The floor keeps its exact level and its exact material, with the boards or joints running in the same direction.',
    );
  } else {
    phrases.push(
      'The shell of the building is not yours to redesign. '
      + 'Volumes, roofline, openings and their frames keep their exact position, size and shape.',
    );
  }

  phrases.push(
    'Add nothing at all. No plant, no vase, no basket, no rug, no cushion, no artwork or framed picture, no extra lamp, '
    + 'no stool, no chair, no furniture, no tableware, no food, no person and no animal that is not already visible in the first image. '
    + 'Invent no niche, no open shelf, no glass front and no opening. '
    + 'Remove nothing either: every object already visible stays, in the same place.',
  );

  /**
   * L'inventaire des equipements, nomme piece par piece.
   *
   * Leçon mesuree le 24/09 : sur le bureau, enumerer ce qu'il ne devait pas
   * toucher a fait passer la fidelite de 0,307 a 0,557 — la baie vitree
   * inventee, le panier et les poignees barres ont disparu. Sur la cuisine,
   * ou la consigne restait generale, il a repeint le refrigerateur gris
   * fonce en blanc. Une interdiction NOMMEE est respectee, une interdiction
   * generale ne l'est pas. On nomme donc tout.
   *
   * Et on retire de la liste ce que l'utilisateur demande justement de
   * changer : lui dire « garde les poignees identiques » alors qu'il vient
   * de demander du laiton brosse, ce serait se contredire dans la meme
   * consigne.
   */
  const EQUIPEMENTS: Array<{ libelle: string; sauf?: Array<keyof ArchitectParams> }> = [
    { libelle: 'the handles, knobs and pulls', sauf: ['poignees'] },
    { libelle: 'the sink and the drainer', sauf: ['evier'] },
    { libelle: 'the taps and mixers', sauf: ['evier'] },
    { libelle: 'the hob', sauf: ['cooktop'] },
    { libelle: 'the extractor hood' },
    { libelle: 'the ovens, the microwave and the built-in appliances, with their exact colour and finish' },
    { libelle: 'the fridge and the wine cooler, with their exact colour and finish' },
    { libelle: 'the windows and their frames, glazing bars and colour' },
    { libelle: 'the doors, the door frames and the door handles' },
    { libelle: 'the light fittings, the pendants and their rails' },
    { libelle: 'the sockets, switches and radiators' },
    { libelle: 'the plinths and the skirting boards' },
  ];
  const inchanges = EQUIPEMENTS
    .filter(e => !(e.sauf ?? []).some(k => {
      const v = params[k];
      return typeof v === 'string' ? v.trim().length > 0 : !!v;
    }))
    .map(e => e.libelle);

  if (inchanges.length > 0) {
    phrases.push(
      `These stay exactly as they are in the first image — same model, same shape, same size, same position, `
      + `same colour and same finish: ${enumerer(inchanges)}. `
      + `You render them as real photographed objects, but you do not redesign them and you do not repaint them.`,
    );
  }

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

  /**
   * La dernière phrase est celle qui pèse le plus. Elle finissait sur un
   * « produis une photographie » générique, qui rouvrait la liberté que tout
   * le reste de la consigne venait de fermer. Elle referme désormais.
   */
  phrases.push(
    `The result is a photorealistic photograph of that ${lieu}, sharp, with fine material detail. `
    + 'Before you output it, check these three things against the first image, because they are the ones that '
    + 'get changed by mistake: the light fittings are the same fittings, of the same shape and the same number; '
    + 'the splashback and the wall behind the worktop are the same colour and the same material; '
    + 'the cabinet fronts are the same colour. '
    + 'If any of the three differs, you have redesigned the room instead of photographing it.',
  );
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
/**
 * Reglages de generation, en cours d'evaluation (28/09/2026).
 *
 * `thinking_level` est documente pour gemini-3.1-flash-image : `minimal` par
 * defaut, `high` disponible. On etait donc au niveau le plus bas sans l'avoir
 * choisi. `temperature` et `seed` sont documentes dans GenerationConfig mais
 * la page image ne dit pas s'ils sont honores par ce modele — d'ou la mesure.
 */
export interface ReglagesGeneration {
  temperature?: number;
  seed?: number;
  thinkingLevel?: 'minimal' | 'high';
}

export async function generateGoogleRender(
  params: ArchitectParams,
  source: ImageEntree,
  echantillons: ImageEntree[],
  taille: TailleImage,
  ratio: string,
  reglages: ReglagesGeneration = {},
): Promise<ArchitectResult & { base64?: string; detail?: string }> {
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

  // ── Forme A : models/{id}:generateContent — c'est CELLE qui répond.
  //    On l'essayait en second parce que la doc publique mettait /interactions
  //    en avant ; les cinq rendus du 24/09 ont tranché : generateContent passe,
  //    /interactions échoue à chaque fois. Inverser l'ordre économise un
  //    aller-retour réseau par rendu et supprime une ligne d'erreur trompeuse
  //    dans les diagnostics.
  const a = await poster(`/models/${MODELE}:generateContent`, {
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
      ...(reglages.temperature !== undefined ? { temperature: reglages.temperature } : {}),
      ...(reglages.seed !== undefined ? { seed: reglages.seed } : {}),
      ...(reglages.thinkingLevel ? { thinkingConfig: { thinkingLevel: reglages.thinkingLevel } } : {}),
    },
  }, cle);
  const b64a = a.ok ? extraireBase64(a.json) : null;
  if (b64a) {
    return { success: true, imageUrls: [], base64: b64a, prompt, endpoint: `google/${MODELE}/generateContent`, upscaled: taille === '4K' };
  }
  echecs.push(`generateContent: ${a.ok ? 'réponse sans image' : messageErreur(a.json, a.statut)}`);

  // ── Forme B : /v1beta/interactions — repli, au cas où l'éditeur bascule.
  const b = await poster('/interactions', {
    model: MODELE,
    input: [
      { type: 'text', text: prompt },
      ...images.map(i => ({ type: 'image', mime_type: i.mime, data: i.base64 })),
    ],
    response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: ratio, image_size: taille },
  }, cle);
  const b64b = b.ok ? extraireBase64(b.json) : null;
  if (b64b) {
    return { success: true, imageUrls: [], base64: b64b, prompt, endpoint: `google/${MODELE}/interactions`, upscaled: taille === '4K' };
  }
  echecs.push(`interactions: ${b.ok ? 'réponse sans image' : messageErreur(b.json, b.statut)}`);

  /**
   * Message utilisateur : ni nom de fournisseur, ni erreur brute.
   *
   * Jusqu'ici on renvoyait tel quel « Le moteur Google n'a renvoyé aucune
   * image. interactions: 429 — Rate limit exceeded for model
   * gemini-3.1-flash-image… ». Ce texte est stocké en base et réaffiché dans
   * l'historique — donc potentiellement devant un client. Le détail reste
   * utile, mais pour nous : il part dans les logs serveur ET dans `detail`,
   * que l'appelant range dans le job (`params.debug`).
   *
   * Les logs Vercel Hobby ne remontent qu'à une heure : sans ce champ, un
   * échec signalé le lendemain n'est plus diagnosticable.
   */
  console.error('[google-image-api] échec:', echecs.join(' | '));

  const brut = echecs.join(' ').toLowerCase();
  const message = brut.includes('429') || brut.includes('quota') || brut.includes('rate limit')
    ? 'Quota de rendus atteint pour le moment. Réessayez dans quelques minutes.'
    : brut.includes('safety') || brut.includes('blocked')
      ? 'L\'image source a été refusée par le moteur de rendu. Essayez une autre vue.'
      : 'Le rendu n\'a pas abouti. Réessayez dans un instant.';

  return {
    success: false,
    imageUrls: [],
    prompt,
    endpoint: `google/${MODELE}`,
    upscaled: false,
    error: message,
    detail: echecs.join(' | '),
  };
}
