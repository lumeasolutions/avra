import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { QwenService } from './qwen.service';
import { FalService } from './fal.service';

@Module({
  controllers: [IaController],
  providers: [IaService, QwenService, FalService],
  exports: [IaService, QwenService, FalService],
})
export class IaModule {}
