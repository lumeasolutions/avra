import { Module } from '@nestjs/common';
import { IntervenantDossiersController } from './intervenant-dossiers.controller';
import { IntervenantDossiersService } from './intervenant-dossiers.service';

@Module({
  controllers: [IntervenantDossiersController],
  providers: [IntervenantDossiersService],
  exports: [IntervenantDossiersService],
})
export class IntervenantDossiersModule {}
