/**
 * Export du stock en VRAI fichier Excel (.xlsx).
 *
 * Retour cofondatrice (22/09/2026) : « Excel stock ne marche pas ». L'ancien
 * export produisait un CSV séparé par des virgules, sans BOM UTF-8 :
 *   - Excel FR attend des points-virgules → tout arrivait dans UNE colonne ;
 *   - sans BOM, les accents sortaient en « ModÃ¨le » ;
 *   - les photos (stockées en data-URL base64, souvent > 100 000 caractères)
 *     dépassaient la limite de 32 767 caractères par cellule → fichier cassé.
 *
 * Ici : classeur .xlsx natif (ExcelJS, chargé à la demande), en-tête figé
 * avec filtres, prix au format €, marge en %, et la photo INTÉGRÉE en image
 * dans la dernière colonne (formats PNG / JPEG / GIF acceptés par Excel).
 */
import type { StockItem } from '@/store';

const DISPO: Record<StockItem['dot'], string> = {
  green: 'Disponible',
  orange: 'Sur commande',
  red: 'Rupture',
};

/** Extension ExcelJS d'une data-URL image, ou null si Excel ne sait pas l'afficher. */
function imageExtension(dataUrl: string): 'png' | 'jpeg' | 'gif' | null {
  const m = /^data:image\/(png|jpe?g|gif);base64,/i.exec(dataUrl);
  if (!m) return null;
  const t = m[1].toLowerCase();
  return t === 'jpg' ? 'jpeg' : (t as 'png' | 'jpeg' | 'gif');
}

export async function exportStockToExcel(
  items: StockItem[],
  categoryLabel: (c: string) => string,
): Promise<void> {
  // exceljs est un module CommonJS : selon le bundler, il arrive en `default`
  // ou directement en espace de noms.
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AVRA';
  wb.created = new Date();
  const ws = wb.addWorksheet('Stock', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Fournisseur', key: 'supplier', width: 22 },
    { header: 'Modèle', key: 'model', width: 24 },
    { header: 'Référence', key: 'reference', width: 16 },
    { header: 'Catégorie', key: 'category', width: 18 },
    { header: 'Matière / finition', key: 'material', width: 20 },
    { header: 'Couleur', key: 'couleur', width: 14 },
    { header: 'Quantité', key: 'quantity', width: 11 },
    { header: "Seuil d'alerte", key: 'minQuantity', width: 13 },
    { header: 'Prix achat HT', key: 'purchase', width: 14 },
    { header: 'Prix vente HT', key: 'sale', width: 14 },
    { header: 'Marge', key: 'marge', width: 10 },
    { header: 'Disponibilité', key: 'dispo', width: 15 },
    { header: 'Photo', key: 'photo', width: 14 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF304035' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  ws.autoFilter = { from: 'A1', to: 'M1' };

  const euro = '#,##0.00 "€"';
  items.forEach((item, i) => {
    const sale = item.sale ?? null;
    const row = ws.addRow({
      supplier: item.supplier,
      model: item.model,
      reference: item.reference ?? '',
      category: categoryLabel(item.category),
      material: item.material ?? '',
      couleur: item.couleur ?? '',
      quantity: item.quantity ?? null,
      minQuantity: item.minQuantity ?? null,
      purchase: Number(item.purchase) || 0,
      sale,
      // Marge sur prix de vente (même calcul que l'écran) — valeur 0..1 au format %.
      marge: sale ? (sale - (Number(item.purchase) || 0)) / sale : null,
      dispo: DISPO[item.dot] ?? '',
      photo: '',
    });
    row.alignment = { vertical: 'middle', wrapText: true };
    row.getCell('purchase').numFmt = euro;
    row.getCell('sale').numFmt = euro;
    row.getCell('marge').numFmt = '0%';

    const ext = item.image ? imageExtension(item.image) : null;
    if (item.image && ext) {
      row.height = 60;
      const imageId = wb.addImage({ base64: item.image, extension: ext });
      // Colonne M (index 12), ligne i+1 (0-based, l'en-tête est la ligne 0).
      ws.addImage(imageId, { tl: { col: 12.1, row: i + 1.1 }, ext: { width: 72, height: 72 } });
    } else if (item.image) {
      row.getCell('photo').value = item.image.startsWith('http') ? item.image : 'Photo (format non lisible par Excel)';
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Date LOCALE (toISOString est en UTC : après minuit en France, il donnait la veille).
  const d = new Date();
  const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  a.download = `stock-${jour}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
