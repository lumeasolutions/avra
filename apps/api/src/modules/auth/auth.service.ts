import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenRotationService } from './services/token-rotation.service';
import type { JwtPayload } from '@avra/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokenRotation: TokenRotationService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase(), isActive: true },
    });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const uw = await this.prisma.userWorkspace.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });
    if (!uw) throw new UnauthorizedException('Aucun espace de travail associé');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      workspaceId: uw.workspaceId,
      role: uw.role,
    };

    // Generate access and refresh tokens with rotation
    const tokenPair = this.tokenRotation.generateTokenPair(payload);
    const hashedRefreshToken = await this.tokenRotation.hashRefreshToken(tokenPair.refreshToken);

    // Store hashed refresh token and expiration
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
      },
    });

    return {
      accessToken: tokenPair.accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: uw.role,
        workspaceId: uw.workspaceId,
        workspaceName: uw.workspace.name,
      },
    };
  }

  async validateUser(payload: JwtPayload) {
    const uw = await this.prisma.userWorkspace.findFirst({
      where: { userId: payload.sub, workspaceId: payload.workspaceId },
      include: { user: true, workspace: true },
    });
    if (!uw?.user?.isActive) return null;
    return { ...uw.user, role: uw.role, workspaceId: uw.workspaceId, workspace: uw.workspace };
  }

  // ✅ TÂCHE 8 — Refresh Token with Rotation
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });
    if (!user || !user.refreshToken) throw new UnauthorizedException('Invalid refresh token');

    // Verify refresh token against hash
    const isValid = await this.tokenRotation.verifyRefreshToken(refreshToken, user.refreshToken);
    if (!isValid || !user.refreshTokenExpiresAt || new Date() > user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    // Get workspace info
    const uw = await this.prisma.userWorkspace.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });
    if (!uw) throw new UnauthorizedException('No workspace');

    // Create new JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      workspaceId: uw.workspaceId,
      role: uw.role,
    };

    // Generate new token pair
    const tokenPair = this.tokenRotation.generateTokenPair(payload);

    // Revoke old refresh token and store new one
    this.tokenRotation.revokeToken(refreshToken, user.refreshTokenExpiresAt);
    const hashedNewRefreshToken = await this.tokenRotation.hashRefreshToken(tokenPair.refreshToken);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashedNewRefreshToken,
        refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
      },
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    };
  }

  async logout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Invalider le refresh token en base (protection principale contre la réutilisation)
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null, refreshTokenExpiresAt: null },
    });
  }

  // ── Mot de passe oublié (envoi de lien de réinitialisation) ──────────────
  async forgotPassword(email: string): Promise<void> {
    // Par sécurité, on ne révèle jamais si l'email existe ou non
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase(), isActive: true },
    });
    if (!user) return; // Silently ignore — don't reveal account existence

    // Génère un token de réinitialisation à usage unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Stocke le hash du token (sécurité)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedToken,           // Réutilise le champ refreshToken temporairement
        refreshTokenExpiresAt: resetTokenExpiry,
      },
    });

    // TODO: envoyer l'email avec le lien /reset-password?token=<resetToken>&id=<user.id>
    // Pour l'instant on logue le lien (dev uniquement)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Reset link: /reset-password?token=${resetToken}&id=${user.id}`);
    }
  }

  // ✅ TÂCHE 9 — Registration
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    return this.prisma.$transaction(async (tx) => {
      // Create workspace — slug unique, on ajoute un suffixe aléatoire si besoin
      const baseSlug = dto.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';
      const suffix = crypto.randomBytes(3).toString('hex'); // ex: "a3f9c1"
      const slug = `${baseSlug}-${suffix}`;
      const workspace = await tx.workspace.create({
        data: { name: dto.workspaceName, slug, plan: 'STARTER' },
      });

      // Create user
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
      const hashedRefresh = await this.tokenRotation.hashRefreshToken(refreshTokenPlain);

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          refreshToken: hashedRefresh,
          refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      // Link user to workspace
      await tx.userWorkspace.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
        },
      });

      return { userId: user.id, workspaceId: workspace.id };
    });
  }
}
