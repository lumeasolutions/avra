import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { JwtPayload } from '@avra/types';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';

/**
 * Permission Guard
 *
 * Validates that the authenticated user has the required permissions
 * Checks both role-based and resource-level access control
 *
 * Usage:
 *   @UseGuards(PermissionGuard)
 *   @Permission('documents:read')
 *   @Get('documents')
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip public routes (e.g. @Public() decorator)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as JwtPayload | undefined;

    if (!user) {
      // Fallback sécurisé : les routes d'auth sont toujours accessibles sans user
      // (le @Public() devrait suffire mais on garde ce fallback pour robustesse)
      const url: string = request.url ?? '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/refresh');
      if (isAuthEndpoint) return true;

      throw new ForbiddenException('User not authenticated');
    }

    // Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler()) || [];

    // If no permissions required, allow access
    if (requiredPermissions.length === 0) {
      return true;
    }

    // Get user permissions based on role
    const userPermissions = this.getUserPermissions(user.role);

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) => userPermissions.includes(permission));

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    // 🔒 SECURITY: Verify workspaceId matches (prevent cross-workspace access)
    const requestWorkspaceId = request.params.workspaceId || (user as any).workspaceId;
    if (requestWorkspaceId && requestWorkspaceId !== user.workspaceId) {
      throw new ForbiddenException('Access denied: Invalid workspace');
    }

    return true;
  }

  /**
   * Get all permissions for a given role
   * Define your permission matrix here
   *
   * @param role User role
   * @returns Array of permission strings
   */
  private getUserPermissions(role: string): string[] {
    const permissionMatrix: Record<string, string[]> = {
      // OWNER = accès complet (créateur du workspace)
      OWNER: [
        'workspace:read',
        'workspace:write',
        'workspace:delete',
        'users:read',
        'users:write',
        'users:delete',
        'clients:read',
        'clients:write',
        'clients:delete',
        'projects:read',
        'projects:write',
        'projects:delete',
        'documents:read',
        'documents:write',
        'documents:delete',
        'events:read',
        'events:write',
        'events:delete',
        'stock:read',
        'stock:write',
        'orders:read',
        'orders:write',
        'orders:delete',
        'intervenants:read',
        'intervenants:write',
        'payments:read',
        'payments:write',
        'audit:read',
      ],
      ADMIN: [
        // Full access
        'workspace:read',
        'workspace:write',
        'workspace:delete',
        'users:read',
        'users:write',
        'users:delete',
        'clients:read',
        'clients:write',
        'clients:delete',
        'projects:read',
        'projects:write',
        'projects:delete',
        'documents:read',
        'documents:write',
        'documents:delete',
        'events:read',
        'events:write',
        'events:delete',
        'stock:read',
        'stock:write',
        'orders:read',
        'orders:write',
        'orders:delete',
        'intervenants:read',
        'intervenants:write',
        'payments:read',
        'payments:write',
        'audit:read',
      ],
      MANAGER: [
        // Read most resources, write projects/documents
        'workspace:read',
        'users:read',
        'clients:read',
        'clients:write',
        'projects:read',
        'projects:write',
        'documents:read',
        'documents:write',
        'events:read',
        'events:write',
        'stock:read',
        'stock:write',
        'orders:read',
        'orders:write',
        'intervenants:read',
        'intervenants:write',
        'payments:read',
      ],
      EDITOR: [
        // Read access, limited write
        'workspace:read',
        'clients:read',
        'projects:read',
        'projects:write',
        'documents:read',
        'documents:write',
        'events:read',
        'events:write',
        'stock:read',
        'orders:read',
        'intervenants:read',
      ],
      VIEWER: [
        // Read-only access
        'workspace:read',
        'clients:read',
        'projects:read',
        'documents:read',
        'events:read',
        'stock:read',
        'orders:read',
        'intervenants:read',
      ],
    };

    return permissionMatrix[role] || [];
  }
}
