import { Injectable, Logger } from '@nestjs/common';

interface FalImageResult {
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
      this.logger.log('Fal.ai service initialized (real mode)');
    } else {
      this.logger.warn('Fal.ai service disabled (mock mode - needs FAL_KEY)');
    }
  }

  /**
   * Génère une image photoréaliste via FLUX Pro
   * Utilisé pour le rendu 3D réaliste de cuisines
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
        sync_mode: false,
      });

      return this.extractImageUrl(result);
    } catch (error) {
      this.logger.error('Fal.ai realistic render error:', error);
      return this.mockGenerateImage(prompt);
    }
  }

  /**
   * Applique une colorisation/modification avec FLUX via img2img
   * Utilisé pour le "coloriste" - transforme une image source
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
      // FLUX dev supporte img2img via le paramètre image_url
      const result = await this.callFalAPI('fal-ai/flux/dev', {
        prompt,
        image_url: sourceImageUrl,
        image_size: imageSize,
        num_images: 1,
        sync_mode: false,
      });

      return this.extractImageUrl(result);
    } catch (error) {
      this.logger.error('Fal.ai colorize error:', error);
      return this.mockGenerateImage(prompt + ' (colorized)');
    }
  }

  /**
   * Appel bas niveau à l'API Fal via polling
   * Retourne immédiatement avec une request_id pour polling asynchrone
   */
  private async callFalAPI(model: string, input: Record<string, any>): Promise<FalImageResult> {
    if (!this.apiKey) {
      throw new Error('FAL_KEY not configured');
    }

    // Lancer la génération (async)
    const submitRes = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        sync_mode: false, // Retour immédiat avec request_id
      }),
    });

    if (!submitRes.ok) {
      const error = await submitRes.text();
      throw new Error(`Fal API error: ${submitRes.status} - ${error}`);
    }

    const data = (await submitRes.json()) as { request_id?: string };
    const requestId = data.request_id;

    if (!requestId) {
      throw new Error('No request_id returned from Fal API');
    }

    // Attendre le résultat avec polling (timeout 2 min)
    return this.pollFalResult(model, requestId);
  }

  /**
   * Sonde l'API Fal pour obtenir le résultat d'une génération
   */
  private async pollFalResult(
    model: string,
    requestId: string,
    maxAttempts: number = 60,
    delayMs: number = 2000,
  ): Promise<FalImageResult> {
    if (!this.apiKey) {
      throw new Error('FAL_KEY not configured');
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusRes = await fetch(`https://fal.run/${model}`, {
        method: 'GET',
        headers: {
          Authorization: `Key ${this.apiKey}`,
        },
      });

      if (!statusRes.ok) {
        await this.delay(delayMs);
        continue;
      }

      const result = (await statusRes.json()) as FalImageResult;

      // Vérifier si l'image est prête
      if (result.images || result.image || result.url) {
        return result;
      }

      // Attendre avant la prochaine tentative
      await this.delay(delayMs);
    }

    throw new Error(`Fal.ai timeout after ${maxAttempts * delayMs}ms for request ${requestId}`);
  }

  /**
   * Extrait l'URL d'image depuis différents formats de réponse Fal
   */
  private extractImageUrl(result: FalImageResult): string | null {
    if (result.images && result.images.length > 0) {
      return result.images[0].url || null;
    }
    if (result.image) {
      return result.image.url || null;
    }
    if (result.url) {
      return result.url;
    }
    return null;
  }

  /**
   * Simule une génération d'image (pour développement sans clé API)
   */
  private mockGenerateImage(prompt: string): string {
    // URL d'une image placeholder
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 50));
    return `https://via.placeholder.com/1280x720?text=${encodedPrompt}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
