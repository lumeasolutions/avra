import { Module } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { AIService } from './ai.service';
import { FalService } from './fal.service';
import { ExtractionService } from './extraction.service';
import { DossierDocumentsModule } from '../dossier-documents/dossier-documents.module';

@Module({
  imports: [DossierDocumentsModule],
  controllers: [IaController],
  providers: [IaService, AIService, FalService, ExtractionService],
  exports: [IaService, AIService, FalService, ExtractionService],
})
export class IaModule {}
