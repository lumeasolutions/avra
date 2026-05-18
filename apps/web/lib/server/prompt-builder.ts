/**
 * ──────────────────────────────────────────────────────────────
 *  AVRA IA Studio — Prompt Builder
 *  Système de génération de prompts béton pour Flux 1.1 Pro Ultra
 *  Zéro champ texte libre → zéro raté
 * ──────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────── TYPES

export type FinishType   = 'mat' | 'satiné' | 'brillant' | 'brossé' | 'bois' | 'miroir' | 'verre-mat';
export type LightingType = 'naturelle' | 'spots' | 'mixte';
export type RoomSizeType = 'petite' | 'moyenne' | 'grande' | 'ouverte';
export type StyleType    = 'contemporain' | 'classique' | 'industriel' | 'scandinave' | 'haussmannien';
export type PromptLevel  = 'standard' | 'simplified' | 'minimal';

export interface ColoristParams {
  facadeHex:         string;   // ex: "#1B3254"
  poigneeHex:        string;   // ex: "#D4A855"
  planHex:           string;   // ex: "#EDE8DC"
  facadeFinish:      FinishType;
  /** Finition optionnelle des poignées (override du matériau standard). */
  poigneeFinish?:    FinishType;
  /** Finition optionnelle du plan de travail (override du matériau standard). */
  planFinish?:       FinishType;
  handleMaterial?:   string;   // ex: "laiton brossé"
  countertopMaterial?:string;  // ex: "marbre blanc Calacatta"
  lightingStyle:     LightingType;
  extraContext?:     string;
  /**
   * Textures importées par l'utilisateur (data URL ou https URL) pour chaque
   * élément. Injectées en tant que références dans `image_urls` du modèle
   * Flux Kontext Max Multi, puis adressées explicitement dans le prompt
   * (« replace the cabinet doors with the material from image N »).
   */
  facadeTextureDataUrl?:  string;
  poigneeTextureDataUrl?: string;
  planTextureDataUrl?:    string;
}

export interface RenduParams {
  facades:           string;   // description façades depuis le textarea
  planTravail:       string;   // matière plan de travail
  /** Optionnel : description du sol (parquet chêne, carrelage grand format, etc). */
  sol?:              string;
  /** Optionnel : description des murs (peinture mate, papier peint, etc). */
  murs?:             string;
  style:             StyleType;
  lightingStyle:     LightingType;
  roomSize:          RoomSizeType;
  hasPlanFile:       boolean;  // true = fichier WinnerFlex uploadé
  extraContext?:     string;
}

export interface BuiltPrompt {
  prompt:   string;
  negative: string;
  seed:     number;
  level:    PromptLevel;
  warnings: string[];
}

// ─────────────────────────────────────────── DICTIONNAIRES COULEURS

