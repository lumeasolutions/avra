import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenRotationService } from './services/token-rotation.service';
import { AuthEmailService } from './services/auth-email.service';
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
    private readonly authEmail: AuthEmailService,
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

    // Recherche du workspace (compte pro). Les intervenants externes n'en ont
    // pas : ils sont rattachés via Intervenant.userId → branche dédiée.
    const uw = await this.prisma.userWorkspace.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });
    if (!uw) {
      // SEC/FONC 13/07/2026 — Auth intervenant externe réparée. Avant, un
      // intervenant (User sans UserWorkspace) était bloqué ici à chaque
      // connexion après sa 1ère inscription. On détecte le compte intervenant
      // et on ouvre une session dédiée (workspaceId null, rôle INTERVENANT).
      const intervenant = await this.prisma.intervenant.findFirst({
        where: { userId: user.id, portalEnabled: true },
        select: { id: true },
      });
      if (intervenant) {
        return this.loginIntervenant(user, intervenant.id);
      }
      throw new UnauthorizedException('Aucun espace de travail associé');
    }

    // 🌱 Bêta gate — s'applique aux comptes pro (workspace). Vérifié APRÈS le
    // mot de passe pour ne pas fuiter l'existence d'un email non whitelisté.
    // Les intervenants (branche ci-dessus) en sont exemptés : ils sont
    // parrainés par le pro qui les a invités.
    if (isBetaGateEnabled() && !isEmailAllowed(user.email)) {
      throw new ForbiddenException(BETA_GATE_MESSAGE);
    }

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

    // HIGH-4: refresh token is preferentially a signed JWT { sub, jti }.
    // Persist bcrypt(jti) dans `refreshTokenJtiHash` (nouveau scheme) et
    // garder `refreshToken` legacy en miroir tant que la migration n'est
    // pas appliquée partout (fallback robuste).
    const tokenPair = this.tokenRotation.generateTokenPair(payload);
    const hashedJti = await this.tokenRotation.hashRefreshToken(tokenPair.refreshTokenJti);

    // HOTFIX 29/04/2026 : si la colonne `refreshTokenJtiHash` n'existe pas
    // encore en DB (migration non appliquée), on retombe sur l'ancien
    // schéma `refreshToken` uniquement, pour ne pas crasher le login.
    // Une session par appareil. Tant qu'elle s'ouvre, on ne touche plus a la
    // colonne unique de User : c'est elle qui, en s'ecrasant a chaque connexion,
    // faisait sauter la session des autres appareils.
    const sessionOuverte = await this.openRefreshSession(user.id, tokenPair, hashedJti);

    try {
      // Session ouverte : rien a ecrire sur User, on evite un aller-retour DB.
      if (!sessionOuverte) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            refreshTokenJtiHash: hashedJti,
            refreshToken: hashedJti, // miroir legacy — sert au fallback /refresh
            refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
          },
        });
      }
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      // Prisma P2022 = colonne inexistante (migration manquante).
      if (msg.includes('refreshTokenJtiHash') || msg.includes('P2022')) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            refreshToken: hashedJti,
            refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
          },
        });
      } else {
        throw err;
      }
    }

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

  /**
   * Session de connexion pour un intervenant externe (pas de workspace propre).
   * Émet un token pair avec rôle INTERVENANT + workspaceId null. Le refresh
   * token est persisté comme pour un compte normal (même schéma / fallback).
   */
  private async loginIntervenant(
    user: { id: string; email: string; firstName: string | null; lastName: string | null },
    intervenantId: string,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      workspaceId: null,
      role: 'INTERVENANT',
    } as unknown as JwtPayload;

    const tokenPair = this.tokenRotation.generateTokenPair(payload);
    const hashedJti = await this.tokenRotation.hashRefreshToken(tokenPair.refreshTokenJti);

    // Idem cote intervenant : une session par appareil (cf. openRefreshSession).
    const sessionOuverte = await this.openRefreshSession(user.id, tokenPair, hashedJti);
    const data = sessionOuverte
      ? { lastLoginAt: new Date() }
      : {
          refreshTokenJtiHash: hashedJti,
          refreshToken: hashedJti,
          refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
          lastLoginAt: new Date(),
        };
    try {
      await this.prisma.user.update({ where: { id: user.id }, data });
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes('refreshTokenJtiHash') || msg.includes('P2022')) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            refreshToken: hashedJti,
            refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
            lastLoginAt: new Date(),
          },
        });
      } else {
        throw err;
      }
    }

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'INTERVENANT',
        workspaceId: null,
        intervenantId,
      },
    };
  }

  /**
   * Vérifie le mot de passe d'un utilisateur (par id) sans aucun effet de bord.
   * Retourne simplement true/false. Sert à ré-authentifier une action sensible
   * (ex. réinitialiser le code PIN du Dossier administratif).
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    if (!userId || !password) return false;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  async validateUser(payload: JwtPayload) {
    // FONC 13/07/2026 — Les intervenants externes ont un token sans workspace
    // (workspaceId null, rôle INTERVENANT). On les valide via Intervenant.userId
    // plutôt que via UserWorkspace, sinon JwtAuthGuard rejette chaque requête.
    if ((payload as any).role === 'INTERVENANT' || !payload.workspaceId) {
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, isActive: true },
      });
      if (!user) return null;
      const intervenant = await this.prisma.intervenant.findFirst({
        where: { userId: user.id },
        select: { id: true, workspaceId: true },
      });
      if (!intervenant) return null;
      return {
        ...user,
        sub: user.id,
        role: 'INTERVENANT',
        workspaceId: null,
        intervenantId: intervenant.id,
      };
    }
    return this.validateWorkspaceUser(payload);
  }

  private async validateWorkspaceUser(payload: JwtPayload) {
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

  // ✅ TÂCHE 8 / HIGH-4 — Refresh Token with Rotation
  //
  // The refresh token is a signed JWT { sub, jti, exp } — `sub` carries the
  // userId so we no longer need a separate `user_id` cookie. We always look
  // it up from the JWT itself (after signature verification), never from a
  // client-controlled cookie.
  //
  // `legacyUserId` is the value of the deprecated `user_id` cookie. It is
  // ONLY consulted when the refresh token is NOT a valid JWT — i.e. when the
  // user is still on a pre-HIGH-4 opaque token. Once that user refreshes
  // once they're migrated and `legacyUserId` stops mattering for them.
  /**
   * Ouvre une session de connexion pour le couple de jetons qu'on vient d'emettre.
   *
   * Une ligne RefreshSession = un appareil. Avant septembre 2026, l'empreinte du
   * jeton vivait dans une colonne unique sur User : chaque connexion ou
   * rafraichissement l'ecrasait, donc un compte ne pouvait avoir qu'une session
   * vivante. Ouvrir l'application sur le telephone ejectait l'ordinateur au
   * rafraichissement suivant (401, puis deconnexion au premier appel API).
   *
   * Renvoie false si la table n'est pas disponible : l'appelant retombe alors
   * sur l'ancienne colonne plutot que de faire echouer la connexion.
   */
  private async openRefreshSession(
    userId: string,
    tokenPair: { refreshTokenJti: string; refreshTokenExpiresAt: Date },
    // bcrypt coute ~250 ms : les appelants l'ont deja calcule, on evite de le
    // refaire une seconde fois a chaque connexion.
    hashedJti?: string,
  ): Promise<boolean> {
    try {
      const jti = tokenPair.refreshTokenJti;
      await (this.prisma as any).refreshSession.create({
        data: {
          userId,
          jtiLookup: this.tokenRotation.jtiLookup(jti),
          jtiHash: hashedJti ?? (await this.tokenRotation.hashRefreshToken(jti)),
          expiresAt: tokenPair.refreshTokenExpiresAt,
        },
      });
      await this.pruneRefreshSessions(userId);
      return true;
    } catch (err: any) {
      console.warn('[auth] RefreshSession indisponible, repli sur la colonne User :', String(err?.message ?? err));
      return false;
    }
  }

  /** Menage : sessions expirees, et plafond d'appareils par compte. */
  private async pruneRefreshSessions(userId: string): Promise<void> {
    const MAX_SESSIONS = 20;
    try {
      const p = this.prisma as any;
      await p.refreshSession.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
      const surplus = await p.refreshSession.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
        skip: MAX_SESSIONS,
        select: { id: true },
      });
      if (surplus.length) {
        await p.refreshSession.deleteMany({
          where: { id: { in: surplus.map((r: { id: string }) => r.id) } },
        });
      }
    } catch {
      // Menage best-effort : jamais bloquant pour une connexion.
    }
  }

  async refreshToken(refreshToken: string, legacyUserId?: string) {
    const decoded = this.tokenRotation.verifyRefreshJwt(refreshToken);

    let user;
    let isLegacy = false;
    /** Session a faire tourner. Null = jeton issu de l'ancienne colonne. */
    let sessionId: string | null = null;

    if (decoded) {
      // ─── New JWT scheme ────────────────────────────────────────────────
      user = await this.prisma.user.findUnique({
        where: { id: decoded.sub, isActive: true },
      });
      if (!user) throw new UnauthorizedException('Invalid refresh token');


      // 1) Session dediee a cet appareil (schema courant). On la retrouve par
      //    l'index SHA-256 du jti, puis on confirme au bcrypt.
      try {
        const session = await (this.prisma as any).refreshSession.findUnique({
          where: { jtiLookup: this.tokenRotation.jtiLookup(decoded.jti) },
        });
        if (
          session
          && session.userId === user.id
          && session.expiresAt > new Date()
          && (await this.tokenRotation.verifyRefreshToken(decoded.jti, session.jtiHash))
        ) {
          sessionId = session.id as string;
        }
      } catch (err: any) {
        // Table absente (migration pas encore passee) : on laisse le repli
        // ci-dessous decider, plutot que de deconnecter tout le monde.
        console.warn('[auth] lecture RefreshSession impossible :', String(err?.message ?? err));
      }

      const userAny = user as typeof user & { refreshTokenJtiHash: string | null };

      if (sessionId) {
        // Session valide : il n'y a rien d'autre a verifier.
      } else if (userAny.refreshTokenJtiHash) {
        const ok = await this.tokenRotation.verifyRefreshToken(
          decoded.jti,
          userAny.refreshTokenJtiHash,
        );
        if (!ok) throw new UnauthorizedException('Refresh token expired or invalid');
      } else if (user.refreshToken) {
        // Edge case: JWT-signed token but DB still on legacy column.
        // Could only happen if a refresh raced with a legacy login. Treat
        // as invalid — force re-login rather than make assumptions.
        throw new UnauthorizedException('Refresh token expired or invalid');
      } else {
        throw new UnauthorizedException('Refresh token expired or invalid');
      }
    } else {
      // ─── Legacy fallback (opaque token + user_id cookie) ───────────────
      // Will be removed ~30d after deploy when all legacy refresh tokens
      // have either rotated through here or expired naturally.
      if (!legacyUserId) throw new UnauthorizedException('Invalid refresh token');

      user = await this.prisma.user.findUnique({
        where: { id: legacyUserId, isActive: true },
      });
      if (!user || !user.refreshToken) throw new UnauthorizedException('Invalid refresh token');

      const ok = await this.tokenRotation.verifyRefreshToken(refreshToken, user.refreshToken);
      if (!ok || !user.refreshTokenExpiresAt || new Date() > user.refreshTokenExpiresAt) {
        throw new UnauthorizedException('Refresh token expired or invalid');
      }
      isLegacy = true;
    }

    // Get workspace info — intervenants may not have one (workspaceId null).
    const uw = await this.prisma.userWorkspace.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      workspaceId: uw?.workspaceId ?? '',
      role: uw?.role ?? 'INTERVENANT',
    } as JwtPayload;

    const tokenPair = this.tokenRotation.generateTokenPair(payload);
    const hashedJti = await this.tokenRotation.hashRefreshToken(tokenPair.refreshTokenJti);

    if (sessionId) {
      // On fait tourner CETTE session, et elle seule : les autres appareils du
      // compte gardent la leur. C'est tout l'objet du changement.
      await (this.prisma as any).refreshSession.update({
        where: { id: sessionId },
        data: {
          jtiLookup: this.tokenRotation.jtiLookup(tokenPair.refreshTokenJti),
          jtiHash: hashedJti,
          expiresAt: tokenPair.refreshTokenExpiresAt,
          lastUsedAt: new Date(),
        },
      });
    } else {
      // Le jeton presente venait de l'ancienne colonne (session ouverte avant
      // la bascule, ou repli legacy). On lui ouvre sa propre session, puis on
      // vide la colonne : elle cesse ainsi d'evincer les autres appareils.
      const migree = await this.openRefreshSession(user.id, tokenPair, hashedJti);
      await this.prisma.user.update({
        where: { id: user.id },
        data: migree
          ? { refreshTokenJtiHash: null, refreshToken: null, refreshTokenExpiresAt: null }
          : {
              refreshTokenJtiHash: hashedJti,
              refreshToken: null,
              refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
            },
      });
    }

    if (!isLegacy && refreshToken) {
      // Best-effort blacklist of the just-used JWT (defense-in-depth against
      // network-level replay before the DB jti hash flip lands).
      this.tokenRotation.revokeToken(refreshToken, tokenPair.refreshTokenExpiresAt);
    }

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      userId: user.id,
    };
  }

  /**
   * Deconnecte UN appareil, pas le compte.
   *
   * On supprime la session correspondant au jeton presente. Les autres
   * appareils gardent la leur : se deconnecter du telephone ne doit pas
   * fermer la session de l'ordinateur.
   */
  async logout(userId: string, refreshToken?: string) {
    let sessionSupprimee = false;

    if (refreshToken) {
      const decoded = this.tokenRotation.verifyRefreshJwt(refreshToken);
      if (decoded?.jti) {
        try {
          const res = await (this.prisma as any).refreshSession.deleteMany({
            where: { userId, jtiLookup: this.tokenRotation.jtiLookup(decoded.jti) },
          });
          sessionSupprimee = res.count > 0;
        } catch (err: any) {
          console.warn('[auth] suppression RefreshSession impossible :', String(err?.message ?? err));
        }
      }
    }

    if (sessionSupprimee) return { success: true };

    // Aucune session trouvee : l'appareil s'appuyait encore sur l'ancienne
    // colonne unique. On la vide, comme avant.
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenJtiHash: null, refreshToken: null, refreshTokenExpiresAt: null },
    });
  }

  // ── HIGH-005: Password reset uses DEDICATED columns (no longer overrides
  //    the refresh token). passwordResetTokenHash + passwordResetExpiresAt.
  async resetPassword(userId: string, token: string, newPassword: string): Promise<void> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId, isActive: true },
    });
    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      throw new UnauthorizedException('Lien invalide ou expiré');
    }
    if (new Date() > user.passwordResetExpiresAt) {
      throw new UnauthorizedException('Lien de réinitialisation expiré. Demandez un nouveau lien.');
    }

    // Constant-time compare against the stored sha256 hash.
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const stored = Buffer.from(user.passwordResetTokenHash);
    const incoming = Buffer.from(hashedToken);
    if (stored.length !== incoming.length || !crypto.timingSafeEqual(incoming, stored)) {
      throw new UnauthorizedException('Lien invalide ou déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    await (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        // Invalidate any active session — force re-login.
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    // MED-010: equalize timing whether the email exists or not.
    const startedAt = Date.now();
    const TARGET_MS = 250;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase(), isActive: true },
      });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
        const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');

        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: {
            passwordResetTokenHash: hashed,
            passwordResetExpiresAt: expiry,
          },
        });

        // MED-003: dev-only logging gated by an explicit env flag.
        if (process.env.DEBUG_PASSWORD_RESET === '1') {
          // Use console.log here intentionally — gated, dev-only.
          // eslint-disable-next-line no-console
          console.log(`[DEBUG_PASSWORD_RESET] /reset-password?token=${resetToken}&id=${user.id}`);
        }

        // Envoi du mail de reset (fire-and-forget). Si RESEND_API_KEY n'est pas
        // configuree, le service log un warn et passe — pas d'erreur propagee.
        // On ne propage JAMAIS d'exception : un fail email ne doit pas leak
        // l'existence du compte (anti-enumeration MED-010).
        try {
          await this.authEmail.sendPasswordResetEmail({
            to: user.email,
            firstName: user.firstName ?? null,
            token: resetToken,
            userId: user.id,
          });
        } catch {
          // silencieux — le timing flatten ci-dessous absorbe les variations.
        }
      } else {
        // Burn ~ the same time as a real bcrypt hashing pass to flatten the
        // signal (no DB write to leak via timing).
        await bcrypt.hash(crypto.randomBytes(16).toString('hex'), BCRYPT_COST);
      }
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < TARGET_MS) {
        await new Promise((r) => setTimeout(r, TARGET_MS - elapsed));
      }
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

      // 4. JWT — short-lived (HIGH-006: aligned with regular access token).
      //    workspaceId is intentionally null (intervenants are scoped via
      //    Intervenant.userId, not a workspace ownership). Downstream code
      //    must treat null/empty workspaceId for INTERVENANT role as expected.
      const accessToken = await this.jwt.signAsync(
        { sub: user.id, email: user.email, workspaceId: null, role: 'INTERVENANT' } as any,
        { expiresIn: '15m' },
      );

      return {
        userId: user.id,
        accessToken,
        refreshToken: refreshTokenPlain,
        intervenantId: inv.intervenantId,
      };
    });
  }

  /**
   * Register d'un membre/vendeur via token d'invitation WorkspaceInvitation.
   * Contourne le beta gate (l'invité est parrainé par un workspace whitelisté).
   * Ne crée PAS de workspace propre : crée le User et le rattache au workspace
   * de l'invitation via UserWorkspace (rôle de l'invitation, statut ACTIVE).
   */
  async registerWorkspaceMember(dto: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (!dto.token) throw new ForbiddenException('Token requis');

    const inv = await (this.prisma as any).workspaceInvitation.findUnique({
      where: { token: dto.token },
    });
    if (!inv) throw new ForbiddenException('Invitation invalide');
    if (inv.status !== 'PENDING') throw new ForbiddenException(`Invitation deja ${inv.status.toLowerCase()}`);
    if (inv.expiresAt < new Date()) {
      await (this.prisma as any).workspaceInvitation.update({
        where: { id: inv.id },
        data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException('Invitation expiree');
    }

    const email = inv.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(
        'Un compte existe deja avec cet email. Connectez-vous pour rejoindre l\'equipe.',
      );
    }

    const role = inv.role; // 'MEMBER' | 'ADMIN' (UserRole)

    return this.prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_COST);
      const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
      const hashedRefresh = await this.tokenRotation.hashRefreshToken(refreshTokenPlain);

      // 1. Crée le User
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName: dto.firstName ?? inv.firstName ?? null,
          lastName: dto.lastName ?? inv.lastName ?? null,
          refreshToken: hashedRefresh,
          refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      // 2. Rattache l'utilisateur au workspace (siège vendeur/admin, actif)
      await tx.userWorkspace.create({
        data: {
          userId: user.id,
          workspaceId: inv.workspaceId,
          role,
          status: 'ACTIVE',
        },
      });

      // 3. Marque l'invitation acceptée
      await (tx as any).workspaceInvitation.update({
        where: { id: inv.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      // 4. JWT — workspaceId + role réels (contrairement à l'intervenant qui
      //    a workspaceId null). Login automatique côté contrôleur.
      const accessToken = await this.jwt.signAsync(
        { sub: user.id, email: user.email, workspaceId: inv.workspaceId, role } as any,
        { expiresIn: '15m' },
      );

      return {
        userId: user.id,
        workspaceId: inv.workspaceId,
        accessToken,
        refreshToken: refreshTokenPlain,
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
