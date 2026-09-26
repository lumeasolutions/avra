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
  /**
   * Nature de l'image de départ.
   *
   * `plan3d` : export WinnerFlex / SketchUp aux matières plates, à
   * photoréaliser — le moteur a le droit d'ajouter lumière et profondeur.
   * `rendu` (défaut) : rendu déjà abouti, à préserver.
   *
   * Cette distinction n'était pas demandée : elle était déduite du fait que
   * l'utilisateur avait rempli un champ de finition ou non. Un rendu abouti
   * lancé sans finition partait donc avec « c'est un export 3D tout plat » et
   * ressortait assombri et jauni (4 rendus perdus le 26/09/2026).
   */
  source?: 'plan3d' | 'rendu';
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
 * Construit le prompt du module « Rendu Realiste ».
 *
 * Trois regles, tirees de l'audit du 12/09/2026 :
 *
 *  1. COURT. L'ancienne version faisait 266 a 600 mots. Les encodeurs de texte
 *     des modeles de diffusion ont une fenetre courte : au-dela, le texte est
 *     tronque et chaque concept ne pese plus rien. Cible : 120-170 mots.
 *
 *  2. QUALITE EN TETE. Les termes de realisme etaient les tout derniers mots
 *     du prompt, donc les premiers sacrifies a la troncature. Ils ouvrent
 *     desormais la chaine.
 *
 *  3. AUCUNE NEGATION. Ces endpoints n'acceptent pas de `negativePrompt`, et
 *     l'ancienne version compensait par 35 tournures « no blur », « no warped
 *     shapes »... Un modele de diffusion encode les mots, pas la negation :
 *     ecrire « no blur » injecte le concept de flou. Tout est donc formule en
 *     positif — « tack-sharp » plutot que « no blur ».
 */
/**
 * Termes de la description /auto-prompt à retirer quand l'utilisateur redéfinit
 * l'élément correspondant.
 *
 * 24/09/2026 — cause trouvée en relisant les consignes réellement envoyées.
 * /auto-prompt renvoie la scène sous forme de liste de descripteurs séparés par
 * des virgules : « white matte flat-panel cabinetry, black stone countertops,
 * chrome faucet, … ». Cette description est placée EN TÊTE de la consigne, et
 * nos changements à la fin. Le moteur suit ce qu'il a lu en premier : un plan
 * de travail demandé en marbre blanc ressortait noir, parce que la description
 * disait « black stone countertops ».
 *
 * On ne peut pas supprimer la description — elle vaut 0,11 de fidélité
 * structurelle (0,701 avec, 0,592 sans, mesuré le 12/09). On en retire donc
 * seulement les descripteurs que la demande contredit, et elle continue
 * d'ancrer tout le reste : micro-ondes noir, fond de niche en bois, plantes.
 */
const TERMES_DECRITS: Array<{ champ: keyof ArchitectParams; motif: RegExp }> = [
  { champ: 'facades',     motif: /\b(cabinetry|cabinet fronts?|cabinets?|joinery|millwork|cupboards?)\b/i },
  { champ: 'facadesBas',  motif: /\b(cabinetry|cabinet fronts?|cabinets?|joinery|millwork|cupboards?)\b/i },
  { champ: 'facadesHaut', motif: /\b(cabinetry|cabinet fronts?|cabinets?|joinery|millwork|cupboards?)\b/i },
  { champ: 'planTravail', motif: /\b(countertops?|worktops?|benchtops?|island tops?)\b/i },
  { champ: 'credence',    motif: /\b(backsplash|splashback)\b/i },
  { champ: 'evier',       motif: /\b(sink|basin)\b/i },
  { champ: 'poignees',    motif: /\b(handles?|knobs?|pulls?|hardware)\b/i },
  { champ: 'sol',         motif: /\b(floors?|flooring|floorboards?|parquet)\b/i },
  { champ: 'murs',        motif: /\b(walls?|wall panell?ing)\b/i },
  { champ: 'cooktop',     motif: /\b(cooktops?|hobs?|stoves?|ranges?|burners?)\b/i },
];

/**
 * Retire de la description les descripteurs que l'utilisateur vient de
 * redéfinir. Découpage sur les virgules : c'est le format que renvoie
 * /auto-prompt, et un descripteur tient toujours sur un segment.
 */
