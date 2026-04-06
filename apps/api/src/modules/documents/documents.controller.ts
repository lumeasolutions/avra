import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';
import { DocumentKind } from '../../prisma-enums';

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
}
