import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return this.quotes.findAll(user.workspaceId, projectId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quotes.findOne(user.workspaceId, id);
  }

  // Création/édition de devis : exclut les rôles lecture seule (VIEWER).
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuoteDto) {
    return this.quotes.create(user.workspaceId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MEMBER')
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotes.update(user.workspaceId, id, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quotes.delete(user.workspaceId, id);
  }

  // Conversion en facture = émission d'un document légal → OWNER/ADMIN.
  @Roles('OWNER', 'ADMIN')
  @Post(':id/convert-to-invoice')
  convertToInvoice(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quotes.convertToInvoice(user.workspaceId, id);
  }
}
