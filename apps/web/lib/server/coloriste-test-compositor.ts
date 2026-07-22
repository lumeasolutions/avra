/**
 * coloriste-test-compositor.ts — Cœur technique du module « Coloriste test »
 * (5e onglet IA Studio, isolé — voir /api/ia/coloriste-test).
 *
 * PROBLÈME RÉSOLU (retour utilisateur, juillet 2026) sur le Coloriste ✨
 * existant (SAM2 au clic + MyArchitectAI /change-textures) :
 *   1. « Détection imprécise » — le masque SAM2 brut est envoyé SANS AUCUN
 *      raffinement (pas d'expansion, pas d'adoucissement des bords), alors que
 *      l'ancienne détection EVF-SAM (texte) avait ce réglage. Un masque à bords
 *      durs et parfois légèrement en-deçà de la vraie surface produit une
 *      colorisation qui « mord » sur le fond ou laisse un liseré non traité.
 *   2. « Résultat déformé » — le résultat de /change-textures était utilisé
 *      TEL QUEL. Aucune garantie locale que les pixels HORS du masque restent
 *      identiques à la source : on faisait confiance à 100% au modèle distant.
 *      Si le modèle dérive un peu sur toute l'image (fréquent avec les moteurs
 *      de diffusion), tout le rendu est visuellement "déformé", pas seulement
 *      la zone choisie.
 *
 * SOLUTION — deux étages, tous les deux via `sharp` (déjà une dépendance du
 * projet, aucune install supplémentaire) :
 *
 *   A. `refineSelectionMask()` — dilate légèrement le masque SAM2 brut (pour
 *      ne pas laisser de liseré non traité sur les bords de la surface), PUIS
 *      l'adoucit (feather) pour une transition progressive plutôt qu'un bord
 *      dur — même principe que l'ancien `expandMask`/`blurMask` de la
 *      détection EVF-SAM, réappliqué au masque du clic SAM2 (qui n'en avait
 *      jamais bénéficié).
 *
 *   B. `compositeMaskedResult()` — GARANTIE MATHÉMATIQUE : après génération,
 *      on recompose nous-mêmes l'image finale = original × (1-masque) +
 *      généré × masque (compositing alpha standard, opérateur "over"), au
 *      lieu de faire confiance à la sortie brute du modèle. Peu importe ce
 *      que le modèle a fait HORS de la zone sélectionnée dans son image de
 *      sortie : ces pixels sont REMPLACÉS par les pixels ORIGINAUX avant de
 *      renvoyer le résultat. Il devient donc IMPOSSIBLE que le reste de la
 *      photo soit visuellement déformé, quel que soit le comportement du
 *      moteur distant.
 *
 * Isolé de tout le reste : aucun autre module (Coloriste fal.ai, Rendu,
 * IA Architect, Coloriste ✨) n'utilise ce fichier ni n'est modifié par lui.
 */

import sharp from 'sharp';

/** Télécharge une URL (http/https) et renvoie son contenu binaire brut. */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement image échoué (${res.status}) : ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export interface RefineMaskOptions {
  /**
   * Rayon (sigma sharp, ~px) de dilatation du masque avant adoucissement.
   * Évite un liseré non traité sur les bords de la surface sélectionnée.
   * Valeur prudente : suffisante pour "manger" le léger sous-dimensionnement
   * typique de SAM2, sans déborder franchement sur les surfaces voisines.
   */
  dilateSigma?: number;
  /**
   * Rayon (sigma sharp, ~px) d'adoucissement (feather) final du masque.
   * Transforme le masque binaire (0/255) en dégradé progressif sur les bords
   * → transition douce dans le compositing final au lieu d'un bord dur visible.
   */
  featherSigma?: number;
}

// Retour utilisateur (juillet 2026, test live) : sur des surfaces adjacentes de
// teinte/texture proche (ex: crédence et façade dans la même résine rose
// marbrée), une dilatation trop généreuse peut mordre sur la surface voisine.
// Le vrai correctif pour CE cas précis est côté UI (contour à fort contraste
// dans ColoristeTestClickSelect.tsx, pour repérer et corriger AVANT de générer
// via un point « Retirer ») — mais on reste aussi plus prudent ici par défaut.
const DEFAULT_DILATE_SIGMA = 2;
const DEFAULT_FEATHER_SIGMA = 2.5;