const HEX_TO_NAME: Record<string, string> = {
  // Presets existants
  '#111111': 'deep matte black',
  '#f5f3ef': 'warm off-white',
  '#7a5c3a': 'smoked oak brown',
  '#3d3d3d': 'slate grey',
  '#6b8f71': 'sage green',
  '#1b3254': 'midnight navy blue',
  '#c4602a': 'terracotta rust',
  '#8a8a82': 'polished concrete grey',
  '#c0c0c0': 'brushed stainless steel',
  '#c8a050': 'polished gold',
  '#d4a855': 'warm brass',
  '#b07848': 'antique copper',
  '#909090': 'matte nickel',
  '#f2ebe0': 'warm white marble',
  '#1a1a1a': 'black slate',
  '#e8e0d0': 'cream quartz',
  '#fafafa': 'bright white',
  '#d4c9a8': 'limestone beige',
  '#ede8dc': 'travertine ivory',
  '#f0ead8': 'light oak wood',
  '#2a2a2a': 'charcoal anthracite',
  '#304035': 'dark forest green',
  '#a67749': 'warm cognac brown',
  '#f5f0e8': 'natural linen white',
  '#6a5040': 'dark chocolate leather',
  '#2c2c2c': 'matte graphite black',
  '#5a5a5a': 'dark pewter grey',
  // FIX 18/05/2026 : ajout couleurs courantes manquantes (l'user pouvait
  // choisir un rouge via le color picker manuel et obtenait du marron
  // parce que approximateHue retournait "warm red-brown" pour #ff0000).
  '#ff0000': 'pure vibrant red',
  '#dc143c': 'crimson red',
  '#8b0000': 'deep dark red',
  '#800020': 'deep burgundy red',
  '#b22222': 'firebrick red',
  '#a52a2a': 'rich brown-red',
  '#cd5c5c': 'soft coral red',
  '#0000ff': 'pure vibrant blue',
  '#4169e1': 'royal blue',
  '#000080': 'deep navy blue',
  '#87ceeb': 'sky blue',
  '#00ffff': 'cyan blue',
  '#008080': 'teal blue',
  '#00ff00': 'pure vibrant green',
  '#228b22': 'forest green',
  '#006400': 'deep dark green',
  '#808000': 'olive green',
  '#50c878': 'emerald green',
  '#ffff00': 'pure bright yellow',
  '#ffd700': 'metallic gold yellow',
  '#ffa500': 'vibrant orange',
  '#ff7f50': 'coral orange',
  '#800080': 'royal purple',
  '#dda0dd': 'soft lavender purple',
  '#000000': 'pitch black',
  '#ffffff': 'pure bright white',
};

function hexToName(hex: string): string {
  const key = hex.toLowerCase();
  if (HEX_TO_NAME[key]) return HEX_TO_NAME[key];
  // Fallback : décrire la teinte approximativement
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  if (luminance < 60)  return 'very dark ' + approximateHue(r, g, b);
  if (luminance > 200) return 'very light ' + approximateHue(r, g, b);
  return approximateHue(r, g, b);
}

/**
 * Fallback de nommage couleur quand HEX_TO_NAME ne match pas.
 * Refonte 18/05/2026 : avant on retournait "warm red-brown" pour TOUT rouge
 * vibrant (#FF0000), ce qui faisait que Flux peignait du marron au lieu de
 * rouge. Nouvelle logique :
 *   1) Détection saturation (max-min)/max : faible → gris/neutre
 *   2) Hue dominante selon canal max
 *   3) Modificateur clarté/saturation : "vibrant", "deep dark", "soft pale"
 */
function approximateHue(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness  = (r + g + b) / 3;

  // ── Couleurs achromatiques (gris, blanc, noir) ──
  if (saturation < 0.12) {
    if (lightness < 40)  return 'pitch black';
    if (lightness < 90)  return 'dark charcoal grey';
    if (lightness < 160) return 'medium neutral grey';
    if (lightness < 220) return 'light warm grey';
    return 'bright white';
  }

  // ── Modificateur clarté/intensité ──
  const intensity =
    lightness < 70  ? 'deep dark'
    : lightness > 200 ? 'bright pale'
    : saturation > 0.6 ? 'vibrant'
    : '';

  // ── Détection hue dominante ──
  let hue: string;
  if (r === max && r > g + 30 && r > b + 30) {
    // Dominante rouge claire
    hue = g > b + 20 ? 'orange-red' : (b > g + 40 ? 'pink-magenta' : 'red');
  } else if (g === max && g > r + 30 && g > b + 30) {
    // Dominante verte claire
    hue = r > b ? 'yellow-green' : (b > r + 30 ? 'teal-green' : 'green');
  } else if (b === max && b > r + 30 && b > g + 30) {
    // Dominante bleue claire
    hue = r > g + 20 ? 'purple-blue' : (g > r + 20 ? 'cyan-blue' : 'blue');
  } else if (r === max && g === max) {
    hue = 'yellow';
  } else if (g === max && b === max) {
    hue = 'teal';
  } else if (r === max && b === max) {
    hue = 'magenta';
  } else {
    // Couleur mixte avec faible dominance — décrire par luminance
    hue = lightness < 100 ? 'dark earthy brown' : 'beige tan';
  }

  return intensity ? `${intensity} ${hue}` : hue;
}

