/**
 * Wrapper Supabase Storage côté Next.js serverless.
 *
 * ⚠️ Utilise la `SUPABASE_SERVICE_ROLE_KEY` → jamais exposée au client.
 * Toutes les opérations sont effectuées dans des routes API (server-side only).
 *
 * Le bucket `ia-renders` héberge les rendus permanents copiés depuis fal-cdn
 * (qui purge ses URLs après quelques jours). On accède aux images via des
 * URLs **signées** (valable 30 jours par défaut) pour ne pas exposer les
 * rendus à n'importe qui ayant l'URL.
 *
 * Pendant longtemps tout le storage AVRA passait par `apps/api/src/modules/
 * dossier-documents/supabase-storage.service.ts` (NestJS). Pour les routes
 * serverless Vercel (`apps/web/app/api/ia/...`), on n'a pas le DI NestJS,
 * d'où ce wrapper functional jumeau.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Bucket dédié aux rendus IA. Configurable via env pour pouvoir basculer
// rapidement vers un autre bucket (ex: staging) sans toucher au code.
const IA_RENDERS_BUCKET = process.env.SUPABASE_IA_RENDERS_BUCKET || 'ia-renders';

// URL signée valable 30 jours par défaut. Quand elle expire, le code appelant
// peut régénérer une nouvelle URL signée à partir du `path` stocké en DB.
const DEFAULT_SIGNED_URL_TTL_SECONDS = 30 * 24 * 60 * 60;

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase Storage non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants)',
    );
  }
  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/**
 * Upload un buffer binaire dans le bucket `ia-renders`.
 *
 * @param path     Chemin dans le bucket (ex: "<workspaceId>/<jobId>/0.jpg")
 * @param buffer   Contenu du fichier
 * @param mimeType Content-Type (ex: "image/jpeg")
 */
export async function uploadToIaRenders(
  path: string,
  buffer: Buffer,
  mimeType: string = 'image/jpeg',
): Promise<void> {
  const { error } = await getClient()
    .storage.from(IA_RENDERS_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) {
    throw new Error(`Supabase upload "${path}" échoué: ${error.message}`);
  }
}

/**
 * Génère une URL signée pour accéder à un fichier du bucket `ia-renders`.
 * L'URL expire après `expiresIn` secondes (par défaut 30 jours).
 */
export async function createIaRendersSignedUrl(
  path: string,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await getClient()
    .storage.from(IA_RENDERS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) {
    throw new Error(`Supabase signedUrl "${path}" échoué: ${error?.message ?? 'no data'}`);
  }
  return data.signedUrl;
}

/**
 * Copie une image depuis une URL externe (typiquement fal-cdn) vers le bucket
 * `ia-renders` et renvoie une URL signée 30 jours.
 *
 * @param sourceUrl   URL https publique source (ex: https://v3.fal.media/...)
 * @param targetPath  Chemin de destination dans le bucket (ex: "<workspaceId>/<jobId>/0.jpg")
 * @returns           { path, signedUrl } — path à stocker en DB, signedUrl à retourner au client
 */
export async function copyExternalImageToIaRenders(
  sourceUrl: string,
  targetPath: string,
): Promise<{ path: string; signedUrl: string }> {
  // 1) Télécharger l'image source
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Téléchargement source ${res.status}: ${sourceUrl}`);
  }
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2) Uploader vers Supabase
  await uploadToIaRenders(targetPath, buffer, contentType);

  // 3) Générer l'URL signée 30 jours
  const signedUrl = await createIaRendersSignedUrl(targetPath);

  return { path: targetPath, signedUrl };
}

/**
 * Construit un path standardisé pour stocker un rendu IA.
 * Format: `<workspaceId>/<jobId>/<index>.<ext>`
 */
export function buildIaRenderPath(
  workspaceId: string,
  jobId: string,
  index: number,
  ext: string = 'jpg',
): string {
  return `${workspaceId}/${jobId}/${index}.${ext}`;
}
