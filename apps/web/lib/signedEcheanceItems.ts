/**
 * ÉTAPES DU TABLEAU DE BORD D'UN DOSSIER SIGNÉ — source unique.
 *
 * Retour cofondatrice (21/09/2026) : on peut ajouter et renommer des
 * sous-dossiers dans un dossier signé (les architectes « font à leur sauce »),
 * mais chaque ajout doit avoir sa date butoir, son alerte et sa ligne dans le
 * tableau de bord, « sinon tout est faux ».
 *
 * Le moteur d'alertes et la bande « Échéances » lisent déjà TOUTES les clés de
 * `datesButoiresSignes`. Le tableau de bord, lui, partait d'une liste FIXE par
 * métier : une étape ajoutée ou renommée n'y apparaissait jamais. Ce helper
 * construit la liste réelle :
 *
 *   1. les étapes fixes du métier, SAUF celles dont le sous-dossier attendu
 *      (présent dans le modèle du métier) a disparu — renommé ou supprimé — et
 *      qui n'ont plus aucune donnée (ni date, ni validation, ni ligne) ;
 *   2. + les étapes « suivies » hors liste fixe : toute clé de date / de
 *      validation / de lignes commande qui correspond à un sous-dossier de
 *      1er niveau existant (ou qui porte encore une date, pour rester visible
 *      tant qu'elle peut lever une alerte).
 *
 * Une étape suivie qui a des lignes commande reste de type « access » ; sinon
 * c'est une étape à date.
 *
 * Tests : 13 cas (ajout avec/sans date, renommage date/accès, SAV archi,
 * imbriqués, casse, date orpheline) validés le 21/09/2026.
 */
import type { DateButoireItem } from '@/components/dossiers/DateButoireValidationModal';

const NEST = ' ▸ ';
const norm = (s: string) => s.trim().toLowerCase();

export interface SignedEcheanceSources {
  /** Labels de TOUS les sous-dossiers du dossier signé (imbriqués compris). */
  subfolderLabels: string[];
  /** Labels du modèle de sous-dossiers signés du métier. */
  templateLabels: string[];
  dates?: Record<string, string>;
  flags?: Record<string, boolean>;
  access?: Record<string, unknown[]>;
}

export function buildSignedEcheanceItems(
  fixedItems: DateButoireItem[],
  { subfolderLabels, templateLabels, dates = {}, flags = {}, access = {} }: SignedEcheanceSources,
): DateButoireItem[] {
  const topLevel = new Set(subfolderLabels.filter((l) => !l.includes(NEST)).map(norm));
  const template = new Set(templateLabels.map(norm));
  const fixed = new Set(fixedItems.map((it) => norm(it.label)));
  const hasLines = (label: string) => (access[label]?.length ?? 0) > 0;
  const hasData = (label: string) => !!dates[label] || flags[label] !== undefined || hasLines(label);

  const kept = fixedItems.filter((it) => {
    if (it.kind === 'static') return true;
    const n = norm(it.label);
    // Sous-dossier attendu mais disparu (renommé / supprimé) et sans donnée.
    return !(template.has(n) && !topLevel.has(n) && !hasData(it.label));
  });

  const extras: DateButoireItem[] = [];
  const seen = new Set<string>();
  for (const label of [...Object.keys(dates), ...Object.keys(flags), ...Object.keys(access)]) {
    const n = norm(label);
    if (!label.trim() || label.includes(NEST) || fixed.has(n) || seen.has(n)) continue;
    if (!topLevel.has(n) && !dates[label]) continue;
    if (!hasData(label)) continue;
    seen.add(n);
    extras.push({ label, kind: hasLines(label) ? 'access' : 'date' });
  }

  return [...kept, ...extras];
}