// ─────────────────────────────────────────── BLOCS VALIDÉS

const FINISH_BLOCKS: Record<FinishType, string> = {
  mat:        'ultra-matte lacquered finish, zero reflection, velvety surface texture',
  satiné:     'satin lacquered finish, subtle sheen, soft light reflection',
  brillant:   'high-gloss lacquered finish, mirror-like reflections, deep color',
  brossé:     'brushed surface finish, fine linear texture, diffused reflections',
  bois:       'natural wood veneer, visible grain texture, organic warm tones',
  miroir:     'mirror-polished glass finish, high-fidelity reflections, ultra-glossy crystal-clear surface',
  'verre-mat':'frosted matte glass finish, soft translucent surface, subtle light diffusion, contemporary glass texture',
};

const LIGHTING_BLOCKS: Record<LightingType, string> = {
  naturelle: 'natural daylight streaming through large windows, soft diffused shadows, warm golden hour atmosphere, realistic sun direction',
  spots:     'warm recessed LED ceiling spotlights, dramatic accent lighting, under-cabinet LED strip lights casting warm glow on countertop',
  mixte:     'combination of natural daylight from windows and warm recessed LED spotlights, balanced interior lighting, professional staging',
};

const SIZE_BLOCKS: Record<RoomSizeType, string> = {
  petite:  'compact galley kitchen layout, clever storage solutions, efficient use of space',
  moyenne: 'medium L-shaped kitchen with functional island or peninsula',
  grande:  'spacious open kitchen with central island, generous counter space',
  ouverte: 'open-plan kitchen seamlessly connected to living room, modern loft feel',
};

const STYLE_BLOCKS: Record<StyleType, string> = {
  contemporain: 'contemporary minimalist design, clean geometric lines, handleless cabinets, integrated appliances',
  classique:    'classic French cabinetry with frame doors, ornate molding details, timeless elegance',
  industriel:   'industrial loft style, exposed concrete elements, metal accents, raw textures',
  scandinave:   'Scandinavian design, light birch wood accents, functional simplicity, cozy hygge atmosphere',
  haussmannien: 'Haussmann Parisian style, high ceilings, ornate crown molding, traditional French bourgeois elegance',
};

// Négatifs — toujours présents, jamais négociables
const NEGATIVE_PROMPT =
  'cartoon, illustration, 3D render stylized look, CGI obvious, blurry, out of focus, ' +
  'distorted cabinets, wrong proportions, deformed architecture, text overlay, watermark, ' +
  'people, humans, pets, dirty surfaces, messy kitchen, unrealistic lighting, overexposed, ' +
  'underexposed, oversaturated, low quality, amateur photography, fish-eye distortion, ' +
  'floating objects, missing walls, incomplete room, duplicate elements';

// Suffixe technique — toujours présent
const TECH_SUFFIX =
  'Canon EOS R5 mirrorless camera, 24-70mm f/2.8 lens, f/4 aperture, ISO 200, ' +
  'eye-level perspective shot, 8K ultra-high resolution, ' +
  'photorealistic interior design photography, ' +
  'high-end French kitchen showroom quality, ' +
  'Architectural Digest magazine style, professional real estate photography';

// ─────────────────────────────────────────── SEEDS FIXES PAR CONFIGURATION

function buildSeedKey(params: ColoristParams | RenduParams): string {
  if ('facadeHex' in params) {
    return `coloriste-${params.facadeHex}-${params.facadeFinish}-${params.lightingStyle}`;
  } else {
    return `rendu-${params.style}-${params.lightingStyle}-${params.roomSize}`;
  }
}

// Hash déterministe simple → seed reproductible
function hashToSeed(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) + key.charCodeAt(i);
    hash = hash & hash; // convert to 32-bit int
  }
  return Math.abs(hash) % 99999 + 1000;
}

