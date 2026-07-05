import { Injectable, ForbiddenException } from '@nestjs/common';
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
        // Donnees dossier (VAGUE 2)
        terminated: true,
        terminatedAt: true,
        archivedAt: true,
        vendeurName: true,
        statsSkipped: true,
        prixLignes: true,
        confirmations: true,
        dateButoires: true,
        dossierBoard: true,
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

  /**
   * Cloisonnement vendeur : un MEMBER ne peut modifier qu'un dossier qu'il a
   * créé (ownerId). ADMIN/OWNER peuvent tout. Aligné sur le gating d'interface.
   */
  private assertCanWrite(
    existing: { ownerId: string | null },
    actor: { sub: string; role: string },
  ): void {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'OWNER';
    if (!isAdmin && existing.ownerId !== actor.sub) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres dossiers.');
    }
  }

  async update(workspaceId: string, id: string, dto: UpdateProjectDto, actor: { sub: string; role: string }) {
    // OPTIMISATION: Fusionner vérification et update en une seule transaction
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      this.assertCanWrite(existing, actor);
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

  async setSigned(workspaceId: string, id: string, actor: { sub: string; role: string }) {
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      this.assertCanWrite(existing, actor);
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

  /**
   * Toggle "Dossier terminé" — chantier entièrement clos (pose + livraison + SAV).
   * Réversible : un second appel rouvre le dossier. Distinct de lifecycleStatus
   * pour préserver l'historique métier (CLOTURE, SAV) — on suit ici la logique
   * commerciale "tout est livré et fini" du dashboard /dossiers-signes.
   *
   * @param terminated true = clôt, false = rouvre
   * @returns null si dossier introuvable ou hors workspace
   */
  async setTerminated(workspaceId: string, id: string, terminated: boolean, actor: { sub: string; role: string }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      this.assertCanWrite(existing, actor);
      const now = new Date();
      return tx.project.update({
        where: { id },
        data: {
          terminated,
          terminatedAt: terminated ? now : null,
          // Terminer un dossier l'archive (VAGUE 2). Le rouvrir le desarchive.
          archivedAt: terminated ? now : null,
        },
        select: {
          id: true,
          terminated: true,
          terminatedAt: true,
          archivedAt: true,
        },
      });
    });
  }

  /**
   * Persiste les donnees metier du dossier (VAGUE 2 — 28/05/2026).
   * Mise a jour partielle : seuls les champs presents (!== undefined) sont
   * ecrits. Les JSON (prixLignes/confirmations/dateButoires) sont stockes tels
   * quels. Sert au sync optimiste depuis le store Zustand cote frontend.
   */
  async saveDossierData(
    workspaceId: string,
    id: string,
    data: {
      prixLignes?: unknown;
      confirmations?: unknown;
      dateButoires?: unknown;
      dossierBoard?: unknown;
      vendeurName?: string | null;
      statsSkipped?: boolean;
      terminated?: boolean;
      terminatedAt?: string | null;
      archivedAt?: string | null;
    },
    actor: { sub: string; role: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      this.assertCanWrite(existing, actor);

      const patch: Record<string, unknown> = {};
      if (data.prixLignes !== undefined) patch.prixLignes = data.prixLignes as any;
      if (data.confirmations !== undefined) patch.confirmations = data.confirmations as any;
      if (data.dateButoires !== undefined) patch.dateButoires = data.dateButoires as any;
      if (data.dossierBoard !== undefined) patch.dossierBoard = data.dossierBoard as any;
      if (data.vendeurName !== undefined) patch.vendeurName = data.vendeurName;
      if (data.statsSkipped !== undefined) patch.statsSkipped = !!data.statsSkipped;
      if (data.terminated !== undefined) patch.terminated = !!data.terminated;
      if (data.terminatedAt !== undefined) {
        patch.terminatedAt = data.terminatedAt ? new Date(data.terminatedAt) : null;
      }
      if (data.archivedAt !== undefined) {
        patch.archivedAt = data.archivedAt ? new Date(data.archivedAt) : null;
      }

      if (Object.keys(patch).length === 0) return { id: existing.id };

      return tx.project.update({
        where: { id },
        data: patch as any,
        select: { id: true },
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
