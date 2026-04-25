import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CsrfGuard } from './guards/csrf.guard';
import { CsrfTokenInterceptor } from './interceptors/csrf-token.interceptor';
import { SecurityController } from './controllers/security.controller';
import { PermissionGuard } from './permissions/permission.guard';
import { WorkspaceGuard } from './permissions/workspace.guard';
import { GdprConsentGuard } from './logging/gdpr-consent.guard';
import { AppCacheModule } from './cache/cache.module';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

/**
 * Common Module
 *
 * Provides global security guards, utilities, and shared services
 * Marked as @Global so it can be imported once and used everywhere
 */
@Global()
@Module({
  imports: [AppCacheModule],
  controllers: [SecurityController],
  providers: [
    // ✅ AUTH: JWT global — runs first so request.user is populated
    // before PermissionGuard / WorkspaceGuard. Respects @Public() decorator.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // ✅ SECURITY: Check GDPR consent and anonymize IPs
    {
      provide: APP_GUARD,
      useClass: GdprConsentGuard,
    },
    // ✅ SECURITY: Apply CSRF protection globally
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    // ✅ SECURITY: Expose le token CSRF dans le header X-CSRF-Token
    // après chaque requête (le frontend le réutilise pour les mutations).
    {
      provide: APP_INTERCEPTOR,
      useClass: CsrfTokenInterceptor,
    },
    // ✅ SECURITY: Apply workspace isolation guard
    {
      provide: APP_GUARD,
      useClass: WorkspaceGuard,
    },
    // ✅ SECURITY: Permission-based access control
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [AppCacheModule],
})
export class CommonModule {}
