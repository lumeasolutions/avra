/**
 * Types partagés du module IA.
 * Centralisés ici pour découpler les services et le controller.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  dossierCount?: number;
  urgentCount?: number;
  invoiceCount?: number;
  pendingInvoiceCount?: number;
  signedCount?: number;
  activeDossierNames?: string;
  intervenantCount?: number;
  activeIntervenantNames?: string;
  demandeCount?: number;
  demandePendingCount?: number;
  demandeEnCoursCount?: number;
  invitationsPendingCount?: number;
}

export interface DossierAnalysisInput {
  name: string;
  client?: string;
  status?: string;
  description?: string;
  createdAt?: string;
}

export type AlertSeverity = 'error' | 'warning' | 'info' | 'clock';

export interface SuggestedAlert {
  severity: AlertSeverity;
  text: string;
  dossierId?: string;
}

export interface SuggestAlertsInput {
  dossiers: Array<{ name: string; lifecycleStatus?: string; updatedAt?: any }>;
  invoices: Array<{ id: string; status: string; amount?: any }>;
  schedule?: Array<{ title: string; startAt?: any }>;
}

/** Provider IA actif sélectionné par AIService. */
export type ActiveProvider = 'openai' | 'anthropic' | 'mock';

/** Source : env var AI_PROVIDER. */
export type ProviderHint = 'auto' | 'openai' | 'anthropic' | 'mock';

export interface AIStatus {
  provider: ActiveProvider;
  modelPremium: string;
  modelCheap: string;
  enabled: boolean;
}
