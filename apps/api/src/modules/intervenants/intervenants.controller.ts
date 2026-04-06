import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { IntervenantsService } from './intervenants.service';
import { CreateIntervenantDto } from './dto/create-intervenant.dto';
import { UpdateIntervenantDto } from './dto/update-intervenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';
import { IntervenantType } from '../../prisma-enums';

@Controller('intervenants')
@UseGuards(JwtAuthGuard)
export class IntervenantsController {
  constructor(private readonly intervenants: IntervenantsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateIntervenantDto) {
    return this.intervenants.create(user.workspaceId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('type') type?: IntervenantType) {
    return this.intervenants.findAll(user.workspaceId, type);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.intervenants.findOne(user.workspaceId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateIntervenantDto,
  ) {
    return this.intervenants.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.intervenants.remove(user.workspaceId, id);
  }
}
