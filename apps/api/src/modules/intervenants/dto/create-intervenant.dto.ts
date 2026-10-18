import { IsEmail, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { IntervenantType } from '../../../prisma-enums';

export class CreateIntervenantDto {
  @IsEnum(IntervenantType)
  type: IntervenantType;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  // Adresse vérifiée (domaine complet, ex. nom@domaine.fr) : une adresse mal
  // saisie (« paul@gmail ») était acceptée, puis chaque demande à cet artisan
  // échouait à l'envoi. Une chaîne vide reste permise (champ effacé).
  @IsOptional()
  @IsString()
  @ValidateIf((o: CreateIntervenantDto) => typeof o.email === 'string' && o.email.trim() !== '')
  @IsEmail({}, { message: "L'adresse e-mail de l'intervenant n'est pas valide (exemple : nom@domaine.fr)." })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
