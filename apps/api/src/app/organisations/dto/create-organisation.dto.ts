import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateOrganisationDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}
