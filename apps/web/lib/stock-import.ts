/**
 * Import du stock depuis un fichier Excel (.xlsx) ou CSV.
 *
 * Retour cofondatrice (22/09/2026) : pouvoir charger sa liste de produits
 * (fichier fournisseur, ou un export AVRA retravaillé) au lieu de tout
 * ressaisir. Ce module ne fait que LIRE et PRÉPARER : l'aperçu est montré à
 * l'utilisateur, qui valide avant tout enregistrement.
 *
 * - En-têtes reconnus avec souplesse (accents, casse, synonymes : « Désignation »,
 *   « Prix achat HT », « PA », « Qté »…). Le fichier exporté par AVRA se
 *   ré-importe tel quel.
 * - Nombres « à la française » acceptés : « 1 234,50 € », « 33 % ».
 * - Photos intégrées au .xlsx récupérées (et réduites) sur leur ligne.
 * - Chaque ligne est classée : à importer / doublon (déjà en stock) / ignorée
 *   (raison affichée).
 */
import type { StockItem } from '@/store';
import { resizeImageToJpeg } from './image-resize';

export type ChampStock =
  | 'supplier' | 'model' | 'reference' | 'category' | 'material' | 'couleur'
  | 'quantity' | 'minQuantity' | 'purchase' | 'sale' | 'dispo';

/** Synonymes d'en-têtes (déjà normalisés : minuscules, sans accents ni ponctuation). */
const SYNONYMES: Record<ChampStock, string[]> = {
  supplier: ['fournisseur', 'marque', 'fabricant', 'supplier', 'brand'],
  model: ['modele', 'designation', 'produit', 'article', 'libelle', 'nom', 'description', 'model', 'name'],
  reference: ['reference', 'ref', 'code', 'code article', 'sku', 'ref fournisseur', 'reference fournisseur'],
  category: ['categorie', 'famille', 'type', 'category', 'rayon'],
  material: ['matiere', 'matiere finition', 'finition', 'materiau', 'material'],
  couleur: ['couleur', 'coloris', 'teinte', 'color', 'colour'],
  quantity: ['quantite', 'qte', 'qty', 'stock', 'quantite en stock', 'qte en stock', 'quantity'],
  minQuantity: ['seuil', 'seuil d alerte', 'seuil alerte', 'stock mini', 'stock minimum', 'minimum', 'min'],
  purchase: ['prix achat', 'prix achat ht', 'achat', 'achat ht', 'pa', 'pa ht', 'cout', 'prix d achat', 'prix d achat ht', 'purchase'],
  sale: ['prix vente', 'prix vente ht', 'vente', 'vente ht', 'pv', 'pv ht', 'prix public', 'prix de vente', 'prix de vente ht', 'prix', 'sale'],
  dispo: ['disponibilite', 'statut', 'dispo', 'etat', 'status'],
};

export const LIBELLES_CHAMPS: Record<ChampStock, string> = {
  supplier: 'Fournisseur', model: 'Modèle', reference: 'Référence', category: 'Catégorie',
  material: 'Matière', couleur: 'Couleur', quantity: 'Quantité', minQuantity: 'Seuil',
  purchase: 'Prix achat', sale: 'Prix vente', dispo: 'Disponibilité',
};

