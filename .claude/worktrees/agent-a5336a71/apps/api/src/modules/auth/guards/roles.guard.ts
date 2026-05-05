import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@avra/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!required?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    return user && required.includes(user.role);
  }
}
