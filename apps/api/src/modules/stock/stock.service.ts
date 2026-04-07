import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockItemStatus } from '../../prisma-enums';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateStockItemDto) {
    return this.prisma.stockItem.create({
      data: { ...dto, workspaceId },
    });
  }

  async findAll(workspaceId: string, status?: StockItemStatus, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select ciblé
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where: { workspaceId, ...(status && { status }) },
        select: {
          id: true,
          status: true,
          category: true,
          sku: true,
          name: true,
          model: true,
          color: true,
          purchasePrice: true,
          salePrice: true,
          quantity: true,
          createdAt: true,
          updatedAt: true,
          // Supplier avec select limité
          supplier: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.stockItem.count({ where: { workspaceId, ...(status && { status }) } }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select au lieu de include
    return this.prisma.stockItem.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        status: true,
        category: true,
        sku: true,
        name: true,
        model: true,
        color: true,
        material: true,
        purchasePrice: true,
        salePrice: true,
        quantity: true,
        createdAt: true,
        updatedAt: true,
        supplier: {
          select: { id: true, name: true, email: true, phone: true, website: true },
        },
        // Limiter les projets
        projectStockItems: {
          select: {
            quantity: true,
            reserved: true,
            project: { select: { id: true, name: true, reference: true } },
          },
          take: 10,
        },
      },
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateStockItemDto) {
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockItem.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.stockItem.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          name: true,
          quantity: true,
          status: true,
          salePrice: true,
          updatedAt: true,
        },
      });
    });
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et suppression
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockItem.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.stockItem.delete({ where: { id } });
    });
  }
}
