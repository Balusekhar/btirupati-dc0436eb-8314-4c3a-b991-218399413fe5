import { Role } from '@org/data';

/** Canonical user shape attached to requests by the JWT strategy. */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
}

/** Express request augmented with the authenticated user. */
export interface RequestWithUser {
  user?: RequestUser & { [k: string]: unknown };
}