/**
 * Affine un masque SAM2 brut (PNG, blanc = zone sélectionnée) : dilate
 * légèrement puis adoucit les bords. Renvoie un PNG niveaux de gris (0 = rien,
 * 255 = zone pleine, dégradé sur les bords) prêt à servir :
 *   - de masque envoyé à /change-textures (mêmes conventions que le masque brut)
 *   - de canal alpha pour le compositing final (`compositeMaskedResult`)
 */
export async function refineSelectionMask(
  rawMaskBuffer: Buffer,
  opts: RefineMaskOptions = {},
): Promise<Buffer> {
  const dilateSigma = opts.dilateSigma ?? DEFAULT_DILATE_SIGMA;
  const featherSigma = opts.featherSigma ?? DEFAULT_FEATHER_SIGMA;

  // 1) Binaire propre (le PNG SAM2 peut avoir un léger anti-aliasing sur les
  //    bords ; on repart d'un masque net avant de contrôler nous-mêmes la
  //    dilatation/l'adoucissement).
  let mask = await sharp(rawMaskBuffer).greyscale().threshold(128).toBuffer();

  // 2) Dilatation : flouter un masque binaire puis re-seuiller BAS (ex: 10)
  //    fait "gonfler" la zone blanche au-delà de son contour d'origine — c'est
  //    la technique standard de dilatation morphologique via flou+seuil quand
  //    on n'a pas d'opérateur de dilatation dédié.
  if (dilateSigma > 0) {
    mask = await sharp(mask).blur(dilateSigma).threshold(10).toBuffer();
  }

  // 3) Adoucissement final : flou SANS re-seuiller → dégradé progressif sur
  //    les bords, utilisé tel quel comme canal alpha (transition douce).
  const feathered = featherSigma > 0 ? await sharp(mask).blur(featherSigma).toBuffer() : mask;

  return sharp(feathered).png().toBuffer();
}

export interface CompositeParams {
  /** Image source ORIGINALE (référence de vérité — jamais modifiée hors-masque). */
  originalBuffer: Buffer;
  /** Sortie brute du moteur de rendu (peut différer légèrement en dimensions). */
  generatedBuffer: Buffer;
  /** Masque affiné (niveaux de gris, dégradé) issu de `refineSelectionMask`. */
  maskBuffer: Buffer;
  /** Qualité JPEG de sortie (0-100). */
  jpegQuality?: number;
}

/**
 * Recompose l'image finale = original × (1-masque) + généré × masque.
 *
 * GARANTIE : tout pixel où le masque vaut 0 est BIT-À-BIT identique à
 * `originalBuffer` (le "généré" y est totalement transparent avant le
 * compositing "over"). Le moteur distant ne peut donc jamais faire dériver
 * visuellement le reste de l'image — la seule chose qui peut varier hors de
 * la zone choisie, c'est le ré-encodage JPEG final (perte négligeable, pas de
 * déformation géométrique).
 */
export async function compositeMaskedResult(params: CompositeParams): Promise<Buffer> {
  const { originalBuffer, generatedBuffer, maskBuffer, jpegQuality = 92 } = params;

  const originalMeta = await sharp(originalBuffer).metadata();
  const w = originalMeta.width;
  const h = originalMeta.height;
  if (!w || !h) throw new Error('Dimensions de l\'image source introuvables.');

  // Tout est ramené à la taille EXACTE de l'original — garantit l'alignement
  // pixel du masque et de l'image générée avant de les combiner, même si le
  // moteur distant renvoie une image de dimensions légèrement différentes.
  const maskResized = await sharp(maskBuffer)
    .resize(w, h, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();

  const { data: genRaw } = await sharp(generatedBuffer)
    .resize(w, h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Remplace le canal alpha de l'image générée par notre masque affiné : elle
  // devient totalement transparente hors de la zone sélectionnée.
  const genWithMaskAlpha = Buffer.from(genRaw);
  for (let i = 0, px = 0; i < genWithMaskAlpha.length; i += 4, px += 1) {
    genWithMaskAlpha[i + 3] = maskResized[px] ?? 0;
  }
  const generatedMaskedPng = await sharp(genWithMaskAlpha, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();

  // Compositing "over" standard : l'original sert de fond, le généré (masqué)
  // est posé par-dessus. Hors-masque (alpha=0) → pixels ORIGINAUX garantis.
  return sharp(originalBuffer)
    .resize(w, h)
    .composite([{ input: generatedMaskedPng, blend: 'over' }])
    .jpeg({ quality: jpegQuality })
    .toBuffer();
}
