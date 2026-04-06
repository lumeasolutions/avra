import { SetMetadata } from '@nestjs/common';

/**
 * Permission Decorator
 *
 * Used to specify required permissions for endpoint access
 *
 * Example:
 *   @Permission('documents:read', 'documents:write')
 *   @Get('documents')
 *   getDocuments() { ... }
 */
export const Permission = (...permissions: string[]) => SetMetadata('permissions', permissions);
