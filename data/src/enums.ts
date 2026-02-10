export enum Role {
  Owner = 'owner',
  Admin = 'admin',
  Viewer = 'viewer',
}

export enum Permission {
  TaskCreate = 'task:create',
  TaskRead = 'task:read',
  TaskUpdate = 'task:update',
  TaskDelete = 'task:delete',
  AuditRead = 'audit:read',
}

export enum TaskStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Completed = 'completed',
  Archived = 'archived',
}

export enum TaskCategory {
  Work = 'work',
  Personal = 'personal',
}

