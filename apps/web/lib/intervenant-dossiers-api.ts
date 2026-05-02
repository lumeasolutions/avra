/**
 * Client API IntervenantDossiers — sync backend pour les dossiers de
 * classement et leurs items côté pro.
 */
import { api } from './api';

export type DossierStatut = 'A_CLASSER' | 'CLASSE';
export type DossierItemStatut = 'URGENT' | 'EN_COURS' | 'CLASSE';

export interface IntervenantDossierItem {
  id: string;
  dossierId: string;
  name: string;
  statut: DossierItemStatut;
  createdAt: string;
  updatedAt: string;
}

export interface IntervenantDossier {
  id: string;
  workspaceId: string;
  intervenantId: string;
  name: string;
  date: string | null;
  statut: DossierStatut;
  rajoute: boolean;
  createdAt: string;
  updatedAt: string;
  items: IntervenantDossierItem[];
}

// ─── Dossiers ───────────────────────────────────────────────────────────────

export async function listAllDossiers(): Promise<IntervenantDossier[]> {
  return api<IntervenantDossier[]>('/intervenant-dossiers');
}

export async function listDossiersByIntervenant(intervenantId: string): Promise<IntervenantDossier[]> {
  return api<IntervenantDossier[]>(`/intervenant-dossiers/by-intervenant/${encodeURIComponent(intervenantId)}`);
}

export async function createDossier(data: {
  intervenantId: string;
  name: string;
  date?: string;
  statut?: DossierStatut;
  rajoute?: boolean;
}): Promise<IntervenantDossier> {
  return api<IntervenantDossier>('/intervenant-dossiers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDossier(
  dossierId: string,
  data: { name?: string; date?: string | null; statut?: DossierStatut; rajoute?: boolean },
): Promise<IntervenantDossier> {
  return api<IntervenantDossier>(`/intervenant-dossiers/${encodeURIComponent(dossierId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function markDossierVu(dossierId: string): Promise<IntervenantDossier> {
  return api<IntervenantDossier>(`/intervenant-dossiers/${encodeURIComponent(dossierId)}/mark-vu`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function deleteDossier(dossierId: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/intervenant-dossiers/${encodeURIComponent(dossierId)}`, {
    method: 'DELETE',
  });
}

// ─── Items ──────────────────────────────────────────────────────────────────

export async function createDossierItem(
  dossierId: string,
  data: { name: string; statut?: DossierItemStatut },
): Promise<IntervenantDossierItem> {
  return api<IntervenantDossierItem>(`/intervenant-dossiers/${encodeURIComponent(dossierId)}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDossierItem(
  itemId: string,
  data: { name?: string; statut?: DossierItemStatut },
): Promise<IntervenantDossierItem> {
  return api<IntervenantDossierItem>(`/intervenant-dossiers/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDossierItem(itemId: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/intervenant-dossiers/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
}

// ─── Note manuelle / tags ──────────────────────────────────────────────────

export interface IntervenantRating {
  id: string;
  rating: number | null;
  ratingComment: string | null;
  tagsCsv: string | null;
}

export async function updateIntervenantRating(
  intervenantId: string,
  data: { rating?: number | null; ratingComment?: string | null; tagsCsv?: string | null },
): Promise<IntervenantRating> {
  return api<IntervenantRating>(`/intervenant-dossiers/intervenants/${encodeURIComponent(intervenantId)}/rating`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
