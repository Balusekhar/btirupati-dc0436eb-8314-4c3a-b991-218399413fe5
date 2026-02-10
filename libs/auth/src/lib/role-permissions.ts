import { Permission, Role } from '@org/data';

/**
 * Role–permission mapping:
 * - Owner → all permissions
 * - Admin → task CRUD + audit:read
 * - Viewer → task:read only
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.Owner]: [
    Permission.TaskCreate,
    Permission.TaskRead,
    Permission.TaskUpdate,
    Permission.TaskDelete,
    Permission.AuditRead,
  ],
  [Role.Admin]: [
    Permission.TaskCreate,
    Permission.TaskRead,
    Permission.TaskUpdate,
    Permission.TaskDelete,
    Permission.AuditRead,
  ],
  [Role.Viewer]: [Permission.TaskRead],
};

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}
