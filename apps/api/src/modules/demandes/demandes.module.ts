import { Module } from '@nestjs/common';
import {
  DemandesController,
  IntervenantPortalController,
  IntervenantInvitationController,
} from './demandes.controller';
import { DemandesService } from './demandes.service';
import { DemandesEmailService } from './demandes-email.service';
import { ICalFeedService } from './ical-feed.service';
import { DossierDocumentsModule } from '../dossier-documents/dossier-documents.module';

@Module({
  imports: [DossierDocumentsModule],
  controllers: [
    DemandesController,
    IntervenantPortalController,
    IntervenantInvitationController,
  ],
  providers: [DemandesService, DemandesEmailService, ICalFeedService],
  exports: [DemandesService],
})
export class DemandesModule {}
