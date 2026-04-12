/**
 * Store Facturation — devis, factures, paiements, apporteurs
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type InvoiceStatus = 'PAYÉE' | 'EN ATTENTE' | 'ACOMPTE' | 'AVOIR' | 'RETARD';
export type PaymentStatus = 'ENCAISSÉ' | 'EN ATTENTE' | 'RETARD';
export type DevisStatus = 'BROUILLON' | 'ENVOYÉ' | 'ACCEPTÉ' | 'REFUSÉ' | 'EXPIRÉ';
export type FactureDetailType = 'ACOMPTE' | 'INTERMEDIAIRE' | 'SOLDE' | 'AVOIR' | 'STANDARD';

export interface LigneDocument {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tva: number;
  remise: number;
}

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

export interface InvoiceDetail extends Invoice {
  lignes?: LigneDocument[];
  devisId?: string;
  factureType?: FactureDetailType;
  dateEcheance?: string;
  conditionsPaiement?: string;
  acomptesLies?: string[];
  montantDeja?: number;
  rib?: string;
  token?: string;
  clientEmail?: string;
  clientAddress?: string;
}

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

export interface Devis {
  id: string;
  ref: string;
  dossierId?: string;
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  objet?: string;
  lignes: LigneDocument[];
  statut: DevisStatus;
  dateCreation: string;
  dateValidite: string;
  conditionsPaiement: string;
  notes?: string;
  totalHT: number;
  totalTTC: number;
  token?: string;
  signatureStatus?: 'EN_ATTENTE_SIGNATURE' | 'SIGNÉ';
  signatureDate?: string;
  signatureEmail?: string;
  signaturePiecesJointes?: string[];
}

export interface Apporteur {
  id: string;
  nom: string;
  email?: string;
  phone?: string;
  tauxCommission: number;
  actif: boolean;
  dateAjout: string;
  notes?: string;
}

// Données initiales — vides. Les vraies données viennent de l'API via useDataSync.
const INITIAL_INVOICES: Invoice[] = [];
const INITIAL_PAYMENTS: Payment[] = [];
const INITIAL_DEVIS: Devis[] = [];
const INITIAL_APPORTEURS: Apporteur[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

interface FacturationState {
  // Data
  invoices: Invoice[];
  invoiceDetails: Record<string, InvoiceDetail>;
  devis: Devis[];
  payments: Payment[];
  apporteurs: Apporteur[];
  _invoiceCounter: number;
  _devisCounter: number;

  // Invoice actions
  addInvoice: (inv: Omit<Invoice, 'id' | 'ref'>) => string;
  addInvoiceDetail: (detail: Omit<InvoiceDetail, 'id' | 'ref' | 'montantHT'>) => string;
  updateInvoiceStatus: (id: string, statut: InvoiceStatus) => void;
  updateInvoiceDetail: (id: string, data: Partial<InvoiceDetail>) => void;
  deleteInvoice: (id: string) => void;

  // Devis actions
  addDevis: (devis: Omit<Devis, 'id' | 'ref' | 'token'>) => string;
  updateDevis: (id: string, data: Partial<Devis>) => void;
  updateDevisStatut: (id: string, statut: DevisStatus) => void;
  sendDevisForSignature: (id: string, email: string, piecesJointes?: string[]) => void;
  markDevisSigned: (id: string) => void;
  deleteDevis: (id: string) => void;
  convertDevisToFacture: (devisId: string, factureType: FactureDetailType, pourcentage: number) => string;

  // Payment actions
  addPayment: (pay: Omit<Payment, 'id'>) => void;
  updatePaymentStatus: (id: string, statut: PaymentStatus) => void;

  // Apporteur actions
  addApporteur: (a: Omit<Apporteur, 'id' | 'dateAjout'>) => void;
  updateApporteur: (id: string, data: Partial<Apporteur>) => void;
  deleteApporteur: (id: string) => void;
  toggleApporteurActif: (id: string) => void;

  // Reset
  reset: () => void;
}

export const useFacturationStore = create<FacturationState>()(
  persist(
    (set, get) => ({
      invoices: INITIAL_INVOICES,
      invoiceDetails: {},
      devis: INITIAL_DEVIS,
      payments: INITIAL_PAYMENTS,
      apporteurs: INITIAL_APPORTEURS,
      _invoiceCounter: 43,
      _devisCounter: 12,

      addInvoice: (inv) => {
        const year = new Date().getFullYear();
        const prefix = inv.type === 'Avoir' ? 'AV' : inv.type === "Facture d'acompte" ? 'FA' : 'F';
        const counter = get()._invoiceCounter;
        set(s => ({ _invoiceCounter: s._invoiceCounter + 1 }));
        const ref = `${prefix}-${year}-${String(counter).padStart(3, '0')}`;
        const newInv: Invoice = { ...inv, id: 'inv' + uid(), ref };
        set(s => ({ invoices: [newInv, ...s.invoices] }));
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
        const baseInv: Invoice = { id, ref, dossierId: inv.dossierId, client: inv.client, date: inv.date, montantHT: Math.round(totalHT), tva: inv.tva, statut: inv.statut, type: inv.type, notes: inv.notes };
        set(s => ({
          invoices: [baseInv, ...s.invoices],
          invoiceDetails: { ...s.invoiceDetails, [id]: newInv },
        }));
        return id;
      },

      updateInvoiceStatus: (id, statut) => {
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, statut } : i) }));
        set(s => s.invoiceDetails[id] ? { invoiceDetails: { ...s.invoiceDetails, [id]: { ...s.invoiceDetails[id], statut } } } : s);
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
        return id;
      },

      updateDevis: (id, data) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? { ...d, ...data } : d) }));
      },

      updateDevisStatut: (id, statut) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? { ...d, statut } : d) }));
      },

      sendDevisForSignature: (id, email, piecesJointes) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? {
          ...d,
          statut: 'ENVOYÉ' as DevisStatus,
          signatureStatus: 'EN_ATTENTE_SIGNATURE' as const,
          signatureEmail: email,
          signaturePiecesJointes: piecesJointes ?? [],
        } : d) }));
      },

      markDevisSigned: (id) => {
        const now = new Date().toLocaleDateString('fr-FR');
        set(s => ({ devis: s.devis.map(d => d.id === id ? {
          ...d,
          statut: 'ACCEPTÉ' as DevisStatus,
          signatureStatus: 'SIGNÉ' as const,
          signatureDate: now,
        } : d) }));
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
      },

      updatePaymentStatus: (id, statut) => {
        set(s => ({ payments: s.payments.map(p => p.id === id ? { ...p, statut } : p) }));
      },

      addApporteur: (a) => {
        const newA: Apporteur = { ...a, id: 'ap' + uid(), dateAjout: new Date().toLocaleDateString('fr-FR') };
        set(s => ({ apporteurs: [...s.apporteurs, newA] }));
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

      reset: () => set({
        invoices: INITIAL_INVOICES,
        invoiceDetails: {},
        devis: INITIAL_DEVIS,
        payments: INITIAL_PAYMENTS,
        apporteurs: INITIAL_APPORTEURS,
        _invoiceCounter: 43,
        _devisCounter: 12,
      }),
    }),
    { name: 'avra-facturation-store' }
  )
);
