/**
 * Client API Quotes (devis) — wrappe le module backend NestJS /quotes.
 *
 * Les valeurs Decimal (quantity, unitPrice, vatRate, discount, totals) circulent
 * en STRING pour preserver les centimes (Prisma.Decimal -> string cote backend).
 * Ce module fournit aussi les mappeurs Devis(front) <-> Quote(back).
 *
 * VAGUE 1b : persistance backend des devis. Le store useFacturationStore appelle
 * ces fonctions en write-through ; useDataSync hydrate au montage.
 */
import { api } from './api';
import type { Devis, LigneDocument, DevisStatus } from '@/store/useFacturationStore';

// ── Types backend ────────────────────────────────────────────────────────────

export interface QuoteLineApi {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate?: string;
  discount?: string;
  unit?: string | null;
  position?: number;
}

export interface QuoteApi {
  id: string;
  workspaceId: string;
  projectId: string | null;
  status: string;
  reference: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  objet: string | null;
  conditionsPaiement: string | null;
  validUntil: string | null;
  notes: string | null;
  token: string | null;
  signatureStatus: string | null;
  signatureEmail: string | null;
  signedAt: string | null;
  totalHT: string | null;
  totalTTC: string | null;
  createdAt: string;
  updatedAt: string;
  lines: (QuoteLineApi & { id: string })[];
}

export interface QuotePayload {
  projectId?: string;
  status?: string;
  reference?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  objet?: string;
  conditionsPaiement?: string;
  validUntil?: string;
  notes?: string;
  token?: string;
  signatureStatus?: string;
  signatureEmail?: string;
  lines: QuoteLineApi[];
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

export const listQuotes = () => api<QuoteApi[]>('/quotes');
export const createQuote = (data: QuotePayload) =>
  api<QuoteApi>('/quotes', { method: 'POST', body: JSON.stringify(data) });
export const updateQuoteApi = (id: string, patch: Partial<QuotePayload>) =>
  api<QuoteApi>(`/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteQuoteApi = (id: string) =>
  api<void>(`/quotes/${id}`, { method: 'DELETE' });

// ── Helpers id / dates ───────────────────────────────────────────────────────

/** Les ids locaux (non encore persistes) commencent par "dev". Le backend = cuid. */
export const isBackendQuoteId = (id: string) => !!id && !id.startsWith('dev');

/** Un projectId valide cote backend = cuid (~25 chars). Sinon devis standalone. */
const isRealProjectId = (id?: string) => !!id && id.length >= 20 && !id.startsWith('local');

/** "dd/MM/yyyy" (fr) -> "yyyy-MM-dd" (ISO date) ou undefined si non parseable. */
function frToIso(d?: string): string | undefined {
  if (!d) return undefined;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
}

/** ISO -> "dd/MM/yyyy" (fr). */
function isoToFr(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('fr-FR');
}

// ── Mappeurs Devis <-> Quote ─────────────────────────────────────────────────

export function devisToPayload(devis: Partial<Devis> & { lignes: LigneDocument[] }): QuotePayload {
  return {
    projectId: isRealProjectId(devis.dossierId) ? devis.dossierId : undefined,
    status: devis.statut,
    reference: devis.ref,
    clientName: devis.client,
    clientEmail: devis.clientEmail || undefined,
    clientAddress: devis.clientAddress || undefined,
    objet: devis.objet || undefined,
    conditionsPaiement: devis.conditionsPaiement || undefined,
    validUntil: frToIso(devis.dateValidite),
    notes: devis.notes || undefined,
    token: devis.token || undefined,
    signatureStatus: devis.signatureStatus || undefined,
    signatureEmail: devis.signatureEmail || undefined,
    lines: (devis.lignes ?? []).map((l, i) => ({
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

export function quoteToDevis(q: QuoteApi): Devis {
  const lignes: LigneDocument[] = (q.lines ?? []).map((l) => ({
    id: l.id,
    description: l.description,
    quantite: Number(l.quantity ?? 0),
    unite: l.unit ?? '',
    prixUnitaireHT: Number(l.unitPrice ?? 0),
    tva: Number(l.vatRate ?? 20),
    remise: Number(l.discount ?? 0),
  }));
  return {
    id: q.id,
    ref: q.reference ?? '',
    dossierId: q.projectId ?? undefined,
    client: q.clientName ?? '',
    clientEmail: q.clientEmail ?? undefined,
    clientAddress: q.clientAddress ?? undefined,
    objet: q.objet ?? undefined,
    lignes,
    statut: (q.status as DevisStatus) || 'BROUILLON',
    dateCreation: isoToFr(q.createdAt),
    dateValidite: isoToFr(q.validUntil),
    conditionsPaiement: q.conditionsPaiement ?? '',
    notes: q.notes ?? undefined,
    totalHT: Number(q.totalHT ?? 0),
    totalTTC: Number(q.totalTTC ?? 0),
    token: q.token ?? undefined,
    signatureStatus: (q.signatureStatus as Devis['signatureStatus']) ?? undefined,
    signatureDate: q.signedAt ? isoToFr(q.signedAt) : undefined,
    signatureEmail: q.signatureEmail ?? undefined,
  };
}
