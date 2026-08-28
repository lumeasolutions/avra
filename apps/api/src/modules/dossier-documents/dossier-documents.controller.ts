import {
  Controller,
  Get,
  Post,
  Patch,
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
 *   - Protégées par JwtAuthGuard (cookie httpOnly SameSite=Strict)
 *   - Ownership workspace validé en service
 *   - CsrfGuard global stateless (double-submit cookie) sur toutes mutations
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
    // NOTE : JwtStrategy.validateUser retourne un User enrichi (id, email, role, workspaceId)
    // PAS le JwtPayload brut. user.id = uw.user.id, et user.sub est undefined.
    // Le type JwtPayload annoté est approximatif : on pioche sub OU id selon ce qui existe.
    const userId = (user as any).id ?? (user as any).sub;
    return this.docs.upload(user.workspaceId, userId, dossierId, subfolderLabel, file);
  }

  /**
   * Direct upload — étape 1 : génère une signed URL d'upload Supabase.
   * Le client PUT directement vers Supabase via cette URL (pas de double-hop
   * browser→Vercel→Supabase). Toutes les validations sécurité sont faites
   * ici AVANT de générer la URL.
   */
  @Post('init-upload')
  async initUpload(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Body() body: { subfolderLabel: string; fileName: string; fileSize: number; mimeType: string },
  ) {
    const { subfolderLabel, fileName, fileSize, mimeType } = body ?? ({} as any);
    if (!subfolderLabel) throw new BadRequestException('subfolderLabel requis');
    if (!fileName) throw new BadRequestException('fileName requis');
    if (typeof fileSize !== 'number' || fileSize <= 0) throw new BadRequestException('fileSize invalide');
    if (!mimeType) throw new BadRequestException('mimeType requis');
    return this.docs.initDirectUpload(
      user.workspaceId,
      dossierId,
      subfolderLabel,
      fileName,
      fileSize,
      mimeType,
    );
  }

  /**
   * Direct upload — étape 2 : finalise un upload direct.
   * Vérifie que le fichier existe à ce path, fait l'AV scan post-upload
   * (si configuré), et crée l'enregistrement DossierDocument.
   */
  @Post('finalize-upload')
  async finalizeUpload(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Body() body: { storagePath: string; subfolderLabel: string; fileName: string; fileSize: number; mimeType: string },
  ) {
    const { storagePath, subfolderLabel, fileName, fileSize, mimeType } = body ?? ({} as any);
    if (!storagePath) throw new BadRequestException('storagePath requis');
    if (!subfolderLabel) throw new BadRequestException('subfolderLabel requis');
    if (!fileName) throw new BadRequestException('fileName requis');
    const userId = (user as any).id ?? (user as any).sub;
    return this.docs.finalizeDirectUpload(
      user.workspaceId,
      userId,
      dossierId,
      subfolderLabel,
      storagePath,
      fileName,
      fileSize ?? 0,
      mimeType ?? 'application/octet-stream',
    );
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

  /**
   * Renomme un sous-dossier : met à jour le subfolderLabel de TOUS les documents
   * du sous-dossier (exact) + de ses sous-dossiers imbriqués (préfixe). Nécessaire
   * pour que les documents ne « réapparaissent » pas sous l'ancien nom (le backend
   * est la source de vérité des sous-dossiers).
   */
  @Patch('rename-subfolder')
  renameSubfolder(
    @CurrentUser() user: JwtPayload,
    @Param('dossierId') dossierId: string,
    @Body() body: { oldLabel: string; newLabel: string },
  ) {
    const oldLabel = (body?.oldLabel ?? '').trim();
    const newLabel = (body?.newLabel ?? '').trim();
    if (!oldLabel) throw new BadRequestException('oldLabel requis');
    if (!newLabel) throw new BadRequestException('newLabel requis');
    if (newLabel.length > 200) throw new BadRequestException('Nom de sous-dossier trop long');
    return this.docs.renameSubfolder(user.workspaceId, dossierId, oldLabel, newLabel);
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
