# Bonnes pratiques OpenAI - Timeouts et Retry Logic

## Analyse actuelle

Aucun appel OpenAI direct trouvé dans les services Prisma existants. Les appels IA semblent être gérés par :
- Files d'attente asynchrones (Bull, RabbitMQ, AWS SQS)
- Service `ia.service.ts` (gère les jobs, pas les appels directs)
- Service séparé non analysé ici

---

## Pattern recommandé pour appels OpenAI

### 1. Configuration des timeouts

```typescript
// src/config/openai.config.ts

import OpenAI from 'openai';

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,           // 60 secondes - max OpenAI
  maxRetries: 3,            // Retry automatique Sdk
  httpAgent: new Agent({
    timeout: 65000,         // Légèrement plus que timeout API
    keepAlive: true,
  }),
});

// Constantes de timeout par opération
export const OPENAI_TIMEOUTS = {
  TEXT_GENERATION: 30000,    // Chat completions
  IMAGE_GENERATION: 60000,   // DALL-E
  IMAGE_ENHANCEMENT: 120000, // Processing lourd
  EMBEDDING: 10000,          // Embeddings rapides
};
```

### 2. Wrapper avec retry logic

```typescript
// src/services/openai.service.ts

import { Injectable, BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import { openaiClient, OPENAI_TIMEOUTS } from '../config/openai.config';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);

  /**
   * Exécuter une requête OpenAI avec retry exponentiel et timeout
   */
  async callWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    timeoutMs: number = OPENAI_TIMEOUTS.TEXT_GENERATION,
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wraper avec timeout
        return await this.executeWithTimeout(fn, timeoutMs);
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          this.logger.error(
            `OpenAI ${operation} failed after ${maxRetries} retries: ${error.message}`,
            error.stack,
          );
          throw error;
        }

        // Backoff exponentiel: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        this.logger.warn(
          `OpenAI ${operation} attempt ${attempt}/${maxRetries} failed: ${error.message}. ` +
          `Retrying in ${backoffMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  /**
   * Exécuter une fonction avec timeout
   */
  private executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new GatewayTimeoutException(`OpenAI request timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Générer du texte via ChatGPT
   */
  async generateText(prompt: string, options?: { temperature?: number; maxTokens?: number }) {
    return this.callWithRetry(
      'generateText',
      async () => {
        const response = await openaiClient.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
        });
        return response.choices[0].message.content;
      },
      OPENAI_TIMEOUTS.TEXT_GENERATION,
      3,
    );
  }

  /**
   * Générer une image via DALL-E
   */
  async generateImage(prompt: string, options?: { model?: string; size?: string }) {
    return this.callWithRetry(
      'generateImage',
      async () => {
        const response = await openaiClient.images.generate({
          prompt,
          model: options?.model ?? 'dall-e-3',
          size: (options?.size ?? '1024x1024') as '256x256' | '512x512' | '1024x1024',
          quality: 'standard',
          n: 1,
        });
        return response.data[0].url;
      },
      OPENAI_TIMEOUTS.IMAGE_GENERATION,
      2, // Moins de retries pour images (coûteux)
    );
  }

  /**
   * Créer des embeddings
   */
  async createEmbedding(text: string) {
    return this.callWithRetry(
      'createEmbedding',
      async () => {
        const response = await openaiClient.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });
        return response.data[0].embedding;
      },
      OPENAI_TIMEOUTS.EMBEDDING,
      3,
    );
  }
}
```

### 3. Utilisation dans les services

```typescript
// src/modules/ia/ia.service.ts - Exemple intégration

import { OpenaiService } from '../../services/openai.service';

@Injectable()
export class IaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenaiService,
  ) {}

  /**
   * Traiter un job IA asynchrone
   */
  async processJob(jobId: string) {
    const job = await this.prisma.iaJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    try {
      // Marquer comme en cours
      await this.prisma.iaJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' },
      });

      let result: string;

      // Dispatcher selon le type
      switch (job.type) {
        case 'TEXT_ASSISTANT':
          result = await this.openaiService.generateText(job.prompt);
          break;

        case 'EDIT':
          result = await this.openaiService.generateImage(job.prompt);
          break;

        default:
          throw new BadRequestException(`Unknown job type: ${job.type}`);
      }

      // Sauvegarder le résultat
      await this.prisma.iaJob.update({
        where: { id: jobId },
        data: {
          status: 'DONE',
          completedAt: new Date(),
          // resultDocumentId: ... (créer le document)
        },
      });

      return result;
    } catch (error) {
      // Enregistrer l'erreur
      await this.prisma.iaJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }
}
```

### 4. Job queue avec Bull

Pour les requêtes longues (>5 secondes) :

```typescript
// src/modules/ia/ia.queue.ts

import { Process, Processor, OnGlobalError } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { IaService } from './ia.service';

@Processor('ia-jobs')
export class IaProcessor {
  private readonly logger = new Logger(IaProcessor.name);

  constructor(private readonly iaService: IaService) {}

  @Process({ name: 'process-job', concurrency: 5 })
  async handleProcessJob(job: Job<{ jobId: string }>) {
    this.logger.debug(`Processing IA job: ${job.data.jobId}`);

    try {
      const result = await this.iaService.processJob(job.data.jobId);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.data.jobId} failed:`, error);

      // Bull va automatiquement retry avec backoff exponentiel
      throw error;
    }
  }

  @OnGlobalError()
  async onError(error: Error) {
    this.logger.error('Queue error:', error);
  }
}

