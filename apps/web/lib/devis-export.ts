/**
 * Export d'un devis en PDF, Word (.docx) et Excel (.xlsx) — une seule source.
 *
 * Retour cofondatrice (22/09/2026) : « créer un devis dans les dossiers en
 * cours et signés, un Word ou Excel, coordonnées client automatiques avec nos
 * coordonnées société ». Avant : seul un « PDF » via la boîte d'impression du
 * navigateur, en-tête « AVRA » codé en dur, ni logo, ni TVA, ni téléphone.
 *
 * Les trois formats partagent `construireDevis()` : mêmes coordonnées, mêmes
 * lignes, mêmes totaux (ventilation de TVA par taux, mention obligatoire).
 * Les bibliothèques (jsPDF, docx, ExcelJS) sont chargées à la demande.
 */
import type { Devis, LigneDocument } from '@/store/useFacturationStore';
import type { Societe } from '@/store/useConfigStore';

// ─── Modèle commun ───────────────────────────────────────────────────────────

export interface ClientDevis {
  nom: string;
  adresse?: string;
  email?: string;
  /** Repris du dossier lié (le devis ne stocke pas de téléphone). */
  telephone?: string;
}

export interface LigneCalculee {
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  remise: number;
  tva: number;
  totalHT: number;
}

export interface DevisConstruit {
  ref: string;
  objet?: string;
  dateCreation: string;
  dateValidite: string;
  conditionsPaiement?: string;
  notes?: string;
  societe: Societe;
  client: ClientDevis;
  lignes: LigneCalculee[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  /** Base HT et montant de TVA par taux (mention légale). */
  tvaParTaux: Array<{ taux: number; base: number; montant: number }>;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function construireDevis(devis: Devis, societe: Societe, client: ClientDevis): DevisConstruit {
  const lignes: LigneCalculee[] = (devis.lignes ?? []).map((l: LigneDocument) => ({
    description: l.description,
    quantite: Number(l.quantite) || 0,
    unite: l.unite || 'u',
    prixUnitaireHT: Number(l.prixUnitaireHT) || 0,
    remise: Number(l.remise) || 0,
    tva: Number(l.tva) || 0,
    totalHT: round2((Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0) * (1 - (Number(l.remise) || 0) / 100)),
  }));
  // Même règle que l'application (calcLignes + round2 du store) : sommes
  // NON arrondies, arrondi au centime à la fin seulement → le montant du
  // fichier est identique à celui affiché dans AVRA (et aux formules Excel).
  const brutHT = (l: LigneCalculee) => l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
  let sommeHT = 0, sommeTVA = 0;
  const groupes = new Map<number, { base: number; montant: number }>();
  for (const l of lignes) {
    const ht = brutHT(l);
    sommeHT += ht;
    sommeTVA += ht * (l.tva / 100);
    const g = groupes.get(l.tva) ?? { base: 0, montant: 0 };
    g.base += ht;
    g.montant += ht * (l.tva / 100);
    groupes.set(l.tva, g);
  }
  const tvaParTaux = [...groupes.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([taux, g]) => ({ taux, base: round2(g.base), montant: round2(g.montant) }));
  const totalHT = round2(sommeHT);
  const totalTVA = round2(sommeTVA);
  return {
    ref: devis.ref,
    objet: devis.objet || undefined,
    dateCreation: devis.dateCreation,
    dateValidite: devis.dateValidite,
    conditionsPaiement: devis.conditionsPaiement || undefined,
    notes: devis.notes || undefined,
    societe,
    client,
    lignes,
    totalHT,
    totalTVA,
    totalTTC: round2(sommeHT + sommeTVA),
    tvaParTaux,
  };
}

/** « 1 234,50 € » avec des espaces ORDINAIRES (les espaces fines de Intl cassent jsPDF). */
export function eur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(n || 0)
    .replace(/[\u202f\u00a0]/g, ' ');
}
const nombre = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n || 0).replace(/[\u202f\u00a0]/g, ' ');

