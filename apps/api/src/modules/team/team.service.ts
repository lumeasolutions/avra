import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamEmailService } from './team-email.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import type { JwtPayload } from '@avra/types';

/** Durée de validité d'une invitation (jours). */
const INVITATION_TTL_DAYS = 14;

/**
 * Gestion de l'équipe (membres / vendeurs) d'un workspace + logique de sièges.
 *
 * Sièges : chaque membre ACTIF (OWNER inclus) consomme 1 siège. `includedSeats`
 * sont compris dans l'abonnement (défaut 3) ; au-delà, chaque siège coûte
 * `extraSeatPriceEUR` (défaut 40 €/mois). En Phase 1 on NE facture pas (pas de
 * Stripe) : on calcule et on affiche le dépassement, c'est tout.
 */
@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: TeamEmailService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────
  // Lecture : vue d'ensemble (membres + invitations + sièges)
  // ──────────────────────────────────────────────────────────────────────

  async getOverview(workspaceId: string, currentUserId: string) {
    const [workspace, memberships, invitations] = await Promise.all([
      this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, includedSeats: true, extraSeatPriceEUR: true },
      }),
      this.prisma.userWorkspace.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              lastLoginAt: true,
              isActive: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      (this.prisma as any).workspaceInvitation.findMany({
        where: { workspaceId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          message: true,
          expiresAt: true,
          createdAt: true,
          // Le token remonte volontairement : la route est reservee OWNER/ADMIN
          // (RolesGuard), et il permet a l'UI d'afficher « Copier le lien
          // d'invitation » pour le transmettre a la main quand l'e-mail ne part pas.
          token: true,
        },
      }),
    ]);

    const activeMembers = memberships.filter((m) => m.status === 'ACTIVE').length;
    const seats = this.buildSeatSummary(
      workspace?.includedSeats ?? 3,
      workspace?.extraSeatPriceEUR ?? 40,
      activeMembers,
      invitations.length,
    );

    const members = memberships
      .map((m) => this.toMemberDto(m, currentUserId))
      .sort((a, b) => (a.isOwner === b.isOwner ? 0 : a.isOwner ? -1 : 1));

    return {
      workspaceName: workspace?.name ?? '',
      seats,
      members,
      invitations,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Invitation
  // ──────────────────────────────────────────────────────────────────────

  async invite(workspaceId: string, createdById: string, dto: InviteMemberDto) {
    const email = dto.email.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email requis');
    const role: 'MEMBER' | 'ADMIN' = dto.role ?? 'MEMBER';

    // Déjà membre de cette équipe ?
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      const already = await this.prisma.userWorkspace.findFirst({
        where: { userId: existingUser.id, workspaceId },
        select: { id: true },
      });
      if (already) {
        throw new ConflictException('Cette personne fait deja partie de votre equipe.');
      }
    }

    // Révoque les éventuelles invitations PENDING précédentes pour cet email
    await (this.prisma as any).workspaceInvitation.updateMany({
      where: { workspaceId, email, status: 'PENDING' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await (this.prisma as any).workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        message: dto.message?.trim() || null,
        expiresAt,
        createdById,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        message: true,
        expiresAt: true,
        createdAt: true,
        token: true,
      },
    });

    // Email (fire-and-forget — n'échoue jamais l'invitation)
    const [workspace, inviter] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      this.prisma.user.findUnique({
        where: { id: createdById },
        select: { firstName: true, lastName: true, email: true },
      }),
    ]);
    // On ATTEND le resultat (avant : `.catch(() => {})`, l'echec etait avale et
    // l'UI affichait « invitation envoyee » alors que rien n'etait parti).
    const emailResult = await this.email
      .notifyMemberInvitation({
        to: email,
        inviteeName:
          [invitation.firstName, invitation.lastName].filter(Boolean).join(' ').trim() || email,
        inviterName: this.formatPersonName(inviter) ?? 'Votre administrateur',
        workspaceName: workspace?.name ?? 'votre equipe',
        role,
        token,
        message: invitation.message,
        expiresAt,
      })
      .catch((err) => ({
        ok: false as const,
        reason: `L'envoi de l'e-mail a echoue : ${err?.message ?? 'erreur inconnue'}`,
      }));

    const seats = await this.recountSeats(workspaceId);
    return {
      invitation,
      seats,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? null : (emailResult.reason ?? null),
    };
  }

  async revokeInvitation(workspaceId: string, invitationId: string) {
    const inv = await (this.prisma as any).workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
      select: { id: true, status: true },
    });
    if (!inv) throw new NotFoundException('Invitation introuvable');
    if (inv.status !== 'PENDING') {
      throw new BadRequestException('Seule une invitation en attente peut etre annulee');
    }
    await (this.prisma as any).workspaceInvitation.update({
      where: { id: inv.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    const seats = await this.recountSeats(workspaceId);
    return { revoked: true, id: invitationId, seats };
  }

  async resendInvitation(workspaceId: string, invitationId: string) {
    const inv = await (this.prisma as any).workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });
    if (!inv) throw new NotFoundException('Invitation introuvable');
    if (inv.status !== 'PENDING') {
      throw new BadRequestException('Seule une invitation en attente peut etre renvoyee');
    }

    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await (this.prisma as any).workspaceInvitation.update({
      where: { id: inv.id },
      data: { expiresAt },
    });

    const [workspace, inviter] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      this.prisma.user.findUnique({
        where: { id: inv.createdById },
        select: { firstName: true, lastName: true, email: true },
      }),
    ]);
    const emailResult = await this.email
      .notifyMemberInvitation({
        to: inv.email,
        inviteeName: [inv.firstName, inv.lastName].filter(Boolean).join(' ').trim() || inv.email,
        inviterName: this.formatPersonName(inviter) ?? 'Votre administrateur',
        workspaceName: workspace?.name ?? 'votre equipe',
        role: inv.role,
        token: inv.token,
        message: inv.message,
        expiresAt,
      })
      .catch((err) => ({
        ok: false as const,
        reason: `L’envoi de l’e-mail a echoue : ${err?.message ?? 'erreur inconnue'}`,
      }));

    return {
      resent: true,
      id: invitationId,
      expiresAt,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? null : (emailResult.reason ?? null),
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Membres : rôle / statut / retrait
  // ──────────────────────────────────────────────────────────────────────

  async updateMember(
    workspaceId: string,
    actingUser: JwtPayload,
    targetUserId: string,
    dto: UpdateMemberDto,
  ) {
    if (!dto.role && !dto.status) {
      throw new BadRequestException('Aucune modification fournie');
    }
    const membership = await this.prisma.userWorkspace.findFirst({
      where: { workspaceId, userId: targetUserId },
      select: { id: true, role: true },
    });
    if (!membership) throw new NotFoundException('Membre introuvable dans cette equipe');

    this.assertCanManage(actingUser, targetUserId, membership.role, dto.role);

    const updated = await this.prisma.userWorkspace.update({
      where: { id: membership.id },
      data: {
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, lastLoginAt: true, isActive: true } },
      },
    });

    const seats = await this.recountSeats(workspaceId);
    return { member: this.toMemberDto(updated, actingUser.sub), seats };
  }

  async removeMember(workspaceId: string, actingUser: JwtPayload, targetUserId: string) {
    const membership = await this.prisma.userWorkspace.findFirst({
      where: { workspaceId, userId: targetUserId },
      select: { id: true, role: true },
    });
    if (!membership) throw new NotFoundException('Membre introuvable dans cette equipe');

    this.assertCanManage(actingUser, targetUserId, membership.role);

    await this.prisma.userWorkspace.delete({ where: { id: membership.id } });

    const seats = await this.recountSeats(workspaceId);
    return { removed: true, userId: targetUserId, seats };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Invitation publique (aperçu avant acceptation — pas d'auth)
  // ──────────────────────────────────────────────────────────────────────

  async getPublicInvitation(token: string) {
    if (!token) throw new NotFoundException('Invitation introuvable');
    const inv = await (this.prisma as any).workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!inv) throw new NotFoundException('Invitation introuvable');

    let status: string = inv.status;
    if (status === 'PENDING' && inv.expiresAt < new Date()) {
      await (this.prisma as any).workspaceInvitation.update({
        where: { id: inv.id },
        data: { status: 'EXPIRED' },
      });
      status = 'EXPIRED';
    }

    const account = await this.prisma.user.findUnique({
      where: { email: inv.email.toLowerCase() },
      select: { id: true },
    });

    return {
      email: inv.email,
      role: inv.role,
      firstName: inv.firstName,
      lastName: inv.lastName,
      message: inv.message,
      workspaceName: inv.workspace?.name ?? '',
      inviterName: this.formatPersonName(inv.createdBy),
      expiresAt: inv.expiresAt,
      status,
      accountExists: !!account,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Helpers privés
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Règles de gouvernance pour modifier/retirer un membre :
   *  - le OWNER n'est jamais modifiable/retirable
   *  - on ne peut pas agir sur soi-même (évite de se verrouiller dehors)
   *  - seul un OWNER peut toucher un ADMIN ou promouvoir quelqu'un ADMIN
   */
  private assertCanManage(
    actingUser: JwtPayload,
    targetUserId: string,
    targetRole: string,
    nextRole?: string,
  ) {
    if (targetRole === 'OWNER') {
      throw new ForbiddenException('Le proprietaire ne peut pas etre modifie');
    }
    if (targetUserId === actingUser.sub) {
      throw new ForbiddenException('Vous ne pouvez pas modifier votre propre acces');
    }
    const touchesAdmin = targetRole === 'ADMIN' || nextRole === 'ADMIN';
    if (touchesAdmin && actingUser.role !== 'OWNER') {
      throw new ForbiddenException('Seul le proprietaire peut gerer les administrateurs');
    }
  }

  private toMemberDto(
    uw: {
      id: string;
      userId: string;
      role: string;
      status: string;
      joinedAt: Date;
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        lastLoginAt: Date | null;
        isActive: boolean;
      };
    },
    currentUserId: string,
  ) {
    return {
      userWorkspaceId: uw.id,
      userId: uw.userId,
      email: uw.user.email,
      firstName: uw.user.firstName,
      lastName: uw.user.lastName,
      role: uw.role,
      status: uw.status,
      joinedAt: uw.joinedAt,
      lastLoginAt: uw.user.lastLoginAt,
      isOwner: uw.role === 'OWNER',
      isYou: uw.userId === currentUserId,
    };
  }

  private formatPersonName(
    p: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
  ): string | null {
    if (!p) return null;
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
    return name || p.email || null;
  }

  private async recountSeats(workspaceId: string) {
    const [workspace, activeMembers, pendingCount] = await Promise.all([
      this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { includedSeats: true, extraSeatPriceEUR: true },
      }),
      this.prisma.userWorkspace.count({ where: { workspaceId, status: 'ACTIVE' } }),
      (this.prisma as any).workspaceInvitation.count({ where: { workspaceId, status: 'PENDING' } }),
    ]);
    return this.buildSeatSummary(
      workspace?.includedSeats ?? 3,
      workspace?.extraSeatPriceEUR ?? 40,
      activeMembers,
      pendingCount,
    );
  }

  /**
   * Construit le récapitulatif des sièges (fonction pure, sans requête).
   *  - usedSeats        : membres actifs aujourd'hui
   *  - projectedSeats   : actifs + invitations en attente (si toutes acceptées)
   *  - extraSeats       : sièges au-delà de l'inclus → facturables (Phase 2)
   *  - overageMonthlyEUR: coût mensuel estimé du dépassement actuel
   */
  private buildSeatSummary(
    includedSeats: number,
    extraSeatPriceEUR: number,
    activeMembers: number,
    pendingInvitations: number,
  ) {
    const usedSeats = activeMembers;
    const projectedSeats = activeMembers + pendingInvitations;
    const extraSeats = Math.max(0, usedSeats - includedSeats);
    const projectedExtraSeats = Math.max(0, projectedSeats - includedSeats);
    return {
      includedSeats,
      extraSeatPriceEUR,
      activeMembers,
      pendingInvitations,
      usedSeats,
      projectedSeats,
      extraSeats,
      projectedExtraSeats,
      overageMonthlyEUR: extraSeats * extraSeatPriceEUR,
      projectedOverageMonthlyEUR: projectedExtraSeats * extraSeatPriceEUR,
      remainingIncludedSeats: Math.max(0, includedSeats - usedSeats),
    };
  }
}
