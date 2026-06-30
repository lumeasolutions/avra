/**
 * orders-api.ts — Commandes fournisseurs (SupplierOrder) côté front.
 * Lecture + création + suppression via le module backend `orders`.
 */
import { api } from './api';

export interface OrderLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  reference?: string;
}

export interface OrderApi {
  id: string;
  reference: string | null;
  notes: string | null;
  orderedAt: string;
  createdAt: string;
  project?: { id: string; name: string; reference?: string | null } | null;
  supplier?: { id: string; name: string } | null;
  _count?: { lines: number };
  lines?: { quantity: number; unitPrice: string | number }[];
}

export const listOrders = () =>
  api<{ data: OrderApi[]; total: number }>('/orders?page=1&pageSize=100');

export const createOrder = (body: {
  projectId: string;
  reference?: string;
  notes?: string;
  lines?: OrderLineInput[];
}) => api<OrderApi>('/orders', { method: 'POST', body: JSON.stringify(body) });

export const deleteOrder = (id: string) =>
  api<unknown>(`/orders/${id}`, { method: 'DELETE' });

/** Total HT d'une commande = somme(quantité × prix unitaire) de ses lignes. */
export const orderTotal = (o: OrderApi) =>
  (o.lines ?? []).reduce((s, l) => s + Number(l.unitPrice) * (l.quantity ?? 0), 0);
