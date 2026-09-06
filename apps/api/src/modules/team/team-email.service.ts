import { Injectable, Logger } from '@nestjs/common';

/**
 * Service email pour les invitations de membres/vendeurs (module Team).
 *
 * Même approche que DemandesEmailService : API HTTP Resend directe (pas de
 * SDK), envois fire-and-forget (un échec email ne bloque jamais l'invitation).
 *
 * Variables d'env :
 *   RESEND_API_KEY — clé API Resend (obligatoire pour activer les envois)
 *   EMAIL_FROM     — expéditeur (défaut "AVRA <onboarding@resend.dev>")
 *   WEB_URL        — URL publique du frontend (pour le lien d'invitation)
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Resultat d'un envoi. On ne renvoie plus `void` : l'invitation etait cree en base
 * mais l'echec d'envoi etait avale silencieusement (`.catch(() => {})`), donc
 * l'utilisateur voyait « invitation envoyee » alors que rien n'etait parti.
 */
export interface EmailResult {
  ok: boolean;
  /** Message court, lisible par l'utilisateur, quand ok === false. */
  reason?: string;
}


/**
 * Extrait le message lisible d'une reponse d'erreur Resend.
 * Resend repond typiquement { "statusCode": 422, "message": "...", "name": "..." }.
 */
function extraireMotifResend(corps: string): string | null {
  if (!corps) return null;
  try {
    const j = JSON.parse(corps);
    const m = j?.message ?? j?.error?.message ?? null;
    return typeof m === 'string' && m.trim() ? m.trim().slice(0, 300) : null;
  } catch {
    return corps.trim().slice(0, 300) || null;
  }
}

@Injectable()
export class TeamEmailService {
  private readonly logger = new Logger(TeamEmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? null;
  private readonly from = process.env.EMAIL_FROM ?? 'AVRA <onboarding@resend.dev>';
  private readonly webUrl = (process.env.WEB_URL ?? 'https://avra-app.fr').replace(/\/$/, '');

  private get enabled(): boolean {
    return !!this.apiKey;
  }

  private async send(opts: { to: string; subject: string; html: string }): Promise<EmailResult> {
    if (!this.enabled) {
      this.logger.warn(`[email] RESEND_API_KEY manquante — envoi ignore : "${opts.subject}"`);
      return { ok: false, reason: "La cle d'envoi d'e-mails (RESEND_API_KEY) n'est pas configuree sur le serveur." };
    }
    // Garde-fou explicite : avec l'expediteur bac a sable de Resend
    // (onboarding@resend.dev), Resend n'accepte QUE l'adresse du proprietaire du
    // compte comme destinataire. Toute invitation envoyee a quelqu'un d'autre est
    // rejetee. C'est exactement le cas quand EMAIL_FROM n'est pas defini.
    const sandbox = this.from.includes('onboarding@resend.dev');
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
        this.logger.error(`[email] Resend ${res.status}: ${txt} (from=${this.from})`);
        if (sandbox) {
          return {
            ok: false,
            reason:
              "L'expediteur d'e-mails n'est pas configure (EMAIL_FROM). Tant qu'un domaine "
              + "verifie n’est pas utilise, Resend refuse d’envoyer a une autre adresse que "
              + "celle du proprietaire du compte.",
          };
        }
        // On remonte le motif exact de Resend. Sans lui, l'ecran affichait
        // « erreur 422 » et personne ne pouvait agir : or ce code signifie le
        // plus souvent que le domaine de EMAIL_FROM n'est pas verifie chez
        // Resend (typiquement un expediteur pointant vers un domaine qui n'est
        // pas celui dont les enregistrements DNS ont ete publies). La route est
        // reservee aux OWNER/ADMIN du workspace, il n'y a pas de fuite ici.
        const motif = extraireMotifResend(txt);
        return {
          ok: false,
          reason: motif
            ? `Le serveur d’e-mails a refuse l’envoi (erreur ${res.status}) : ${motif}`
            : `Le serveur d’e-mails a refuse l’envoi (erreur ${res.status}).`,
        };
      }
      return { ok: true };
    } catch (err: any) {
      this.logger.error(`[email] envoi echoue : ${err?.message ?? err}`);
      return { ok: false, reason: "L'envoi de l'e-mail a echoue (probleme reseau ou service indisponible)." };
    }
  }

  /**
   * Invitation à rejoindre l'équipe. Lien vers /rejoindre-equipe/<token>.
   * L'invité crée son compte (ou se connecte) puis devient membre du workspace.
   */
  async notifyMemberInvitation(params: {
    to: string;
    inviteeName: string;
    inviterName: string;
    workspaceName: string;
    role: string;
    token: string;
    message?: string | null;
    expiresAt: Date;
  }): Promise<EmailResult> {
    const link = `${this.webUrl}/rejoindre-equipe/${params.token}`;
    const expiry = formatDateFR(params.expiresAt);
    const roleLabel = params.role === 'ADMIN' ? 'administrateur' : 'vendeur';
    const messageStr = params.message
      ? `<div style="background:#fff8ef;border:1px solid #fde7c2;border-radius:8px;padding:12px 16px;margin:18px 0;color:#7c4f1d">
           <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Message</div>
           <div style="font-style:italic">${escapeHtml(params.message)}</div>
         </div>`
      : '';

    const html = baseLayout({
      title: 'Rejoignez votre équipe sur AVRA',
      preheader: `${params.inviterName} vous invite à rejoindre ${params.workspaceName} sur AVRA`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Vous êtes invité&middot;e à rejoindre une équipe</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.inviteeName)},<br/>
          <strong>${escapeHtml(params.inviterName)}</strong> vous invite à rejoindre l'équipe
          <strong>${escapeHtml(params.workspaceName)}</strong> sur AVRA en tant que <strong>${escapeHtml(roleLabel)}</strong>.
        </p>
        ${messageStr}
        ${ctaButton(link, 'Rejoindre l\'équipe')}
        <p style="font-size:12px;color:#7c6c58;margin-top:18px">
          Ce lien expire le <strong>${expiry}</strong>.<br/>
          En rejoignant, vous accéderez à votre espace vendeur pour gérer vos dossiers.
        </p>
      `,
    });
    return this.send({
      to: params.to,
      subject: `[AVRA] ${params.inviterName} vous invite à rejoindre ${params.workspaceName}`,
      html,
    });
  }
}

// ─── Helpers HTML (copie locale, même charte que DemandesEmailService) ──────

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
            AVRA &middot; La plateforme métier des cuisinistes, menuisiers et architectes d'intérieur
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

function formatDateFR(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
