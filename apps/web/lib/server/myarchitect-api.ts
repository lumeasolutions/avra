/**
 * myarchitect-api.ts — Wrapper serveur pour l'API MyArchitectAI
 *
 * Moteur de rendu photoréaliste alternatif (≠ fal.ai/Flux). Utilisé par le
 * module « IA Architect » de l'IA Studio. MyArchitectAI transforme une image
 * source (plan, rendu 3D, sketch, photo) en rendu photoréaliste via un appel
 * HTTP simple, facturé à l'usage (~0,03 $/rendu).
 *
 * Doc officielle : https://www.myarchitectai.com/api
 * Référence API  : https://portal.myarchitectai.com/docs
 *
 * Endpoints utilisés :
 *   POST /v1/render/interior   { image, outputFormat, prompt? }       → 0,03 $
 *   POST /v1/render/exterior   { image, outputFormat, prompt? }       → 0,03 $
 *   POST /v1/upscale-4k        { image, outputFormat }                → 0,02 $
 *
 * Réponse 200 : { "output": ["https://cdn.../result.jpg", ...] }
 * Erreurs     : 400 (input invalide), 403 (clé absente/invalide), 500 (interne)
 *
 * ⚙️  Configuration : une seule variable d'environnement à poser.
 *     MYARCHITECT_API_KEY = ma_xxx   (clé créée sur portal.myarchitectai.com)
 *     Tant qu'elle est absente, le module tourne en MODE MOCK (renvoie l'image
 *     source telle quelle) pour ne jamais casser l'UI en dev / preview.
 */

const API_BASE = 'https://api.myarchitectai.com/v1';

// MyArchitectAI annonce un rendu en ~13 s ; on laisse une marge confortable.
// 120 s couvre les pics de charge sans dépasser le maxDuration Vercel (300 s).
const DEFAULT_TIMEOUT_MS = 120_000;

export type ArchitectMode = 'interior' | 'exterior';

export interface ArchitectParams {
  /** Intérieur (cuisine, pièce) ou extérieur (façade, perspective). */
  mode: ArchitectMode;
  /** Façades — toutes (optionnel). Fallback si bas/haut non renseignés. */
  facades?: string;
  /** Façades meubles bas uniquement (optionnel) — override sur les bas. */
  facadesBas?: string;
  /** Façades meubles hauts uniquement (optionnel) — override sur les hauts. */
  facadesHaut?: string;
  /** Plan de travail (optionnel). */
  planTravail?: string;
  /** Sol (optionnel). */
  sol?: string;
  /** Murs (optionnel). */
  murs?: string;
  /** Poignées / quincaillerie (optionnel) — cas classique où l'IA garde le bois. */
  poignees?: string;
  /** Crédence (optionnel). */
  credence?: string;
  /** Évier (optionnel) — couleur/matière, ex. « blanc céramique » (cas où l'IA le met en inox). */
  evier?: string;
  /** Type de plaque de cuisson (optionnel) : induction, gaz ou aspirante (downdraft). */
  cooktop?: 'induction' | 'gas' | 'downdraft';
  /** Description auto de la scène source (via /auto-prompt) — levier de fidélité. */
  sourceDescription?: string;
  /** Ambiance / consigne libre de l'utilisateur (optionnel). */
  ambiance?: string;
  /** Upscale 4K du rendu final (+0,02 $, +qq s). */
  highRes?: boolean;
}

export interface ArchitectResult {
  success: boolean;
  imageUrls: string[];
  /** Prompt effectivement envoyé (pour la traçabilité / l'historique). */
  prompt: string;
  /** Endpoint utilisé ('render/interior' | 'render/exterior' | 'mock'). */
  endpoint: string;
  /** True si un upscale 4K a été appliqué avec succès. */
  upscaled: boolean;
  error?: string;
}

/** True si la clé MyArchitectAI est configurée (sinon → mode mock). */
export function isArchitectEnabled(): boolean {
  return !!process.env.MYARCHITECT_API_KEY;
}

/**
 * Construit un prompt orienté qualité/fidélité pour réduire les erreurs de
 * rendu (objets déformés, éléments inventés, proportions fausses).
 *
 * ⚠️  Les endpoints render/interior et render/exterior n'acceptent PAS de
 * `negativePrompt` (seuls style-transfer et text-to-image le supportent). On
 * intègre donc les contraintes négatives directement dans le prompt positif —
 * c'est la bonne pratique standard pour ces modèles de diffusion.
 */
