import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select ciblé
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.supplierOrder.findMany({
        where: { workspaceId },
        select: {
          id: true,
          reference: true,
          notes: true,
          orderedAt: true,
          createdAt: true,
          updatedAt: true,
          project: { select: { id: true, name: true, reference: true } },
          supplier: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.supplierOrder.count({ where: { workspaceId } }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByProject(workspaceId: string, projectId: string) {
    // OPTIMISATION: Utiliser select au lieu de include
    return this.prisma.supplierOrder.findMany({
      where: { workspaceId, projectId },
      select: {
        id: true,
        reference: true,
        notes: true,
        orderedAt: true,
        createdAt: true,
        updatedAt: true,
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, dto: any) {
    return this.prisma.supplierOrder.create({
      data: { ...dto, workspaceId },
      select: {
        id: true,
        reference: true,
        notes: true,
        orderedAt: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select au lieu de include
    return this.prisma.supplierOrder.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        reference: true,
        notes: true,
        orderedAt: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { id: true, name: true, reference: true, saleAmount: true },
        },
        supplier: {
          select: { id: true, name: true, email: true, phone: true, website: true },
        },
        lines: {
          select: {
            id: true,
            sku: true,
            description: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });
  }

  async updateNotes(workspaceId: string, id: string, notes: string) {
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.supplierOrder.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.supplierOrder.update({
        where: { id },
        data: { notes },
        select: { id: true, reference: true, notes: true, updatedAt: true },
      });
    });
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et suppression
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.supplierOrder.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.supplierOrder.delete({ where: { id } });
    });
  }
}
