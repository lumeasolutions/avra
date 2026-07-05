import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
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
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number = 1;

  @IsOptional()
  @IsString()
  notes?: string;

  // Champs UI front (fournisseur libre, pastille, seuil mini, image, catégorie libre).
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
