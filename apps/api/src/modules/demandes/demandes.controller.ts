import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res,
  UseGuards, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DemandesService } from './demandes.service';
import { ICalFeedService, verifyIcalToken } from './ical-feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '@avra/types';
import { DemandeStatus, DemandeType } from '../../prisma-enums';
import { Request, Response } from 'express';
import * as fs from 'fs';

/* ─────────────────────────────────────────────────────────────────────
 * COTE PRO — toutes les routes ici sont @UseGuards(JwtAuthGuard)
 * Le pro voit uniquement les demandes de son workspace.
 * ───────────────────────────────────────────────────────────────────── */

@Controller('demandes')
@UseGuards(JwtAuthGuard)
export class DemandesController {
  constructor(private readonly demandes: DemandesService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: DemandeStatus,
    @Query('type') type?: DemandeType,
    @Query('intervenantId') intervenantId?: string,
    @Query('projectId') projectId?: string,
    @Query('q') q?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.demandes.listForWorkspace(user.workspaceId, {
      status, type, intervenantId, projectId, q, fromDate, toDate,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  @Get('stats')
  stats(@CurrentUser() user: JwtPayload) {
    return this.demandes.statsForWorkspace(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.demandes.findOne(user.workspaceId, id, 'pro');
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      intervenantId: string;
      type: DemandeType;
      title: string;
      notes?: string;
      projectId?: string;
      eventId?: string;
      scheduledFor?: string;
      attachments?: Array<{ dossierDocumentId?: string; documentId?: string; displayName: string; mimeType?: string }>;
    },
  ) {
    if (!body?.intervenantId) throw new BadRequestException('intervenantId requis');
    if (!body?.type) throw new BadRequestException('type requis');
    if (!body?.title) throw new BadRequestException('title requis');
    return this.demandes.create(user.workspaceId, user.sub, body);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { status: DemandeStatus; comment?: string },
  ) {
    return this.demandes.updateStatus(
      user.workspaceId, id, 'pro', body.status, user.sub, body.comment,
    );
  }

  /** Modifier une demande (pro) — titre, notes, scheduledFor, type */
  @Patch(':id')
  updateDemande(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { title?: string; notes?: string | null; scheduledFor?: string | null; type?: DemandeType },
  ) {
    return this.demandes.updateDemande(user.workspaceId, id, body);
  }

  /** Supprimer une demande (pro) — bloque si EN_COURS/TERMINEE */
  @Delete(':id')
  removeDemande(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.demandes.removeDemande(user.workspaceId, id);
  }

  @Post(':id/messages')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  postMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    const authorName = `${user.email}`; // sera enrichi par le store frontend
    return this.demandes.addMessage(
      user.workspaceId, id, 'pro', user.sub, authorName, body.body,
    );
  }

  @Get(':id/messages')
  listMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.demandes.listMessages(user.workspaceId, id, 'pro');
  }

  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.demandes.removeAttachment(user.workspaceId, id, 'pro', attachmentId);
  }

