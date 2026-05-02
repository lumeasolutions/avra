import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(workspaceId: string, projectId: string, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.paymentRequest.findMany({
        where: { workspaceId, projectId },
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.paymentRequest.count({ where: { workspaceId, projectId } }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByWorkspace(workspaceId: string, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select ciblé
    // Fix : retire `reference` et `dueDate` qui n'existent pas dans le schema
    // PaymentRequest (causait 500 prod sur GET /payments).
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.paymentRequest.findMany({
        where: { workspaceId },
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          paidAt: true,
          providerRef: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              name: true,
              reference: true,
              client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.paymentRequest.count({ where: { workspaceId } }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(workspaceId: string, dto: CreatePaymentDto) {
    return this.prisma.paymentRequest.create({
      data: { ...dto, workspaceId },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select au lieu de include
    return this.prisma.paymentRequest.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        provider: true,
        providerRef: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { id: true, name: true, reference: true, saleAmount: true },
        },
      },
    });
  }

  async updateStatus(workspaceId: string, id: string, status: string) {
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.paymentRequest.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.paymentRequest.update({
        where: { id },
        data: { status: status as any, paidAt: status === 'PAID' ? new Date() : null },
        select: {
          id: true,
          status: true,
          amount: true,
          paidAt: true,
          updatedAt: true,
        },
      });
    });
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et suppression
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.paymentRequest.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.paymentRequest.delete({ where: { id } });
    });
  }
}
