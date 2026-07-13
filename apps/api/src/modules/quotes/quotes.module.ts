import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  // REST 13/07/2026 — Importé pour que convertToInvoice délègue à la vraie
  // conversion (InvoicesService.convertFromQuote) au lieu de muter le devis.
  imports: [InvoicesModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
