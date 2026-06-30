import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

/**
 * GET  /settings → config UI du workspace (ou null si jamais enregistrée).
 * PUT  /settings → enregistre le bloc de config complet (upsert).
 * Cloisonné par workspace via le JWT. Tout membre authentifié peut lire/écrire
 * (la page Paramètres elle-même gère l'affichage des sections selon le rôle).
 */
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.settings.get(user.workspaceId);
  }

  @Put()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(user.workspaceId, dto.config);
  }
}
