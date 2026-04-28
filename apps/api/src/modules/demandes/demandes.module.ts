import { Module } from '@nestjs/common';
import {
  DemandesController,
  IntervenantPortalController,
  IntervenantInvitationController,
  IntervenantPublicCalendarController,
} from './demandes.controller';
import { DemandesService } from './demandes.service';
import { DemandesEmailService } from './demandes-email.service';
import { ICalFeedService, IcalTokenService } from './ical-feed.service';
import { DossierDocumentsModule } from '../dossier-documents/dossier-documents.module';

@Module({
  imports: [DossierDocumentsModule],
  controllers: [
    DemandesController,
    IntervenantPortalController,
    IntervenantInvitationController,
    IntervenantPublicCalendarController,
  ],
  providers: [DemandesService, DemandesEmailService, ICalFeedService, IcalTokenService],
  exports: [DemandesService, IcalTokenService],
})
export class DemandesModule {}
