import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import type { JwtPayload } from '@avra/types';

/** Extrait le JWT depuis le cookie HttpOnly OU l'en-tête Authorization (fallback) */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // 1. Cookie HttpOnly (méthode sécurisée — prioritaire)
  const cookieHeader = req?.headers?.cookie;
  if (cookieHeader) {
    const token = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('access_token='))
      ?.split('=')
      .slice(1)
      .join('=');
    if (token) return decodeURIComponent(token);
  }
  // 2. Authorization: Bearer <token> (fallback pour les clients API et mode démo)
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.auth.validateUser(payload);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
