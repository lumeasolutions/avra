import { IsObject } from 'class-validator';

/**
 * Bloc de configuration UI complet (société, facturation, numérotation,
 * relances, alertes, préférences, IA). Forme libre côté backend : c'est le
 * front qui en définit la structure.
 */
export class UpdateSettingsDto {
  @IsObject()
  config: Record<string, unknown>;
}
