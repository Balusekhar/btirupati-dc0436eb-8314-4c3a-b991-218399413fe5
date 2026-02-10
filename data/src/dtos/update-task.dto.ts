import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

import type { TaskStatus } from '../models.js';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @IsString()
  @IsOptional()
  status?: TaskStatus;
}
