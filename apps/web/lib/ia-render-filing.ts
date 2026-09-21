/**
 * Classement des rendus IA (réalistes, coloriste…) dans les dossiers.
 *
 * Retour cofondatrice (22/09/2026) : « comment classer les rendus 3D réalistes
 * dans les dossiers ? le meilleur système ». Règles :
 *
 *  - Un rendu est rangé dans la PHASE du projet à laquelle il se rapporte :
 *    l'option (cuisiniste : OPTION, OPTION 2…), le projet (menuisier : PROJET…)
 *    ou la version (architecte : PROJET – APS / APD). Dans un dossier signé :
 *    l'option validée (« OPTION 2 VALIDÉE », « APD VERSION 2 (DOSSIER SIGNÉ) »…).
 *  - Sous-dossier dédié « RENDUS 3D » dans cette phase : « OPTION 2 ▸ RENDUS 3D ».
 *    À la signature, l'option validée emporte ses sous-dossiers (et donc ses
 *    rendus) : le client retrouve exactement les visuels qu'il a validés.
 *  - Nom automatique et numéroté : « Rendu réaliste — Option 2 — 22-09-2026 — v3.jpg »,
 *    avec, si voulu, la photo d'origine à côté (« … — v3 — photo d'origine.jpg »).
 *  - Sans phase identifiable : « RENDUS 3D » à la racine du dossier.
 */

export const RENDUS_3D = 'RENDUS 3D';
const SEP = ' ▸ ';

export interface PhaseRendu {
  /** Chemin du sous-dossier de la phase ('' = racine du dossier). */
  label: string;
  /** Libellé lisible (« Option 2 », « Projet – APD », « Dossier (général) »). */
  titre: string;
}

/** Sous-dossier de 1er niveau qui correspond à une option / un projet / une version. */
export function estPhase(label: string): boolean {
  if (!label || label.includes(SEP)) return false;
  return /^(OPTION|PROJET|APD|APS)\b/i.test(label.trim());
}

/** « OPTION 2 VALIDÉE » → « Option 2 validée » (pour le nom du fichier). */
export function titrePhase(label: string): string {
  if (!label) return 'Dossier';
  const t = label.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Phases proposées pour un dossier, dans l'ordre d'affichage, + « Dossier (général) ». */
export function phasesDuDossier(subfolderLabels: string[]): PhaseRendu[] {
  const phases = subfolderLabels
    .filter(estPhase)
    .map((label) => ({ label, titre: titrePhase(label) }));
  return [...phases, { label: '', titre: 'Dossier (général, hors option)' }];
}

/**
 * Phase choisie par défaut :
 *  1. celle demandée explicitement (lien « Rendu réaliste » depuis le dossier) ;
 *  2. dossier signé : l'option / le projet VALIDÉ(E) ;
 *  3. sinon la plus récente : numéro le plus élevé, à défaut la dernière listée
 *     (architecte : APD après APS).
 */
export function phaseParDefaut(subfolderLabels: string[], demandee?: string | null): string {
  const phases = subfolderLabels.filter(estPhase);
  if (demandee !== undefined && demandee !== null && (demandee === '' || phases.includes(demandee))) return demandee;
  const validee = phases.find((l) => /VALID|DOSSIER SIGN/i.test(l));
  if (validee) return validee;
  let best = '';
  let bestN = -1;
  phases.forEach((l, i) => {
    const m = /(\d+)/.exec(l);
    const n = m ? parseInt(m[1], 10) * 1000 + i : i; // numéro d'abord, puis ordre
    if (n >= bestN) { bestN = n; best = l; }
  });
  return best;
}

/** Sous-dossier cible : « OPTION 2 ▸ RENDUS 3D » (ou « RENDUS 3D » à la racine). */
export function dossierRendus(phaseLabel: string): string {
  return phaseLabel ? `${phaseLabel}${SEP}${RENDUS_3D}` : RENDUS_3D;
}

/** Caractères interdits dans un nom de fichier (Windows / macOS). */
const nettoyer = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

/**
 * Prochain numéro de version dans le sous-dossier cible : on compte les rendus
 * déjà présents (les « photo d'origine » ne comptent pas).
 */
export function prochaineVersion(nomsExistants: string[]): number {
  let max = 0;
  for (const n of nomsExistants) {
    if (/photo d'origine/i.test(n)) continue;
    const m = /— v(\d+)(?:\.|\s|$)/i.exec(n);
    if (m) max = Math.max(max, parseInt(m[1], 10));
    else max = Math.max(max, 0);
  }
  const sansNumero = nomsExistants.filter((n) => !/photo d'origine/i.test(n) && !/— v\d+/i.test(n)).length;
  return Math.max(max, sansNumero) + 1;
}

export function nomRendu(module: string, phaseLabel: string, version: number, ext: string, origine = false): string {
  const d = new Date();
  const date = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  const base = `${module} — ${titrePhase(phaseLabel)} — ${date} — v${version}${origine ? " — photo d'origine" : ''}`;
  return `${nettoyer(base)}.${ext}`;
}

/** Extension de fichier d'après le type MIME d'une image. */
export function extensionImage(mime: string | undefined, repli = 'jpg'): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return repli;
}
