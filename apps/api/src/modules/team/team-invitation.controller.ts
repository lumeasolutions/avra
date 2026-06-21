import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TeamService } from './team.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Endpoint PUBLIC d'aperçu d'une invitation d'équipe (avant création de compte).
 * Pas d'authentification : l'invité n'a pas encore de compte. L'acceptation
 * réelle (création du compte) passe par POST /auth/register-member.
 */
@Controller('team/invitation')
export class TeamInvitationController {
  constructor(private readonly team: TeamService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get(':token')
  preview(@Param('token') token: string) {
    return this.team.getPublicInvitation(token);
  }
}