export function filtrerDescription(scene: string, params: ArchitectParams): string {
  const motifs = TERMES_DECRITS
    .filter(({ champ }) => {
      const v = params[champ];
      return typeof v === 'string' && v.trim().length > 0;
    })
    .map(({ motif }) => motif);
  if (motifs.length === 0) return scene;

  const gardes = scene
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !motifs.some((m) => m.test(s)));

  // Garde-fou : si le filtre a tout emporté (description très courte, ou
  // formulée autrement), on préfère la description d'origine à rien du tout.
  return gardes.length >= 2 ? gardes.join(', ') : scene;
}

export function buildArchitectPrompt(params: ArchitectParams): string {
  /* 1 ─ Qualite photographique, en tete (poids maximal). */
  const qualite =
    params.mode === 'exterior'
      ? 'Award-winning architectural exterior photograph, full-frame camera, tilt-shift lens, tack-sharp edge to edge, fine micro-detail in every material, true-to-life colours, bright natural daylight with soft even fill, realistic reflections, high dynamic range, ultra high resolution'
      : 'Award-winning architectural interior photograph, full-frame camera, 24mm tilt-shift lens, tack-sharp edge to edge, fine micro-detail in every material, true-to-life colours, bright airy daylight with soft even fill, realistic soft shadows and reflections, high dynamic range, ultra high resolution';

  /* 2 ─ Finitions demandees : une clause courte par element. */
  const finitions: string[] = [];

  const facAll  = params.facades?.trim();
  const facBas  = params.facadesBas?.trim() || facAll;
  const facHaut = params.facadesHaut?.trim() || facAll;
  if (facBas && facHaut && facBas === facHaut) {
    finitions.push(`all cabinet fronts, base and wall units alike, in ${facBas}`);
  } else {
    if (facBas)  finitions.push(`the base floor-standing cabinet fronts in ${facBas}`);
    if (facHaut) finitions.push(`the wall-mounted upper cabinet fronts in ${facHaut}`);
    if (facBas && !facHaut) finitions.push('the wall-mounted upper cabinets keeping their original finish from the source');
    if (facHaut && !facBas) finitions.push('the base floor-standing cabinets keeping their original finish from the source');
  }

  if (params.poignees?.trim())
    finitions.push(`every door handle and knob in ${params.poignees.trim()}, that exact metal and finish throughout`);
  if (params.planTravail?.trim())
    finitions.push(`the worktop in ${params.planTravail.trim()}, reproduced as that exact material — a plain colour stays perfectly uniform and smooth, veining appears only if the requested material is itself a veined stone`);
  if (params.credence?.trim())
    finitions.push(`the backsplash in ${params.credence.trim()}, uniform unless a pattern is part of the requested material`);
  if (params.evier?.trim())
    finitions.push(`the sink in ${params.evier.trim()}, keeping that exact colour and material`);
  if (params.sol?.trim())
    finitions.push(`the floor in ${params.sol.trim()}`);
  if (params.murs?.trim())
    finitions.push(`the walls in ${params.murs.trim()}`);

  if (params.cooktop === 'induction')
    finitions.push('a flat frameless black induction glass-ceramic hob, its surface entirely smooth');
  else if (params.cooktop === 'gas')
    finitions.push('a gas hob with visible metal burners and cast-iron pan supports');
  else if (params.cooktop === 'downdraft')
    finitions.push('a black induction hob with a central downdraft extractor slot running down its middle, venting downward through the hob itself, the ceiling directly above it left clear and empty');

  const materiaux = finitions.length
    ? `Render these finishes exactly, overriding whatever material is currently there: ${finitions.join('; ')}`
    : '';

  /* 3 ─ Ambiance libre saisie par l'utilisateur. */
  const ambiance = params.ambiance?.trim() ?? '';

  /* 4 ─ Fidelite, formulee en positif : ce qui reste identique. */
  const fidelite =
    'Keep the exact same room: identical layout, camera position, perspective, proportions and framing. '
    + 'Reproduce the source surface for surface: a flat plain wall stays a flat plain wall, a closed cabinet front stays closed, a smooth panel stays smooth. '
    + 'The render contains exactly the openings, windows, doors, niches, alcoves, recesses and open shelves that are already visible in the source, each at its own place, size and shape — and only those. '
    + 'Every appliance, fixture, accessory and small item resting on the worktop appears in the render, at its place, in its own material. '
    + 'Straight true edges, accurate perspective, geometry faithful to the source, clean crisp surfaces';

  /* 5 ─ Cas MINIMAL : aucune matiere redefinie, aucune ambiance demandee.
   *
   * C'est le cas d'usage reel et majoritaire : la source est un rendu 3D sorti
   * du logiciel de conception, ses materiaux sont DEJA les bons, et la demande
   * se resume a « cette scene, en photo ». Lui redecrire la piece revient a lui
   * demander de la reinterpreter — et une reinterpretation, c'est precisement
   * ce qui fabrique une niche sur un mur plat.
   *
   * Mesure du 12/09/2026 sur une meme source : fidelite structurelle 0,701 avec
   * l'ancien prompt, 0,592 avec une version qui decrivait MIEUX la piece. Plus
   * le prompt decrit, moins le moteur regarde l'image. */
  // Description /auto-prompt de l'editeur : passe EN TETE quand elle existe.
  // C'est la forme qu'ils recommandent (pre-remplir le champ prompt), et c'est
  // elle qui porte les ANCRES DE COULEUR des petits elements — micro-ondes
  // noir, fond de niche en bois, interieur de colonne noir, socles.
  // La description ne doit plus contredire ce que l'utilisateur redéfinit.
  const sceneBrute = params.sourceDescription?.trim();
  const scene = sceneBrute ? filtrerDescription(sceneBrute, params) : undefined;

  // Lumière : « Natural daylight » est notre valeur par défaut, mais elle
  // annulait toute ambiance demandée — les deux se suivaient dans la même
  // phrase et le moteur gardait la première (constaté le 24/09 : « late
  // afternoon golden hour » sans aucun effet). Quand une ambiance est saisie,
  // c'est elle qui décrit la lumière.
  const lumiere = ambiance ? ambiance : 'Natural daylight';

  if (!materiaux && !ambiance) {
    const consigne = params.mode === 'exterior'
      ? 'Photorealistic architectural exterior photograph of this exact building. Every volume, opening, material, colour and position stays identical to the source. Natural daylight, tack-sharp, fine material detail, high resolution.'
      : 'Photorealistic architectural interior photograph of this exact room. Every wall, opening, cabinet, appliance, accessory, material, colour and position stays identical to the source. Natural daylight, tack-sharp, fine material detail, high resolution.';
    return scene ? `${scene}. ${consigne}` : consigne;
  }

  /* 6 ─ Finitions redefinies (ou ambiance) ET description disponible.
   *
   * Correctif du 14/09/2026. Cette branche n'existait pas : des qu'un champ
   * etait rempli, le code tombait sur la structure longue ci-dessous, qui
   * n'injecte PAS la description de scene. L'appel /auto-prompt etait donc
   * effectue et facture... puis sa reponse etait jetee. Constate sur les huit
   * rendus de Cassandra du matin (evier « Inox » + plaque induction) : aucun des
   * huit prompts ne contenait la description. Sans elle le moteur ne sait pas
   * que le micro-ondes est noir ou le fond des niches en bois, et comble avec
   * les valeurs les plus courantes — micro-ondes inox, interieur blanc.
   *
   * On reprend donc la structure du cas minimal, MESUREE la meilleure le
   * 12/09 (fidelite 0,733, netteté 485), et on y ajoute les changements
   * demandes en les CANTONNANT a l'element qu'ils nomment : « Inox » tape pour
   * l'evier ne doit pas deteindre sur les appareils voisins. */
  if (scene) {
    const avecChangements = finitions.length > 0;
    const consigne = params.mode === 'exterior'
      ? `Photorealistic architectural exterior photograph of this exact building. Every volume, opening, material, colour and position stays identical to the source${avecChangements ? ', except for the finish changes listed below' : ''}. ${lumiere}, tack-sharp, fine material detail, high resolution`
      : `Photorealistic architectural interior photograph of this exact room. Every wall, opening, cabinet, appliance, accessory, material, colour and position stays identical to the source${avecChangements ? ', except for the finish changes listed below' : ''}. ${lumiere}, tack-sharp, fine material detail, high resolution`;
    // Les changements ferment la consigne : c'est la dernière chose lue, et
    // plus rien dans la description ne les contredit (cf. filtrerDescription).
    const changements = avecChangements
      ? `Apply these finish changes, each one only to the element it names: ${finitions.join('; ')}. These finishes override anything else; every other element keeps exactly the colour and material described at the start`
      : '';
    return [scene, consigne, changements].filter(Boolean).join('. ') + '.';
  }

  // Repli : /auto-prompt indisponible (appel echoue). Structure longue, dont la
  // clause de fidelite porte a elle seule la protection contre les niches et
  // etageres inventees.
  return [qualite, materiaux, ambiance, fidelite].filter(Boolean).join('. ') + '.';
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
          : res.status === 402
            ? 'Crédit épuisé chez le moteur de rendu. Rechargez le compte avant de relancer.'
            : res.status === 429
              ? 'Moteur de rendu saturé (trop de demandes en même temps). Réessayez dans quelques secondes.'
              : res.status === 413
                ? 'Image source trop lourde pour le moteur de rendu (limite 10 Mo).'
                : res.status === 400
                  ? `Entrée refusée par le moteur de rendu${msg ? ` : ${msg}` : ''}.`
                  : `Le moteur de rendu a renvoyé une erreur ${res.status}${msg ? ` : ${msg}` : ''}.`;
      return { ok: false, outputs: [], error: friendly };
    }

    // ⚠️ Un 200 ne vaut PAS succès. La doc est explicite : les endpoints de
    // génération répondent en flux, le statut HTTP est donc figé avant la fin du
    // job. Un échec pendant la génération renvoie 200 avec une clé `error` (et
    // la requête est remboursée). On lit donc le corps, pas le statut.
    const outputs = extractOutputs(parsed);
    if (outputs.length === 0) {
      const reason =
        parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error?: unknown }).error)
          : '';
      return {
        ok: false,
        outputs: [],
        error: reason
          ? `Le moteur de rendu a échoué : ${reason}`
          : 'Le moteur de rendu n\'a renvoyé aucune image.',
      };
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

  // /auto-prompt : l'editeur le recommande explicitement pour pre-remplir le
  // champ prompt des endpoints de rendu (« We highly recommend using it for
  // pre-filling the prompt field of the render endpoints »), et la mesure lui
  // donne raison — fidelite structurelle 0,701 avec, 0,592 sans.
  //
  // Je l'avais retire le 12/09 en pensant que deux descriptions se
  // concurrencaient. C'etait faux : ce qui nuisait, c'etait la LONGUEUR du
  // prompt maison, pas la description de la scene. On garde donc leur
  // description factuelle, suivie de notre instruction courte.
  //
  // Non bloquant : si l'appel echoue, on rend avec le seul prompt maison.
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
  // Spec officielle /change-textures :
  //  - `image` requis, `mask` requis (blanc = zone à changer, noir = garder).
  //  - Modes MUTUELLEMENT EXCLUSIFS : SOIT `referenceImage`, SOIT `prompt`.
  //    Envoyer les DEUX → l'API renvoie 400 « providing both is rejected ».
  //    (C'était notre bug : on envoyait prompt + referenceImage ensemble, la
  //     requête était rejetée et on retombait en fallback edit-by-prompt sans
  //     masque ni référence → mosaïque générique.)
  const body: Record<string, unknown> = { image: imageUrl };
  if (mask) body.mask = mask;
  if (referenceImage) {
    body.referenceImage = referenceImage; // mode référence : PAS de prompt
  } else {
    body.prompt = prompt;                 // mode prompt : PAS de referenceImage
  }
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
export function editByPrompt(imageUrl: string, prompt: string, referenceImage?: string): Promise<EndpointResult> {
  // referenceImage (optionnel) : échantillon de matière / produit, désigné dans
  // la consigne comme « the attached image » (doc officielle edit-by-prompt).
  return callEndpoint('/edit-by-prompt', referenceImage
    ? { image: imageUrl, prompt, referenceImage }
    : { image: imageUrl, prompt });
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
