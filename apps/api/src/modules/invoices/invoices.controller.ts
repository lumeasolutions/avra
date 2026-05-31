import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ConvertQuoteDto } from './dto/convert-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '@avra/types';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return this.invoices.findAll(user.workspaceId, projectId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoices.findOne(user.workspaceId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(user.workspaceId, dto);
  }

  @Post('from-quote')
  convertFromQuote(@CurrentUser() user: JwtPayload, @Body() dto: ConvertQuoteDto) {
    return this.invoices.convertFromQuote(user.workspaceId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoices.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoices.delete(user.workspaceId, id);
  }
}
