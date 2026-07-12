import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res,
  UseGuards, BadRequestException, ForbiddenException, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { DemandesService } from './demandes.service';
import { ICalFeedService, IcalTokenService, verifyIcalToken } from './ical-feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
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

  // ── ACCÈS PUBLIC SANS LOGIN (jeton HMAC) — page intervenant ouverte par e-mail ──
  // Throttle strict : ces routes ne sont protégées que par un token → anti-brute-force / anti-abus.
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Public()
  @Get('public/intervention/:token')
  publicGetIntervention(@Param('token') token: string) {
    return this.demandes.publicGetByToken(token);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Public()
  @SkipCsrf()
  @Post('public/intervention/:token/action')
  publicActionIntervention(
    @Param('token') token: string,
    @Body() body: { action: 'accept' | 'refuse' | 'complete'; message?: string },
  ) {
    return this.demandes.publicAction(token, body?.action, body?.message);
  }

  @Public()
  @SkipCsrf()
  @Post('public/intervention/:token/message')
  publicMessageIntervention(
    @Param('token') token: string,
    @Body() body: { message: string },
  ) {
    return this.demandes.publicAddMessage(token, body?.message);
  }

  /** Telechargement d'une piece jointe depuis le lien public (sans compte). */
  @Public()
  @Get('public/intervention/:token/attachments/:attachmentId')
  async publicDownloadAttachment(
    @Param('token') token: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const r = await this.demandes.publicGetAttachmentForDownload(token, attachmentId);
    return streamOrRedirect(res, r);
  }

  /** Upload d'un document par l'intervenant depuis le lien public (sans compte). */
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Public()
  @SkipCsrf()
  @Post('public/intervention/:token/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async publicUploadAttachment(
    @Param('token') token: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    return this.demandes.publicUploadAttachment(token, file);
  }

  /** Upload DIRECT gros fichiers (>4 Mo) — etape 1 : signed URL Supabase. */
  @Public()
  @SkipCsrf()
  @Post('public/intervention/:token/upload-url')
  async publicInitDirectUpload(
    @Param('token') token: string,
    @Body() body: { fileName: string; fileSize: number; mimeType: string },
  ) {
    return this.demandes.publicInitDirectUpload(token, body.fileName, body.fileSize, body.mimeType);
  }

  /** Upload DIRECT gros fichiers — etape 2 : finalise apres le PUT Supabase. */
  @Public()
  @SkipCsrf()
  @Post('public/intervention/:token/finalize-upload')
  async publicFinalizeDirectUpload(
    @Param('token') token: string,
    @Body() body: { storagePath: string; fileName: string; fileSize: number; mimeType: string },
  ) {
    return this.demandes.publicFinalizeDirectUpload(token, body.storagePath, body.fileName, body.fileSize, body.mimeType);
  }

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

  // Throttle 10/min : la sidebar polle ce endpoint toutes les 60s ; au-delà
  // d'une dizaine d'appels/minute c'est forcément un bug de polling client.
  // Défense en profondeur en complément du fix des deps useEffect côté UI.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
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

  /** Upload photo dans message chat (pro). */
  @Post(':id/messages/photo')
  @UseInterceptors(FileInterceptor('photo'))
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  postMessagePhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('text') text?: string,
  ) {
    if (!file) throw new BadRequestException('Photo manquante');
    const authorName = `${user.email}`;
    return this.demandes.addMessagePhoto(
      user.workspaceId, id, 'pro', user.sub, authorName,
      file.buffer, file.mimetype, text,
    );
  }

  /** Resout signed URL d'une photo de message (pro). */
  @Get(':id/messages/photo/:storagePath(*)')
  async getMessagePhotoUrl(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('storagePath') storagePath: string,
  ) {
    const signedUrl = await this.demandes.getMessagePhotoUrl(user.workspaceId, id, 'pro', storagePath);
    return { signedUrl };
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

  /** Classe (range) une piece jointe recue dans un sous-dossier du dossier client. */
  @Patch('attachments/:attachmentId/classify')
  classifyAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('attachmentId') attachmentId: string,
    @Body() body: { subfolderLabel: string },
  ) {
    return this.demandes.classifyAttachment(user.workspaceId, attachmentId, body?.subfolderLabel);
  }

  /** Liste les sous-dossiers existants d'un dossier (pour le selecteur de classement). */
  @Get('projects/:projectId/subfolders')
  listSubfolders(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ) {
    return this.demandes.listSubfolders(user.workspaceId, projectId);
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
  /**
   * Endpoint manuel "Relance" — declenche par un user authentifie depuis
   * la page /intervenants (bouton RELANCE). Verifie JWT (pas Cron secret).
   * Cible toutes les demandes en attente de l'intervenant connecte.
   */
  @Post('internal/relance-all')
  @UseGuards(JwtAuthGuard)
  async relanceAll(@CurrentUser() user: JwtPayload) {
    // HIGH-6 (passe-2): scope reminder fan-out to the caller's workspace.
    //   Previously this called sendAutoReminders(3) globally, meaning a single
    //   authenticated pro could trigger emails on demandes belonging to other
    //   workspaces. We now pass workspaceId so the service filters its query.
    return this.demandes.sendAutoReminders(3, user.workspaceId);
  }

  /**
   * Relance MANUELLE ciblee — bouton "Relancer" en face d'une demande dans la
   * liste "Demandes en cours" (page /intervenants). Scope workspace via JWT.
   */
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post(':id/relance')
  @UseGuards(JwtAuthGuard)
  async relanceOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.demandes.relanceOne(id, user.workspaceId);
  }

  /**
   * Endpoint cron auto-rappel.
   *
   * SEC CRIT-003:
   *   • POST only (was GET+POST — GET makes the side-effect trivially
   *     replayable from a stray browser fetch, prefetcher, or shared link).
   *   • Auth via constant-time compare on `Authorization: Bearer <CRON_SECRET>`
   *     OR `X-Cron-Key: <CRON_SECRET>`.
   *   • Vercel Cron requests carry `x-vercel-cron: 1` — we require either that
   *     header OR the X-Cron-Key for external schedulers.
   *   • Idempotency lock: persists last run in CronRun and rejects if the
   *     last successful run is < 1 hour old (HTTP 429).
   */
  @Public()
  @SkipCsrf()
  @Post('internal/auto-reminders')
  async runAutoReminders(@Req() req: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ForbiddenException('CRON_SECRET non configure');

    const auth = (req.headers['authorization'] ?? '') as string;
    const xKey = (req.headers['x-cron-key'] ?? '') as string;
    const isVercelCron = req.headers['x-vercel-cron'] === '1';
    const bearerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    const okSecret = constantTimeCompare(bearerToken, secret) || constantTimeCompare(xKey, secret);
    if (!okSecret) throw new ForbiddenException('Cron key invalide');
    // Vercel-Cron requests come with the trusted bearer + the marker header.
    // External callers (GitHub Actions, EasyCron) must use X-Cron-Key.
    if (!isVercelCron && !xKey) {
      throw new ForbiddenException('Cron source non reconnue');
    }

    // Idempotency — refuse if a recent run already happened.
    // CRIT-002 (passe-2): direct method calls (no `?.`); helpers throw 503
    //   if the underlying Prisma delegate is missing instead of silently
    //   skipping the lock and letting the cron be replayed.
    const CRON_NAME = 'auto-reminders';
    const MIN_INTERVAL_MS = 60 * 60 * 1000;
    const last = await this.demandes.getCronLock(CRON_NAME);
    if (last && Date.now() - new Date(last).getTime() < MIN_INTERVAL_MS) {
      throw new ForbiddenException('Cron déjà exécuté récemment');
    }

    const daysParam = (req.query?.days as string) ?? '3';
    const days = Math.min(30, Math.max(1, parseInt(daysParam, 10) || 3));
    const result = await this.demandes.sendAutoReminders(days);
    await this.demandes.setCronLock(CRON_NAME, 'OK');
    return result;
  }
}

function constantTimeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const buf1 = Buffer.from(a);
  const buf2 = Buffer.from(b);
  try { return require('crypto').timingSafeEqual(buf1, buf2); } catch { return false; }
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
    private readonly icalTokens: IcalTokenService,
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

  /** Upload photo dans message chat (intervenant). */
  @Post('demandes/:id/messages/photo')
  @UseInterceptors(FileInterceptor('photo'))
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  postMessagePhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body('text') text?: string,
  ) {
    if (!file) throw new BadRequestException('Photo manquante');
    return this.demandes.addMessagePhoto(
      user.sub, id, 'intervenant', user.sub, user.email,
      file.buffer, file.mimetype, text,
    );
  }

  /** Resout signed URL d'une photo de message (intervenant). */
  @Get('demandes/:id/messages/photo/:storagePath(*)')
  async getMessagePhotoUrl(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('storagePath') storagePath: string,
  ) {
    const signedUrl = await this.demandes.getMessagePhotoUrl(user.sub, id, 'intervenant', storagePath);
    return { signedUrl };
  }

  /** Profils Intervenant lies au User connecte (peut etre plusieurs). */
  @Get('profile')
  async profile(@CurrentUser() user: JwtPayload) {
    const profiles = await this.demandes.getIntervenantProfilesForUser(user.sub);
    return profiles;
  }

  /**
   * URL publique du flux iCal pour le User connecté.
   * HIGH-003: token aléatoire 256 bits stocké en DB, rotatable.
   */
  @Get('ical-url')
  async icalUrl(@CurrentUser() user: JwtPayload) {
    const token = await this.icalTokens.ensureToken(user.sub);
    return { userId: user.sub, token, path: `/api/v1/calendar/i/${token}.ics` };
  }

  /** HIGH-003: rotate the user's iCal token (invalidates any shared URL). */
  @Post('ical-url/rotate')
  async rotateIcal(@CurrentUser() user: JwtPayload) {
    const token = await this.icalTokens.rotateToken(user.sub);
    return { userId: user.sub, token, path: `/api/v1/calendar/i/${token}.ics` };
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
    private readonly icalTokens: IcalTokenService,
  ) {}

  /**
   * GET /calendar/i/:token.ics  (preferred — token-only)
   * GET /calendar/i/:userId/:token.ics  (legacy HMAC — kept for compat)
   *
   * HIGH-003: token is now a per-user random secret stored in DB. Lookups go
   * through IcalTokenService which falls back to the legacy HMAC scheme so
   * subscriptions taken before this deploy keep working until the user rotates.
   */
  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('i/:token.ics')
  async publicIcalByToken(@Param('token') token: string, @Res() res: Response) {
    const userId = await this.icalTokens.findUserIdByToken(token);
    if (!userId) {
      res.status(404).send('Not found');
      return;
    }
    const list = await this.demandes.getScheduledDemandesForIntervenant(userId);
    const ics = this.ical.generate(list as any, 'AVRA — Mes interventions');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="avra-planning.ics"');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.send(ics);
  }

  @Public()
  @SkipCsrf()
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
