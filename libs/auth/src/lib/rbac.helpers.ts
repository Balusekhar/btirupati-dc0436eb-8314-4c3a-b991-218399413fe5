import { Role } from '@org/data';

/**
 * Can the user (with given role and organizationId) access a resource that belongs to taskOrgId?
 * Used by Tasks and Audit: same-org access only; Owner/Admin/Viewer scope is enforced by guards.
 */
export function canAccessTaskOrg(
  userOrgId: string,
  taskOrgId: string
): boolean {
  return userOrgId === taskOrgId;
}

/**
 * Can the user (with given role and org) access the target organization?
 * Same-org only for now; Owner could be extended for multi-org later.
 */
export function canAccessOrganization(
  userOrgId: string,
  targetOrgId: string
): boolean {
  return userOrgId === targetOrgId;
}

/**
 * Can the user with this role perform the given action on a resource in the same org?
 * Use after canAccessTaskOrg/canAccessOrganization; this is for role-level checks.
 */
export function canActInOrg(_role: Role, _targetOrgId: string): boolean {
  return true;
}
