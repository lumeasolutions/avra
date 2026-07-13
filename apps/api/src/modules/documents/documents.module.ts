import { Module } from '@nestjs/common';
import { DocumentsController, SharedDocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { SupabaseStorageService } from '../dossier-documents/supabase-storage.service';

@Module({
  controllers: [DocumentsController, SharedDocumentsController],
  // SupabaseStorageService fourni ici (stateless, service_role) pour stocker
  // les admin docs dans le bucket Supabase — le FS local est read-only sur Vercel.
  providers: [DocumentsService, SupabaseStorageService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
