import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';
import { IntervenantDossiersService } from './intervenant-dossiers.service';
import { IntervenantDossierStatut, IntervenantDossierItemStatut } from '../../prisma-enums';

/* ─────────────────────────────────────────────────────────────────────
 * Routes /intervenant-dossiers/*  (cote pro)
 *
 * Liste / cree / modifie / supprime les dossiers de classement.
 * Chaque dossier est lie a un Intervenant du workspace.
 * Les items sont sub-resources : /intervenant-dossiers/:dossierId/items
 * ───────────────────────────────────────────────────────────────────── */

@Controller('intervenant-dossiers')
@UseGuards(JwtAuthGuard)
export class IntervenantDossiersController {
  constructor(private readonly service: IntervenantDossiersService) {}

  /** Tous les dossiers du workspace (pour sync au mount). */
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.listForWorkspace(user.workspaceId);
  }

  /** Dossiers d'un intervenant specifique. */
  @Get('by-intervenant/:intervenantId')
  listByIntervenant(@CurrentUser() user: JwtPayload, @Param('intervenantId') intervenantId: string) {
    return this.service.listForIntervenant(user.workspaceId, intervenantId);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { intervenantId: string; name: string; date?: string; statut?: IntervenantDossierStatut; rajoute?: boolean },
  ) {
    if (!body?.intervenantId) throw new BadRequestException('intervenantId requis');
    if (!body?.name) throw new BadRequestException('name requis');
    return this.service.createDossier(user.workspaceId, body.intervenantId, body);
  }

  @Patch(':dossierId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Body() body: { name?: string; date?: string | null; statut?: IntervenantDossierStatut; rajoute?: boolean },
  ) {
    return this.service.updateDossier(user.workspaceId, dossierId, body);
  }

  @Post(':dossierId/mark-vu')
  markVu(@CurrentUser() user: JwtPayload, @Param('dossierId') dossierId: string) {
    return this.service.markVu(user.workspaceId, dossierId);
  }

  @Delete(':dossierId')
  remove(@CurrentUser() user: JwtPayload, @Param('dossierId') dossierId: string) {
    return this.service.removeDossier(user.workspaceId, dossierId);
  }

  // ── Items ───────────────────────────────────────────────────────────────

  @Post(':dossierId/items')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  createItem(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Body() body: { name: string; statut?: IntervenantDossierItemStatut },
  ) {
    if (!body?.name) throw new BadRequestException('name requis');
    return this.service.createItem(user.workspaceId, dossierId, body);
  }

  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('itemId') itemId: string,
    @Body() body: { name?: string; statut?: IntervenantDossierItemStatut },
  ) {
    return this.service.updateItem(user.workspaceId, itemId, body);
  }

  @Delete('items/:itemId')
  removeItem(@CurrentUser() user: JwtPayload, @Param('itemId') itemId: string) {
    return this.service.removeItem(user.workspaceId, itemId);
  }

  // ── Note manuelle / tags ────────────────────────────────────────────────

  @Patch('intervenants/:intervenantId/rating')
  updateRating(
    @CurrentUser() user: JwtPayload,
    @Param('intervenantId') intervenantId: string,
    @Body() body: { rating?: number | null; ratingComment?: string | null; tagsCsv?: string | null },
  ) {
    return this.service.updateIntervenantRating(user.workspaceId, intervenantId, body);
  }
}
