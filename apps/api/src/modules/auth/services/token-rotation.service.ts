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
   * Generate new access and refresh tokens
   */
  generateTokenPair(payload: JwtPayload): TokenRotationResult {
    const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = crypto.randomBytes(32).toString('hex');

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  /**
   * Hash a refresh token for storage
   */
  async hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Verify a refresh token against its hash
   */
  async verifyRefreshToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
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
