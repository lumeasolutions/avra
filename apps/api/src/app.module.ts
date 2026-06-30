import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { validate } from './config/env.validation';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EventsModule } from './modules/events/events.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { IntervenantsModule } from './modules/intervenants/intervenants.module';
import { IntervenantDossiersModule } from './modules/intervenant-dossiers/intervenant-dossiers.module';
import { DemandesModule } from './modules/demandes/demandes.module';
import { StockModule } from './modules/stock/stock.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatsModule } from './modules/stats/stats.module';
import { IaModule } from './modules/ia/ia.module';
import { SignatureModule } from './modules/signature/signature.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AuditModule } from './modules/audit/audit.module';
import { DossierDocumentsModule } from './modules/dossier-documents/dossier-documents.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PublicModule } from './modules/public/public.module';
import { TeamModule } from './modules/team/team.module';

@Module({
  imports: [
    // ✅ Validate environment variables at startup
    ConfigModule.forRoot({ isGlobal: true, validate, envFilePath: ['../../.env', '.env'] }),
    // ✅ SECURITY: Enhanced rate limiting with multiple profiles
    // Global: 300 req/min per IP
    // Login/Register: 5 req/15 min per IP (brute-force protection)
    //
    // TODO(MED-011): swap to Redis-backed storage for multi-instance / serverless.
    //   When `REDIS_URL` (or UPSTASH_REDIS_*) is set in env, configure
    //   `@nestjs/throttler-storage-redis` with `new Redis(process.env.REDIS_URL)`.
    //   In current Vercel serverless setup, in-memory throttle resets per cold-start
    //   — acceptable for soft rate-limiting, NOT for strict brute-force protection.
    ThrottlerModule.forRoot([
      // Un seul throttler global (300/min). IMPORTANT : tout throttler NOMME ici
      // s'applique a TOUTES les routes (comportement @nestjs/throttler). Avoir
      // 'auth' (5/15min) et 'ai' (5/min) en global generait des 429 parasites
      // partout (ex. ouverture de documents). Les limites strictes sont donc
      // appliquees PAR ROUTE via @Throttle({ default: {...} }).
      { name: 'default', ttl: 60000, limit: 300 },
    ]),
    MulterModule.register({ storage: require('multer').memoryStorage() }),
    // ✅ SECURITY: Common security module (CSRF, etc.)
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    EventsModule,
    DocumentsModule,
    IntervenantsModule,
    IntervenantDossiersModule,
    DemandesModule,
    StockModule,
    OrdersModule,
    NotificationsModule,
    StatsModule,
    IaModule,
    SignatureModule,
    PaymentsModule,
    AuditModule,
    DossierDocumentsModule,
    QuotesModule,
    InvoicesModule,
    PublicModule,
    TeamModule,
  ],
  providers: [
    // ✅ Apply ThrottlerGuard globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // ✅ Apply AuditInterceptor globally
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
