/**
 * Enums Prisma exportés comme vraies constantes JavaScript
 * Nécessaire car @prisma/client ne fournit pas les enums sans `prisma generate`
 * Source: prisma/schema.prisma
 */

export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const WorkspacePlan = {
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type WorkspacePlan = typeof WorkspacePlan[keyof typeof WorkspacePlan];

export const TradeType = {
  ARCHITECTE_INTERIEUR: 'ARCHITECTE_INTERIEUR',
  CUISINISTE: 'CUISINISTE',
  MENUISIER: 'MENUISIER',
  AGENCEUR: 'AGENCEUR',
  DECORATEUR: 'DECORATEUR',
  PROMOTEUR: 'PROMOTEUR',
  AUTRE: 'AUTRE',
} as const;
export type TradeType = typeof TradeType[keyof typeof TradeType];

export const ClientType = {
  PARTICULIER: 'PARTICULIER',
  PROFESSIONNEL: 'PROFESSIONNEL',
} as const;
export type ClientType = typeof ClientType[keyof typeof ClientType];

export const AddressType = {
  BILLING: 'BILLING',
  SITE: 'SITE',
  OTHER: 'OTHER',
} as const;
export type AddressType = typeof AddressType[keyof typeof AddressType];

export const ProjectLifecycleStatus = {
  DRAFT: 'DRAFT',
  VENTE: 'VENTE',
  SIGNE: 'SIGNE',
  EN_CHANTIER: 'EN_CHANTIER',
  RECEPTION: 'RECEPTION',
  SAV: 'SAV',
  CLOTURE: 'CLOTURE',
  PERDU: 'PERDU',
  ARCHIVE: 'ARCHIVE',
} as const;
export type ProjectLifecycleStatus = typeof ProjectLifecycleStatus[keyof typeof ProjectLifecycleStatus];

export const ProjectPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type ProjectPriority = typeof ProjectPriority[keyof typeof ProjectPriority];

export const PipelineStatus = {
  LEAD: 'LEAD',
  PROSPECT: 'PROSPECT',
  DEVIS_ENVOYE: 'DEVIS_ENVOYE',
  NEGOCIATION: 'NEGOCIATION',
  GAGNE: 'GAGNE',
  PERDU: 'PERDU',
} as const;
export type PipelineStatus = typeof PipelineStatus[keyof typeof PipelineStatus];

export const EventCalendarType = {
  PERSONAL: 'PERSONAL',
  GESTION: 'GESTION',
} as const;
export type EventCalendarType = typeof EventCalendarType[keyof typeof EventCalendarType];

export const EventType = {
  REUNION: 'REUNION',
  VISITE_CHANTIER: 'VISITE_CHANTIER',
  LIVRAISON: 'LIVRAISON',
  INSTALLATION: 'INSTALLATION',
  RDV_CLIENT: 'RDV_CLIENT',
  RELANCE: 'RELANCE',
  FORMATION: 'FORMATION',
  DEPLACEMENT: 'DEPLACEMENT',
  APPEL: 'APPEL',
  AUTRE: 'AUTRE',
} as const;
export type EventType = typeof EventType[keyof typeof EventType];

export const IntervenantType = {
  POSEUR: 'POSEUR',
  ELECTRICIEN: 'ELECTRICIEN',
  MACON: 'MACON',
  PEINTRE: 'PEINTRE',
  PLOMBIER: 'PLOMBIER',
  CARRELEUR: 'CARRELEUR',
  MENUISIER: 'MENUISIER',
  CHAUFFAGISTE: 'CHAUFFAGISTE',
  SERRURIER: 'SERRURIER',
  GEOMETRE: 'GEOMETRE',
  AUTRE: 'AUTRE',
} as const;
export type IntervenantType = typeof IntervenantType[keyof typeof IntervenantType];

export const IntervenantRequestStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REFUSED: 'REFUSED',
  CANCELLED: 'CANCELLED',
} as const;
export type IntervenantRequestStatus = typeof IntervenantRequestStatus[keyof typeof IntervenantRequestStatus];

export const DocumentKind = {
  PLAN: 'PLAN',
  DEVIS: 'DEVIS',
  FACTURE: 'FACTURE',
  CONTRAT: 'CONTRAT',
  BON_COMMANDE: 'BON_COMMANDE',
  PHOTO: 'PHOTO',
  IA_RENDER: 'IA_RENDER',
  AUTRE: 'AUTRE',
} as const;
export type DocumentKind = typeof DocumentKind[keyof typeof DocumentKind];

export const FileMimeCategory = {
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  DOCUMENT: 'DOCUMENT',
  VIDEO: 'VIDEO',
  ARCHIVE: 'ARCHIVE',
  OTHER: 'OTHER',
} as const;
export type FileMimeCategory = typeof FileMimeCategory[keyof typeof FileMimeCategory];

export const StockItemStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  DISCONTINUED: 'DISCONTINUED',
  ORDERED: 'ORDERED',
} as const;
export type StockItemStatus = typeof StockItemStatus[keyof typeof StockItemStatus];

export const StockCategory = {
  MEUBLE: 'MEUBLE',
  ELECTROMENAGER: 'ELECTROMENAGER',
  LUMINAIRE: 'LUMINAIRE',
  ACCESSOIRE: 'ACCESSOIRE',
  MATERIAU: 'MATERIAU',
  TEXTILE: 'TEXTILE',
  SANITAIRE: 'SANITAIRE',
  AUTRE: 'AUTRE',
} as const;
export type StockCategory = typeof StockCategory[keyof typeof StockCategory];

export const IaJobStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;
export type IaJobStatus = typeof IaJobStatus[keyof typeof IaJobStatus];

export const IaJobType = {
  PHOTOREALISM_ENHANCE: 'PHOTOREALISM_ENHANCE',
  COLOR_VARIATION: 'COLOR_VARIATION',
  EDIT: 'EDIT',
  PLAN_COMPARISON: 'PLAN_COMPARISON',
  TEXT_ASSISTANT: 'TEXT_ASSISTANT',
} as const;
export type IaJobType = typeof IaJobType[keyof typeof IaJobType];

export const PaymentType = {
  ACOMPTE: 'ACOMPTE',
  SOLDE: 'SOLDE',
  FACTURE: 'FACTURE',
  AVOIR: 'AVOIR',
} as const;
export type PaymentType = typeof PaymentType[keyof typeof PaymentType];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export const SignatureStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  SIGNED: 'SIGNED',
  REFUSED: 'REFUSED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type SignatureStatus = typeof SignatureStatus[keyof typeof SignatureStatus];

export const NotificationScope = {
  SYSTEM: 'SYSTEM',
  PROJECT: 'PROJECT',
  CLIENT: 'CLIENT',
  PAYMENT: 'PAYMENT',
  SIGNATURE: 'SIGNATURE',
  IA: 'IA',
} as const;
export type NotificationScope = typeof NotificationScope[keyof typeof NotificationScope];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  EXPORT: 'EXPORT',
  UPLOAD: 'UPLOAD',
  SIGN: 'SIGN',
  PAY: 'PAY',
} as const;
export type AuditAction = typeof AuditAction[keyof typeof AuditAction];
