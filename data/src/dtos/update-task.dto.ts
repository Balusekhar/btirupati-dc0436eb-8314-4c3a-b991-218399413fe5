import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import type { TaskStatus } from '../models.js';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @IsString()
  @IsOptional()
  status?: TaskStatus;
}
