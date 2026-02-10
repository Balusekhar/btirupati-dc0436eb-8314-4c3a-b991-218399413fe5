import type { Task } from '@org/data';

// Backend returns `description` as nullable (TypeORM entity uses `string | null`).
export interface ApiTask extends Omit<Task, 'description'> {
  description?: string | null;
}
