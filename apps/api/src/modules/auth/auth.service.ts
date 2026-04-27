import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenRotationService } from './services/token-rotation.service';
import { isEmailAllowed, isBetaGateEnabled } from '../../common/security/beta-gate';
import type { JwtPayload } from '@avra/types';

// Message renvoyé quand le bêta gate bloque un utilisateur.
const BETA_GATE_MESSAGE =
  "AVRA est en bêta privée. L'accès n'est pas encore ouvert publiquement. Inscrivez-vous sur la liste d'attente pour être notifié au lancement.";

// Coût bcrypt élevé en 2026 (OWASP recommande ≥12 ; 10 = minimum historique).
// Chaque +1 double le coût CPU côté serveur pour l'attaquant en cas de fuite DB.
const BCRYPT_COST = 12;
// Hash "trappe" utilisé contre un user inexistant pour égaliser le temps
// de réponse login → anti-énumération (SEC-M4).
const DUMMY_BCRYPT_HASH = '$2b$12$abcdefghijklmnopqrstuu0K1234567890abcdefghijklmnopqrstuv';

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
    // Anti-énumération (SEC-M4) : on appelle bcrypt.compare même si l'user
    // n'existe pas, pour égaliser le temps de réponse entre "inconnu" et
    // "mot de passe faux". Sans ça, un attaquant peut distinguer les deux cas
    // par timing (~0 ms vs ~100 ms).
    const hashToCompare = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const ok = await bcrypt.compare(dto.password, hashToCompare);
    if (!user || !ok) throw new UnauthorizedException('Identifiants invalides');

    // 🌱 Bêta gate — bloque les connexions non whitelistées pendant la bêta privée.
    // On vérifie APRÈS le check du mot de passe pour ne pas fuiter l'info
    // "cet email existe mais n'est pas whitelisté" à un attaquant.
    if (isBetaGateEnabled() && !isEmailAllowed(user.email)) {
      throw new ForbiddenException(BETA_GATE_MESSAGE);
    }

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
      // 🔒 Le refreshToken est exposé au controller pour qu'il le pose en
      // cookie HttpOnly. Il NE DOIT PAS être renvoyé dans le body au client
      // (le controller le retire avant `res.json`).
      refreshToken: tokenPair.refreshToken,
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
    // NOTE: on expose `sub` en plus de `id` pour rester compatible avec le
    // JwtPayload attendu par les controllers (ex: user.sub dans /projects,
    // /events, /ia, /dossier-documents, etc.). Sans cet alias, Prisma reçoit
    // `ownerId: undefined` / `createdById: undefined` et lève une validation
    // error sur les champs FK non-nullables.
    return {
      ...uw.user,
      sub: uw.user.id,
      role: uw.role,
      workspaceId: uw.workspaceId,
      workspace: uw.workspace,
    };
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

  // ── Réinitialisation du mot de passe (depuis le lien email) ─────────────
  async resetPassword(userId: string, token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });
    if (!user || !user.refreshToken || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Lien invalide ou expiré');
    }

    // Vérifier que le token n'a pas expiré
    if (new Date() > user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Lien de réinitialisation expiré. Demandez un nouveau lien.');
    }

    // Vérifier le hash du token (constant-time)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hashedToken), Buffer.from(user.refreshToken))) {
      throw new UnauthorizedException('Lien invalide ou déjà utilisé');
    }

    // Mettre à jour le mot de passe et invalider le token
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
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

  /**
   * Register specifique pour les intervenants invites.
   *
   * Contourne le beta gate via un token d'invitation valide. L'intervenant
   * recoit un compte User SANS workspace propre (il sera attache au workspace
   * du pro qui l'a invite via Intervenant.userId).
   *
   * Flow :
   *  1. Verifie l'invitation : token PENDING, non-expire, email match
   *  2. Cree le User (sans workspace OWNER)
   *  3. Lie l'Intervenant.userId
   *  4. Marque l'invitation ACCEPTED
   *  5. Retourne JWT pour login automatique
   */
  async registerIntervenant(dto: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (!dto.token) throw new ForbiddenException('Token requis');

    const inv = await (this.prisma as any).intervenantInvitation.findUnique({
      where: { token: dto.token },
      include: {
        intervenant: { select: { id: true, userId: true } },
      },
    });
    if (!inv) throw new ForbiddenException('Invitation invalide');
    if (inv.status !== 'PENDING') throw new ForbiddenException(`Invitation deja ${inv.status.toLowerCase()}`);
    if (inv.expiresAt < new Date()) {
      await (this.prisma as any).intervenantInvitation.update({
        where: { id: inv.id }, data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException('Invitation expiree');
    }
    if (inv.intervenant?.userId) {
      throw new ConflictException('Cet intervenant est deja lie a un compte');
    }

    const email = inv.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // L'utilisateur existe deja avec un compte AVRA — on doit lui demander
      // de se connecter normalement pour accepter l'invitation, pas de creer
      // un nouveau compte. C'est gere par /invitation/[token]/accept apres login.
      throw new ConflictException('Un compte existe deja avec cet email. Connectez-vous pour accepter l\'invitation.');
    }

    return this.prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_COST);
      const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
      const hashedRefresh = await this.tokenRotation.hashRefreshToken(refreshTokenPlain);

      // 1. Cree le User (pas de workspace propre)
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName: dto.firstName ?? null,
          lastName: dto.lastName ?? null,
          refreshToken: hashedRefresh,
          refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      // 2. Lie l'Intervenant
      await tx.intervenant.update({
        where: { id: inv.intervenantId },
        data: { userId: user.id, portalEnabled: true },
      });

      // 3. Marque l'invitation acceptee
      await (tx as any).intervenantInvitation.update({
        where: { id: inv.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      // 4. JWT — pas de workspaceId puisque l'intervenant n'a pas son propre workspace
      const accessToken = await this.jwt.signAsync(
        { sub: user.id, email: user.email, workspaceId: '', role: 'INTERVENANT' } as any,
        { expiresIn: '1h' },
      );

      return {
        userId: user.id,
        accessToken,
        refreshToken: refreshTokenPlain,
        intervenantId: inv.intervenantId,
      };
    });
  }

  // ✅ TÂCHE 9 — Registration
  async register(dto: RegisterDto) {
    // 🌱 Bêta gate — bloque toute création de compte publique pendant la bêta privée.
    if (isBetaGateEnabled() && !isEmailAllowed(dto.email)) {
      throw new ForbiddenException(BETA_GATE_MESSAGE);
    }

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
      const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_COST);
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
