import { IsEnum } from 'class-validator';
import { PaymentStatus } from '../../../prisma-enums';

/**
 * Valide le statut d'une PaymentRequest (colonne enum PaymentStatus).
 * Avant : `@Body('status') status: string` non validé → un statut arbitraire
 * partait en `status as any` vers Prisma (500 enum invalide).
 */
export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
