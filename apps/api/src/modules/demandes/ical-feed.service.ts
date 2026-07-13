import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Per-user, rotatable iCal token (HIGH-003).
 *
 * Previously, the token was a deterministic HMAC(userId, ICAL_SECRET) — which
 * meant invalidating one user's feed required rotating the global secret and
 * breaking everyone. Now the token is stored on User.icalToken (random 256-bit
 * hex), generated lazily on first request, and rotated via /auth/rotate-ical-token.
 *
 * The legacy HMAC continues to work transparently as a fallback so existing
 * subscriptions don't break the moment this code ships — they migrate the
 * first time the user hits "Rotate" or re-fetches a feed URL from the UI.
 */

const ICAL_TOKEN_BYTES = 32; // 256 bits → 64 hex chars

function legacyHmac(userId: string): string {
  const secret = process.env.ICAL_SECRET ?? process.env.JWT_SECRET ?? 'avra-ical-dev-secret';
  return crypto.createHmac('sha256', secret).update(userId).digest('hex').slice(0, 32);
}

/** @deprecated kept for tests/back-compat — use IcalTokenService.findUserByToken. */
export function buildIcalToken(userId: string): string {
  // For freshly issued tokens we generate a random one; keep the helper
  // returning the legacy HMAC for back-compat with any caller that still
  // expects deterministic output.
  return legacyHmac(userId);
}

/** @deprecated use IcalTokenService.findUserByToken (constant-time DB lookup). */
export function verifyIcalToken(userId: string, token: string): boolean {
  const expected = legacyHmac(userId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch { return false; }
}

@Injectable()
export class IcalTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the user's current iCal token, creating one on demand. */
  async ensureToken(userId: string): Promise<string> {
    const u: any = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { icalToken: true },
    });
    if (u?.icalToken) return u.icalToken;
    return this.rotateToken(userId);
  }

  /** Generates a fresh random token, stores it, and returns it. */
  async rotateToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(ICAL_TOKEN_BYTES).toString('hex');
    await (this.prisma as any).user.update({
      where: { id: userId },
      data: { icalToken: token },
    });
    return token;
  }

  /**
   * Constant-time-ish lookup: query by token (unique index), then verify
   * byte-equality with timingSafeEqual to defeat compare-as-string timing.
   * Falls back to the legacy HMAC scheme for old subscription URLs.
   */
  async findUserIdByToken(token: string): Promise<string | null> {
    if (!token || typeof token !== 'string') return null;
    // 1) New scheme — random 64-hex stored on User.icalToken
    if (/^[a-f0-9]{64}$/i.test(token)) {
      const u: any = await (this.prisma as any).user.findFirst({
        where: { icalToken: token, isActive: true },
        select: { id: true, icalToken: true },
      });
      if (u?.icalToken) {
        const a = Buffer.from(token);
        const b = Buffer.from(u.icalToken);
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) return u.id;
      }
      return null;
    }
    // 2) Legacy 32-hex HMAC — search by recomputation. Best-effort during the
    //    transition window. We can't index on it, so we accept O(N) over the
    //    handful of intervenants exposed here, gated by the format check.
    if (/^[a-f0-9]{32}$/i.test(token)) {
      // INFO-2 (passe-2): cap the legacy O(N) scan at 5000 intervenant users.
      //   This path exists only for backwards-compat with HMAC tokens issued
      //   before HIGH-3 introduced per-user random tokens stored in DB.
      //   TODO(remove 30 days after passe-2 ships): drop legacy scheme entirely.
      const candidates: any[] = await (this.prisma as any).user.findMany({
        where: { isActive: true, intervenantProfiles: { some: {} } },
        select: { id: true },
        take: 5000,
      });
      for (const c of candidates) {
        if (verifyIcalToken(c.id, token)) return c.id;
      }
    }
    return null;
  }
}

interface DemandeForIcal {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  status: string;
  scheduledFor: Date | null;
  project?: { name: string; reference: string | null } | null;
}

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
      const start = new Date(d.scheduledFor);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const uid = `demande-${d.id}@avra.fr`;
      const dtstamp = formatICalDate(new Date());
      const dtstart = formatICalDate(start);
      const dtend = formatICalDate(end);
      const summary = `${d.type} — ${d.title}`;
      const project = d.project?.name ? `\\nProjet : ${d.project.name}${d.project.reference ? ' (' + d.project.reference + ')' : ''}` : '';
      const description = `${d.notes ?? ''}${project}\\n\\nVoir sur AVRA : https://avra-app.fr/intervenant/demandes/${d.id}`;
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
        `URL:https://avra-app.fr/intervenant/demandes/${d.id}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}

function formatICalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
