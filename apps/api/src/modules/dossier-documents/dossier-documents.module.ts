import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DossierDocumentsController } from './dossier-documents.controller';
import { DossierDocumentsService } from './dossier-documents.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [DossierDocumentsController],
  providers: [DossierDocumentsService, SupabaseStorageService],
})
export class DossierDocumentsModule {}
