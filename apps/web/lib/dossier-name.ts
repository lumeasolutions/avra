/**
 * Nom affiché d'un dossier client — source unique de vérité.
 *
 * Convention retenue : « NOM Prénom » (ex. « PIU MARIO »), celle déjà utilisée
 * par la liste des dossiers et l'en-tête de la fiche.
 *
 * Pourquoi ce fichier : le nom était recomposé à la main à une dizaine
 * d'endroits, et quatre d'entre eux le faisaient dans l'autre sens
 * (« Prénom NOM »). Un même dossier s'affichait donc « PIU MARIO » dans la
 * liste et « MARIO PIU » dans le titre d'une demande envoyée à l'artisan.
 * Deux de ces endroits laissaient en plus un double espace quand le prénom
 * était vide, `.trim()` ne nettoyant que les extrémités.
 *
 * Depuis septembre 2026, le nom du dossier ne contient plus de type de pièce
 * (« Cuisine », « Dressing »…) : `name` est le nom du client, `firstName` son
 * prénom, stockés séparément.
 */

export interface ClientNameParts {
  name?: string | null;
  firstName?: string | null;
}

/** « NOM Prénom », sans espace superflu si l'une des deux parties manque. */
export function clientDisplayName(d?: ClientNameParts | null): string {
  if (!d) return '';
  return [d.name, d.firstName]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' ');
}
