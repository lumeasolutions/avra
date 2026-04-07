import { Body, Controller, Post, UseGuards, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import type { JwtPayload } from '@avra/types';

const IS_PROD = process.env.NODE_ENV === 'production';
const IS_SECURE = IS_PROD || process.env.FORCE_SECURE_COOKIES === 'true';

/** Durée de vie du cookie access_token en ms (15 min) */
const ACCESS_COOKIE_TTL = 15 * 60 * 1000;
/** Durée de vie du cookie logged_in en ms (30 jours) */
const SESSION_COOKIE_TTL = 30 * 24 * 60 * 60 * 1000;

function setAuthCookies(res: Response, accessToken: string) {
  // 🔒 Cookie HttpOnly — inaccessible au JavaScript, résiste aux XSS
  // 🔒 Secure flag — cookies uniquement en HTTPS (sauf local development)
  // 🔒 SameSite=Strict — protection contre CSRF
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: IS_SECURE,
    sameSite: 'strict',
    maxAge: ACCESS_COOKIE_TTL,
    path: '/',
  });
  // Cookie lisible par le frontend pour savoir si l'utilisateur est connecté
  res.cookie('logged_in', 'true', {
    httpOnly: false,
    secure: IS_SECURE,
    sameSite: 'strict',
    maxAge: SESSION_COOKIE_TTL,
    path: '/',
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
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
    setAuthCookies(res, result.accessToken);
    // Ne pas renvoyer accessToken dans le corps — il est dans le cookie HttpOnly
    const { accessToken: _, ...safeResult } = result;
    return safeResult;
  }

  @SkipCsrf()
  @Post('refresh')
  async refresh(
    @Body() dto: { userId: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refreshToken(dto.userId, dto.refreshToken);
    setAuthCookies(res, result.accessToken);
    // Ne pas exposer le nouveau accessToken dans le corps
    return { ok: true };
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
    const accessToken = (result as { accessToken?: string }).accessToken;
    if (accessToken) {
      setAuthCookies(res, accessToken);
      const { accessToken: _, ...safeResult } = result as { accessToken?: string };
      return safeResult;
    }
    return result;
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
