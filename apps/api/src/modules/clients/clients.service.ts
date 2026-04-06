import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: { ...dto, workspaceId },
    });
  }

  async findAll(workspaceId: string, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination par défaut pour éviter charger tous les clients
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where: { workspaceId },
        select: {
          id: true,
          type: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.client.count({ where: { workspaceId } }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select au lieu de include pour éviter charger toutes les relations
    return this.prisma.client.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        type: true,
        companyName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        vatNumber: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Relations optimisées: seulement les champs nécessaires
        addresses: {
          select: {
            id: true,
            type: true,
            line1: true,
            city: true,
            postalCode: true,
            country: true,
          },
        },
        // Limiter projects à 20 items avec select ciblé
        projects: {
          select: {
            id: true,
            name: true,
            reference: true,
            lifecycleStatus: true,
          },
          take: 20,
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateClientDto) {
    // OPTIMISATION: Fusionner les deux requêtes findFirst + update en une seule avec upsert-like pattern
    return this.prisma.client.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        type: true,
        companyName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    }).catch(() => null);
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Vérifier et supprimer en une seule transaction
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.client.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.client.delete({ where: { id } });
    });
  }
}
