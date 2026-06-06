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
  /**
   * Mode de combinaison couleur/texture par élément (19/05/2026, demande asso).
   *   - 'color'   : couleur uniquement (la texture, si fournie, sert seulement
   *                  d'indice subtil de matière dans le prompt)
   *   - 'texture' : texture seule (la couleur n'est pas appliquée — le modèle
   *                  reproduit la matière importée)
   *   - 'mix'     : couleur + texture (la couleur teinte la texture pour un
   *                  rendu hybride)
   */
  facadeColorMode?:  'color' | 'texture' | 'mix';
  poigneeColorMode?: 'color' | 'texture' | 'mix';
  planColorMode?:    'color' | 'texture' | 'mix';
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
  /** Dimensions natives de l'image source (avant compression). Injectées
   *  comme anchor numérique dans le prompt Kontext pour forcer le respect
   *  du ratio et des proportions exactes. */
  sourceWidth?:      number;
  sourceHeight?:     number;
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
 * Descripteurs HSL additionnels pour préciser la teinte au-delà du nom.
 * Flux comprend mieux un prompt "deep saturated vibrant red, warm undertone"
 * qu'un simple "red". Ces descripteurs s'ajoutent au nom de base.
 */
function colorDescriptors(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness  = (r + g + b) / 3;

  const parts: string[] = [];

  // Intensité de saturation
  if (saturation > 0.75) parts.push('highly saturated');
  else if (saturation > 0.45) parts.push('moderately saturated');
  else if (saturation > 0.15) parts.push('muted desaturated');
  else parts.push('neutral achromatic');

  // Clarté
  if (lightness < 60) parts.push('deep dark tone');
  else if (lightness < 110) parts.push('rich medium-dark tone');
  else if (lightness < 170) parts.push('medium tone');
  else if (lightness < 220) parts.push('soft light tone');
  else parts.push('bright pale tone');

  // Warm/cool axis (red+green vs blue)
  const warmth = (r + g * 0.5) - b;
  if (warmth > 40) parts.push('warm undertone');
  else if (warmth < -40) parts.push('cool undertone');

  return parts.join(', ');
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

// Coloriste : négatif anti-recomposition (juin 2026).
// Empêche le modèle de transformer la source en cuisine "showroom magazine".
const NEGATIVE_PROMPT_COLORISTE =
  NEGATIVE_PROMPT + ', ' +
  'no recomposed scene, no showroom restaging, no reorganized layout, ' +
  'no added decoration, no new objects on counters or shelves, no added pendant lights or sconces, ' +
  'no added vases or plants or fruits or books or bottles or art frames, ' +
  'no changed hood shape, no changed glass partition, no changed shelves position, ' +
  'no different camera angle, no different framing, no zoom in or out, ' +
  'no added or removed appliances, no Architectural Digest restyling, no magazine recomposition';

// Suffixe technique — toujours présent
const TECH_SUFFIX =
  'Canon EOS R5 mirrorless camera, 24-70mm f/2.8 lens, f/4 aperture, ISO 200, ' +
  'eye-level perspective shot, 8K ultra-high resolution, ' +
  'photorealistic interior design photography, ' +
  'high-end French kitchen showroom quality, ' +
  'Architectural Digest magazine style, professional real estate photography';

// ─────────────────────────────────────────── BLOCS RENDU PREMIUM (19/05/2026)
// Constantes dédiées au mode "Rendu Réaliste" (Flux Pro Ultra text-to-image).
// Volontairement séparées des blocs coloriste pour qu'on puisse perfectionner
// le rendu sans aucun impact sur le coloriste (le user l'a explicitement
// demandé : "sans retoucher au coloriste").

const LIGHTING_BLOCKS_RENDU: Record<LightingType, string> = {
  naturelle:
    'natural daylight streaming through large windows, soft diffused morning sun, ' +
    'warm golden hour atmosphere with realistic sun direction, gentle bounced light, ' +
    'subtle shadows revealing depth, color temperature 5000K, photographed in available light',
  spots:
    'warm recessed LED ceiling spotlights at 2700K, dramatic three-point accent lighting, ' +
    'under-cabinet LED strip lights casting warm glow on countertop, ' +
    'subtle highlight on hero materials, controlled studio-quality interior lighting',
  mixte:
    'combination of soft natural daylight from windows and warm recessed LED spotlights at 3000K, ' +
    'balanced multi-source lighting, perfectly exposed highlights and shadows, ' +
    'magazine-grade interior lighting setup, golden hour blended with artificial accent',
};

const SIZE_BLOCKS_RENDU: Record<RoomSizeType, string> = {
  petite:
    'compact galley kitchen with thoughtful storage, narrow but deep workspace, ' +
    'clever vertical organization, intimate yet functional layout',
  moyenne:
    'medium-sized L-shaped or peninsula kitchen, balanced proportions, ' +
    'generous workflow triangle between fridge, sink and stove, room for a small breakfast bar',
  grande:
    'spacious open kitchen with central island, ample counter space, ' +
    'professional-grade workflow zones, room for multiple cooks, statement pendant lighting above island',
  ouverte:
    'open-plan kitchen seamlessly flowing into living and dining area, ' +
    'sight lines through full-height windows, loft-style architectural openness, ' +
    'continuous flooring and cohesive material palette across spaces',
};

// Blocs de style — DESCRIPTIONS D'ATMOSPHÈRE UNIQUEMENT (juin 2026).
// Toute mention de sol, de matériau de plan de travail, de backsplash ou de
// crédence a été retirée : ces éléments doivent être dictés par l'image source
// (en mode Kontext img2img) ou par les champs explicites du formulaire (sol,
// murs, planTravail). Avant, le style "haussmannien" injectait "parquet de
// Versailles" et écrasait le sol demandé par l'utilisateur ("carrelage" etc.).
const STYLE_BLOCKS_RENDU: Record<StyleType, string> = {
  contemporain:
    'contemporary European minimalism aesthetic, handleless integrated push-to-open cabinets, ' +
    'flush-mount appliances, German-engineered precision joinery, ' +
    'hidden storage, clean horizontal lines',
  classique:
    'classic French cabinetry aesthetic with raised-panel shaker doors, ornate egg-and-dart molding, ' +
    'brass cup pulls and knobs, beadboard accents, antique brass faucet, ' +
    'timeless French country elegance with subtle ornamentation',
  industriel:
    'industrial Brooklyn loft kitchen aesthetic, exposed brick accent wall, ' +
    'matte black steel frame cabinets with glass fronts, ' +
    'Edison filament pendant lights, vintage-inspired hardware, raw authentic textures',
  scandinave:
    'Scandinavian hygge kitchen aesthetic, light birch and oak wood accents, painted matte white cabinets, ' +
    'brass minimalist hardware, woven natural fiber accents, ' +
    'potted herbs and ceramic tableware, soft cozy Nordic atmosphere',
  haussmannien:
    'Haussmann Parisian apartment kitchen aesthetic, sky-high ceilings with ornate moldings, ' +
    'marble mantel, arched windows with original ironwork, ' +
    'Belle Époque elegance meets modern function',
};

// Négatif renforcé pour rendu — exclut tous les défauts classiques de l'IA image
const NEGATIVE_PROMPT_RENDU =
  'cartoon, illustration, anime, painting, sketch, drawing, watercolor, ' +
  '3D render look, CGI plastic finish, video game graphics, unrealistic textures, ' +
  'blurry, out of focus, motion blur, soft focus, low resolution, pixelated, jpeg artifacts, ' +
  'distorted cabinets, warped surfaces, melting forms, wrong proportions, ' +
  'deformed architecture, asymmetric where it should be symmetric, ' +
  'text overlay, watermark, signature, logo, brand name, label, sticker, ' +
  'people, humans, faces, body parts, pets, animals, ' +
  'dirty surfaces, messy kitchen, cluttered, dishes piled up, stains, grease, ' +
  'unrealistic lighting, harsh shadows, blown highlights, crushed blacks, ' +
  'overexposed, underexposed, oversaturated, fluorescent green tint, magenta cast, ' +
  'low quality, amateur photography, snapshot, smartphone photo, ' +
  'fish-eye distortion, ultra wide-angle distortion, lens flare excessive, ' +
  'floating objects, levitation, missing walls, incomplete room, duplicate elements, ' +
  'visible camera, photographer reflection, mirror shows photographer, ' +
  'crooked horizon, tilted floor, off-axis perspective';

// Suffixe technique premium pour rendu — référence haut de gamme reconnue par Flux
const TECH_SUFFIX_RENDU =
  'shot on Hasselblad H6D-100c medium format camera, 50mm f/2.8 prime lens, ' +
  'f/8 aperture for maximum depth of field, ISO 100, eye-level perspective with subtle 3-point composition, ' +
  'tack-sharp focus throughout, ultra-detailed materials and textures, ' +
  '8K ultra-high resolution photograph, 16-bit color depth, true-to-life color accuracy, ' +
  'hyperrealistic photorealism, magazine-quality color grading, ' +
  'editorial interior photography in the style of Architectural Digest, Elle Décor, ' +
  'Dwell magazine, Kinfolk aesthetic, World of Interiors curation, ' +
  'professional architectural visualization with award-winning composition';

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
  // 19/05/2026 : le mode de combinaison module la phrase :
  //   - 'texture' → ignore la couleur, suit la matière importée
  //   - 'mix'     → applique la couleur EN TEINTE par-dessus la matière
  //   - 'color' / undefined → couleur seule, texture juste hint subtil
  const textureHintFor = (
    dataUrl: string | undefined,
    mode: 'color' | 'texture' | 'mix' | undefined,
    colorName: string,
  ): string => {
    if (!dataUrl) return '';
    if (mode === 'texture') {
      // Couleur ignorée — on demande explicitement de reproduire la matière
      return ' (replace material with the imported custom texture pattern, ignore color)';
    }
    if (mode === 'mix') {
      return ` (combine the imported custom texture pattern with a ${colorName} tint, hybrid material rendering)`;
    }
    // mode 'color' (ou undefined) — texture juste comme hint léger
    return ' (matching the imported custom texture pattern and material reference)';
  };
  const facadeTextureHint  = textureHintFor(params.facadeTextureDataUrl,  params.facadeColorMode,  facadeName);
  const poigneeTextureHint = textureHintFor(params.poigneeTextureDataUrl, params.poigneeColorMode, poigneeName);
  const planTextureHint    = textureHintFor(params.planTextureDataUrl,    params.planColorMode,    planName);

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

// ─────────────────────────────────────────── BUILDER RENDU KONTEXT (img2img)
// Le mode rendu text-to-image (buildRenduPrompt) a été retiré (juin 2026) :
// sans image source, l'IA inventait sol/crédence/ouvertures de façon
// incohérente avec la pièce réelle. Le seul builder de rendu est désormais
// buildRenduFromImageKontextPrompt — transformation fidèle d'une image source.
// Quand l'user uploade une image (plan WinnerFlex, render 3D, sketch), on bascule
// sur Kontext pour faire une vraie transformation fidèle au layout, plutôt
// qu'une "inspiration" approximative via Ultra image_prompt.

/**
 * Prompt pour Flux Kontext quand l'user uploade une image source à
 * transformer en rendu photoréaliste. L'instruction est impérative et
 * insiste lourdement sur la préservation du layout, angle, et composition,
 * en ne changeant QUE le style de rendu (3D synthétique → photo réelle).
 */
export function buildRenduFromImageKontextPrompt(params: RenduParams): BuiltPrompt {
  const styleBlock = STYLE_BLOCKS_RENDU[params.style];
  const lightBlock = LIGHTING_BLOCKS_RENDU[params.lightingStyle];

  const solLine  = params.sol  ? `- Floor: ${params.sol}.`  : '';
  const mursLine = params.murs ? `- Walls: ${params.murs}.` : '';

  // Liste des matériaux que l'utilisateur a EXPLICITEMENT demandés. Tout ce
  // qui n'est pas dans cette liste DOIT venir de l'image source (verrouillage
  // géométrique strict — anti-dérive « parquet → carrelage », « mur → fenêtre »).
  const userRequestedMaterials = [
    `cabinet facades = ${params.facades}`,
    `countertop = ${params.planTravail}`,
    params.sol  ? `floor = ${params.sol}`  : null,
    params.murs ? `walls = ${params.murs}` : null,
  ].filter(Boolean).join('; ');

  // Anchor numérique des dimensions : Kontext respecte mieux le ratio quand
  // on lui rappelle explicitement la résolution source.
  const dimsLine = params.sourceWidth && params.sourceHeight
    ? `Source image dimensions: ${params.sourceWidth}×${params.sourceHeight} pixels (aspect ratio ${(params.sourceWidth / params.sourceHeight).toFixed(3)}:1) — PRESERVE this exact aspect ratio in the output.`
    : '';

  const prompt = [
    `TASK: Transform the source kitchen image (image 1) — whether it is a 3D render, CAD plan, sketch, or design preview — into a hyperrealistic professional interior photograph.`,
    dimsLine,
    ``,
    `═══════════════════════════════════════════════════════════════`,
    `RULE 1 — PIXEL-PERFECT PRESERVATION (HIGHEST PRIORITY)`,
    `═══════════════════════════════════════════════════════════════`,
    `EVERY visible element in the source image MUST be preserved EXACTLY in the output. The output is the SAME kitchen, simply rendered photorealistically. DO NOT INVENT, MOVE, ADD, REMOVE OR RESIZE anything that is not in the source. Specifically preserve:`,
    ``,
    `Architecture & layout:`,
    `- Camera angle, framing, perspective, focal length, vanishing points — IDENTICAL`,
    `- Wall positions, lengths, corners, openings — EXACTLY as in source`,
    `- Windows: same position, same size, same shape, same count, same mullions and crossbars — NEVER add or remove a window`,
    `- Doors and doorways: same position, same opening direction — NEVER add or remove`,
    `- Ceiling height, ceiling shape, ceiling color — IDENTICAL`,
    `- Floor surface, floor material (parquet planks orientation, tile grid, concrete slab) — IDENTICAL`,
    `- Wall color and wall finish — IDENTICAL`,
    ``,
    `Cabinets and joinery:`,
    `- Every cabinet, drawer, shelf, panel: same position, same dimensions, same count, same orientation`,
    `- Cabinet door splits, drawer fronts, open shelves — IDENTICAL`,
    `- Handles, knobs, pulls: same position, same style (or absent if not visible)`,
    ``,
    `Appliances and fixtures:`,
    `- Oven, stovetop, fridge, microwave, hood, dishwasher: same position, same size, same brand-style`,
    `- Sink: same shape (single/double bowl), same material, same position`,
    `- Faucet / robinetterie: same position, same style (mixer, pull-down, gooseneck), same finish`,
    `- Electrical outlets / prises électriques: same position, same count — NEVER add or remove an outlet`,
    `- Light switches: same position, same count`,
    `- Light fixtures (pendants, spots, under-cabinet LEDs): same position, same count`,
    ``,
    `Backsplash and surfaces:`,
    `- Backsplash / crédence: same surface area, same pattern, same tile size — material may change ONLY if user requested below, otherwise IDENTICAL`,
    `- Countertop: same shape, same edge profile, same overhang`,
    ``,
    `Decoration and accessories (THIS IS CRUCIAL):`,
    `- Paintings, photos, framed art on walls: same position, same size, same orientation, same subject matter`,
    `- Plants, vases, pots: same position, same species`,
    `- Books, bottles, fruits, utensils visible on counter: same position, same count`,
    `- Bar stools / tabourets / chaises hautes: same position, same count, same style and height`,
    `- Rugs, mats: same position, same shape`,
    `- Any clock, mirror, decorative object: same position, same style`,
    `- Personal items (coffee machine, kettle, toaster, knife block): same position, same count`,
    ``,
    `═══════════════════════════════════════════════════════════════`,
    `RULE 2 — MATERIAL CHANGES (ONLY THESE, NOTHING ELSE)`,
    `═══════════════════════════════════════════════════════════════`,
    `Apply ONLY the following material refinements requested by the user. Every other material MUST be inferred from the source image (if the source shows wood flooring and the user didn't specify a floor, keep wood flooring).`,
    `User-specified materials: ${userRequestedMaterials}.`,
    ``,
    `═══════════════════════════════════════════════════════════════`,
    `RULE 3 — RENDERING STYLE CHANGE (THE ONLY OTHER ALLOWED CHANGE)`,
    `═══════════════════════════════════════════════════════════════`,
    `Convert the visual style from synthetic/CAD/3D/sketch to hyperrealistic photography.`,
    `Aesthetic atmosphere: ${styleBlock}.`,
    `Lighting: ${lightBlock}.`,
    ``,
    `═══════════════════════════════════════════════════════════════`,
    `ABSOLUTELY FORBIDDEN — these will RUIN the output`,
    `═══════════════════════════════════════════════════════════════`,
    `- DO NOT change wall positions, room dimensions, or layout`,
    `- DO NOT replace a wall with a window, or a window with a wall`,
    `- DO NOT add, remove, move or resize cabinets, appliances, or fixtures`,
    `- DO NOT replace floor material unless the user explicitly requested it above`,
    `- DO NOT replace backsplash/crédence material unless the user explicitly requested it above`,
    `- DO NOT add decorative objects that are not in the source image`,
    `- DO NOT change the camera angle or perspective`,
    `- DO NOT crop, zoom in, or zoom out — preserve the source framing`,
    ``,
    `Output: ultra-realistic professional interior photography, magazine-quality,`,
    `Architectural Digest editorial style, Hasselblad medium format aesthetic,`,
    `8K resolution, hyperrealistic materials and textures, true-to-life colors,`,
    `balanced lighting with realistic shadows, professional staging,`,
    `no CGI plastic look, no 3D render look — pure photography style.`,
  ].filter(Boolean).join('\n');

  if (params.extraContext) {
    return {
      prompt: prompt + `\n\nAdditional details: ${params.extraContext}.`,
      negative: NEGATIVE_PROMPT_RENDU,
      seed: hashToSeed(buildSeedKey(params)),
      level: 'standard',
      warnings: [],
    };
  }

  return {
    prompt,
    negative: NEGATIVE_PROMPT_RENDU,
    seed: hashToSeed(buildSeedKey(params)),
    level: 'standard',
    warnings: [],
  };
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
 * Renforcé 18/05/2026 (v3) : descripteurs HSL pour précision couleur.
 */
export function buildFacadeRegionPrompt(params: ColoristParams): string {
  const color  = hexToName(params.facadeHex);
  const descs  = colorDescriptors(params.facadeHex);
  const finish = FINISH_BLOCKS[params.facadeFinish];
  return `kitchen cabinet door panel painted in solid ${color} (${descs}), uniform consistent color across entire surface, ${finish}, flat smooth panel surface, photorealistic high-end kitchen material, sharp clean edges`;
}

/**
 * Prompt pour repeindre UNIQUEMENT les poignées / boutons / tirants.
 */
export function buildHandleRegionPrompt(params: ColoristParams): string {
  const color = hexToName(params.poigneeHex);
  const descs = colorDescriptors(params.poigneeHex);
  const material = params.handleMaterial ?? `${color} metal cabinet handle`;
  const finishSuffix = params.poigneeFinish
    ? `, ${FINISH_BLOCKS[params.poigneeFinish]}`
    : '';
  return `single ${material} (${descs})${finishSuffix}, sleek modern hardware, photorealistic metal texture, sharp clean edges, integrated into cabinet`;
}

/**
 * Prompt pour repeindre UNIQUEMENT le plan de travail.
 */
export function buildCountertopRegionPrompt(params: ColoristParams): string {
  const color = hexToName(params.planHex);
  const descs = colorDescriptors(params.planHex);
  const material = params.countertopMaterial ?? `${color} countertop surface`;
  const finishSuffix = params.planFinish
    ? `, ${FINISH_BLOCKS[params.planFinish]}`
    : '';
  return `kitchen countertop in ${material} (${descs})${finishSuffix}, seamless uniform surface, photorealistic high-end material texture, sharp clean edges, subtle natural reflections, premium quality finish`;
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
  const facadeDescs = colorDescriptors(params.facadeHex);
  const poigneeName = params.handleMaterial      ?? hexToName(params.poigneeHex) + ' handles';
  const planName    = params.countertopMaterial  ?? hexToName(params.planHex)    + ' countertop';
  const finishBlock = FINISH_BLOCKS[params.facadeFinish];

  // Calcul des index Kontext (image 1 = source ; les textures suivent dans l'ordre).
  let next = 2; // image 1 = source kitchen, donc on commence à 2 pour les textures
  const facadeIdx  = refs.hasFacadeTexture  ? next++ : null;
  const poigneeIdx = refs.hasPoigneeTexture ? next++ : null;
  const planIdx    = refs.hasPlanTexture    ? next++ : null;

  // Instructions par élément : si texture importée → on dit à Kontext de copier
  // la matière de l'image N. Sinon → description couleur/finition uniquement.
  const facadeInstruction = facadeIdx
    ? `Change cabinet door fronts and panels to match the exact material, pattern and color shown in image ${facadeIdx}`
    : `Change cabinet door fronts and panels to ${facadeName} color (${facadeDescs}), with a ${finishBlock}`;

  const poigneeInstruction = poigneeIdx
    ? `Change cabinet handles to match the exact material from image ${poigneeIdx}`
    : `Change cabinet handles to ${poigneeName}`;

  const planInstruction = planIdx
    ? `Change countertop surface to match the exact material, veining and color from image ${planIdx}`
    : `Change countertop surface to ${planName}`;

  let prompt = '';

  if (level === 'standard') {
    // FIX 18/05/2026 (v4) : prompt Kontext ultra-strict après repli SAM.
    // Format LISTE NUMÉROTÉE + CONTRAINTES EXPLICITES "DO NOT CHANGE".
    // Kontext suit mieux les instructions impératives structurées
    // que des descriptions narratives.
    prompt = [
      `Carefully edit the source kitchen photo (image 1) with ONLY these 3 material changes:`,
      ``,
      `1. ${facadeInstruction}.`,
      `2. ${poigneeInstruction}.`,
      `3. ${planInstruction}.`,
      ``,
      `STRICTLY PRESERVE from the source photo — DO NOT CHANGE:`,
      `- Camera angle, framing, perspective, focal length, zoom level`,
      `- Position and shape of every cabinet, drawer and panel`,
      `- All walls, floor tiles, ceiling, windows and doors`,
      `- All appliances (oven, stovetop, refrigerator, microwave, hood, dishwasher)`,
      `- Faucet, sink, plumbing fixtures, drain`,
      `- Wall color, backsplash material and pattern`,
      `- Lighting setup, shadows, reflections direction`,
      `- Decorative items (plants, fruits, bottles, utensils)`,
      ``,
      `The output must look like the EXACT same kitchen photo, only with the cabinet doors, handles and countertop materials changed to the new specifications. Photorealistic professional interior photography.`,
    ].join('\n');
  }

  else if (level === 'simplified') {
    prompt = [
      `Edit image 1: change cabinet fronts to ${facadeName} color, ${finishBlock}.`,
      `Change cabinet handles to ${poigneeName}.`,
      `Change countertop to ${planName}.`,
      facadeIdx  ? `Match cabinet material to image ${facadeIdx}.`  : '',
      poigneeIdx ? `Match handle material to image ${poigneeIdx}.` : '',
      planIdx    ? `Match countertop material to image ${planIdx}.`: '',
      `KEEP everything else (camera angle, walls, floor, appliances) IDENTICAL to the source. Photorealistic.`,
    ].filter(Boolean).join(' ');
  }

  else { // minimal
    prompt = `Edit image 1: only change cabinet color to ${facadeName} (${finishBlock}). Keep camera angle, room and everything else identical. Photorealistic.`;
  }

  if (params.extraContext && level !== 'minimal') {
    prompt += `\n\nAdditional context: ${params.extraContext}.`;
  }

  const seed     = hashToSeed(buildSeedKey(params));
  const warnings: string[] = [];
  if (prompt.length < 80)   warnings.push('Prompt Kontext trop court');
  if (prompt.length > 1500) warnings.push('Prompt trop long — risque de confusion');

  return { prompt, negative: NEGATIVE_PROMPT, seed, level, warnings };
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                