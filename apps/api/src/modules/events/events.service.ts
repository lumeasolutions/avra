import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventCalendarType } from '../../prisma-enums';
import { parseEventJson } from './event-invite.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🔒 SÉCURITÉ: vérifie qu'un projectId fourni par le client appartient bien
   * au workspace courant. Sinon un utilisateur pouvait rattacher un event au
   * projet d'un autre tenant (et en fuiter le nom via le select `project`).
   */
  private async assertProjectInWorkspace(workspaceId: string, projectId?: string | null) {
    if (!projectId) return;
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });
    if (!project) {
      throw new BadRequestException('Projet introuvable dans ce workspace.');
    }
  }

  async create(workspaceId: string, userId: string, dto: CreateEventDto) {
    await this.assertProjectInWorkspace(workspaceId, dto.projectId);
    return this.prisma.event.create({
      data: {
        ...dto,
        workspaceId,
        createdById: userId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(workspaceId: string, calendarType?: EventCalendarType, from?: Date, to?: Date, page = 1, pageSize = 100) {
    page = Math.max(1, Math.floor(page) || 1);
    pageSize = Math.min(500, Math.max(1, Math.floor(pageSize) || 100));
    // OPTIMISATION: Ajouter pagination et filtres de date appropriés
    const where: { workspaceId: string; calendarType?: EventCalendarType; startAt?: object } = {
      workspaceId,
    };
    if (calendarType) where.calendarType = calendarType;
    if (from && to) where.startAt = { gte: from, lte: to };

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          calendarType: true,
          description: true,
          startAt: true,
          endAt: true,
          allDay: true,
          location: true,
          project: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select au lieu de include
    return this.prisma.event.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        startAt: true,
        endAt: true,
        allDay: true,
        location: true,
        calendarType: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { id: true, name: true, reference: true },
        },
        eventIntervenants: {
          select: {
            intervenant: {
              select: {
                id: true,
                companyName: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateEventDto) {
    await this.assertProjectInWorkspace(workspaceId, dto.projectId);
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.event.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      // L'état d'envoi au client (`invite`) est écrit par le serveur seul
      // (EventInviteService) : le front renvoie la description sans lui lors
      // d'un déplacement / d'une édition → on le conserve.
      const data = { ...dto };
      if (typeof dto.description === 'string') {
        const prev = parseEventJson(existing.description);
        const next = parseEventJson(dto.description);
        if (prev.invite && !next.invite && Object.keys(next).length > 0) {
          data.description = JSON.stringify({ ...next, invite: prev.invite });
        }
      }
      return tx.event.update({
        where: { id },
        data,
        select: { id: true, title: true, startAt: true, updatedAt: true },
      });
    });
  }

  /**
   * RDV servis dans le flux d'abonnement agenda (Google / Outlook / iPhone) :
   * planning classique (+ planning gestion si demandé), de J-90 à J+400.
   */
  async forCalendarFeed(workspaceIds: string[], withGestion: boolean) {
    const now = Date.now();
    return this.prisma.event.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        calendarType: withGestion ? undefined : EventCalendarType.PERSONAL,
        startAt: { gte: new Date(now - 90 * 86400000), lte: new Date(now + 400 * 86400000) },
      },
      select: {
        id: true, title: true, calendarType: true, description: true,
        startAt: true, endAt: true, location: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { startAt: 'asc' },
      take: 3000,
    });
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et suppression
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.event.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.event.delete({ where: { id } });
    });
  }
}
