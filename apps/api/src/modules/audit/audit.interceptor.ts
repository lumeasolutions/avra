/**
 * ✅ Audit Log Interceptor
 * Automatically logs all mutations (POST, PUT, DELETE) to the database
 * 🔒 SECURITY: Uses SanitizedLogger to mask sensitive data
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { SanitizedLogger } from '../../common/logging/sanitized-logger';
import { IpAnonymizer } from '../../common/logging/ip-anonymizer';
import type { JwtPayload } from '@avra/types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new SanitizedLogger();

  constructor(private readonly prisma: PrismaService) {
    this.logger.setContext('AuditInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.path;
    const user = request.user as JwtPayload | undefined;

    // Only log mutations (POST, PUT, DELETE, PATCH)
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        try {
          // Skip system endpoints
          if (['health', 'auth/login', 'auth/refresh'].includes(path)) {
            return;
          }

          // Write audit log
          if (user) {
            // Map HTTP method to AuditAction
            const actionMap: Record<string, string> = {
              post: 'CREATE',
              put: 'UPDATE',
              patch: 'UPDATE',
              delete: 'DELETE',
            };
            const action = actionMap[method.toLowerCase()] || 'UPDATE';

            // 🔒 SECURITY: Anonymize IP address for GDPR compliance
            const clientIp = IpAnonymizer.extractClientIp(request);
            const anonymizedIp = IpAnonymizer.shouldLog(clientIp)
              ? IpAnonymizer.anonymize(clientIp)
              : null;

            await this.prisma.auditLog.create({
              data: {
                workspaceId: user.workspaceId,
                userId: user.sub,
                action: action as any,
                changes: result ? { entityId: result.id, ...result } : null,
                ipAddress: anonymizedIp,
              },
            });

            // Log audit event with sanitized data
            this.logger.log(
              `[${action}] ${path} by user ${user.sub.substring(0, 8)}... (IP: ${anonymizedIp})`,
              'Audit'
            );
          }
        } catch (error) {
          // Log error but don't throw — auditing failures shouldn't break the API
          this.logger.error('Audit log failed', error instanceof Error ? error.stack : String(error));
        }
      }),
    );
  }

  private extractEntityType(path: string): string {
    // /api/projects/123 → "PROJECT"
    // /api/clients/456 → "CLIENT"
    const match = path.match(/\/api\/(\w+)/);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    return 'UNKNOWN';
  }
}