/** Lignes de coordonnées de la société (vides ignorées). */
export function lignesSociete(s: Societe): string[] {
  const cpVille = [s.codePostal, s.ville].filter(Boolean).join(' ');
  return [
    s.adresse,
    cpVille,
    s.siret ? `SIRET : ${s.siret}` : '',
    s.tva ? `TVA intracom. : ${s.tva}` : '',
    [s.phone, s.email].filter(Boolean).join(' · '),
    s.siteWeb || '',
  ].filter((x) => !!x && x.trim() !== '');
}

export function lignesClient(c: ClientDevis): string[] {
  return [c.adresse, c.telephone ? `Tél. : ${c.telephone}` : '', c.email].filter((x): x is string => !!x && x.trim() !== '');
}

const nomFichier = (d: DevisConstruit, ext: string) =>
  `${(d.ref || 'devis').replace(/[\\/:*?"<>|]+/g, '-')}${d.client.nom ? ` - ${d.client.nom.replace(/[\\/:*?"<>|]+/g, '-')}` : ''}.${ext}`;

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Logo société → data-URL PNG + dimensions (null si absent / illisible). */
async function chargerLogo(src?: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (!src || typeof document === 'undefined') return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx || !c.width || !c.height) return null;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: c.toDataURL('image/png'), w: c.width, h: c.height };
  } catch {
    return null;
  }
}

