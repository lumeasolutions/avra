/**
 * Store global AVRA — état de démo complet, persisté dans localStorage
 * Toute l'app fonctionne sans backend grâce à ce store.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ─────────────────────────────────────────────────────────────────

export type DossierStatus = 'URGENT' | 'EN COURS' | 'FINITION' | 'A VALIDER';

export interface SubFolder {
  label: string;
  date?: string;
  alert?: boolean;
  icon?: string;
}

export interface Dossier {
  id: string;
  name: string;
  firstName?: string;
  address?: string;
  siteAddress?: string;
  postalCode?: string;
  tva?: string;
  tauxTVA?: number;
  delaiChantier?: number;
  delaiChantierUnit?: 'days' | 'weeks';
  phone?: string;
  email?: string;
  status: DossierStatus;
  createdAt: string;
  subfolders: SubFolder[];
  notes?: string;
}

// Type de commande dans un dossier signé
export type CommandeType = 'STANDARD' | 'ELECTRO_DIRECT'; // ELECTRO_DIRECT = électro en direct client → pas dans stats

export interface ConfirmationFournisseur {
  id: string;
  fournisseur: string;
  produit: string;
  dateButoir: string;        // date butoir commande
  dateConfirmation?: string; // date butoir confirmation fournisseur
  validee: boolean;          // true = alimente les stats
  type: CommandeType;
  montant?: number;
  notes?: string;
}

export interface DossierSigne extends Dossier {
  signedDate: string;
  signedSubfolders: SubFolder[];
  // Nouvelle structure Point 8
  confirmations?: ConfirmationFournisseur[];
  // Dates butoires pour suivi dossier
  dateButoires?: {
    suiviChantier?: string;
    releveMesures?: string;
    planTechnique?: string;
    fichePose?: string;
    permisConstruire?: string;
    sav?: string;
  };
}

export interface DossierPerdu {
  id: string;
  name: string;
  reason: string;
  lostDate: string;
  montantEstime?: number;
}

export interface PlanningEvent {
  id: string;
  day: number;
  startHour: number;
  duration: number;
  title: string;
  color: string;
  type?: string;
  weekOffset?: number;
}

export interface GestEvent {
  id: string;
  day: number;
  startHour: number;
  duration: number;
  type: string;
  client: string;
  weekOffset: number;
}

export type CommandeStatut = 'EN ATTENTE' | 'CONFIRMÉE' | 'LIVRÉE' | 'ANNULÉE';

export interface Commande {
  id: string;
  dossierId?: string;
  dossierName: string;
  fournisseur: string;
  reference: string;
  description: string;
  montant: number;
  statut: CommandeStatut;
  dateCommande: string;
  dateLivraison?: string;
}

export interface StockItem {
  id: string;
  dot: 'green' | 'red' | 'orange';
  supplier: string;
  model: string;
  purchase: number;
  sale: number | null;
  category: string;
  material: string;
  // Point 7: Gestion quantités
  quantity?: number;        // stock actuel
  minQuantity?: number;     // seuil d'alerte
  reference?: string;       // référence fournisseur
  image?: string;           // URL image du produit
  createdAt?: string;       // date de création (ISO format)
}

export interface Intervenant {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  dossiers: { name: string; statut: 'A CLASSER' | 'CLASSE' }[];
}

export interface HistoryLog {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: string;
}

// ── Facturation ────────────────────────────────────────────────────────────
export type InvoiceStatus = 'PAYÉE' | 'EN ATTENTE' | 'ACOMPTE' | 'AVOIR' | 'RETARD';

export interface Invoice {
  id: string;
  ref: string;
  dossierId?: string;
  client: string;
  date: string;
  montantHT: number;
  tva: number;
  statut: InvoiceStatus;
  type: 'Facture' | "Facture d'acompte" | 'Avoir';
  notes?: string;
}

// ── Paiements ─────────────────────────────────────────────────────────────
export type PaymentStatus = 'ENCAISSÉ' | 'EN ATTENTE' | 'RETARD';

export interface Payment {
  id: string;
  invoiceId?: string;
  dossierId?: string;
  client: string;
  type: string;
  amount: number;
  method: string;
  date: string;
  statut: PaymentStatus;
}

// ── Devis ─────────────────────────────────────────────────────────────────
export type DevisStatus = 'BROUILLON' | 'ENVOYÉ' | 'ACCEPTÉ' | 'REFUSÉ' | 'EXPIRÉ';

export interface LigneDocument {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tva: number;
  remise: number; // %
}

export interface Devis {
  id: string;
  ref: string;            // D-2026-xxx
  dossierId?: string;
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  lignes: LigneDocument[];
  statut: DevisStatus;
  dateCreation: string;
  dateValidite: string;
  conditionsPaiement: string;
  notes?: string;
  totalHT: number;
  totalTTC: number;
  token?: string;          // lien e-facturation unique
  // Signature électronique (Point 9)
  signatureStatus?: 'EN_ATTENTE_SIGNATURE' | 'SIGNÉ';
  signatureDate?: string;
  signatureEmail?: string;
  signaturePiecesJointes?: string[]; // noms des fichiers joints
}

export type FactureDetailType = 'ACOMPTE' | 'INTERMEDIAIRE' | 'SOLDE' | 'AVOIR' | 'STANDARD';

export interface InvoiceDetail extends Invoice {
  lignes?: LigneDocument[];
  devisId?: string;
  factureType?: FactureDetailType;
  dateEcheance?: string;
  conditionsPaiement?: string;
  acomptesLies?: string[];  // ids des factures acompte déjà payées
  montantDeja?: number;     // montant déjà facturé (déduit sur solde)
  rib?: string;
  token?: string;
}

// ── Alertes ───────────────────────────────────────────────────────────────
export type AlertSeverity = 'error' | 'warning' | 'info' | 'clock';

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  text: string;
  dossierId?: string;
  dismissed: boolean;
  createdAt: string;
}

// ── Paramètres ─────────────────────────────────────────────────────────────

export interface PreferencesConfig {
  langue: string;
  devise: string;
  tvaDefaut: number;
  formatDate: string;
  fuseauHoraire: string;
  modeCompact: boolean;
}

export interface NumerotationConfig {
  prefixeFacture: string;
  prefixeDevis: string;
  prefixeAvoir: string;
  prochainNumeroFacture: number;
  prochainNumeroDevis: number;
  anneeAutomatique: boolean;
}

export interface FacturationConfig {
  iban: string;
  bic: string;
  nomBanque: string;
  conditionsPaiement: string;
  mentionsLegales: string;
  penalitesRetard: string;
  escompte: string;
  tauxAcompte: number;
}

export interface NotifConfig {
  factureRetard: boolean;
  devisExpire: boolean;
  commandeAttente: boolean;
  planningRappel: boolean;
  nouveauDossier: boolean;
  paiementRecu: boolean;
  emailNotif: boolean;
  smsNotif: boolean;
}

// ── Apporteurs d'affaires & Commissions (Point 2) ─────────────────────────
export interface Apporteur {
  id: string;
  nom: string;
  email?: string;
  phone?: string;
  tauxCommission: number; // %
  actif: boolean;
  dateAjout: string;
  notes?: string;
}

export interface CommissionDossier {
  dossierId: string;
  dossierRef: string;
  client: string;
  montantCA: number;
  taux: number;
  montantCommission: number;
  statut: 'À_PAYER' | 'PAYÉE';
  datePaiement?: string;
}

export interface Societe {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret: string;
  tva: string;
  phone: string;
  email: string;
  siteWeb: string;
  logo?: string;
}

export interface RelanceConfig {
  delaiAcompte: number;
  delaiSolde: number;
  delaiRetard: number;
  messageAcompte: string;
  messageSolde: string;
  messageRetard: string;
}

export interface UserMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'VENDEUR' | 'POSEUR';
  active: boolean;
}

// ─── Données initiales ─────────────────────────────────────────────────────

const DEFAULT_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER RENSEIGNEMENT' },
  { label: 'ETAT DES LIEUX – PHOTOS EXISTANTS' },
  { label: 'RELEVE DE MESURES' },
];

const SIGNED_SUBFOLDERS: SubFolder[] = [
  { label: 'DOSSIER AVANT VENTE' },
  { label: 'PROJET VERSION 3' },
  { label: 'SUIVI DE CHANTIER' },
  { label: 'RELEVE DE MESURES' },
  { label: 'PLAN TECHNIQUE DCE', alert: true },
  { label: 'COMMANDES', alert: true },
  { label: 'LIVRAISONS' },
  { label: 'FICHE DE POSE' },
  { label: 'PERMIS DE CONSTRUIRE' },
  { label: 'SAV' },
  { label: 'RECEPTION CHANTIER' },
];

const INITIAL_DOSSIERS: Dossier[] = [
  { id: 'd1', name: 'Turpin', firstName: 'Jacques', phone: '06 11 22 33 44', email: 'turpin@mail.fr', status: 'URGENT', createdAt: '10/01/2026', subfolders: [...DEFAULT_SUBFOLDERS, { label: 'PROJET VERSION 1 – APS', date: '26/12/2025' }, { label: 'PROJET VERSION 2', date: '01/01/2026' }, { label: 'PROJET VERSION 3 – APD', date: '10/01/2026', alert: true }] },
  { id: 'd2', name: 'Lefevre', firstName: 'Marie', phone: '06 98 77 66 55', email: 'lefevre@mail.fr', status: 'URGENT', createdAt: '08/01/2026', subfolders: [...DEFAULT_SUBFOLDERS, { label: 'PROJET VERSION 1 – APS', date: '02/01/2026' }] },
  { id: 'd3', name: 'Bernard', firstName: 'Paul', phone: '06 55 44 33 22', email: 'bernard@mail.fr', status: 'URGENT', createdAt: '05/01/2026', subfolders: DEFAULT_SUBFOLDERS },
  { id: 'd4', name: 'Dupont', firstName: 'Claire', phone: '06 12 23 34 45', email: 'dupont@mail.fr', status: 'EN COURS', createdAt: '20/12/2025', subfolders: [...DEFAULT_SUBFOLDERS, { label: 'PROJET VERSION 1 – APS', date: '15/01/2026' }] },
  { id: 'd5', name: 'Saland', firstName: 'Thomas', phone: '06 87 76 65 54', email: 'saland@mail.fr', status: 'EN COURS', createdAt: '15/12/2025', subfolders: DEFAULT_SUBFOLDERS },
  { id: 'd6', name: 'Cholme', firstName: 'Isabelle', phone: '06 33 44 55 66', email: 'cholme@mail.fr', status: 'EN COURS', createdAt: '10/12/2025', subfolders: DEFAULT_SUBFOLDERS },
  { id: 'd7', name: 'Marchal', firstName: 'Henri', phone: '06 22 11 00 99', email: 'marchal@mail.fr', status: 'EN COURS', createdAt: '05/12/2025', subfolders: DEFAULT_SUBFOLDERS },
  { id: 'd8', name: 'Roux', firstName: 'Sophie', phone: '06 66 77 88 99', email: 'roux@mail.fr', status: 'FINITION', createdAt: '01/11/2025', subfolders: [...DEFAULT_SUBFOLDERS, { label: 'PROJET VERSION 3 – APD', date: '10/12/2025' }] },
  { id: 'd9', name: 'Viola', firstName: 'Marc', phone: '06 44 55 66 77', email: 'viola@mail.fr', status: 'FINITION', createdAt: '15/10/2025', subfolders: [...DEFAULT_SUBFOLDERS, { label: 'PROJET VERSION 2', date: '05/01/2026' }] },
];

const INITIAL_SIGNES: DossierSigne[] = [
  { id: 's1', name: 'Damont', firstName: 'Luc', status: 'URGENT', createdAt: '01/10/2025', signedDate: '15/11/2025', subfolders: DEFAULT_SUBFOLDERS, signedSubfolders: SIGNED_SUBFOLDERS },
  { id: 's2', name: 'Debuchy', firstName: 'Anne', status: 'EN COURS', createdAt: '15/09/2025', signedDate: '01/11/2025', subfolders: DEFAULT_SUBFOLDERS, signedSubfolders: SIGNED_SUBFOLDERS },
  { id: 's3', name: 'Santini', firstName: 'Carlo', status: 'EN COURS', createdAt: '10/09/2025', signedDate: '20/10/2025', subfolders: DEFAULT_SUBFOLDERS, signedSubfolders: SIGNED_SUBFOLDERS },
  { id: 's4', name: 'Persu', firstName: 'Elena', status: 'FINITION', createdAt: '01/09/2025', signedDate: '15/10/2025', subfolders: DEFAULT_SUBFOLDERS, signedSubfolders: SIGNED_SUBFOLDERS },
];

const INITIAL_PERDUS: DossierPerdu[] = [
  { id: 'p1', name: 'Girard', reason: 'Budget insuffisant', lostDate: '10/01/2026', montantEstime: 18000 },
  { id: 'p2', name: 'Faure', reason: 'Concurrent moins cher', lostDate: '05/12/2025', montantEstime: 12500 },
  { id: 'p3', name: 'Morel', reason: 'Projet abandonné', lostDate: '20/11/2025', montantEstime: 25000 },
];

const INITIAL_GEST_EVENTS: GestEvent[] = [
  { id: 'g1', day: 1, startHour: 9,  duration: 7, type: 'POSE CUISINE',    client: 'Dupont',  weekOffset: 0 },
  { id: 'g2', day: 1, startHour: 9,  duration: 7, type: 'POSE GRANITE',    client: 'Lefevre', weekOffset: 0 },
  { id: 'g3', day: 2, startHour: 9,  duration: 4, type: 'LIVRAISON',       client: 'Turpin',  weekOffset: 0 },
  { id: 'g4', day: 2, startHour: 12, duration: 3, type: 'ELECTRICIEN',     client: 'Baco',    weekOffset: 0 },
  { id: 'g5', day: 4, startHour: 9,  duration: 5, type: 'REUNION CHANTIER',client: 'Baco',    weekOffset: 0 },
];

const INITIAL_COMMANDES: Commande[] = [
  { id: 'cmd1', dossierId: 's1', dossierName: 'Damont',  fournisseur: 'NOBILIA',   reference: 'FLASH-395-DEM', description: 'Cuisine FLASH 395 — façades blanches laqué mat', montant: 4200, statut: 'CONFIRMÉE',  dateCommande: '20/11/2025', dateLivraison: '15/01/2026' },
  { id: 'cmd2', dossierId: 's2', dossierName: 'Debuchy', fournisseur: 'SIEMENS',   reference: 'HB83CBC61-DEB', description: 'Four multifonction HB83CBC61',                       montant: 1490, statut: 'LIVRÉE',     dateCommande: '15/10/2025', dateLivraison: '20/11/2025' },
  { id: 'cmd3', dossierId: 's3', dossierName: 'Santini', fournisseur: 'HANSGROHE', reference: 'METRO-SAN',    description: 'Mitigeur METROPOL laiton',                           montant: 680,  statut: 'EN ATTENTE', dateCommande: '25/10/2025', dateLivraison: '20/01/2026' },
  { id: 'cmd4', dossierId: 'd4', dossierName: 'Dupont',  fournisseur: 'BLUM',      reference: 'TANDEM-DUP',   description: 'Kit TANDEMBOX x8 amortisseurs',                      montant: 960,  statut: 'EN ATTENTE', dateCommande: '05/01/2026' },
  { id: 'cmd5', dossierId: 's4', dossierName: 'Persu',   fournisseur: 'AIRLUX',    reference: 'HISS83-PER',   description: 'Hotte HISS 83 inox',                                 montant: 880,  statut: 'CONFIRMÉE',  dateCommande: '10/01/2026', dateLivraison: '28/01/2026' },
];

const INITIAL_EVENTS: PlanningEvent[] = [
  { id: 'e1', day: 1, startHour: 9, duration: 2, title: 'Dupont', color: '#5b9bd5', weekOffset: 0 },
  { id: 'e2', day: 1, startHour: 11, duration: 2, title: 'Bernard', color: '#9b59b6', weekOffset: 0 },
  { id: 'e3', day: 1, startHour: 12, duration: 2, title: 'Lefevre', color: '#e8b86d', weekOffset: 0 },
  { id: 'e4', day: 1, startHour: 15, duration: 2, title: 'Turpin', color: '#e74c3c', weekOffset: 0 },
  { id: 'e5', day: 1, startHour: 17, duration: 2, title: 'Fiche livraison Dupont', color: '#5b9bd5', weekOffset: 0 },
  { id: 'e6', day: 3, startHour: 9, duration: 2, title: 'Livraison Santini', color: '#e8b86d', weekOffset: 0 },
  { id: 'e7', day: 3, startHour: 10, duration: 2, title: 'Plan tech Damont', color: '#9b59b6', weekOffset: 0 },
  { id: 'e8', day: 4, startHour: 12, duration: 2, title: 'Commande Persu', color: '#5b9bd5', weekOffset: 0 },
];

const INITIAL_STOCK: StockItem[] = [
  { id: 'st1', dot: 'green', supplier: 'LAPALMA', model: 'S164', purchase: 200, sale: 531, category: 'MEUBLES', material: '' },
  { id: 'st2', dot: 'red', supplier: 'FRANKE', model: '551823', purchase: 350, sale: 715, category: 'ELECTRO', material: 'NOIR' },
  { id: 'st3', dot: 'orange', supplier: 'MAISON DU MONDE', model: 'ARSENE', purchase: 159, sale: null, category: 'DECO', material: 'LAITON' },
  { id: 'st4', dot: 'green', supplier: 'BLUM', model: 'TANDEMBOX', purchase: 45, sale: 120, category: 'MEUBLES', material: 'INOX' },
  { id: 'st5', dot: 'green', supplier: 'SIEMENS', model: 'HB83CBC61', purchase: 890, sale: 1490, category: 'ELECTRO', material: '' },
  { id: 'st6', dot: 'red', supplier: 'HANSGROHE', model: 'METROPOL', purchase: 320, sale: 680, category: 'SANITAIRE', material: 'LAITON' },
  { id: 'st7', dot: 'orange', supplier: 'NOBILIA', model: 'FLASH 395', purchase: 2100, sale: 4200, category: 'MEUBLES', material: '' },
  { id: 'st8', dot: 'green', supplier: 'AIRLUX', model: 'HISS 83', purchase: 440, sale: 880, category: 'ELECTRO', material: 'INOX' },
];

const INITIAL_INTERVENANTS: Intervenant[] = [
  { id: 'i1', type: 'POSEUR', name: 'Martin Philippe', phone: '06 12 34 56 78', email: 'martin@pose.fr', dossiers: [{ name: 'Turpin', statut: 'CLASSE' }, { name: 'Bernard', statut: 'A CLASSER' }] },
  { id: 'i2', type: 'ELECTRICIEN', name: 'Durand Jean', phone: '06 98 76 54 32', email: 'durand@elec.fr', dossiers: [{ name: 'Dupont', statut: 'CLASSE' }, { name: 'Lefevre', statut: 'A CLASSER' }] },
  { id: 'i3', type: 'MACON', name: 'Lopez Antonio', phone: '06 11 22 33 44', email: 'lopez@construction.fr', dossiers: [{ name: 'Cholme', statut: 'CLASSE' }] },
  { id: 'i4', type: 'MARBRIER', name: 'Petit Granit SARL', phone: '01 23 45 67 89', email: 'contact@petitgranit.fr', dossiers: [{ name: 'Turpin', statut: 'CLASSE' }, { name: 'Marchal', statut: 'CLASSE' }] },
  { id: 'i5', type: 'PLOMBIER', name: 'Robert Frères', phone: '06 55 66 77 88', email: 'robert@plomberie.fr', dossiers: [{ name: 'Roux', statut: 'A CLASSER' }] },
  { id: 'i6', type: 'CARRELEUR', name: 'Bianchi Carrelage', phone: '06 44 55 66 77', email: 'bianchi@carrelage.fr', dossiers: [{ name: 'Viola', statut: 'CLASSE' }] },
];

const INITIAL_LOGS: HistoryLog[] = [
  { id: 'l1', user: 'Cassandra', action: 'Nouveau dossier créé', target: 'Turpin', time: '15/01/2026 09:15', icon: '📁' },
  { id: 'l2', user: 'Sylvie', action: 'Devis envoyé', target: 'Lefevre — 18 500€', time: '15/01/2026 10:32', icon: '📄' },
  { id: 'l3', user: 'Christian', action: 'Dossier signé', target: 'Santini', time: '14/01/2026 16:45', icon: '✅' },
  { id: 'l4', user: 'Cassandra', action: 'Commande passée', target: 'Dupont — NOBILIA', time: '14/01/2026 14:20', icon: '🛒' },
  { id: 'l5', user: 'Sylvie', action: 'Projet VERSION 2 uploadé', target: 'Turpin', time: '13/01/2026 11:05', icon: '📐' },
  { id: 'l6', user: 'Christian', action: 'Paiement reçu', target: 'Marchal — 6 600€', time: '12/01/2026 09:00', icon: '💶' },
  { id: 'l7', user: 'Cassandra', action: 'Date butoire enregistrée', target: 'Saland — Plan DCE 20/02', time: '11/01/2026 15:30', icon: '📅' },
  { id: 'l8', user: 'Sylvie', action: 'Intervenant assigné', target: 'Martin Philippe → Turpin', time: '10/01/2026 13:15', icon: '👷' },
];

const INITIAL_INVOICES: Invoice[] = [
  { id: 'inv1', ref: 'F-2026-042', dossierId: 'd1', client: 'Turpin', date: '15/01/2026', montantHT: 18500, tva: 20, statut: 'PAYÉE', type: 'Facture' },
  { id: 'inv2', ref: 'F-2026-041', dossierId: 'd3', client: 'Bernard', date: '12/01/2026', montantHT: 22000, tva: 20, statut: 'EN ATTENTE', type: 'Facture' },
  { id: 'inv3', ref: 'F-2026-040', dossierId: 'd2', client: 'Lefevre', date: '10/01/2026', montantHT: 15800, tva: 20, statut: 'PAYÉE', type: 'Facture' },
  { id: 'inv4', ref: 'FA-2026-012', dossierId: 'd4', client: 'Dupont', date: '05/01/2026', montantHT: 7500, tva: 20, statut: 'ACOMPTE', type: "Facture d'acompte" },
  { id: 'inv5', ref: 'AV-2026-003', dossierId: 'd5', client: 'Saland', date: '02/01/2026', montantHT: -2500, tva: 20, statut: 'AVOIR', type: 'Avoir' },
  { id: 'inv6', ref: 'F-2025-098', dossierId: 'd7', client: 'Marchal', date: '28/12/2025', montantHT: 31000, tva: 10, statut: 'PAYÉE', type: 'Facture' },
  { id: 'inv7', ref: 'F-2025-097', dossierId: 'd6', client: 'Cholme', date: '20/12/2025', montantHT: 19000, tva: 20, statut: 'RETARD', type: 'Facture' },
];

const INITIAL_PAYMENTS: Payment[] = [
  { id: 'pay1', invoiceId: 'inv1', dossierId: 'd1', client: 'Turpin', type: 'Acompte 30%', amount: 5550, method: 'CB', date: '15/01/2026', statut: 'ENCAISSÉ' },
  { id: 'pay2', invoiceId: 'inv1', dossierId: 'd1', client: 'Turpin', type: 'Solde 70%', amount: 16650, method: 'Virement', date: '20/02/2026', statut: 'EN ATTENTE' },
  { id: 'pay3', invoiceId: 'inv2', dossierId: 'd3', client: 'Bernard', type: 'Acompte 30%', amount: 6600, method: 'CB', date: '08/01/2026', statut: 'ENCAISSÉ' },
  { id: 'pay4', invoiceId: 'inv4', dossierId: 'd4', client: 'Dupont', type: '1/3', amount: 2800, method: '3x sans frais', date: '05/01/2026', statut: 'ENCAISSÉ' },
  { id: 'pay5', invoiceId: 'inv4', dossierId: 'd4', client: 'Dupont', type: '2/3', amount: 2800, method: '3x sans frais', date: '05/02/2026', statut: 'EN ATTENTE' },
  { id: 'pay6', invoiceId: 'inv7', dossierId: 'd6', client: 'Cholme', type: 'Solde', amount: 14250, method: 'Virement', date: '01/01/2026', statut: 'RETARD' },
];

const INITIAL_ALERTS: AlertItem[] = [
  { id: 'a1', severity: 'error', text: 'Facture en retard — Cholme (19 000€)', dossierId: 'd6', dismissed: false, createdAt: '15/01/2026 09:00' },
  { id: 'a2', severity: 'warning', text: 'Commande en attente de validation — Lefevre', dossierId: 'd2', dismissed: false, createdAt: '15/01/2026 08:30' },
  { id: 'a3', severity: 'warning', text: 'Plan technique DCE manquant — Dupont', dossierId: 'd4', dismissed: false, createdAt: '14/01/2026 17:00' },
  { id: 'a4', severity: 'clock', text: 'Attente retour devis — Turpin (délai dépassé)', dossierId: 'd1', dismissed: false, createdAt: '13/01/2026 10:00' },
  { id: 'a5', severity: 'info', text: 'Livraison planifiée — Santini (JEU 23/01)', dismissed: false, createdAt: '12/01/2026 14:00' },
];

const INITIAL_PREFERENCES: PreferencesConfig = {
  langue: 'fr',
  devise: 'EUR',
  tvaDefaut: 20,
  formatDate: 'dd/mm/yyyy',
  fuseauHoraire: 'Europe/Paris',
  modeCompact: false,
};

const INITIAL_NUMEROTATION: NumerotationConfig = {
  prefixeFacture: 'F',
  prefixeDevis: 'D',
  prefixeAvoir: 'AV',
  prochainNumeroFacture: 43,
  prochainNumeroDevis: 13,
  anneeAutomatique: true,
};

const INITIAL_FACTURATION_CFG: FacturationConfig = {
  iban: 'FR76 3000 6000 0112 3456 7890 189',
  bic: 'BNPAFRPPXXX',
  nomBanque: 'BNP Paribas',
  conditionsPaiement: '30% acompte à la commande, 40% intermédiaire, 30% solde à réception',
  mentionsLegales: 'TVA non récupérable. En cas de retard de paiement, une pénalité égale à 3 fois le taux légal sera appliquée.',
  penalitesRetard: '3x taux légal en vigueur',
  escompte: 'Aucun escompte pour paiement anticipé',
  tauxAcompte: 30,
};

const INITIAL_NOTIF_CFG: NotifConfig = {
  factureRetard: true,
  devisExpire: true,
  commandeAttente: true,
  planningRappel: true,
  nouveauDossier: false,
  paiementRecu: true,
  emailNotif: true,
  smsNotif: false,
};

const INITIAL_SOCIETE: Societe = {
  nom: 'AVRA Design',
  adresse: '12 rue de la Paix',
  codePostal: '75001',
  ville: 'Paris',
  siret: '123 456 789 00012',
  tva: 'FR12345678900',
  phone: '01 23 45 67 89',
  email: 'contact@avra.fr',
  siteWeb: 'www.avra.fr',
};

const INITIAL_RELANCE: RelanceConfig = {
  delaiAcompte: 7,
  delaiSolde: 30,
  delaiRetard: 3,
  messageAcompte: 'Bonjour {client}, nous vous rappelons que votre acompte de {montant}€ est attendu avant le {date}. Merci.',
  messageSolde: 'Bonjour {client}, votre solde de {montant}€ est à régler avant le {date}. N\'hésitez pas à nous contacter.',
  messageRetard: 'Bonjour {client}, nous constatons que votre règlement de {montant}€ est en retard. Merci de régulariser rapidement.',
};

const INITIAL_MEMBERS: UserMember[] = [
  { id: 'm1', name: 'Cassandra Dupuis', email: 'cassandra@avra.fr', role: 'ADMIN', active: true },
  { id: 'm2', name: 'Sylvie Martin', email: 'sylvie@avra.fr', role: 'VENDEUR', active: true },
  { id: 'm3', name: 'Christian Brun', email: 'christian@avra.fr', role: 'VENDEUR', active: true },
];

const INITIAL_APPORTEURS: Apporteur[] = [
  { id: 'ap1', nom: 'Jean-Michel Renard', email: 'jm.renard@mail.fr', phone: '06 12 34 56 78', tauxCommission: 5, actif: true, dateAjout: '01/01/2026', notes: 'Réseau architectes Paris 8e' },
  { id: 'ap2', nom: 'Sophie Lacombe', email: 'sophie.lacombe@gmail.com', tauxCommission: 3, actif: true, dateAjout: '15/02/2026', notes: 'Réseau promoteurs immobiliers' },
];

const INITIAL_RELANCES: Relance[] = [
  { id: 'rel1', dossierId: 's1', type: 'date_butoire', message: 'Date butoire Plan Technique dépassée — Damont', dateCreated: '15/01/2026', dateNextRelance: '22/01/2026', status: 'active' },
  { id: 'rel2', dossierId: 's2', type: 'confirmation', message: 'Confirmation fournisseur SIEMENS en attente depuis 1 semaine — Debuchy', dateCreated: '14/01/2026', dateNextRelance: '18/01/2026', status: 'active' },
  { id: 'rel3', dossierId: 's3', type: 'acompte', message: 'Acompte 30% en attente de paiement — Santini', dateCreated: '12/01/2026', dateNextRelance: '19/01/2026', status: 'active' },
  { id: 'rel4', dossierId: 's4', type: 'dossier_vente', message: 'Pas de dépôt depuis 2 semaines — Persu', dateCreated: '10/01/2026', dateNextRelance: '17/01/2026', status: 'snoozed' },
];

// ─── Relances ─────────────────────────────────────────────────────────────
export interface Relance {
  id: string;
  dossierId: string;
  type: 'date_butoire' | 'acompte' | 'confirmation' | 'dossier_vente';
  message: string;
  dateCreated: string;
  dateNextRelance: string;
  status: 'active' | 'resolved' | 'snoozed';
}

// ─── Store Interface ────────────────────────────────────────────────────────

interface AVRAState {
  dossiers: Dossier[];
  dossiersSignes: DossierSigne[];
  dossiersPerdus: DossierPerdu[];
  planningEvents: PlanningEvent[];
  gestEvents: GestEvent[];
  commandes: Commande[];
  datesButoiresSignes: Record<string, Record<string, string>>;
  stockItems: StockItem[];
  intervenants: Intervenant[];
  historyLogs: HistoryLog[];
  invoices: Invoice[];
  invoiceDetails: Record<string, InvoiceDetail>; // id -> detail enrichi
  devis: Devis[];
  payments: Payment[];
  alerts: AlertItem[];
  societe: Societe;
  relanceConfig: RelanceConfig;
  relances: Relance[];
  members: UserMember[];
  preferences: PreferencesConfig;
  numerotation: NumerotationConfig;
  facturationConfig: FacturationConfig;
  notifConfig: NotifConfig;
  apporteurs: Apporteur[];

  // Internal counters (persisted so they survive page reload)
  _invoiceCounter: number;
  _devisCounter: number;

  // Dossiers
  addDossier: (data: { lastName: string; firstName?: string; address?: string; siteAddress?: string; postalCode?: string; tva?: string; phone?: string; email?: string }) => string;
  updateDossierStatus: (id: string, status: DossierStatus) => void;
  updateDossierNotes: (id: string, notes: string) => void;
  addSubfolder: (dossierId: string, label: string) => void;
  signerDossier: (id: string) => void;
  perdreDossier: (id: string, reason: string) => void;

  // Planning
  addPlanningEvent: (event: Omit<PlanningEvent, 'id'>) => void;
  deletePlanningEvent: (id: string) => void;

  // Planning Gestion
  addGestEvent: (event: Omit<GestEvent, 'id'>) => void;
  deleteGestEvent: (id: string) => void;

  // Commandes
  addCommande: (cmd: Omit<Commande, 'id'>) => void;
  updateCommandeStatut: (id: string, statut: CommandeStatut) => void;
  deleteCommande: (id: string) => void;

  // Dates butoires signés
  updateDateButoireSignee: (dossierId: string, label: string, date: string) => void;

  // Stock
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockDot: (id: string, dot: StockItem['dot']) => void;
  updateStockItem: (id: string, data: Partial<Omit<StockItem, 'id'>>) => void;
  deleteStockItem: (id: string) => void;

  // Intervenants
  addIntervenant: (data: { type: string; name: string; phone: string; email: string; notes?: string }) => void;
  removeIntervenant: (id: string) => void;
  updateIntervenant: (id: string, data: Partial<Omit<Intervenant, 'id' | 'dossiers'>>) => void;
  updateIntervenantDossierStatut: (intervenantId: string, dossierName: string, statut: 'A CLASSER' | 'CLASSE') => void;

  // Facturation
  addInvoice: (inv: Omit<Invoice, 'id' | 'ref'>) => string;
  addInvoiceDetail: (detail: Omit<InvoiceDetail, 'id' | 'ref'>) => string;
  updateInvoiceStatus: (id: string, statut: InvoiceStatus) => void;
  updateInvoiceDetail: (id: string, data: Partial<InvoiceDetail>) => void;
  deleteInvoice: (id: string) => void;

  // Devis
  addDevis: (devis: Omit<Devis, 'id' | 'ref' | 'token'>) => string;
  updateDevis: (id: string, data: Partial<Devis>) => void;
  updateDevisStatut: (id: string, statut: DevisStatus) => void;
  sendDevisForSignature: (id: string, email: string, piecesJointes?: string[]) => void;
  markDevisSigned: (id: string) => void;
  deleteDevis: (id: string) => void;

  // Apporteurs d'affaires
  addApporteur: (a: Omit<Apporteur, 'id' | 'dateAjout'>) => void;
  updateApporteur: (id: string, data: Partial<Apporteur>) => void;
  deleteApporteur: (id: string) => void;
  toggleApporteurActif: (id: string) => void;
  convertDevisToFacture: (devisId: string, factureType: FactureDetailType, pourcentage: number) => string;

  // Paiements
  addPayment: (pay: Omit<Payment, 'id'>) => void;
  updatePaymentStatus: (id: string, statut: PaymentStatus) => void;

  // Alertes
  addAlert: (alert: Omit<AlertItem, 'id' | 'createdAt' | 'dismissed'>) => void;
  dismissAlert: (id: string) => void;

  // Paramètres
  updateSociete: (data: Partial<Societe>) => void;
  updateRelanceConfig: (data: Partial<RelanceConfig>) => void;
  addMember: (member: Omit<UserMember, 'id'>) => void;
  toggleMemberActive: (id: string) => void;
  removeMember: (id: string) => void;
  updateMemberRole: (id: string, role: 'ADMIN' | 'VENDEUR' | 'POSEUR') => void;
  updatePreferences: (data: Partial<PreferencesConfig>) => void;
  updateNumerotation: (data: Partial<NumerotationConfig>) => void;
  updateFacturationConfig: (data: Partial<FacturationConfig>) => void;
  updateNotifConfig: (data: Partial<NotifConfig>) => void;

  // Confirmations fournisseurs (Point 8)
  addConfirmation: (dossierId: string, conf: Omit<ConfirmationFournisseur, 'id'>) => void;
  updateConfirmation: (dossierId: string, confId: string, data: Partial<ConfirmationFournisseur>) => void;
  deleteConfirmation: (dossierId: string, confId: string) => void;
  toggleConfirmationValidee: (dossierId: string, confId: string) => void;

  // Relances
  addRelance: (relance: Omit<Relance, 'id'>) => void;
  resolveRelance: (id: string) => void;
  snoozeRelance: (id: string, days: number) => void;
  getActiveRelances: () => Relance[];
  checkAndCreateRelances: () => void;
  updateDossierSigneDateButoires: (dossierId: string, dateButoires: DossierSigne['dateButoires']) => void;

  // History
  addLog: (log: Omit<HistoryLog, 'id' | 'time'>) => void;

  // Reset
  reset: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const now = () => {
  const d = new Date();
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

const INITIAL_DEVIS: Devis[] = [
  {
    id: 'dev1', ref: 'D-2026-011', dossierId: 'd1', client: 'Turpin', clientEmail: 'turpin@mail.fr',
    clientAddress: '12 rue des Lilas, 75011 Paris',
    lignes: [
      { id: 'l1', description: 'Cuisine FLASH 395 — façades laquées mat blanc', quantite: 1, unite: 'forfait', prixUnitaireHT: 12000, tva: 20, remise: 0 },
      { id: 'l2', description: 'Plan de travail granit noir', quantite: 3.2, unite: 'm²', prixUnitaireHT: 450, tva: 20, remise: 0 },
      { id: 'l3', description: 'Pose et installation complète', quantite: 1, unite: 'forfait', prixUnitaireHT: 2800, tva: 10, remise: 5 },
    ],
    statut: 'ACCEPTÉ', dateCreation: '05/01/2026', dateValidite: '05/02/2026',
    conditionsPaiement: '30% acompte, 40% intermédiaire, 30% solde',
    totalHT: 16360, totalTTC: 19460,
    token: 'tok_turpin_dev1',
  },
  {
    id: 'dev2', ref: 'D-2026-010', dossierId: 'd2', client: 'Lefevre', clientEmail: 'lefevre@mail.fr',
    clientAddress: '8 avenue Victor Hugo, 75016 Paris',
    lignes: [
      { id: 'l4', description: 'Cuisine ARTIS — façades chêne naturel', quantite: 1, unite: 'forfait', prixUnitaireHT: 18000, tva: 20, remise: 0 },
      { id: 'l5', description: 'Électroménager intégré (four, lave-vaisselle, hotte)', quantite: 1, unite: 'forfait', prixUnitaireHT: 3500, tva: 20, remise: 10 },
    ],
    statut: 'ENVOYÉ', dateCreation: '10/01/2026', dateValidite: '10/02/2026',
    conditionsPaiement: '50% acompte, 50% solde',
    totalHT: 21150, totalTTC: 25380,
    token: 'tok_lefevre_dev2',
  },
  {
    id: 'dev3', ref: 'D-2026-009', dossierId: 'd4', client: 'Dupont', clientEmail: 'dupont@mail.fr',
    clientAddress: '3 rue Pasteur, 69001 Lyon',
    lignes: [
      { id: 'l6', description: 'Dressing sur mesure — chêne blanchi', quantite: 1, unite: 'forfait', prixUnitaireHT: 8500, tva: 20, remise: 0 },
      { id: 'l7', description: 'Pose', quantite: 1, unite: 'forfait', prixUnitaireHT: 1200, tva: 10, remise: 0 },
    ],
    statut: 'BROUILLON', dateCreation: '20/01/2026', dateValidite: '20/02/2026',
    conditionsPaiement: '30% acompte, 70% solde',
    totalHT: 9700, totalTTC: 11500,
    token: 'tok_dupont_dev3',
  },
];

// ─── Store ─────────────────────────────────────────────────────────────────

export const useAVRAStore = create<AVRAState>()(
  persist(
    (set, get) => ({
      dossiers: INITIAL_DOSSIERS,
      dossiersSignes: INITIAL_SIGNES,
      dossiersPerdus: INITIAL_PERDUS,
      planningEvents: INITIAL_EVENTS,
      gestEvents: INITIAL_GEST_EVENTS,
      commandes: INITIAL_COMMANDES,
      datesButoiresSignes: {},
      stockItems: INITIAL_STOCK,
      intervenants: INITIAL_INTERVENANTS,
      historyLogs: INITIAL_LOGS,
      invoices: INITIAL_INVOICES,
      invoiceDetails: {},
      devis: INITIAL_DEVIS,
      payments: INITIAL_PAYMENTS,
      alerts: INITIAL_ALERTS,
      societe: INITIAL_SOCIETE,
      relanceConfig: INITIAL_RELANCE,
      relances: INITIAL_RELANCES,
      members: INITIAL_MEMBERS,
      preferences: INITIAL_PREFERENCES,
      numerotation: INITIAL_NUMEROTATION,
      facturationConfig: INITIAL_FACTURATION_CFG,
      notifConfig: INITIAL_NOTIF_CFG,
      apporteurs: INITIAL_APPORTEURS,
      _invoiceCounter: 43,
      _devisCounter: 12,

      addDossier: (data) => {
        const id = 'd' + uid();
        const name = data.lastName.trim();
        const displayName = [name, data.firstName].filter(Boolean).join(' ');
        const newDossier: Dossier = {
          id,
          name,
          firstName: data.firstName,
          address: data.address,
          siteAddress: data.siteAddress,
          postalCode: data.postalCode,
          tva: data.tva,
          phone: data.phone,
          email: data.email,
          status: 'EN COURS',
          createdAt: new Date().toLocaleDateString('fr-FR'),
          subfolders: [{ label: 'DOSSIER RENSEIGNEMENT' }],
        };
        set(s => ({ dossiers: [newDossier, ...s.dossiers] }));
        get().addLog({ user: randomUser(), action: 'Nouveau dossier créé', target: displayName, icon: '📁' });
        get().addAlert({ severity: 'info', text: `Nouveau dossier créé — ${displayName}`, dossierId: id });
        return id;
      },

      updateDossierStatus: (id, status) => {
        const dossier = get().dossiers.find(d => d.id === id);
        if (!dossier) return;
        set(s => ({ dossiers: s.dossiers.map(d => d.id === id ? { ...d, status } : d) }));
        get().addLog({ user: randomUser(), action: `Statut mis à jour → ${status}`, target: dossier.name, icon: '🔄' });
        if (status === 'URGENT') {
          get().addAlert({ severity: 'error', text: `Dossier passé URGENT — ${dossier.name}`, dossierId: id });
        }
      },

      updateDossierNotes: (id, notes) => {
        set(s => ({ dossiers: s.dossiers.map(d => d.id === id ? { ...d, notes } : d) }));
      },

      addSubfolder: (dossierId, label) => {
        const date = new Date().toLocaleDateString('fr-FR');
        const inDossiers = get().dossiers.some(d => d.id === dossierId);
        if (inDossiers) {
          set(s => ({
            dossiers: s.dossiers.map(d =>
              d.id === dossierId ? { ...d, subfolders: [...d.subfolders, { label, date }] } : d
            ),
          }));
        } else {
          set(s => ({
            dossiersSignes: s.dossiersSignes.map(d =>
              d.id === dossierId ? { ...d, signedSubfolders: [...d.signedSubfolders, { label, date }] } : d
            ),
          }));
        }
      },

      signerDossier: (id) => {
        const dossier = get().dossiers.find(d => d.id === id);
        if (!dossier) return;
        const signed: DossierSigne = {
          ...dossier,
          signedDate: new Date().toLocaleDateString('fr-FR'),
          signedSubfolders: SIGNED_SUBFOLDERS,
        };
        set(s => ({
          dossiers: s.dossiers.filter(d => d.id !== id),
          dossiersSignes: [signed, ...s.dossiersSignes],
        }));
        get().addLog({ user: randomUser(), action: 'Dossier signé ✅', target: dossier.name, icon: '✅' });
        get().addAlert({ severity: 'info', text: `Dossier signé — ${dossier.name}`, dossierId: id });
        // Auto-create invoice
        get().addInvoice({ dossierId: id, client: dossier.name, date: new Date().toLocaleDateString('fr-FR'), montantHT: 0, tva: 20, statut: 'EN ATTENTE', type: 'Facture' });
      },

      perdreDossier: (id, reason) => {
        const dossier = get().dossiers.find(d => d.id === id);
        if (!dossier) return;
        const perdu: DossierPerdu = {
          id: 'p' + uid(),
          name: dossier.name,
          reason,
          lostDate: new Date().toLocaleDateString('fr-FR'),
          montantEstime: 0,
        };
        set(s => ({
          dossiers: s.dossiers.filter(d => d.id !== id),
          dossiersPerdus: [perdu, ...s.dossiersPerdus],
        }));
        get().addLog({ user: randomUser(), action: 'Dossier perdu', target: `${dossier.name} — ${reason}`, icon: '❌' });
      },

      addPlanningEvent: (event) => {
        const newEvent = { ...event, id: 'ev' + uid() };
        set(s => ({ planningEvents: [...s.planningEvents, newEvent] }));
        get().addLog({ user: randomUser(), action: 'Événement planning ajouté', target: event.title, icon: '📅' });
      },

      deletePlanningEvent: (id) => {
        set(s => ({ planningEvents: s.planningEvents.filter(e => e.id !== id) }));
      },

      addGestEvent: (event) => {
        const newEvent = { ...event, id: 'gev' + uid() };
        set(s => ({ gestEvents: [...s.gestEvents, newEvent] }));
        get().addLog({ user: randomUser(), action: `${event.type} planifié`, target: event.client, icon: '🏗️' });
      },

      deleteGestEvent: (id) => {
        set(s => ({ gestEvents: s.gestEvents.filter(e => e.id !== id) }));
      },

      addCommande: (cmd) => {
        const newCmd: Commande = { ...cmd, id: 'cmd' + uid() };
        set(s => ({ commandes: [newCmd, ...s.commandes] }));
        get().addLog({ user: randomUser(), action: 'Commande créée', target: `${cmd.fournisseur} — ${cmd.dossierName}`, icon: '🛒' });
      },

      updateCommandeStatut: (id, statut) => {
        set(s => ({ commandes: s.commandes.map(c => c.id === id ? { ...c, statut } : c) }));
        const cmd = get().commandes.find(c => c.id === id);
        if (cmd) get().addLog({ user: randomUser(), action: `Commande → ${statut}`, target: `${cmd.fournisseur} — ${cmd.dossierName}`, icon: statut === 'LIVRÉE' ? '📦' : '🔄' });
      },

      deleteCommande: (id) => {
        set(s => ({ commandes: s.commandes.filter(c => c.id !== id) }));
      },

      updateDateButoireSignee: (dossierId, label, date) => {
        set(s => ({
          datesButoiresSignes: {
            ...s.datesButoiresSignes,
            [dossierId]: { ...(s.datesButoiresSignes[dossierId] ?? {}), [label]: date },
          },
        }));
      },

      addStockItem: (item) => {
        const newItem = { ...item, id: 'st' + uid() };
        set(s => ({ stockItems: [newItem, ...s.stockItems] }));
        get().addLog({ user: randomUser(), action: 'Article stock ajouté', target: `${item.supplier} ${item.model}`, icon: '📦' });
      },

      updateStockDot: (id, dot) => {
        set(s => ({ stockItems: s.stockItems.map(i => i.id === id ? { ...i, dot } : i) }));
        if (dot === 'red') {
          const item = get().stockItems.find(i => i.id === id);
          if (item) get().addAlert({ severity: 'error', text: `Rupture de stock — ${item.supplier} ${item.model}` });
        }
      },

      updateStockItem: (id, data) => {
        set(s => ({ stockItems: s.stockItems.map(i => i.id === id ? { ...i, ...data } : i) }));
      },

      deleteStockItem: (id) => {
        set(s => ({ stockItems: s.stockItems.filter(i => i.id !== id) }));
      },

      addIntervenant: (data) => {
        const newIntervenant: Intervenant = { id: 'i' + uid(), ...data, dossiers: [] };
        set(s => ({ intervenants: [newIntervenant, ...s.intervenants] }));
        get().addLog({ user: randomUser(), action: 'Intervenant ajouté', target: `${data.name} (${data.type})`, icon: '👷' });
      },

      removeIntervenant: (id) => {
        const target = get().intervenants.find(i => i.id === id);
        set(s => ({ intervenants: s.intervenants.filter(i => i.id !== id) }));
        if (target) get().addLog({ user: randomUser(), action: 'Intervenant supprimé', target: target.name, icon: '🗑️' });
      },

      updateIntervenant: (id, data) => {
        set(s => ({ intervenants: s.intervenants.map(i => i.id === id ? { ...i, ...data } : i) }));
        const target = get().intervenants.find(i => i.id === id);
        if (target) get().addLog({ user: randomUser(), action: 'Intervenant modifié', target: target.name, icon: '✏️' });
      },

      updateIntervenantDossierStatut: (intervenantId, dossierName, statut) => {
        set(s => ({
          intervenants: s.intervenants.map(i =>
            i.id === intervenantId
              ? { ...i, dossiers: i.dossiers.map(d => d.name === dossierName ? { ...d, statut } : d) }
              : i
          )
        }));
      },

      addInvoice: (inv) => {
        const year = new Date().getFullYear();
        const prefix = inv.type === 'Avoir' ? 'AV' : inv.type === "Facture d'acompte" ? 'FA' : 'F';
        const counter = get()._invoiceCounter;
        set(s => ({ _invoiceCounter: s._invoiceCounter + 1 }));
        const ref = `${prefix}-${year}-${String(counter).padStart(3, '0')}`;
        const newInv: Invoice = { ...inv, id: 'inv' + uid(), ref };
        set(s => ({ invoices: [newInv, ...s.invoices] }));
        get().addLog({ user: randomUser(), action: 'Facture créée', target: `${ref} — ${inv.client}`, icon: '🧾' });
        return newInv.id;
      },

      addInvoiceDetail: (inv) => {
        const year = new Date().getFullYear();
        const prefix = inv.type === 'Avoir' ? 'AV' : inv.type === "Facture d'acompte" ? 'FA' : 'F';
        const counter2 = get()._invoiceCounter;
        set(s => ({ _invoiceCounter: s._invoiceCounter + 1 }));
        const ref = `${prefix}-${year}-${String(counter2).padStart(3, '0')}`;
        const id = 'inv' + uid();
        const totalHT = (inv.lignes ?? []).reduce((s, l) => {
          const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
          return s + ht;
        }, 0);
        const totalTTC = (inv.lignes ?? []).reduce((s, l) => {
          const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
          return s + ht * (1 + l.tva / 100);
        }, 0);
        const token = 'tok_' + id.slice(3, 9) + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
        const newInv: InvoiceDetail = { ...inv, id, ref, montantHT: Math.round(totalHT), token };
        // Stocker dans invoices (base) + invoiceDetails (enrichi)
        const baseInv: Invoice = { id, ref, dossierId: inv.dossierId, client: inv.client, date: inv.date, montantHT: Math.round(totalHT), tva: inv.tva, statut: inv.statut, type: inv.type, notes: inv.notes };
        set(s => ({
          invoices: [baseInv, ...s.invoices],
          invoiceDetails: { ...s.invoiceDetails, [id]: newInv },
        }));
        get().addLog({ user: randomUser(), action: 'Facture créée', target: `${ref} — ${inv.client} (${Math.round(totalTTC).toLocaleString('fr-FR')}€ TTC)`, icon: '🧾' });
        return id;
      },

      updateInvoiceStatus: (id, statut) => {
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, statut } : i) }));
        set(s => s.invoiceDetails[id] ? { invoiceDetails: { ...s.invoiceDetails, [id]: { ...s.invoiceDetails[id], statut } } } : s);
        const inv = get().invoices.find(i => i.id === id);
        if (inv) {
          get().addLog({ user: randomUser(), action: `Facture → ${statut}`, target: `${inv.ref} — ${inv.client}`, icon: statut === 'PAYÉE' ? '💶' : '🔄' });
        }
        if (statut === 'RETARD') {
          const inv = get().invoices.find(i => i.id === id);
          if (inv) get().addAlert({ severity: 'error', text: `Facture en retard — ${inv.client} (${inv.ref})` });
        }
      },

      updateInvoiceDetail: (id, data) => {
        set(s => ({
          invoiceDetails: { ...s.invoiceDetails, [id]: { ...s.invoiceDetails[id], ...data } },
          invoices: s.invoices.map(i => i.id === id ? { ...i, ...data } : i),
        }));
      },

      deleteInvoice: (id) => {
        set(s => {
          const { [id]: _removed, ...rest } = s.invoiceDetails;
          return { invoices: s.invoices.filter(i => i.id !== id), invoiceDetails: rest };
        });
      },

      addDevis: (devis) => {
        const year = new Date().getFullYear();
        const dCounter = get()._devisCounter;
        set(s => ({ _devisCounter: s._devisCounter + 1 }));
        const ref = `D-${year}-${String(dCounter).padStart(3, '0')}`;
        const id = 'dev' + uid();
        const token = 'tok_' + id.slice(3, 9) + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
        const totalHT = devis.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT * (1 - l.remise / 100), 0);
        const totalTTC = devis.lignes.reduce((s, l) => {
          const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
          return s + ht * (1 + l.tva / 100);
        }, 0);
        const newDevis: Devis = { ...devis, id, ref, token, totalHT: Math.round(totalHT), totalTTC: Math.round(totalTTC) };
        set(s => ({ devis: [newDevis, ...s.devis] }));
        get().addLog({ user: randomUser(), action: 'Devis créé', target: `${ref} — ${devis.client} (${Math.round(totalTTC).toLocaleString('fr-FR')}€ TTC)`, icon: '📄' });
        return id;
      },

      updateDevis: (id, data) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? { ...d, ...data } : d) }));
      },

      updateDevisStatut: (id, statut) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? { ...d, statut } : d) }));
        const d = get().devis.find(d => d.id === id);
        if (d) get().addLog({ user: randomUser(), action: `Devis → ${statut}`, target: `${d.ref} — ${d.client}`, icon: statut === 'ACCEPTÉ' ? '✅' : '🔄' });
      },

      sendDevisForSignature: (id, email, piecesJointes) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? {
          ...d,
          statut: 'ENVOYÉ' as DevisStatus,
          signatureStatus: 'EN_ATTENTE_SIGNATURE' as const,
          signatureEmail: email,
          signaturePiecesJointes: piecesJointes ?? [],
        } : d) }));
        const d = get().devis.find(d => d.id === id);
        if (d) get().addLog({ user: randomUser(), action: `Devis envoyé pour signature`, target: `${d.ref} — ${d.client}`, icon: '✍️' });
      },

      markDevisSigned: (id) => {
        const now = new Date().toLocaleDateString('fr-FR');
        set(s => ({ devis: s.devis.map(d => d.id === id ? {
          ...d,
          statut: 'ACCEPTÉ' as DevisStatus,
          signatureStatus: 'SIGNÉ' as const,
          signatureDate: now,
        } : d) }));
        const d = get().devis.find(d => d.id === id);
        if (d) get().addLog({ user: randomUser(), action: `Devis signé électroniquement`, target: `${d.ref} — ${d.client}`, icon: '✅' });
      },

      deleteDevis: (id) => {
        set(s => ({ devis: s.devis.filter(d => d.id !== id) }));
      },

      convertDevisToFacture: (devisId, factureType, pourcentage) => {
        const devis = get().devis.find(d => d.id === devisId);
        if (!devis) return '';
        const montantHT = Math.round(devis.totalHT * (pourcentage / 100));
        const type = factureType === 'AVOIR' ? 'Avoir' : factureType === 'ACOMPTE' || factureType === 'INTERMEDIAIRE' ? "Facture d'acompte" : 'Facture';
        const lignesAjustees: LigneDocument[] = devis.lignes.map(l => ({
          ...l,
          id: 'l' + uid(),
          prixUnitaireHT: parseFloat((l.prixUnitaireHT * (pourcentage / 100)).toFixed(2)),
          description: l.description + (factureType !== 'STANDARD' ? ` (${factureType.toLowerCase()} ${pourcentage}%)` : ''),
        }));
        const avgTva = devis.lignes.length > 0
          ? Math.round(devis.lignes.reduce((s, l) => s + l.tva, 0) / devis.lignes.length)
          : 20;
        return get().addInvoiceDetail({
          dossierId: devis.dossierId,
          client: devis.client,
          clientEmail: devis.clientEmail,
          clientAddress: devis.clientAddress,
          date: new Date().toLocaleDateString('fr-FR'),
          dateEcheance: new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR'),
          montantHT,
          tva: avgTva,
          statut: 'EN ATTENTE',
          type,
          lignes: lignesAjustees,
          devisId,
          factureType,
          conditionsPaiement: devis.conditionsPaiement,
          notes: devis.notes,
        });
      },

      addPayment: (pay) => {
        const newPay: Payment = { ...pay, id: 'pay' + uid() };
        set(s => ({ payments: [newPay, ...s.payments] }));
        get().addLog({ user: randomUser(), action: `Paiement ${pay.statut === 'ENCAISSÉ' ? 'encaissé' : 'créé'}`, target: `${pay.client} — ${pay.amount}€`, icon: '💶' });
      },

      updatePaymentStatus: (id, statut) => {
        set(s => ({ payments: s.payments.map(p => p.id === id ? { ...p, statut } : p) }));
        const pay = get().payments.find(p => p.id === id);
        if (pay) get().addLog({ user: randomUser(), action: `Paiement → ${statut}`, target: `${pay.client} — ${pay.amount}€`, icon: statut === 'ENCAISSÉ' ? '✅' : '🔄' });
      },

      addAlert: (alert) => {
        const newAlert: AlertItem = { ...alert, id: 'a' + uid(), dismissed: false, createdAt: now() };
        set(s => ({ alerts: [newAlert, ...s.alerts.slice(0, 19)] }));
      },

      dismissAlert: (id) => {
        set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, dismissed: true } : a) }));
      },

      updateSociete: (data) => {
        set(s => ({ societe: { ...s.societe, ...data } }));
        get().addLog({ user: 'Cassandra', action: 'Paramètres société mis à jour', target: get().societe.nom, icon: '🏢' });
      },

      updateRelanceConfig: (data) => {
        set(s => ({ relanceConfig: { ...s.relanceConfig, ...data } }));
      },

      addMember: (member) => {
        const newMember: UserMember = { ...member, id: 'm' + uid() };
        set(s => ({ members: [newMember, ...s.members] }));
        get().addLog({ user: 'Cassandra', action: 'Membre ajouté', target: `${member.name} (${member.role})`, icon: '👤' });
      },

      toggleMemberActive: (id) => {
        set(s => ({ members: s.members.map(m => m.id === id ? { ...m, active: !m.active } : m) }));
      },

      removeMember: (id) => {
        const target = get().members.find(mb => mb.id === id);
        set(s => ({ members: s.members.filter(mb => mb.id !== id) }));
        if (target) get().addLog({ user: 'Cassandra', action: 'Membre supprimé', target: target.name, icon: '🗑️' });
      },

      updateMemberRole: (id, role) => {
        set(s => ({ members: s.members.map(m => m.id === id ? { ...m, role } : m) }));
      },

      updatePreferences: (data) => {
        set(s => ({ preferences: { ...s.preferences, ...data } }));
      },

      updateNumerotation: (data) => {
        set(s => ({ numerotation: { ...s.numerotation, ...data } }));
      },

      updateFacturationConfig: (data) => {
        set(s => ({ facturationConfig: { ...s.facturationConfig, ...data } }));
      },

      updateNotifConfig: (data) => {
        set(s => ({ notifConfig: { ...s.notifConfig, ...data } }));
      },

      // ── Apporteurs d'affaires (Point 2) ───────────────────────────────────
      addApporteur: (a) => {
        const newA: Apporteur = { ...a, id: 'ap' + uid(), dateAjout: new Date().toLocaleDateString('fr-FR') };
        set(s => ({ apporteurs: [...s.apporteurs, newA] }));
        get().addLog({ user: randomUser(), action: 'Apporteur ajouté', target: newA.nom, icon: '🤝' });
      },

      updateApporteur: (id, data) => {
        set(s => ({ apporteurs: s.apporteurs.map(a => a.id === id ? { ...a, ...data } : a) }));
      },

      deleteApporteur: (id) => {
        set(s => ({ apporteurs: s.apporteurs.filter(a => a.id !== id) }));
      },

      toggleApporteurActif: (id) => {
        set(s => ({ apporteurs: s.apporteurs.map(a => a.id === id ? { ...a, actif: !a.actif } : a) }));
      },

      // ── Confirmations fournisseurs (Point 8) ──────────────────────────────
      addConfirmation: (dossierId, conf) => {
        const newConf: ConfirmationFournisseur = { ...conf, id: 'cf' + uid() };
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: [...(d.confirmations ?? []), newConf] }
              : d
          ),
        }));
      },

      updateConfirmation: (dossierId, confId, data) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).map(c => c.id === confId ? { ...c, ...data } : c) }
              : d
          ),
        }));
      },

      deleteConfirmation: (dossierId, confId) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).filter(c => c.id !== confId) }
              : d
          ),
        }));
      },

      toggleConfirmationValidee: (dossierId, confId) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId
              ? { ...d, confirmations: (d.confirmations ?? []).map(c => c.id === confId ? { ...c, validee: !c.validee } : c) }
              : d
          ),
        }));
      },

      // ── Relances ────────────────────────────────────────────────────────
      addRelance: (relance) => {
        const newRelance: Relance = { ...relance, id: 'rel' + uid() };
        set(s => ({ relances: [newRelance, ...s.relances] }));
        get().addLog({ user: randomUser(), action: 'Relance créée', target: relance.message, icon: '🔔' });
      },

      resolveRelance: (id) => {
        set(s => ({
          relances: s.relances.map(r => r.id === id ? { ...r, status: 'resolved' as const } : r),
        }));
        const relance = get().relances.find(r => r.id === id);
        if (relance) {
          get().addLog({ user: randomUser(), action: 'Relance résolue', target: relance.message, icon: '✅' });
        }
      },

      snoozeRelance: (id, days) => {
        const today = new Date();
        const nextDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
        const dateNextRelance = nextDate.toLocaleDateString('fr-FR');
        set(s => ({
          relances: s.relances.map(r =>
            r.id === id ? { ...r, status: 'snoozed' as const, dateNextRelance } : r
          ),
        }));
        const relance = get().relances.find(r => r.id === id);
        if (relance) {
          get().addLog({ user: randomUser(), action: `Relance reportée de ${days} jours`, target: relance.message, icon: '⏱️' });
        }
      },

      getActiveRelances: () => {
        return get().relances.filter(r => r.status === 'active');
      },

      checkAndCreateRelances: () => {
        const today = new Date();
        const dossiersSignes = get().dossiersSignes;
        const existingRelances = get().relances;

        dossiersSignes.forEach(dossier => {
          // Check for overdue date butoires
          if (dossier.dateButoires) {
            Object.entries(dossier.dateButoires).forEach(([key, dateStr]) => {
              if (dateStr) {
                const [day, month, year] = dateStr.split('/').map(Number);
                const dueDateObj = new Date(year, month - 1, day);
                if (dueDateObj < today && !existingRelances.some(r => r.dossierId === dossier.id && r.type === 'date_butoire' && r.status === 'active')) {
                  const fieldLabel = key.replace(/([A-Z])/g, ' $1').toLowerCase();
                  get().addRelance({
                    dossierId: dossier.id,
                    type: 'date_butoire',
                    message: `Date butoir ${fieldLabel} dépassée — ${dossier.name}`,
                    dateCreated: today.toLocaleDateString('fr-FR'),
                    dateNextRelance: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
                    status: 'active',
                  });
                }
              }
            });
          }

          // Check for no deposit in last 2 weeks
          const signedDate = new Date(dossier.signedDate.split('/').reverse().join('-'));
          const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
          if (signedDate < twoWeeksAgo && !existingRelances.some(r => r.dossierId === dossier.id && r.type === 'dossier_vente' && r.status === 'active')) {
            get().addRelance({
              dossierId: dossier.id,
              type: 'dossier_vente',
              message: `Pas de dépôt depuis 2 semaines — ${dossier.name}`,
              dateCreated: today.toLocaleDateString('fr-FR'),
              dateNextRelance: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
              status: 'active',
            });
          }

          // Check for confirmations > 1 week
          if (dossier.confirmations) {
            dossier.confirmations.forEach(conf => {
              const commandDate = new Date(conf.dateButoir.split('/').reverse().join('-'));
              const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              if (commandDate < oneWeekAgo && !conf.validee && !existingRelances.some(r => r.dossierId === dossier.id && r.type === 'confirmation' && r.status === 'active')) {
                get().addRelance({
                  dossierId: dossier.id,
                  type: 'confirmation',
                  message: `Confirmation fournisseur ${conf.fournisseur} en attente — ${dossier.name}`,
                  dateCreated: today.toLocaleDateString('fr-FR'),
                  dateNextRelance: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
                  status: 'active',
                });
              }
            });
          }
        });
      },

      updateDossierSigneDateButoires: (dossierId, dateButoires) => {
        set(s => ({
          dossiersSignes: s.dossiersSignes.map(d =>
            d.id === dossierId ? { ...d, dateButoires } : d
          ),
        }));
        const dossier = get().dossiersSignes.find(d => d.id === dossierId);
        if (dossier) {
          get().addLog({ user: randomUser(), action: 'Dates butoires mises à jour', target: dossier.name, icon: '📅' });
        }
      },

      addLog: (log) => {
        const newLog: HistoryLog = { ...log, id: 'l' + uid(), time: now() };
        set(s => ({ historyLogs: [newLog, ...s.historyLogs.slice(0, 49)] }));
      },

      reset: () => set({
        dossiers: INITIAL_DOSSIERS,
        dossiersSignes: INITIAL_SIGNES,
        dossiersPerdus: INITIAL_PERDUS,
        planningEvents: INITIAL_EVENTS,
        gestEvents: INITIAL_GEST_EVENTS,
        commandes: INITIAL_COMMANDES,
        datesButoiresSignes: {},
        stockItems: INITIAL_STOCK,
        intervenants: INITIAL_INTERVENANTS,
        historyLogs: INITIAL_LOGS,
        invoices: INITIAL_INVOICES,
        invoiceDetails: {},
        devis: INITIAL_DEVIS,
        payments: INITIAL_PAYMENTS,
        alerts: INITIAL_ALERTS,
        societe: INITIAL_SOCIETE,
        relanceConfig: INITIAL_RELANCE,
        relances: INITIAL_RELANCES,
        members: INITIAL_MEMBERS,
        preferences: INITIAL_PREFERENCES,
        numerotation: INITIAL_NUMEROTATION,
        facturationConfig: INITIAL_FACTURATION_CFG,
        notifConfig: INITIAL_NOTIF_CFG,
        apporteurs: INITIAL_APPORTEURS,
        _invoiceCounter: 43,
        _devisCounter: 12,
      }),
    }),
    { name: 'avra-store-v2' }
  )
);
