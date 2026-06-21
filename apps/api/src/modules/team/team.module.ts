import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamInvitationController } from './team-invitation.controller';
import { TeamService } from './team.service';
import { TeamEmailService } from './team-email.service';

@Module({
  controllers: [TeamController, TeamInvitationController],
  providers: [TeamService, TeamEmailService],
  exports: [TeamService],
})
export class TeamModule {}
