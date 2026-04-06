import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

/**
 * Token Blacklist Service
 * Manages revoked JWT tokens to prevent their reuse
 * In production, this should use Redis for distributed cache
 */
@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private blacklist: Set<string> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  onModuleInit() {
    // Cleanup expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Add a token to the blacklist
   * @param token JWT token to blacklist
   * @param expiresAt Token expiration time
   */
  addToBlacklist(token: string, expiresAt: Date): void {
    this.blacklist.add(`${token}:${expiresAt.getTime()}`);
  }

  /**
   * Check if a token is blacklisted
   * @param token JWT token to check
   * @returns true if token is blacklisted
   */
  isBlacklisted(token: string): boolean {
    // Check all entries with this token
    for (const entry of this.blacklist) {
      if (entry.startsWith(`${token}:`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove expired tokens from blacklist
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const entry of this.blacklist) {
      const expiresAt = parseInt(entry.split(':')[1], 10);
      if (expiresAt < now) {
        toDelete.push(entry);
      }
    }

    toDelete.forEach((entry) => this.blacklist.delete(entry));
  }

  /**
   * Clear entire blacklist (for testing)
   */
  clearBlacklist(): void {
    this.blacklist.clear();
  }
}
