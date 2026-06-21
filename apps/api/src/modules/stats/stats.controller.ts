import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { WorkspaceScopedCacheInterceptor } from '../../common/interceptors/workspace-scoped-cache.interceptor';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('global')
  @UseInterceptors(WorkspaceScopedCacheInterceptor)
  @CacheTTL(300) // 5 minutes
  getGlobal(@CurrentUser() user: JwtPayload) {
    return this.stats.getGlobal(user.workspaceId);
  }
}
