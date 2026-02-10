import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TaskCategory, TaskStatus } from '../enums.js';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @IsEnum(TaskCategory)
  category!: TaskCategory;

  @IsUUID()
  organizationId!: string;
}
