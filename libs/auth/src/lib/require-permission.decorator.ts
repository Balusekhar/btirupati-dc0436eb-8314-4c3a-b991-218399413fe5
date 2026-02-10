import { SetMetadata } from '@nestjs/common';
import { Permission } from '@org/data';

export const REQUIRE_PERMISSION_KEY = 'require-permission';
export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
