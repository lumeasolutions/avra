import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.findByWorkspace(user.workspaceId, projectId, limit ? parseInt(limit, 10) : 100);
  }
}
