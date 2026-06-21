import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TeamService } from './team.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

/**
 * Gestion de l'équipe (membres / vendeurs). Réservé OWNER + ADMIN.
 * Le cloisonnement (un vendeur ne voit que ses dossiers) est géré ailleurs
 * (filtrage des projets) — ici on ne fait que la gestion administrative.
 */
@Controller('team')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get('overview')
  @Roles('OWNER', 'ADMIN')
  overview(@CurrentUser() user: JwtPayload) {
    return this.team.getOverview(user.workspaceId, user.sub);
  }

  @Post('invitations')
  @Roles('OWNER', 'ADMIN')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteMemberDto) {
    return this.team.invite(user.workspaceId, user.sub, dto);
  }

  @Delete('invitations/:id')
  @Roles('OWNER', 'ADMIN')
  revokeInvitation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.team.revokeInvitation(user.workspaceId, id);
  }

  @Post('invitations/:id/resend')
  @Roles('OWNER', 'ADMIN')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  resendInvitation(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.team.resendInvitation(user.workspaceId, id);
  }

  @Patch('members/:userId')
  @Roles('OWNER', 'ADMIN')
  updateMember(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.team.updateMember(user.workspaceId, user, userId, dto);
  }

  @Delete('members/:userId')
  @Roles('OWNER', 'ADMIN')
  removeMember(@CurrentUser() user: JwtPayload, @Param('userId') userId: string) {
    return this.team.removeMember(user.workspaceId, user, userId);
  }
}
