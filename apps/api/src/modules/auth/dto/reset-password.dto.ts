import { IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

/**
 * DTO de réinitialisation du mot de passe.
 *
 * Applique les MÊMES règles de complexité que RegisterDto pour empêcher
 * qu'un utilisateur puisse contourner la policy via reset-password
 * (avant, `newPassword: string` était accepté tel quel — risque SEC-C3).
 *
 * MaxLength(72) : bcrypt tronque silencieusement au-delà de 72 octets —
 * bloquer en amont évite qu'un "mot de passe long" perçu comme fort
 * soit en réalité réduit côté hash.
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(72, { message: 'Password must be at most 72 characters long' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'Password must contain at least one special character',
  })
  newPassword: string;
}
