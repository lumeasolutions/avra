import OpenAI from 'openai';

/**
 * Singleton du client OpenAI.
 * Lazy : ne créé l'instance qu'au premier appel pour ne pas exploser au boot
 * si la clé n'est pas encore posée (mode fallback Anthropic possible).
 */
let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return null;
  }
  _client = new OpenAI({
    apiKey,
    timeout: 60_000, // 60s pour gérer les longs streams
    maxRetries: 2,   // SDK gère ses propres retries (429/500)
  });
  return _client;
}

/** Vérifie la disponibilité de la clé OpenAI sans créer le client. */
export function isOpenAIConfigured(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return Boolean(apiKey && apiKey.startsWith('sk-'));
}

/** Reset (utile pour les tests). */
export function resetOpenAIClient(): void {
  _client = null;
}
