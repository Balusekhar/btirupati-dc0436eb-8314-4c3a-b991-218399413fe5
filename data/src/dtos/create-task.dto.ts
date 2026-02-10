import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import type { TaskStatus } from '../models.js';

const TASK_STATUSES: TaskStatus[] = ['open', 'in_progress', 'completed', 'archived'];
const TASK_CATEGORIES = ['work', 'personal'] as const;

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(TASK_STATUSES)
  status!: TaskStatus;

  @IsString()
  @IsIn(TASK_CATEGORIES)
  category!: string;

  @IsUUID()
  organizationId!: string;
}
