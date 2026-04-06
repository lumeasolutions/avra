import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IntervenantType } from '../../../prisma-enums';

export class CreateIntervenantDto {
  @IsEnum(IntervenantType)
  type: IntervenantType;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