// ─────────────────────────────────────────── VALIDATION

function validatePrompt(prompt: string, negative: string): string[] {
  const warnings: string[] = [];
  if (prompt.length < 150) warnings.push('Prompt trop court — risque de résultat générique');
  if (prompt.length > 900) warnings.push('Prompt trop long — réduire pour éviter la confusion');
  if (!prompt.toLowerCase().includes('kitchen'))    warnings.push('Manque le mot "kitchen"');
  if (!prompt.toLowerCase().includes('photoreali')) warnings.push('Manque "photorealistic"');
  if (!negative.includes('cartoon'))               warnings.push('Négatifs incomplets');
  return warnings;
}

// ─────────────────────────────────────────── BUILDER COLORISTE

export function buildColoristPrompt(
  params: ColoristParams,
  level: PromptLevel = 'standard'
): BuiltPrompt {
  const facadeName   = hexToName(params.facadeHex);
  // Suffixe finition pour poignées / plan si l'utilisateur a choisi une finition
  // spécifique (sinon on garde le matériau standard sans modifier).
  const poigneeFinishSuffix = params.poigneeFinish
    ? `, ${FINISH_BLOCKS[params.poigneeFinish]}`
    : '';
  const planFinishSuffix = params.planFinish
    ? `, ${FINISH_BLOCKS[params.planFinish]}`
    : '';
  const poigneeName  = (params.handleMaterial ?? hexToName(params.poigneeHex) + ' handles') + poigneeFinishSuffix;
  const planName     = (params.countertopMaterial ?? hexToName(params.planHex) + ' countertop') + planFinishSuffix;
  const finishBlock  = FINISH_BLOCKS[params.facadeFinish];
  const lightBlock   = LIGHTING_BLOCKS[params.lightingStyle];

  // Suffixes "texture importée" — quand l'utilisateur a uploadé une image de
  // matière pour un élément, on incite le modèle à respecter ce motif/matière.
  // Best-effort : fal.ai ne consomme pas réellement l'image de texture (un
  // seul image-input possible, déjà occupé par la photo source img2img),
  // mais le mentionner en texte aide souvent le modèle à orienter la matière.
  const facadeTextureHint  = params.facadeTextureDataUrl
    ? ' (matching the imported custom texture pattern and material reference)'
    : '';
  const poigneeTextureHint = params.poigneeTextureDataUrl
    ? ' (matching the imported custom texture pattern and material reference)'
    : '';
  const planTextureHint    = params.planTextureDataUrl
    ? ' (matching the imported custom texture pattern and material reference)'
    : '';

  let prompt = '';

  if (level === 'standard') {
    prompt = [
      `Professional architectural interior photography of a modern French kitchen.`,
      `Kitchen cabinet fronts in ${facadeName}, ${finishBlock}${facadeTextureHint}.`,
      `${poigneeName}${poigneeTextureHint}, ${planName}${planTextureHint}.`,
      lightBlock + '.',
      `Perfectly clean and staged kitchen, showroom presentation.`,
      TECH_SUFFIX + '.',
    ].join(' ');
  }

  else if (level === 'simplified') {
    prompt = [
      `Interior photography of a kitchen with ${facadeName} cabinets${facadeTextureHint}, ${poigneeName}${poigneeTextureHint}.`,
      `${lightBlock}.`,
      `Photorealistic, professional quality, high-end kitchen.`,
      `Canon EOS R5, 8K, interior design magazine.`,
    ].join(' ');
  }

  else { // minimal — ne rate jamais
    prompt = `Photorealistic modern kitchen, ${facadeName} lacquered cabinets, professional interior photography, 8K quality, clean staging.`;
  }

  // Ajout contexte extra si fourni
  if (params.extraContext && level !== 'minimal') {
    prompt += ` ${params.extraContext}.`;
  }

  const seed     = hashToSeed(buildSeedKey(params));
  const warnings = validatePrompt(prompt, NEGATIVE_PROMPT);

  return { prompt, negative: NEGATIVE_PROMPT, seed, level, warnings };
}

