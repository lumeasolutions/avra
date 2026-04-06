import { useState, useCallback } from 'react';

export interface UseAIImageOptions {
  onError?: (error: Error) => void;
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

        const data = (await response.json()) as { imageUrl?: string; error?: string };

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

        const data = (await response.json()) as { imageUrl?: string; error?: string };

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
