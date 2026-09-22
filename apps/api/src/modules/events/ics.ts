/**
 * Génération iCalendar (RFC 5545) pour les RDV du planning.
 *
 * - Invitation envoyée au client (METHOD:REQUEST / CANCEL) : pièce jointe .ics
 *   que Gmail, Outlook et Apple Mail proposent d'ajouter à l'agenda.
 * - Flux d'abonnement (METHOD:PUBLISH) : Google Agenda / Outlook / iPhone
 *   affichent les RDV AVRA dans l'agenda habituel de l'utilisateur.
 *
 * Horaires en UTC (suffixe Z) : pas de VTIMEZONE à maintenir, chaque agenda
 * convertit dans le fuseau de son utilisateur.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  sequence?: number;
  status?: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
  organizer?: { name?: string; email: string };
  attendee?: { name?: string; email: string };
}

export function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

/** Échappement des valeurs texte (RFC 5545 §3.3.11). */
export function icsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Paramètre (CN=...) : guillemets interdits, entoure si caractères spéciaux. */
function icsParam(s: string): string {
  const clean = s.replace(/["\r\n]/g, '').trim();
  return /[;:,]/.test(clean) ? `"${clean}"` : clean;
}

/** Repli des lignes à 75 octets (RFC 5545 §3.1), sans couper un caractère UTF-8. */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  let curLen = 0;
  let limit = 75;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, 'utf8');
    if (curLen + len > limit) {
      parts.push(cur);
      cur = '';
      curLen = 0;
      limit = 74; // les lignes de continuation commencent par un espace
    }
    cur += ch;
    curLen += len;
  }
  if (cur) parts.push(cur);
  return parts.join('\r\n ');
}

function vevent(e: IcsEvent): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SEQUENCE:${e.sequence ?? 0}`,
    `SUMMARY:${icsText(e.summary)}`,
  ];
  if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`);
  if (e.location) lines.push(`LOCATION:${icsText(e.location)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  if (e.status) lines.push(`STATUS:${e.status}`);
  if (e.organizer) {
    lines.push(`ORGANIZER${e.organizer.name ? `;CN=${icsParam(e.organizer.name)}` : ''}:mailto:${e.organizer.email}`);
  }
  if (e.attendee) {
    lines.push(
      `ATTENDEE${e.attendee.name ? `;CN=${icsParam(e.attendee.name)}` : ''};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:${e.attendee.email}`,
    );
  }
  if (e.status !== 'CANCELLED') {
    // Rappel 30 min avant (repris par Google / Apple / Outlook).
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.summary)}`, 'TRIGGER:-PT30M', 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines;
}

export function buildCalendar(
  events: IcsEvent[],
  opts: { method: 'PUBLISH' | 'REQUEST' | 'CANCEL'; name?: string },
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AVRA//Planning//FR',
    'CALSCALE:GREGORIAN',
    `METHOD:${opts.method}`,
  ];
  if (opts.name) {
    lines.push(`X-WR-CALNAME:${icsText(opts.name)}`, 'X-WR-TIMEZONE:Europe/Paris', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H');
  }
  for (const e of events) lines.push(...vevent(e));
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
