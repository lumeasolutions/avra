import { Injectable, Logger } from '@nestjs/common';

/**
 * Service email pour le module Auth — envoie le mail de reset password.
 *
 * Pattern aligne sur DemandesEmailService : appel HTTP direct a l'API Resend
 * (pas de SDK pour eviter une dep supplementaire dans apps/api). Fire-and-forget :
 * un echec d'email ne lance pas d'exception cote service, le timing flatten
 * de forgotPassword reste donc fiable.
 *
 * Variables d'env :
 *   RESEND_API_KEY    — cle API Resend (obligatoire pour activer les envois)
 *   EMAIL_FROM        — expediteur (defaut "AVRA <onboarding@resend.dev>")
 *   WEB_URL           — URL publique du frontend (defaut "https://avra-app.fr")
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? null;
  private readonly from = process.env.EMAIL_FROM ?? 'AVRA <onboarding@resend.dev>';
  private readonly webUrl = (process.env.WEB_URL ?? 'https://avra-app.fr').replace(/\/$/, '');

  private get enabled(): boolean {
    return !!this.apiKey;
  }

  /** Envoie via l'API Resend (fire-and-forget). */
  private async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`[auth-email] RESEND_API_KEY manquante — envoi ignore : "${opts.subject}"`);
      return;
    }
    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        this.logger.error(`[auth-email] Resend ${res.status}: ${txt}`);
      }
    } catch (err: any) {
      this.logger.error(`[auth-email] envoi echoue : ${err?.message ?? err}`);
    }
  }

  /**
   * Envoie le mail "reinitialisation de mot de passe" avec un lien
   * /reset-password?token=<hex>&id=<userId>. Le lien expire en 1h.
   *
   * Securite :
   *  - Le token (32 bytes hex) n'est pas stocke en clair en DB, seulement
   *    son SHA-256 (cf. forgotPassword in auth.service).
   *  - Si l'utilisateur n'existe pas, on n'appelle JAMAIS cette methode
   *    (cf. timing flatten dans auth.service).
   */
  async sendPasswordResetEmail(params: {
    to: string;
    firstName?: string | null;
    token: string;
    userId: string;
  }): Promise<void> {
    const link = `${this.webUrl}/reset-password?token=${encodeURIComponent(params.token)}&id=${encodeURIComponent(params.userId)}`;
    const greeting = params.firstName
      ? `Bonjour ${escapeHtml(params.firstName)},`
      : 'Bonjour,';

    const html = baseLayout({
      title: 'Reinitialisation de votre mot de passe',
      preheader: 'Cliquez pour definir un nouveau mot de passe AVRA (lien valable 1 heure)',
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Reinitialisation de mot de passe</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          ${greeting}<br/>
          Vous avez demande la reinitialisation de votre mot de passe AVRA. Cliquez sur le bouton ci-dessous pour en definir un nouveau.
        </p>
        ${ctaButton(link, 'Reinitialiser mon mot de passe')}
        <p style="font-size:13px;color:#5b5045;margin:24px 0 6px">
          Le lien est valable <strong>1 heure</strong>. Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email — votre mot de passe actuel reste inchange.
        </p>
        <p style="font-size:11px;color:#7c6c58;margin:18px 0 0;word-break:break-all">
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
          <span style="color:#3D5449">${escapeHtml(link)}</span>
        </p>
      `,
    });
    return this.send({
      to: params.to,
      subject: '[AVRA] Reinitialisation de votre mot de passe',
      html,
    });
  }
}

// ─── Helpers HTML (alignes sur demandes-email.service.ts) ─────────────────

function baseLayout(opts: { title: string; preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5eee8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5eee8;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 18px rgba(26,42,30,.1)">
          <tr><td style="padding:24px 32px 0;text-align:center">
            <div style="font-size:11px;letter-spacing:.18em;font-weight:700;color:#3D5449;text-transform:uppercase">AVRA</div>
          </td></tr>
          <tr><td style="padding:18px 32px 32px">${opts.body}</td></tr>
          <tr><td style="padding:18px 32px;background:#fafaf8;border-top:1px solid #ece7df;text-align:center;font-size:11px;color:#7c6c58">
            AVRA · La plateforme metier des cuisinistes, menuisiers et architectes d'interieur<br/>
            Vous recevez cet email parce que vous avez demande la reinitialisation de votre mot de passe.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
    <a href="${href}" target="_blank" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#1a2a1e 0%,#3D5449 100%);color:#cbb98a;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
