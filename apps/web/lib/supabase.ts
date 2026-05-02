/**
 * ⚠️ Déprécié — conservé temporairement pour compat imports legacy.
 *
 * Le client Supabase direct côté browser n'est plus utilisé. Toutes les
 * opérations sur les documents passent désormais par l'API backend
 * (voir `apps/web/lib/dossier-docs-api.ts`) qui utilise un client
 * service_role serveur-only + bucket privé + URLs signées.
 */
export const DOSSIER_BUCKET = 'dossier-documents';
export const supabaseConfigured = false;
export function getSupabase(): null { return null; }