const dataUrlVersOctets = (dataUrl: string): Uint8Array => {
  const b64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const MENTION_VALIDITE = (d: DevisConstruit) =>
  `Devis valable jusqu'au ${d.dateValidite}. Pour l'accepter, retournez-le daté et signé avec la mention « Bon pour accord ».`;

// ─── PDF (jsPDF) ─────────────────────────────────────────────────────────────

export async function genererPdfDevis(d: DevisConstruit): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 15;
  const OR: [number, number, number] = [166, 119, 73];
  const VERT: [number, number, number] = [48, 64, 53];
  const txt = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ').replace(/[\u2019\u2018]/g, "'").replace(/[\u2013\u2014]/g, '-');
  let y = M;

  // En-tête : logo + nom société / DEVIS + références
  const logo = await chargerLogo(d.societe.logo);
  let xNom = M;
  if (logo) {
    const h = 18, w = Math.min(45, (logo.w / logo.h) * h);
    doc.addImage(logo.dataUrl, 'PNG', M, y, w, (w / (logo.w / logo.h)));
    xNom = M + w + 4;
  }
  doc.setTextColor(...VERT);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(txt(d.societe.nom || ''), xNom, y + 7);
  doc.setTextColor(...OR); doc.setFontSize(20);
  doc.text('DEVIS', W - M, y + 7, { align: 'right' });
  doc.setTextColor(...VERT); doc.setFontSize(11);
  doc.text(txt(d.ref), W - M, y + 13, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(110, 110, 110);
  doc.text(txt(`Créé le ${d.dateCreation}  ·  Valable jusqu'au ${d.dateValidite}`), W - M, y + 18, { align: 'right' });
  y += 24;
  doc.setDrawColor(...OR); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);
  y += 6;

  // Blocs Émetteur / Client
  const blocW = (W - 2 * M - 6) / 2;
  const bloc = (x: number, titre: string, nom: string, lignes: string[]) => {
    const hauteur = 10 + 4.6 * lignes.length + 4;
    doc.setFillColor(248, 245, 240); doc.roundedRect(x, y, blocW, hauteur, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(150, 150, 150);
    doc.text(titre.toUpperCase(), x + 4, y + 5);
    doc.setFontSize(10.5); doc.setTextColor(...VERT);
    doc.text(txt(nom || '-'), x + 4, y + 10.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
    lignes.forEach((l, i) => doc.text(txt(l), x + 4, y + 15.5 + i * 4.6, { maxWidth: blocW - 8 }));
    return hauteur;
  };
  const h1 = bloc(M, 'Émetteur', d.societe.nom, lignesSociete(d.societe));
  const h2 = bloc(M + blocW + 6, 'Client', d.client.nom, lignesClient(d.client));
  y += Math.max(h1, h2) + 6;

  if (d.objet) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...VERT);
    doc.text(txt(`Objet : ${d.objet}`), M, y + 3);
    y += 8;
  }

  // Tableau des lignes (pagination + en-tête répété)
  const cols = [
    { t: 'Désignation', w: 78, a: 'left' as const },
    { t: 'Qté', w: 14, a: 'right' as const },
    { t: 'Unité', w: 14, a: 'center' as const },
    { t: 'PU HT', w: 24, a: 'right' as const },
    { t: 'Rem.', w: 12, a: 'right' as const },
    { t: 'TVA', w: 12, a: 'right' as const },
    { t: 'Total HT', w: 26, a: 'right' as const },
  ];
  const enTete = () => {
    doc.setFillColor(...OR); doc.rect(M, y, W - 2 * M, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    let x = M;
    for (const c of cols) {
      const tx = c.a === 'left' ? x + 2 : c.a === 'right' ? x + c.w - 2 : x + c.w / 2;
      doc.text(c.t, tx, y + 4.7, { align: c.a });
      x += c.w;
    }
    y += 7;
  };
  enTete();
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  d.lignes.forEach((l, i) => {
    const desc = doc.splitTextToSize(txt(l.description), cols[0].w - 4) as string[];
    const hauteur = Math.max(7, desc.length * 4 + 3);
    if (y + hauteur > H - 30) { doc.addPage(); y = M; enTete(); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); }
    if (i % 2 === 1) { doc.setFillColor(250, 248, 245); doc.rect(M, y, W - 2 * M, hauteur, 'F'); }
    doc.setTextColor(...VERT);
    const valeurs = [
      desc, nombre(l.quantite), l.unite, eur(l.prixUnitaireHT),
      l.remise ? `${nombre(l.remise)} %` : '-', `${nombre(l.tva)} %`, eur(l.totalHT),
    ];
    let x = M;
    cols.forEach((c, k) => {
      const tx = c.a === 'left' ? x + 2 : c.a === 'right' ? x + c.w - 2 : x + c.w / 2;
      doc.text(valeurs[k] as string | string[], tx, y + 4.8, { align: c.a });
      x += c.w;
    });
    y += hauteur;
    doc.setDrawColor(235, 228, 220); doc.setLineWidth(0.2); doc.line(M, y, W - M, y);
  });

  // Totaux + ventilation TVA
  const nbLignesTot = 2 + d.tvaParTaux.length;
  if (y + 12 + nbLignesTot * 6 + 10 > H - 25) { doc.addPage(); y = M; }
  y += 5;
  const xT = W - M - 75;
  doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal');
  const ligneTot = (lib: string, val: string) => {
    doc.text(txt(lib), xT, y); doc.text(txt(val), W - M - 3, y, { align: 'right' }); y += 5.5;
  };
  ligneTot('Total HT', eur(d.totalHT));
  for (const g of d.tvaParTaux) ligneTot(`TVA ${nombre(g.taux)} % (base ${eur(g.base)})`, eur(g.montant));
  doc.setFillColor(...OR); doc.roundedRect(xT - 3, y - 4, W - M - (xT - 3), 9, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL TTC', xT, y + 2); doc.text(txt(eur(d.totalTTC)), W - M - 3, y + 2, { align: 'right' });
  y += 14;

  // Conditions, notes, bon pour accord
  const bas: string[] = [];
  if (d.conditionsPaiement) bas.push(`Conditions de paiement : ${d.conditionsPaiement}`);
  if (d.notes) bas.push(d.notes);
  bas.push(MENTION_VALIDITE(d));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
  for (const para of bas) {
    const l = doc.splitTextToSize(txt(para), W - 2 * M) as string[];
    if (y + l.length * 4 > H - 45) { doc.addPage(); y = M; }
    doc.text(l, M, y); y += l.length * 4 + 2;
  }
  if (y + 32 > H - 15) { doc.addPage(); y = M; }
  y += 3;
  doc.setDrawColor(200, 190, 175); doc.setLineWidth(0.3);
  doc.rect(W - M - 80, y, 80, 28);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...VERT);
  doc.text(txt('Bon pour accord — date et signature du client'), W - M - 77, y + 5);

  // Pied de page : société + pagination
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    const pied = [d.societe.nom, d.societe.siret ? `SIRET ${d.societe.siret}` : '', d.societe.tva ? `TVA ${d.societe.tva}` : ''].filter(Boolean).join(' · ');
    doc.text(txt(pied), M, H - 8);
    doc.text(`Page ${p} / ${pages}`, W - M, H - 8, { align: 'right' });
  }
  return doc.output('blob');
}

