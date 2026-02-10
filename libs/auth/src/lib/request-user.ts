import { Role } from '@org/data';

/** Request user shape attached by JWT strategy (used by guards and handlers). */
export interface RequestWithUser {
  user?: {
    id: string;
    email: string;
    role: Role;
    organizationId: string;
    [k: string]: unknown;
  };
}
