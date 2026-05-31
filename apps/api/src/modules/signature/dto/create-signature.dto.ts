import { IsString, IsEmail, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SignerDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

/** Placement du champ de signature dans le PDF (origine haut-gauche, points). */
export class SignatureFieldDto {
  @IsNumber()
  page: number;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;
}

export class CreateSignatureDto {
  // Les identifiants projet sont des cuid (ex: cmpo...), pas des UUID → IsString.
  @IsString()
  projectId: string;

  @IsString()
  @IsOptional()
  documentTitle?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignerDto)
  @IsOptional()
  signers?: SignerDto[];

  @IsString()
  @IsOptional()
  storedFileId?: string;

  // YouSign specific fields
  @IsEmail()
  @IsOptional()
  signerEmail?: string;

  @IsString()
  @IsOptional()
  signerFirstName?: string;

  @IsString()
  @IsOptional()
  signerLastName?: string;

  @IsString()
  @IsOptional()
  signerPhone?: string;

  @IsString()
  @IsOptional()
  documentBase64?: string;

  // Position du champ de signature (calculée côté frontend selon le PDF généré).
  @IsOptional()
  @ValidateNested()
  @Type(() => SignatureFieldDto)
  signatureField?: SignatureFieldDto;
}