// Configuration Bull
import { BullModule } from '@nestjs/bull';

export const IA_QUEUE_CONFIG = BullModule.registerQueue({
  name: 'ia-jobs',
  defaultJobOptions: {
    timeout: 120000,           // 2 minutes max par job
    attempts: 3,               // Retry 3 fois
    backoff: {
      type: 'exponential',
      delay: 2000,             // Début à 2s, puis 4s, 8s
    },
    removeOnComplete: true,    // Nettoyer après succès
  },
});
```

### 5. Gestion des erreurs OpenAI

```typescript
// src/filters/openai-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import { APIError, RateLimitError, AuthenticationError } from 'openai';

@Catch()
export class OpenaiExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.status ?? 500;

    // Mapper les erreurs OpenAI
    if (exception instanceof RateLimitError) {
      return response.status(429).json({
        statusCode: 429,
        message: 'OpenAI rate limit exceeded. Retry in 60 seconds.',
      });
    }

    if (exception instanceof AuthenticationError) {
      return response.status(401).json({
        statusCode: 401,
        message: 'OpenAI authentication failed. Check API key.',
      });
    }

    if (exception instanceof APIError) {
      return response.status(502).json({
        statusCode: 502,
        message: `OpenAI API error: ${exception.message}`,
      });
    }

    if (exception instanceof GatewayTimeoutException) {
      return response.status(504).json({
        statusCode: 504,
        message: 'OpenAI request timeout. Please try again.',
      });
    }

    // Erreur générique
    response.status(status).json({
      statusCode: status,
      message: exception.message ?? 'Internal server error',
    });
  }
}
```

---

## Monitoring et Alertes

### Métriques à tracker

```typescript
// src/modules/ia/ia.metrics.ts

import { Counter, Histogram } from 'prom-client';

export const iaJobsCounter = new Counter({
  name: 'ia_jobs_total',
  help: 'Total IA jobs processed',
  labelNames: ['type', 'status'],
});

export const iaJobDuration = new Histogram({
  name: 'ia_job_duration_ms',
  help: 'IA job processing duration',
  labelNames: ['type'],
  buckets: [5000, 10000, 30000, 60000, 120000],
});

export const openaiApiErrors = new Counter({
  name: 'openai_api_errors_total',
  help: 'OpenAI API errors',
  labelNames: ['error_type'],
});

// Utilisation
const startTime = Date.now();
try {
  const result = await this.openaiService.generateText(prompt);
  iaJobsCounter.labels('text_generation', 'success').inc();
  iaJobDuration.labels('text_generation').observe(Date.now() - startTime);
} catch (error) {
  iaJobsCounter.labels('text_generation', 'failed').inc();
  openaiApiErrors.labels(error.constructor.name).inc();
}
```

### Alertes Datadog/New Relic

```yaml
# .monitoring/openai-alerts.yaml

alerts:
  - name: OpenAI API Timeout
    query: |
      SELECT count(*) FROM logs
      WHERE service='api'
        AND error_type='GatewayTimeoutException'
        AND timestamp > now() - 5m
    threshold: 5
    severity: warning

  - name: OpenAI Rate Limit
    query: |
      SELECT count(*) FROM logs
      WHERE service='api'
        AND error_type='RateLimitError'
        AND timestamp > now() - 5m
    threshold: 1
    severity: critical

  - name: IA Job Queue Backlog
    query: |
      SELECT queue_size FROM bull_queues
      WHERE queue_name='ia-jobs'
    threshold: 100
    severity: warning
```

---

## Coûts et optimisation

### Estimation coûts OpenAI

```typescript
// Prix 2024 (vérifier mise à jour)
const OPENAI_COSTS = {
  'gpt-4-turbo': {
    input: 0.01,   // $ par 1K tokens
    output: 0.03,
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
  },
  'dall-e-3': {
    '1024x1024': 0.04, // $ par image
    '1024x768': 0.04,
    '768x1024': 0.04,
  },
};

// Tracker les coûts
async function trackCost(model: string, tokens: number, type: 'input' | 'output') {
  const costPerToken = OPENAI_COSTS[model][type] / 1000;
  const cost = tokens * costPerToken;

  await this.prisma.iaJob.update({
    where: { id: jobId },
    data: { estimatedCost: cost },
  });
}
```

### Optimisations de coûts

1. **Utiliser gpt-3.5-turbo** pour les tâches simples (77% moins cher)
2. **Batch les requêtes** pour réduire les appels API
3. **Cacher les embeddings** dans Redis/Milvus
4. **Limiter max_tokens** aux valeurs minimales nécessaires
5. **Utiliser des modèles vision locaux** pour image classification

---

## Recommandations finales

1. **Timeout par défaut** : 30-60 secondes selon le type d'opération
2. **Retry logic** : Exponentiel backoff (1s, 2s, 4s)
3. **File d'attente** : Bull/RabbitMQ pour requêtes >5 secondes
4. **Monitoring** : Prom-client + Datadog
5. **Coûts** : Tracker et alerter si dépassement budget
6. **Fallbacks** : Garder une version non-IA des opérations
