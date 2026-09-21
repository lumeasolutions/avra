import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { WorkspaceScopedCacheInterceptor } from '../../common/interceptors/workspace-scoped-cache.interceptor';
import { StockService } from './stock.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { BulkCreateStockItemsDto } from './dto/bulk-create-stock-items.dto';
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
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStockItemDto) {
    const result = await this.stock.create(user.workspaceId, dto);
    // Invalidate stock list cache on mutation
    await this.cacheManager.del(`stock:${user.workspaceId}`);
    return result;
  }

  /**
   * Import groupé (Excel / CSV) : jusqu'à 100 articles par appel. Un seul
   * aller-retour au lieu de 100 POST (limite anti-abus 300 req/min).
   */
  @Post('bulk')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  bulkCreate(@CurrentUser() user: JwtPayload, @Body() dto: BulkCreateStockItemsDto) {
    return this.stock.bulkCreate(user.workspaceId, dto.items);
  }

  // 22/09/2026 — plus de cache sur les lectures du stock : l'invalidation
  // visait la clé `stock:<ws>` alors que l'intercepteur indexe sur l'URL
  // (`/stock?…::ws:<ws>`) → après un ajout, la liste restait figée jusqu'à
  // 5 min et l'article « disparaissait » au rechargement. La requête est
  // légère (un index workspace), le cache n'apportait rien.
  // Pagination réelle : `page` / `pageSize` (1-200) sont enfin pris en compte
  // (avant : pageSize ignoré → 50 articles max à l'écran).
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: StockItemStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize ?? '50', 10) || 50));
    return this.stock.findAll(user.workspaceId, status, p, ps);
  }

  @Get(':id')
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
