/**
 * Store Facturation — devis, factures, paiements, apporteurs
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORE_VERSION, preservingMigrate } from './persistVersioning';
// VAGUE 1b — persistance backend des devis (write-through + hydratation via useDataSync).
import {
  createQuote, updateQuoteApi, deleteQuoteApi, isBackendQuoteId,
  devisToPayload, quoteToDevis,
} from '@/lib/quotes-api';
import {
  createInvoice, updateInvoiceApi, deleteInvoiceApi, isBackendInvoiceId,
  invoiceDetailToPayload, invoiceApiToDetail,
} from '@/lib/invoices-api';
// REST 13/07/2026 — Préfixes de numérotation configurables (Paramètres).
// Lecture runtime via getState() (pas au chargement) → pas de cycle d'init.
// Le backend applique les MÊMES préfixes (invoices.service.resolvePrefix) : le
// preview local et la référence finale sont donc cohérents (plus de « flip »).
import { useConfigStore } from './useConfigStore';

function numPrefixes() {
  const n = useConfigStore.getState().numerotation;
  const pf = (n?.prefixeFacture ?? '').trim() || 'F';
  const pd = (n?.prefixeDevis ?? '').trim() || 'D';
  const pa = (n?.prefixeAvoir ?? '').trim() || 'AV';
  return { pf, pd, pa };
}
function invoicePrefix(type: string | undefined): string {
  const { pf, pa } = numPrefixes();
  if (type === 'Avoir') return pa;
  if (type === "Facture d'acompte") return `${pf}A`;
  return pf;
}

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
  /** TTC reel (ventilation multi-taux). Source de verite pour l'affichage. */
  totalTTC?: number;
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
/** Arrondi monétaire au centime (2 décimales) — JAMAIS à l'euro entier. */
const round2 = (n: number) => Math.round(n * 100) / 100;
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
  /** Pousse l'etat courant d'une facture (id backend) vers l'API. Interne. */
  _syncInvoice: (id: string) => void;
  updateInvoiceStatus: (id: string, statut: InvoiceStatus) => void;
  updateInvoiceDetail: (id: string, data: Partial<InvoiceDetail>) => void;
  deleteInvoice: (id: string) => void;

  // Devis actions
  addDevis: (devis: Omit<Devis, 'id' | 'ref' | 'token'>) => string;
  /** Pousse l'etat courant d'un devis (id backend) vers l'API. Interne. */
  _syncDevis: (id: string) => void;
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
        const prefix = invoicePrefix(inv.type);
        const counter = get()._invoiceCounter;
        set(s => ({ _invoiceCounter: s._invoiceCounter + 1 }));
        const ref = `${prefix}-${year}-${String(counter).padStart(3, '0')}`;
        const id = 'inv' + uid();
        const montantHT = round2(inv.montantHT || 0);
        const tva = inv.tva ?? 20;
        const totalTTC = round2(montantHT * (1 + tva / 100));
        // Facture saisie au montant global (sans lignes détaillées) : on génère
        // une ligne synthétique pour permettre la PERSISTANCE BACKEND (le payload
        // s'appuie sur les lignes). Sans ça, la facture ne vivait qu'en localStorage.
        const ligne: LigneDocument = {
          id: 'l' + uid(),
          description: inv.notes?.trim() || 'Prestation',
          quantite: 1, unite: 'forfait',
          prixUnitaireHT: montantHT, tva, remise: 0,
        };
        const token = 'tok_' + id.slice(3, 9) + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
        const detail: InvoiceDetail = { ...inv, id, ref, montantHT, totalTTC, token, lignes: [ligne] };
        const baseInv: Invoice = { ...inv, id, ref, montantHT, totalTTC };
        set(s => ({
          invoices: [baseInv, ...s.invoices],
          invoiceDetails: { ...s.invoiceDetails, [id]: detail },
        }));
        // Write-through backend : persiste puis remplace l'id local par l'id backend.
        createInvoice(invoiceDetailToPayload(detail))
          .then((a) => {
            const mapped = invoiceApiToDetail(a);
            set(s => {
              const { [id]: _old, ...restDetails } = s.invoiceDetails;
              const { lignes: _l, ...base } = mapped;
              return {
                invoices: s.invoices.map(i => i.id === id ? (base as Invoice) : i),
                invoiceDetails: { ...restDetails, [mapped.id]: mapped },
              };
            });
          })
          .catch((e: any) => console.warn('[facturation] addInvoice createInvoice échec, gardé en local:', e?.message || e));
        return id;
      },

      addInvoiceDetail: (inv) => {
        const year = new Date().getFullYear();
        const prefix = invoicePrefix(inv.type);
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
        const newInv: InvoiceDetail = { ...inv, id, ref, montantHT: round2(totalHT), totalTTC: round2(totalTTC), token };
        const baseInv: Invoice = { id, ref, dossierId: inv.dossierId, client: inv.client, date: inv.date, montantHT: round2(totalHT), tva: inv.tva, totalTTC: round2(totalTTC), statut: inv.statut, type: inv.type, notes: inv.notes };
        set(s => ({
          invoices: [baseInv, ...s.invoices],
          invoiceDetails: { ...s.invoiceDetails, [id]: newInv },
        }));
        // Write-through backend : persiste la facture, puis remplace l'id local par l'id backend.
        createInvoice(invoiceDetailToPayload(newInv))
          .then((a) => {
            const mapped = invoiceApiToDetail(a);
            set(s => {
              const { [id]: _old, ...restDetails } = s.invoiceDetails;
              const { lignes: _l, ...base } = mapped;
              return {
                invoices: s.invoices.map(i => i.id === id ? (base as Invoice) : i),
                invoiceDetails: { ...restDetails, [mapped.id]: mapped },
              };
            });
          })
          .catch((e) => console.warn('[facturation] createInvoice échec, facture gardée en local:', e?.message || e));
        return id;
      },

      _syncInvoice: (id: string) => {
        if (!isBackendInvoiceId(id)) return;
        const d = get().invoiceDetails[id];
        if (d) updateInvoiceApi(id, invoiceDetailToPayload(d)).catch((e) => console.warn('[facturation] updateInvoice échec:', e?.message || e));
      },

      updateInvoiceStatus: (id, statut) => {
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, statut } : i) }));
        set(s => s.invoiceDetails[id] ? { invoiceDetails: { ...s.invoiceDetails, [id]: { ...s.invoiceDetails[id], statut } } } : s);
        if (isBackendInvoiceId(id)) updateInvoiceApi(id, { status: statut }).catch((e) => console.warn('[facturation] updateInvoice statut échec:', e?.message || e));
      },

      updateInvoiceDetail: (id, data) => {
        set(s => ({
          invoiceDetails: { ...s.invoiceDetails, [id]: { ...s.invoiceDetails[id], ...data } },
          invoices: s.invoices.map(i => i.id === id ? { ...i, ...data } : i),
        }));
        get()._syncInvoice(id);
      },

      deleteInvoice: (id) => {
        set(s => {
          const { [id]: _removed, ...rest } = s.invoiceDetails;
          return { invoices: s.invoices.filter(i => i.id !== id), invoiceDetails: rest };
        });
        if (isBackendInvoiceId(id)) deleteInvoiceApi(id).catch((e) => console.warn('[facturation] deleteInvoice échec:', e?.message || e));
      },

      addDevis: (devis) => {
        const year = new Date().getFullYear();
        const dCounter = get()._devisCounter;
        set(s => ({ _devisCounter: s._devisCounter + 1 }));
        const ref = `${numPrefixes().pd}-${year}-${String(dCounter).padStart(3, '0')}`;
        const id = 'dev' + uid();
        const token = 'tok_' + id.slice(3, 9) + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
        const totalHT = devis.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT * (1 - l.remise / 100), 0);
        const totalTTC = devis.lignes.reduce((s, l) => {
          const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
          return s + ht * (1 + l.tva / 100);
        }, 0);
        const newDevis: Devis = { ...devis, id, ref, token, totalHT: round2(totalHT), totalTTC: round2(totalTTC) };
        set(s => ({ devis: [newDevis, ...s.devis] }));
        // Write-through backend : persiste le devis puis remplace l'id local par l'id backend.
        createQuote(devisToPayload(newDevis))
          .then((q) => set(s => ({ devis: s.devis.map(d => d.id === id ? quoteToDevis(q) : d) })))
          .catch((e) => console.warn('[facturation] createQuote échec, devis gardé en local:', e?.message || e));
        return id;
      },

      _syncDevis: (id: string) => {
        if (!isBackendQuoteId(id)) return;
        const d = get().devis.find(x => x.id === id);
        if (d) updateQuoteApi(id, devisToPayload(d)).catch((e) => console.warn('[facturation] updateQuote échec:', e?.message || e));
      },

      updateDevis: (id, data) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? { ...d, ...data } : d) }));
        get()._syncDevis(id);
      },

      updateDevisStatut: (id, statut) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? { ...d, statut } : d) }));
        get()._syncDevis(id);
      },

      sendDevisForSignature: (id, email, piecesJointes) => {
        set(s => ({ devis: s.devis.map(d => d.id === id ? {
          ...d,
          statut: 'ENVOYÉ' as DevisStatus,
          signatureStatus: 'EN_ATTENTE_SIGNATURE' as const,
          signatureEmail: email,
          signaturePiecesJointes: piecesJointes ?? [],
        } : d) }));
        get()._syncDevis(id);
      },

      markDevisSigned: (id) => {
        const now = new Date().toLocaleDateString('fr-FR');
        set(s => ({ devis: s.devis.map(d => d.id === id ? {
          ...d,
          statut: 'ACCEPTÉ' as DevisStatus,
          signatureStatus: 'SIGNÉ' as const,
          signatureDate: now,
        } : d) }));
        get()._syncDevis(id);
      },

      deleteDevis: (id) => {
        set(s => ({ devis: s.devis.filter(d => d.id !== id) }));
        if (isBackendQuoteId(id)) deleteQuoteApi(id).catch((e) => console.warn('[facturation] deleteQuote échec:', e?.message || e));
      },

      convertDevisToFacture: (devisId, factureType, pourcentage) => {
        const devis = get().devis.find(d => d.id === devisId);
        if (!devis) return '';
        // Un SOLDE facture 100% du devis puis deduit les acomptes deja emis.
        const isSolde = factureType === 'SOLDE';
        const pct = isSolde ? 100 : pourcentage;
        const type = factureType === 'AVOIR' ? 'Avoir' : factureType === 'ACOMPTE' || factureType === 'INTERMEDIAIRE' ? "Facture d'acompte" : 'Facture';
        const lignesAjustees: LigneDocument[] = devis.lignes.map(l => ({
          ...l,
          id: 'l' + uid(),
          prixUnitaireHT: parseFloat((l.prixUnitaireHT * (pct / 100)).toFixed(2)),
          description: l.description + (isSolde ? ' (solde)' : factureType !== 'STANDARD' ? ` (${factureType.toLowerCase()} ${pct}%)` : ''),
        }));
        const avgTva = devis.lignes.length > 0
          ? Math.round(devis.lignes.reduce((s, l) => s + l.tva, 0) / devis.lignes.length)
          : 20;
        // Solde : somme TTC des acomptes/intermediaires deja factures pour ce devis.
        let montantDeja: number | undefined;
        if (isSolde) {
          montantDeja = round2(Object.values(get().invoiceDetails)
            .filter(inv => inv.devisId === devisId && (inv.factureType === 'ACOMPTE' || inv.factureType === 'INTERMEDIAIRE'))
            .reduce((s, inv) => s + (inv.totalTTC ?? (inv.lignes ?? []).reduce((a, l) => a + l.quantite * l.prixUnitaireHT * (1 - l.remise / 100) * (1 + l.tva / 100), 0)), 0));
        }
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
          montantDeja,
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
    {
      name: 'avra-facturation-store',
      version: STORE_VERSION,
      migrate: preservingMigrate<FacturationState>(),
    }
  )
);
