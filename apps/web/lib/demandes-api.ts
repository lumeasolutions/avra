/**
 * Client API — Demandes & Invitations Intervenants.
 *
 * Tous les appels passent par le helper api() qui gere :
 * - cookies httpOnly (credentials: 'include')
 * - CSRF token auto sur mutations
 * - retry sur 401 via refresh token
 *
 * Aucune logique metier ici : juste des wrappers fetch typed.
 */
import { api } from './api';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DemandeType =
  | 'POSE' | 'LIVRAISON' | 'SAV' | 'MESURE' | 'DEVIS'
  | 'CONFIRMATION_COMMANDE' | 'COMPLEMENT' | 'AUTRE';

export type DemandeStatus =
  | 'ENVOYEE' | 'VUE' | 'ACCEPTEE' | 'REFUSEE'
  | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export type InvitationStatus =
  | 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED' | 'REVOKED';

export interface DemandeAuthor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface DemandeIntervenant {
  id: string;
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export interface DemandeProject {
  id: string;
  name: string;
  reference: string | null;
}

export interface DemandeMessage {
  id: string;
  demandeId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export interface DemandeAttachment {
  id: string;
  demandeId: string;
  dossierDocumentId: string | null;
  documentId: string | null;
  displayName: string;
  mimeType: string | null;
  uploadedByRole: string;
  uploadedById: string;
  createdAt: string;
}

export interface DemandeStatusEvent {
  id: string;
  demandeId: string;
  fromStatus: DemandeStatus | null;
  toStatus: DemandeStatus;
  triggeredById: string;
  triggeredByRole: string;
  comment: string | null;
  createdAt: string;
}

export interface Demande {
  id: string;
  workspaceId: string;
  intervenantId: string | null;
  projectId: string | null;
  eventId: string | null;
  type: DemandeType;
  status: DemandeStatus;
  title: string;
  notes: string | null;
  scheduledFor: string | null;
  responseMessage: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  refusedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: DemandeAuthor;
  intervenant?: DemandeIntervenant;
  project?: DemandeProject;
  messages?: DemandeMessage[];
  attachments?: DemandeAttachment[];
  statusEvents?: DemandeStatusEvent[];
}

export interface DemandesPage {
  data: Demande[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DemandeStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  pendingCount?: number;
  actionRequiredCount?: number;
  unreadCount?: number;
}

export interface IntervenantInvitation {
  id: string;
  intervenantId: string;
  workspaceId: string;
  token: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  refusedAt: string | null;
  revokedAt: string | null;
  acceptedByUserId: string | null;
  message: string | null;
  createdById: string;
  createdAt: string;
  intervenant?: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    type: string;
  };
}

export interface InvitationPreview {
  id: string;
  email: string;
  message: string | null;
  expiresAt: string;
  intervenant: {
    id: string;
    type: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  workspace: {
    id: string;
    name: string;
  };
  createdBy: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

// ─── Cote PRO ───────────────────────────────────────────────────────────────

export async function listDemandesPro(filters: {
  status?: DemandeStatus; type?: DemandeType;
  intervenantId?: string; projectId?: string;
  page?: number; pageSize?: number;
} = {}): Promise<DemandesPage> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.intervenantId) params.set('intervenantId', filters.intervenantId);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();
  return api<DemandesPage>(`/demandes${qs ? `?${qs}` : ''}`);
}

export async function statsDemandesPro(): Promise<DemandeStats> {
  return api<DemandeStats>('/demandes/stats');
}

export async function getDemandePro(id: string): Promise<Demande> {
  return api<Demande>(`/demandes/${encodeURIComponent(id)}`);
}

export async function createDemande(data: {
  intervenantId: string;
  type: DemandeType;
  title: string;
  notes?: string;
  projectId?: string;
  eventId?: string;
  scheduledFor?: string;
  attachments?: Array<{ dossierDocumentId?: string; documentId?: string; displayName: string; mimeType?: string }>;
}): Promise<Demande> {
  return api<Demande>('/demandes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDemandeStatusPro(
  id: string,
  status: DemandeStatus,
  comment?: string,
): Promise<Demande> {
  return api<Demande>(`/demandes/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}

export async function postMessagePro(id: string, body: string): Promise<DemandeMessage> {
  return api<DemandeMessage>(`/demandes/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

// ─── Cote PRO — Invitations ─────────────────────────────────────────────────

export async function listInvitations(): Promise<IntervenantInvitation[]> {
  return api<IntervenantInvitation[]>('/demandes/invitations/all');
}

export async function createInvitation(data: {
  intervenantId: string;
  email?: string;
  expiresInDays?: number;
  message?: string;
}): Promise<IntervenantInvitation> {
  return api<IntervenantInvitation>('/demandes/invitations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function revokeInvitation(invitationId: string): Promise<IntervenantInvitation> {
  return api<IntervenantInvitation>(
    `/demandes/invitations/${encodeURIComponent(invitationId)}`,
    { method: 'DELETE' },
  );
}

// ─── Cote INTERVENANT ───────────────────────────────────────────────────────

export async function listMyDemandes(filters: {
  status?: DemandeStatus;
  page?: number; pageSize?: number;
} = {}): Promise<DemandesPage> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();
  return api<DemandesPage>(`/intervenant-portal/demandes${qs ? `?${qs}` : ''}`);
}

export async function statsMyDemandes(): Promise<DemandeStats> {
  return api<DemandeStats>('/intervenant-portal/demandes/stats');
}

export async function getMyDemande(id: string): Promise<Demande> {
  return api<Demande>(`/intervenant-portal/demandes/${encodeURIComponent(id)}`);
}

export async function markDemandeViewed(id: string): Promise<Demande> {
  return api<Demande>(`/intervenant-portal/demandes/${encodeURIComponent(id)}/view`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function updateMyDemandeStatus(
  id: string,
  status: DemandeStatus,
  comment?: string,
): Promise<Demande> {
  return api<Demande>(`/intervenant-portal/demandes/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}

export async function postMessageIntervenant(id: string, body: string): Promise<DemandeMessage> {
  return api<DemandeMessage>(`/intervenant-portal/demandes/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

// ─── Invitations (page acceptation) ─────────────────────────────────────────

export async function getInvitationByToken(token: string): Promise<InvitationPreview> {
  return api<InvitationPreview>(`/invitations/intervenant/${encodeURIComponent(token)}`);
}

export async function acceptInvitation(token: string): Promise<{ id: string; status: InvitationStatus }> {
  return api(`/invitations/intervenant/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function refuseInvitation(token: string): Promise<{ id: string; status: InvitationStatus }> {
  return api(`/invitations/intervenant/${encodeURIComponent(token)}/refuse`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ─── Helpers UI ─────────────────────────────────────────────────────────────

export const DEMANDE_TYPE_LABELS: Record<DemandeType, string> = {
  POSE: 'Pose',
  LIVRAISON: 'Livraison',
  SAV: 'SAV',
  MESURE: 'Prise de mesure',
  DEVIS: 'Demande de devis',
  CONFIRMATION_COMMANDE: 'Confirmation de commande',
  COMPLEMENT: 'Complément',
  AUTRE: 'Autre',
};

export const DEMANDE_STATUS_LABELS: Record<DemandeStatus, string> = {
  ENVOYEE: 'Envoyée',
  VUE: 'Vue',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

/** Couleurs par status pour badges. */
export const DEMANDE_STATUS_COLORS: Record<DemandeStatus, { bg: string; fg: string; ring: string }> = {
  ENVOYEE:  { bg: '#fff7ed', fg: '#c2410c', ring: '#fed7aa' },
  VUE:      { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
  ACCEPTEE: { bg: '#f0fdf4', fg: '#15803d', ring: '#bbf7d0' },
  REFUSEE:  { bg: '#fef2f2', fg: '#b91c1c', ring: '#fecaca' },
  EN_COURS: { bg: '#fff8ef', fg: '#7c4f1d', ring: '#fde7c2' },
  TERMINEE: { bg: '#ecfeff', fg: '#155e75', ring: '#a5f3fc' },
  ANNULEE:  { bg: '#f5eee8', fg: '#525252', ring: '#d4d4d4' },
};
