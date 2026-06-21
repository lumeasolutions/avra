import { IsIn, IsOptional } from 'class-validator';

/**
 * Mise à jour d'un membre : changement de rôle (MEMBER ↔ ADMIN) et/ou de
 * statut (ACTIVE ↔ SUSPENDED). Le OWNER n'est jamais modifiable.
 */
export class UpdateMemberDto {
  @IsOptional()
  @IsIn(['MEMBER', 'ADMIN'])
  role?: 'MEMBER' | 'ADMIN';

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';
}
