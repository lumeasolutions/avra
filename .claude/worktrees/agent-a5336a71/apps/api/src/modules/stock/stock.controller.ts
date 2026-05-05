import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { StockService } from './stock.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';
import { StockItemStatus } from '../../prisma-enums';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(
    private readonly stock: StockService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStockItemDto) {
    const result = await this.stock.create(user.workspaceId, dto);
    // Invalidate stock list cache on mutation
    await this.cacheManager.del(`stock:${user.workspaceId}`);
    return result;
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  findAll(@CurrentUser() user: JwtPayload, @Query('status') status?: StockItemStatus) {
    return this.stock.findAll(user.workspaceId, status);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.stock.findOne(user.workspaceId, id);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStockItemDto,
  ) {
    const result = await this.stock.update(user.workspaceId, id, dto);
    // Invalidate caches on mutation
    await this.cacheManager.del(`stock:${user.workspaceId}`);
    await this.cacheManager.del(`stock:${id}`);
    return result;
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.stock.remove(user.workspaceId, id);
    // Invalidate caches on mutation
    await this.cacheManager.del(`stock:${user.workspaceId}`);
    await this.cacheManager.del(`stock:${id}`);
    return result;
  }
}