export const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** « 1 234,50 € », « 1.234,5 », « 33 % », 12 → nombre ; vide / illisible → undefined. */
export function lireNombre(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  let s = String(v).replace(/[\s  €$%]/g, '').replace(/EUR/i, '');
  if (!s) return undefined;
  if (s.includes(',') && s.includes('.')) {
    // Le dernier séparateur est la décimale.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function lireDispo(v: unknown): StockItem['dot'] | undefined {
  const s = norm(v);
  if (!s) return undefined;
  if (/rupture|epuise|indisponible|out/.test(s)) return 'red';
  if (/commande|attente|delai|order/.test(s)) return 'orange';
  if (/dispo|stock|oui|available|ok/.test(s)) return 'green';
  return undefined;
}

/** Associe chaque colonne du fichier à un champ AVRA (ou rien). */
export function detecterColonnes(entetes: string[]): (ChampStock | null)[] {
  const pris = new Set<ChampStock>();
  return entetes.map((h) => {
    const n = norm(h);
    if (!n) return null;
    // 1) correspondance exacte, 2) l'en-tête commence par un synonyme.
    for (const passe of [0, 1]) {
      for (const [champ, syns] of Object.entries(SYNONYMES) as [ChampStock, string[]][]) {
        if (pris.has(champ)) continue;
        if (syns.some((s) => (passe === 0 ? n === s : n.startsWith(s + ' ') || n === s))) {
          pris.add(champ);
          return champ;
        }
      }
    }
    return null;
  });
}

export interface LigneImport {
  /** N° de ligne dans le fichier (1 = en-tête). */
  ligne: number;
  item: Omit<StockItem, 'id'>;
  statut: 'ok' | 'doublon' | 'ignoree';
  raison?: string;
}

export interface ResultatImport {
  colonnes: { entete: string; champ: ChampStock | null }[];
  lignes: LigneImport[];
  /** Nom de la feuille lue (xlsx). */
  feuille?: string;
}

// ── Lecture brute ───────────────────────────────────────────────────────────

type Cellule = string | number | null;

/** CSV : séparateur deviné (« ; » Excel FR, « , », tabulation), guillemets gérés. */
function lireCsv(texte: string): Cellule[][] {
  const t = texte.replace(/^﻿/, '');
  const premiere = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = [';', '\t', ','].sort((a, b) => premiere.split(b).length - premiere.split(a).length)[0];
  const lignes: Cellule[][] = [];
  let ligne: Cellule[] = [];
  let champ = '';
  let guill = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guill) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guill = false;
      else champ += c;
    } else if (c === '"') guill = true;
    else if (c === sep) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = '';
    } else champ += c;
  }
  if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes;
}

/** Valeur « simple » d'une cellule ExcelJS (formules, liens, texte riche…). */
function valeurCellule(v: any): Cellule {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (v instanceof Date) return v.toLocaleDateString('fr-FR');
  if (typeof v === 'object') {
    if ('result' in v) return valeurCellule(v.result);
    if ('text' in v) return String(v.text);
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join('');
  }
  return String(v);
}

async function lireXlsx(buf: ArrayBuffer): Promise<{ rows: Cellule[][]; photos: Map<number, string>; feuille: string }> {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  // Première feuille qui contient des données.
  const ws = wb.worksheets.find((w: any) => w.actualRowCount > 0) ?? wb.worksheets[0];
  if (!ws) return { rows: [], photos: new Map(), feuille: '' };
  const rows: Cellule[][] = [];
  const nbCol = ws.columnCount;
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const vals: Cellule[] = [];
    for (let c = 1; c <= nbCol; c++) vals.push(valeurCellule(row.getCell(c).value));
    rows.push(vals);
  }
  // Photos : ancrées sur une ligne (0-based dans ExcelJS) → data-URL.
  const photos = new Map<number, string>();
  for (const im of ws.getImages?.() ?? []) {
    try {
      const media = wb.getImage(Number(im.imageId));
      const ligne = Math.floor(im.range?.tl?.nativeRow ?? im.range?.tl?.row ?? -1) + 1; // → 1-based
      if (!media?.buffer || ligne < 2 || photos.has(ligne)) continue;
      const bytes = new Uint8Array(media.buffer);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const ext = String(media.extension || 'png').replace('jpg', 'jpeg');
      photos.set(ligne, `data:image/${ext};base64,${btoa(bin)}`);
    } catch { /* photo illisible : ignorée */ }
  }
  return { rows, photos, feuille: ws.name };
}

// ── Préparation ─────────────────────────────────────────────────────────────

