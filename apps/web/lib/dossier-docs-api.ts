/**
 * Client API pour les documents de sous-dossiers.
 *
 * Tous les appels passent par le backend NestJS qui :
 *   - valide l'ownership workspace (JwtAuthGuard + assertProjectInWorkspace)
 *   - applique une whitelist MIME + limite de taille
 *   - signe les URLs (bucket privé, expiration 1 h)
 *   - conserve les métadonnées en DB (table DossierDocument)
 *
 * Aucun secret Supabase n'est jamais exposé côté browser.
 */
import { api, apiUpload } from './api';

export interface DossierDocDto {
  id: string;
  subfolderLabel: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

/** Upload d'un fichier dans un sous-dossier (multipart). */
export async function uploadDossierDoc(
  dossierId: string,
  subfolderLabel: string,
  file: File,
): Promise<DossierDocDto> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('subfolderLabel', subfolderLabel);
  return apiUpload<DossierDocDto>(`/dossiers/${encodeURIComponent(dossierId)}/documents`, fd);
}

/** Liste tous les documents d'un dossier (tous sous-dossiers confondus). */
export async function listDossierDocs(dossierId: string): Promise<DossierDocDto[]> {
  return api<DossierDocDto[]>(`/dossiers/${encodeURIComponent(dossierId)}/documents`);
}

/** Récupère une URL signée fraîche pour un document (expire en 60 min). */
export async function getDocSignedUrl(
  dossierId: string,
  docId: string,
): Promise<{ signedUrl: string; expiresIn: number }> {
  return api(`/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docId)}/signed-url`);
}

/** Supprime un document (DB + storage). */
export async function deleteDossierDoc(dossierId: string, docId: string): Promise<void> {
  await api(`/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  });
}
