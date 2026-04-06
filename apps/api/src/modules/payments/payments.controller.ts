import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user.workspaceId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return projectId ? this.payments.findByProject(user.workspaceId, projectId) : this.payments.findByWorkspace(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.payments.findOne(user.workspaceId, id);
  }

  @Put(':id/status')
  @Roles('OWNER', 'ADMIN')
  updateStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body('status') status: string) {
    return this.payments.updateStatus(user.workspaceId, id, status);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.payments.remove(user.workspaceId, id);
  }
}
