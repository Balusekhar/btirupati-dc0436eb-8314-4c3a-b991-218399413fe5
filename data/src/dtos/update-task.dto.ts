import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaskStatus } from '../enums.js';

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

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}
