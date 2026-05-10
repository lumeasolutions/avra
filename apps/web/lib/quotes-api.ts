/**
 * Client API Quotes — wrap les endpoints backend NestJS du module Quotes (V3.C1).
 *
 * Les valeurs Decimal (quantity, unitPrice, vatRate, totals) circulent en STRING
 * pour preserver les centimes (Prisma.Decimal -> string cote backend). Ne jamais
 * passer par Number en interne sans toFixed(2) pour l'affichage.
 *
 * Numerotation des factures : atomique cote backend via prisma.$transaction
 * (POST /quotes/:id/convert-to-invoice). Plus de compteur cote frontend.
 */
import { api } from './api';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'INVOICED' | 'PAID' | 'CANCELLED';

export interface QuoteLine {
  id?: string;
  description: string;
  quantity: string;       // Decimal as string — ne jamais convertir en number sauf pour affichage
  unitPrice: string;      // Decimal as string
  vatRate?: string;       // Decimal as string ('20.00' = 20%)
  position?: number;
}

export interface Quote {
  id: string;
  workspaceId: string;
  projectId: string;
  version: number;
  status: QuoteStatus;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: (QuoteLine & { id: string })[];
  // Champs optionnels exposes par le backend selon la version :
  reference?: string | null;       // ex. F-2026-0042 apres conversion en facture
  invoicedAt?: string | null;
}

export interface CreateQuoteInput {
  projectId: string;
  validUntil?: string;
  notes?: string;
  lines: QuoteLine[];
}

export type UpdateQuoteInput = Partial<{
  status: QuoteStatus;
  validUntil: string | null;
  notes: string | null;
  lines: QuoteLine[];
}>;

// ── HTTP wrappers ────────────────────────────────────────────────────────────

export async function listQuotes(projectId?: string): Promise<Quote[]> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return api<Quote[]>(`/quotes${qs}`);
}

export async function getQuote(id: string): Promise<Quote> {
  return api<Quote>(`/quotes/${id}`);
}

export async function createQuote(data: CreateQuoteInput): Promise<Quote> {
  return api<Quote>('/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuote(id: string, patch: UpdateQuoteInput): Promise<Quote> {
  return api<Quote>(`/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteQuote(id: string): Promise<void> {
  await api<void>(`/quotes/${id}`, { method: 'DELETE' });
}

export async function convertToInvoice(id: string): Promise<Quote> {
  return api<Quote>(`/quotes/${id}/convert-to-invoice`, { method: 'POST' });
}

// ── Decimal helpers (preservation des centimes) ──────────────────────────────

/**
 * Additionne deux Decimal-strings en preservant 2 decimales.
 * Ne PAS utiliser Math.round qui perd les centimes (1234.57 -> 1235).
 */
export function addDecimals(a: string | number, b: string | number): string {
  const na = typeof a === 'string' ? Number(a) : a;
  const nb = typeof b === 'string' ? Number(b) : b;
  return (na + nb).toFixed(2);
}

/** Multiplie un Decimal-string par un facteur en gardant 2 decimales. */
export function mulDecimal(a: string | number, factor: number): string {
  const na = typeof a === 'string' ? Number(a) : a;
  return (na * factor).toFixed(2);
}

/** Convertit un Decimal-string en number SEULEMENT pour le rendu UI / calculs jetables. */
export function toCents(a: string | number): number {
  return typeof a === 'string' ? Number(a) : a;
}

/** Calcule HT total d'une ligne quantity * unitPrice en preservant 2 decimales. */
export function lineTotalHT(line: QuoteLine): string {
  return mulDecimal(toCents(line.quantity) * toCents(line.unitPrice), 1);
}

/** Calcule HT total d'un Quote a partir de ses lignes (string Decimal preserve). */
export function quoteTotalHT(quote: Pick<Quote, 'lines'>): string {
  return quote.lines.reduce<string>((acc, l) => addDecimals(acc, lineTotalHT(l)), '0.00');
}

/** Calcule TTC total d'un Quote (applique vatRate de chaque ligne, 20% par defaut). */
export function quoteTotalTTC(quote: Pick<Quote, 'lines'>): string {
  return quote.lines.reduce<string>((acc, l) => {
    const ht = toCents(l.quantity) * toCents(l.unitPrice);
    const vat = toCents(l.vatRate ?? '20.00') / 100;
    return addDecimals(acc, (ht * (1 + vat)).toFixed(2));
  }, '0.00');
}
