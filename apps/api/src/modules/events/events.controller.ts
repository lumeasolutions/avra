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
import { DATES_CHANTIER, libelleIntervention, lireJour } from './calendar-feed.labels';

/** Jour civil à Paris d'un instant, porté en minuit UTC (cf. IcsEvent.allDay). */
function jourParis(d: Date): Date {
  const [y, m, j] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, j));
}
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
    return this.events.update(user.workspaceId, id, dto, { sub: user.sub, role: user.role });
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
    return this.events.remove(user.workspaceId, id, { sub: user.sub, role: user.role });
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
  async feed(
    @Param('token') token: string,
    @Query('gestion') gestion: string | undefined,
    @Query('moi') moi: string | undefined,
    @Res() res: Response,
  ) {
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
    // « Seulement mes rendez-vous » : utile en équipe, pour ne pas voir dans
    // son agenda personnel tous les RDV des collègues.
    const seulementMoi = moi === '1' ? userId : undefined;
    const ids = memberships.map((m) => m.workspaceId);
    const [rows, projets, reglages] = await Promise.all([
      this.events.forCalendarFeed(ids, withGestion, seulementMoi),
      withGestion ? this.events.chantierForCalendarFeed(ids, seulementMoi) : Promise.resolve([]),
      withGestion
        ? this.prisma.workspaceSettings.findMany({ where: { workspaceId: { in: ids } }, select: { extra: true } })
        : Promise.resolve([]),
    ]);
    const webUrl = (process.env.WEB_URL ?? 'https://avra-app.fr').replace(/\/$/, '');
    // Métiers créés par l'utilisateur (réglages planningTypes.metiers) : leur
    // vrai libellé plutôt que la clé technique.
    const typesPerso = (reglages as Array<{ extra: unknown }>).flatMap((r) => {
      const m = (r?.extra as any)?.planningTypes?.metiers;
      return Array.isArray(m) ? m : [];
    });

    const list: IcsEvent[] = rows.map((r) => {
      const x = parseEventJson(r.description);
      const allDay = !!r.allDay;
      const start = allDay ? jourParis(new Date(r.startAt)) : new Date(r.startAt);
      const end = allDay
        ? new Date(jourParis(new Date(r.endAt ?? r.startAt)).getTime() + 86400000)
        : r.endAt ? new Date(r.endAt) : new Date(start.getTime() + 60 * 60000);
      const visio = isHttpUrl(x.visioUrl) ? String(x.visioUrl).trim() : undefined;
      const lieu = (typeof x.location === 'string' && x.location.trim()) || r.location?.trim() || undefined;
      // Intervention : « Pose cuisine · Dupont » (avant : le seul nom du client,
      // sans savoir si c'était une pose, une livraison ou un SAV).
      const titre = (r.calendarType === 'GESTION'
        ? [libelleIntervention(x.type, typesPerso), x.client || r.title].filter(Boolean).join(' · ')
        : (x.title || r.title)) || 'RDV';
      const dossier = r.project?.name ?? undefined;
      const desc = [
        visio ? `Rejoindre la visio (${visioProvider(visio)}) : ${visio}` : '',
        dossier ? `Dossier : ${dossier}` : '',
        typeof x.intervenantName === 'string' && x.intervenantName.trim() ? `Intervenant : ${x.intervenantName.trim()}` : '',
        x.invite?.to ? `Invitation envoyée à ${x.invite.to}${x.invite.status === 'ANNULEE' ? ' (annulée)' : ''}` : '',
        `Ouvrir le planning AVRA : ${webUrl}/${r.calendarType === 'GESTION' ? 'planning-gestion' : 'planning'}`,
      ].filter(Boolean).join('\n');
      return {
        uid: `avra-${r.id}@avra.fr`,
        start, end, allDay,
        summary: `${visio ? '🎥 ' : ''}${String(titre).slice(0, 200)}`,
        description: desc,
        location: visio ?? lieu,
        url: visio,
        status: 'CONFIRMED',
      };
    });

    // Dates du chantier (livraison, pose, réception… saisies à la validation du
    // projet) en journées entières, avec le planning gestion.
    const min = Date.now() - 90 * 86400000;
    const max = Date.now() + 400 * 86400000;
    for (const p of projets as Array<{ id: string; name: string; dossierBoard: unknown }>) {
      const board = p.dossierBoard as { dates?: Record<string, unknown>; validees?: Record<string, unknown> } | null;
      if (!board?.dates || typeof board.dates !== 'object') continue;
      for (const [cle, valeur] of Object.entries(board.dates)) {
        const libelle = DATES_CHANTIER[cle];
        const jour = libelle ? lireJour(valeur) : null;
        if (!libelle || !jour) continue;
        const start = new Date(Date.UTC(jour.y, jour.m - 1, jour.d));
        if (isNaN(start.getTime()) || start.getTime() < min || start.getTime() > max) continue;
        const faite = board.validees?.[cle] === true;
        list.push({
          uid: `avra-chantier-${p.id}-${cle.normalize('NFD').replace(/[^A-Za-z0-9]+/g, '-')}@avra.fr`,
          start,
          end: new Date(start.getTime() + 86400000),
          allDay: true,
          summary: `${faite ? '✓' : '📌'} ${libelle} · ${p.name}`.slice(0, 220),
          description: [
            `Date du chantier prévue dans AVRA${faite ? ' (faite)' : ''}.`,
            `Dossier : ${p.name}`,
            `Ouvrir le dossier : ${webUrl}/dossiers/${p.id}`,
          ].join('\n'),
          status: 'CONFIRMED',
        });
      }
    }

    const nom = memberships.length === 1 ? memberships[0].workspace?.name : undefined;
    const ics = buildCalendar(list, {
      method: 'PUBLISH',
      name: `AVRA — Planning${withGestion ? ' et chantiers' : ''}${nom ? ` ${nom}` : ''}${seulementMoi ? ' (mes RDV)' : ''}`,
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="avra-planning.ics"');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.send(ics);
  }
}
