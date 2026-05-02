import { Injectable, Logger } from '@nestjs/common';

/**
 * Lightweight virus scanning facade.
 *
 * Strategy:
 *   • If `CLOUDMERSIVE_API_KEY` is set, POST the buffer to the Cloudmersive
 *     virus-scan endpoint (https://api.cloudmersive.com/virus/scan/file).
 *   • Otherwise the scan is skipped (returns clean=true, skipped=true) and a
 *     warning is logged once. Callers are expected to surface this in Sentry
 *     telemetry but NOT block uploads (degrading the product would be worse
 *     than the residual risk on the small surface that uses this service).
 *
 * Used by:
 *   • dossier-documents.service.upload(...)
 *   • demandes.service.addMessagePhoto(...)
 *
 * TODO(HIGH-009): wire ClamAV daemon side-car for full coverage when infra
 * adds a long-running container. Cloudmersive is a stop-gap.
 */
@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);
  private warned = false;

  async scanBuffer(buf: Buffer, filename = 'upload'): Promise<{ clean: boolean; skipped?: boolean; reason?: string }> {
    const apiKey = process.env.CLOUDMERSIVE_API_KEY;
    // HOTFIX 29/04/2026 — fail-OPEN par défaut quand pas de clé configurée.
    // Le mode fail-CLOSED en prod précédent (HIGH-3) bloquait 100% des uploads
    // sur l'env Vercel production tant que CLOUDMERSIVE_API_KEY n'est pas
    // configurée → produit cassé. La protection résiduelle reste solide :
    // whitelist MIME explicite + magic-bytes via file-type côté caller.
    //
    // Pour activer la vraie protection AV : ajouter `CLOUDMERSIVE_API_KEY` dans
    // les variables d'env Vercel (offre gratuite 800 scans/mois disponible sur
    // https://www.cloudmersive.com/). Tant que la clé est absente, on log un
    // warn (une seule fois) et on laisse passer.
    if (!apiKey) {
      if (!this.warned) {
        this.logger.warn(
          'VirusScan disabled (no CLOUDMERSIVE_API_KEY) — uploads pass through with MIME+magic-bytes only',
        );
        this.warned = true;
      }
      return { clean: true, skipped: true, reason: 'no-api-key' };
    }

    try {
      // Multipart form upload — minimal manual implementation to avoid an
      // extra runtime dependency.
      // MED-2 (passe-2): use crypto.randomBytes for boundary instead of
      //   Math.random() — boundary collision in multipart bodies is exotic
      //   but the predictability was an unnecessary smell.
      const boundary =
        '----avra-' +
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('crypto').randomBytes(16).toString('hex');
      const head = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="inputFile"; filename="${filename.replace(/"/g, '')}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      );
      const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([head, buf, tail]);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      try {
        const res = await fetch('https://api.cloudmersive.com/virus/scan/file', {
          method: 'POST',
          headers: {
            Apikey: apiKey,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
          signal: ctrl.signal,
        });
        if (!res.ok) {
          this.logger.error(`VirusScan API HTTP ${res.status} — failing open`);
          return { clean: true, skipped: true, reason: `http-${res.status}` };
        }
        const data = (await res.json()) as { CleanResult?: boolean; FoundViruses?: unknown };
        const isClean = data.CleanResult === true;
        if (!isClean) {
          this.logger.warn(`VirusScan FOUND virus in ${filename}`);
        }
        return { clean: isClean };
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      this.logger.error(`VirusScan error — failing open: ${(err as Error).message}`);
      return { clean: true, skipped: true, reason: 'exception' };
    }
  }
}
