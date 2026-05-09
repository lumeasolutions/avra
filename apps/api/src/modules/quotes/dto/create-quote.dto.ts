import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuoteLineDto {
  @IsString()
  description: string;

  // string for Prisma.Decimal — never coerce to Number
  @IsNumberString()
  quantity: string;

  @IsNumberString()
  unitPrice: string;

  @IsOptional()
  @IsNumberString()
  vatRate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateQuoteDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineDto)
  lines: CreateQuoteLineDto[];
}
