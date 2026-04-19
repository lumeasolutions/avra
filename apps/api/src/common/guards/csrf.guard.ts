import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as crypto from 'crypto';

export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

/**
 * CSRF Protection Guard
 *
 * Implements Double-Submit Cookie pattern with CSRF token validation
 * Protects against Cross-Site Request Forgery attacks
 *
 * Usage:
 *   1. Client gets CSRF token from GET request (token in X-CSRF-Token header)
 *   2. Client includes token in X-CSRF-Token header for POST/PUT/DELETE requests
 *   3. Guard validates token against server session
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();
  private readonly TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip if @SkipCsrf() decorator is present
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // SÉCURITÉ : Le bypass précédent (`isLocalhost = !origin || includes('localhost')`)
    // permettait à n'importe quel client non-browser (curl, server-to-server)
    // ou à un Referer contenant "localhost" d'accéder aux endpoints mutants
    // sans token CSRF. Supprimé. En dev, on ne saute le CSRF que si
    // NODE_ENV !== 'production' ET la requête vient d'une Origin de dev reconnue.
    const origin = request.get('origin') || '';
    if (process.env.NODE_ENV !== 'production') {
      const devOrigins = ['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3000'];
      if (origin && devOrigins.includes(origin)) return true;
    }

    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      // Generate and store token for next request
      this.generateAndStoreToken(request);
      return true;
    }

    // For POST, PUT, DELETE, PATCH: validate CSRF token
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      this.validateCsrfToken(request);
    }

    return true;
  }

  /**
   * Generate a new CSRF token and store it
   * @param request Express request object
   */
  private generateAndStoreToken(request: Request): string {
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = this.getSessionId(request);

    // Store token with expiry
    this.csrfTokenStore.set(sessionId, {
      token,
      expiresAt: Date.now() + this.TOKEN_EXPIRY_MS,
    });

    // Clean up expired tokens periodically
    if (Math.random() < 0.01) {
      // 1% of requests trigger cleanup
      this.cleanupExpiredTokens();
    }

    // Set token in response header for client
    (request as any).csrfToken = token;

    return token;
  }

  /**
   * Validate CSRF token from request header
   * @param request Express request object
   * @throws ForbiddenException if token is invalid or missing
   */
  private validateCsrfToken(request: Request): void {
    const sessionId = this.getSessionId(request);
    const tokenFromRequest = request.get('X-CSRF-Token');

    if (!tokenFromRequest) {
      throw new ForbiddenException('Missing CSRF token in X-CSRF-Token header');
    }

    const storedTokenData = this.csrfTokenStore.get(sessionId);

    if (!storedTokenData) {
      throw new ForbiddenException('CSRF token not found or session expired. Request a new token.');
    }

    // Check if token has expired
    if (storedTokenData.expiresAt < Date.now()) {
      this.csrfTokenStore.delete(sessionId);
      throw new ForbiddenException('CSRF token has expired. Request a new token.');
    }

    // Validate token (constant-time comparison to prevent timing attacks)
    if (!this.constantTimeCompare(tokenFromRequest, storedTokenData.token)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    // Invalidate token after use (one-time use)
    this.csrfTokenStore.delete(sessionId);

    // Generate new token for next request
    this.generateAndStoreToken(request);
  }

  /**
   * Get a unique session identifier from the request
   * Uses user ID if authenticated, falls back to session/IP combination
   * @param request Express request object
   * @returns Session identifier string
   */
  private getSessionId(request: Request): string {
    // If user is authenticated, use their ID
    const user = (request as any).user;
    if (user && user.sub) {
      return `user:${user.sub}`;
    }

    // Fall back to session-based identification
    const sessionCookie = request.cookies?.sessionId || request.headers['x-session-id'];
    const userIp = this.getClientIp(request);

    if (sessionCookie) {
      return `session:${sessionCookie}:${userIp}`;
    }

    // Last resort: IP + User-Agent
    const userAgent = request.get('User-Agent') || 'unknown';
    return `ip:${userIp}:${crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 16)}`;
  }

  /**
   * Extract client IP from request (handles proxies)
   * @param request Express request object
   * @returns Client IP address
   */
  private getClientIp(request: Request): string {
    const forwarded = request.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || '0.0.0.0';
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string to compare
   * @param b Second string to compare
   * @returns true if strings match, false otherwise
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Remove expired tokens from the store
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    const expiredKeys = Array.from(this.csrfTokenStore.entries())
      .filter(([, data]) => data.expiresAt < now)
      .map(([key]) => key);

    expiredKeys.forEach((key) => this.csrfTokenStore.delete(key));
  }
}
