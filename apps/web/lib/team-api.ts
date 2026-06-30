/**
 * team-api.ts — Client HTTP pour la gestion d'équipe (membres + invitations).
 * Branche l'UI Paramètres « Équipe & Accès » sur le backend NestJS existant
 * (module team) au lieu du store localStorage.
 */
import { api } from './api';

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TeamMember {
  userWorkspaceId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: TeamRole;
  status: 'ACTIVE' | 'SUSPENDED' | string;
  isOwner: boolean;
  isYou: boolean;
  lastLoginAt?: string | null;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'MEMBER' | 'ADMIN' | string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  message: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface TeamSeats {
  includedSeats: number;
  usedSeats: number;
  projectedSeats: number;
  activeMembers: number;
  pendingInvitations: number;
  remainingIncludedSeats: number;
  extraSeats: number;
  overageMonthlyEUR: number;
}

export interface TeamOverview {
  workspaceName: string;
  seats: TeamSeats;
  members: TeamMember[];
  invitations: TeamInvitation[];
}

export const getTeamOverview = () => api<TeamOverview>('/team/overview');

export const inviteMember = (body: {
  email: string;
  role?: 'MEMBER' | 'ADMIN';
  firstName?: string;
  lastName?: string;
  message?: string;
}) => api<unknown>('/team/invitations', { method: 'POST', body: JSON.stringify(body) });

export const revokeInvitation = (id: string) =>
  api<unknown>(`/team/invitations/${id}`, { method: 'DELETE' });

export const resendInvitation = (id: string) =>
  api<unknown>(`/team/invitations/${id}/resend`, { method: 'POST' });

export const updateTeamMember = (
  userId: string,
  body: { role?: 'MEMBER' | 'ADMIN'; status?: 'ACTIVE' | 'SUSPENDED' },
) => api<unknown>(`/team/members/${userId}`, { method: 'PATCH', body: JSON.stringify(body) });

export const removeTeamMember = (userId: string) =>
  api<unknown>(`/team/members/${userId}`, { method: 'DELETE' });

/** Nom affichable d'un membre/invitation (prénom+nom, sinon email). */
export const teamDisplayName = (m: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) => [m.firstName, m.lastName].filter(Boolean).join(' ').trim() || m.email;
