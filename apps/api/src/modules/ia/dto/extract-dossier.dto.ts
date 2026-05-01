import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ExtractDossierDto {
  @IsString()
  @IsNotEmpty({ message: 'dossierId requis' })
  @MaxLength(64)
  dossierId!: string;
}
