import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

export class ExtractDossierDto {
  @IsString()
  @IsNotEmpty({ message: 'dossierId requis' })
  @MaxLength(64)
  dossierId!: string;

  /**
   * Restreint l'extraction a un sous-ensemble de sous-dossiers :
   *  - 'achat' : factures des sous-dossiers commande / confirmations / fournisseur
   *  - 'vente' : devis du DERNIER OPTION / PROJET / APD
   *  - 'all'   : tous les documents du dossier (defaut)
   */
  @IsOptional()
  @IsIn(['achat', 'vente', 'all'])
  scope?: 'achat' | 'vente' | 'all';
}
