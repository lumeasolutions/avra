import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
// Le projet embarque un shim @prisma/client manuel
// (apps/api/src/types/prisma-client.d.ts) qui n'expose pas `Prisma.Decimal`.
// On importe donc la classe Decimal directement depuis le runtime Prisma et on
// fait TOUTE l'arithmetique monetaire en Decimal — jamais en Number — pour
// preserver des centimes exacts sur le fil.
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto, CreateQuoteLineDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
  ) {}

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

  /**
   * Genere une reference D-{annee}-{NNN} SANS doublon ni trou :
   * - verrou consultatif transactionnel sur la serie (workspace+annee) pour
   *   serialiser les creations concurrentes,
   * - numero base sur le PLUS GRAND existant (delete-safe), pas sur un count().
   * Doit etre appele DANS un $transaction (tx).
   */
  /**
   * REST 13/07/2026 — Préfixe devis configurable (Paramètres > Numérotation).
   * Fallback total sur 'D' (défaut config identique) → non-breaking.
   */
  private async resolveDevisPrefix(workspaceId: string): Promise<string> {
    try {
      const row = await this.prisma.workspaceSettings.findUnique({
        where: { workspaceId },
        select: { extra: true },
      });
      const num = (row?.extra as any)?.numerotation;
      const pd = num && typeof num.prefixeDevis === 'string' && num.prefixeDevis.trim() ? num.prefixeDevis.trim() : 'D';
      return pd;
    } catch {
      return 'D';
    }
  }

  private async nextReference(tx: any, workspaceId: string, prefixOverride?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = prefixOverride ?? 'D';
    const serie = `${prefix}-${year}-`;
    const lockKey = `quote:${workspaceId}:${prefix}:${year}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const rows = await tx.quote.findMany({
      where: { workspaceId, reference: { startsWith: serie } },
      select: { reference: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = parseInt(String(r.reference).slice(serie.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `${serie}${String(max + 1).padStart(3, '0')}`;
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
    const devisPrefix = await this.resolveDevisPrefix(workspaceId);
    return this.prisma.$transaction(async (tx: any) => {
      // Anti-IDOR : le projet rattaché doit appartenir au workspace.
      if (dto.projectId) {
        const p = await tx.project.findFirst({ where: { id: dto.projectId, workspaceId }, select: { id: true } });
        if (!p) throw new NotFoundException('Projet introuvable');
      }
      const totals = this.computeTotals(dto.lines);
      // Référence TOUJOURS générée serveur (séquence légale), jamais fournie par le client.
      const reference = await this.nextReference(tx, workspaceId, devisPrefix);
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
          // Token du portail public généré serveur (jamais fourni par le client) → non énumérable.
          token: randomBytes(32).toString('hex'),
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

      // Anti-IDOR : rattachement projet modifié doit rester dans le workspace.
      if (dto.projectId) {
        const p = await tx.project.findFirst({ where: { id: dto.projectId, workspaceId }, select: { id: true } });
        if (!p) throw new NotFoundException('Projet introuvable');
      }

      const data: Record<string, unknown> = {};
      // 'reference' et 'token' RETIRÉS : immuables après création.
      const scalarKeys: (keyof UpdateQuoteDto)[] = [
        'projectId', 'status', 'clientName', 'clientEmail',
        'clientAddress', 'objet', 'conditionsPaiement', 'notes',
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

  /**
   * Convertit un devis en FACTURE.
   *
   * REST 13/07/2026 — Avant, cette méthode « fantôme » se contentait de muter le
   * devis : elle écrasait sa référence D-{annee}-{NNNN} par une F-{annee}-{NNNN}
   * et passait son status à INVOICED, SANS jamais créer d'enregistrement Invoice.
   * Résultat : le devis perdait sa traçabilité et aucune facture réelle n'existait.
   *
   * On délègue désormais à la vraie conversion (InvoicesService.convertFromQuote),
   * qui crée une Invoice liée (quoteId), copie les lignes/montants et génère la
   * référence via le compteur commun `nextReference` (verrou consultatif). On
   * marque ensuite le devis INVOICED en CONSERVANT sa référence D-.
   */
  async convertToInvoice(workspaceId: string, id: string) {
    const existing = await this.prisma.quote.findFirst({
      where: { id, workspaceId },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException(`Quote ${id} not found`);
    if (existing.status === 'INVOICED') {
      throw new BadRequestException('Ce devis est déjà converti en facture.');
    }

    const invoice = await this.invoices.convertFromQuote(workspaceId, { quoteId: id } as any);

    // Marque le devis converti — sans toucher à sa référence D-.
    await this.prisma.quote.update({
      where: { id },
      data: { status: 'INVOICED' },
    });

    return invoice;
  }
}
