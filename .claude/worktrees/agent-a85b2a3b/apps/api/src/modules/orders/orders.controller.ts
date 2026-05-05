import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    const result = await this.orders.create(user.workspaceId, dto);
    // Invalidate orders cache on mutation
    await this.cacheManager.del(`orders:${user.workspaceId}`);
    if (dto.projectId) {
      await this.cacheManager.del(`orders:${user.workspaceId}:project:${dto.projectId}`);
    }
    return result;
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return projectId ? this.orders.findByProject(user.workspaceId, projectId) : this.orders.findByWorkspace(user.workspaceId);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.findOne(user.workspaceId, id);
  }

  @Put(':id/notes')
  @Roles('OWNER', 'ADMIN')
  async updateNotes(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body('notes') notes: string) {
    const result = await this.orders.updateNotes(user.workspaceId, id, notes);
    // Invalidate caches on mutation
    await this.cacheManager.del(`orders:${user.workspaceId}`);
    await this.cacheManager.del(`orders:${id}`);
    return result;
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.orders.remove(user.workspaceId, id);
    // Invalidate caches on mutation
    await this.cacheManager.del(`orders:${user.workspaceId}`);
    await this.cacheManager.del(`orders:${id}`);
    return result;
  }
}
