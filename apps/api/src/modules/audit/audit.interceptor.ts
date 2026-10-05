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

            // 🔒 SÉCURITÉ/RGPD: ne stocker QUE l'identifiant de l'entité touchée.
            // Auparavant `{ entityId, ...result }` sérialisait tout l'objet retourné
            // (email, tokens, etc.) en clair dans auditLog.changes, hors du scrubbing.
            const entityId =
              result && typeof result === 'object' && 'id' in result
                ? (result as { id?: unknown }).id
                : undefined;

            /**
             * Route appelee, identifiants remplaces par `:id`.
             *
             * Sans elle, le journal ne disait que « CREATE » : impossible de
             * savoir si l'on avait cree un dossier, un devis ou un
             * rendez-vous. On ne conserve que le chemin — aucune donnee
             * metier, ni corps de requete ni reponse.
             */
            const chemin = (path || '')
              .split('/')
              .map((s) => (/^[a-z0-9]{20,}$/i.test(s) || /^[0-9a-f-]{32,}$/i.test(s) ? ':id' : s))
              .join('/');

            /**
             * Dossier concerne, quand la route en designe un. La colonne
             * existait depuis l'origine et n'avait jamais ete remplie : 923
             * lignes sans un seul rattachement.
             */
            const segments = (path || '').split('/').filter(Boolean);
            let projectId: string | undefined;
            for (let i = 0; i < segments.length - 1; i++) {
              if (['projects', 'dossiers'].includes(segments[i])
                && /^[a-z0-9]{20,}$/i.test(segments[i + 1])) {
                projectId = segments[i + 1];
                break;
              }
            }

            await this.prisma.auditLog.create({
              data: {
                workspaceId: user.workspaceId,
                userId: user.sub,
                projectId,
                action: action as any,
                changes: { chemin, methode: method, ...(entityId !== undefined ? { entityId } : {}) },
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
