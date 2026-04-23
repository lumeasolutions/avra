import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';
import { DossierDocumentsService } from './dossier-documents.service';

/**
 * Endpoints :
 *   POST   /dossiers/:dossierId/documents       (multipart: file + subfolderLabel)
 *   GET    /dossiers/:dossierId/documents        (liste)
 *   GET    /dossiers/:dossierId/documents/:docId/signed-url
 *   DELETE /dossiers/:dossierId/documents/:docId
 *
 * Toutes les routes :
 *   - Protégées par JwtAuthGuard
 *   - Ownership workspace validé en service
 */
@Controller('dossiers/:dossierId/documents')
@UseGuards(JwtAuthGuard)
export class DossierDocumentsController {
  constructor(private readonly docs: DossierDocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Body('subfolderLabel') subfolderLabel: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    if (!subfolderLabel) throw new BadRequestException('subfolderLabel requis');
    return this.docs.upload(user.workspaceId, user.sub, dossierId, subfolderLabel, file);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param('dossierId') dossierId: string) {
    return this.docs.listByProject(user.workspaceId, dossierId);
  }

  @Get(':docId/signed-url')
  signedUrl(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Param('docId') docId: string,
  ) {
    return this.docs.getSignedUrl(user.workspaceId, dossierId, docId);
  }

  @Delete(':docId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Param('docId') docId: string,
  ) {
    return this.docs.remove(user.workspaceId, dossierId, docId);
  }
}
