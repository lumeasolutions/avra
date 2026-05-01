import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { AIService } from './ai.service';
import { FalService } from './fal.service';

@Module({
  controllers: [IaController],
  providers: [IaService, AIService, FalService],
  exports: [IaService, AIService, FalService],
})
export class IaModule {}
