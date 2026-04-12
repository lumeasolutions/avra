import { useState, useRef, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UseChatOptions {
  onStreamChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export function useAIChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      setError(null);
      setLoading(true);

      const updatedMessages: ChatMessage[] = [
        ...messages,
        { role: 'user' as const, content: userMessage },
      ];
      setMessages(updatedMessages);

      abortControllerRef.current = new AbortController();

      let attempt = 0;
      let success = false;

      while (attempt <= MAX_RETRIES && !success) {
        try {
          if (attempt > 0) {
            await sleep(RETRY_DELAY_MS * attempt);
          }

          const response = await fetch('/api/ia/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: updatedMessages }),
            signal: abortControllerRef.current.signal,
          });

          // Erreurs HTTP non-retryables
          if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            // 429 ou 503 → on retry
            if ((response.status === 429 || response.status === 503 || response.status === 529) && attempt < MAX_RETRIES) {
              attempt++;
              continue;
            }
            throw new Error(`Erreur serveur ${response.status}: ${errBody || response.statusText}`);
          }

          if (!response.body) {
            throw new Error('Pas de réponse du serveur');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let aiResponse = '';
          let buffer = '';
          let streamDone = false;

          while (!streamDone) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const jsonStr = trimmed.slice(6);
              try {
                const data = JSON.parse(jsonStr);

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.content) {
                  aiResponse += data.content;
                  options.onStreamChunk?.(data.content);
                }

                if (data.done) {
                  streamDone = true;
                  break;
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }

          // Réponse vide → on ne l'ajoute pas
          if (aiResponse.trim()) {
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
          }

          options.onComplete?.();
          success = true;

        } catch (err: any) {
          // Annulation volontaire → pas d'erreur
          if (err?.name === 'AbortError') {
            setLoading(false);
            abortControllerRef.current = null;
            return;
          }

          attempt++;
          if (attempt > MAX_RETRIES) {
            const error = err instanceof Error ? err : new Error('Erreur inconnue');
            setError(error);
            options.onError?.(error);
          }
        }
      }

      setLoading(false);
      abortControllerRef.current = null;
    },
    [messages, options],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    cancel,
    clear,
  };
}
