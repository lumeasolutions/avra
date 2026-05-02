import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service Supabase Storage côté serveur.
 *
 * ⚠️ Utilise la `service_role` key → jamais exposée au client.
 * Toutes les opérations sur le bucket sont exécutées ici, après validation
 * d'ownership dans DossierDocumentsService.
 */
@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private client: SupabaseClient | null = null;

  readonly bucket: string = process.env.SUPABASE_DOSSIER_BUCKET || 'dossier-documents';

  private getClient(): SupabaseClient {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new InternalServerErrorException(
        'Supabase Storage non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants)',
      );
    }
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.client;
  }

  /** Upload un buffer binaire dans le bucket. */
  async upload(path: string, buffer: Buffer, mimeType: string): Promise<void> {
    const { error } = await this.getClient()
      .storage.from(this.bucket)
      .upload(path, buffer, {
        contentType: mimeType || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      });
    if (error) {
      this.logger.error(`[upload ${path}] ${error.message}`);
      throw new InternalServerErrorException(`Échec upload : ${error.message}`);
    }
  }

  /**
   * Télécharge un fichier du bucket sous forme de Buffer.
   * Utilisé par l'extraction IA (pdf-parse).
   */
  async download(path: string): Promise<Buffer> {
    const { data, error } = await this.getClient()
      .storage.from(this.bucket)
      .download(path);
    if (error || !data) {
      this.logger.error(`[download ${path}] ${error?.message ?? 'no data'}`);
      throw new InternalServerErrorException('Impossible de télécharger le fichier');
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** Génère une URL signée temporaire (en secondes). */
  async createSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.getClient()
      .storage.from(this.bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data) {
      this.logger.error(`[signedUrl ${path}] ${error?.message}`);
      throw new InternalServerErrorException('Impossible de générer l\'URL signée');
    }
    return data.signedUrl;
  }

  /** Supprime un fichier du bucket (best-effort, log en cas d'erreur). */
  async remove(path: string): Promise<void> {
    const { error } = await this.getClient().storage.from(this.bucket).remove([path]);
    if (error) {
      this.logger.warn(`[remove ${path}] ${error.message}`);
    }
  }
}