  /** Download d'une piece jointe (cote pro). */
  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const r = await this.demandes.getAttachmentForDownload(user.workspaceId, attachmentId, 'pro');
    return streamOrRedirect(res, r);
  }

  /** Stats + historique d'un intervenant (fiche enrichie). */
  @Get('intervenants/:intervenantId/stats')
  intervenantStats(
    @CurrentUser() user: JwtPayload,
    @Param('intervenantId') intervenantId: string,
  ) {
    return this.demandes.getIntervenantStats(user.workspaceId, intervenantId);
  }

  /* ── Invitations (cote pro) ────────────────────────────────────── */

  @Get('invitations/all')
  listInvitations(@CurrentUser() user: JwtPayload) {
    return this.demandes.listInvitations(user.workspaceId);
  }

  @Post('invitations')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  createInvitation(
    @CurrentUser() user: JwtPayload,
    @Body() body: { intervenantId: string; email?: string; expiresInDays?: number; message?: string },
  ) {
    if (!body?.intervenantId) throw new BadRequestException('intervenantId requis');
    return this.demandes.createInvitation(user.workspaceId, user.sub, body.intervenantId, body);
  }

  @Delete('invitations/:invitationId')
  revokeInvitation(@CurrentUser() user: JwtPayload, @Param('invitationId') invitationId: string) {
    return this.demandes.revokeInvitation(user.workspaceId, invitationId);
  }

  /**
   * Endpoint cron auto-rappel — declenche par un service externe (Vercel
   * Cron, GitHub Actions, EasyCron, etc.) avec header X-Cron-Key.
   * Pas de JwtAuthGuard ici, securise via CRON_SECRET en env.
   */
  @Public()
  @Post('internal/auto-reminders')
  async runAutoReminders(@Req() req: Request) {
    const secret = process.env.CRON_SECRET;
    const provided = (req.headers['x-cron-key'] ?? '') as string;
    if (!secret || provided !== secret) {
      throw new ForbiddenException('Cron key invalide');
    }
    const daysParam = (req.query?.days as string) ?? '3';
    const days = Math.min(30, Math.max(1, parseInt(daysParam, 10) || 3));
    return this.demandes.sendAutoReminders(days);
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * COTE INTERVENANT — routes /intervenant-portal/*
 * Authentification JWT requise, le user.sub doit etre lie a au moins
 * un Intervenant via Intervenant.userId.
 * ───────────────────────────────────────────────────────────────────── */

@Controller('intervenant-portal')
@UseGuards(JwtAuthGuard)
export class IntervenantPortalController {
  constructor(
    private readonly demandes: DemandesService,
    private readonly ical: ICalFeedService,
  ) {}

  @Get('demandes')
  listMyDemandes(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: DemandeStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.demandes.listForIntervenant(user.sub, {
      status,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  @Get('demandes/stats')
  myStats(@CurrentUser() user: JwtPayload) {
    return this.demandes.statsForIntervenant(user.sub);
  }

  @Get('demandes/:id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.demandes.findOne(user.sub, id, 'intervenant');
  }

  /** Marque la demande comme VUE (idempotent). */
  @Post('demandes/:id/view')
  markViewed(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.demandes.markViewed(user.sub, id);
  }

  @Patch('demandes/:id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { status: DemandeStatus; comment?: string },
  ) {
    return this.demandes.updateStatus(
      user.sub, id, 'intervenant', body.status, user.sub, body.comment,
    );
  }

  @Post('demandes/:id/messages')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  postMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.demandes.addMessage(
      user.sub, id, 'intervenant', user.sub, user.email, body.body,
    );
  }

  @Get('demandes/:id/messages')
  listMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.demandes.listMessages(user.sub, id, 'intervenant');
  }

  /** Profils Intervenant lies au User connecte (peut etre plusieurs). */
  @Get('profile')
  async profile(@CurrentUser() user: JwtPayload) {
    const profiles = await this.demandes.getIntervenantProfilesForUser(user.sub);
    return profiles;
  }

  /** URL publique du flux iCal pour le User connecte (a copier-coller dans
   * Google/Apple Calendar). Le token est un HMAC, pas un secret aleatoire,
   * donc on peut le regenerer a la volee a chaque requete. */
  @Get('ical-url')
  icalUrl(@CurrentUser() user: JwtPayload) {
    // Import dynamique pour eviter import circulaire
    const { buildIcalToken } = require('./ical-feed.service');
    const token = buildIcalToken(user.sub);
    return { userId: user.sub, token, path: `/api/v1/calendar/i/${user.sub}/${token}.ics` };
  }

  /**
   * Flux iCalendar (.ics) du planning de l'intervenant. Sert toutes les
   * demandes scheduledFor non refusees/annulees. Utilisable par Google
   * Calendar, Apple Calendar, Outlook via "Souscrire a un calendrier".
   */
  @Get('planning.ics')
  async planningIcal(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const list = await this.demandes.getScheduledDemandesForIntervenant(user.sub);
    const ics = this.ical.generate(list as any, `AVRA — Mes interventions (${user.email})`);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="avra-planning.ics"');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.send(ics);
  }

  /** Download d'une piece jointe (cote intervenant). */
  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const r = await this.demandes.getAttachmentForDownload(user.sub, attachmentId, 'intervenant');
    return streamOrRedirect(res, r);
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * INVITATIONS — routes publiques pour la page d'acceptation
 * (l'intervenant clique le lien dans son email avant de se connecter)
 * ───────────────────────────────────────────────────────────────────── */

@Controller('invitations/intervenant')
export class IntervenantInvitationController {
  constructor(private readonly demandes: DemandesService) {}

  /**
   * Pre-affiche les infos d'une invitation (qui invite, type, message…).
   * Public car l'intervenant n'a pas encore de compte.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get(':token')
  async getInvitation(@Param('token') token: string) {
    const inv = await this.demandes.findInvitationByToken(token);
    return {
      id: inv.id,
      email: inv.email,
      message: inv.message,
      expiresAt: inv.expiresAt,
      intervenant: {
        id: inv.intervenant.id,
        type: inv.intervenant.type,
        companyName: inv.intervenant.companyName,
        firstName: inv.intervenant.firstName,
        lastName: inv.intervenant.lastName,
      },
      workspace: {
        id: inv.workspace.id,
        name: inv.workspace.name,
      },
      createdBy: {
        firstName: inv.createdBy.firstName,
        lastName: inv.createdBy.lastName,
        email: inv.createdBy.email,
      },
    };
  }

  /**
   * Lie le compte connecte (User) a l'Intervenant via la cle d'invitation.
   * L'utilisateur doit etre AUTH (cookie session valide) pour appeler
   * cette route — sinon 401.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':token/accept')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async accept(@CurrentUser() user: JwtPayload, @Param('token') token: string) {
    const inv = await this.demandes.findInvitationByToken(token);
    // Verifie que l'email du token matche celui du user (anti-hijack)
    if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('Cette invitation est destinee a un autre email');
    }
    return this.demandes.acceptInvitation(token, user.sub);
  }

  @Public()
  @Post(':token/refuse')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async refuse(@Param('token') token: string) {
    return this.demandes.refuseInvitation(token);
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * CALENDRIER PUBLIC — accessible sans auth (Google/Apple Calendar
 * font des requetes anonymes). Securite via token HMAC dans l'URL.
 * ───────────────────────────────────────────────────────────────────── */
@Controller('calendar')
export class IntervenantPublicCalendarController {
  constructor(
    private readonly demandes: DemandesService,
    private readonly ical: ICalFeedService,
  ) {}

  /**
   * GET /calendar/i/:userId/:token.ics
   *
   * Retourne le flux iCalendar des interventions d'un intervenant. Le token
   * est un HMAC du userId + secret serveur, derivable cote pro mais non
   * forgeable sans le secret. Pour invalider un lien partage, l'admin peut
   * rotater ICAL_SECRET cote serveur.
   *
   * Pas de JwtAuthGuard car les apps de calendrier souscrivent anonymement.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('i/:userId/:token.ics')
  async publicIcal(
    @Param('userId') userId: string,
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    if (!verifyIcalToken(userId, token)) {
      // 404 plutot que 403 pour ne pas confirmer l'existence d'un user
      res.status(404).send('Not found');
      return;
    }
    const list = await this.demandes.getScheduledDemandesForIntervenant(userId);
    const ics = this.ical.generate(list as any, 'AVRA — Mes interventions');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5min cache
    res.send(ics);
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Helper interne pour les routes /attachments/:id
 * Decide entre 302 redirect (Supabase signed URL) et streaming local FS.
 * ───────────────────────────────────────────────────────────────────── */
function streamOrRedirect(
  res: Response,
  r:
    | { kind: 'redirect'; signedUrl: string; originalName: string; mimeType: string }
    | { kind: 'stream'; filePath: string; originalName: string; mimeType: string },
) {
  if (r.kind === 'redirect') {
    return res.redirect(302, r.signedUrl);
  }
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(r.originalName)}"`);
  res.setHeader('Content-Type', r.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(r.filePath).pipe(res);
}
