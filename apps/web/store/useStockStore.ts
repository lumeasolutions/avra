/**
 * Store Stock — gestion des stocks et commandes
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Persistance backend du stock (write-through + hydratation via useDataSync).
import {
  createStockItemApi, updateStockItemApi, deleteStockItemApi,
  stockItemFromApi, isBackendStockId,
} from '@/lib/stock-api';

// Types
export interface StockItem {
  id: string;
  dot: 'green' | 'red' | 'orange';
  supplier: string;
  model: string;
  purchase: number;
  sale: number | null;
  category: string;
  material: string;
  quantity?: number;
  minQuantity?: number;
  reference?: string;
  image?: string;
  createdAt?: string;
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

// Données initiales — vides. Les vraies données viennent de l'API via useDataSync.
const INITIAL_STOCK: StockItem[] = [];
const INITIAL_COMMANDES: Commande[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

interface StockState {
  // Data
  stockItems: StockItem[];
  commandes: Commande[];

  // Stock actions
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockDot: (id: string, dot: StockItem['dot']) => void;
  updateStockItem: (id: string, data: Partial<Omit<StockItem, 'id'>>) => void;
  deleteStockItem: (id: string) => void;
  _syncStock: (id: string) => void;

  // Commandes actions
  addCommande: (cmd: Omit<Commande, 'id'>) => void;
  updateCommandeStatut: (id: string, statut: CommandeStatut) => void;
  deleteCommande: (id: string) => void;

  // Reset
  reset: () => void;
}

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      stockItems: INITIAL_STOCK,
      commandes: INITIAL_COMMANDES,

      addStockItem: (item) => {
        const localId = 'st' + uid();
        const newItem = { ...item, id: localId } as StockItem;
        set(s => ({ stockItems: [newItem, ...s.stockItems] }));
        // Write-through backend : persiste puis remplace l'id local par l'id backend.
        createStockItemApi(newItem)
          .then((a) => {
            const mapped = stockItemFromApi(a);
            set(s => ({ stockItems: s.stockItems.map(i => i.id === localId ? mapped : i) }));
          })
          .catch((e: any) => console.warn('[stock] createStockItem échec, gardé en local:', e?.message || e));
      },

      _syncStock: (id) => {
        if (!isBackendStockId(id)) return;
        const item = get().stockItems.find(i => i.id === id);
        if (item) updateStockItemApi(id, item).catch((e: any) => console.warn('[stock] updateStockItem échec:', e?.message || e));
      },

      updateStockDot: (id, dot) => {
        set(s => ({ stockItems: s.stockItems.map(i => i.id === id ? { ...i, dot } : i) }));
        get()._syncStock(id);
      },

      updateStockItem: (id, data) => {
        set(s => ({ stockItems: s.stockItems.map(i => i.id === id ? { ...i, ...data } : i) }));
        get()._syncStock(id);
      },

      deleteStockItem: (id) => {
        set(s => ({ stockItems: s.stockItems.filter(i => i.id !== id) }));
        if (isBackendStockId(id)) deleteStockItemApi(id).catch((e: any) => console.warn('[stock] deleteStockItem échec:', e?.message || e));
      },

      addCommande: (cmd) => {
        const newCmd: Commande = { ...cmd, id: 'cmd' + uid() };
        set(s => ({ commandes: [newCmd, ...s.commandes] }));
      },

      updateCommandeStatut: (id, statut) => {
        set(s => ({ commandes: s.commandes.map(c => c.id === id ? { ...c, statut } : c) }));
      },

      deleteCommande: (id) => {
        set(s => ({ commandes: s.commandes.filter(c => c.id !== id) }));
      },

      reset: () => set({
        stockItems: INITIAL_STOCK,
        commandes: INITIAL_COMMANDES,
      }),
    }),
    { name: 'avra-stock-store' }
  )
);
