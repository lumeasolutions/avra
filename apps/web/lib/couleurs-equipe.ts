/**
 * couleurs-equipe.ts — la couleur d'un membre de l'équipe.
 *
 * Demande de la cofondatrice (05/10/2026) : « que l'administrateur puisse
 * attribuer une couleur à un vendeur, ou à lui-même », et qu'on retrouve cette
 * couleur sur la carte du dossier et sur le planning — pour voir à qui est
 * quoi sans lire un seul nom.
 *
 * Avant, chaque membre avait déjà une couleur, mais tirée d'un calcul sur les
 * lettres de son nom : personne ne l'avait choisie, et deux collègues
 * pouvaient très bien hériter de la même.
 *
 * Les couleurs choisies sont rangées côté serveur, dans les réglages du
 * workspace, et donc partagées par toute l'équipe : il serait absurde que
 * Cassandra voie le vert là où son vendeur voit du bleu.
 *
 * `couleurMembre` retombe sur l'ancien calcul quand aucune couleur n'a été
 * attribuée : le jour du déploiement, rien ne devient gris.
 */

/** Palette proposée dans les réglages — teintes lisibles sur fond clair comme foncé. */
export const PALETTE_EQUIPE = [
  '#a67749', '#16a34a', '#2563eb', '#7c3aed',
  '#dc2626', '#0891b2', '#ea580c', '#0f766e',
  '#be185d', '#4338ca', '#65a30d', '#b45309',
];

/** Couleur de repli, calculée sur le nom (comportement historique). */
export function couleurDepuisNom(nom: string): string {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) | 0;
  return PALETTE_EQUIPE[Math.abs(h) % PALETTE_EQUIPE.length];
}

/** Gris neutre : aucun vendeur attribué. */
export const COULEUR_SANS_VENDEUR = '#9aa29b';

/**
 * Couleur d'un membre.
 *
 * @param userId identifiant du membre, s'il est connu — c'est la clé fiable
 * @param nom    nom affiché, utilisé en secours pour les anciens dossiers qui
 *               n'ont qu'un nom de vendeur et pas d'identifiant
 * @param choisies couleurs attribuées dans les réglages, par identifiant
 * @param parNom   couleurs attribuées, indexées par nom (construit par
 *                 `couleursParNom`) — pour ces mêmes anciens dossiers
 */
export function couleurMembre(
  userId: string | null | undefined,
  nom: string | null | undefined,
  choisies: Record<string, string> = {},
  parNom: Record<string, string> = {},
): string {
  if (userId && choisies[userId]) return choisies[userId];
  const n = (nom ?? '').trim();
  if (!n) return COULEUR_SANS_VENDEUR;
  const cle = n.toLowerCase();
  if (parNom[cle]) return parNom[cle];
  return couleurDepuisNom(n);
}

/**
 * Index nom → couleur, à partir des membres de l'équipe et des couleurs
 * choisies. Sert aux dossiers d'avant le lien structuré vendeur, qui ne
 * portent qu'un nom.
 */
export function couleursParNom(
  membres: Array<{ userId: string; nom: string }>,
  choisies: Record<string, string>,
): Record<string, string> {
  const index: Record<string, string> = {};
  for (const m of membres) {
    const c = choisies[m.userId];
    const n = (m.nom ?? '').trim().toLowerCase();
    if (c && n) index[n] = c;
  }
  return index;
}

/** Teinte très diluée de la couleur, pour un fond (bandeau, liseré doux). */
export function fondTenu(hex: string, alpha = 0.14): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(154,162,155,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
