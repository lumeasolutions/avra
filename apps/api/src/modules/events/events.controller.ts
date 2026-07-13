import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';
import { EventCalendarType } from '../../prisma-enums';

// REST 13/07/2026 — RBAC ajouté : le planning est interne au workspace (rôles
// pro). Les mutations sont réservées OWNER/ADMIN/MEMBER (lecture ouverte à tous
// les membres authentifiés du workspace).
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEventDto) {
    return this.events.create(user.workspaceId, user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('calendarType') calendarType?: EventCalendarType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.events.findAll(user.workspaceId, calendarType, fromDate, toDate);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.events.findOne(user.workspaceId, id);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.events.remove(user.workspaceId, id);
  }
}
