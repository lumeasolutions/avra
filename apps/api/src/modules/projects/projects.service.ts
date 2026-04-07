import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectWithClientDto } from './dto/create-project-with-client.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectLifecycleStatus, TradeType } from '../../prisma-enums';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithClient(workspaceId: string, userId: string | undefined, dto: CreateProjectWithClientDto) {
    // ✅ TRANSACTION: if project.create fails, client.create is rolled back
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          workspaceId,
          type: dto.clientType,
          companyName: dto.companyName,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          notes: dto.clientNotes,
        },
      });
      return tx.project.create({
        data: {
          workspaceId,
          clientId: client.id,
          ownerId: userId,
          name: dto.name,
          reference: dto.reference,
          tradeType: dto.tradeType,
        },
        include: { client: true, owner: { select: { id: true, firstName: true, lastName: true } } },
      });
    });
  }

  async create(workspaceId: string, userId: string | undefined, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        workspaceId,
        ownerId: userId,
      },
      include: { client: true, owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findAll(
    workspaceId: string,
    filters?: { status?: ProjectLifecycleStatus; tradeType?: TradeType; page?: number; pageSize?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { workspaceId, lifecycleStatus: filters?.status, tradeType: filters?.tradeType },
        include: {
          client: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { documents: true, events: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.project.count({
        where: { workspaceId, lifecycleStatus: filters?.status, tradeType: filters?.tradeType },
      }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select pour charger uniquement les champs nécessaires
    return this.prisma.project.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        reference: true,
        tradeType: true,
        lifecycleStatus: true,
        pipelineStatus: true,
        priority: true,
        description: true,
        saleAmount: true,
        purchaseAmount: true,
        saleSignedAt: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        // Relations optimisées avec select ciblé
        client: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        // Limiter folders avec select
        folders: {
          select: {
            id: true,
            name: true,
            position: true,
          },
          orderBy: { position: 'asc' },
        },
        // Limiter documents avec select
        documents: {
          select: {
            id: true,
            title: true,
            kind: true,
            visibilityClient: true,
            createdAt: true,
          },
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
        // Optimiser projectIntervenants
        projectIntervenants: {
          select: {
            assignedAt: true,
            intervenant: {
              select: {
                id: true,
                type: true,
                companyName: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateProjectDto) {
    // OPTIMISATION: Fusionner vérification et update en une seule transaction
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.project.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          name: true,
          reference: true,
          lifecycleStatus: true,
          pipelineStatus: true,
          client: {
            select: { id: true, companyName: true, firstName: true, lastName: true },
          },
        },
      });
    });
  }

  async setSigned(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.project.update({
        where: { id },
        data: { lifecycleStatus: 'SIGNE', saleSignedAt: new Date() },
        select: {
          id: true,
          lifecycleStatus: true,
          saleSignedAt: true,
        },
      });
    });
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et suppression en transaction
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.project.delete({ where: { id } });
    });
  }
}
