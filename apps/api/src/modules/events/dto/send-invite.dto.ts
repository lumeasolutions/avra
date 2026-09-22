import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendInviteDto {
  /** invite = 1er envoi, update = modification, cancel = annulation. */
  @IsIn(['invite', 'update', 'cancel'])
  kind: 'invite' | 'update' | 'cancel';

  /** Destinataire (obligatoire au 1er envoi ; sinon celui du dernier envoi). */
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(200)
  to?: string;

  /** Nom du client (formule « Bonjour … »). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** Objet du RDV vu par le client (ex « Présentation de votre projet cuisine »). */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titre?: string;

  /** Message personnel ajouté dans l'e-mail. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
