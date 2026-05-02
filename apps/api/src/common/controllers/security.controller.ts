import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { CSRF_COOKIE_NAME, SkipCsrf } from '../guards/csrf.guard';
import { Public } from '../../modules/auth/decorators/public.decorator';

/**
 * Security endpoints.
 *
 * GET /api/v1/security/csrf-token — bootstrap a CSRF cookie + return the value
 * to the client. The frontend reads `document.cookie` for `csrf_token` and
 * mirrors it into the `X-CSRF-Token` header on every mutation.
 */
@Controller('security')
export class SecurityController {
  @Public()
  @SkipCsrf()
  @Get('csrf-token')
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    let token = cookies[CSRF_COOKIE_NAME];
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      token = crypto.randomBytes(32).toString('hex');
      const isProd =
        process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: isProd,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });
    }
    // Also expose via header (CORS allows it). Clients that cannot read cookies
    // (e.g. cross-origin tools) can rely on the header or the JSON body.
    res.set('X-CSRF-Token', token);
    return { token, expiresIn: 24 * 60 * 60 };
  }
}
