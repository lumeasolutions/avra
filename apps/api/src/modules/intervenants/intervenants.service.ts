import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIntervenantDto } from './dto/create-intervenant.dto';
import { UpdateIntervenantDto } from './dto/update-intervenant.dto';
import { IntervenantType } from '../../prisma-enums';

@Injectable()
export class IntervenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateIntervenantDto) {
    return this.prisma.intervenant.create({
      data: { ...dto, workspaceId },
    });
  }

  async findAll(workspaceId: string, type?: IntervenantType, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select ciblé
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.intervenant.findMany({
        where: { workspaceId, ...(type && { type }) },
        select: {
          id: true,
          type: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          portalEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ companyName: 'asc' }, { lastName: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.intervenant.count({ where: { workspaceId, ...(type && { type }) } }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select pour charger seulement les données nécessaires
    return this.prisma.intervenant.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        type: true,
        companyName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        notes: true,
        portalEnabled: true,
        createdAt: true,
        updatedAt: true,
        // Limiter projects avec select
        projects: {
          select: {
            assignedAt: true,
            project: { select: { id: true, name: true, reference: true } },
          },
          take: 20,
        },
        // Limiter requests
        requests: {
          select: {
            id: true,
            status: true,
            message: true,
            sentAt: true,
            createdAt: true,
          },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateIntervenantDto) {
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.intervenant.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.intervenant.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          type: true,
        },
      });
    });
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et suppression
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.intervenant.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.intervenant.delete({ where: { id } });
    });
  }
}
