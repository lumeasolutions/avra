import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import type { JwtPayload } from '@avra/types';

/**
 * Workspace Guard
 *
 * Enforces workspace isolation
 * Validates that users only access resources within their assigned workspace
 *
 * Should be applied globally or to controllers that access workspace-scoped resources
 *
 * Usage:
 *   @UseGuards(WorkspaceGuard)
 *   @Get('projects/:workspaceId')
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as JwtPayload | undefined;

    // Skip if no user (will be caught by auth guard)
    if (!user) {
      return true;
    }

    // Extract workspace ID from route params or query
    const requestedWorkspaceId = request.params.workspaceId || request.query.workspaceId;

    // If a specific workspace is requested, verify it matches the user's workspace
    if (requestedWorkspaceId && requestedWorkspaceId !== user.workspaceId) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to access this workspace'
      );
    }

    return true;
  }
}
