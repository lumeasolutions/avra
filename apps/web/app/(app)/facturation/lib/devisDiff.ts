/**
 * devisDiff — comparaison DÉTERMINISTE de deux listes de lignes de devis.
 *
 * Aligne les lignes par description + indice d'occurrence (les doublons ne
 * disparaissent pas) et classe chaque ligne AJOUTÉE / RETIRÉE / MODIFIÉE /
 * IDENTIQUE avec l'écart HT. Partagé par « Comparer 2 devis » (v1, devis
 * natifs) et « Comparer 2 devis PDF » (v4, lignes extraites par IA).
 *
 * Générique sur une interface minimale : tout objet ligne qui expose
 * description/quantite/prixUnitaireHT (+ remise/tva optionnels) convient — le
 * `LigneDocument` de l'app comme la ligne extraite d'un PDF.
 */
import { Plus, Minus, Pencil, Equal } from 'lucide-react';

export interface DiffLine {
  description: string;
  quantite: number;
  prixUnitaireHT: number;
  remise?: number | null;
  tva?: number | null;
}

export type DiffKind = 'ajoute' | 'retire' | 'modifie' | 'identique';

export interface DiffRow<L extends DiffLine = DiffLine> {
  key: string;
  description: string;
  a: L | null;
  b: L | null;
  kind: DiffKind;
  /** Écart HT de la ligne (B − A). */
  deltaHT: number;
}

/** Total HT d'une ligne (quantité × PU × (1 − remise%)). */
export const ligneHT = (l: DiffLine): number =>
  l.quantite * l.prixUnitaireHT * (1 - (l.remise ?? 0) / 100);

const norm = (s: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export const KIND_CFG: Record<DiffKind, { label: string; color: string; bg: string; border: string; Icon: typeof Plus }> = {
  ajoute:    { label: 'Ajoutée',   color: '#16a34a', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.28)', Icon: Plus },
  retire:    { label: 'Retirée',   color: '#dc2626', bg: 'rgba(220,38,38,0.06)',  border: 'rgba(220,38,38,0.26)',  Icon: Minus },
  modifie:   { label: 'Modifiée',  color: '#ea580c', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.28)', Icon: Pencil },
  identique: { label: 'Identique', color: 'rgba(48,64,53,0.5)', bg: 'transparent', border: 'rgba(48,64,53,0.1)', Icon: Equal },
};

export function buildDevisDiff<L extends DiffLine>(aLignes: L[], bLignes: L[]): DiffRow<L>[] {
  // Clé par description + INDICE d'occurrence (ex "pose#0", "pose#1") : on aligne
  // la 1re "Pose" de A avec la 1re de B, etc. -> les doublons NE disparaissent PAS
  // et la somme des lignes reste cohérente avec les totaux.
  const keyed = (lignes: L[]) => {
    const seenCount = new Map<string, number>();
    return lignes.map((l) => {
      const base = norm(l.description);
      const n = seenCount.get(base) ?? 0;
      seenCount.set(base, n + 1);
      return { key: `${base}#${n}`, l };
    });
  };
  const ka = keyed(aLignes);
  const kb = keyed(bLignes);
  const mapA = new Map(ka.map((x) => [x.key, x.l]));
  const mapB = new Map(kb.map((x) => [x.key, x.l]));

  // Ordre : lignes de A d'abord (dans l'ordre), puis celles uniquement dans B.
  const order: string[] = [];
  const seen = new Set<string>();
  for (const x of ka) if (!seen.has(x.key)) { seen.add(x.key); order.push(x.key); }
  for (const x of kb) if (!seen.has(x.key)) { seen.add(x.key); order.push(x.key); }

  return order.map((key) => {
    const la = mapA.get(key) ?? null;
    const lb = mapB.get(key) ?? null;
    let kind: DiffKind;
    if (la && lb) {
      const changed =
        la.quantite !== lb.quantite ||
        la.prixUnitaireHT !== lb.prixUnitaireHT ||
        (la.remise ?? 0) !== (lb.remise ?? 0) ||
        (la.tva ?? null) !== (lb.tva ?? null);
      kind = changed ? 'modifie' : 'identique';
    } else if (la) kind = 'retire';
    else kind = 'ajoute';
    const deltaHT = (lb ? ligneHT(lb) : 0) - (la ? ligneHT(la) : 0);
    return { key, description: (la ?? lb)!.description, a: la, b: lb, kind, deltaHT };
  });
}
