import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { StockCategory, StockItemStatus } from '../../../prisma-enums';

export class CreateStockItemDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(StockItemStatus)
  status?: StockItemStatus = 'AVAILABLE';

  @IsOptional()
  @IsEnum(StockCategory)
  category?: StockCategory = 'AUTRE';

  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number = 1;

  @IsOptional()
  @IsString()
  notes?: string;
}
