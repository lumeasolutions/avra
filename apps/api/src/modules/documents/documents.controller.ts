import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,
  UseGuards, UseInterceptors, UploadedFile, Res, BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';
import { DocumentKind } from '../../prisma-enums';
import { Request, Response } from 'express';
import * as fs from 'fs';

/** Helpers pour extraire IP + UA du request. */
function clientMeta(req: Request) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? req.ip
    ?? 'unknown';
  const userAgent = (req.headers['user-agent'] ?? 'unknown').toString().slice(0, 200);
  return { ip, userAgent };
}

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  // ─────────────────────────────────────────────────────────────────────
  // PROJET DOCS (existant)
  // ─────────────────────────────────────────────────────────────────────

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
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const { ip, userAgent } = clientMeta(req);
    return this.documents.remove(user.workspaceId, id, {
      userId: user.sub,
      userEmail: user.email,
      ip,
      userAgent,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // ADMIN DOCS — endpoints enrichis
  // ─────────────────────────────────────────────────────────────────────

  @Get('admin')
  findAdminDocs(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('includeVersions') includeVersions?: string,
  ) {
    return this.documents.findAdminDocs(
      user.workspaceId,
      category,
      includeVersions === 'true',
    );
  }

  @Get('admin/stats')
  adminStats(@CurrentUser() user: JwtPayload) {
    return this.documents.adminStats(user.workspaceId);
  }

  @Get('admin/audit-log')
  @Roles('OWNER', 'ADMIN')
  auditLog(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documents.auditLog(
      user.workspaceId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Get('admin/:id/versions')
  versions(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.documents.findVersions(user.workspaceId, id);
  }

  /**
   * Upload (création ou nouvelle version).
   * Rate-limited à 30 uploads / 5 min par user pour éviter le DoS storage.
   */
  @Post('admin/upload')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @Throttle({ default: { ttl: 5 * 60 * 1000, limit: 30 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadAdminDoc(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer?: Buffer },
    @Body() body: {
      category?: string;
      title?: string;
      description?: string;
      tagsCsv?: string;
      expiresAt?: string;
      replaceDocumentId?: string;
    },
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');
    const buffer = (file as any).buffer;
    if (!buffer) throw new BadRequestException('Fichier invalide');
    const { ip, userAgent } = clientMeta(req);
    return this.documents.uploadAdminDoc(
      user.workspaceId,
      user.sub,
      user.email,
      { ...file, buffer },
      body,
      { ip, userAgent },
    );
  }

  @Patch('admin/:id')
  @Roles('OWNER', 'ADMIN')
  updateAdmin(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      description?: string | null;
      tagsCsv?: string | null;
      expiresAt?: string | null;
      category?: string;
    },
    @Req() req: Request,
  ) {
    const { ip, userAgent } = clientMeta(req);
    return this.documents.updateAdminDoc(
      user.workspaceId,
      id,
      user.sub,
      user.email,
      body,
      { ip, userAgent },
    );
  }

  @Delete('admin/bulk')
  @Roles('OWNER', 'ADMIN')
  bulkDelete(
    @CurrentUser() user: JwtPayload,
    @Body() body: { ids: string[] },
    @Req() req: Request,
  ) {
    const { ip, userAgent } = clientMeta(req);
    return this.documents.bulkDeleteAdminDocs(
      user.workspaceId,
      Array.isArray(body?.ids) ? body.ids : [],
      user.sub,
      user.email,
      { ip, userAgent },
    );
  }

  @Get('admin/:id/download')
  async downloadAdminDoc(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const { ip, userAgent } = clientMeta(req);
    const { filePath, originalName, mimeType } = await this.documents.downloadAdminDoc(
      user.workspaceId, id,
      { userId: user.sub, userEmail: user.email, ip, userAgent },
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(filePath).pipe(res);
  }

  /**
   * Preview inline pour PDF + images. Pas téléchargé, affiché via iframe / img.
   * Header `Content-Disposition: inline` pour ouvrir dans le navigateur.
   */
  @Get('admin/:id/preview')
  async previewAdminDoc(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { filePath, originalName, mimeType } = await this.documents.previewAdminDoc(user.workspaceId, id);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; object-src 'self'; sandbox;");
    fs.createReadStream(filePath).pipe(res);
  }

  // ── Sharing ────────────────────────────────────────────────────────────

  @Post('admin/:id/shares')
  @Roles('OWNER', 'ADMIN')
  createShare(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { expiresInHours?: number },
    @Req() req: Request,
  ) {
    const { ip, userAgent } = clientMeta(req);
    const hours = typeof body?.expiresInHours === 'number' ? body.expiresInHours : 24;
    return this.documents.createShareLink(user.workspaceId, id, hours, user.sub, user.email, { ip, userAgent });
  }

  @Get('admin/:id/shares')
  @Roles('OWNER', 'ADMIN')
  listShares(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.documents.listShares(user.workspaceId, id);
  }

  @Delete('admin/shares/:shareId')
  @Roles('OWNER', 'ADMIN')
  revokeShare(
    @CurrentUser() user: JwtPayload,
    @Param('shareId') shareId: string,
    @Req() req: Request,
  ) {
    const { ip, userAgent } = clientMeta(req);
    return this.documents.revokeShareLink(user.workspaceId, shareId, user.sub, user.email, { ip, userAgent });
  }
}

/**
 * Endpoint public pour télécharger un document partagé via token.
 * Pas d'auth — la sécurité vient du token (24 hex bytes = 192 bits).
 */
@Controller('documents/shared')
export class SharedDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Public()
  @Throttle({ default: { ttl: 60 * 1000, limit: 60 } })
  @Get(':token')
  async getShared(@Param('token') token: string, @Res() res: Response) {
    const { filePath, originalName, mimeType } = await this.documents.getSharedDocument(token);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(filePath).pipe(res);
  }
}
