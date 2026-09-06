/**
 * Export FEC — Fichier des Écritures Comptables.
 *
 * POURQUOI CE FICHIER
 * -------------------
 * Cassandra demandait une connexion directe aux logiciels de comptabilité
 * (MEG, Pennylane, Tiime, Sage). Cette connexion suppose des accès API que les
 * éditeurs ne lui ont pas encore accordés — elle est donc à l'arrêt, et pas de
 * notre fait.
 *
 * En attendant, le FEC règle le problème sans dépendre de personne : c'est le
 * format défini par l'article A47 A-1 du Livre des procédures fiscales (arrêté
 * du 29 juillet 2013), obligatoire en France pour toute comptabilité tenue de
 * façon informatisée. Tous les logiciels cités l'importent, et c'est aussi le
 * fichier que l'administration fiscale réclame en cas de contrôle. Un seul
 * export sert donc les quatre outils, et l'expert-comptable aussi.
 *
 * CE QUE L'EXPORT CONTIENT
 * ------------------------
 * Le journal des ventes, une écriture par facture, en partie double :
 *   411 Clients                 débit   montant TTC
 *   707 Ventes                  crédit  montant HT
 *   44571 TVA collectée         crédit  TVA
 * Un avoir est passé dans l'autre sens.
 *
 * DEUX LIMITES ASSUMÉES, À DIRE À L'EXPERT-COMPTABLE
 * --------------------------------------------------
 * 1. Les numéros de compte ci-dessous sont ceux du plan comptable général.
 *    Chaque cabinet a ses habitudes (706 au lieu de 707 pour de la pose, un
 *    compte client individualisé, etc.) : ils se remappent à l'import dans
 *    tous les logiciels cités.
 * 2. La TVA est calculée globalement par facture (TTC − HT). Une facture
 *    mélangeant plusieurs taux sortira donc sur une seule ligne de TVA, juste
 *    en montant mais non ventilée par taux.
 */

/** Journal des ventes. */
const JOURNAL_CODE = 'VE';
const JOURNAL_LIB = 'Ventes';

/** Plan comptable général — voir la limite n°1 dans l'en-tête. */
const COMPTE_CLIENT = { num: '411000', lib: 'Clients' };
const COMPTE_VENTE = { num: '707000', lib: 'Ventes de marchandises' };
const COMPTE_TVA = { num: '445710', lib: 'TVA collectée' };

/** Les 18 colonnes obligatoires, dans l'ordre impose par l'arrêté. */
const COLONNES = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
  'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
  'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
  'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
] as const;

export interface FactureFec {
  ref: string;
  client: string;
  /** Date au format français JJ/MM/AAAA. */
  date: string;
  montantHT: number;
  totalTTC?: number;
  tva: number;
  type: 'Facture' | "Facture d'acompte" | 'Avoir';
}

export interface OptionsFec {
  /** SIRET de la société — les 9 premiers chiffres forment le SIREN du nom de fichier. */
  siret?: string;
  /** Bornes de l'exercice, format JJ/MM/AAAA. Absentes = toutes les factures. */
  du?: string;
  au?: string;
}

