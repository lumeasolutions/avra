import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCalendar, icsDate, IcsEvent } from './ics';

/**
 * Invitations de RDV envoyées au client (planning classique).
 *
 * Retour cofondatrice 22/09/2026 : « intégrer des liens Google Meet dans le
 * planning, sinon personne n'utilisera le planning d'AVRA ». Un RDV peut porter
 * un lien visio (Meet, Zoom, Teams, WhatsApp…) ou une adresse ; on l'envoie au
 * client par e-mail avec une invitation agenda (.ics) : le RDV arrive dans son
 * agenda, avec le bouton « Rejoindre la visio ».
 *
 * Les infos riches d'un RDV vivent dans `Event.description` (JSON, cf.
 * usePlanningStore). L'état d'envoi est stocké sous la clé `invite`, que seul
 * le serveur écrit (préservée lors des mises à jour du front, cf. EventsService).
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

export type InviteKind = 'invite' | 'update' | 'cancel';

export interface InviteState {
  to: string;
  name?: string;
  titre: string;
  sentAt: string;
  sequence: number;
  status: 'ENVOYEE' | 'ANNULEE';
}

export function parseEventJson(description?: string | null): Record<string, any> {
  if (!description) return {};
  try {
    const v = JSON.parse(description);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function isHttpUrl(s: unknown): s is string {
  if (typeof s !== 'string' || !s.trim()) return false;
  try {
    const u = new URL(s.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const TZ = 'Europe/Paris';
function dateLongueFR(d: Date): string {
  const s = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function heureFR(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d).replace(':', 'h');
}
function dureeFR(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Nom lisible du service de visio (affiché dans l'e-mail). */
export function visioProvider(url: string): string {
  const h = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
  if (h.endsWith('meet.google.com')) return 'Google Meet';
  if (h.includes('zoom.')) return 'Zoom';
  if (h.includes('teams.microsoft') || h.includes('teams.live')) return 'Microsoft Teams';
  if (h.includes('whatsapp')) return 'WhatsApp';
  if (h.includes('jit.si') || h.includes('jitsi')) return 'Jitsi';
  if (h.includes('whereby')) return 'Whereby';
  if (h.includes('webex')) return 'Webex';
  return 'visio';
}

interface Societe { nom: string; email?: string; phone?: string; adresse?: string; siteWeb?: string; logo?: string }

@Injectable()
export class EventInviteService {
  private readonly logger = new Logger(EventInviteService.name);
  private readonly apiKey = process.env.RESEND_API_KEY ?? null;
  private readonly from = process.env.EMAIL_FROM ?? 'AVRA <onboarding@resend.dev>';

  constructor(private readonly prisma: PrismaService) {}

