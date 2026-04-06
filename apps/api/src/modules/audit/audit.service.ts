import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string, projectId?: string, page = 1, pageSize = 100) {
    // OPTIMISATION: Utiliser pagination au lieu de limit, et select pour optimiser
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { workspaceId, ...(projectId && { projectId }) },
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
      this.prisma.auditLog.count({
        where: { workspaceId, ...(projectId && { projectId }) },
      }),
    ]);

    return { data, total, page, pageSize };
  }
}