export function buildArchitectPrompt(params: ArchitectParams): string {
  const base =
    params.mode === 'exterior'
      ? 'professional architectural exterior photograph, photorealistic, accurate proportions and geometry true to the source, bright and luminous natural daylight, soft even lighting, airy well-lit atmosphere, clean materials'
      : 'professional architectural interior photograph, photorealistic, accurate proportions and geometry true to the source, bright and luminous lighting, soft even natural and artificial light, airy well-lit atmosphere, clean detailed materials';

  // ── Finitions DEMANDÉES = remplacements IMPÉRATIFS ──────────────────────────
  // Formulation forte ("must be exactly", "replace") + localisation de la surface,
  // placée EN TÊTE (poids maximal). Sur un img2img sans negativePrompt, c'est ce
  // qui pousse réellement le modèle à changer la matière au lieu de garder la
  // source. Les poignées et le plan de travail sont les cas les plus « collants »
  // (bois gardé alors qu'on demande du laiton, plan pas exactement la bonne pierre).
  const requested: string[] = [];

  // ── Façades : gestion séparée meubles BAS / meubles HAUTS ───────────────────
  // Un seul champ « toutes » (facades) sert de fallback. Si l'utilisateur ne
  // redéfinit qu'un groupe, on ORDONNE de garder l'autre tel quel (sinon le
  // moteur applique la teinte aux deux — cas noyer clair débordant sur les hauts).
  const facAll  = params.facades?.trim();
  const facBas  = params.facadesBas?.trim() || facAll;
  const facHaut = params.facadesHaut?.trim() || facAll;
  if (facBas && facHaut && facBas === facHaut) {
    requested.push(`all cabinet fronts, both the base/lower units and the wall/upper units, must be exactly ${facBas}`);
  } else {
    if (facBas)
      requested.push(`the base / lower cabinet fronts (the units standing on the floor) must be exactly ${facBas}`);
    if (facHaut)
      requested.push(`the wall / upper cabinet fronts (the units mounted high on the wall) must be exactly ${facHaut}`);
    if (facBas && !facHaut)
      requested.push('keep the wall / upper cabinets exactly as they are in the source image, do not apply the lower cabinet color or finish to the upper cabinets');
    if (facHaut && !facBas)
      requested.push('keep the base / lower cabinets exactly as they are in the source image, do not apply the upper cabinet color or finish to the lower cabinets');
  }

  if (params.poignees?.trim())
    requested.push(`the cabinet door handles and knobs must be exactly ${params.poignees.trim()} — replace any existing handle finish, keep this exact hardware metal and finish, do not leave them wood if a metal finish is requested`);
  if (params.planTravail?.trim())
    requested.push(`the countertop / worktop surface must be exactly ${params.planTravail.trim()} — reproduce this exact material, color and finish; if this is a plain, solid or matte colour, keep the surface perfectly uniform and smooth with no veining, no marbling, no speckles and no stone-like pattern, and do NOT turn it into marble or any veined stone unless the requested material is explicitly a veined stone`);
  if (params.credence?.trim())
    requested.push(`the backsplash must be exactly ${params.credence.trim()} — if this is a plain or matte colour, keep it uniform with no veining, marbling or pattern unless a pattern is explicitly requested`);
  if (params.evier?.trim())
    requested.push(`the kitchen sink must be exactly ${params.evier.trim()} — keep this exact sink colour and material, do not make it stainless steel unless stainless steel is what is requested`);
  if (params.sol?.trim())
    requested.push(`the floor must be exactly ${params.sol.trim()}`);
  if (params.murs?.trim())
    requested.push(`the walls must be exactly ${params.murs.trim()}`);
  if (params.cooktop === 'induction')
    requested.push('the cooktop is a flat frameless black induction glass-ceramic hob, with no burners and no grates');
  else if (params.cooktop === 'gas')
    requested.push('the cooktop is a gas hob with visible metal burners and cast-iron pan support grates');
  else if (params.cooktop === 'downdraft')
    requested.push('the cooktop is a black induction glass-ceramic hob with a central downdraft extractor: a venting hob with an integrated central extraction slot or grille running down the middle of the cooktop that draws air downward (a downdraft venting cooktop, like a BORA or Elica NikolaTesla), no burners, no grates, and because it vents downward there is no overhead range hood or extractor hood above it');

  // Description auto de la scène (via /auto-prompt) : ancre les accessoires
  // réellement présents (égouttoir, objets sur le plan…) pour que le rendu ne
  // les supprime pas. Placée après le style, avant les remplacements.
  const sourceDescription = params.sourceDescription?.trim();
  const sceneBlock = sourceDescription
    ? `the source image shows the following scene — reproduce all of it faithfully and keep every element and small accessory listed here, especially any items resting on the worktop or countertop: ${sourceDescription}`
    : '';

  const mandatory = requested.length
    ? `${sourceDescription ? 'however, ' : ''}apply these exact finishes, which take priority over and override any material or finish mentioned in the scene description above, replacing whatever is currently there and reproducing each requested material, color and finish precisely, do not substitute any of them: ${requested.join('; ')}`
    : '';

  const ambiance = params.ambiance?.trim() ? params.ambiance.trim() : '';

  // Fidélité : s'applique UNIQUEMENT à ce qui n'a PAS été explicitement redéfini
  // ci-dessus (fini la contradiction « garde l'original SAUF… » qui diluait la
  // demande). On ne nomme aucun objet potentiellement absent (évier/robinet/hotte)
  // pour ne pas pousser le modèle à en inventer.
  const fidelity =
    'for every element that is not explicitly requested above, keep it exactly as it appears in the source image; keep and faithfully reproduce every object, accessory and item that is visible in the source, including small accessories and items resting on the worktop and countertop, do not remove, omit, hide, erase or simplify any existing element or accessory; if a sink is visible in the source, keep its exact colour and material and do NOT turn a white, ceramic, composite or coloured sink into stainless steel unless a stainless steel sink is explicitly requested; do not recolor, do not change or invent materials, do not alter the wood species or its tone, do not add, invent or imagine any new object, fixture, appliance, plumbing or furniture that is not clearly visible in the source, and do not move or duplicate existing elements';

  // Rappel « critical » sur les 2 finitions les plus souvent mal respectées.
  const criticalBits: string[] = [];
  if (params.planTravail?.trim()) criticalBits.push(`the worktop must be exactly ${params.planTravail.trim()}`);
  if (params.poignees?.trim()) criticalBits.push(`the handles must be exactly ${params.poignees.trim()}`);
  const critical = criticalBits.length ? `critical: ${criticalBits.join(' and ')}, match these precisely` : '';

  // Contraintes anti-dérive baked-in (faute de negativePrompt sur ces endpoints).
  const guard =
    'preserve the original layout and camera angle, no extra furniture, no added objects, no new window, no new door, no new opening, do not add windows, do not convert a niche, alcove, open shelf, recess or open cupboard into a window or into an opening, keep every existing wall opening, niche, alcove, recess and open shelving exactly as it is in the source image, no warped or deformed shapes, no distorted lines, no text, crisp clean image, sharp focus, fine high detail, high resolution, smooth surfaces, no grain, no noise, no blur, no compression artifacts';

  return [base, sceneBlock, mandatory, ambiance, fidelity, critical, guard]
    .filter(Boolean)
    .join('. ');
}

