import { Module } from '@nestjs/common';
import {
  DemandesController,
  IntervenantPortalController,
  IntervenantInvitationController,
} from './demandes.controller';
import { DemandesService } from './demandes.service';

@Module({
  controllers: [
    DemandesController,
    IntervenantPortalController,
    IntervenantInvitationController,
  ],
  providers: [DemandesService],
  exports: [DemandesService],
})
export class DemandesModule {}
