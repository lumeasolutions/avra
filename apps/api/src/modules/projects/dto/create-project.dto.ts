import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TradeType } from '../../../prisma-enums';

export class CreateProjectDto {
  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsEnum(TradeType)
  tradeType: TradeType;
}
