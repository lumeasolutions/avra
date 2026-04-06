import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('unreadOnly') unreadOnly?: string) {
    return this.notifications.findForUser(user.workspaceId, user.sub, unreadOnly === 'true');
  }

  @Post(':id/read')
  markAsRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notifications.markAsRead(user.workspaceId, id);
  }
}
