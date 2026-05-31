import { Injectable, NotFoundException } from '@nestjs/common';
// Le projet embarque un shim @prisma/client manuel
// (apps/api/src/types/prisma-client.d.ts) qui n'expose pas `Prisma.Decimal`.
// On importe donc la classe Decimal directement depuis le runtime Prisma et on
// fait TOUTE l'arithmetique monetaire en Decimal — jamais en Number — pour
// preserver des centimes exacts sur le fil.
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto, CreateQuoteLineDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mappe une ligne DTO (strings) -> input Prisma avec Decimal. */
  private mapLineCreate(line: CreateQuoteLineDto, index: number) {
    return {
      description: line.description,
      quantity: new Decimal(line.quantity),
      unitPrice: new Decimal(line.unitPrice),
      vatRate: new Decimal(line.vatRate ?? '20'),
      discount: new Decimal(line.discount ?? '0'),
      unit: line.unit ?? null,
      position: line.position ?? index,
    };
  }

  /** HT/TTC exacts (Decimal) d'une ligne : qty * pu * (1 - remise%) ; +TVA. */
  private lineTotals(line: CreateQuoteLineDto) {
    const qty = new Decimal(line.quantity);
    const pu = new Decimal(line.unitPrice);
    const disc = new Decimal(line.discount ?? '0').div(100);
    const vat = new Decimal(line.vatRate ?? '20').div(100);
    const ht = qty.mul(pu).mul(new Decimal(1).minus(disc));
    const ttc = ht.mul(new Decimal(1).plus(vat));
    return { ht, ttc };
  }

  /** Totaux HT/TTC du devis a partir de ses lignes (Decimal, arrondi 2). */
  private computeTotals(lines: CreateQuoteLineDto[]) {
    let totalHT = new Decimal(0);
    let totalTTC = new Decimal(0);
    for (const l of lines ?? []) {
      const { ht, ttc } = this.lineTotals(l);
      totalHT = totalHT.plus(ht);
      totalTTC = totalTTC.plus(ttc);
    }
    return {
      totalHT: totalHT.toDecimalPlaces(2),
      totalTTC: totalTTC.toDecimalPlaces(2),
    };
  }

  /** Genere une reference D-{annee}-{NNN} basee sur le nombre de devis du workspace. */
  private async nextReference(tx: any, workspaceId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.quote.count({ where: { workspaceId } });
    return `D-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll(workspaceId: string, projectId?: string) {
    return this.prisma.quote.findMany({
      where: { workspaceId, ...(projectId && { projectId }) },
      include: { lines: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, workspaceId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    if (!quote) throw new NotFoundException(`Quote ${id} not found`);
    return quote;
  }

  async create(workspaceId: string, dto: CreateQuoteDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const totals = this.computeTotals(dto.lines);
      const reference = dto.reference ?? (await this.nextReference(tx, workspaceId));
      return tx.quote.create({
        data: {
          workspaceId,
          projectId: dto.projectId ?? null,
          status: dto.status ?? 'DRAFT',
          reference,
          clientName: dto.clientName ?? null,
          clientEmail: dto.clientEmail ?? null,
          clientAddress: dto.clientAddress ?? null,
          objet: dto.objet ?? null,
          conditionsPaiement: dto.conditionsPaiement ?? null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          notes: dto.notes ?? null,
          token: dto.token ?? null,
          signatureStatus: dto.signatureStatus ?? null,
          signatureEmail: dto.signatureEmail ?? null,
          totalHT: totals.totalHT,
          totalTTC: totals.totalTTC,
          lines: {
            create: (dto.lines ?? []).map((line, idx) => this.mapLineCreate(line, idx)),
          },
        },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateQuoteDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.quote.findFirst({ where: { id, workspaceId } });
      if (!existing) throw new NotFoundException(`Quote ${id} not found`);

      const data: Record<string, unknown> = {};
      const scalarKeys: (keyof UpdateQuoteDto)[] = [
        'projectId', 'status', 'reference', 'clientName', 'clientEmail',
        'clientAddress', 'objet', 'conditionsPaiement', 'notes', 'token',
        'signatureStatus', 'signatureEmail',
      ];
      for (const k of scalarKeys) {
        if (dto[k] !== undefined) data[k] = dto[k];
      }
      if (dto.validUntil !== undefined) {
        data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
      }

      // Lignes fournies -> delete-then-create + recalcul des totaux.
      if (dto.lines !== undefined) {
        await tx.quoteLine.deleteMany({ where: { quoteId: id } });
        const totals = this.computeTotals(dto.lines);
        data.totalHT = totals.totalHT;
        data.totalTTC = totals.totalTTC;
        data.lines = {
          create: dto.lines.map((line, idx) => this.mapLineCreate(line, idx)),
        };
      }

      return tx.quote.update({
        where: { id },
        data,
        include: { lines: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async delete(workspaceId: string, id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.quote.findFirst({ where: { id, workspaceId } });
      if (!existing) throw new NotFoundException(`Quote ${id} not found`);
      return tx.quote.delete({ where: { id } });
    });
  }

  /** Marque le devis comme converti (facture) avec un numero F-{annee}-{NNNN} continu. */
  async convertToInvoice(workspaceId: string, id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.quote.findFirst({ where: { id, workspaceId } });
      if (!existing) throw new NotFoundException(`Quote ${id} not found`);

      const year = new Date().getFullYear();
      const count = await tx.quote.count({ where: { workspaceId, status: 'INVOICED' } });
      const number = `F-${year}-${String(count + 1).padStart(4, '0')}`;

      return tx.quote.update({
        where: { id },
        data: { status: 'INVOICED', reference: number },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
    });
  }
}
