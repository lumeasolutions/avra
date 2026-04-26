import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { SYSTEM_PROMPTS } from './prompts';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type AIProvider = 'claude' | 'mock';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Codes d'erreur qui méritent un retry
const RETRYABLE_STATUS = new Set([429, 500, 529]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

@Injectable()
export class QwenService {
  private readonly logger = new Logger(QwenService.name);
  private readonly apiKey: string | null;
  private readonly enabled: boolean;
  private readonly provider: AIProvider;
  private readonly model: string;

  constructor() {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey && anthropicKey.startsWith('sk-ant-')) {
      this.provider = 'claude';
      this.model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';
      this.apiKey = anthropicKey;
      this.enabled = true;
      this.logger.log(`✅ Claude AI service initialized (${this.model})`);
    } else {
      this.provider = 'mock';
      this.model = 'mock';
      this.apiKey = null;
      this.enabled = false;
      this.logger.warn('⚠️  AI service disabled (mock mode) — configure ANTHROPIC_API_KEY');
    }
  }

  private getSystemPrompt(context?: {
    dossierCount?: number;
    urgentCount?: number;
    invoiceCount?: number;
    pendingInvoiceCount?: number;
    signedCount?: number;
    activeDossierNames?: string;
    intervenantCount?: number;
    activeIntervenantNames?: string;
    demandeCount?: number;
    demandePendingCount?: number;
    demandeEnCoursCount?: number;
    invitationsPendingCount?: number;
  }): string {
    return SYSTEM_PROMPTS.ASSISTANT(context);
  }

  /**
   * Appel fetch avec retry automatique sur erreurs transitoires (429, 500, 529)
   */
  private async fetchWithRetry(url: string, options: RequestInit, attempt = 0): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10) || RETRY_DELAY_MS;
        this.logger.warn(`Claude API ${response.status} — retry ${attempt + 1}/${MAX_RETRIES} in ${retryAfter}ms`);
        await new Promise(r => setTimeout(r, retryAfter));
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === 'AbortError') {
        throw new Error('Claude API timeout (30s)');
      }
      if (attempt < MAX_RETRIES) {
        this.logger.warn(`Claude API network error — retry ${attempt + 1}/${MAX_RETRIES}: ${err.message}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw err;
    }
  }

  /**
   * Chat streaming via Anthropic Messages API (SSE)
   */
  async chatStream(
    messages: ChatMessage[],
    context?: {
      dossierCount?: number;
      urgentCount?: number;
      invoiceCount?: number;
      pendingInvoiceCount?: number;
      signedCount?: number;
      activeDossierNames?: string;
      intervenantCount?: number;
      activeIntervenantNames?: string;
      demandeCount?: number;
      demandePendingCount?: number;
      demandeEnCoursCount?: number;
      invitationsPendingCount?: number;
    },
  ): Promise<Readable> {
    if (!this.enabled || !this.apiKey) {
      return this.mockChatStream(messages);
    }

    try {
      const systemPrompt = this.getSystemPrompt(context);

      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await this.fetchWithRetry(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '');
        this.logger.error(`Claude API error ${response.status}: ${errText}`);
        return this.mockChatStream(messages);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const logger = this.logger;
      let sseBuffer = '';

      return new Readable({
        async read() {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
                return;
              }

              sseBuffer += decoder.decode(value, { stream: true });
              const lines = sseBuffer.split('\n');
              sseBuffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;
                const jsonStr = trimmed.slice(6);
                if (jsonStr === '[DONE]') {
                  this.push(null);
                  return;
                }
                try {
                  const event = JSON.parse(jsonStr);
                  if (event.type === 'content_block_delta' && event.delta?.text) {
                    this.push(event.delta.text);
                  }
                  if (event.type === 'message_stop') {
                    this.push(null);
                    return;
                  }
                  // Gérer les erreurs dans le stream
                  if (event.type === 'error') {
                    logger.error(`Claude stream error: ${JSON.stringify(event.error)}`);
                    this.push(null);
                    return;
                  }
                } catch {
                  // ignorer les lignes non-JSON
                }
              }
            }
          } catch (err) {
            logger.error('Stream read error:', err);
            this.push(null);
          }
        },
      });
    } catch (error) {
      this.logger.error(`Claude chat stream error:`, error);
      return this.mockChatStream(messages);
    }
  }

  /**
   * Chat simple (non-streaming) pour usage interne
   */
  async chat(
    messages: ChatMessage[],
    context?: {
      dossierCount?: number;
      urgentCount?: number;
      invoiceCount?: number;
      pendingInvoiceCount?: number;
    },
  ): Promise<string> {
    if (!this.enabled || !this.apiKey) {
      return this.mockChat(messages);
    }

    try {
      const systemPrompt = this.getSystemPrompt(context);
      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await this.fetchWithRetry(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        this.logger.error(`Claude API error ${response.status}: ${errText}`);
        return this.mockChat(messages);
      }

      const data = await response.json() as any;
      return data.content?.[0]?.text || 'Pas de réponse';
    } catch (error) {
      this.logger.error(`Claude chat error:`, error);
      return this.mockChat(messages);
    }
  }

  async analyzeDossier(dossierData: {
    name: string;
    client?: string;
    status?: string;
    description?: string;
    createdAt?: string;
  }): Promise<string> {
    const content = SYSTEM_PROMPTS.ANALYZE_DOSSIER(dossierData);
    return this.chat([{ role: 'user', content }]);
  }

  async suggestAlerts(data: {
    dossiers: Array<{ name: string; lifecycleStatus?: string; updatedAt?: any }>;
    invoices: Array<{ id: string; status: string; amount?: any }>;
    schedule?: Array<{ title: string; startAt?: any }>;
  }): Promise<Array<{ severity: 'error' | 'warning' | 'info' | 'clock'; text: string; dossierId?: string }>> {
    const content = SYSTEM_PROMPTS.SUGGEST_ALERTS(data);
    try {
      const response = await this.chat([{ role: 'user', content }]);
      return this.parseAlerts(response);
    } catch {
      return [];
    }
  }

  private parseAlerts(
    response: string,
  ): Array<{ severity: 'error' | 'warning' | 'info' | 'clock'; text: string }> {
    const alerts: Array<{ severity: 'error' | 'warning' | 'info' | 'clock'; text: string }> = [];
    const lines = response.split('\n');
    for (const line of lines) {
      const match = line.match(/\[SEVERITY:(error|warning|info|clock)\]\s*(.+)/i);
      if (match) {
        alerts.push({
          severity: match[1].toLowerCase() as 'error' | 'warning' | 'info' | 'clock',
          text: match[2].trim(),
        });
      }
    }
    return alerts;
  }

  private mockChatStream(messages: ChatMessage[]): Readable {
    const userMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
    let mockResponse = 'Je suis en mode simulation. Configurez ANTHROPIC_API_KEY pour activer le vrai mode IA.';

    if (userMsg.includes('urgent') || userMsg.includes('priorit')) {
      mockResponse = '[Mock] Vous avez 2 dossiers urgents. Je recommande de les traiter en priorité.';
    } else if (userMsg.includes('facture') || userMsg.includes('retard')) {
      mockResponse = '[Mock] 1 facture est en retard. Veuillez relancer le client.';
    } else if (userMsg.includes('bonjour') || userMsg.includes('salut')) {
      mockResponse = '[Mock] Bonjour! Je surveille vos dossiers et alertes. Comment puis-je vous aider?';
    }

    return Readable.from(
      (async function* () {
        for (const char of mockResponse) {
          yield char;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      })(),
    );
  }

  private mockChat(messages: ChatMessage[]): string {
    const userMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
    if (userMsg.includes('urgent')) return '[Mock] 2 dossiers urgents.';
    if (userMsg.includes('facture')) return '[Mock] 1 facture en retard.';
    return '[Mock] Mode simulation. Configurez ANTHROPIC_API_KEY pour le mode réel.';
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
