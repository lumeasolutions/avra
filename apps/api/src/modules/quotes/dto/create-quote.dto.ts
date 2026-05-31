import {
  IsArray,
  IsDateString,
  IsEmail,
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

  // string pour Prisma.Decimal — jamais coerce en Number (on garde les centimes).
  @IsNumberString()
  quantity: string;

  @IsNumberString()
  unitPrice: string;

  @IsOptional()
  @IsNumberString()
  vatRate?: string;

  /** Remise en pourcentage (0-100). */
  @IsOptional()
  @IsNumberString()
  discount?: string;

  /** Unite libre (forfait, m2, h...). */
  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateQuoteDto {
  /** Optionnel : devis standalone (sans dossier lie). */
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

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
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  signatureStatus?: string;

  @IsOptional()
  @IsEmail()
  signatureEmail?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineDto)
  lines: CreateQuoteLineDto[];
}
