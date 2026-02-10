import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Role } from '@org/data';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
