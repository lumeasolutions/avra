import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import type { JwtPayload } from '@avra/types';
import { TokenBlacklistService } from './token-blacklist.service';

export interface TokenRotationResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  /** HIGH-4: jti embedded in the refresh JWT — bcrypt-hashed in DB. */
  refreshTokenJti: string;
}

/**
 * HIGH-4: refresh JWT payload. `sub` is the userId, `jti` is a 32-byte hex
 * random — only the bcrypt hash of `jti` lives in DB so it survives a DB
 * leak the same way passwords do, while making the token itself self-describing
 * (no separate `user_id` cookie needed to look up the user).
 */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

/**
 * Token Rotation Service
 * Handles generation and validation of JWT tokens with refresh rotation
 */
@Injectable()
export class TokenRotationService {
  constructor(
    private readonly jwt: JwtService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  /**
   * Generate new access and refresh tokens.
   *
   * HIGH-4: the refresh token is now a signed JWT { sub, jti } so the server
   * can recover the userId from the cookie alone — no more separate
   * `user_id` cookie. Only the bcrypt hash of `jti` is persisted in DB.
   */
  generateTokenPair(payload: JwtPayload): TokenRotationResult {
    const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '15m',
    });

    const refreshTokenJti = crypto.randomBytes(32).toString('hex');
    const refreshSecret = this.getRefreshSecret();
    const refreshToken = this.jwt.sign(
      { sub: payload.sub, jti: refreshTokenJti } satisfies RefreshTokenPayload,
      {
        secret: refreshSecret,
        algorithm: 'HS256',
        expiresIn: '30d',
      },
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      refreshTokenJti,
    };
  }

  /**
   * HIGH-4: verify the refresh JWT (signature + expiry + alg pinning) and
   * return the decoded payload. Returns null on any verification failure
   * (do NOT throw — the caller wants to distinguish JWT-invalid from
   * jti-mismatch to support the legacy fallback path).
   */
  verifyRefreshJwt(token: string): RefreshTokenPayload | null {
    try {
      const decoded = this.jwt.verify(token, {
        secret: this.getRefreshSecret(),
        algorithms: ['HS256'],
      });
      if (typeof decoded !== 'object' || decoded === null) return null;
      const { sub, jti } = decoded as Record<string, unknown>;
      if (typeof sub !== 'string' || typeof jti !== 'string') return null;
      return { sub, jti };
    } catch {
      return null;
    }
  }

  /**
   * Hash a refresh token (or jti) for storage.
   *
   * NOTE (HIGH-4): with the JWT scheme this is called on the `jti` claim,
   * not on the full JWT — the token itself is recomputable from sub + jti
   * + secret, so what we actually need to compare server-side is just `jti`.
   */
  async hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Verify a refresh token (or jti) against its bcrypt hash.
   */
  async verifyRefreshToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * HIGH-4: retrieves JWT_REFRESH_SECRET — required, ≥32 chars. Throws at
   * call time (not module init) so unit tests that don't exercise refresh
   * can still spin up the service.
   */
  private getRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_REFRESH_SECRET is required and must be at least 32 characters (HIGH-4).',
      );
    }
    return secret;
  }

  /**
   * Revoke a token by adding it to the blacklist
   */
  revokeToken(token: string, expiresAt: Date): void {
    this.blacklist.addToBlacklist(token, expiresAt);
  }

  /**
   * Check if a token has been revoked
   */
  isTokenRevoked(token: string): boolean {
    return this.blacklist.isBlacklisted(token);
  }

  /**
   * Verify JWT token validity and check blacklist
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      // Check if token is blacklisted
      if (this.isTokenRevoked(token)) {
        return null;
      }

      // Verify and decode JWT
      return this.jwt.verify(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }
}
