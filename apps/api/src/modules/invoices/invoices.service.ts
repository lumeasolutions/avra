import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
// Shim @prisma/client manuel -> on importe Decimal du runtime et on fait toute
// l'arithmetique monetaire en Decimal (jamais Number) pour des centimes exacts.
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto, CreateInvoiceLineDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ConvertQuoteDto } from './dto/convert-quote.dto';

const PREFIX_BY_TYPE: Record<string, string> = {
  AVOIR: 'AV',
  ACOMPTE: 'FA',
  INTERMEDIAIRE: 'FA',
  SOLDE: 'F',
  STANDARD: 'F',
};

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapLineCreate(line: CreateInvoiceLineDto, index: number) {
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

  private lineTotals(line: { quantity: string | Decimal; unitPrice: string | Decimal; vatRate?: string | Decimal; discount?: string | Decimal }) {
    const qty = new Decimal(line.quantity);
    const pu = new Decimal(line.unitPrice);
    const disc = new Decimal(line.discount ?? '0').div(100);
    const vat = new Decimal(line.vatRate ?? '20').div(100);
    const ht = qty.mul(pu).mul(new Decimal(1).minus(disc));
    const tva = ht.mul(vat);
    return { ht, tva };
  }

  private computeTotals(lines: CreateInvoiceLineDto[]) {
    let totalHT = new Decimal(0);
    let totalTVA = new Decimal(0);
    for (const l of lines ?? []) {
      const { ht, tva } = this.lineTotals(l);
      totalHT = totalHT.plus(ht);
      totalTVA = totalTVA.plus(tva);
    }
    return {
      totalHT: totalHT.toDecimalPlaces(2),
      totalTVA: totalTVA.toDecimalPlaces(2),
      totalTTC: totalHT.plus(totalTVA).toDecimalPlaces(2),
    };
  }

  /**
   * Numero par SERIE (F / FA / AV) pour l'annee, SANS doublon ni trou de sequence.
   *
   * 1) Verrou consultatif transactionnel (pg_advisory_xact_lock) sur la serie
   *    (workspace+prefixe+annee) : serialise la generation de numero -> deux
   *    creations concurrentes ne peuvent pas obtenir le meme numero. Le verrou
   *    est libere automatiquement a la fin de la transaction.
   * 2) On repart du plus GRAND numero existant de la serie (pas d'un count() qui
   *    regresse apres une suppression), puis +1.
   *
   * Doit etre appele DANS un $transaction (tx).
   */
  private async nextReference(tx: any, workspaceId: string, type: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = PREFIX_BY_TYPE[type] ?? 'F';
    const serie = `${prefix}-${year}-`;

    // Verrou par serie — evite les numeros dupliques en creation concurrente.
    // Meme cle que QuotesService.convertToInvoice pour la serie F- : les deux
    // chemins de conversion sont ainsi mutuellement exclusifs.
    const lockKey = `invoice:${workspaceId}:${prefix}:${year}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    // Max sur les DEUX tables : un devis converti via quote.convertToInvoice
    // porte aussi une reference F- (legacy), il faut en tenir compte.
    const [invRows, quoteRows] = await Promise.all([
      tx.invoice.findMany({ where: { workspaceId, reference: { startsWith: serie } }, select: { reference: true } }),
      tx.quote.findMany({ where: { workspaceId, reference: { startsWith: serie } }, select: { reference: true } }),
    ]);
    let max = 0;
    for (const r of [...invRows, ...quoteRows]) {
      const n = parseInt(String(r.reference).slice(serie.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `${serie}${String(max + 1).padStart(4, '0')}`;
  }

  /**
   * Un AVOIR (note de credit) porte des montants NEGATIFs. On normalise les
   * prix unitaires en -abs(prix) de facon idempotente (rejouable sans double
   * inversion), pour que lignes ET totaux soient coherents et reduisent le CA.
   */
  private normalizeAvoirLines<T extends { unitPrice: string | number | Decimal }>(
    lines: T[],
    type: string,
  ): T[] {
    if (type !== 'AVOIR') return lines ?? [];
    return (lines ?? []).map((l) => ({
      ...l,
      unitPrice: new Decimal(l.unitPrice).abs().negated().toString(),
    }));
  }

  async findAll(workspaceId: string, projectId?: string) {
    return this.prisma.invoice.findMany({
      where: { workspaceId, ...(projectId && { projectId }) },
      include: { lines: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, workspaceId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async create(workspaceId: string, dto: CreateInvoiceDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const type = dto.type ?? 'STANDARD';
      // Anti-IDOR : projectId / quoteId doivent appartenir au workspace de l'appelant.
      if (dto.projectId) {
        const p = await tx.project.findFirst({ where: { id: dto.projectId, workspaceId }, select: { id: true } });
        if (!p) throw new NotFoundException('Projet introuvable');
      }
      if (dto.quoteId) {
        const q = await tx.quote.findFirst({ where: { id: dto.quoteId, workspaceId }, select: { id: true } });
        if (!q) throw new NotFoundException('Devis introuvable');
      }
      const lines = this.normalizeAvoirLines(dto.lines ?? [], type);
      const totals = this.computeTotals(lines);
      // La référence est TOUJOURS générée serveur (séquence légale continue), jamais fournie par le client.
      const reference = await this.nextReference(tx, workspaceId, type);
      return tx.invoice.create({
        data: {
          workspaceId,
          projectId: dto.projectId ?? null,
          quoteId: dto.quoteId ?? null,
          reference,
          type,
          status: dto.status ?? 'EN_ATTENTE',
          clientName: dto.clientName ?? null,
          clientEmail: dto.clientEmail ?? null,
          clientAddress: dto.clientAddress ?? null,
          objet: dto.objet ?? null,
          conditionsPaiement: dto.conditionsPaiement ?? null,
          date: dto.date ? new Date(dto.date) : new Date(),
          dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : null,
          notes: dto.notes ?? null,
          // Token du portail public généré serveur (jamais fourni par le client).
          token: randomBytes(32).toString('hex'),
          montantDeja: dto.montantDeja != null ? new Decimal(dto.montantDeja) : null,
          totalHT: totals.totalHT,
          totalTVA: totals.totalTVA,
          totalTTC: totals.totalTTC,
          lines: { create: lines.map((l, i) => this.mapLineCreate(l, i)) },
        },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateInvoiceDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.invoice.findFirst({ where: { id, workspaceId } });
      if (!existing) throw new NotFoundException(`Invoice ${id} not found`);

      // Anti-IDOR : un rattachement projet/devis modifié doit rester dans le workspace.
      if (dto.projectId) {
        const p = await tx.project.findFirst({ where: { id: dto.projectId, workspaceId }, select: { id: true } });
        if (!p) throw new NotFoundException('Projet introuvable');
      }
      if (dto.quoteId) {
        const q = await tx.quote.findFirst({ where: { id: dto.quoteId, workspaceId }, select: { id: true } });
        if (!q) throw new NotFoundException('Devis introuvable');
      }

      const data: Record<string, unknown> = {};
      // 'reference' et 'token' RETIRÉS : immuables après création (séquence légale + sécurité portail).
      const scalar: (keyof UpdateInvoiceDto)[] = [
        'projectId', 'quoteId', 'type', 'status', 'clientName',
        'clientEmail', 'clientAddress', 'objet', 'conditionsPaiement', 'notes',
      ];
      for (const k of scalar) if (dto[k] !== undefined) data[k] = dto[k];
      if (dto.date !== undefined) data.date = dto.date ? new Date(dto.date) : new Date();
      if (dto.dateEcheance !== undefined) data.dateEcheance = dto.dateEcheance ? new Date(dto.dateEcheance) : null;
      if (dto.montantDeja !== undefined) data.montantDeja = dto.montantDeja != null ? new Decimal(dto.montantDeja) : null;

      if (dto.lines !== undefined) {
        await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
        const totals = this.computeTotals(dto.lines);
        data.totalHT = totals.totalHT;
        data.totalTVA = totals.totalTVA;
        data.totalTTC = totals.totalTTC;
        data.lines = { create: dto.lines.map((l, i) => this.mapLineCreate(l, i)) };
      }

      return tx.invoice.update({
        where: { id },
        data,
        include: { lines: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async delete(workspaceId: string, id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.invoice.findFirst({ where: { id, workspaceId } });
      if (!existing) throw new NotFoundException(`Invoice ${id} not found`);
      return tx.invoice.delete({ where: { id } });
    });
  }

  /**
   * Convertit un devis en facture. `pourcentage` (1-100) applique a chaque ligne
   * pour les factures d'acompte/intermediaire. Pour une facture de SOLDE, on
   * calcule `montantDeja` = somme des TTC des factures d'acompte deja emises
   * pour ce devis, afin que le "net a payer" = total - acomptes.
   */
  async convertFromQuote(workspaceId: string, dto: ConvertQuoteDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const quote = await tx.quote.findFirst({
        where: { id: dto.quoteId, workspaceId },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
      if (!quote) throw new NotFoundException(`Quote ${dto.quoteId} not found`);

      const type = dto.type ?? 'STANDARD';
      const pct = new Decimal(dto.pourcentage ?? 100).div(100);
      const isPartial = type === 'ACOMPTE' || type === 'INTERMEDIAIRE';

      const lines = (quote.lines ?? []).map((l: any, i: number) => ({
        description: l.description + (isPartial ? ` (${type.toLowerCase()} ${dto.pourcentage ?? 100}%)` : ''),
        quantity: new Decimal(l.quantity).toString(),
        unitPrice: isPartial ? new Decimal(l.unitPrice).mul(pct).toDecimalPlaces(2).toString() : new Decimal(l.unitPrice).toString(),
        vatRate: new Decimal(l.vatRate ?? 20).toString(),
        discount: new Decimal(l.discount ?? 0).toString(),
        unit: l.unit ?? undefined,
        position: i,
      }));

      let montantDeja: Decimal | null = null;
      if (type === 'SOLDE') {
        const acomptes = await tx.invoice.findMany({
          where: { workspaceId, quoteId: quote.id, type: { in: ['ACOMPTE', 'INTERMEDIAIRE'] } },
          select: { totalTTC: true },
        });
        montantDeja = acomptes.reduce((s: Decimal, a: any) => s.plus(new Decimal(a.totalTTC ?? 0)), new Decimal(0)).toDecimalPlaces(2);
      }

      // AVOIR -> montants negatifs (idempotent). Neutre pour les autres types.
      const finalLines = this.normalizeAvoirLines(lines, type);
      const totals = this.computeTotals(finalLines as any);

      // SOLDE : les acomptes deja encaisses ne peuvent pas depasser le total TTC
      // (sinon "net a payer" = totalTTC - montantDeja deviendrait negatif).
      if (type === 'SOLDE' && montantDeja && montantDeja.greaterThan(totals.totalTTC)) {
        montantDeja = totals.totalTTC;
      }

      const reference = await this.nextReference(tx, workspaceId, type);

      return tx.invoice.create({
        data: {
          workspaceId,
          projectId: quote.projectId ?? null,
          quoteId: quote.id,
          reference,
          type,
          status: type === 'AVOIR' ? 'AVOIR' : 'EN_ATTENTE',
          clientName: quote.clientName ?? null,
          clientEmail: quote.clientEmail ?? null,
          clientAddress: quote.clientAddress ?? null,
          objet: quote.objet ?? null,
          conditionsPaiement: quote.conditionsPaiement ?? null,
          date: new Date(),
          dateEcheance: new Date(Date.now() + 30 * 86400000),
          notes: quote.notes ?? null,
          montantDeja,
          totalHT: totals.totalHT,
          totalTVA: totals.totalTVA,
          totalTTC: totals.totalTTC,
          lines: { create: (finalLines as any).map((l: any, i: number) => this.mapLineCreate(l, i)) },
        },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
    });
  }
}
