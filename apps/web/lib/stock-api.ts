/**
 * stock-api.ts — Client HTTP + mappeurs Stock(front) <-> StockItem(back).
 *
 * Le modèle front (fournisseur en texte libre, pastille `dot`, seuil mini,
 * image, catégorie libre) ne correspond pas 1:1 au modèle backend normalisé.
 * On range donc les champs spécifiques front dans la colonne JSON `extra`,
 * et on mappe les champs « cœur » (montants, quantité, matériau) sur leurs
 * colonnes dédiées.
 */

import { api } from './api';
import type { StockItem } from '@/store/useStockStore';

export interface StockItemApi {
  id: string;
  status?: string;
  category?: string;
  sku?: string | null;
  name: string;
  model?: string | null;
  color?: string | null;
  material?: string | null;
  purchasePrice?: string | number | null;
  salePrice?: string | number | null;
  quantity?: number;
  extra?: Record<string, unknown> | null;
  createdAt?: string;
  supplier?: { name?: string } | null;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Front -> payload backend (POST/PUT). */
export function stockItemToPayload(item: Partial<StockItem>) {
  return {
    // `name` est obligatoire côté backend : on prend le modèle, sinon la réf.
    name: (item.model && item.model.trim()) || item.reference || 'Article',
    model: item.model ?? undefined,
    material: item.material ?? undefined,
    purchasePrice: typeof item.purchase === 'number' ? item.purchase : undefined,
    salePrice: typeof item.sale === 'number' ? item.sale : undefined,
    quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
    sku: item.reference ?? undefined,
    extra: {
      supplier: item.supplier ?? null,
      dot: item.dot ?? null,
      minQuantity: item.minQuantity ?? null,
      image: item.image ?? null,
      category: item.category ?? null,
    },
  };
}

/** Backend -> front. */
export function stockItemFromApi(a: StockItemApi): StockItem {
  const ex = (a.extra ?? {}) as Record<string, unknown>;
  return {
    id: a.id,
    dot: (ex.dot as StockItem['dot']) ?? 'green',
    supplier: (ex.supplier as string) ?? a.supplier?.name ?? '',
    model: a.model ?? a.name ?? '',
    purchase: num(a.purchasePrice),
    sale: a.salePrice != null ? num(a.salePrice) : null,
    category: (ex.category as string) ?? a.category ?? '',
    material: a.material ?? '',
    quantity: a.quantity ?? undefined,
    minQuantity: typeof ex.minQuantity === 'number' ? (ex.minQuantity as number) : undefined,
    reference: a.sku ?? undefined,
    image: (ex.image as string) ?? undefined,
    createdAt: a.createdAt,
  };
}

export const listStockItems = () => api<{ data: StockItemApi[] }>('/stock?pageSize=200');
export const createStockItemApi = (item: Partial<StockItem>) =>
  api<StockItemApi>('/stock', { method: 'POST', body: JSON.stringify(stockItemToPayload(item)) });
export const updateStockItemApi = (id: string, item: Partial<StockItem>) =>
  api<StockItemApi>(`/stock/${id}`, { method: 'PUT', body: JSON.stringify(stockItemToPayload(item)) });
export const deleteStockItemApi = (id: string) =>
  api<void>(`/stock/${id}`, { method: 'DELETE' });

/** Vrai si l'id provient du backend (cuid) et non du store local ('st...'). */
export const isBackendStockId = (id: string) => !id.startsWith('st');
