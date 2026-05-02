import { Injectable, Logger } from '@nestjs/common';

interface FalQueueSubmitResponse {
  request_id: string;
  status_url?: string;
  response_url?: string;
  cancel_url?: string;
}

interface FalStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

interface FalResultResponse {
  images?: Array<{ url: string }>;
  image?: { url: string };
  url?: string;
  error?: string;
}

@Injectable()
export class FalService {
  private readonly logger = new Logger(FalService.name);
  private readonly enabled: boolean;
  private readonly apiKey: string | null;

  constructor() {
    this.apiKey = process.env.FAL_KEY || null;
    this.enabled = !!this.apiKey;

    if (this.enabled) {
      this.logger.log('✅ Fal.ai service initialized (real mode)');
    } else {
      this.logger.warn('⚠️  Fal.ai service disabled (mock mode - needs FAL_KEY)');
    }
  }

  /**
   * Génère une image photoréaliste via FLUX Pro
   */
  async generateRealisticRender(prompt: string, imageSize: string = 'landscape_16_9'): Promise<string | null> {
    if (!this.enabled) {
      return this.mockGenerateImage(prompt);
    }

    try {
      const result = await this.callFalAPI('fal-ai/flux-pro/v1.1', {
        prompt,
        image_size: imageSize,
        num_images: 1,
      });
      return this.extractImageUrl(result);
    } catch (error) {
      this.logger.error('Fal.ai realistic render error:', error);
      return this.mockGenerateImage(prompt);
    }
  }

  /**
   * Applique une colorisation via FLUX img2img
   */
  async colorizeImage(
    sourceImageUrl: string,
    prompt: string,
    imageSize: string = 'landscape_16_9',
  ): Promise<string | null> {
    if (!this.enabled) {
      return this.mockGenerateImage(prompt + ' (colorized)');
    }

    try {
      const result = await this.callFalAPI('fal-ai/flux/dev', {
        prompt,
        image_url: sourceImageUrl,
        image_size: imageSize,
        num_images: 1,
      });
      return this.extractImageUrl(result);
    } catch (error) {
      this.logger.error('Fal.ai colorize error:', error);
      return this.mockGenerateImage(prompt + ' (colorized)');
    }
  }

  /**
   * Appel à l'API Fal via le système de queue asynchrone correct
   */
  private async callFalAPI(model: string, input: Record<string, any>): Promise<FalResultResponse> {
    if (!this.apiKey) throw new Error('FAL_KEY not configured');

    const headers = {
      Authorization: `Key ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    // 1. Soumettre à la queue — URL correcte : queue.fal.run
    const submitRes = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => '');
      throw new Error(`Fal submit error: ${submitRes.status} — ${errText}`);
    }

    const submitted = (await submitRes.json()) as FalQueueSubmitResponse;
    const requestId = submitted.request_id;

    if (!requestId) {
      throw new Error('No request_id returned from Fal queue API');
    }

    this.logger.log(`Fal.ai job submitted: ${requestId} (model: ${model})`);

    // 2. Attendre que le job soit COMPLETED
    const statusUrl = submitted.status_url || `https://queue.fal.run/${model}/requests/${requestId}/status`;
    const responseUrl = submitted.response_url || `https://queue.fal.run/${model}/requests/${requestId}`;

    await this.waitForCompletion(statusUrl, requestId, headers);

    // 3. Récupérer le résultat
    const resultRes = await fetch(responseUrl, { headers });
    if (!resultRes.ok) {
      const errText = await resultRes.text().catch(() => '');
      throw new Error(`Fal result error: ${resultRes.status} — ${errText}`);
    }

    return (await resultRes.json()) as FalResultResponse;
  }

  /**
   * Attend que le job passe à COMPLETED (poll sur status_url)
   */
  private async waitForCompletion(
    statusUrl: string,
    requestId: string,
    headers: Record<string, string>,
    maxAttempts = 60,
    delayMs = 3000,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.delay(delayMs);

      try {
        const res = await fetch(statusUrl, { headers });
        if (!res.ok) {
          this.logger.warn(`Fal status poll ${attempt + 1}: HTTP ${res.status}`);
          continue;
        }

        const status = (await res.json()) as FalStatusResponse;
        this.logger.log(`Fal.ai ${requestId} status: ${status.status} (attempt ${attempt + 1})`);

        if (status.status === 'COMPLETED') return;
        if (status.status === 'FAILED') throw new Error(`Fal.ai job ${requestId} failed`);
        // IN_QUEUE ou IN_PROGRESS → continuer à attendre
      } catch (err: any) {
        if (err.message?.includes('failed')) throw err;
        this.logger.warn(`Fal status poll error: ${err.message}`);
      }
    }

    throw new Error(`Fal.ai timeout: job ${requestId} not completed after ${maxAttempts * delayMs / 1000}s`);
  }

  private extractImageUrl(result: FalResultResponse): string | null {
    if (result.images?.length) return result.images[0].url || null;
    if (result.image) return result.image.url || null;
    if (result.url) return result.url;
    return null;
  }

  private mockGenerateImage(prompt: string): string {
    const encoded = encodeURIComponent(prompt.substring(0, 50));
    return `https://via.placeholder.com/1280x720/1a2a1e/C9A96E?text=${encoded}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
