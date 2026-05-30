import { Allow } from 'class-validator';

/**
 * DTO pour PATCH /projects/:id/dossier-data (VAGUE 2 — 28/05/2026).
 *
 * Persiste les champs métier du dossier auparavant client-only.
 * Tous les champs sont optionnels (mise à jour partielle) — seuls les
 * champs présents dans le body sont écrits.
 *
 * Note : on utilise @Allow() (et non @IsString/@IsBoolean) car :
 *   - le ValidationPipe global est en forbidNonWhitelisted: true, donc chaque
 *     propriété DOIT être déclarée sinon 400 ;
 *   - plusieurs champs sont nullable (archivedAt, vendeurName...) ce qui ferait
 *     échouer @IsString sur null ;
 *   - les blobs JSON (prixLignes, confirmations, dateButoires) viennent de
 *     notre propre store et n'ont pas besoin de validation stricte ici.
 * La cohérence de typage est garantie côté service (cast Prisma).
 */
export class SaveDossierDataDto {
  @Allow()
  prixLignes?: unknown;

  @Allow()
  confirmations?: unknown;

  @Allow()
  dateButoires?: unknown;

  @Allow()
  vendeurName?: string | null;

  @Allow()
  statsSkipped?: boolean;

  @Allow()
  terminated?: boolean;

  @Allow()
  terminatedAt?: string | null;

  @Allow()
  archivedAt?: string | null;
}