// ─────────────────────────────────────────── BUILDER RENDU RÉALISTE

export function buildRenduPrompt(
  params: RenduParams,
  level: PromptLevel = 'standard'
): BuiltPrompt {
  const lightBlock = LIGHTING_BLOCKS[params.lightingStyle];
  const sizeBlock  = SIZE_BLOCKS[params.roomSize];
  const styleBlock = STYLE_BLOCKS[params.style];
  const planSource = params.hasPlanFile
    ? 'Based on architectural floor plan, precise room proportions and layout'
    : 'Spacious well-proportioned kitchen layout';

  let prompt = '';

  // Lignes optionnelles "Sol" et "Murs" : seulement injectées si présentes
  // (sinon on laisse le modèle décider du sol et des murs sans contrainte).
  const solLine  = params.sol  ? `Floor: ${params.sol}.` : '';
  const mursLine = params.murs ? `Walls: ${params.murs}.` : '';

  if (level === 'standard') {
    prompt = [
      `Professional architectural interior photography of a ${sizeBlock}.`,
      styleBlock + '.',
      planSource + '.',
      `Kitchen featuring: ${params.facades}.`,
      `${params.planTravail} countertop with perfect surface finish.`,
      solLine,
      mursLine,
      lightBlock + '.',
      `Immaculate staging, zero clutter, only essential decorative elements.`,
      `Perfect architectural proportions, straight perspective lines.`,
      TECH_SUFFIX + '.',
    ].filter(Boolean).join(' ');
  }

  else if (level === 'simplified') {
    prompt = [
      `Interior photography of a ${params.style} kitchen.`,
      `${params.facades}, ${params.planTravail} countertop.`,
      lightBlock + '.',
      `Photorealistic, 8K, high-end showroom quality, Canon EOS R5.`,
    ].join(' ');
  }

  else { // minimal
    prompt = `Photorealistic ${params.style} kitchen interior photography, professional lighting, 8K quality, clean modern design.`;
  }

  if (params.extraContext && level !== 'minimal') {
    prompt += ` ${params.extraContext}.`;
  }

  const seed     = hashToSeed(buildSeedKey(params));
  const warnings = validatePrompt(prompt, NEGATIVE_PROMPT);

  return { prompt, negative: NEGATIVE_PROMPT, seed, level, warnings };
}

// ─────────────────────────────────────────── SAFE FALLBACK PROMPTS

// Prompts de secours absolus — validés manuellement — ne ratent jamais
export const SAFE_FALLBACK_PROMPTS: Record<string, BuiltPrompt> = {
  coloriste_dark: {
    prompt: 'Professional interior photography of a modern kitchen with dark matte cabinet fronts, brushed stainless steel handles, white marble countertop. Natural daylight, Canon EOS R5, 8K, photorealistic, high-end showroom.',
    negative: NEGATIVE_PROMPT,
    seed: 42069,
    level: 'minimal',
    warnings: [],
  },
  coloriste_light: {
    prompt: 'Professional interior photography of a modern kitchen with warm white satin lacquered cabinet fronts, polished brass handles, dark granite countertop. Natural daylight, Canon EOS R5, 8K, photorealistic, high-end showroom.',
    negative: NEGATIVE_PROMPT,
    seed: 13371,
    level: 'minimal',
    warnings: [],
  },
  rendu_contemporain: {
    prompt: 'Professional architectural interior photography of a spacious contemporary French kitchen with central island. Clean geometric lines, integrated appliances, white lacquered cabinets, Calacatta marble countertop. Natural daylight from large windows, Canon EOS R5, 8K, photorealistic, Architectural Digest quality.',
    negative: NEGATIVE_PROMPT,
    seed: 55432,
    level: 'minimal',
    warnings: [],
  },
  rendu_classique: {
    prompt: 'Professional interior photography of a classic French kitchen, traditional cabinetry with frame doors, cream shaker cabinets, black granite countertop. Warm lighting, Canon EOS R5, 8K, photorealistic, high-end showroom.',
    negative: NEGATIVE_PROMPT,
    seed: 77321,
    level: 'minimal',
    warnings: [],
  },
};

