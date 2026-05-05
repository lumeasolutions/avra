import { useState, useCallback } from 'react';

export interface UseAIImageOptions {
  onError?: (error: Error) => void;
}

/**
 * Parse une Response en JSON avec fallback gracieux si la réponse n'est
 * pas du JSON (cas typique : timeout Vercel qui renvoie "An error occurred"
 * en plain text → JSON.parse plante avec "Unexpected token A").
 */
async function parseJsonOrError(
  response: Response,
): Promise<{ imageUrl?: string; error?: string }> {
  const text = await response.text();
  try {
    return JSON.parse(text) as { imageUrl?: string; error?: string };
  } catch {
    let message = 'Le serveur n\'a pas pu générer l\'image.';
    if (response.status === 504 || response.status === 502) {
      message = 'Le rendu a pris trop de temps (timeout serveur). Réessayez ou simplifiez votre demande.';
    } else if (response.status === 413) {
      message = 'Image fournie trop volumineuse pour le serveur.';
    } else if (response.status === 429) {
      message = 'Trop de générations dans la dernière heure. Patientez un peu.';
    } else if (response.status === 401) {
      message = 'Session expirée — reconnectez-vous.';
    } else if (text.toLowerCase().includes('an error occurred')) {
      message = 'Erreur serveur (probablement timeout fal.ai). Réessayez dans 30s.';
    }
    return { error: message };
  }
}

export function useAIImage(options: UseAIImageOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const generateRender = useCallback(
    async (params: {
      facades: string;
      planTravail: string;
      style: string;
      lightingStyle: string;
      roomSize: string;
    }) => {
      try {
        setError(null);
        setLoading(true);

        const response = await fetch('/api/ia/rendu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        const data = await parseJsonOrError(response);

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          return data.imageUrl;
        }

        throw new Error('No image URL in response');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  const colorize = useCallback(
    async (params: {
      facadeHex: string;
      poigneeHex: string;
      planHex: string;
      facadeFinish: string;
      lightingStyle: string;
      handleMaterial?: string;
      countertopMaterial?: string;
    }) => {
      try {
        setError(null);
        setLoading(true);

        const response = await fetch('/api/ia/coloriste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        const data = await parseJsonOrError(response);

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          return data.imageUrl;
        }

        throw new Error('No image URL in response');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  const clear = useCallback(() => {
    setImageUrl(null);
    setError(null);
  }, []);

  return {
    imageUrl,
    loading,
    error,
    generateRender,
    colorize,
    clear,
  };
}
