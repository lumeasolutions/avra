import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param userId filtre sur un membre de l'equipe — c'est la lecture
   *   attendue par l'administrateur : « qu'a fait ce vendeur ? »
   */
  async findByWorkspace(
    workspaceId: string,
    projectId?: string,
    page = 1,
    pageSize = 100,
    userId?: string,
  ) {
    // OPTIMISATION: Utiliser pagination au lieu de limit, et select pour optimiser
    const skip = (page - 1) * pageSize;
    const where = { workspaceId, ...(projectId && { projectId }), ...(userId && { userId }) };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          changes: true,
          ipAddress: true,
          createdAt: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
