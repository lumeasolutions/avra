import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

/**
 * Cache Module
 *
 * Provides in-memory caching for expensive operations
 * Uses NestJS CacheModule with 5-minute TTL by default
 *
 * ✅ Opt-in caching: only endpoints decorated with @UseInterceptors(CacheInterceptor) + @CacheTTL()
 * ✅ Manual invalidation: use cacheManager.del() on mutations
 */
@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutes in seconds
      max: 100, // Maximum number of cached items
      isGlobal: false, // Not global - opt-in per endpoint
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
