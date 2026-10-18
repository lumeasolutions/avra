import { Injectable, Logger } from '@nestjs/common';

/**
 * Service email pour les notifications du module Demandes.
 *
 * Utilise l'API HTTP Resend directement (pas de SDK pour eviter une dep
 * supplementaire dans apps/api). Un echec d'email ne bloque jamais l'operation
 * metier, mais chaque envoi RENVOIE son resultat ({ ok, id } ou { ok:false,
 * reason }) : l'appelant peut le tracer et le montrer a l'utilisateur au lieu
 * d'afficher « notifié » quoi qu'il arrive.
 *
 * Variables d'env :
 *   RESEND_API_KEY    — cle API Resend (obligatoire pour activer les envois)
 *   EMAIL_FROM        — expediteur (defaut "AVRA <onboarding@resend.dev>")
 *   WEB_URL           — URL publique du frontend (pour les liens dans les emails)
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

/** Résultat d'un envoi : `id` = identifiant du message chez Resend (preuve d'envoi). */
export type EmailSendResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: string };

/** Libellés lisibles des types de demande (les e-mails affichaient la clé brute). */
const DEMANDE_TYPE_LABELS: Record<string, string> = {
  POSE: 'Pose',
  LIVRAISON: 'Livraison',
  SAV: 'SAV',
  MESURE: 'Prise de mesure',
  DEVIS: 'Demande de devis / renseignement',
  CONFIRMATION_COMMANDE: 'Confirmation de commande',
  COMPLEMENT: 'Complément',
  AUTRE: 'Autre',
};
export function demandeTypeLabel(type: string): string {
  return DEMANDE_TYPE_LABELS[(type || '').toUpperCase()] ?? type;
}

