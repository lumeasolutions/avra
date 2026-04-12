import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';
import { DocumentKind } from '../../prisma-enums';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('project/:projectId')
  findByProject(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Query('folderId') folderId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documents.findByProject(
      user.workspaceId,
      projectId,
      folderId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() data: { projectId: string; title: string; kind: DocumentKind; storedFileId: string; folderId?: string },
  ) {
    return this.documents.create(user.workspaceId, data.projectId, user.sub, data);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.documents.remove(user.workspaceId, id);
  }

  /* ── ADMIN DOCS ── */

  @Get('admin')
  findAdminDocs(@CurrentUser() user: JwtPayload, @Query('category') category?: string) {
    return this.documents.findAdminDocs(user.workspaceId, category);
  }

  @Post('admin/upload')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadAdminDoc(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer?: Buffer },
    @Body() body: { category?: string; title?: string },
  ) {
    if (!file) throw new Error('Fichier requis');
    const buffer = (file as any).buffer;
    if (!buffer) throw new Error('Fichier invalide');
    return this.documents.uploadAdminDoc(
      user.workspaceId, user.sub,
      { ...file, buffer },
      body.category ?? 'Divers',
      body.title,
    );
  }

  @Get('admin/:id/download')
  async downloadAdminDoc(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { filePath, originalName, mimeType } = await this.documents.downloadAdminDoc(user.workspaceId, id);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', mimeType);
    fs.createReadStream(filePath).pipe(res);
  }
}
