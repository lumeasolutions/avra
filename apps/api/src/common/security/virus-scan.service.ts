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
    if (!apiKey) {
      if (!this.warned) {
        this.logger.warn('VirusScan disabled (no CLOUDMERSIVE_API_KEY) — uploads pass through unchecked');
        this.warned = true;
      }
      return { clean: true, skipped: true, reason: 'no-api-key' };
    }

    try {
      // Multipart form upload — minimal manual implementation to avoid an
      // extra runtime dependency.
      const boundary = '----avra-' + Math.random().toString(16).slice(2);
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