// ─── Word (docx) ─────────────────────────────────────────────────────────────

export async function genererWordDevis(d: DevisConstruit): Promise<Blob> {
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
    AlignmentType, BorderStyle, ShadingType, ImageRun, VerticalAlign,
  } = docx;
  const OR = 'A67749', VERT = '304035', SABLE = 'F8F5F0';
  const sansBord = { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
  const p = (text: string, o: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}) =>
    new Paragraph({
      alignment: o.align,
      spacing: { after: o.after ?? 40 },
      children: [new TextRun({ text, bold: o.bold, size: (o.size ?? 10) * 2, color: o.color ?? VERT, font: 'Calibri' })],
    });

  // En-tête
  const logo = await chargerLogo(d.societe.logo);
  const gauche: InstanceType<typeof Paragraph>[] = [];
  if (logo) {
    const h = 60, w = Math.round(Math.min(170, (logo.w / logo.h) * h));
    gauche.push(new Paragraph({ children: [new ImageRun({ type: 'png', data: dataUrlVersOctets(logo.dataUrl), transformation: { width: w, height: Math.round(w / (logo.w / logo.h)) } })] }));
  }
  gauche.push(p(d.societe.nom || '', { bold: true, size: 16 }));
  const enTete = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...sansBord, insideHorizontal: sansBord.top, insideVertical: sansBord.top },
    rows: [new TableRow({ children: [
      new TableCell({ borders: sansBord, width: { size: 55, type: WidthType.PERCENTAGE }, children: gauche }),
      new TableCell({ borders: sansBord, width: { size: 45, type: WidthType.PERCENTAGE }, children: [
        p('DEVIS', { bold: true, size: 22, color: OR, align: AlignmentType.RIGHT }),
        p(d.ref, { bold: true, size: 12, align: AlignmentType.RIGHT }),
        p(`Créé le ${d.dateCreation}`, { size: 9, color: '6E6E6E', align: AlignmentType.RIGHT, after: 0 }),
        p(`Valable jusqu'au ${d.dateValidite}`, { size: 9, color: '6E6E6E', align: AlignmentType.RIGHT }),
      ] }),
    ] })],
  });

  const bloc = (titre: string, nom: string, lignes: string[]) => new TableCell({
    borders: sansBord,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: SABLE },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [p(titre.toUpperCase(), { bold: true, size: 8, color: '969696' }), p(nom || '-', { bold: true, size: 11 }), ...lignes.map((l) => p(l, { size: 9, color: '505050', after: 20 }))],
  });
  const coordonnees = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...sansBord, insideHorizontal: sansBord.top, insideVertical: { style: BorderStyle.SINGLE, size: 12, color: 'FFFFFF' } },
    rows: [new TableRow({ children: [bloc('Émetteur', d.societe.nom, lignesSociete(d.societe)), bloc('Client', d.client.nom, lignesClient(d.client))] })],
  });

  const colonnes = [
    { t: 'Désignation', w: 40, a: AlignmentType.LEFT },
    { t: 'Qté', w: 8, a: AlignmentType.RIGHT },
    { t: 'Unité', w: 8, a: AlignmentType.CENTER },
    { t: 'PU HT', w: 12, a: AlignmentType.RIGHT },
    { t: 'Remise', w: 9, a: AlignmentType.RIGHT },
    { t: 'TVA', w: 8, a: AlignmentType.RIGHT },
    { t: 'Total HT', w: 15, a: AlignmentType.RIGHT },
  ];
  const bordFin = { style: BorderStyle.SINGLE, size: 4, color: 'EBE4DC' };
  const cellule = (text: string, k: number, entete = false, fond?: string) => new TableCell({
    width: { size: colonnes[k].w, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: entete ? { type: ShadingType.CLEAR, color: 'auto', fill: OR } : fond ? { type: ShadingType.CLEAR, color: 'auto', fill: fond } : undefined,
    borders: { top: bordFin, bottom: bordFin, left: sansBord.left, right: sansBord.right },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [p(text, { bold: entete, size: entete ? 8.5 : 9, color: entete ? 'FFFFFF' : VERT, align: colonnes[k].a, after: 0 })],
  });
  const tableau = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: colonnes.map((c, k) => cellule(c.t, k, true)) }),
      ...d.lignes.map((l, i) => new TableRow({ children: [
        l.description, nombre(l.quantite), l.unite, eur(l.prixUnitaireHT),
        l.remise ? `${nombre(l.remise)} %` : '-', `${nombre(l.tva)} %`, eur(l.totalHT),
      ].map((v, k) => cellule(v, k, false, i % 2 === 1 ? 'FAF8F5' : undefined)) })),
    ],
  });

  const ligneTotal = (lib: string, val: string, fort = false) => new TableRow({ children: [
    new TableCell({ borders: sansBord, shading: fort ? { type: ShadingType.CLEAR, color: 'auto', fill: OR } : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(lib, { bold: fort, size: fort ? 11 : 9.5, color: fort ? 'FFFFFF' : '505050', after: 0 })] }),
    new TableCell({ borders: sansBord, shading: fort ? { type: ShadingType.CLEAR, color: 'auto', fill: OR } : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(val, { bold: fort, size: fort ? 11 : 9.5, color: fort ? 'FFFFFF' : '505050', align: AlignmentType.RIGHT, after: 0 })] }),
  ] });
  const totaux = new Table({
    width: { size: 55, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    borders: { ...sansBord, insideHorizontal: sansBord.top, insideVertical: sansBord.top },
    rows: [
      ligneTotal('Total HT', eur(d.totalHT)),
      ...d.tvaParTaux.map((g) => ligneTotal(`TVA ${nombre(g.taux)} % (base ${eur(g.base)})`, eur(g.montant))),
      ligneTotal('TOTAL TTC', eur(d.totalTTC), true),
    ],
  });

  const signature = new Table({
    width: { size: 50, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    rows: [new TableRow({ height: { value: 1500, rule: 'atLeast' as never }, children: [new TableCell({
      borders: { top: { style: BorderStyle.SINGLE, size: 6, color: 'C8BEAF' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C8BEAF' }, left: { style: BorderStyle.SINGLE, size: 6, color: 'C8BEAF' }, right: { style: BorderStyle.SINGLE, size: 6, color: 'C8BEAF' } },
      margins: { top: 80, left: 100, right: 100 },
      children: [p('Bon pour accord — date et signature du client', { bold: true, size: 8.5 })],
    })] })],
  });

  const enfants = [
    enTete,
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: OR, space: 4 } }, spacing: { after: 200 }, children: [] }),
    coordonnees,
    new Paragraph({ spacing: { after: 160 }, children: [] }),
    ...(d.objet ? [p(`Objet : ${d.objet}`, { bold: true, size: 11, after: 160 })] : []),
    tableau,
    new Paragraph({ spacing: { after: 160 }, children: [] }),
    totaux,
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    ...(d.conditionsPaiement ? [p(`Conditions de paiement : ${d.conditionsPaiement}`, { size: 9.5, color: '505050' })] : []),
    ...(d.notes ? [p(d.notes, { size: 9.5, color: '505050' })] : []),
    p(MENTION_VALIDITE(d), { size: 9, color: '6E6E6E', after: 240 }),
    signature,
  ];
  const pied = [d.societe.nom, d.societe.siret ? `SIRET ${d.societe.siret}` : '', d.societe.tva ? `TVA ${d.societe.tva}` : ''].filter(Boolean).join(' · ');
  const document_ = new Document({
    creator: d.societe.nom || 'AVRA',
    title: `Devis ${d.ref}`,
    sections: [{
      properties: { page: { margin: { top: 850, bottom: 850, left: 850, right: 850 } } },
      footers: { default: new docx.Footer({ children: [p(pied, { size: 7.5, color: '969696', align: AlignmentType.CENTER })] }) },
      children: enfants,
    }],
  });
  return Packer.toBlob(document_);
}

