import { Body, Controller, Post, UseGuards, Get, Res, Req, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import type { JwtPayload } from '@avra/types';

const IS_PROD = process.env.NODE_ENV === 'production';
const IS_SECURE = IS_PROD || process.env.FORCE_SECURE_COOKIES === 'true';

/** Durée de vie du cookie access_token en ms (60 min — assez long pour que
 *  le refresh proactif ait largement le temps, court pour la sécurité). */
const ACCESS_COOKIE_TTL = 60 * 60 * 1000;
/** Durée de vie du cookie refresh_token / user_id en ms (30 jours). */
const REFRESH_COOKIE_TTL = 30 * 24 * 60 * 60 * 1000;
/** Durée de vie du cookie logged_in en ms (30 jours) */
const SESSION_COOKIE_TTL = 30 * 24 * 60 * 60 * 1000;

interface AuthCookieData {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
}

function setAuthCookies(res: Response, data: AuthCookieData) {
  // 🔒 Cookie HttpOnly — inaccessible au JavaScript, résiste aux XSS
  // 🔒 Secure flag — cookies uniquement en HTTPS (sauf local development)
  // 🔒 SameSite=Lax — fonctionne pour les redirections OAuth-like, protège
  //    contre CSRF en lecture cross-site mais autorise les navigations directes.
  //    'Strict' bloquait certains scenarios (refresh post-redirect).
  res.cookie('access_token', data.accessToken, {
    httpOnly: true,
    secure: IS_SECURE,
    sameSite: 'lax',
    maxAge: ACCESS_COOKIE_TTL,
    path: '/',
  });

  // Refresh token + user id en HttpOnly long-lived. Permettent au endpoint
  // /auth/refresh de regénérer un access_token sans exiger d'auth préalable.
  if (data.refreshToken) {
    res.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: IS_SECURE,
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_TTL,
      // Limité à /api/v1/auth pour minimiser la surface d'envoi
      path: '/',
    });
  }
  if (data.userId) {
    res.cookie('user_id', data.userId, {
      httpOnly: true,
      secure: IS_SECURE,
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_TTL,
      path: '/',
    });
  }

  // Cookie lisible par le frontend pour savoir si l'utilisateur est connecté
  res.cookie('logged_in', 'true', {
    httpOnly: false,
    secure: IS_SECURE,
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_TTL,
    path: '/',
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.clearCookie('user_id', { path: '/' });
  res.clearCookie('logged_in', { path: '/' });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 🔒 SECURITY: Brute-force protection — 5 tentatives max per 15 minutes per IP
  @Public()
  @SkipCsrf()
  @Throttle({ auth: { ttl: 15 * 60 * 1000, limit: 5 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.user.id,
    });
    // Ne pas renvoyer accessToken/refreshToken dans le corps — ils sont en cookies HttpOnly
    const { accessToken: _a, refreshToken: _r, ...safeResult } = result;
    return safeResult;
  }

  /**
   * /auth/refresh — Public car appelé quand le access_token est déjà mort.
   * Lit refresh_token et user_id depuis les cookies HttpOnly posés au login.
   * Régénère un access_token + nouveau refresh_token (rotation) et les
   * renvoie en cookies. Le client n'a rien à fournir (body vide accepté).
   */
  @Public()
  @SkipCsrf()
  @Throttle({ auth: { ttl: 60 * 1000, limit: 30 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    const refreshToken = cookies.refresh_token;
    const userId = cookies.user_id;

    if (!refreshToken || !userId) {
      // Pas de cookies → le client doit se reconnecter.
      clearAuthCookies(res);
      return res.status(401).json({ message: 'No refresh token' });
    }

    try {
      const result = await this.auth.refreshToken(userId, refreshToken);
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId,
      });
      return { ok: true };
    } catch (err) {
      // Refresh invalide / expiré → on purge tous les cookies pour forcer un login.
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.sub);
    clearAuthCookies(res);
    return { success: true };
  }

  // 🔒 SECURITY: Brute-force protection — limit registration attempts
  @Public()
  @SkipCsrf()
  @Throttle({ auth: { ttl: 15 * 60 * 1000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    // Si register renvoie un accessToken, le poser en cookie httpOnly comme login
    const r = result as { accessToken?: string; refreshToken?: string; userId?: string };
    if (r.accessToken) {
      setAuthCookies(res, {
        accessToken: r.accessToken,
        refreshToken: r.refreshToken,
        userId: r.userId,
      });
      const { accessToken: _a, refreshToken: _r, ...safeResult } = result as Record<string, unknown>;
      return safeResult;
    }
    return result;
  }

  /**
   * Register specifique intervenant via token d'invitation.
   * Contourne le beta gate (l'intervenant n'a pas besoin d'etre whitelist),
   * ne cree pas de workspace propre, lie automatiquement l'Intervenant.
   */
  @Public()
  @SkipCsrf()
  @Throttle({ auth: { ttl: 15 * 60 * 1000, limit: 5 } })
  @Post('register-intervenant')
  async registerIntervenant(
    @Body() dto: { token: string; password: string; firstName?: string; lastName?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto?.token || typeof dto.token !== 'string') throw new BadRequestException('Token requis');
    if (!dto?.password || dto.password.length < 8) throw new BadRequestException('Mot de passe : 8 caracteres minimum');
    const result = await this.auth.registerIntervenant({
      token: dto.token,
      password: dto.password,
      firstName: typeof dto.firstName === 'string' ? dto.firstName.slice(0, 100) : undefined,
      lastName: typeof dto.lastName === 'string' ? dto.lastName.slice(0, 100) : undefined,
    });
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.userId,
    });
    return { userId: result.userId, intervenantId: result.intervenantId };
  }

  // ── Réinitialisation du mot de passe ────────────────────────────────────
  @Public()
  @SkipCsrf()
  @Throttle({ auth: { ttl: 15 * 60 * 1000, limit: 5 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.userId, dto.token, dto.newPassword);
    return { ok: true };
  }

  // ── Mot de passe oublié ─────────────────────────────────────────────────
  @Public()
  @SkipCsrf()
  @Throttle({ auth: { ttl: 15 * 60 * 1000, limit: 5 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: { email: string }) {
    // Toujours retourner 200 — ne jamais révéler si l'email existe
    await this.auth.forgotPassword(dto.email ?? '').catch(() => {});
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    const full = await this.auth.validateUser(user);
    if (!full) return null;
    return {
      id: full.id,
      email: full.email,
      firstName: full.firstName,
      lastName: full.lastName,
      role: full.role,
      workspaceId: full.workspaceId,
      workspace: (full as { workspace?: { name: string } }).workspace,
    };
  }
}
