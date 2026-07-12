import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

/**
 * GET  /settings → config UI du workspace (ou null si jamais enregistrée).
 * PUT  /settings → enregistre le bloc de config complet (upsert) — OWNER/ADMIN
 * uniquement (écrase toute la config du workspace, action sensible).
 * Cloisonné par workspace via le JWT.
 */
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.settings.get(user.workspaceId);
  }

  @Roles('OWNER', 'ADMIN')
  @Put()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(user.workspaceId, dto.config);
  }
}
