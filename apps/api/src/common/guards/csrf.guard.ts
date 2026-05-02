import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

/** Cookie name carrying the CSRF token (NON-HttpOnly, JS reads it). */
export const CSRF_COOKIE_NAME = 'csrf_token';
/** Header used by the client to mirror the cookie value. */
export const CSRF_HEADER_NAME = 'x-csrf-token';
/** TTL of the CSRF cookie (24h). */
const CSRF_COOKIE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * CSRF Protection Guard — stateless double-submit cookie pattern.
 *
 * No server-side store (works on serverless / multi-region).
 *
 * Flow:
 *   1. On every request, if no `csrf_token` cookie is present, generate one
 *      (32 random bytes hex) and set it: NON-HttpOnly, SameSite=Strict, Secure.
 *      The token is also stashed on `request.csrfToken` for the response interceptor.
 *   2. For mutating methods (POST/PUT/PATCH/DELETE), require `X-CSRF-Token`
 *      header value to match the cookie value (constant-time compare).
 *      A matching pair proves the request originates from a same-origin script
 *      that could read the cookie — i.e. not a cross-site form/XHR.
 *
 * The token is NOT one-time-use here (sticky for the cookie lifetime). One-time
 * rotation in a stateless world cannot be done without a session store, and
 * sticky double-submit is the OWASP-recommended pattern.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // Always ensure the cookie is set (so the next mutation has something to mirror).
    const cookieToken = this.ensureCsrfCookie(request, response);

    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      this.validate(request, cookieToken);
    }

    return true;
  }

  /** Read existing cookie or set a fresh one. Returns the active token. */
  private ensureCsrfCookie(request: Request, response: Response): string {
    const existing = (request as Request & { cookies?: Record<string, string> }).cookies?.[CSRF_COOKIE_NAME];
    if (existing && /^[a-f0-9]{64}$/i.test(existing)) {
      (request as any).csrfToken = existing;
      return existing;
    }
    const fresh = crypto.randomBytes(32).toString('hex');
    const isProd = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';
    // NON-HttpOnly so the browser JS can mirror it into the X-CSRF-Token header.
    response.cookie(CSRF_COOKIE_NAME, fresh, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'strict',
      maxAge: CSRF_COOKIE_TTL_MS,
      path: '/',
    });
    (request as any).csrfToken = fresh;
    return fresh;
  }

  private validate(request: Request, cookieToken: string): void {
    const headerToken = (request.get(CSRF_HEADER_NAME) || '').trim();
    if (!headerToken) {
      throw new ForbiddenException('Missing CSRF token (X-CSRF-Token header required)');
    }
    if (!cookieToken) {
      throw new ForbiddenException('Missing CSRF cookie');
    }
    const a = Buffer.from(headerToken);
    const b = Buffer.from(cookieToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new ForbiddenException('Invalid CSRF token');
    }
  }
}