export async function lireFichierStock(
  file: File,
  opts: {
    categories: Record<string, string>; // clé → libellé (CAT_LABEL)
    categorieParDefaut: string;
    existants: StockItem[];
  },
): Promise<ResultatImport> {
  const nom = file.name.toLowerCase();
  let rows: Cellule[][];
  let photos = new Map<number, string>();
  let feuille: string | undefined;
  if (nom.endsWith('.csv') || nom.endsWith('.txt')) {
    rows = lireCsv(await file.text());
  } else if (nom.endsWith('.xlsx')) {
    const r = await lireXlsx(await file.arrayBuffer());
    rows = r.rows; photos = r.photos; feuille = r.feuille;
  } else {
    throw new Error("Format non pris en charge. Enregistrez le fichier au format Excel (.xlsx) ou CSV, puis réessayez.");
  }

  // Ligne d'en-tête = la première ligne (parmi les 10 premières) qui contient
  // au moins 2 en-têtes reconnus dont le modèle ou le fournisseur.
  let iEntete = -1;
  let champs: (ChampStock | null)[] = [];
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const c = detecterColonnes(rows[i].map((v) => String(v ?? '')));
    const n = c.filter(Boolean).length;
    if (n >= 2 && (c.includes('model') || c.includes('supplier'))) { iEntete = i; champs = c; break; }
  }
  if (iEntete < 0) {
    throw new Error(
      "Colonnes non reconnues. La première ligne du fichier doit contenir des titres comme « Fournisseur », « Modèle » (ou « Désignation »), « Prix achat », « Quantité »…",
    );
  }
  const colonnes = rows[iEntete].map((h, i) => ({ entete: String(h ?? ''), champ: champs[i] }));

  // Catégories : on accepte la clé (PLAN_DE_TRAVAIL) comme le libellé (Plan travail).
  const catIndex = new Map<string, string>();
  for (const [cle, lib] of Object.entries(opts.categories)) {
    if (cle === 'TOUTES') continue;
    catIndex.set(norm(cle), cle);
    catIndex.set(norm(lib), cle);
  }
  const cleDoublon = (s: string, m: string, r?: string) => `${norm(s)}|${norm(m)}|${norm(r)}`;
  const dejaLa = new Set(opts.existants.map((e) => cleDoublon(e.supplier, e.model, e.reference)));
  const vusFichier = new Set<string>();

  const lignes: LigneImport[] = [];
  const photosAReduire: Promise<void>[] = [];
  for (let i = iEntete + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((v) => v === null || String(v).trim() === '')) continue; // ligne vide
    const get = (champ: ChampStock) => {
      const idx = champs.indexOf(champ);
      return idx >= 0 ? row[idx] : null;
    };
    const txt = (champ: ChampStock) => String(get(champ) ?? '').trim();
    const supplier = txt('supplier').toUpperCase();
    const model = txt('model').toUpperCase();
    const reference = txt('reference') || undefined;
    const catBrute = txt('category');
    const item: Omit<StockItem, 'id'> = {
      supplier,
      model,
      reference,
      category: catIndex.get(norm(catBrute)) ?? (catBrute ? 'AUTRE' : opts.categorieParDefaut),
      material: txt('material').toUpperCase(),
      couleur: txt('couleur') || undefined,
      quantity: lireNombre(get('quantity')) !== undefined ? Math.max(0, Math.round(lireNombre(get('quantity'))!)) : undefined,
      minQuantity: lireNombre(get('minQuantity')) !== undefined ? Math.max(0, Math.round(lireNombre(get('minQuantity'))!)) : undefined,
      purchase: Math.max(0, lireNombre(get('purchase')) ?? 0),
      sale: lireNombre(get('sale')) !== undefined ? Math.max(0, lireNombre(get('sale'))!) : null,
      dot: lireDispo(get('dispo')) ?? 'green',
      createdAt: new Date().toISOString(),
    };
    const ligneFichier = i + 1;
    const l: LigneImport = { ligne: ligneFichier, item, statut: 'ok' };
    if (!model && !reference) {
      l.statut = 'ignoree';
      l.raison = 'Ni modèle ni référence';
    } else {
      const k = cleDoublon(supplier, model, reference);
      if (dejaLa.has(k)) { l.statut = 'doublon'; l.raison = 'Déjà dans votre stock'; }
      else if (vusFichier.has(k)) { l.statut = 'doublon'; l.raison = 'En double dans le fichier'; }
      vusFichier.add(k);
    }
    const photo = photos.get(ligneFichier);
    if (photo && l.statut !== 'ignoree') {
      photosAReduire.push(
        resizeImageToJpeg(photo, 400).then((jpeg) => { if (jpeg) l.item.image = jpeg; }),
      );
    }
    lignes.push(l);
  }
  await Promise.all(photosAReduire);
  return { colonnes, lignes, feuille };
}
