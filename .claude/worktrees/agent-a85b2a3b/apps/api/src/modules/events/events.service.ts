import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventCalendarType } from '../../prisma-enums';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateEventDto) {
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
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.event.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.event.update({
        where: { id },
        data: dto,
        select: { id: true, title: true, startAt: true, updatedAt: true },
      });
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
