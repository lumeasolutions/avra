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
  AssistantAction,
  EnabledActions,
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

      // Volet 5 : outils de function-calling exposes selon les toggles IA.
      // Si aucun n'est active -> tools=undefined -> chat pur (comportement
      // historique inchange).
      const tools = this.buildTools(context?.enabledActions);

      const stream = await client.chat.completions.create({
        model: this.modelPremium,
        messages: apiMessages,
        max_tokens: 2048,
        stream: true,
        // parallel_tool_calls:false -> au plus UNE action proposee a la fois
        // (le front n'affiche qu'une carte de confirmation par message).
        ...(tools ? { tools, tool_choice: 'auto' as const, parallel_tool_calls: false } : {}),
      });

      const logger = this.logger;
      const buildAction = (name: string, args: string) => this.buildAction(name, args);
      // Object-mode : on emet des evenements { type:'text'|'action', value }.
      return Readable.from(
        (async function* () {
          // Accumulateur des tool_calls (les arguments arrivent en plusieurs
          // deltas qu'il faut concatener par index).
          const toolAcc: Record<number, { name: string; args: string }> = {};
          try {
            for await (const event of stream) {
              const delta = event.choices?.[0]?.delta;
              if (delta?.content) yield { type: 'text', value: delta.content };
              const tcs = delta?.tool_calls;
              if (tcs) {
                for (const tc of tcs) {
                  const idx = tc.index ?? 0;
                  if (!toolAcc[idx]) toolAcc[idx] = { name: '', args: '' };
                  if (tc.function?.name) toolAcc[idx].name += tc.function.name;
                  if (tc.function?.arguments) toolAcc[idx].args += tc.function.arguments;
                }
              }
            }
            // Fin du stream : on materialise les actions accumulees.
            for (const key of Object.keys(toolAcc)) {
              const acc = toolAcc[Number(key)];
              const action = buildAction(acc.name, acc.args);
              if (action) yield { type: 'action', value: action };
            }
          } catch (err) {
            logger.error('OpenAI stream error:', err);
          }
        })(),
        { objectMode: true },
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

  // ─────────────────────────────────────────────────────────────────
  //              FUNCTION-CALLING : OUTILS + MAPPING ACTIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Construit la liste d'outils OpenAI selon les toggles actifs. L'IA ne fait
   * que PROPOSER l'action (extraction des params) ; l'execution reelle se fait
   * cote frontend apres confirmation explicite de l'utilisateur.
   * Retourne undefined si aucun outil actif (-> chat pur).
   */
  private buildTools(enabled?: EnabledActions): any[] | undefined {
    if (!enabled) return undefined;
    const lineItemSchema = {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Désignation de la ligne' },
        quantity: { type: 'string', description: 'Quantité en chiffres, ex "1"' },
        unitPrice: { type: 'string', description: 'Prix unitaire HT en chiffres, ex "1500"' },
        vatRate: { type: 'string', description: 'Taux de TVA en %, défaut "20"' },
        unit: { type: 'string', description: 'Unité, ex "forfait", "m²", "h"' },
      },
      required: ['description', 'quantity', 'unitPrice'],
    };
    const tools: any[] = [];
    if (enabled.dossier) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_dossier',
          description:
            "Proposer la création d'un nouveau dossier client. À utiliser UNIQUEMENT si l'utilisateur demande explicitement de créer/ajouter un dossier. N'invente JAMAIS le nom du client : s'il manque, demande-le au lieu d'appeler l'outil.",
          parameters: {
            type: 'object',
            properties: {
              lastName: { type: 'string', description: 'Nom de famille du client (obligatoire)' },
              firstName: { type: 'string', description: 'Prénom du client (optionnel)' },
              email: { type: 'string', description: 'Email du client (optionnel)' },
              phone: { type: 'string', description: 'Téléphone du client (optionnel)' },
            },
            required: ['lastName'],
          },
        },
      });
    }
    if (enabled.devis) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_devis',
          description:
            "Proposer la création d'un devis. Renseigne les lignes UNIQUEMENT si l'utilisateur précise des montants ; sinon laisse 'lines' vide (un brouillon sera créé puis ouvert pour édition). N'invente jamais de prix.",
          parameters: {
            type: 'object',
            properties: {
              clientName: { type: 'string', description: 'Nom du client / destinataire (optionnel)' },
              objet: { type: 'string', description: 'Objet / titre du devis (optionnel)' },
              lines: { type: 'array', description: 'Lignes du devis (optionnel)', items: lineItemSchema },
            },
            required: [],
          },
        },
      });
    }
    if (enabled.facture) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_facture',
          description:
            "Proposer la création d'une facture. Renseigne les lignes UNIQUEMENT si l'utilisateur précise des montants ; sinon laisse 'lines' vide (un brouillon sera créé puis ouvert pour édition). N'invente jamais de prix.",
          parameters: {
            type: 'object',
            properties: {
              clientName: { type: 'string', description: 'Nom du client / destinataire (optionnel)' },
              objet: { type: 'string', description: 'Objet / titre de la facture (optionnel)' },
              lines: { type: 'array', description: 'Lignes de la facture (optionnel)', items: lineItemSchema },
            },
            required: [],
          },
        },
      });
    }
    if (enabled.navigation) {
      tools.push({
        type: 'function',
        function: {
          name: 'navigate',
          description: "Proposer d'emmener l'utilisateur sur une page de l'application.",
          parameters: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                enum: ['dossiers', 'planning', 'facturation', 'stock', 'statistiques', 'ia-studio', 'parametres', 'intervenants'],
                description: 'Page de destination',
              },
            },
            required: ['target'],
          },
        },
      });
    }
    if (enabled.event) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_event',
          description:
            "Proposer la création d'un RDV / intervention dans le planning. À utiliser si l'utilisateur demande de planifier/poser un rendez-vous. Déduis la date/heure depuis la demande et renvoie-la au format ISO 8601 (ex 2026-06-18T14:00:00). Si la date est ambiguë, demande-la au lieu d'appeler l'outil.",
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Titre du RDV (ex "Mesure cuisine Dupont")' },
              startAt: { type: 'string', description: 'Date et heure de début au format ISO 8601' },
              endAt: { type: 'string', description: 'Date et heure de fin ISO 8601 (optionnel)' },
              type: {
                type: 'string',
                enum: ['RDV_CLIENT', 'VISITE_CHANTIER', 'LIVRAISON', 'INSTALLATION', 'REUNION', 'RELANCE', 'APPEL', 'DEPLACEMENT', 'AUTRE'],
                description: 'Type d\'évènement (défaut RDV_CLIENT)',
              },
              location: { type: 'string', description: 'Lieu (optionnel)' },
            },
            required: ['title', 'startAt'],
          },
        },
      });
    }
    if (enabled.demande) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_demande',
          description:
            "Proposer l'envoi d'une demande de travail à un intervenant (poseur, livreur, SAV…). À utiliser si l'utilisateur demande d'envoyer/assigner une tâche à un intervenant. Donne le NOM de l'intervenant tel qu'évoqué ; ne l'invente pas, demande-le s'il manque.",
          parameters: {
            type: 'object',
            properties: {
              intervenantName: { type: 'string', description: "Nom de l'intervenant cible (obligatoire)" },
              title: { type: 'string', description: 'Titre / objet de la demande (obligatoire)' },
              type: {
                type: 'string',
                enum: ['POSE', 'LIVRAISON', 'SAV', 'MESURE', 'DEVIS', 'CONFIRMATION_COMMANDE', 'COMPLEMENT', 'AUTRE'],
                description: 'Type de demande (défaut AUTRE)',
              },
              notes: { type: 'string', description: 'Brief / détails (optionnel)' },
              scheduledFor: { type: 'string', description: 'Date souhaitée ISO 8601 (optionnel)' },
            },
            required: ['intervenantName', 'title'],
          },
        },
      });
    }
    return tools.length ? tools : undefined;
  }

  /** Mappe un tool_call OpenAI accumulé vers une AssistantAction sûre (ou null). */
  private buildAction(name: string, argsRaw: string): AssistantAction | null {
    let params: Record<string, unknown> = {};
    try {
      params = argsRaw ? JSON.parse(argsRaw) : {};
    } catch {
      params = {};
    }
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    switch (name) {
      case 'create_dossier': {
        const lastName = str(params.lastName);
        if (!lastName) return null; // pas de nom -> on ne propose pas une création vide
        const firstName = str(params.firstName);
        return {
          type: 'create_dossier',
          label: `Créer le dossier ${firstName ? firstName + ' ' : ''}${lastName}`,
          params,
        };
      }
      case 'create_devis': {
        const client = str(params.clientName);
        return { type: 'create_devis', label: `Créer un devis${client ? ' pour ' + client : ''}`, params };
      }
      case 'create_facture': {
        const client = str(params.clientName);
        return { type: 'create_facture', label: `Créer une facture${client ? ' pour ' + client : ''}`, params };
      }
      case 'navigate': {
        const target = str(params.target);
        const labels: Record<string, string> = {
          dossiers: 'Dossiers', planning: 'Planning', facturation: 'Facturation',
          stock: 'Stock', statistiques: 'Statistiques', 'ia-studio': 'IA Studio',
          parametres: 'Paramètres', intervenants: 'Intervenants',
        };
        if (!labels[target]) return null;
        return { type: 'navigate', label: `Aller sur ${labels[target]}`, params: { target } };
      }
      case 'create_event': {
        const title = str(params.title);
        const startAt = str(params.startAt);
        if (!title || !startAt) return null; // sans titre+date, on ne propose rien
        return { type: 'create_event', label: `Créer le RDV « ${title} »`, params };
      }
      case 'create_demande': {
        const who = str(params.intervenantName);
        const title = str(params.title);
        if (!who || !title) return null;
        return { type: 'create_demande', label: `Envoyer « ${title} » à ${who}`, params };
      }
      default:
        return null;
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

      // Object-mode : meme contrat que openaiChatStream (events { type, value }).
      // Le fallback Anthropic ne propose pas d'actions (texte uniquement).
      return new Readable({
        objectMode: true,
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
                    this.push({ type: 'text', value: event.delta.text });
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
          yield { type: 'text', value: char };
          await new Promise((r) => setTimeout(r, 20));
        }
      })(),
      { objectMode: true },
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
