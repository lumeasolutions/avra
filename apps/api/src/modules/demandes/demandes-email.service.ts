import { Injectable, Logger } from '@nestjs/common';

/**
 * Service email pour les notifications du module Demandes.
 *
 * Utilise l'API HTTP Resend directement (pas de SDK pour eviter une dep
 * supplementaire dans apps/api). Tous les envois sont fire-and-forget :
 * un echec d'email ne bloque jamais l'operation metier.
 *
 * Variables d'env :
 *   RESEND_API_KEY    — cle API Resend (obligatoire pour activer les envois)
 *   EMAIL_FROM        — expediteur (defaut "AVRA <onboarding@resend.dev>")
 *   WEB_URL           — URL publique du frontend (pour les liens dans les emails)
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class DemandesEmailService {
  private readonly logger = new Logger(DemandesEmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? null;
  private readonly from = process.env.EMAIL_FROM ?? 'AVRA <onboarding@resend.dev>';
  private readonly webUrl = (process.env.WEB_URL ?? 'https://avra.fr').replace(/\/$/, '');

  private get enabled(): boolean {
    return !!this.apiKey;
  }

  /** Envoie via l'API Resend (fire-and-forget). */
  /** Adresse de réponse à jeton : <token>@INBOUND_REPLY_DOMAIN. Permet à la réponse
   *  de l'intervenant de revenir DANS AVRA (webhook), rangée dans la bonne demande.
   *  Si non configuré -> undefined (fallback sur l'e-mail direct). */
  private inboundReplyTo(token?: string): string | undefined {
    const d = process.env.INBOUND_REPLY_DOMAIN;
    return d && token ? `${token}@${d}` : undefined;
  }

  /** Expéditeur : garde l'adresse du domaine vérifié mais AFFICHE le nom fourni
   *  (ex. le nom de l'utilisateur AVRA), pour que l'intervenant voie qui écrit. */
  private buildFrom(fromName?: string): string {
    if (!fromName) return this.from;
    const m = this.from.match(/<([^>]+)>/);
    const addr = m ? m[1] : this.from;
    const clean = fromName.replace(/["<>\r\n]/g, '').trim().slice(0, 80);
    return clean ? `${clean} <${addr}>` : this.from;
  }

  private async send(opts: { to: string; subject: string; html: string; fromName?: string; replyTo?: string }): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`[email] RESEND_API_KEY manquante — envoi ignore : "${opts.subject}"`);
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
          from: this.buildFrom(opts.fromName),
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
          ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        this.logger.error(`[email] Resend ${res.status}: ${txt}`);
      }
    } catch (err: any) {
      this.logger.error(`[email] envoi echoue : ${err?.message ?? err}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Templates
  // ────────────────────────────────────────────────────────────────────

  /**
   * Notification "nouvelle demande" envoyee a l'intervenant.
   * Si l'intervenant a un compte AVRA : lien vers /intervenant/demandes/<id>
   * Sinon : on indique qu'il doit accepter une invitation.
   */
  async notifyDemandeCreated(params: {
    to: string;
    intervenantName: string;
    proName: string;
    workspaceName: string;
    demandeId: string;
    type: string;
    title: string;
    notes?: string | null;
    scheduledFor?: Date | null;
    hasAccount: boolean;
    /** Jeton public (lien sans login). Si présent, on affiche les boutons d'action. */
    publicToken?: string;
    /** E-mail de l'utilisateur AVRA (pour Reply-To : l'intervenant lui répond directement). */
    proEmail?: string;
  }): Promise<void> {
    const base = params.publicToken
      ? `${this.webUrl}/intervention/${params.publicToken}`
      : (params.hasAccount ? `${this.webUrl}/intervenant/demandes/${params.demandeId}` : `${this.webUrl}/login`);
    const link = base;
    const cta = 'Voir la demande et répondre';

    const scheduledStr = params.scheduledFor
      ? `<p style="margin:12px 0;color:#7c4f1d"><strong>Date prevue :</strong> ${formatDateFR(params.scheduledFor)}</p>`
      : '';
    const notesStr = params.notes
      ? `<p style="margin:12px 0;color:#3D3328;background:#fafaf8;padding:12px 14px;border-radius:8px;white-space:pre-wrap">${escapeHtml(params.notes)}</p>`
      : '';

    const html = baseLayout({
      title: 'Nouvelle demande',
      preheader: `${params.proName} vous a envoye une demande : ${params.title}`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Nouvelle demande</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.intervenantName)},<br/>
          <strong>${escapeHtml(params.proName)}</strong> (${escapeHtml(params.workspaceName)}) vous a envoye une demande sur AVRA.
        </p>
        <div style="background:#fafaf8;border-left:4px solid #cbb98a;padding:14px 18px;border-radius:8px;margin:18px 0">
          <div style="font-size:11px;color:#7c6c58;letter-spacing:.08em;font-weight:700;text-transform:uppercase;margin-bottom:4px">${escapeHtml(params.type)}</div>
          <div style="font-size:17px;font-weight:700;color:#1a2a1e">${escapeHtml(params.title)}</div>
        </div>
        ${scheduledStr}
        ${notesStr}
        ${params.publicToken ? `
          <div style="margin:18px 0">
            <a href="${base}?do=accept" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;margin:0 8px 8px 0">Accepter</a>
            <a href="${base}?do=refuse" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;margin:0 8px 8px 0">Refuser</a>
            <a href="${base}" style="display:inline-block;background:#1a2a1e;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;margin:0 8px 8px 0">Voir &amp; répondre</a>
          </div>
          <p style="font-size:12px;color:#7c6c58;margin-top:8px">Aucun compte n'est nécessaire : cliquez simplement sur un bouton ci-dessus.</p>
        ` : ctaButton(link, cta)}
      `,
    });
    return this.send({ to: params.to, subject: `[AVRA] ${params.proName} : ${params.title}`, html, fromName: params.proName, replyTo: this.inboundReplyTo(params.publicToken) ?? params.proEmail });
  }

  /**
   * Notification "invitation envoyee" — le pro vient d'inviter l'intervenant.
   * L'email contient le lien /invitation/<token>.
   */
  async notifyInvitationSent(params: {
    to: string;
    intervenantName: string;
    proName: string;
    workspaceName: string;
    token: string;
    message?: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const link = `${this.webUrl}/invitation/${params.token}`;
    const expiry = formatDateFR(params.expiresAt);
    const messageStr = params.message
      ? `<div style="background:#fff8ef;border:1px solid #fde7c2;border-radius:8px;padding:12px 16px;margin:18px 0;color:#7c4f1d">
           <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Message</div>
           <div style="font-style:italic">${escapeHtml(params.message)}</div>
         </div>`
      : '';

    const html = baseLayout({
      title: 'Vous etes invite·e',
      preheader: `${params.proName} vous invite a collaborer sur AVRA`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Vous etes invite·e</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.intervenantName)},<br/>
          <strong>${escapeHtml(params.proName)}</strong> (${escapeHtml(params.workspaceName)}) souhaite collaborer avec vous via AVRA pour le suivi de ses chantiers.
        </p>
        ${messageStr}
        ${ctaButton(link, "Accepter l'invitation")}
        <p style="font-size:12px;color:#7c6c58;margin-top:18px">
          Ce lien expire le <strong>${expiry}</strong>.<br/>
          Si vous n'avez pas de compte, vous pourrez en creer un avec cette adresse email.
        </p>
      `,
    });
    return this.send({ to: params.to, subject: `[AVRA] ${params.proName} vous invite a collaborer`, html });
  }

  /**
   * Notification "nouveau message" envoyee au destinataire (pro ou intervenant).
   * Limite a 1 par minute par demande pour eviter les spam quand plusieurs
   * messages s'enchainent.
   */
  async notifyNewMessage(params: {
    to: string;
    recipientName: string;
    senderName: string;
    senderRole: 'pro' | 'intervenant';
    demandeId: string;
    demandeTitle: string;
    messageBody: string;
    /** E-mail de l'expéditeur (pour Reply-To : le destinataire lui répond directement). */
    senderEmail?: string;
    /** Jeton de la demande : si message pro -> intervenant, la réponse revient dans AVRA. */
    replyToToken?: string;
  }): Promise<void> {
    // Tronque le message en preview (preview uniquement dans le mail)
    const preview = params.messageBody.length > 280
      ? params.messageBody.slice(0, 280) + '…'
      : params.messageBody;
    const link = params.senderRole === 'pro'
      ? `${this.webUrl}/intervenant/demandes/${params.demandeId}`
      : `${this.webUrl}/intervenants?demande=${params.demandeId}`;

    const html = baseLayout({
      title: 'Nouveau message',
      preheader: `${params.senderName} : ${preview.slice(0, 60)}`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Nouveau message</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.recipientName)},<br/>
          <strong>${escapeHtml(params.senderName)}</strong> vous a envoye un message a propos de :
        </p>
        <div style="background:#fafaf8;padding:12px 14px;border-radius:8px;font-size:14px;font-weight:600;color:#1a2a1e;margin-bottom:14px">
          ${escapeHtml(params.demandeTitle)}
        </div>
        <div style="background:#fff;border-left:4px solid #cbb98a;padding:14px 18px;border-radius:8px;margin:14px 0;color:#3D3328;white-space:pre-wrap;font-style:italic">
          ${escapeHtml(preview)}
        </div>
        ${ctaButton(link, 'Voir et repondre')}
      `,
    });
    return this.send({ to: params.to, subject: `[AVRA] Message de ${params.senderName} — ${params.demandeTitle}`, html, fromName: params.senderName, replyTo: params.senderRole === 'pro' ? (this.inboundReplyTo(params.replyToToken) ?? params.senderEmail) : params.senderEmail });
  }

  /**
   * Notification au pro quand l'intervenant change le statut.
   * (Accept / Refuse / Start / Complete).
   */
  async notifyStatusChange(params: {
    to: string;
    proName: string;
    intervenantName: string;
    demandeId: string;
    title: string;
    fromStatus: string;
    toStatus: string;
    comment?: string | null;
  }): Promise<void> {
    const link = `${this.webUrl}/intervenants?demande=${params.demandeId}`;
    const labels: Record<string, string> = {
      ENVOYEE: 'Envoyee', VUE: 'Vue', ACCEPTEE: 'Acceptee', REFUSEE: 'Refusee',
      EN_COURS: 'En cours', TERMINEE: 'Terminee', ANNULEE: 'Annulee',
    };
    const tones: Record<string, string> = {
      ACCEPTEE: '#15803d', REFUSEE: '#b91c1c', EN_COURS: '#1d4ed8',
      TERMINEE: '#15803d', ANNULEE: '#525252',
    };
    const tone = tones[params.toStatus] ?? '#3D5449';
    const commentStr = params.comment
      ? `<div style="background:#fafaf8;padding:12px 14px;border-radius:8px;margin:12px 0;color:#3D3328;white-space:pre-wrap;font-style:italic">« ${escapeHtml(params.comment)} »</div>`
      : '';

    const html = baseLayout({
      title: 'Mise a jour de demande',
      preheader: `${params.intervenantName} a mis a jour : ${params.title}`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Mise a jour de demande</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.proName)},<br/>
          <strong>${escapeHtml(params.intervenantName)}</strong> a mis a jour le statut de la demande :
        </p>
        <div style="background:#fafaf8;border-radius:10px;padding:14px 18px;margin:18px 0">
          <div style="font-size:14px;font-weight:600;color:#1a2a1e;margin-bottom:8px">${escapeHtml(params.title)}</div>
          <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${tone};color:#fff;font-size:12px;font-weight:700">
            ${labels[params.toStatus] ?? params.toStatus}
          </div>
        </div>
        ${commentStr}
        ${ctaButton(link, 'Voir la demande')}
      `,
    });
    return this.send({
      to: params.to,
      subject: `[AVRA] ${params.intervenantName} : ${labels[params.toStatus] ?? params.toStatus} — ${params.title}`,
      html,
    });
  }
}

// ─── Helpers HTML ─────────────────────────────────────────────────────────

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
            Vous recevez cet email parce que vous avez ete identifie·e comme intervenant ou client professionnel.
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
  }) + ' a ' + new Date(d).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });
}
