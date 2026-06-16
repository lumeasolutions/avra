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
  // Volet 2 (28/05/2026) : personnalite de l'assistant (Parametres → IA).
  personnalite?: 'professionnel' | 'amical' | 'concis';
  // Volet 6 (06/2026) : contexte ENRICHI — l'assistant "voit" les details
  // (et plus seulement des compteurs). Chaque champ n'est injecte que si la
  // categorie de donnees correspondante est autorisee (Parametres → IA).
  unpaidInvoicesText?: string;   // factures impayees/en retard : client + montant
  unpaidTotalEUR?: number;       // total du a recouvrer (EUR)
  upcomingEventsText?: string;   // RDV/interventions a venir (date + titre)
  stockRuptureText?: string;     // articles en rupture
  demandesWaitingText?: string;  // demandes en attente : titre + intervenant + date
  // Volet 5 (06/2026) : actions REELLES via function-calling. Indique au
  // service quels outils exposer au modele (selon les toggles Parametres → IA).
  // L'IA ne fait que PROPOSER l'action (params structures) ; l'execution reelle
  // (creation dossier/devis/facture) se fait cote frontend apres confirmation.
  enabledActions?: EnabledActions;
}

/** Toggles d'actions IA (Parametres → IA). Pilotent les outils exposes. */
export interface EnabledActions {
  dossier?: boolean;
  devis?: boolean;
  facture?: boolean;
  navigation?: boolean;
  // Volet 6 : actions productivite (RDV, demande intervenant). Suivent le
  // toggle "creer dossier" cote client (pas de reglage dedie pour l'instant).
  event?: boolean;
  demande?: boolean;
}

/** Type d'action proposee par l'assistant (function-calling). */
export type AssistantActionType =
  | 'navigate'
  | 'create_dossier'
  | 'create_devis'
  | 'create_facture'
  | 'create_event'
  | 'create_demande';

/**
 * Action structuree proposee par l'IA, envoyee au frontend qui affiche une
 * carte de confirmation puis execute la VRAIE creation (clients API existants).
 * L'IA n'execute jamais elle-meme une mutation.
 */
export interface AssistantAction {
  type: AssistantActionType;
  /** Libelle court pour le bouton/carte de confirmation. */
  label: string;
  /** Parametres extraits de la conversation (forme libre selon le type). */
  params: Record<string, unknown>;
}

/**
 * Evenement de stream chat. Le service emet soit du texte (token par token),
 * soit une action a confirmer. Le controller serialise en SSE :
 *   { type:'text' }   -> data: { content }
 *   { type:'action' } -> data: { action }
 */
export type ChatStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'action'; value: AssistantAction };

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
