import { Injectable, NotFoundException } from '@nestjs/common';
// NOTE: the project ships a manual @prisma/client shim
// (apps/api/src/types/prisma-client.d.ts) that does NOT expose `Prisma.Decimal`
// nor the generated `Prisma.QuoteUpdateInput` type. We therefore import the
// `Decimal` runtime class directly from the Prisma library and rely on the
// model accessor (which is `any` in the shim) for queries. Math is still
// performed via Decimal — never `Number` — so we keep exact 2-decimal
// arithmetic on the wire.
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto, CreateQuoteLineDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  // Map a DTO line (string-based) to Prisma create input with Decimal
  // arithmetic. We never coerce quantity / unitPrice / vatRate to Number — they
  // stay as Decimal so server-side math is exact.
  private mapLineCreate(line: CreateQuoteLineDto, index: number) {
    return {
      description: line.description,
      quantity: new Decimal(line.quantity),
      unitPrice: new Decimal(line.unitPrice),
      ...(line.vatRate !== undefined && { vatRate: new Decimal(line.vatRate) }),
      position: line.position ?? index,
    };
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
    if (!quote) {
      throw new NotFoundException(`Quote ${id} not found`);
    }
    return quote;
  }

  async create(workspaceId: string, dto: CreateQuoteDto) {
    return this.prisma.quote.create({
      data: {
        workspaceId,
        projectId: dto.projectId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes,
        lines: {
          create: (dto.lines ?? []).map((line, idx) => this.mapLineCreate(line, idx)),
        },
      },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateQuoteDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.quote.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        throw new NotFoundException(`Quote ${id} not found`);
      }

      const data: Record<string, unknown> = {};
      if (dto.validUntil !== undefined) {
        data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
      }
      if (dto.notes !== undefined) {
        data.notes = dto.notes;
      }

      // delete-then-create lines if provided
      if (dto.lines !== undefined) {
        await tx.quoteLine.deleteMany({ where: { quoteId: id } });
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
      if (!existing) {
        throw new NotFoundException(`Quote ${id} not found`);
      }
      return tx.quote.delete({ where: { id } });
    });
  }

  async convertToInvoice(workspaceId: string, id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.quote.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        throw new NotFoundException(`Quote ${id} not found`);
      }

      // Atomic counter inside the transaction — concurrent calls serialise on
      // the row level. For true cross-tx safety a SELECT FOR UPDATE on a
      // dedicated counter row would be ideal (V2.B2).
      const count = await tx.quote.count({
        where: { workspaceId, status: 'INVOICED' },
      });
      const number = `F-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      return tx.quote.update({
        where: { id },
        data: { status: 'INVOICED', notes: number },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
    });
  }
}
