import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Conversion sûre Decimal/null -> number. */
const num = (v: unknown): number => (v == null ? 0 : Number(v));

function mapLines(lines: Array<Record<string, unknown>>) {
  return (lines ?? [])
    .slice()
    .sort((a, b) => num(a.position) - num(b.position))
    .map((l) => ({
      id: String(l.id),
      description: (l.description as string) ?? '',
      quantite: num(l.quantity),
      unite: (l.unit as string) ?? '',
      prixUnitaireHT: num(l.unitPrice),
      tva: num(l.vatRate),
      remise: num(l.discount),
    }));
}

/**
 * Service du portail public e-facturation.
 * Sert un devis/facture à partir de son token (lien envoyé au client final),
 * et enregistre l'acceptation/refus d'un devis. AUCUNE authentification :
 * le token (aléatoire, stocké en base) fait office de clé d'accès.
 */
@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bloc « émetteur » à partir du workspace + ses réglages (best-effort). */
  private async emitter(workspaceId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, settings: { select: { address: true, siret: true } } },
    });
    return {
      nom: ws?.name ?? '',
      adresse: ws?.settings?.address ?? '',
      codePostal: '',
      ville: '',
      siret: ws?.settings?.siret ?? '',
      tva: '',
      phone: '',
      email: '',
    };
  }

  async getByToken(token: string) {
    if (!token) throw new NotFoundException('Document introuvable');

    const quote = await this.prisma.quote.findFirst({
      where: { token },
      include: { lines: true },
    });
    if (quote) {
      return {
        type: 'devis' as const,
        ref: quote.reference ?? '',
        statut: quote.status ?? 'BROUILLON',
        client: quote.clientName ?? '',
        clientEmail: quote.clientEmail ?? undefined,
        clientAddress: quote.clientAddress ?? undefined,
        dateCreation: quote.createdAt,
        dateValidite: quote.validUntil ?? undefined,
        conditionsPaiement: quote.conditionsPaiement ?? undefined,
        notes: quote.notes ?? undefined,
        lignes: mapLines(quote.lines as unknown as Array<Record<string, unknown>>),
        totalHT: num(quote.totalHT),
        totalTTC: num(quote.totalTTC),
        societe: await this.emitter(quote.workspaceId),
      };
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { token },
      include: { lines: true },
    });
    if (invoice) {
      return {
        type: 'facture' as const,
        ref: invoice.reference ?? '',
        statut: invoice.status ?? 'EN ATTENTE',
        client: invoice.clientName ?? '',
        clientEmail: invoice.clientEmail ?? undefined,
        clientAddress: invoice.clientAddress ?? undefined,
        dateCreation: invoice.date,
        dateEcheance: invoice.dateEcheance ?? undefined,
        conditionsPaiement: invoice.conditionsPaiement ?? undefined,
        notes: invoice.notes ?? undefined,
        lignes: mapLines(invoice.lines as unknown as Array<Record<string, unknown>>),
        totalHT: num(invoice.totalHT),
        totalTTC: num(invoice.totalTTC),
        societe: await this.emitter(invoice.workspaceId),
      };
    }

    throw new NotFoundException('Document introuvable');
  }

  /** Acceptation / refus d'un devis par le client (depuis le lien public). */
  async respond(token: string, body: { action: 'accept' | 'refuse'; signerName?: string }) {
    if (!token || (body?.action !== 'accept' && body?.action !== 'refuse')) {
      throw new BadRequestException('Requête invalide.');
    }
    const quote = await this.prisma.quote.findFirst({
      where: { token },
      select: { id: true, status: true },
    });
    if (!quote) throw new NotFoundException('Devis introuvable.');

    // Réponse autorisée seulement tant que le devis est en attente.
    if (!['BROUILLON', 'ENVOYÉ'].includes(quote.status ?? '')) {
      throw new BadRequestException('Ce devis a déjà été traité.');
    }

    const newStatus = body.action === 'accept' ? 'ACCEPTÉ' : 'REFUSÉ';
    await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: newStatus,
        ...(body.action === 'accept' ? { signedAt: new Date() } : {}),
      },
    });
    return { ok: true, statut: newStatus };
  }
}
