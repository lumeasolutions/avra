import { Module } from '@nestjs/common';
import { EventsController, PlanningPublicCalendarController } from './events.controller';
import { EventsService } from './events.service';
import { EventInviteService } from './event-invite.service';
import { DemandesModule } from '../demandes/demandes.module';

@Module({
  // DemandesModule : IcalTokenService (jeton personnel des flux agenda).
  imports: [DemandesModule],
  controllers: [EventsController, PlanningPublicCalendarController],
  providers: [EventsService, EventInviteService],
  exports: [EventsService],
})
export class EventsModule {}
