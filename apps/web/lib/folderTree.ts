/**
 * folderTree — helpers de navigation imbriquée des dossiers/sous-dossiers.
 *
 * Modèle : on ne stocke PAS d'arbre en base. Un "dossier" est une simple
 * étiquette texte (`DossierDocument.subfolderLabel` côté API ; `SubFolder.label`
 * côté store) qui encode un CHEMIN complet avec le séparateur ` ▸ `.
 *   ex : "PROJET VERSION 1 – APS ▸ Cuisine ▸ Façades"
 *
 * Ce module centralise le parsing/construction de ces chemins et la dérivation
 * de l'arbre (enfants directs, descendants, documents d'un niveau). Il est PUR
 * (aucune dépendance UI) et partagé entre la page dossier et le drawer d'envoi
 * à l'intervenant.
 */

export const SEP = ' ▸ ';

/** "A ▸ B ▸ C" -> ["A","B","C"] ; "" -> [] */
export function splitPath(path: string): string[] {
  if (!path) return [];
  return path.split(SEP).map((s) => s.trim()).filter(Boolean);
}

/** ["A","B","C"] -> "A ▸ B ▸ C" */
export function joinPath(segments: string[]): string {
  return segments.filter(Boolean).join(SEP);
}

/** Dernier segment (nom affiché) : "A ▸ B ▸ C" -> "C" ; "" -> "" */
export function displayName(path: string): string {
  const seg = splitPath(path);
  return seg.length ? seg[seg.length - 1] : '';
}

/** Parent : "A ▸ B ▸ C" -> "A ▸ B" ; "A" -> "" ; "" -> "" */
export function parentPath(path: string): string {
  const seg = splitPath(path);
  if (seg.length <= 1) return '';
  return joinPath(seg.slice(0, -1));
}

/** Profondeur : "" -> 0 (racine) ; "A" -> 1 ; "A ▸ B" -> 2 */
export function depthOf(path: string): number {
  return splitPath(path).length;
}

/** `label` est-il un descendant STRICT de `base` ? */
export function isDescendant(label: string, base: string): boolean {
  if (!base) return !!label && depthOf(label) >= 1; // tout est sous la racine
  return label === base ? false : label.startsWith(base + SEP);
}

/** `label` est-il un enfant DIRECT de `base` ? */
export function isDirectChild(label: string, base: string): boolean {
  if (label === base) return false;
  if (!base) return depthOf(label) === 1;
  return label.startsWith(base + SEP) && depthOf(label) === depthOf(base) + 1;
}

/**
 * Chemins des dossiers enfants DIRECTS de `path`, dérivés de TOUS les labels
 * connus (labels de sous-dossiers ET subfolderLabel des documents). On déduit
 * aussi les dossiers "fantômes" intermédiaires : si un document est rangé dans
 * "A ▸ B ▸ C" alors que "A ▸ B" n'a jamais été créé explicitement, "B" apparaît
 * quand même comme enfant de "A". Renvoie des CHEMINS complets, triés, uniques.
 */
export function childFolders(allLabels: string[], path: string): string[] {
  const baseDepth = depthOf(path);
  const childIndex = baseDepth; // index du segment "enfant direct"
  const set = new Set<string>();
  for (const raw of allLabels) {
    const label = (raw ?? '').trim();
    if (!label) continue;
    // Le label doit être path lui-même (ignoré) ou un descendant.
    if (path) {
      if (label !== path && !label.startsWith(path + SEP)) continue;
    }
    const seg = splitPath(label);
    if (seg.length <= childIndex) continue; // pas d'enfant à ce niveau
    const childFullPath = joinPath(seg.slice(0, childIndex + 1));
    set.add(childFullPath);
  }
  return Array.from(set).sort((a, b) =>
    displayName(a).localeCompare(displayName(b), 'fr', { sensitivity: 'base' }),
  );
}

/** Nettoie un nom saisi : retire le séparateur réservé et trim. */
export function sanitizeFolderName(raw: string): string {
  return (raw ?? '').replace(/▸/g, '').replace(/\s+/g, ' ').trim();
}
