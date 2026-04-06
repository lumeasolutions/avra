import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';
import { EventCalendarType } from '../../prisma-enums';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
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
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.events.remove(user.workspaceId, id);
  }
}
