import { Permission, Role, TaskCategory, TaskStatus } from './enums.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
}

export type AuditAction =
  | 'task:create'
  | 'task:update'
  | 'task:delete'
  | 'user:login'
  | 'user:logout';

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string | null;
  action: AuditAction;
  entityType: 'task' | 'user' | 'organization' | 'other';
  createdAt: string;
}

