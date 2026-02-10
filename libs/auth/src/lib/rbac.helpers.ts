import { Role } from '@org/data';

/**
 * Can the user access a resource in taskOrgId when the task's org has the given parent (2-level hierarchy)?
 * Allowed if: user's org is the task's org, or user's org is the parent of the task's org (direct child).
 */
export function canAccessTaskOrg(
  userOrgId: string,
  taskOrgId: string,
  taskOrgParentId: string | null
): boolean {
  if (userOrgId === taskOrgId) return true;
  if (taskOrgParentId === userOrgId) return true;
  return false;
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

/**
 * Returns org IDs the user can access (2-level): user's org + direct children.
 * Pass to services to scope queries (e.g. tasks where organizationId In(ids)).
 */
export function getAccessibleOrgIds(
  userOrgId: string,
  childOrgIds: string[]
): string[] {
  return [userOrgId, ...childOrgIds];
}