// ─────────────────────────────────────────── HELPERS EXPORT

/** Retourne le fallback le plus adapté aux paramètres donnés */
export function getBestFallback(params: ColoristParams | RenduParams): BuiltPrompt {
  if ('facadeHex' in params) {
    const r = parseInt(params.facadeHex.slice(1, 3), 16);
    const g = parseInt(params.facadeHex.slice(3, 5), 16);
    const b = parseInt(params.facadeHex.slice(5, 7), 16);
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    return lum < 128 ? SAFE_FALLBACK_PROMPTS.coloriste_dark : SAFE_FALLBACK_PROMPTS.coloriste_light;
  } else {
    return params.style === 'classique' || params.style === 'haussmannien'
      ? SAFE_FALLBACK_PROMPTS.rendu_classique
      : SAFE_FALLBACK_PROMPTS.rendu_contemporain;
  }
}

/** Vérifie si un prompt est valide avant envoi */
export function isPromptValid(built: BuiltPrompt): boolean {
  return built.warnings.length === 0 && built.prompt.length >= 150;
}

// ─────────────────────────────────────────── PROMPTS RÉGION-SPÉCIFIQUES (mode SAM+Inpaint)
//
// Quand on inpaint dans un masque précis (façades / poignées / plan), le
// prompt doit être COURT et FOCALISÉ sur la matière cible, pas une scène
// entière. L'inpainting ne peint que dans le mask, donc inutile de décrire
// la cuisine — on décrit uniquement le matériau à appliquer dans la zone.

/**
 * Prompt pour repeindre UNIQUEMENT les façades de meubles.
 * Renforcé 18/05/2026 : "solid" + "uniform color" pour éviter que Flux
 * interprète la couleur comme un motif/dégradé.
 */
export function buildFacadeRegionPrompt(params: ColoristParams): string {
  const color  = hexToName(params.facadeHex);
  const finish = FINISH_BLOCKS[params.facadeFinish];
  return `kitchen cabinet door panel painted in solid ${color}, uniform consistent color across entire surface, ${finish}, flat smooth panel surface, photorealistic high-end kitchen material, sharp clean edges`;
}

/**
 * Prompt pour repeindre UNIQUEMENT les poignées / boutons / tirants.
 */
export function buildHandleRegionPrompt(params: ColoristParams): string {
  const material = params.handleMaterial ?? `${hexToName(params.poigneeHex)} metal cabinet handle`;
  const finishSuffix = params.poigneeFinish
    ? `, ${FINISH_BLOCKS[params.poigneeFinish]}`
    : '';
  return `single ${material}${finishSuffix}, sleek modern hardware, photorealistic metal texture, sharp clean edges, integrated into cabinet`;
}

/**
 * Prompt pour repeindre UNIQUEMENT le plan de travail.
 */
export function buildCountertopRegionPrompt(params: ColoristParams): string {
  const material = params.countertopMaterial ?? `${hexToName(params.planHex)} countertop surface`;
  const finishSuffix = params.planFinish
    ? `, ${FINISH_BLOCKS[params.planFinish]}`
    : '';
  return `kitchen countertop in ${material}${finishSuffix}, seamless uniform surface, photorealistic high-end material texture, sharp clean edges, subtle natural reflections, premium quality finish`;
}

// ─────────────────────────────────────────── BUILDER COLORISTE — KONTEXT MULTI
// Flux Kontext Max Multi accepte une liste d'images de référence en `image_urls`.
// Convention AVRA pour l'index :
//   index 0 = photo cuisine source (toujours présente, obligatoire)
//   index 1+ = échantillons de textures importés (façade, poignée, plan — dans cet ordre)
// Le prompt référence ces positions explicitement pour que Kontext sache à quoi appliquer
// chaque texture.

