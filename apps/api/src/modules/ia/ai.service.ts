import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import * as Sentry from '@sentry/node';
import { SYSTEM_PROMPTS } from './prompts';
import { getOpenAIClient, isOpenAIConfigured } from './openai-client';
import type {
  ChatMessage,
  ChatContext,
  DossierAnalysisInput,
  SuggestAlertsInput,
  SuggestedAlert,
  ActiveProvider,
  ProviderHint,
  AIStatus,
} from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const RETRYABLE_STATUS = new Set([429, 500, 529]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

/**
 * AIService — service IA unifié pour AVRA.
 *
 * Provider auto-detection :
 *   AI_PROVIDER=auto (par défaut) → si OPENAI_API_KEY → openai
 *                                  → sinon si ANTHROPIC_API_KEY → anthropic
 *                                  → sinon mock (dev/test)
 *   AI_PROVIDER=openai|anthropic|mock → force la valeur
 *
 * Modèles :
 *   OPENAI_MODEL_PREMIUM (default: gpt-4o)      → chat / analyze
 *   OPENAI_MODEL_CHEAP   (default: gpt-4o-mini) → suggest-alerts
 *   ANTHROPIC_MODEL      (default: claude-opus-4-6) → fallback Anthropic
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly provider: ActiveProvider;
  private readonly modelPremium: string;
  private readonly modelCheap: string;
  private readonly anthropicModel: string;
  private readonly anthropicKey: string | null;

  constructor() {
    const hint = (process.env.AI_PROVIDER || 'auto').toLowerCase() as ProviderHint;
    this.modelPremium = process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o';
    this.modelCheap = process.env.OPENAI_MODEL_CHEAP || 'gpt-4o-mini';
    this.anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.anthropicKey =
      anthropicKey && anthropicKey.startsWith('sk-ant-') ? anthropicKey : null;

    this.provider = this.resolveProvider(hint);

    switch (this.provider) {
      case 'openai':
        this.logger.log(
          `AI service initialized — provider=openai premium=${this.modelPremium} cheap=${this.modelCheap}`,
        );
        break;
      case 'anthropic':
        this.logger.log(
          `AI service initialized — provider=anthropic (fallback) model=${this.anthropicModel}`,
        );
        break;
      case 'mock':
        this.logger.warn(
          'AI service in MOCK mode — set OPENAI_API_KEY or ANTHROPIC_API_KEY to enable real AI',
        );
        break;
    }
  }

  private resolveProvider(hint: ProviderHint): ActiveProvider {
    if (hint === 'mock') return 'mock';
    if (hint === 'openai') {
      return isOpenAIConfigured() ? 'openai' : 'mock';
    }
    if (hint === 'anthropic') {
      return this.anthropicKey ? 'anthropic' : 'mock';
    }
    // auto
    if (isOpenAIConfigured()) return 'openai';
    if (this.anthropicKey) return 'anthropic';
    return 'mock';
  }

  isEnabled(): boolean {
    return this.provider !== 'mock';
  }

  getStatus(): AIStatus {
    return {
      provider: this.provider,
      modelPremium: this.modelPremium,
      modelCheap: this.modelCheap,
      enabled: this.isEnabled(),
    };
  }

  private getSystemPrompt(context?: ChatContext): string {
    return SYSTEM_PROMPTS.ASSISTANT(context);
  }

  // ─────────────────────────────────────────────────────────────────
  //                     CHAT STREAMING (SSE)
  // ─────────────────────────────────────────────────────────────────

  async chatStream(
    messages: ChatMessage[],
    context?: ChatContext,
  ): Promise<Readable> {
    if (this.provider === 'mock') {
      return this.mockChatStream(messages);
    }
    if (this.provider === 'openai') {
      return this.openaiChatStream(messages, context);
    }
    return this.anthropicChatStream(messages, context);
  }

  private async openaiChatStream(
    messages: ChatMessage[],
    context?: ChatContext,
  ): Promise<Readable> {
    const client = getOpenAIClient();
    if (!client) return this.mockChatStream(messages);
    try {
      const systemPrompt = this.getSystemPrompt(context);
      const apiMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
      ];

      const stream = await client.chat.completions.create({
        model: this.modelPremium,
        messages: apiMessages,
        max_tokens: 2048,
        stream: true,
      });

      const logger = this.logger;
      return Readable.from(
        (async function* () {
          try {
            for await (const event of stream) {
              const delta = event.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            }
          } catch (err) {
            logger.error('OpenAI stream error:', err);
          }
        })(),
      );
    } catch (error) {
      this.logger.error('OpenAI chat stream error:', error);
      // Fallback Anthropic si dispo, sinon mock
      if (this.anthropicKey) {
        this.logger.warn('Falling back to Anthropic for chatStream');
        return this.anthropicChatStream(messages, context);
      }
      return this.mockChatStream(messages);
    }
  }

  private async anthropicChatStream(
    messages: ChatMessage[],
    context?: ChatContext,
  ): Promise<Readable> {
    if (!this.anthropicKey) return this.mockChatStream(messages);
    try {
      const systemPrompt = this.getSystemPrompt(context);
      const apiMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await this.fetchWithRetry(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.anthropicModel,
          max_tokens: 2048,
          system: systemPrompt,
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '');
        this.logger.error(`Anthropic API error ${response.status}: ${errText}`);
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
                  if (event.type === 'error') {
                    logger.error(`Anthropic stream error: ${JSON.stringify(event.error)}`);
                    this.push(null);
                    return;
                  }
                } catch {
                  // ligne non-JSON → ignorer
                }
              }
            }
          } catch (err) {
            logger.error('Anthropic stream read error:', err);
            this.push(null);
          }
        },
      });
    } catch (error) {
      this.logger.error('Anthropic chat stream error:', error);
      return this.mockChatStream(messages);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //                     CHAT NON-STREAMING
  // ─────────────────────────────────────────────────────────────────

  async chat(messages: ChatMessage[], context?: ChatContext): Promise<string> {
    if (this.provider === 'mock') return this.mockChat(messages);
    if (this.provider === 'openai') {
      return this.openaiChat(messages, context, this.modelPremium);
    }
    return this.anthropicChat(messages, context);
  }

  private async openaiChat(
    messages: ChatMessage[],
    context: ChatContext | undefined,
    model: string,
  ): Promise<string> {
    const client = getOpenAIClient();
    if (!client) return this.mockChat(messages);
    try {
      const systemPrompt = this.getSystemPrompt(context);
      const apiMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
      ];
      const response = await client.chat.completions.create({
        model,
        messages: apiMessages,
        max_tokens: 2048,
      });
      this.logUsage('openai.chat', model, response.usage);
      return response.choices?.[0]?.message?.content || 'Pas de réponse';
    } catch (error) {
      this.logger.error('OpenAI chat error:', error);
      if (this.anthropicKey) {
        this.logger.warn('Falling back to Anthropic for chat');
        return this.anthropicChat(messages, context);
      }
      return this.mockChat(messages);
    }
  }

  private async anthropicChat(
    messages: ChatMessage[],
    context?: ChatContext,
  ): Promise<string> {
    if (!this.anthropicKey) return this.mockChat(messages);
    try {
      const systemPrompt = this.getSystemPrompt(context);
      const apiMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await this.fetchWithRetry(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.anthropicModel,
          max_tokens: 2048,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        this.logger.error(`Anthropic API error ${response.status}: ${errText}`);
        return this.mockChat(messages);
      }
      const data = (await response.json()) as any;
      return data.content?.[0]?.text || 'Pas de réponse';
    } catch (error) {
      this.logger.error('Anthropic chat error:', error);
      return this.mockChat(messages);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //                     ANALYZE / SUGGEST ALERTS
  // ─────────────────────────────────────────────────────────────────

  async analyzeDossier(dossierData: DossierAnalysisInput): Promise<string> {
    const content = SYSTEM_PROMPTS.ANALYZE_DOSSIER(dossierData);
    return this.chat([{ role: 'user', content }]);
  }

  async suggestAlerts(data: SuggestAlertsInput): Promise<SuggestedAlert[]> {
    const content = SYSTEM_PROMPTS.SUGGEST_ALERTS(data);
    try {
      // suggest-alerts utilise le modèle cheap (gpt-4o-mini) — 16x moins cher
      const response =
        this.provider === 'openai'
          ? await this.openaiChat([{ role: 'user', content }], undefined, this.modelCheap)
          : await this.chat([{ role: 'user', content }]);
      return this.parseAlerts(response);
    } catch {
      return [];
    }
  }

  private parseAlerts(response: string): SuggestedAlert[] {
    const alerts: SuggestedAlert[] = [];
    const lines = response.split('\n');
    for (const line of lines) {
      const match = line.match(/\[SEVERITY:(error|warning|info|clock)\]\s*(.+)/i);
      if (match) {
        alerts.push({
          severity: match[1].toLowerCase() as SuggestedAlert['severity'],
          text: match[2].trim(),
        });
      }
    }
    return alerts;
  }

  // ─────────────────────────────────────────────────────────────────
  //                          MOCK MODE
  // ─────────────────────────────────────────────────────────────────

  private mockChatStream(messages: ChatMessage[]): Readable {
    const userMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
    let mockResponse =
      "Je suis en mode simulation. Configurez OPENAI_API_KEY (ou ANTHROPIC_API_KEY) pour activer le vrai mode IA.";
    if (userMsg.includes('urgent') || userMsg.includes('priorit')) {
      mockResponse = '[Mock] Vous avez 2 dossiers urgents. Je recommande de les traiter en priorité.';
    } else if (userMsg.includes('facture') || userMsg.includes('retard')) {
      mockResponse = '[Mock] 1 facture est en retard. Veuillez relancer le client.';
    } else if (userMsg.includes('bonjour') || userMsg.includes('salut')) {
      mockResponse = '[Mock] Bonjour ! Je surveille vos dossiers et alertes. Comment puis-je vous aider ?';
    }
    return Readable.from(
      (async function* () {
        for (const char of mockResponse) {
          yield char;
          await new Promise((r) => setTimeout(r, 20));
        }
      })(),
    );
  }

  private mockChat(messages: ChatMessage[]): string {
    const userMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
    if (userMsg.includes('urgent')) return '[Mock] 2 dossiers urgents.';
    if (userMsg.includes('facture')) return '[Mock] 1 facture en retard.';
    return '[Mock] Mode simulation. Configurez OPENAI_API_KEY pour le mode réel.';
  }

  // ─────────────────────────────────────────────────────────────────
  //                          MONITORING
  // ─────────────────────────────────────────────────────────────────

  /**
   * Log les tokens consommés et coût estimé.
   * Pousse aussi un breadcrumb Sentry pour debug en prod (-> traces).
   */
  private logUsage(
    op: string,
    model: string,
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null,
  ): void {
    if (!usage) return;
    const inTokens = usage.prompt_tokens ?? 0;
    const outTokens = usage.completion_tokens ?? 0;
    // Tarification approximative gpt-4o (USD per 1M tokens) — pour un ordre de grandeur
    const cost =
      model.includes('mini')
        ? (inTokens * 0.15 + outTokens * 0.6) / 1_000_000
        : (inTokens * 2.5 + outTokens * 10) / 1_000_000;
    this.logger.log(
      `[${op}] model=${model} tokens=${inTokens}/${outTokens} ~$${cost.toFixed(5)}`,
    );
    try {
      Sentry.addBreadcrumb({
        category: 'ai',
        type: 'info',
        level: 'info',
        message: op,
        data: {
          model,
          input_tokens: inTokens,
          output_tokens: outTokens,
          estimated_cost_usd: Number(cost.toFixed(6)),
        },
      });
    } catch {
      // Sentry non initialisé en dev → silencieux
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //                          UTIL : RETRY
  // ─────────────────────────────────────────────────────────────────

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 0,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        const retryAfter =
          parseInt(response.headers.get('retry-after') || '0', 10) || RETRY_DELAY_MS;
        this.logger.warn(
          `Anthropic API ${response.status} — retry ${attempt + 1}/${MAX_RETRIES} in ${retryAfter}ms`,
        );
        await new Promise((r) => setTimeout(r, retryAfter));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      return response;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === 'AbortError') {
        throw new Error('AI API timeout (30s)');
      }
      if (attempt < MAX_RETRIES) {
        this.logger.warn(
          `AI API network error — retry ${attempt + 1}/${MAX_RETRIES}: ${err.message}`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw err;
    }
  }
}
