import { ProjectLifecycleStatus } from './prisma-enums';

export const statusMap: Record<ProjectLifecycleStatus, string> = {
  DRAFT: 'EN COURS',
  VENTE: 'EN COURS',
  SIGNE: 'SIGNE',
  EN_CHANTIER: 'EN COURS',
  RECEPTION: 'FINITION',
  SAV: 'EN COURS',
  CLOTURE: 'A VALIDER',
  PERDU: 'PERDU',
  ARCHIVE: 'ARCHIVE',
};

export const reverseStatusMap: Record<string, ProjectLifecycleStatus> = {
  'EN COURS': 'VENTE',
  'SIGNE': 'SIGNE',
  'FINITION': 'RECEPTION',
  'A VALIDER': 'CLOTURE',
  'URGENT': 'VENTE',
  'PERDU': 'PERDU',
};
