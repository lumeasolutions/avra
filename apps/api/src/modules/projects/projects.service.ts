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
      // Phase 2 — le créateur est le vendeur par défaut du dossier. On pose le
      // lien structuré (vendeurUserId) ET le snapshot du nom dès la création,
      // pour que la base soit la source de vérité (l'UI n'affiche plus un vendeur
      // qui n'existe pas côté serveur) et que le dossier compte dans les stats.
      const creator = userId
        ? await tx.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, email: true },
          })
        : null;
      const vendeurName = creator
        ? `${creator.firstName ?? ''} ${creator.lastName ?? ''}`.trim() || creator.email
        : null;
      return tx.project.create({
        data: {
          workspaceId,
          clientId: client.id,
          ownerId: userId,
          vendeurUserId: userId ?? null,
          vendeurName,
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
        // Le createur est le vendeur attribue par defaut. Sans cela, un dossier
        // cree par cette voie n'etait attribue a personne — et depuis que
        // l'ecriture se fonde sur l'attribution, son auteur ne pouvait plus le
        // modifier une seconde apres l'avoir cree.
        vendeurUserId:
          (dto as { vendeurUserId?: string | null }).vendeurUserId ?? userId ?? null,
      },
      include: { client: true, owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findAll(
    workspaceId: string,
    filters?: { status?: ProjectLifecycleStatus; tradeType?: TradeType; page?: number; pageSize?: number },
    actor?: { sub: string; role: string },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    // Lecture ouverte a toute l'equipe (regle du 05/10/2026) : un vendeur voit
    // les dossiers de la societe, et ne modifie que les siens — c'est
    // `assertCanWrite` qui tient cette limite. Le serveur ne renvoyait
    // auparavant que les dossiers du vendeur, pendant que l'interface etait
    // ecrite pour les afficher tous : deux regles opposees, et des dossiers
    // qui apparaissaient puis disparaissaient d'une synchronisation a l'autre.
    void actor;
    const where = {
      workspaceId,
      deletedAt: null,
      lifecycleStatus: filters?.status,
      tradeType: filters?.tradeType,
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          client: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { documents: true, events: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(workspaceId: string, id: string, actor?: { sub: string; role: string }) {
    // Lecture ouverte a toute l'equipe (cf. findAll). La limite est a
    // l'ecriture, pas a la consultation.
    void actor;
    // OPTIMISATION: Utiliser select pour charger uniquement les champs nécessaires
    return this.prisma.project.findFirst({
      where: { id, workspaceId, deletedAt: null },
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
        lostReason: true,
        vendeurName: true,
        vendeurUserId: true,
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
   * Cloisonnement vendeur : un MEMBER ne modifie que les dossiers qui lui sont
   * ATTRIBUES (`vendeurUserId`). ADMIN/OWNER modifient tout.
   *
   * C'etait `ownerId`, le createur, jusqu'au 05/10/2026 — alors que la liste,
   * elle, se fondait deja sur l'attribution. Un dossier cree par
   * l'administrateur puis attribue a un vendeur lui etait donc refuse a la
   * modification, et un dossier qu'il avait cree puis qu'on avait reattribue
   * lui restait modifiable. Une seule notion desormais : celle que
   * l'utilisateur voit a l'ecran, le vendeur attribue.
   *
   * Un dossier sans vendeur attribue (anciens dossiers non retro-remplis)
   * reste reserve a l'administrateur.
   */
  private assertCanWrite(
    existing: { vendeurUserId?: string | null },
    actor: { sub: string; role: string },
  ): void {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'OWNER';
    if (!isAdmin && existing.vendeurUserId !== actor.sub) {
      throw new ForbiddenException(
        existing.vendeurUserId
          ? 'Ce dossier est attribué à un autre vendeur.'
          : "Ce dossier n'est attribué à personne : seul un administrateur peut le modifier.",
      );
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
      vendeurUserId?: string | null;
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
      if (data.vendeurUserId !== undefined) {
        // Robustesse : ne poser le lien FK que si l'userId est bien un membre de
        // CE workspace. Un id inconnu (membre local non hydraté, données de test)
        // ne doit pas faire échouer la contrainte FK — on retombe sur null en
        // conservant le snapshot vendeurName.
        let vId = data.vendeurUserId || null;
        if (vId) {
          const member = await tx.userWorkspace.findFirst({
            where: { userId: vId, workspaceId },
            select: { id: true },
          });
          if (!member) vId = null;
        }
        patch.vendeurUserId = vId;
      }
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

  /**
   * Suppression reversible : le dossier quitte les listes mais reste en base,
   * recuperable depuis la corbeille (Parametres → Dossiers supprimes).
   *
   * Avant le 05/10/2026, la ligne etait effacee. Une fausse manoeuvre etait
   * donc sans retour, et il n'existait aucun moyen de recuperer un dossier
   * supprime depuis un compte vendeur.
   */
  async remove(workspaceId: string, id: string, actorSub?: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findFirst({
        where: { id, workspaceId, deletedAt: null },
      });
      if (!existing) return null;
      return tx.project.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: actorSub ?? null },
      });
    });
  }

  /** Contenu de la corbeille, du plus recemment supprime au plus ancien. */
  async listDeleted(workspaceId: string) {
    const rows = await this.prisma.project.findMany({
      where: { workspaceId, deletedAt: { not: null } },
      select: {
        id: true,
        name: true,
        reference: true,
        tradeType: true,
        lifecycleStatus: true,
        saleAmount: true,
        vendeurName: true,
        createdAt: true,
        deletedAt: true,
        deletedById: true,
        client: { select: { companyName: true, firstName: true, lastName: true } },
      },
      orderBy: { deletedAt: 'desc' },
      take: 200,
    });

    // Qui a supprime : on resout les noms en une requete plutot qu'une par ligne.
    const ids = [...new Set(rows.map((r) => r.deletedById).filter(Boolean) as string[])];
    type Auteur = { id: string; firstName: string | null; lastName: string | null; email: string };
    const users: Auteur[] = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const parId = new Map(users.map((u) => [u.id, u] as const));

    return rows.map((r) => {
      const u = r.deletedById ? parId.get(r.deletedById) : undefined;
      const nom = u
        ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
        : null;
      return { ...r, deletedByName: nom };
    });
  }

  /** Remet un dossier de la corbeille dans les listes. */
  async restore(workspaceId: string, id: string) {
    const existing = await this.prisma.project.findFirst({
      where: { id, workspaceId, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!existing) return null;
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: null, deletedById: null },
    });
  }
}
