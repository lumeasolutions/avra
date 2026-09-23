import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendInviteDto {
  /** invite = 1er envoi, update = modification, cancel = annulation. */
  @IsIn(['invite', 'update', 'cancel'])
  kind: 'invite' | 'update' | 'cancel';

  /** Destinataire (obligatoire au 1er envoi ; sinon celui du dernier envoi). */
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(200)
  to?: string;

  /**
   * Liste complète des destinataires (23/09/2026, réunions groupées).
   * Prioritaire sur `to`, qui reste accepté pour un envoi à une seule
   * personne. 20 adresses maximum : au-delà c'est une liste de diffusion,
   * pas un rendez-vous.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Vingt destinataires au maximum par rendez-vous.' })
  @IsEmail({}, { each: true, message: "L'une des adresses e-mail est invalide." })
  destinataires?: string[];

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
