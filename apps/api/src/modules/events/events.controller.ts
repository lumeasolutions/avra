import { Body, Controller, Get, Param, Post, Put, Delete, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { EventInviteService, isHttpUrl, parseEventJson, visioProvider } from './event-invite.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SendInviteDto } from './dto/send-invite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import { IcalTokenService } from '../demandes/ical-feed.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCalendar, IcsEvent } from './ics';
import type { JwtPayload } from '@avra/types';
import { EventCalendarType } from '../../prisma-enums';

const FEED_PATH = (token: string) => `/api/v1/calendar/p/${token}.ics`;

// REST 13/07/2026 — RBAC ajouté : le planning est interne au workspace (rôles
// pro). Les mutations sont réservées OWNER/ADMIN/MEMBER (lecture ouverte à tous
// les membres authentifiés du workspace).
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly invites: EventInviteService,
    private readonly icalTokens: IcalTokenService,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEventDto) {
    return this.events.create(user.workspaceId, user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('calendarType') calendarType?: EventCalendarType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.events.findAll(
      user.workspaceId, calendarType, fromDate, toDate,
      page ? Number(page) : 1, pageSize ? Number(pageSize) : 100,
    );
  }

  /**
   * Lien d'abonnement agenda (Google Agenda / Outlook / iPhone) du planning.
   * Même jeton personnel que le flux intervenant (User.icalToken).
   * Déclaré AVANT `:id` pour ne pas être capturé par la route paramétrée.
   */
  @Get('abonnement-agenda')
  async calendarFeedUrl(@CurrentUser() user: JwtPayload) {
    const token = await this.icalTokens.ensureToken(user.sub);
    return { path: FEED_PATH(token) };
  }

  /** Régénère le lien (l'ancien cesse de fonctionner). */
  @Post('abonnement-agenda/regenerer')
  async rotateCalendarFeed(@CurrentUser() user: JwtPayload) {
    const token = await this.icalTokens.rotateToken(user.sub);
    return { path: FEED_PATH(token) };
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.events.findOne(user.workspaceId, id);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(user.workspaceId, id, dto);
  }

  /** Envoie (ou met à jour / annule) l'invitation du RDV au client par e-mail + .ics. */
  @Post(':id/invitation')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @Throttle({ default: { ttl: 3_600_000, limit: 60 } })
  sendInvite(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendInviteDto,
  ) {
    return this.invites.send(user.workspaceId, user.sub, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.events.remove(user.workspaceId, id);
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * FLUX AGENDA PUBLIC du planning — lu sans connexion par Google Agenda,
 * Outlook, Apple Calendar (« S'abonner à un agenda »). Sécurité : jeton
 * aléatoire 256 bits propre à l'utilisateur, régénérable.
 * ───────────────────────────────────────────────────────────────────── */
@Controller('calendar')
export class PlanningPublicCalendarController {
  constructor(
    private readonly events: EventsService,
    private readonly icalTokens: IcalTokenService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('p/:token.ics')
  async feed(@Param('token') token: string, @Query('gestion') gestion: string | undefined, @Res() res: Response) {
    const userId = /^[a-f0-9]{64}$/i.test(token ?? '') ? await this.icalTokens.findUserIdByToken(token) : null;
    const memberships = userId
      ? await this.prisma.userWorkspace.findMany({
          where: { userId, status: 'ACTIVE' as any },
          select: { workspaceId: true, workspace: { select: { name: true } } },
        })
      : [];
    if (!userId || memberships.length === 0) {
      res.status(404).send('Not found');
      return;
    }
    const withGestion = gestion === '1';
    const rows = await this.events.forCalendarFeed(memberships.map((m) => m.workspaceId), withGestion);
    const webUrl = (process.env.WEB_URL ?? 'https://avra-app.fr').replace(/\/$/, '');

    const list: IcsEvent[] = rows.map((r) => {
      const x = parseEventJson(r.description);
      const start = new Date(r.startAt);
      const end = r.endAt ? new Date(r.endAt) : new Date(start.getTime() + 60 * 60000);
      const visio = isHttpUrl(x.visioUrl) ? String(x.visioUrl).trim() : undefined;
      const lieu = (typeof x.location === 'string' && x.location.trim()) || r.location?.trim() || undefined;
      const titre = (r.calendarType === 'GESTION' ? (x.client || r.title) : (x.title || r.title)) || 'RDV';
      const dossier = r.project?.name ?? undefined;
      const desc = [
        visio ? `Rejoindre la visio (${visioProvider(visio)}) : ${visio}` : '',
        dossier ? `Dossier : ${dossier}` : '',
        x.invite?.to ? `Invitation envoyée à ${x.invite.to}${x.invite.status === 'ANNULEE' ? ' (annulée)' : ''}` : '',
        `Ouvrir le planning AVRA : ${webUrl}/${r.calendarType === 'GESTION' ? 'planning-gestion' : 'planning'}`,
      ].filter(Boolean).join('\n');
      return {
        uid: `avra-${r.id}@avra.fr`,
        start, end,
        summary: `${visio ? '🎥 ' : ''}${String(titre).slice(0, 200)}`,
        description: desc,
        location: visio ?? lieu,
        url: visio,
        status: 'CONFIRMED',
      };
    });

    const nom = memberships.length === 1 ? memberships[0].workspace?.name : undefined;
    const ics = buildCalendar(list, { method: 'PUBLISH', name: `AVRA — Planning${nom ? ` ${nom}` : ''}` });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="avra-planning.ics"');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.send(ics);
  }
}