/** Extrait les URLs depuis la réponse MyArchitectAI ({ output: [...] } ou string). */
function extractOutputs(data: unknown): string[] {
  const d = data as { output?: unknown; url?: unknown };
  if (Array.isArray(d?.output)) {
    return d.output.filter((u): u is string => typeof u === 'string' && u.length > 0);
  }
  if (typeof d?.output === 'string' && d.output.length > 0) return [d.output];
  if (typeof d?.url === 'string' && d.url.length > 0) return [d.url];
  return [];
}

interface EndpointResult {
  ok: boolean;
  outputs: string[];
  error?: string;
}

/**
 * Appel bas-niveau d'un endpoint MyArchitectAI avec timeout + gestion d'erreur.
 * Ne lève jamais : retourne toujours { ok, outputs, error } pour un contrôle
 * de flux propre côté route.
 */
async function callEndpoint(
  path: string,
  body: Record<string, unknown>,
): Promise<EndpointResult> {
  const apiKey = process.env.MYARCHITECT_API_KEY;
  if (!apiKey) {
    return { ok: false, outputs: [], error: 'Clé du moteur de rendu non configurée' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const msg =
        (parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error?: unknown }).error)
          : '') ||
        (parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message?: unknown }).message)
          : '');
      const friendly =
        res.status === 403
          ? 'Clé API du moteur de rendu invalide ou crédit épuisé.'
          : res.status === 400
            ? `Entrée refusée par le moteur de rendu${msg ? ` : ${msg}` : ''}.`
            : `Le moteur de rendu a renvoyé une erreur ${res.status}${msg ? ` : ${msg}` : ''}.`;
      return { ok: false, outputs: [], error: friendly };
    }

    const outputs = extractOutputs(parsed);
    if (outputs.length === 0) {
      return { ok: false, outputs: [], error: 'Le moteur de rendu n\'a renvoyé aucune image.' };
    }
    return { ok: true, outputs };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      outputs: [],
      error: aborted
        ? 'Le moteur de rendu a dépassé le délai d\'attente. Réessayez dans un instant.'
        : `Connexion au moteur de rendu impossible : ${err instanceof Error ? err.message : 'erreur réseau'}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Rendu intérieur photoréaliste depuis une image source (URL https). */
export function renderInterior(imageUrl: string, prompt: string): Promise<EndpointResult> {
  return callEndpoint('/render/interior', { image: imageUrl, outputFormat: 'jpg', prompt });
}

/** Rendu extérieur photoréaliste depuis une image source (URL https). */
export function renderExterior(imageUrl: string, prompt: string): Promise<EndpointResult> {
  return callEndpoint('/render/exterior', { image: imageUrl, outputFormat: 'jpg', prompt });
}

/** Upscale 4K d'une image (URL https). Non bloquant : null si échec. */
export async function upscale4k(imageUrl: string): Promise<string | null> {
  const res = await callEndpoint('/upscale-4k', { image: imageUrl, outputFormat: 'jpg' });
  return res.ok ? res.outputs[0] ?? null : null;
}

/**
 * Auto-prompt MyArchitectAI — analyse l'image source et renvoie une description
 * détaillée (liste virgulée) de TOUT ce qu'elle contient. Recommandé par l'API
 * pour pré-remplir le prompt des endpoints de rendu.
 *
 * On l'utilise ici comme LEVIER DE FIDÉLITÉ : la description mentionne les petits
 * accessoires réellement présents (ex. un égouttoir, des objets sur le plan) que
 * le moteur de rendu a tendance à « lisser » sinon. Comme la description est
 * ancrée sur l'image réelle, elle ne peut pas inventer d'objet absent (elle ne
 * cite un évier que s'il y en a un) — ce qui lève la tension du prompt statique.
 *
 * Non bloquant : renvoie null si l'appel échoue (le rendu part alors sans
 * enrichissement, comme avant). Coût : un appel /auto-prompt par rendu.
 */
export async function autoPrompt(imageUrl: string): Promise<string | null> {
  const res = await callEndpoint('/auto-prompt', { image: imageUrl });
  return res.ok ? (res.outputs[0]?.trim() || null) : null;
}

/**
 * Génération haut-niveau « IA Architect ».
 *
 * @param params   Paramètres UI (mode, matériaux, highRes…)
 * @param imageUrl URL https publique de l'image source (déjà uploadée)
 *
 * En mode mock (clé absente) : renvoie l'image source telle quelle pour que
 * l'UI reste fonctionnelle en dev/preview sans casser le pipeline.
 */
export async function generateArchitectRender(
  params: ArchitectParams,
  imageUrl: string,
): Promise<ArchitectResult> {
  // ── Mode mock : aucune clé configurée (pas d'appel API)
  if (!isArchitectEnabled()) {
    return {
      success: true,
      imageUrls: [imageUrl],
      prompt: `${buildArchitectPrompt(params)} [MODE DÉMO — clé du moteur de rendu non configurée]`,
      endpoint: 'mock',
      upscaled: false,
    };
  }

  // ── Enrichissement fidélité (non bloquant) : on décrit d'abord la scène source
  // pour que le rendu conserve les petits accessoires (égouttoir, objets…). Si
  // l'auto-prompt échoue, on rend quand même avec le prompt statique.
  const sourceDescription = await autoPrompt(imageUrl);
  const prompt = buildArchitectPrompt(
    sourceDescription ? { ...params, sourceDescription } : params,
  );

  // ── Rendu principal
  const endpoint = params.mode === 'exterior' ? 'render/exterior' : 'render/interior';
  const result =
    params.mode === 'exterior'
      ? await renderExterior(imageUrl, prompt)
      : await renderInterior(imageUrl, prompt);

  if (!result.ok) {
    return { success: false, imageUrls: [], prompt, endpoint, upscaled: false, error: result.error };
  }

  let imageUrls = result.outputs;
  let upscaled = false;

  // ── Upscale 4K optionnel (non bloquant : on garde l'image si l'upscale rate)
  if (params.highRes && imageUrls[0]) {
    const hi = await upscale4k(imageUrls[0]);
    if (hi) {
      imageUrls = [hi, ...imageUrls.slice(1)];
      upscaled = true;
    }
  }

  return { success: true, imageUrls, prompt, endpoint, upscaled };
}


/**
 * Coloriste via MyArchitectAI — change les couleurs/finitions d'une cuisine
 * existante à partir d'un prompt déjà construit (couleurs façades/poignées/plan).
 * Utilise render/interior (l'« Edit by prompt » par surface de MyArchitectAI
 * n'est pas encore exposé en API). En mode mock : renvoie l'image source.
 *
 * @param prompt   Prompt coloriste (construit via buildColoristPrompt côté route)
 * @param imageUrl URL https publique de la photo de cuisine source
 */
export async function generateColoristeRender(
  prompt: string,
  imageUrl: string,
): Promise<ArchitectResult> {
  if (!isArchitectEnabled()) {
    return {
      success: true,
      imageUrls: [imageUrl],
      prompt: `${prompt} [MODE DÉMO — clé du moteur de rendu non configurée]`,
      endpoint: 'mock',
      upscaled: false,
    };
  }
  const res = await renderInterior(imageUrl, prompt);
  if (!res.ok) {
    return { success: false, imageUrls: [], prompt, endpoint: 'render/interior', upscaled: false, error: res.error };
  }
  return { success: true, imageUrls: res.outputs, prompt, endpoint: 'render/interior', upscaled: false };
}

/**
 * Change Textures (endpoint /change-textures).
 *
 * Change les couleurs / matières / textures d'une image EN PRÉSERVANT la
 * géométrie et le layout (≠ render/interior qui régénère toute la scène). Deux
 * modes combinables : `prompt` (description de la matière voulue) et/ou
 * `referenceImage` (échantillon de matière). Réponse : { output: "https://..." }.
 */
export function changeTextures(
  imageUrl: string,
  prompt: string,
  referenceImage?: string,
  mask?: string,
): Promise<EndpointResult> {
  // NB : l'endpoint déployé exige un `mask` (image noir/blanc de la zone à
  // retexturer), en plus de `image`. `prompt` et `referenceImage` sont optionnels.
  const body: Record<string, unknown> = { image: imageUrl, prompt };
  if (mask) body.mask = mask;
  if (referenceImage) body.referenceImage = referenceImage;
  return callEndpoint('/change-textures', body);
}

/**
 * Coloriste « chirurgical » via MyArchitectAI /change-textures — change les
 * couleurs/finitions (façades, poignées, plan) en PRÉSERVANT la géométrie et le
 * layout d'origine (le vrai coloriste, contrairement à generateColoristeRender
 * qui re-rend toute la pièce). En mode mock (clé absente) : renvoie l'image source.
 *
 * @param prompt         Prompt coloriste (construit côté route)
 * @param imageUrl       URL https publique de la photo de cuisine source
 * @param referenceImage URL https publique d'un échantillon de matière importé
 *                       (optionnel). Quand présent, /change-textures applique
 *                       CETTE matière réelle plutôt qu'une couleur décrite.
 */
export async function generateColoristeTextures(
  prompt: string,
  imageUrl: string,
  referenceImage?: string,
  mask?: string,
): Promise<ArchitectResult> {
  if (!isArchitectEnabled()) {
    return {
      success: true,
      imageUrls: [imageUrl],
      prompt: `${prompt} [MODE DÉMO — clé du moteur de rendu non configurée]`,
      endpoint: 'mock',
      upscaled: false,
    };
  }

  // /change-textures EXIGE un masque (zone à retexturer). On ne l'appelle donc
  // QUE si un masque est fourni ; sinon on va directement sur /edit-by-prompt
  // (retexture par prompt sur toute l'image, sans masque ni image de référence).
  const fbPrompt = prompt
    .replace(/Apply the exact material shown in the attached reference image[^.]*\.\s*/i, '')
    .replace(/Only change the area inside the provided mask[^.]*\.\s*/i, '');

  if (mask) {
    // IMPORTANT : quand une TEXTURE de référence est fournie, c'est ELLE qui doit
    // piloter la matière. /change-textures génère à partir du `prompt` quand il est
    // détaillé → un prompt bavard fait INVENTER une texture au lieu de copier la
    // référence. On envoie donc un prompt MINIMAL (voire vide) pour que le moteur
    // s'appuie sur `referenceImage`. Sans référence : on garde le prompt couleurs.
    const texPrompt = referenceImage
      ? 'Apply the material and texture from the reference image to the masked area; keep everything outside the mask unchanged.'
      : prompt;
    const res = await changeTextures(imageUrl, texPrompt, referenceImage, mask);
    if (res.ok) {
      return { success: true, imageUrls: res.outputs, prompt: texPrompt, endpoint: 'change-textures', upscaled: false };
    }
    // Repli : si change-textures échoue (indispo, etc.), on tente edit-by-prompt.
    const fb = await editByPrompt(imageUrl, fbPrompt);
    if (fb.ok) {
      return { success: true, imageUrls: fb.outputs, prompt: fbPrompt, endpoint: 'edit-by-prompt', upscaled: false };
    }
    return { success: false, imageUrls: [], prompt: texPrompt, endpoint: 'change-textures', upscaled: false, error: res.error };
  }

  // Pas de masque → edit-by-prompt directement.
  const fb = await editByPrompt(imageUrl, fbPrompt);
  if (fb.ok) {
    return { success: true, imageUrls: fb.outputs, prompt: fbPrompt, endpoint: 'edit-by-prompt', upscaled: false };
  }
  return { success: false, imageUrls: [], prompt: fbPrompt, endpoint: 'edit-by-prompt', upscaled: false, error: fb.error };
}

/**
 * Édition ciblée d'une image existante (endpoint /edit-by-prompt).
 *
 * Contrairement à render/interior qui REGÉNÈRE toute la scène, edit-by-prompt
 * applique UNE modification décrite en langage naturel en gardant le reste de
 * l'image identique (fidélité maximale : niche, égouttoir, meubles non touchés).
 * Réponse : { output: "https://..." } (string unique, gérée par extractOutputs).
 *
 * @param imageUrl URL https publique de l'image à retoucher (rendu ou photo)
 * @param prompt   Consigne d'édition déjà propre (anglais, atomique, + « keep the
 *                 rest identical » — cf. buildRetouchInstruction côté route)
 */
export function editByPrompt(imageUrl: string, prompt: string): Promise<EndpointResult> {
  return callEndpoint('/edit-by-prompt', { image: imageUrl, prompt });
}

/**
 * Retouche haut-niveau « Retouche photo » — applique une consigne d'édition
 * ciblée via /edit-by-prompt. En mode mock (clé absente) : renvoie l'image source.
 *
 * @param prompt   Consigne d'édition propre (construite via buildRetouchInstruction)
 * @param imageUrl URL https publique de l'image à retoucher
 */
export async function generateRetouch(
  prompt: string,
  imageUrl: string,
): Promise<ArchitectResult> {
  if (!isArchitectEnabled()) {
    return {
      success: true,
      imageUrls: [imageUrl],
      prompt: `${prompt} [MODE DÉMO — clé du moteur de rendu non configurée]`,
      endpoint: 'mock',
      upscaled: false,
    };
  }
  const res = await editByPrompt(imageUrl, prompt);
  if (!res.ok) {
    return { success: false, imageUrls: [], prompt, endpoint: 'edit-by-prompt', upscaled: false, error: res.error };
  }
  return { success: true, imageUrls: res.outputs, prompt, endpoint: 'edit-by-prompt', upscaled: false };
}
