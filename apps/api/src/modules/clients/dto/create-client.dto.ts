import { IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';
import { ClientType } from '../../../prisma-enums';

export class CreateClientDto {
  @IsEnum(ClientType)
  type: ClientType = 'PARTICULIER';

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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
