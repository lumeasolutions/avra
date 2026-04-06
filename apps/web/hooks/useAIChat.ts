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

export function useAIChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      try {
        setError(null);
        setLoading(true);

        // Ajouter le message utilisateur
        const updatedMessages = [
          ...messages,
          { role: 'user' as const, content: userMessage },
        ];
        setMessages(updatedMessages);

        // Créer un contrôleur d'annulation
        abortControllerRef.current = new AbortController();

        // Appeler l'API
        const response = await fetch('/api/ia/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.body) {
          throw new Error('No response body from server');
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
          buffer = lines.pop() || ''; // Keep incomplete last line in buffer

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
              if (e instanceof SyntaxError) continue; // Ignore malformed JSON
              throw e; // Re-throw real errors (like data.error)
            }
          }
        }

        // Ajouter la réponse complète
        setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
        options.onComplete?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options.onError?.(error);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
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
