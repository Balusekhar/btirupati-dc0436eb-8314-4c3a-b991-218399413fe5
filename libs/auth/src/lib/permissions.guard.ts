import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@org/data';
import { RequestWithUser } from './request-user';
import { roleHasPermission } from './role-permissions';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!requiredPermission) return true;
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user?.role) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!roleHasPermission(user.role, requiredPermission)) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermission}`,
      );
    }
    return true;
  }
}
