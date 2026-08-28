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

/** Upload d'un fichier dans un sous-dossier (multipart) — chemin LEGACY.
 *  Va passer par Vercel → Supabase. Pour les uploads rapides, préférer
 *  `uploadDossierDocDirect()` qui upload directement vers Supabase Storage.
 */
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

interface InitUploadResponse {
  uploadUrl: string;
  token: string;
  storagePath: string;
  bucket: string;
  expiresInSeconds: number;
}

/**
 * Upload DIRECT vers Supabase Storage (rapide, pas de double-hop).
 *
 * Flow en 3 étapes :
 *  1. POST /init-upload  → backend valide + génère signed URL
 *  2. PUT  signedUrl     → browser upload directement vers Supabase
 *  3. POST /finalize-upload → backend crée l'enregistrement DB
 *
 * Avantages :
 *  - 2-3× plus rapide qu'un upload multipart classique
 *  - Décharge la Vercel Function (pas de bande passante consommée)
 *  - Qualité 100% préservée (aucune compression)
 *  - Progress bar native via XMLHttpRequest
 *
 * @param onProgress fraction 0..1 mise à jour pendant l'upload
 */
export async function uploadDossierDocDirect(
  dossierId: string,
  subfolderLabel: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<DossierDocDto> {
  // 1) init-upload
  const init = await api<InitUploadResponse>(
    `/dossiers/${encodeURIComponent(dossierId)}/documents/init-upload`,
    {
      method: 'POST',
      body: JSON.stringify({
        subfolderLabel,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      }),
    },
  );

  // 2) PUT direct vers Supabase via XHR (pour avoir le progress)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', init.uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload Supabase échoué : HTTP ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error('Erreur réseau pendant l\'upload Supabase'));
    xhr.onabort = () => reject(new Error('Upload annulé'));
    xhr.send(file);
  });

  // 3) finalize-upload → DB record
  return api<DossierDocDto>(
    `/dossiers/${encodeURIComponent(dossierId)}/documents/finalize-upload`,
    {
      method: 'POST',
      body: JSON.stringify({
        storagePath: init.storagePath,
        subfolderLabel,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      }),
    },
  );
}

/** Liste tous les documents d'un dossier (tous sous-dossiers confondus). */
export async function listDossierDocs(dossierId: string): Promise<DossierDocDto[]> {
  return api<DossierDocDto[]>(`/dossiers/${encodeURIComponent(dossierId)}/documents`);
}

/** Récupère une URL signée fraîche pour un document (expire en 60 min).
 *  Réessaie automatiquement (3 tentatives, backoff) : la génération de l'URL
 *  signée peut échouer ponctuellement (réseau, storage froid juste après un
 *  upload) → fiabilise l'affichage des aperçus PDF/images. */
export async function getDocSignedUrl(
  dossierId: string,
  docId: string,
): Promise<{ signedUrl: string; expiresIn: number }> {
  const path = `/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docId)}/signed-url`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await api<{ signedUrl: string; expiresIn: number }>(path);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 300 + attempt * 500));
    }
  }
  throw lastErr;
}

/** Supprime un document (DB + storage). */
export async function deleteDossierDoc(dossierId: string, docId: string): Promise<void> {
  await api(`/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  });
}

/**
 * Renomme un sous-dossier côté backend : met à jour le subfolderLabel de tous
 * les documents concernés (exact + imbriqués). À appeler AVANT (ou avec) la
 * mise à jour locale, sinon les documents réapparaissent sous l'ancien nom.
 */
export async function renameDossierSubfolder(
  dossierId: string,
  oldLabel: string,
  newLabel: string,
): Promise<void> {
  await api(`/dossiers/${encodeURIComponent(dossierId)}/documents/rename-subfolder`, {
    method: 'PATCH',
    body: JSON.stringify({ oldLabel, newLabel }),
  });
}
