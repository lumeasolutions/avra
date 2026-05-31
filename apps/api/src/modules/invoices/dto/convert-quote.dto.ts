import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ConvertQuoteDto {
  @IsString()
  quoteId: string;

  /** STANDARD / ACOMPTE / INTERMEDIAIRE / SOLDE / AVOIR */
  @IsOptional()
  @IsString()
  type?: string;

  /** Pourcentage applique (factures d'acompte/intermediaire). Defaut 100. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pourcentage?: number;
}
