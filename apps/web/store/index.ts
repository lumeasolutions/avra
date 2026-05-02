/**
 * Store Index — réexporte tous les stores Zustand
 *
 * Utilisation:
 * import { useDossierStore, useFacturationStore } from '@/store';
 *
 * const dossiers = useDossierStore(state => state.dossiers);
 * const invoices = useFacturationStore(state => state.invoices);
 */

export { useDossierStore } from './useDossierStore';
export type {
  DossierStatus,
  SubFolder,
  Dossier,
  CommandeType,
  ConfirmationFournisseur,
  DossierSigne,
  DossierPerdu,
} from './useDossierStore';

export { useFacturationStore } from './useFacturationStore';
export type {
  InvoiceStatus,
  PaymentStatus,
  DevisStatus,
  FactureDetailType,
  LigneDocument,
  Invoice,
  InvoiceDetail,
  Payment,
  Devis,
  Apporteur,
} from './useFacturationStore';

export { usePlanningStore } from './usePlanningStore';
export type {
  PlanningEvent,
  GestEvent,
} from './usePlanningStore';

export { useStockStore } from './useStockStore';
export type {
  StockItem,
  CommandeStatut,
  Commande,
} from './useStockStore';

export { useIntervenantStore } from './useIntervenantStore';
export type {
  Intervenant,
} from './useIntervenantStore';

export { useUIStore } from './useUIStore';
export type {
  AlertSeverity,
  AlertItem,
} from './useUIStore';

export { useConfigStore } from './useConfigStore';
export type {
  PreferencesConfig,
  NumerotationConfig,
  FacturationConfig,
  NotifConfig,
  Societe,
  RelanceConfig,
  UserMember,
} from './useConfigStore';

export { useHistoryStore } from './useHistoryStore';
export type {
  HistoryLog,
  Relance,
} from './useHistoryStore';

export { useAuthStore } from './useAuthStore';

// Re-export all store hooks for convenience
export * from './useDossierStore';
export * from './useFacturationStore';
export * from './usePlanningStore';
export * from './useStockStore';
export * from './useIntervenantStore';
export * from './useUIStore';
export * from './useConfigStore';
export * from './useHistoryStore';
export * from './useAuthStore';
export * from './useAssistantStore';
