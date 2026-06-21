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
// MED-5 (passe-2): the legacy `logged_in` cookie is non-HttpOnly and
//   trivially forgeable; middleware only honors it on local dev. Avoid
//   sending it at all in any deployed environment.
const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development');

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
  // 🔒 HttpOnly — JS cannot read it (XSS-safe).
  // 🔒 Secure — HTTPS only (auto-relaxed in dev).
  // 🔒 SameSite=Strict (HIGH-008) — refuses cross-site sends entirely.
  //    Cross-site magic-link flows that must land authenticated should use a
  //    dedicated cookie; the default auth surface stays Strict.
  res.cookie('access_token', data.accessToken, {
    httpOnly: true,
    secure: IS_SECURE,
    sameSite: 'strict',
    maxAge: ACCESS_COOKIE_TTL,
    path: '/',
  });

  if (data.refreshToken) {
    res.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: IS_SECURE,
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_TTL,
      path: '/',
    });
  }
  if (data.userId) {
    res.cookie('user_id', data.userId, {
      httpOnly: true,
      secure: IS_SECURE,
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_TTL,
      path: '/',
    });
  }

  // FIX (2026-04-30): le cookie `logged_in` doit être posé en prod aussi.
  //   Les guards côté client (AppGuard, IntervenantGuard) en ont besoin pour
  //   savoir qu'une session existe — sans ça, ils redirigent en boucle vers
  //   /login. Ce n'est PAS un secret (juste un drapeau "session active") ; la
  //   véritable authn passe par access_token (httpOnly) validé par le
  //   middleware Edge côté serveur. Forger ce cookie ne donne aucun accès.
  res.cookie('logged_in', 'true', {
    httpOnly: false,
    secure: IS_SECURE,
    // SameSite=Lax (et non Strict) pour rester posé après une navigation
    //   top-level depuis /login (window.location.href = '/portal-select').
    //   Avec Strict, certains navigateurs (Safari) ne renvoient pas le cookie
    //   sur la première page après navigation — le guard voit "pas de cookie"
    //   et redirige aussitôt vers /login → boucle.
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_TTL,
    path: '/',
  });
  // Suppression de la garde IS_LOCAL_DEV : voir commentaire ci-dessus.
  void IS_LOCAL_DEV;
}

function clearAuthCookies(res: Response) {
  // MED-8 (passe-2): mirror cookie attributes when clearing. Some browsers
  //   (Safari especially) refuse to delete a cookie if `secure` / `sameSite`
  //   don't match the original Set-Cookie. Without these options, logout
  //   could leave a stale token sitting on disk.
  const opts = {
    httpOnly: true,
    secure: IS_SECURE,
    sameSite: 'strict' as const,
    path: '/',
  };
  res.clearCookie('access_token', opts);
  res.clearCookie('refresh_token', opts);
  res.clearCookie('user_id', opts);
  // logged_in is non-HttpOnly by design — clear with matching options.
  res.clearCookie('logged_in', { ...opts, httpOnly: false });
  res.clearCookie('csrf_token', { ...opts, httpOnly: false });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 🔒 SECURITY: Brute-force protection — 20 tentatives max per 5 minutes per IP
  // Assoupli pendant la bêta privée pour ne pas bloquer un user qui se trompe
  // de mot de passe quelques fois. La fenêtre courte garde la protection contre
  // les attaques distribuées tout en restant utilisable.
  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 5 * 60 * 1000, limit: 20 } })
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
   *
   * TODO(MED-009): refacto pour supprimer le cookie `user_id` séparé.
   *   Approche : refresh_token devient un JWT signé contenant
   *   `{ sub: userId, jti }`, et User.refreshTokenJtiHash stocke bcrypt(jti).
   *   Avantages : 1 seul cookie, pas de risque de désynchro userId/token, pas
   *   d'IDOR si un attaquant spoof user_id sans le bon refresh_token.
   *   Risques actuels : token rotation existant + multi-device exigent un
   *   modèle ActiveSession[] (déjà présent ?). Refacto à planifier sur sprint
   *   dédié avec migration progressive (lire JWT d'abord, fallback cookie 1 release).
   */
  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 60 * 1000, limit: 30 } })
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
      // FIX (audit 2026-05-01) : la signature de auth.refreshToken est
      // (refreshToken: string, legacyUserId?: string) — les arguments
      // étaient inversés ici, ce qui faisait passer le userId à la
      // place du token JWT et reciproquement → /refresh tombait toujours
      // sur le legacy fallback avec un userId aleatoire (le refreshToken
      // hex) → 401. Le user ne pouvait jamais rafraichir son access_token.
      const result = await this.auth.refreshToken(refreshToken, userId);
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
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
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
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
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

  /**
   * Register specifique membre/vendeur via token d'invitation d'equipe.
   * Contourne le beta gate (parraine par un workspace whitelist), cree le
   * compte et le rattache au workspace (UserWorkspace = role de l'invitation).
   */
  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
  @Post('register-member')
  async registerMember(
    @Body() dto: { token: string; password: string; firstName?: string; lastName?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto?.token || typeof dto.token !== 'string') throw new BadRequestException('Token requis');
    if (!dto?.password || dto.password.length < 8) throw new BadRequestException('Mot de passe : 8 caracteres minimum');
    const result = await this.auth.registerWorkspaceMember({
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
    return { userId: result.userId, workspaceId: result.workspaceId };
  }

  // ── Réinitialisation du mot de passe ────────────────────────────────────
  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.userId, dto.token, dto.newPassword);
    return { ok: true };
  }

  // ── Mot de passe oublié ─────────────────────────────────────────────────
  @Public()
  @SkipCsrf()
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
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
