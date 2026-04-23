/**
 * Client Supabase côté navigateur.
 * Utilisé pour Supabase Storage (upload / preview / download de documents).
 *
 * Env vars requises (publics, exposées au client) :
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Optionnel :
 *  - NEXT_PUBLIC_SUPABASE_DOSSIER_BUCKET (défaut : "dossier-documents")
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const DOSSIER_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DOSSIER_BUCKET || 'dossier-documents';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  if (!url || !anon) return null;
  _client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export const supabaseConfigured = !!(url && anon);