// ─── Excel (ExcelJS, avec formules) ──────────────────────────────────────────

export async function genererExcelDevis(d: DevisConstruit): Promise<Blob> {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = d.societe.nom || 'AVRA';
  const ws = wb.addWorksheet('Devis', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 46 }, { width: 9 }, { width: 9 }, { width: 13 }, { width: 10 }, { width: 8 }, { width: 14 }, { width: 13 }];
  const OR = 'FFA67749', VERT = 'FF304035', SABLE = 'FFF8F5F0';
  const euro = '#,##0.00 "€"';

  let r = 1;
  const logo = await chargerLogo(d.societe.logo);
  if (logo) {
    const id = wb.addImage({ base64: logo.dataUrl, extension: 'png' });
    const h = 50, w = Math.min(160, (logo.w / logo.h) * h);
    ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: w, height: w / (logo.w / logo.h) } });
    ws.getRow(1).height = 42;
    r = 2;
  }
  ws.getCell(`A${r}`).value = d.societe.nom || '';
  ws.getCell(`A${r}`).font = { bold: true, size: 16, color: { argb: VERT } };
  ws.getCell(`G${r}`).value = 'DEVIS';
  ws.getCell(`G${r}`).font = { bold: true, size: 18, color: { argb: OR } };
  ws.getCell(`G${r}`).alignment = { horizontal: 'right' };
  r++;
  ws.getCell(`G${r}`).value = d.ref; ws.getCell(`G${r}`).font = { bold: true, color: { argb: VERT } }; ws.getCell(`G${r}`).alignment = { horizontal: 'right' };
  r++;
  ws.getCell(`G${r}`).value = `Créé le ${d.dateCreation} · Valable jusqu'au ${d.dateValidite}`;
  ws.getCell(`G${r}`).font = { size: 9, color: { argb: 'FF6E6E6E' } }; ws.getCell(`G${r}`).alignment = { horizontal: 'right' };
  r += 2;

  // Coordonnées : société en A, client en E
  const debutCoord = r;
  const ecrireBloc = (col: 'A' | 'E', titre: string, nom: string, lignes: string[]) => {
    let rr = debutCoord;
    ws.getCell(`${col}${rr}`).value = titre.toUpperCase(); ws.getCell(`${col}${rr}`).font = { bold: true, size: 8, color: { argb: 'FF969696' } }; rr++;
    ws.getCell(`${col}${rr}`).value = nom || '-'; ws.getCell(`${col}${rr}`).font = { bold: true, size: 11, color: { argb: VERT } }; rr++;
    for (const l of lignes) { ws.getCell(`${col}${rr}`).value = l; ws.getCell(`${col}${rr}`).font = { size: 9, color: { argb: 'FF505050' } }; rr++; }
    return rr;
  };
  const fin = Math.max(
    ecrireBloc('A', 'Émetteur', d.societe.nom, lignesSociete(d.societe)),
    ecrireBloc('E', 'Client', d.client.nom, lignesClient(d.client)),
  );
  for (let rr = debutCoord; rr < fin; rr++) {
    for (const c of ['A', 'B', 'C', 'E', 'F', 'G', 'H']) ws.getCell(`${c}${rr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SABLE } };
  }
  r = fin + 1;
  if (d.objet) { ws.getCell(`A${r}`).value = `Objet : ${d.objet}`; ws.getCell(`A${r}`).font = { bold: true, size: 11, color: { argb: VERT } }; r += 2; }

  // Lignes avec FORMULES (Total HT et TVA recalculés si on modifie une valeur)
  const entetes = ['Désignation', 'Qté', 'Unité', 'PU HT', 'Remise %', 'TVA %', 'Total HT', 'Montant TVA'];
  const rowH = ws.getRow(r);
  entetes.forEach((t, k) => {
    const c = rowH.getCell(k + 1);
    c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OR } };
    c.alignment = { horizontal: k === 0 ? 'left' : 'center', vertical: 'middle' };
  });
  rowH.height = 20;
  const premiere = r + 1;
  d.lignes.forEach((l, i) => {
    const n = premiere + i;
    const row = ws.getRow(n);
    row.getCell(1).value = l.description;
    row.getCell(2).value = l.quantite;
    row.getCell(3).value = l.unite;
    row.getCell(4).value = l.prixUnitaireHT;
    row.getCell(5).value = l.remise / 100;
    row.getCell(6).value = l.tva / 100;
    const brut = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
    row.getCell(7).value = { formula: `B${n}*D${n}*(1-E${n})`, result: brut };
    row.getCell(8).value = { formula: `G${n}*F${n}`, result: brut * (l.tva / 100) };
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).numFmt = euro; row.getCell(7).numFmt = euro; row.getCell(8).numFmt = euro;
    row.getCell(5).numFmt = '0%'; row.getCell(6).numFmt = '0.0%';
    if (i % 2 === 1) for (let k = 1; k <= 8; k++) row.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF8F5' } };
  });
  const derniere = premiere + Math.max(0, d.lignes.length - 1);
  r = derniere + 2;
  const tot = (lib: string, formula: string, result: number, fort = false) => {
    ws.getCell(`F${r}`).value = lib;
    ws.getCell(`G${r}`).value = { formula, result };
    ws.getCell(`G${r}`).numFmt = euro;
    ws.getCell(`F${r}`).alignment = { horizontal: 'right' };
    if (fort) {
      ws.mergeCells(`F${r}:F${r}`);
      for (const c of ['F', 'G']) { ws.getCell(`${c}${r}`).font = { bold: true, color: { argb: 'FFFFFFFF' } }; ws.getCell(`${c}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OR } }; }
    }
    r++;
  };
  const plage = (col: string) => d.lignes.length ? `${col}${premiere}:${col}${derniere}` : `${col}${premiere}:${col}${premiere}`;
  tot('Total HT', `ROUND(SUM(${plage('G')}),2)`, d.totalHT);
  tot('TVA', `ROUND(SUM(${plage('H')}),2)`, d.totalTVA);
  tot('TOTAL TTC', `ROUND(SUM(${plage('G')})+SUM(${plage('H')}),2)`, d.totalTTC, true);
  r++;
  const bas = [
    d.conditionsPaiement ? `Conditions de paiement : ${d.conditionsPaiement}` : '',
    d.notes ?? '',
    MENTION_VALIDITE(d),
  ].filter(Boolean);
  for (const t of bas) {
    ws.mergeCells(`A${r}:H${r}`);
    ws.getCell(`A${r}`).value = t;
    ws.getCell(`A${r}`).font = { size: 9, color: { argb: 'FF505050' } };
    ws.getCell(`A${r}`).alignment = { wrapText: true };
    ws.getRow(r).height = 28;
    r++;
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ─── Téléchargement ──────────────────────────────────────────────────────────

export type FormatDevis = 'pdf' | 'docx' | 'xlsx';

export async function telechargerDevis(devis: Devis, societe: Societe, client: ClientDevis, format: FormatDevis): Promise<void> {
  const d = construireDevis(devis, societe, client);
  const blob = format === 'pdf' ? await genererPdfDevis(d)
    : format === 'docx' ? await genererWordDevis(d)
      : await genererExcelDevis(d);
  telecharger(blob, nomFichier(d, format));
}
