import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Genere un token HMAC determinique pour un User. Ce token est utilise dans
 * l'URL publique du flux iCal pour permettre l'abonnement par Google/Apple
 * Calendar (qui font des requetes anonymes sans cookie de session).
 *
 * Securite :
 * - Token derive du userId + secret serveur (ICAL_SECRET ou fallback JWT_SECRET)
 * - Pour invalider un lien, l'admin peut faire tourner ICAL_SECRET
 * - Token donne acces uniquement au planning de l'intervenant (read-only)
 */
export function buildIcalToken(userId: string): string {
  const secret = process.env.ICAL_SECRET ?? process.env.JWT_SECRET ?? 'avra-ical-dev-secret';
  return crypto.createHmac('sha256', secret).update(userId).digest('hex').slice(0, 32);
}

export function verifyIcalToken(userId: string, token: string): boolean {
  const expected = buildIcalToken(userId);
  // timingSafeEqual pour eviter les timing attacks
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch { return false; }
}

/**
 * Demande shape minimal pour la generation iCal.
 * On evite le type genere Prisma pour rester portable.
 */
interface DemandeForIcal {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  status: string;
  scheduledFor: Date | null;
  project?: { name: string; reference: string | null } | null;
}

/**
 * Genere un flux iCalendar (.ics) RFC 5545 a partir d'une liste de demandes
 * scheduledFor. Format minimal valide, importable dans Google Calendar,
 * Apple Calendar, Outlook.
 */
@Injectable()
export class ICalFeedService {
  generate(demandes: DemandeForIcal[], calendarName: string): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AVRA//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escape(calendarName)}`,
      `X-WR-TIMEZONE:Europe/Paris`,
    ];

    for (const d of demandes) {
      if (!d.scheduledFor) continue;
      // Duree par defaut : 2h. On peut ameliorer avec d.duration plus tard.
      const start = new Date(d.scheduledFor);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const uid = `demande-${d.id}@avra.fr`;
      const dtstamp = formatICalDate(new Date());
      const dtstart = formatICalDate(start);
      const dtend = formatICalDate(end);
      const summary = `${d.type} — ${d.title}`;
      const project = d.project?.name ? `\\nProjet : ${d.project.name}${d.project.reference ? ' (' + d.project.reference + ')' : ''}` : '';
      const description = `${d.notes ?? ''}${project}\\n\\nVoir sur AVRA : https://avra.fr/intervenant/demandes/${d.id}`;
      const status = d.status === 'ANNULEE' ? 'CANCELLED' : d.status === 'TERMINEE' ? 'CONFIRMED' : 'TENTATIVE';

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${escape(summary)}`,
        `DESCRIPTION:${escape(description)}`,
        `STATUS:${status}`,
        `URL:https://avra.fr/intervenant/demandes/${d.id}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}

/** YYYYMMDDTHHMMSSZ (UTC). */
function formatICalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Echappe les caracteres speciaux ICS (RFC 5545 §3.3.11). */
function escape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
