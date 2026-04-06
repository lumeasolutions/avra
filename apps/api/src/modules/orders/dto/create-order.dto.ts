import { IsString, IsUUID, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineDto {
  @IsString()
  description: string;

  @IsNumber()
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
  @IsUUID()
  projectId: string;

  @IsUUID()
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
