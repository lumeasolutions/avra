import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,
  UseGuards, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DemandesService } from './demandes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '@avra/types';
import { DemandeStatus, DemandeType } from '../../prisma-enums';
import { Request } from 'express';

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
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.demandes.listForWorkspace(user.workspaceId, {
      status, type, intervenantId, projectId,
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
}

/* ─────────────────────────────────────────────────────────────────────
 * COTE INTERVENANT — routes /intervenant-portal/*
 * Authentification JWT requise, le user.sub doit etre lie a au moins
 * un Intervenant via Intervenant.userId.
 * ───────────────────────────────────────────────────────────────────── */

@Controller('intervenant-portal')
@UseGuards(JwtAuthGuard)
export class IntervenantPortalController {
  constructor(private readonly demandes: DemandesService) {}

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
