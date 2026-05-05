import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectWithClientDto } from './dto/create-project-with-client.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';
import { ProjectLifecycleStatus, TradeType } from '../../prisma-enums';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post('with-client')
  async createWithClient(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectWithClientDto) {
    const result = await this.projects.createWithClient(user.workspaceId, user.sub, dto);
    // Invalidate projects list cache on mutation
    await this.cacheManager.del(`projects:${user.workspaceId}`);
    return result;
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    const result = await this.projects.create(user.workspaceId, user.sub, dto);
    // Invalidate projects list cache on mutation
    await this.cacheManager.del(`projects:${user.workspaceId}`);
    return result;
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: ProjectLifecycleStatus,
    @Query('tradeType') tradeType?: TradeType,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.projects.findAll(user.workspaceId, {
      status,
      tradeType,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes for single project
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.projects.findOne(user.workspaceId, id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const result = await this.projects.update(user.workspaceId, id, dto);
    // Invalidate caches on mutation
    await this.cacheManager.del(`projects:${user.workspaceId}`);
    await this.cacheManager.del(`projects:${id}`);
    return result;
  }

  @Post(':id/sign')
  async setSigned(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.projects.setSigned(user.workspaceId, id);
    // Invalidate caches on mutation
    await this.cacheManager.del(`projects:${user.workspaceId}`);
    await this.cacheManager.del(`projects:${id}`);
    return result;
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.projects.remove(user.workspaceId, id);
    // Invalidate caches on mutation
    await this.cacheManager.del(`projects:${user.workspaceId}`);
    await this.cacheManager.del(`projects:${id}`);
    return result;
  }
}
