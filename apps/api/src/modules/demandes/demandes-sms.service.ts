import { Injectable, Logger } from '@nestjs/common';

/**
 * Service SMS pour les notifications du module Demandes (via Brevo).
 *
 * Envoyé EN PARALLÈLE de l'e-mail à l'intervenant : un artisan lit rarement
 * ses mails mais toujours ses SMS. Utilise l'API HTTP transactionnelle Brevo
 * directement (pas de SDK — cohérent avec DemandesEmailService).
 *
 * Tout est fire-and-forget : un échec SMS ne bloque JAMAIS l'opération métier.
 * Désactivé tant que BREVO_API_KEY n'est pas configuré (mode no-op, zéro risque).
 *
 * Variables d'env :
 *   BREVO_API_KEY     — clé API Brevo (active les envois SMS)
 *   BREVO_SMS_SENDER  — nom d'expéditeur alphanumérique (défaut "AVRA", max 11 car.)
 *   WEB_URL           — URL publique du frontend (pour le lien /intervention)
 */

const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

@Injectable()
export class DemandesSmsService {
  private readonly logger = new Logger(DemandesSmsService.name);
  private readonly apiKey = process.env.BREVO_API_KEY ?? null;
  private readonly sender = (process.env.BREVO_SMS_SENDER ?? 'AVRA').replace(/[^A-Za-z0-9]/g, '').slice(0, 11) || 'AVRA';
  readonly webUrl = (process.env.WEB_URL ?? 'https://avra-app.fr').replace(/\/$/, '');

  get enabled(): boolean {
    return !!this.apiKey;
  }

  /** Lien public d'intervention (sans login) — à insérer dans le SMS. */
  interventionLink(token: string): string {
    return `${this.webUrl}/intervention/${token}`;
  }

  /**
   * Normalise un numéro FR/international au format Brevo (chiffres + indicatif,
   * sans « + »). Renvoie null si le numéro est invalide/absent → SMS ignoré.
   * Ex : "06 12 34 56 78" → "33612345678", "+33 6…" → "336…", "0033…" → "33…".
   */
  private normalizePhone(raw?: string | null): string | null {
    if (!raw) return null;
    let d = raw.replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0') && d.length === 10) d = '33' + d.slice(1); // national FR
    if (!/^\d{11,15}$/.test(d)) return null;
    return d;
  }

  /** Envoie un SMS transactionnel (fire-and-forget, no-op si non configuré). */
  async send(to: string | null | undefined, content: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('[sms] BREVO_API_KEY manquante — SMS ignoré');
      return;
    }
    const recipient = this.normalizePhone(to);
    if (!recipient) {
      this.logger.warn('[sms] numéro absent/invalide — SMS ignoré');
      return;
    }
    const text = (content || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!text) return;
    try {
      const res = await fetch(BREVO_SMS_URL, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey as string,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: this.sender,
          recipient,
          content: text,
          type: 'transactional',
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        this.logger.error(`[sms] Brevo ${res.status}: ${txt}`);
      }
    } catch (err: any) {
      this.logger.error(`[sms] envoi échoué : ${err?.message ?? err}`);
    }
  }
}
