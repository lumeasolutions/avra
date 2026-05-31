/**
 * Client API Invoices (factures) — wrappe le module backend NestJS /invoices.
 * VAGUE 2b : persistance backend des factures. Decimal en string (centimes).
 */
import { api } from './api';
import type { Invoice, InvoiceDetail, InvoiceStatus, LigneDocument, FactureDetailType } from '@/store/useFacturationStore';

export interface InvoiceLineApi {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate?: string;
  discount?: string;
  unit?: string | null;
  position?: number;
}

export interface InvoiceApi {
  id: string;
  workspaceId: string;
  projectId: string | null;
  quoteId: string | null;
  reference: string | null;
  type: string;
  status: string;
  clientName: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  objet: string | null;
  conditionsPaiement: string | null;
  date: string;
  dateEcheance: string | null;
  notes: string | null;
  token: string | null;
  montantDeja: string | null;
  totalHT: string | null;
  totalTVA: string | null;
  totalTTC: string | null;
  createdAt: string;
  updatedAt: string;
  lines: (InvoiceLineApi & { id: string })[];
}

export interface InvoicePayload {
  projectId?: string;
  quoteId?: string;
  reference?: string;
  type?: string;
  status?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  objet?: string;
  conditionsPaiement?: string;
  date?: string;
  dateEcheance?: string;
  notes?: string;
  token?: string;
  montantDeja?: string;
  lines: InvoiceLineApi[];
}

export const listInvoices = () => api<InvoiceApi[]>('/invoices');
export const createInvoice = (data: InvoicePayload) =>
  api<InvoiceApi>('/invoices', { method: 'POST', body: JSON.stringify(data) });
export const updateInvoiceApi = (id: string, patch: Partial<InvoicePayload>) =>
  api<InvoiceApi>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteInvoiceApi = (id: string) =>
  api<void>(`/invoices/${id}`, { method: 'DELETE' });

/** Les ids locaux (non persistes) commencent par "inv". Backend = cuid. */
export const isBackendInvoiceId = (id: string) => !!id && !id.startsWith('inv');
const isRealProjectId = (id?: string) => !!id && id.length >= 20 && !id.startsWith('local');
const isBackendQuoteId = (id?: string) => !!id && !id.startsWith('dev');

function frToIso(d?: string): string | undefined {
  if (!d) return undefined;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
}
function isoToFr(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR');
}

// ── Type front <-> back ──────────────────────────────────────────────────────

function frontTypeToBack(inv: Partial<InvoiceDetail>): string {
  if (inv.factureType) return inv.factureType;
  if (inv.type === "Facture d'acompte") return 'ACOMPTE';
  if (inv.type === 'Avoir') return 'AVOIR';
  return 'STANDARD';
}
function backTypeToFront(type: string): Invoice['type'] {
  if (type === 'AVOIR') return 'Avoir';
  if (type === 'ACOMPTE' || type === 'INTERMEDIAIRE' || type === 'SOLDE') return "Facture d'acompte";
  return 'Facture';
}
const firstVat = (lines: InvoiceLineApi[]) => (lines?.length ? Number(lines[0].vatRate ?? 20) : 20);

// ── Mappeurs ─────────────────────────────────────────────────────────────────

export function invoiceDetailToPayload(inv: Partial<InvoiceDetail> & { lignes?: LigneDocument[] }): InvoicePayload {
  return {
    projectId: isRealProjectId(inv.dossierId) ? inv.dossierId : undefined,
    quoteId: isBackendQuoteId(inv.devisId) ? inv.devisId : undefined,
    reference: inv.ref,
    type: frontTypeToBack(inv),
    status: inv.statut,
    clientName: inv.client,
    clientEmail: inv.clientEmail || undefined,
    clientAddress: inv.clientAddress || undefined,
    conditionsPaiement: inv.conditionsPaiement || undefined,
    date: frToIso(inv.date),
    dateEcheance: frToIso(inv.dateEcheance),
    notes: inv.notes || undefined,
    token: inv.token || undefined,
    montantDeja: inv.montantDeja != null ? String(inv.montantDeja) : undefined,
    lines: (inv.lignes ?? []).map((l, i) => ({
      description: l.description,
      quantity: String(l.quantite ?? 0),
      unitPrice: String(l.prixUnitaireHT ?? 0),
      vatRate: String(l.tva ?? 20),
      discount: String(l.remise ?? 0),
      unit: l.unite || null,
      position: i,
    })),
  };
}

export function invoiceApiToDetail(a: InvoiceApi): InvoiceDetail {
  const lignes: LigneDocument[] = (a.lines ?? []).map((l) => ({
    id: l.id,
    description: l.description,
    quantite: Number(l.quantity ?? 0),
    unite: l.unit ?? '',
    prixUnitaireHT: Number(l.unitPrice ?? 0),
    tva: Number(l.vatRate ?? 20),
    remise: Number(l.discount ?? 0),
  }));
  return {
    id: a.id,
    ref: a.reference ?? '',
    dossierId: a.projectId ?? undefined,
    client: a.clientName ?? '',
    clientEmail: a.clientEmail ?? undefined,
    clientAddress: a.clientAddress ?? undefined,
    date: isoToFr(a.date),
    montantHT: Number(a.totalHT ?? 0),
    tva: firstVat(a.lines),
    statut: (a.status as InvoiceStatus) || 'EN ATTENTE',
    type: backTypeToFront(a.type),
    notes: a.notes ?? undefined,
    lignes,
    devisId: a.quoteId ?? undefined,
    factureType: (a.type as FactureDetailType) ?? undefined,
    dateEcheance: a.dateEcheance ? isoToFr(a.dateEcheance) : undefined,
    conditionsPaiement: a.conditionsPaiement ?? undefined,
    montantDeja: a.montantDeja != null ? Number(a.montantDeja) : undefined,
    token: a.token ?? undefined,
  };
}

/** Version "liste" (sans lignes) pour le tableau invoices. */
export function invoiceApiToBase(a: InvoiceApi): Invoice {
  return {
    id: a.id,
    ref: a.reference ?? '',
    dossierId: a.projectId ?? undefined,
    client: a.clientName ?? '',
    date: isoToFr(a.date),
    montantHT: Number(a.totalHT ?? 0),
    tva: firstVat(a.lines),
    statut: (a.status as InvoiceStatus) || 'EN ATTENTE',
    type: backTypeToFront(a.type),
    notes: a.notes ?? undefined,
  };
}