@Injectable()
export class DemandesEmailService {
  private readonly logger = new Logger(DemandesEmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? null;
  private readonly from = process.env.EMAIL_FROM ?? 'AVRA <onboarding@resend.dev>';
  private readonly webUrl = (process.env.WEB_URL ?? 'https://avra-app.fr').replace(/\/$/, '');

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

  /** Envoie via l'API Resend. Ne lève jamais : le résultat dit si c'est parti. */
  private async send(opts: { to: string; subject: string; html: string; fromName?: string; replyTo?: string }): Promise<EmailSendResult> {
    if (!this.enabled) {
      this.logger.warn(`[email] RESEND_API_KEY manquante — envoi ignore : "${opts.subject}"`);
      return { ok: false, reason: "l'envoi d'e-mails n'est pas configuré sur le serveur" };
    }
    try {
      const body = JSON.stringify({
        from: this.buildFrom(opts.fromName),
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      });
      // Resend limite le nombre d'envois par seconde : un envoi à plusieurs
      // intervenants (chacun avec son accusé) peut dépasser la limite. Sur un
      // 429, on patiente puis on retente (3 essais) au lieu d'abandonner.
      let res: Response | null = null;
      for (let essai = 0; essai < 3; essai++) {
        res = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body,
        });
        if (res.status !== 429 || essai === 2) break;
        const apres = Number(res.headers.get('retry-after'));
        await new Promise((r) => setTimeout(r, apres > 0 && apres <= 5 ? apres * 1000 : 700 * (essai + 1)));
      }
      if (!res) return { ok: false, reason: 'le service d’e-mails est injoignable' };
      const txt = await res.text().catch(() => '');
      if (!res.ok) {
        this.logger.error(`[email] Resend ${res.status}: ${txt}`);
        return { ok: false, reason: resendErrorReason(res.status, txt) };
      }
      let id: string | null = null;
      try { id = (JSON.parse(txt) as { id?: string })?.id ?? null; } catch { /* corps vide */ }
      return { ok: true, id };
    } catch (err: any) {
      this.logger.error(`[email] envoi echoue : ${err?.message ?? err}`);
      return { ok: false, reason: 'le service d’e-mails est injoignable' };
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
    /** Nom du dossier / projet concerne (affiche dans l'email). */
    projectName?: string | null;
    hasAccount: boolean;
    /** Jeton public (lien sans login). Si présent, on affiche les boutons d'action. */
    publicToken?: string;
    /** E-mail de l'utilisateur AVRA (pour Reply-To : l'intervenant lui répond directement). */
    proEmail?: string;
  }): Promise<EmailSendResult> {
    const base = params.publicToken
      ? `${this.webUrl}/intervention/${params.publicToken}`
      : (params.hasAccount ? `${this.webUrl}/intervenant/demandes/${params.demandeId}` : `${this.webUrl}/login`);
    const link = base;
    const cta = 'Voir la demande et répondre';

    const scheduledStr = params.scheduledFor
      ? `<p style="margin:12px 0;color:#7c4f1d"><strong>Date prévue :</strong> ${formatDateFR(params.scheduledFor)}</p>`
      : '';
    const notesStr = params.notes
      ? `<p style="margin:12px 0;color:#3D3328;background:#fafaf8;padding:12px 14px;border-radius:8px">${texteLignes(params.notes)}</p>`
      : '';
    const dossierStr = params.projectName
      ? `<p style="margin:12px 0;color:#1a2a1e"><strong>Dossier :</strong> ${escapeHtml(params.projectName)}</p>`
      : '';

    // Accepter / Refuser uniquement pour les demandes Planning Gestion
    // (intervention à planifier : POSE / LIVRAISON / SAV / MESURE). Pour les
    // autres (devis, envoi de documents, compte rendu…), seul « Voir & répondre »
    // est proposé — l'intervenant n'a pas à accepter/refuser un simple envoi.
    const isPlanning = ['POSE', 'LIVRAISON', 'SAV', 'MESURE'].includes((params.type || '').toUpperCase());
    const acceptRefuseBtns = isPlanning
      ? `<a href="${base}?do=accept" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;margin:0 8px 8px 0">Accepter</a>
            <a href="${base}?do=refuse" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;margin:0 8px 8px 0">Refuser</a>
            `
      : '';

    const html = baseLayout({
      title: 'Nouvelle demande',
      preheader: `${params.proName} vous a envoyé une demande : ${params.title}`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Nouvelle demande</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.intervenantName)},<br/>
          <strong>${escapeHtml(params.proName)}</strong> (${escapeHtml(params.workspaceName)}) vous a envoyé une demande sur AVRA.
        </p>
        <div style="background:#fafaf8;border-left:4px solid #cbb98a;padding:14px 18px;border-radius:8px;margin:18px 0">
          <div style="font-size:11px;color:#7c6c58;letter-spacing:.08em;font-weight:700;text-transform:uppercase;margin-bottom:4px">${escapeHtml(demandeTypeLabel(params.type))}</div>
          <div style="font-size:17px;font-weight:700;color:#1a2a1e">${escapeHtml(params.title)}</div>
        </div>
        ${dossierStr}
        ${scheduledStr}
        ${notesStr}
        ${params.publicToken ? `
          <div style="margin:18px 0">
            ${acceptRefuseBtns}<a href="${base}" style="display:inline-block;background:#1a2a1e;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;margin:0 8px 8px 0">Voir &amp; répondre</a>
          </div>
          <p style="font-size:12px;color:#7c6c58;margin-top:8px">Aucun compte n'est nécessaire : cliquez sur le bouton ci-dessus.</p>
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
  }): Promise<EmailSendResult> {
    const link = `${this.webUrl}/invitation/${params.token}`;
    const expiry = formatDateFR(params.expiresAt);
    const messageStr = params.message
      ? `<div style="background:#fff8ef;border:1px solid #fde7c2;border-radius:8px;padding:12px 16px;margin:18px 0;color:#7c4f1d">
           <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Message</div>
           <div style="font-style:italic">${texteLignes(params.message)}</div>
         </div>`
      : '';

    const html = baseLayout({
      title: 'Vous êtes invité·e',
      preheader: `${params.proName} vous invite à collaborer sur AVRA`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Vous êtes invité·e</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.intervenantName)},<br/>
          <strong>${escapeHtml(params.proName)}</strong> (${escapeHtml(params.workspaceName)}) souhaite collaborer avec vous via AVRA pour le suivi de ses chantiers.
        </p>
        ${messageStr}
        ${ctaButton(link, "Accepter l'invitation")}
        <p style="font-size:12px;color:#7c6c58;margin-top:18px">
          Ce lien expire le <strong>${expiry}</strong>.<br/>
          Si vous n'avez pas de compte, vous pourrez en créer un avec cette adresse email.
        </p>
      `,
    });
    return this.send({ to: params.to, subject: `[AVRA] ${params.proName} vous invite à collaborer`, html });
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
  }): Promise<EmailSendResult> {
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
          <strong>${escapeHtml(params.senderName)}</strong> vous a envoyé un message à propos de :
        </p>
        <div style="background:#fafaf8;padding:12px 14px;border-radius:8px;font-size:14px;font-weight:600;color:#1a2a1e;margin-bottom:14px">
          ${escapeHtml(params.demandeTitle)}
        </div>
        <div style="background:#fff;border-left:4px solid #cbb98a;padding:14px 18px;border-radius:8px;margin:14px 0;color:#3D3328;font-style:italic">
          ${texteLignes(preview)}
        </div>
        ${ctaButton(link, 'Voir et répondre')}
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
  }): Promise<EmailSendResult> {
    const link = `${this.webUrl}/intervenants?demande=${params.demandeId}`;
    const labels: Record<string, string> = {
      ENVOYEE: 'Envoyée', VUE: 'Vue', ACCEPTEE: 'Acceptée', REFUSEE: 'Refusée',
      EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
    };
    const tones: Record<string, string> = {
      ACCEPTEE: '#15803d', REFUSEE: '#b91c1c', EN_COURS: '#1d4ed8',
      TERMINEE: '#15803d', ANNULEE: '#525252',
    };
    const tone = tones[params.toStatus] ?? '#3D5449';
    const commentStr = params.comment
      ? `<div style="background:#fafaf8;padding:12px 14px;border-radius:8px;margin:12px 0;color:#3D3328;font-style:italic">« ${texteLignes(params.comment)} »</div>`
      : '';

    const html = baseLayout({
      title: 'Mise à jour de demande',
      preheader: `${params.intervenantName} a mis à jour : ${params.title}`,
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">Mise à jour de demande</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.proName)},<br/>
          <strong>${escapeHtml(params.intervenantName)}</strong> a mis à jour le statut de la demande :
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

  /**
   * Accusé d'envoi adressé à la personne qui a envoyé la demande.
   *
   * Sert de PREUVE par e-mail : à qui, quand, quoi (dossier, objet, documents
   * transmis), avec la référence de l'e-mail parti chez Resend. Si l'e-mail à
   * l'intervenant a échoué, le message le dit clairement au lieu de rassurer.
   *
   * Pas de Reply-To : surtout pas l'adresse à jeton de la demande, sinon une
   * réponse à l'accusé serait rangée comme un message de l'intervenant.
   * Le lien public de l'intervenant (sans compte, sans expiration) n'y figure pas.
   */
  async notifySenderReceipt(params: {
    to: string;
    senderName: string;
    workspaceName: string;
    intervenantName: string;
    intervenantEmail: string;
    demandeId: string;
    type: string;
    title: string;
    notes?: string | null;
    scheduledFor?: Date | null;
    projectName?: string | null;
    sentAt: Date;
    documents: Array<{ name: string; mimeType?: string | null }>;
    /** Résultat de l'e-mail adressé à l'intervenant. */
    delivery: EmailSendResult;
  }): Promise<EmailSendResult> {
    const ok = params.delivery.ok;
    const ref = params.delivery.ok ? params.delivery.id : null;
    const link = `${this.webUrl}/intervenants?demande=${encodeURIComponent(params.demandeId)}`;
    const printLink = `${this.webUrl}/demandes/${encodeURIComponent(params.demandeId)}/print`;

    const ligne = (label: string, valeur: string) => `
      <tr>
        <td style="padding:7px 12px 7px 0;font-size:11px;font-weight:700;color:#7c6c58;text-transform:uppercase;letter-spacing:.05em;vertical-align:top;white-space:nowrap">${label}</td>
        <td style="padding:7px 0;font-size:14px;color:#1a2a1e">${valeur}</td>
      </tr>`;

    const documents = params.documents.length
      ? `<ol style="margin:6px 0 0;padding:0 0 0 20px;color:#1a2a1e;font-size:14px;line-height:1.6">
           ${params.documents.map((d) => `<li>${escapeHtml(d.name)}${d.mimeType ? ` <span style="color:#7c6c58;font-size:12px">· ${escapeHtml(formatMime(d.mimeType))}</span>` : ''}</li>`).join('')}
         </ol>`
      : `<p style="margin:6px 0 0;color:#7c6c58;font-size:14px">Aucun document joint à cette demande.</p>`;

    const bandeau = ok
      ? `<div style="background:#ecfdf3;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin:0 0 18px;color:#166534;font-size:14px">
           ✓ La demande et ses documents ont bien été envoyés par e-mail à <strong>${escapeHtml(params.intervenantName)}</strong>.
         </div>`
      : `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin:0 0 18px;color:#991b1b;font-size:14px">
           ⚠ La demande est bien enregistrée dans AVRA, mais <strong>l'e-mail à ${escapeHtml(params.intervenantName)} n'a pas pu partir</strong>
           (${escapeHtml(params.delivery.ok ? '' : params.delivery.reason)}).<br/>
           Prévenez-le directement ou relancez la demande depuis AVRA.
         </div>`;

    const html = baseLayout({
      title: ok ? "Accusé d'envoi" : "Échec d'envoi",
      preheader: ok
        ? `Envoyé à ${params.intervenantName} le ${formatDateFR(params.sentAt)} : ${params.title}`
        : `L'e-mail à ${params.intervenantName} n'est pas parti : ${params.title}`,
      footer: "Vous recevez cet accusé parce que vous avez envoyé cette demande depuis AVRA. Conservez-le : il atteste de l'envoi.",
      body: `
        <h1 style="font-size:22px;color:#1a2a1e;margin:0 0 6px">${ok ? "Accusé d'envoi" : "Échec d'envoi"}</h1>
        <p style="color:#5b5045;margin:0 0 18px">
          Bonjour ${escapeHtml(params.senderName)},<br/>
          voici le récapitulatif de la demande que vous avez envoyée depuis AVRA (${escapeHtml(params.workspaceName)}).
        </p>
        ${bandeau}
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 6px">
          ${ligne('Destinataire', `${escapeHtml(params.intervenantName)}<br/><span style="color:#7c6c58;font-size:13px">${escapeHtml(params.intervenantEmail)}</span>`)}
          ${ligne(ok ? 'Envoyé le' : 'Tentative le', `${escapeHtml(formatDateFR(params.sentAt))} <span style="color:#7c6c58;font-size:12px">(heure de Paris)</span>`)}
          ${params.projectName ? ligne('Dossier', escapeHtml(params.projectName)) : ''}
          ${ligne('Type', escapeHtml(demandeTypeLabel(params.type)))}
          ${ligne('Objet', `<strong>${escapeHtml(params.title)}</strong>`)}
          ${params.scheduledFor ? ligne('Date prévue', escapeHtml(formatDateFR(params.scheduledFor))) : ''}
        </table>
        ${params.notes ? `<p style="margin:12px 0;color:#3D3328;background:#fafaf8;padding:12px 14px;border-radius:8px">${texteLignes(params.notes)}</p>` : ''}
        <div style="background:#fafaf8;border-left:4px solid #cbb98a;padding:14px 18px;border-radius:8px;margin:18px 0">
          <div style="font-size:11px;color:#7c6c58;letter-spacing:.08em;font-weight:700;text-transform:uppercase">
            ${ok ? 'Documents transmis' : 'Documents joints à la demande'} (${params.documents.length})
          </div>
          ${documents}
        </div>
        ${ctaButton(link, 'Voir la demande dans AVRA')}
        <p style="font-size:12px;color:#7c6c58;margin:16px 0 0;line-height:1.5">
          Fiche imprimable avec l'historique complet : <a href="${printLink}" style="color:#3D5449">${escapeHtml(printLink)}</a><br/>
          Référence AVRA : ${escapeHtml(params.demandeId)}${ref ? `<br/>Référence de l'e-mail envoyé : ${escapeHtml(ref)}` : ''}
        </p>
      `,
    });
    const subject = ok
      ? `[AVRA] Accusé d'envoi — ${params.title} → ${params.intervenantName}`
      : `[AVRA] Échec d'envoi — ${params.title} → ${params.intervenantName}`;
    return this.send({ to: params.to, subject, html });
  }
}

/** Traduit une erreur Resend en raison compréhensible par le cuisiniste. */
function resendErrorReason(status: number, body: string): string {
  let message = '';
  try { message = String((JSON.parse(body) as { message?: string })?.message ?? ''); } catch { /* non JSON */ }
  if (/testing emails|verify a domain|domain is not verified/i.test(message)) {
    return "le domaine d'envoi des e-mails n'est pas vérifié";
  }
  if (status === 422 && /invalid `?to`?|email address/i.test(message)) return "l'adresse e-mail du destinataire est invalide";
  if (status === 429) return "trop d'e-mails envoyés en peu de temps, réessayez dans une minute";
  if (status === 401 || status === 403) return "le service d'e-mails a refusé l'envoi (clé d'accès)";
  return `le service d'e-mails a répondu une erreur ${status}`;
}

/** « application/pdf » → « PDF », « image/jpeg » → « JPEG »… */
function formatMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'application/pdf') return 'PDF';
  if (m.startsWith('image/')) return m.slice(6).toUpperCase().replace('SVG+XML', 'SVG');
  if (m.includes('word')) return 'Word';
  if (m.includes('sheet') || m.includes('excel')) return 'Excel';
  if (m.includes('zip')) return 'ZIP';
  return m.split('/').pop() ?? m;
}

// ─── Helpers HTML ─────────────────────────────────────────────────────────

function baseLayout(opts: { title: string; preheader: string; body: string; footer?: string }): string {
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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 18px rgba(26,42,30,.1)">
          <tr><td style="padding:24px 32px 0;text-align:center">
            <div style="font-size:11px;letter-spacing:.18em;font-weight:700;color:#3D5449;text-transform:uppercase">AVRA</div>
          </td></tr>
          <tr><td style="padding:18px 32px 32px">${opts.body}</td></tr>
          <tr><td style="padding:18px 32px;background:#fafaf8;border-top:1px solid #ece7df;text-align:center;font-size:11px;color:#7c6c58">
            AVRA · La plateforme métier des cuisinistes, menuisiers et architectes d'intérieur<br/>
            ${escapeHtml(opts.footer ?? 'Vous recevez cet email parce que vous avez été identifié·e comme intervenant ou client professionnel.')}
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

/** Texte saisi sur plusieurs lignes → HTML échappé avec de vrais <br/>.
 *  (Certains webmails, dont Infomaniak, ignorent white-space:pre-wrap.) */
function texteLignes(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br/>');
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Date lisible en heure de Paris (le serveur tourne en UTC : sans le fuseau,
 *  un rendez-vous de 9 h s'affichait 7 h ou 8 h dans les e-mails). */
function formatDateFR(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
  }) + ' à ' + new Date(d).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
}
