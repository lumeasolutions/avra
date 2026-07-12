import { IsString, IsNumber, IsInt, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineDto {
  @IsString()
  description: string;

  // Colonne Prisma Int → @IsInt (sinon un décimal provoque un 500 Prisma).
  @IsInt()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class CreateOrderDto {
  // Les ids Prisma sont des cuid (pas des UUID) → @IsString, pas @IsUUID.
  @IsString()
  projectId: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  @IsOptional()
  lines?: OrderLineDto[];
}
