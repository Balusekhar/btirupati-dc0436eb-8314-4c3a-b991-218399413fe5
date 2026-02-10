import type { Task } from '@org/data';

export type TaskCategory = 'work' | 'personal';

// Backend returns `category` and `description` can be null (TypeORM entity uses `string | null`).
export interface ApiTask extends Omit<Task, 'description'> {
  category: TaskCategory;
  description?: string | null;
}

