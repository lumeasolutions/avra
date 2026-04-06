import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(
    private readonly clients: ClientsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
    const result = await this.clients.create(user.workspaceId, dto);
    // Invalidate clients list cache on mutation
    await this.cacheManager.del(`clients:${user.workspaceId}`);
    return result;
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  findAll(@CurrentUser() user: JwtPayload) {
    return this.clients.findAll(user.workspaceId);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clients.findOne(user.workspaceId, id);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const result = await this.clients.update(user.workspaceId, id, dto);
    // Invalidate caches on mutation
    await this.cacheManager.del(`clients:${user.workspaceId}`);
    await this.cacheManager.del(`clients:${id}`);
    return result;
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.clients.remove(user.workspaceId, id);
    // Invalidate caches on mutation
    await this.cacheManager.del(`clients:${user.workspaceId}`);
    await this.cacheManager.del(`clients:${id}`);
    return result;
  }
}
