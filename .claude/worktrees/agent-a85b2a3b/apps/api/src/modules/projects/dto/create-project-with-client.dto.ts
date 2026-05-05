import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TradeType } from '../../../prisma-enums';
import { ClientType } from '../../../prisma-enums';

export class CreateProjectWithClientDto {
  // Client
  @IsEnum(ClientType)
  clientType: ClientType = 'PARTICULIER';

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
  clientNotes?: string;

  // Project
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsEnum(TradeType)
  tradeType: TradeType;
}
