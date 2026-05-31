import {
  IsArray, IsDateString, IsEmail, IsInt, IsNumberString, IsOptional,
  IsString, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineDto {
  @IsString()
  description: string;

  @IsNumberString()
  quantity: string;

  @IsNumberString()
  unitPrice: string;

  @IsOptional()
  @IsNumberString()
  vatRate?: string;

  @IsOptional()
  @IsNumberString()
  discount?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  /** STANDARD / ACOMPTE / INTERMEDIAIRE / SOLDE / AVOIR */
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  clientAddress?: string;

  @IsOptional()
  @IsString()
  objet?: string;

  @IsOptional()
  @IsString()
  conditionsPaiement?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  dateEcheance?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsNumberString()
  montantDeja?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];
}
