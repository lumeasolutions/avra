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
import { StockModule } from './modules/stock/stock.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatsModule } from './modules/stats/stats.module';
import { IaModule } from './modules/ia/ia.module';
import { SignatureModule } from './modules/signature/signature.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // ✅ Validate environment variables at startup
    ConfigModule.forRoot({ isGlobal: true, validate, envFilePath: ['../../.env', '.env'] }),
    // ✅ SECURITY: Enhanced rate limiting with multiple profiles
    // Global: 60 req/min per IP
    // Login/Register: 5 req/15 min per IP (brute-force protection)
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 300 },
      { name: 'auth', ttl: 15 * 60 * 1000, limit: 5 }, // 5 requests per 15 minutes
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
    StockModule,
    OrdersModule,
    NotificationsModule,
    StatsModule,
    IaModule,
    SignatureModule,
    PaymentsModule,
    AuditModule,
  ],
  providers: [
    // ✅ Apply ThrottlerGuard globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // ✅ Apply AuditInterceptor globally
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
