/**
 * persistVersioning.ts — Versionnage des stores persistés (localStorage).
 *
 * POURQUOI : sans `version` + `migrate`, quand la forme d'un store évolue, les
 * utilisateurs déjà installés réhydratent l'ANCIENNE forme par-dessus la nouvelle
 * → état incompatible, bugs invisibles en dev (navigateur neuf) mais réels en
 * prod. Ce module installe le mécanisme qui rend chaque évolution FUTURE sûre.
 *
 * CONVENTION (à suivre à CHAQUE changement de forme d'un store persisté) :
 *   1. Incrémenter STORE_VERSION.
 *   2. Ajouter un cas de transformation dans le `migrate` du store concerné
 *      (ancienne forme → nouvelle forme), via l'argument `transforms`.
 *   3. Si la transformation est impossible ou inutile : retourner l'état initial
 *      — les données serveur seront re-hydratées par useDataSync (aucune perte,
 *      le backend est source de vérité).
 *
 * BASELINE (v1) : migration IDENTITÉ. On ne touche À RIEN aujourd'hui, surtout
 * pas d'effacement : certains champs (adresse, notes, sous-dossiers) ne vivent
 * encore QU'EN local (cf. correctif #2). Les effacer ici les perdrait.
 */

/**
 * Version courante des stores de données persistés.
 * ⚠️ Incrémenter à CHAQUE rupture de forme d'un store (renommage/typage/structure).
 */
export const STORE_VERSION = 1;

/**
 * Fabrique un `migrate` sûr pour un store persisté.
 *
 * Tant qu'aucune transformation n'est déclarée, il PRÉSERVE l'état persisté
 * (identité) — jamais d'effacement silencieux. Quand une rupture de forme est
 * introduite, on fournit `transforms` : { versionCible: (ancienÉtat) => nouvelÉtat }.
 * Les transformations sont appliquées séquentiellement de (from+1) à STORE_VERSION.
 *
 * @param transforms  Transformations optionnelles indexées par version cible.
 */
export function preservingMigrate<T>(
  transforms?: Record<number, (state: unknown) => T>,
): (persisted: unknown, from: number) => T {
  return (persisted, from) => {
    let state = persisted as T;
    if (transforms) {
      for (let v = (from ?? 0) + 1; v <= STORE_VERSION; v += 1) {
        const t = transforms[v];
        if (t) state = t(state as unknown);
      }
    }
    return state;
  };
}
