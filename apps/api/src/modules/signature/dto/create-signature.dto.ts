import { IsString, IsUUID, IsEmail, IsOptional, IsArray, ValidateNested } from 'class-validator';
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

export class CreateSignatureDto {
  @IsUUID()
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
}
