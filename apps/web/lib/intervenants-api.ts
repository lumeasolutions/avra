/**
 * Client API intervenants — création/suppression côté backend.
 *
 * Ces helpers reflètent les endpoints Nest (apps/api/src/modules/intervenants/
 * intervenants.controller.ts) :
 *   POST   /intervenants
 *   DELETE /intervenants/:id
 *
 * Le backend stocke firstName / lastName / companyName ; le store local n'a
 * qu'un champ unique `name`. La conversion est faite ici : on tente de
 * privilégier `companyName`, sinon on découpe `name` en first/last basique.
 */
import { api } from '@/lib/api';

export interface IntervenantApiPayload {
  type: string;
  /** Champ unique côté front — sera mappé en lastName/firstName ou companyName. */
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  /** Mode "société" : si true, `name` part dans companyName ; sinon split. */
  asCompany?: boolean;
}

export interface IntervenantApiResponse {
  id: string;
  type: string;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  rating?: number | null;
  ratingComment?: string | null;
  tagsCsv?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function splitName(full: string): { firstName?: string; lastName?: string } {
  const trimmed = full.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { lastName: parts[0] };
  // Heuristique simple : premier token = lastName (cohérent avec syncIntervenants
  // qui formate `${lastName} ${firstName}`), reste = firstName.
  return { lastName: parts[0], firstName: parts.slice(1).join(' ') };
}

export async function createIntervenant(payload: IntervenantApiPayload): Promise<IntervenantApiResponse> {
  const body: Record<string, unknown> = {
    type: payload.type,
  };
  if (payload.asCompany) {
    body.companyName = payload.name.trim();
  } else {
    const split = splitName(payload.name);
    if (split.firstName) body.firstName = split.firstName;
    if (split.lastName) body.lastName = split.lastName;
    // Si on n'a rien pu splitter, fallback sur companyName pour ne pas perdre l'info.
    if (!split.firstName && !split.lastName) body.companyName = payload.name.trim();
  }
  if (payload.email) body.email = payload.email;
  if (payload.phone) body.phone = payload.phone;
  if (payload.notes) body.notes = payload.notes;

  return api<IntervenantApiResponse>('/intervenants', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteIntervenant(id: string): Promise<void> {
  await api(`/intervenants/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
