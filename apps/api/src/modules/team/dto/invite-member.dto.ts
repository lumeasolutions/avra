import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Invitation d'un membre/vendeur à rejoindre le workspace.
 * `role` limité à MEMBER (vendeur) ou ADMIN — on ne peut pas inviter un OWNER
 * (un seul propriétaire par workspace) ni un VIEWER via cette UI en Phase 1.
 */
export class InviteMemberDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsOptional()
  @IsIn(['MEMBER', 'ADMIN'])
  role?: 'MEMBER' | 'ADMIN';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