/** « JJ/MM/AAAA » -> Date, ou null si illisible. */
function parseDateFR(v?: string | null): Date | null {
  if (!v) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date -> AAAAMMJJ, le seul format accepté par le FEC. */
function formatDateFec(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/**
 * Montant -> chaîne FEC. Deux décimales, virgule décimale (usage français,
 * accepté par la DGFiP), et jamais de séparateur de milliers.
 */
function montantFec(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}

/**
 * Aucun champ ne doit contenir de tabulation ni de retour à la ligne : ce sont
 * respectivement le séparateur de colonnes et de lignes du format.
 */
function champ(v: string | undefined | null): string {
  return (v ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}

/**
 * Code du compte auxiliaire client. Le FEC impose un code dès qu'on utilise un
 * compte collectif (411) : on le dérive du nom, en majuscules sans accents.
 */
function codeClient(nom: string): string {
  const base = nom
    .normalize('NFD')             // les diacritiques deviennent des caracteres separes,
                                  // que le filtre ci-dessous elimine.
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 15);
  return base ? `C${base}` : 'CDIVERS';
}

/** TVA de la facture : TTC − HT, avec repli sur le taux si le TTC manque. */
function tvaDe(f: FactureFec): { ht: number; ttc: number; tva: number } {
  const ht = Number(f.montantHT) || 0;
  const ttc = Number(f.totalTTC ?? ht * (1 + (Number(f.tva) || 0) / 100)) || 0;
  return { ht, ttc, tva: Math.round((ttc - ht) * 100) / 100 };
}

export interface ResultatFec {
  /** Contenu du fichier, colonnes séparées par des tabulations. */
  contenu: string;
  /** Nom normalisé : SIRENFECAAAAMMJJ.txt (AAAAMMJJ = clôture de l'exercice). */
  nomFichier: string;
  /** Nombre de factures retenues. */
  factures: number;
  /** Nombre de lignes d'écriture produites (hors en-tête). */
  lignes: number;
  /** Contrôle de partie double : total des débits et des crédits. */
  totalDebit: number;
  totalCredit: number;
}

/**
 * Construit le FEC du journal des ventes à partir des factures.
 *
 * Les avoirs sont passés en sens inverse. Les factures hors période, ou sans
 * date lisible, sont ignorées — mieux vaut un fichier plus court qu'une
 * écriture mal datée, qu'un expert-comptable devrait démêler à la main.
 */
export function construireFec(factures: FactureFec[], options: OptionsFec = {}): ResultatFec {
  const debut = parseDateFR(options.du);
  const fin = parseDateFR(options.au);

  const retenues = factures
    .map((f) => ({ f, d: parseDateFR(f.date) }))
    .filter((x): x is { f: FactureFec; d: Date } => {
      if (!x.d) return false;
      if (debut && x.d < debut) return false;
      if (fin && x.d > fin) return false;
      return true;
    })
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  const lignes: string[] = [COLONNES.join('\t')];
  let totalDebit = 0;
  let totalCredit = 0;

  retenues.forEach(({ f, d }, i) => {
    const { ht, ttc, tva } = tvaDe(f);
    const avoir = f.type === 'Avoir';
    const dateFec = formatDateFec(d);
    const num = String(i + 1).padStart(6, '0');
    const libelle = champ(`${f.type} ${f.ref} - ${f.client}`);

    const ecrire = (
      compte: { num: string; lib: string },
      auxNum: string,
      auxLib: string,
      debit: number,
      credit: number,
    ) => {
      totalDebit += debit;
      totalCredit += credit;
      lignes.push([
        JOURNAL_CODE, JOURNAL_LIB, num, dateFec,
        compte.num, compte.lib, auxNum, champ(auxLib),
        champ(f.ref), dateFec, libelle,
        montantFec(debit), montantFec(credit),
        '', '', dateFec, '', '',
      ].join('\t'));
    };

    // Un avoir inverse simplement le sens de chaque ligne.
    if (avoir) {
      ecrire(COMPTE_VENTE, '', '', ht, 0);
      ecrire(COMPTE_TVA, '', '', tva, 0);
      ecrire(COMPTE_CLIENT, codeClient(f.client), f.client, 0, ttc);
    } else {
      ecrire(COMPTE_CLIENT, codeClient(f.client), f.client, ttc, 0);
      ecrire(COMPTE_VENTE, '', '', 0, ht);
      ecrire(COMPTE_TVA, '', '', 0, tva);
    }
  });

  const siren = (options.siret ?? '').replace(/\D/g, '').slice(0, 9) || '000000000';
  const cloture = fin ?? retenues[retenues.length - 1]?.d ?? new Date();

  return {
    contenu: lignes.join('\r\n') + '\r\n',
    nomFichier: `${siren}FEC${formatDateFec(cloture)}.txt`,
    factures: retenues.length,
    lignes: lignes.length - 1,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
  };
}
