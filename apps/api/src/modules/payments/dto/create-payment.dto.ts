import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export enum PaymentType {
  ACOMPTE = 'ACOMPTE',
  SOLDE = 'SOLDE',
  FACTURE = 'FACTURE',
}

export class CreatePaymentDto {
  // NB: les IDs Prisma sont des cuid (pas des UUID) → @IsString, sinon 400 systématique.
  @IsString()
  projectId: string;

  @IsEnum(PaymentType)
  type: PaymentType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  reference?: string;
}