  private async societe(workspaceId: string, userId: string): Promise<Societe & { replyTo?: string }> {
    const [settings, ws, user] = await Promise.all([
      this.prisma.workspaceSettings.findUnique({ where: { workspaceId }, select: { extra: true } }),
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ]);
    const s = ((settings?.extra as any)?.societe ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const ligne2 = [str(s.codePostal), str(s.ville)].filter(Boolean).join(' ');
    const adresse = [str(s.adresse), ligne2 || undefined].filter(Boolean).join(', ') || undefined;
    const email = str(s.email);
    return {
      nom: str(s.nom) ?? ws?.name ?? 'AVRA',
      email,
      phone: str(s.phone),
      adresse,
      siteWeb: str(s.siteWeb),
      replyTo: email ?? user?.email ?? undefined,
    };
  }

  private buildFrom(name: string): string {
    const m = this.from.match(/<([^>]+)>/);
    const addr = m ? m[1] : this.from;
    const clean = name.replace(/["<>\r\n]/g, '').trim().slice(0, 80);
    return clean ? `${clean} <${addr}>` : this.from;
  }

  async send(
    workspaceId: string,
    userId: string,
    eventId: string,
    input: { kind: InviteKind; to?: string; name?: string; titre?: string; message?: string },
  ) {
    if (!this.apiKey) {
      throw new ServiceUnavailableException("L'envoi d'e-mails n'est pas configuré sur ce serveur.");
    }
    const ev = await this.prisma.event.findFirst({
      where: { id: eventId, workspaceId },
      select: { id: true, title: true, startAt: true, endAt: true, location: true, description: true },
    });
    if (!ev) throw new NotFoundException('RDV introuvable.');

    const data = parseEventJson(ev.description);
    const prev: InviteState | undefined = data.invite && typeof data.invite === 'object' ? data.invite : undefined;

    const to = (input.to ?? prev?.to ?? '').trim().toLowerCase();
    if (!to) throw new BadRequestException("Adresse e-mail du client manquante.");
    if (input.kind === 'cancel' && !prev) throw new BadRequestException("Aucune invitation n'a été envoyée pour ce RDV.");

    const societe = await this.societe(workspaceId, userId);
    const titre = (input.titre ?? prev?.titre ?? 'Rendez-vous').trim().slice(0, 150) || 'Rendez-vous';
    const name = (input.name ?? prev?.name ?? '').trim().slice(0, 120) || undefined;
    const message = (input.message ?? '').trim().slice(0, 2000);

    const start = new Date(ev.startAt);
    const end = ev.endAt ? new Date(ev.endAt) : new Date(start.getTime() + 60 * 60000);
    const durMin = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
    const visioUrl = isHttpUrl(data.visioUrl) ? data.visioUrl.trim() : undefined;
    const lieu = (typeof data.location === 'string' && data.location.trim()) || ev.location?.trim() || undefined;
    const sequence = prev ? prev.sequence + 1 : 0;
    const summary = `${titre} — ${societe.nom}`;

    // ── Invitation agenda (.ics) ──
    const descLines = [
      message,
      visioUrl ? `Rejoindre la visio (${visioProvider(visioUrl)}) : ${visioUrl}` : '',
      lieu ? `Lieu : ${lieu}` : '',
      [societe.nom, societe.phone, societe.email].filter(Boolean).join(' · '),
    ].filter(Boolean);
    const icsEvent: IcsEvent = {
      uid: `rdv-${ev.id}@avra.fr`,
      start, end,
      summary,
      description: descLines.join('\n\n'),
      location: visioUrl ?? lieu,
      url: visioUrl,
      sequence,
      status: input.kind === 'cancel' ? 'CANCELLED' : 'CONFIRMED',
      organizer: societe.replyTo ? { name: societe.nom, email: societe.replyTo } : undefined,
      attendee: { name, email: to },
    };
    const method = input.kind === 'cancel' ? 'CANCEL' : 'REQUEST';
    const ics = buildCalendar([icsEvent], { method });

    // ── E-mail ──
    const quand = `${dateLongueFR(start)} à ${heureFR(start)}`;
    const sujet = input.kind === 'cancel'
      ? `Annulé : ${titre} du ${dateLongueFR(start).toLowerCase()}`
      : input.kind === 'update'
        ? `Modifié : ${titre} — ${quand}`
        : `${titre} — ${quand}`;
    const googleLink = input.kind === 'cancel' ? '' : (() => {
      const p = new URLSearchParams({
        action: 'TEMPLATE',
        text: summary,
        dates: `${icsDate(start)}/${icsDate(end)}`,
        details: descLines.join('\n\n'),
        location: visioUrl ?? lieu ?? '',
      });
      return `https://calendar.google.com/calendar/render?${p.toString()}`;
    })();
    const html = this.html({ kind: input.kind, societe, name, titre, quand, duree: dureeFR(durMin), visioUrl, lieu, message, googleLink });

    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.buildFrom(societe.nom),
        to,
        subject: sujet,
        html,
        ...(societe.replyTo ? { reply_to: societe.replyTo } : {}),
        attachments: [{
          filename: input.kind === 'cancel' ? 'annulation.ics' : 'invitation.ics',
          content: Buffer.from(ics, 'utf8').toString('base64'),
          content_type: `text/calendar; charset=utf-8; method=${method}`,
        }],
      }),
    }).catch((err) => {
      this.logger.error(`[invite] réseau : ${err?.message ?? err}`);
      return null;
    });
    if (!res || !res.ok) {
      const txt = res ? await res.text().catch(() => '') : '';
      this.logger.error(`[invite] Resend ${res?.status ?? '—'} : ${txt}`);
      throw new ServiceUnavailableException("L'e-mail n'a pas pu être envoyé. Réessayez dans un instant.");
    }

