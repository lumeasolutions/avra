import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(workspaceId: string, userId: string, unreadOnly = false, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select ciblé
    // NOTE: Index sur (workspaceId, userId, isRead) pour optimiser les requêtes unreadOnly
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { workspaceId, userId, ...(unreadOnly && { isRead: false }) },
        select: {
          id: true,
          scope: true,
          type: true,
          message: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({
        where: { workspaceId, userId, ...(unreadOnly && { isRead: false }) },
      }),
    ]);

    return { data, total, page, pageSize };
  }

  async markAsRead(workspaceId: string, id: string) {
    // OPTIMISATION: Vérifier l'appartenance à l'utilisateur et mettre à jour en une seule requête
    return this.prisma.notification.updateMany({
      where: { id, workspaceId },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
