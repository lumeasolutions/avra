import { jsPDF } from 'jspdf';
import type { Devis, LigneDocument } from '@/store/useFacturationStore';

/** Sous-ensemble des infos société nécessaires au PDF. */
export interface DevisPdfSociete {
  nom?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  siret?: string;
}

/** Placement du champ de signature (origine haut-gauche, points, A4). */
export interface SignatureFieldPlacement {
  page: number; // 1-based
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DevisPdfResult {
  /** PDF encodé en base64 (sans préfixe data:). */
  base64: string;
  /** Position du champ de signature à transmettre à Yousign. */
  field: SignatureFieldPlacement;
}

const fmt = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

function calc(lignes: LigneDocument[]) {
  const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT * (1 - (l.remise || 0) / 100), 0);
  const totalTVA = lignes.reduce((s, l) => {
    const ht = l.quantite * l.prixUnitaireHT * (1 - (l.remise || 0) / 100);
    return s + ht * ((l.tva || 0) / 100);
  }, 0);
  return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
}

/**
 * Génère le PDF d'un devis prêt pour la signature électronique (Yousign).
 * Layout A4 simple et lisible : en-tête, parties, tableau des lignes, totaux,
 * mentions, et une zone "Bon pour accord" avec un cadre de signature dont la
 * position exacte (page + coords) est retournée pour Yousign.
 */
export function generateDevisPdfForSignature(
  devis: Devis,
  societe: DevisPdfSociete,
): DevisPdfResult {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 40; // marge
  const GOLD: [number, number, number] = [166, 119, 73];
  const DARK: [number, number, number] = [48, 64, 53];
  let y = 50;

  // ── En-tête ──
  doc.setFont('helvetica', 'bold');
  // En-tête = nom de la société émettrice (white-label), pas "AVRA" en dur.
  doc.setFontSize(societe.nom && societe.nom.length > 22 ? 18 : 26);
  doc.setTextColor(...DARK);
  doc.text(societe.nom || 'AVRA', M, y);
  doc.setFontSize(20);
  doc.setTextColor(...GOLD);
  doc.text('DEVIS', PAGE_W - M, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(`${devis.ref}`, PAGE_W - M, y + 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Créé le ${devis.dateCreation} · Valable jusqu'au ${devis.dateValidite}`, PAGE_W - M, y + 30, { align: 'right' });

  // ── Parties ──
  y = 110;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(M, y - 14, PAGE_W - M, y - 14);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('ÉMETTEUR', M, y);
  doc.text('CLIENT', PAGE_W / 2, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(societe.nom || 'AVRA', M, y + 16);
  doc.text(devis.client || '', PAGE_W / 2, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const emetteur = [societe.adresse, `${societe.codePostal || ''} ${societe.ville || ''}`.trim(), societe.siret ? `SIRET : ${societe.siret}` : ''].filter(Boolean) as string[];
  emetteur.forEach((l, i) => doc.text(l, M, y + 30 + i * 12));
  const client = [devis.clientAddress, devis.clientEmail].filter(Boolean) as string[];
  client.forEach((l, i) => doc.text(l, PAGE_W / 2, y + 30 + i * 12));

  // ── Tableau ──
  y = 200;
  const drawTableHeader = (yy: number) => {
    doc.setFillColor(...GOLD);
    doc.rect(M, yy, PAGE_W - 2 * M, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', M + 8, yy + 15);
    doc.text('QTÉ', M + 270, yy + 15);
    doc.text('PU HT', M + 340, yy + 15, { align: 'right' });
    doc.text('TVA', M + 380, yy + 15);
    doc.text('TOTAL HT', PAGE_W - M - 8, yy + 15, { align: 'right' });
    return yy + 22;
  };
  y = drawTableHeader(y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  for (const l of devis.lignes) {
    if (y > PAGE_H - 160) {
      doc.addPage();
      y = 50;
      y = drawTableHeader(y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
    }
    const ht = l.quantite * l.prixUnitaireHT * (1 - (l.remise || 0) / 100);
    const desc = (l.description || '').slice(0, 60);
    doc.text(desc, M + 8, y + 14);
    doc.text(`${l.quantite} ${l.unite || ''}`.trim(), M + 270, y + 14);
    doc.text(fmt(l.prixUnitaireHT), M + 340, y + 14, { align: 'right' });
    doc.text(`${l.tva || 0}%`, M + 380, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(ht), PAGE_W - M - 8, y + 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(235, 230, 222);
    doc.setLineWidth(0.5);
    doc.line(M, y + 20, PAGE_W - M, y + 20);
    y += 22;
  }

  // ── Totaux ──
  const { totalHT, totalTVA, totalTTC } = calc(devis.lignes);
  y += 14;
  if (y > PAGE_H - 170) { doc.addPage(); y = 60; }
  const tx = PAGE_W - M - 220;
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text('Total HT', tx, y);
  doc.text(fmt(totalHT), PAGE_W - M, y, { align: 'right' });
  doc.text('TVA', tx, y + 16);
  doc.text(fmt(totalTVA), PAGE_W - M, y + 16, { align: 'right' });
  doc.setFillColor(...GOLD);
  doc.rect(tx - 10, y + 26, 220 + 10, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL TTC', tx, y + 43);
  doc.text(fmt(totalTTC), PAGE_W - M, y + 43, { align: 'right' });
  y += 70;

  // ── Mentions ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  if (devis.conditionsPaiement) {
    doc.text(`Conditions : ${devis.conditionsPaiement}`, M, y);
    y += 14;
  }
  const mention = `Ce devis est valable jusqu'au ${devis.dateValidite}. Pour l'accepter, veuillez le signer électroniquement ci-dessous.`;
  doc.text(doc.splitTextToSize(mention, PAGE_W - 2 * M), M, y);
  y += 28;

  // ── Zone signature ("Bon pour accord") ──
  // Si pas assez de place pour la zone, on passe à une nouvelle page.
  const SIG_W = 220;
  const SIG_H = 60;
  const ZONE_H = 90; // libellé + cadre
  if (y > PAGE_H - M - ZONE_H) {
    doc.addPage();
    y = 80;
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Bon pour accord — Date et signature du client', M, y);
  const sigBoxX = M;
  const sigBoxY = y + 12;
  doc.setDrawColor(...DARK);
  doc.setLineWidth(1);
  doc.rect(sigBoxX, sigBoxY, SIG_W, SIG_H);

  const field: SignatureFieldPlacement = {
    page: doc.getNumberOfPages(),
    x: Math.round(sigBoxX + 4),
    y: Math.round(sigBoxY + 3),
    width: SIG_W - 8,
    height: SIG_H - 6,
  };

  const dataUri = doc.output('datauristring'); // data:application/pdf;base64,XXXX
  const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
  return { base64, field };
}