export interface KontextImageRefs {
  hasFacadeTexture: boolean;
  hasPoigneeTexture: boolean;
  hasPlanTexture: boolean;
}

export function buildKontextColoristPrompt(
  params: ColoristParams,
  refs: KontextImageRefs,
  level: PromptLevel = 'standard',
): BuiltPrompt {
  const facadeName  = hexToName(params.facadeHex);
  const poigneeName = params.handleMaterial      ?? hexToName(params.poigneeHex) + ' handles';
  const planName    = params.countertopMaterial  ?? hexToName(params.planHex)    + ' countertop';
  const finishBlock = FINISH_BLOCKS[params.facadeFinish];
  const lightBlock  = LIGHTING_BLOCKS[params.lightingStyle];

  // Calcul des index Kontext (image 1 = source ; les textures suivent dans l'ordre).
  let next = 2; // image 1 = source kitchen, donc on commence à 2 pour les textures
  const facadeIdx  = refs.hasFacadeTexture  ? next++ : null;
  const poigneeIdx = refs.hasPoigneeTexture ? next++ : null;
  const planIdx    = refs.hasPlanTexture    ? next++ : null;

  // Instructions par élément : si texture importée → on dit à Kontext de copier
  // la matière de l'image N. Sinon → description couleur/finition uniquement.
  const facadeInstruction = facadeIdx
    ? `replace the cabinet door fronts with the exact material, pattern and color from image ${facadeIdx}`
    : `repaint the cabinet door fronts in ${facadeName} with a ${finishBlock}`;

  const poigneeInstruction = poigneeIdx
    ? `replace the cabinet handles with the exact material and finish from image ${poigneeIdx}`
    : `replace the cabinet handles with ${poigneeName}`;

  const planInstruction = planIdx
    ? `replace the countertop surface with the exact material, veining and color from image ${planIdx}`
    : `replace the countertop surface with ${planName}`;

  let prompt = '';

  if (level === 'standard') {
    prompt = [
      `Edit the kitchen shown in image 1 with these precise material changes:`,
      `- ${facadeInstruction};`,
      `- ${poigneeInstruction};`,
      `- ${planInstruction}.`,
      `Keep the exact original camera angle, framing, room layout, architecture, walls, floor and windows from image 1.`,
      `Only modify the cabinet doors, handles and countertop materials.`,
      `Apply ${lightBlock}.`,
      `Output a photorealistic interior photograph, Architectural Digest magazine quality, professional staging, zero clutter.`,
    ].join(' ');
  }

  else if (level === 'simplified') {
    prompt = [
      `Modify the kitchen in image 1: change cabinet fronts to ${facadeName} (${finishBlock}), handles to ${poigneeName}, countertop to ${planName}.`,
      facadeIdx  ? `Match the cabinet material to image ${facadeIdx}.`  : '',
      poigneeIdx ? `Match the handle material to image ${poigneeIdx}.` : '',
      planIdx    ? `Match the countertop material to image ${planIdx}.`: '',
      `Keep the original camera angle, room layout and architecture. Photorealistic, 8K.`,
    ].filter(Boolean).join(' ');
  }

  else { // minimal — instructions minimales mais utiles
    prompt = `Modify image 1: change kitchen cabinet color to ${facadeName} (${finishBlock}), keep original layout and camera angle. Photorealistic.`;
  }

  if (params.extraContext && level !== 'minimal') {
    prompt += ` ${params.extraContext}.`;
  }

  const seed     = hashToSeed(buildSeedKey(params));
  // Validation : on est moins strict sur la longueur car le prompt Kontext peut
  // être plus court (instructions concises plutôt que descriptif riche).
  const warnings: string[] = [];
  if (prompt.length < 80)  warnings.push('Prompt Kontext trop court');
  if (prompt.length > 900) warnings.push('Prompt trop long — risque de confusion');

  return { prompt, negative: NEGATIVE_PROMPT, seed, level, warnings };
}