    const invite: InviteState = {
      to, name, titre,
      sentAt: new Date().toISOString(),
      sequence,
      status: input.kind === 'cancel' ? 'ANNULEE' : 'ENVOYEE',
    };
    await this.prisma.event.update({
      where: { id: ev.id },
      data: { description: JSON.stringify({ ...data, invite }) },
    });
    return { ok: true, invite };
  }

  private html(p: {
    kind: InviteKind; societe: Societe; name?: string; titre: string; quand: string; duree: string;
    visioUrl?: string; lieu?: string; message?: string; googleLink: string;
  }): string {
    const vert = '#304035';
    const cuivre = '#a67749';
    const titreBloc = p.kind === 'cancel' ? 'Rendez-vous annulé' : p.kind === 'update' ? 'Rendez-vous modifié' : 'Votre rendez-vous';
    const intro = p.kind === 'cancel'
      ? 'Le rendez-vous ci-dessous est annulé. Il sera retiré de votre agenda si vous l’y aviez ajouté.'
      : p.kind === 'update'
        ? 'Votre rendez-vous a été modifié. Voici les nouvelles informations (elles remplacent les précédentes).'
        : 'Voici les informations de votre rendez-vous. Il est joint à cet e-mail pour l’ajouter à votre agenda en un clic.';
    const barre = p.kind === 'cancel' ? 'text-decoration:line-through;color:#8a8a8a;' : '';
    const bonjour = p.name ? `Bonjour ${escapeHtml(p.name)},` : 'Bonjour,';
    const ligne = (label: string, val: string) =>
      `<tr><td style="padding:6px 0;color:#7a7a72;font-size:13px;width:90px;vertical-align:top">${label}</td><td style="padding:6px 0;color:${vert};font-size:14px;font-weight:600;${barre}">${val}</td></tr>`;
    const visio = p.visioUrl && p.kind !== 'cancel'
      ? `<div style="margin:22px 0 6px;text-align:center">
           <a href="${escapeHtml(p.visioUrl)}" style="display:inline-block;background:${vert};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">🎥 Rejoindre la visio (${escapeHtml(visioProvider(p.visioUrl))})</a>
           <p style="margin:10px 0 0;font-size:12px;color:#7a7a72;word-break:break-all">ou copiez ce lien : <a href="${escapeHtml(p.visioUrl)}" style="color:${cuivre}">${escapeHtml(p.visioUrl)}</a></p>
         </div>`
      : '';
    const message = p.message
      ? `<p style="margin:18px 0 0;padding:12px 14px;background:#f7f3ee;border-radius:10px;color:#3d3328;font-size:14px;white-space:pre-wrap">${escapeHtml(p.message)}</p>`
      : '';
    const agenda = p.googleLink
      ? `<p style="margin:18px 0 0;font-size:12px;color:#7a7a72;text-align:center">Pas encore dans votre agenda ? Ouvrez la pièce jointe <b>invitation.ics</b> ou <a href="${escapeHtml(p.googleLink)}" style="color:${cuivre}">ajoutez-le à Google Agenda</a>.</p>`
      : '';
    const contact = [p.societe.phone, p.societe.email].filter(Boolean).map((x) => escapeHtml(x!)).join(' · ');
    return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f1ec;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="background:#ffffff;border-radius:18px;padding:28px 26px;box-shadow:0 2px 10px rgba(48,64,53,0.06)">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${cuivre}">${escapeHtml(p.societe.nom)}</p>
    <h1 style="margin:0 0 16px;font-size:21px;color:${vert}">${titreBloc}</h1>
    <p style="margin:0 0 6px;font-size:14px;color:#3d3328">${bonjour}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#3d3328;line-height:1.5">${intro}</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee">
      ${ligne('Objet', escapeHtml(p.titre))}
      ${ligne('Quand', escapeHtml(p.quand))}
      ${ligne('Durée', escapeHtml(p.duree))}
      ${p.visioUrl ? ligne('Où', `En visio (${escapeHtml(visioProvider(p.visioUrl))})`) : p.lieu ? ligne('Où', escapeHtml(p.lieu)) : ''}
    </table>
    ${visio}
    ${message}
    ${agenda}
  </div>
  <p style="margin:18px 0 0;text-align:center;font-size:12px;color:#7a7a72;line-height:1.6">
    ${escapeHtml(p.societe.nom)}${p.societe.adresse ? ` — ${escapeHtml(p.societe.adresse)}` : ''}<br/>
    ${contact}${contact ? '<br/>' : ''}Pour toute question, répondez simplement à cet e-mail.
  </p>
</div></body></html>`;
  }
}
